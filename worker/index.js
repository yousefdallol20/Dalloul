// الخادم الآمن الهجين لموقع عائلة دلول (Cloudflare D1 + Google Sheets Sync)
const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });

// 1. تهيئة الجداول تلقائياً
async function ensureTables(env) {
  await env.DB.batch([
    env.DB.prepare(
      "CREATE TABLE IF NOT EXISTS app_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT NOT NULL)",
    ),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS families (
      identity TEXT PRIMARY KEY,
      password_hash TEXT NOT NULL,
      family_json TEXT NOT NULL,
      synced_to_sheets INTEGER DEFAULT 0,
      updated_at TEXT NOT NULL
    )`),
  ]);
}

async function setting(env, key) {
  await ensureTables(env);
  const row = await env.DB.prepare(
    "SELECT value FROM app_settings WHERE key = ?",
  )
    .bind(key)
    .first();
  return row?.value || "";
}

async function setSetting(env, key, value) {
  await ensureTables(env);
  await env.DB.prepare(
    "INSERT INTO app_settings (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at",
  )
    .bind(key, value, new Date().toISOString())
    .run();
}

// 2. دوال التشفير والتوكن
async function sha256(text) {
  const bytes = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(text),
  );
  return Array.from(new Uint8Array(bytes), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
}

async function hashPassword(password, env) {
  const salt = env.ADMIN_TOKEN_SECRET || "dalloul-default-salt";
  return sha256(`${salt}:${password}`);
}

async function sign(value, secret) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const bytes = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(bytes), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
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
  const token =
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "";
  const [expires, identity, signature] = token.split(".");
  if (
    !expires ||
    !/^\d{9}$/.test(identity || "") ||
    !signature ||
    Number(expires) < Date.now() ||
    !env.ADMIN_TOKEN_SECRET
  )
    return "";
  const expected = await sign(
    `family:${identity}:${expires}`,
    env.ADMIN_TOKEN_SECRET,
  );
  return signature === expected ? identity : "";
}

async function isAdmin(request, env) {
  const token =
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "";
  const [expires, signature] = token.split(".");
  if (
    !expires ||
    !signature ||
    Number(expires) < Date.now() ||
    !env.ADMIN_TOKEN_SECRET
  )
    return false;
  return signature === (await sign(expires, env.ADMIN_TOKEN_SECRET));
}

async function readBody(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

// 3. دالة مزامنة البيانات المعلقة من D1 إلى Google Sheets في الخلفية
async function syncPendingToSheets(env) {
  await ensureTables(env);
  const sheetsUrl = await setting(env, "google_sheets_url");
  if (!sheetsUrl) return;

  // نجلب 15 عائلة في كل دورة لضمان عدم تجاوز وقت تنفيذ جوجل
  const { results } = await env.DB.prepare(
    "SELECT identity, family_json FROM families WHERE synced_to_sheets = 0 LIMIT 15",
  ).all();

  if (!results || results.length === 0) return;

  for (const row of results) {
    try {
      const familyObj = JSON.parse(row.family_json);
      // نرسلها للشيت عبر نفس الأكشن الموجود عندك في Code.gs
      const response = await fetch(sheetsUrl, {
        method: "POST",
        headers: { "content-type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
          action: "updateFamily",
          originalIdentity: row.identity,
          family: familyObj,
          newPassword: "",
        }),
      });
      const resData = await response.json();

      // إذا لم تكن موجودة في الشيت كـ update، نسجلها كـ register
      if (!resData?.ok && resData?.error === "NOT_FOUND") {
        const regRes = await fetch(sheetsUrl, {
          method: "POST",
          headers: { "content-type": "text/plain;charset=utf-8" },
          body: JSON.stringify({
            action: "registerFamily",
            family: familyObj,
            password: "SyncedFromD1_User",
          }),
        });
        const regData = await regRes.json();
        if (regData?.ok) {
          await env.DB.prepare(
            "UPDATE families SET synced_to_sheets = 1 WHERE identity = ?",
          )
            .bind(row.identity)
            .run();
        }
      } else if (resData?.ok) {
        await env.DB.prepare(
          "UPDATE families SET synced_to_sheets = 1 WHERE identity = ?",
        )
          .bind(row.identity)
          .run();
      }
    } catch (e) {
      // في حال فشل الاتصال بجوجل مؤقتاً، تبقى synced_to_sheets = 0 ليتم إرسالها في الدورة القادمة دون ضياع
      console.error("Sync failed for:", row.identity, e);
    }
  }
}

// 4. معالجة طلبات الـ API
async function handleApi(request, env, url) {
  await ensureTables(env);

  // تسجيل دخول الإدارة
  if (request.method === "POST" && url.pathname === "/api/admin/login") {
    const body = await readBody(request);
    if (!env.ADMIN_ID || !env.ADMIN_PASSWORD || !env.ADMIN_TOKEN_SECRET)
      return json({ error: "Admin login is not configured" }, 503);
    if (
      body?.identity !== env.ADMIN_ID ||
      body?.password !== env.ADMIN_PASSWORD
    )
      return json({ error: "Invalid credentials" }, 401);
    return json({ ok: true, token: await issueToken(env) });
  }

  // إعدادات ربط Google Sheets
  if (url.pathname === "/api/admin/google-sheets") {
    if (!(await isAdmin(request, env)))
      return json({ error: "Unauthorized" }, 401);
    if (request.method === "GET") {
      const savedUrl = await setting(env, "google_sheets_url");
      return json({ connected: Boolean(savedUrl), url: savedUrl });
    }
    if (request.method === "POST") {
      const body = await readBody(request);
      if (
        !/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(
          body?.url || "",
        )
      )
        return json({ error: "Invalid Apps Script URL" }, 400);
      try {
        const test = await fetch(body.url, {
          method: "POST",
          headers: { "content-type": "text/plain;charset=utf-8" },
          body: JSON.stringify({ action: "ping" }),
        });
        if (!test.ok) throw new Error("Google Apps Script test failed");
        const result = await test.json();
        if (!result?.ok) throw new Error("Unexpected Apps Script response");
      } catch {
        return json({ error: "Could not connect to Google Apps Script" }, 502);
      }
      await setSetting(env, "google_sheets_url", body.url);
      return json({ ok: true, connected: true });
    }
  }

  // عرض العائلات للإدارة (يقرأ من D1، وإذا كانت فارغة يسحب البيانات القديمة من الشيت تلقائياً ويخزنها في D1)
  if (request.method === "GET" && url.pathname === "/api/admin/families") {
    if (!(await isAdmin(request, env)))
      return json({ error: "Unauthorized" }, 401);
    const savedUrl = await setting(env, "google_sheets_url");

    let { results } = await env.DB.prepare(
      "SELECT family_json FROM families ORDER BY updated_at DESC",
    ).all();
    let families = (results || []).map((r) => JSON.parse(r.family_json));

    if (families.length === 0 && savedUrl) {
      try {
        const response = await fetch(`${savedUrl}?action=list`, {
          headers: { accept: "application/json" },
        });
        if (response.ok) {
          const data = await response.json();
          const sheetFamilies = Array.isArray(data?.families)
            ? data.families
            : [];

          for (const fam of sheetFamilies) {
            if (fam && fam.identity) {
              const pHash =
                fam.passwordHash || (await hashPassword("12345678", env));
              await env.DB.prepare(
                "INSERT OR IGNORE INTO families (identity, password_hash, family_json, synced_to_sheets, updated_at) VALUES (?, ?, ?, 1, ?)",
              )
                .bind(
                  fam.identity,
                  pHash,
                  JSON.stringify(fam),
                  new Date().toISOString(),
                )
                .run();
            }
          }

          const res2 = await env.DB.prepare(
            "SELECT family_json FROM families ORDER BY updated_at DESC",
          ).all();
          families = (res2.results || []).map((r) => JSON.parse(r.family_json));
        }
      } catch (e) {
        console.error("Auto import from sheet failed:", e);
      }
    }

    return json({ families, connected: Boolean(savedUrl) });
  }

  // استعادة كلمة مرور العائلة
  if (
    request.method === "POST" &&
    (url.pathname === "/api/families/password-reset/challenge" ||
      url.pathname === "/api/families/password-reset/verify")
  ) {
    const body = await readBody(request);
    const sheetsUrl = await setting(env, "google_sheets_url");
    if (!sheetsUrl)
      return json({ ok: false, error: "Google Sheets غير مربوط بعد" }, 503);
    const action = url.pathname.endsWith("/challenge")
      ? "startPasswordReset"
      : "finishPasswordReset";
    try {
      const response = await fetch(sheetsUrl, {
        method: "POST",
        headers: { "content-type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
          action,
          identity: body?.identity,
          token: body?.token,
          answer: body?.answer,
        }),
      });
      const result = await response.json();
      // إذا تم إعادة ضبط كلمة المرور في الشيت، نحدثها في D1 أيضاً
      if (action === "finishPasswordReset" && result?.ok && body?.identity) {
        const defaultHash = await hashPassword("12345678", env);
        await env.DB.prepare(
          "UPDATE families SET password_hash = ? WHERE identity = ?",
        )
          .bind(defaultHash, body.identity)
          .run();
      }
      return json(result, result?.ok ? 200 : 400);
    } catch {
      return json(
        { ok: false, error: "تعذر الاتصال بخدمة استعادة كلمة المرور" },
        502,
      );
    }
  }

  // فحص رقم الهوية (فوري من D1)
  if (
    request.method === "POST" &&
    url.pathname === "/api/families/check-identity"
  ) {
    const body = await readBody(request);
    if (!/^\d{9}$/.test(body?.identity || "")) return json({ exists: false });
    if (body.exclude && body.identity === body.exclude)
      return json({ exists: false });
    const row = await env.DB.prepare(
      "SELECT identity FROM families WHERE identity = ?",
    )
      .bind(body.identity)
      .first();
    if (row) return json({ exists: true });

    // فحص احتياطي في الشيت للبيانات القديمة جداً
    const sheetsUrl = await setting(env, "google_sheets_url");
    if (!sheetsUrl) return json({ exists: false });
    try {
      const response = await fetch(sheetsUrl, {
        method: "POST",
        headers: { "content-type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
          action: "checkIdentity",
          identity: body.identity,
          exclude: body.exclude || "",
        }),
      });
      const result = await response.json();
      return json({ exists: Boolean(result?.exists) });
    } catch {
      return json({ exists: false });
    }
  }

  // تسجيل دخول العائلة (يقرأ من D1 أولاً في 10 ميلي ثانية!)
  if (request.method === "POST" && url.pathname === "/api/families/login") {
    const body = await readBody(request);
    if (!/^\d{9}$/.test(body?.identity || "") || !body?.password)
      return json({ error: "أدخل رقم الهوية وكلمة المرور" }, 400);

    const row = await env.DB.prepare(
      "SELECT password_hash, family_json FROM families WHERE identity = ?",
    )
      .bind(body.identity)
      .first();
    if (row) {
      const inputHash = await hashPassword(body.password, env);
      if (row.password_hash !== inputHash)
        return json({ error: "رقم الهوية أو كلمة المرور غير صحيحة" }, 401);
      return json({
        ok: true,
        family: JSON.parse(row.family_json),
        token: await issueFamilyToken(env, body.identity),
      });
    }

    // إذا لم يكن في D1 (مسجل قديماً في الشيت فقط)، نجلبه من الشيت ونحفظه في D1 للمستقبل
    const sheetsUrl = await setting(env, "google_sheets_url");
    if (!sheetsUrl)
      return json({ error: "رقم الهوية أو كلمة المرور غير صحيحة" }, 401);
    try {
      const response = await fetch(sheetsUrl, {
        method: "POST",
        headers: { "content-type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
          action: "loginFamily",
          identity: body.identity,
          password: body.password,
        }),
      });
      const result = await response.json();
      if (!response.ok || !result?.ok || !result?.family)
        return json({ error: "رقم الهوية أو كلمة المرور غير صحيحة" }, 401);

      const pHash = await hashPassword(body.password, env);
      await env.DB.prepare(
        "INSERT OR REPLACE INTO families (identity, password_hash, family_json, synced_to_sheets, updated_at) VALUES (?, ?, ?, 1, ?)",
      )
        .bind(
          body.identity,
          pHash,
          JSON.stringify(result.family),
          new Date().toISOString(),
        )
        .run();

      return json({
        ok: true,
        family: result.family,
        token: await issueFamilyToken(env, body.identity),
      });
    } catch {
      return json({ error: "تعذر التحقق من البيانات" }, 502);
    }
  }

  // تسجيل عائلة جديدة (يحفظ في D1 فوراً ويرسل للشيت في الخلفية)
  if (request.method === "POST" && url.pathname === "/api/families/register") {
    const body = await readBody(request);
    if (!body?.family?.identity || !/^\d{9}$/.test(body.family.identity))
      return json({ error: "Invalid family data" }, 400);
    if (typeof body.password !== "string" || body.password.length < 6)
      return json({ error: "كلمة المرور يجب أن تكون 6 أحرف على الأقل" }, 400);

    const existing = await env.DB.prepare(
      "SELECT identity FROM families WHERE identity = ?",
    )
      .bind(body.family.identity)
      .first();
    if (existing)
      return json(
        {
          error: `تم استخدام الهوية ${body.family.identity} من قبل، يرجى التحقق من الرقم`,
        },
        409,
      );

    const pHash = await hashPassword(body.password, env);
    await env.DB.prepare(
      "INSERT INTO families (identity, password_hash, family_json, synced_to_sheets, updated_at) VALUES (?, ?, ?, 0, ?)",
    )
      .bind(
        body.family.identity,
        pHash,
        JSON.stringify(body.family),
        new Date().toISOString(),
      )
      .run();

    return json({
      ok: true,
      family: body.family,
      token: await issueFamilyToken(env, body.family.identity),
    });
  }

  // تحديث بيانات العائلة (يحفظ في D1 فوراً ويعلمها للمزامنة)
  if (request.method === "PUT" && url.pathname === "/api/families") {
    const originalIdentity = await familyIdentity(request, env);
    if (!originalIdentity)
      return json({ error: "انتهت جلسة المستخدم؛ سجّل الدخول من جديد" }, 401);
    const body = await readBody(request);
    if (!body?.family?.identity || !/^\d{9}$/.test(body.family.identity))
      return json({ error: "رقم الهوية الجديد غير صحيح" }, 400);
    if (
      body.newPassword &&
      (typeof body.newPassword !== "string" || body.newPassword.length < 6)
    )
      return json({ error: "كلمة المرور الجديدة قصيرة" }, 400);

    if (body.family.identity !== originalIdentity) {
      const dup = await env.DB.prepare(
        "SELECT identity FROM families WHERE identity = ?",
      )
        .bind(body.family.identity)
        .first();
      if (dup)
        return json(
          {
            error: `تم استخدام الهوية ${body.family.identity} من قبل، يرجى التحقق من الرقم`,
          },
          409,
        );
    }

    const oldRow = await env.DB.prepare(
      "SELECT password_hash FROM families WHERE identity = ?",
    )
      .bind(originalIdentity)
      .first();
    const nextHash = body.newPassword
      ? await hashPassword(body.newPassword, env)
      : oldRow?.password_hash || (await hashPassword("12345678", env));

    if (body.family.identity !== originalIdentity) {
      await env.DB.prepare("DELETE FROM families WHERE identity = ?")
        .bind(originalIdentity)
        .run();
    }

    await env.DB.prepare(
      "INSERT OR REPLACE INTO families (identity, password_hash, family_json, synced_to_sheets, updated_at) VALUES (?, ?, ?, 0, ?)",
    )
      .bind(
        body.family.identity,
        nextHash,
        JSON.stringify(body.family),
        new Date().toISOString(),
      )
      .run();

    return json({
      ok: true,
      family: body.family,
      token: await issueFamilyToken(env, body.family.identity),
    });
  }

  return json({ error: "Not found" }, 404);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/")) return handleApi(request, env, url);
    if (env.ASSETS) return env.ASSETS.fetch(request);
    return new Response("Site assets are not available", { status: 503 });
  },

  // المؤقت التلقائي الذي يعمل كل 5 دقائق لترحيل البيانات إلى Google Sheets
  async scheduled(event, env, ctx) {
    ctx.waitUntil(syncPendingToSheets(env));
  },
};