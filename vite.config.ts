// إعداد تشغيل Vue محليًا وتجهيز الربط بالخادم عند بناء نسخة النشر.
import { sites } from '@openai/sites-vite-plugin';
import vue from '@vitejs/plugin-vue';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig, loadEnv, type Plugin } from 'vite';

function localApi(adminId: string, adminPassword: string): Plugin {
  const localToken = 'local-development-admin';
  const settingsPath = resolve(process.cwd(), '.google-sheets.local');
  let sheetsUrl = existsSync(settingsPath) ? readFileSync(settingsPath, 'utf8').trim() : '';

  return {
    name: 'local-api',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        const pathname = new URL(request.url || '/', 'http://localhost').pathname;
        if (!pathname.startsWith('/api/')) return next();

        const send = (status: number, value: unknown) => {
          response.statusCode = status;
          response.setHeader('content-type', 'application/json; charset=utf-8');
          response.setHeader('cache-control', 'no-store');
          response.end(JSON.stringify(value));
        };
        const readBody = async () => {
          let rawBody = '';
          for await (const chunk of request) rawBody += chunk;
          try { return JSON.parse(rawBody || '{}'); } catch { return null; }
        };
        const callSheets = async (body: unknown) => {
          if (!sheetsUrl) throw new Error('NOT_CONNECTED');
          const result = await fetch(sheetsUrl, { method: 'POST', headers: { 'content-type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body) });
          return result.json();
        };
        const authorized = request.headers.authorization === `Bearer ${localToken}`;
        const familyIdentity = request.headers.authorization?.replace(/^Bearer\s+local-family\./, '') || '';

        if (request.method === 'POST' && pathname === '/api/admin/login') {
          const body = await readBody();
          if (!adminId || !adminPassword) return send(503, { error: 'Local admin login is not configured' });
          if (body?.identity !== adminId || body?.password !== adminPassword) return send(401, { error: 'Invalid credentials' });
          return send(200, { ok: true, token: localToken });
        }

        if (request.method === 'GET' && pathname === '/api/admin/google-sheets') {
          if (!authorized) return send(401, { error: 'Unauthorized' });
          return send(200, { connected: Boolean(sheetsUrl), url: sheetsUrl });
        }

        if (request.method === 'POST' && pathname === '/api/admin/google-sheets') {
          if (!authorized) return send(401, { error: 'Unauthorized' });
          const body = await readBody();
          if (!/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(body?.url || '')) return send(400, { error: 'Invalid Apps Script URL' });
          try {
            const result = await fetch(body.url, { method: 'POST', headers: { 'content-type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: 'ping' }) }).then(r => r.json());
            if (!result?.ok) throw new Error();
            sheetsUrl = body.url;
            writeFileSync(settingsPath, sheetsUrl, 'utf8');
            return send(200, { ok: true, connected: true });
          } catch { return send(502, { error: 'Could not connect to Google Apps Script' }); }
        }

        if (request.method === 'GET' && pathname === '/api/admin/families') {
          if (!authorized) return send(401, { error: 'Unauthorized' });
          if (!sheetsUrl) return send(200, { families: [], connected: false });
          try {
            const data = await fetch(`${sheetsUrl}?action=list`).then(r => r.json());
            return send(200, { families: Array.isArray(data?.families) ? data.families : [], connected: true });
          } catch { return send(502, { error: 'Could not read Google Sheets' }); }
        }

        // إرسال طلبات استعادة كلمة المرور إلى Google Apps Script.
        if (
          request.method === 'POST' &&
          (
            pathname === '/api/families/password-reset/challenge' ||
            pathname === '/api/families/password-reset/verify'
          )
        ) {
          const body = await readBody();

          try {
            const action =
              pathname.endsWith('/challenge')
                ? 'startPasswordReset'
                : 'finishPasswordReset';

            const result = await callSheets({
              action,
              identity: body?.identity,
              token: body?.token,
              answer: body?.answer
            });

            return send(result?.ok ? 200 : 400, result);
          } catch {
            return send(503, {
              ok: false,
              error: 'Google Sheets غير مربوط بعد'
            });
          }
        }

        if (request.method === 'POST' && pathname === '/api/families/login') {
          const body = await readBody();
          try {
            const result = await callSheets({ action: 'loginFamily', identity: body?.identity, password: body?.password });
            if (!result?.ok || !result?.family) return send(401, { error: 'رقم الهوية أو كلمة المرور غير صحيحة' });
            return send(200, { ok: true, family: result.family, token: `local-family.${body.identity}` });
          } catch { return send(503, { error: 'Google Sheets غير مربوط بعد' }); }
        }

        if (request.method === 'POST' && pathname === '/api/families/register') {
          const body = await readBody();
          try {
            const result = await callSheets({ action: 'registerFamily', family: body?.family, password: body?.password });
            if (!result?.ok) return send(409, { error: result?.error === 'IDENTITY_EXISTS' ? 'رقم الهوية مسجل مسبقًا' : result?.error });
            return send(200, { ok: true, family: result.family, token: `local-family.${body.family.identity}` });
          } catch { return send(503, { error: 'Google Sheets غير مربوط بعد' }); }
        }

        if (request.method === 'PUT' && pathname === '/api/families') {
          if (!/^\d{9}$/.test(familyIdentity)) return send(401, { error: 'سجّل الدخول من جديد' });
          const body = await readBody();
          try {
            const result = await callSheets({ action: 'updateFamily', originalIdentity: familyIdentity, family: body?.family, newPassword: body?.newPassword || '' });
            if (!result?.ok) return send(409, { error: result?.error === 'IDENTITY_EXISTS' ? 'رقم الهوية الجديد مستخدم لعائلة أخرى' : result?.error });
            return send(200, { ok: true, family: result.family, token: `local-family.${body.family.identity}` });
          } catch { return send(503, { error: 'Google Sheets غير مربوط بعد' }); }
        }

        return send(404, { error: 'Not found' });
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [vue(), localApi(env.ADMIN_ID, env.ADMIN_PASSWORD), sites()],
    server: { host: '0.0.0.0' },
  };
});
