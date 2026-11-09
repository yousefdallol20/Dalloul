// هذا هو الخادم الآمن للموقع.
// يستقبل تسجيل الدخول والحفظ والإدارة دون كشف الأسرار داخل Vue.
const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
});

async function ensureSettings(env) {
  await env.DB.prepare('CREATE TABLE IF NOT EXISTS app_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT NOT NULL)').run();
}

async function setting(env, key) {
  await ensureSettings(env);
  const row = await env.DB.prepare('SELECT value FROM app_settings WHERE key = ?').bind(key).first();
  return row?.value || '';
}

async function setSetting(env, key, value) {
  await ensureSettings(env);
  await env.DB.prepare('INSERT INTO app_settings (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at')
    .bind(key, value, new Date().toISOString()).run();
}

async function sign(value, secret) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const bytes = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, '0')).join('');
}

async function issueToken(env) {
  const expires = Date.now() + 12 * 60 * 60 * 1000;
  return `${expires}.${await sign(String(expires), env.ADMIN_TOKEN_SECRET)}`;
}

async function issueFamilyToken(env, identity) {
  const expires = Date.now() + 30 * 24 * 60 * 60 * 1000;
  const payload = `family:${identity}:${expires}`;
  return `${expires}.${identity}.${await sign(payload, env.ADMIN_TOKEN_SECRET)}`;
}

async function familyIdentity(request, env) {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || '';
  const [expires, identity, signature] = token.split('.');
  if (!expires || !/^\d{9}$/.test(identity || '') || !signature || Number(expires) < Date.now() || !env.ADMIN_TOKEN_SECRET) return '';
  const expected = await sign(`family:${identity}:${expires}`, env.ADMIN_TOKEN_SECRET);
  return signature === expected ? identity : '';
}

async function isAdmin(request, env) {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || '';
  const [expires, signature] = token.split('.');
  if (!expires || !signature || Number(expires) < Date.now() || !env.ADMIN_TOKEN_SECRET) return false;
  return signature === await sign(expires, env.ADMIN_TOKEN_SECRET);
}

async function readBody(request) {
  try { return await request.json(); } catch { return null; }
}

async function handleApi(request, env, url) {
  if (request.method === 'POST' && url.pathname === '/api/admin/login') {
    const body = await readBody(request);
    if (!env.ADMIN_ID || !env.ADMIN_PASSWORD || !env.ADMIN_TOKEN_SECRET) return json({ error: 'Admin login is not configured' }, 503);
    if (body?.identity !== env.ADMIN_ID || body?.password !== env.ADMIN_PASSWORD) return json({ error: 'Invalid credentials' }, 401);
    return json({ ok: true, token: await issueToken(env) });
  }

  if (url.pathname === '/api/admin/google-sheets') {
    if (!await isAdmin(request, env)) return json({ error: 'Unauthorized' }, 401);
    if (request.method === 'GET') {
      const savedUrl = await setting(env, 'google_sheets_url');
      return json({ connected: Boolean(savedUrl), url: savedUrl });
    }
    if (request.method === 'POST') {
      const body = await readBody(request);
      if (!/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(body?.url || '')) return json({ error: 'Invalid Apps Script URL' }, 400);
      try {
        const test = await fetch(body.url, { method: 'POST', headers: { 'content-type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: 'ping' }) });
        if (!test.ok) throw new Error('Google Apps Script test failed');
        const result = await test.json();
        if (!result?.ok) throw new Error('Unexpected Apps Script response');
      } catch { return json({ error: 'Could not connect to Google Apps Script' }, 502); }
      await setSetting(env, 'google_sheets_url', body.url);
      return json({ ok: true, connected: true });
    }
  }

  if (request.method === 'GET' && url.pathname === '/api/admin/families') {
    if (!await isAdmin(request, env)) return json({ error: 'Unauthorized' }, 401);
    const sheetsUrl = await setting(env, 'google_sheets_url');
    if (!sheetsUrl) return json({ families: [], connected: false });
    try {
      const response = await fetch(`${sheetsUrl}?action=list`, { headers: { accept: 'application/json' } });
      if (!response.ok) throw new Error('Sheet read failed');
      const data = await response.json();
      return json({ families: Array.isArray(data?.families) ? data.families : [], connected: true });
    } catch { return json({ error: 'Could not read Google Sheets' }, 502); }
  }

  // استعادة كلمة مرور العائلة عن طريق سؤال متعلق بأحد أفرادها.
  if (
    request.method === 'POST' &&
    (
      url.pathname === '/api/families/password-reset/challenge' ||
      url.pathname === '/api/families/password-reset/verify'
    )
  ) {
    const body = await readBody(request);
    const sheetsUrl = await setting(env, 'google_sheets_url');

    if (!sheetsUrl) {
      return json({
        ok: false,
        error: 'Google Sheets غير مربوط بعد'
      }, 503);
    }

    const action =
      url.pathname.endsWith('/challenge')
        ? 'startPasswordReset'
        : 'finishPasswordReset';

    try {
      const response = await fetch(sheetsUrl, {
        method: 'POST',
        headers: {
          'content-type': 'text/plain;charset=utf-8'
        },
        body: JSON.stringify({
          action,
          identity: body?.identity,
          token: body?.token,
          answer: body?.answer
        })
      });

      const result = await response.json();

      return json(
        result,
        result?.ok ? 200 : 400
      );
    } catch {
      return json({
        ok: false,
        error: 'تعذر الاتصال بخدمة استعادة كلمة المرور'
      }, 502);
    }
  }

  if (request.method === 'POST' && url.pathname === '/api/families/login') {
    const body = await readBody(request);
    if (!/^\d{9}$/.test(body?.identity || '') || !body?.password) return json({ error: 'أدخل رقم الهوية وكلمة المرور' }, 400);
    const sheetsUrl = await setting(env, 'google_sheets_url');
    if (!sheetsUrl) return json({ error: 'Google Sheets غير مربوط بعد' }, 503);
    try {
      const response = await fetch(sheetsUrl, { method: 'POST', headers: { 'content-type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: 'loginFamily', identity: body.identity, password: body.password }) });
      const result = await response.json();
      if (!response.ok || !result?.ok || !result?.family) return json({ error: 'رقم الهوية أو كلمة المرور غير صحيحة' }, 401);
      return json({ ok: true, family: result.family, token: await issueFamilyToken(env, body.identity) });
    } catch { return json({ error: 'تعذر قراءة البيانات من Google Sheets' }, 502); }
  }

  if (request.method === 'POST' && url.pathname === '/api/families/register') {
    const body = await readBody(request);
    if (!body?.family?.identity || !/^\d{9}$/.test(body.family.identity)) return json({ error: 'Invalid family data' }, 400);
    if (typeof body.password !== 'string' || body.password.length < 6) return json({ error: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' }, 400);
    const sheetsUrl = await setting(env, 'google_sheets_url');
    if (!sheetsUrl) return json({ error: 'Google Sheets غير مربوط بعد' }, 503);
    try {
      const response = await fetch(sheetsUrl, { method: 'POST', headers: { 'content-type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: 'registerFamily', family: body.family, password: body.password }) });
      const result = await response.json();
      if (!response.ok || !result?.ok) return json({ error: result?.error === 'IDENTITY_EXISTS' ? 'رقم الهوية مسجل مسبقًا' : 'تعذر حفظ البيانات في Google Sheets' }, 409);
      return json({ ok: true, family: result.family || body.family, token: await issueFamilyToken(env, body.family.identity) });
    } catch { return json({ error: 'تعذر حفظ البيانات في Google Sheets' }, 502); }
  }

  if (request.method === 'PUT' && url.pathname === '/api/families') {
    const originalIdentity = await familyIdentity(request, env);
    if (!originalIdentity) return json({ error: 'انتهت جلسة المستخدم؛ سجّل الدخول من جديد' }, 401);
    const body = await readBody(request);
    if (!body?.family?.identity || !/^\d{9}$/.test(body.family.identity)) return json({ error: 'رقم الهوية الجديد غير صحيح' }, 400);
    if (body.newPassword && (typeof body.newPassword !== 'string' || body.newPassword.length < 6)) return json({ error: 'كلمة المرور الجديدة قصيرة' }, 400);
    const sheetsUrl = await setting(env, 'google_sheets_url');
    if (!sheetsUrl) return json({ error: 'Google Sheets غير مربوط بعد' }, 503);
    try {
      const response = await fetch(sheetsUrl, { method: 'POST', headers: { 'content-type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: 'updateFamily', originalIdentity, family: body.family, newPassword: body.newPassword || '' }) });
      const result = await response.json();
      if (!response.ok || !result?.ok) return json({ error: result?.error === 'IDENTITY_EXISTS' ? 'رقم الهوية الجديد مستخدم لعائلة أخرى' : 'تعذر تحديث البيانات في Google Sheets' }, 409);
      return json({ ok: true, family: result.family || body.family, token: await issueFamilyToken(env, body.family.identity) });
    } catch { return json({ error: 'تعذر تحديث البيانات في Google Sheets' }, 502); }
  }

  return json({ error: 'Not found' }, 404);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/')) return handleApi(request, env, url);
    if (env.ASSETS) return env.ASSETS.fetch(request);
    return new Response('Site assets are not available', { status: 503 });
  },
};
