// هذا الملف يُلصق داخل Google Apps Script المرتبط بملف «عائلة دلول».
// ينشئ الأوراق ويحفظ العائلات والأفراد ويتحقق من كلمة المرور المشفرة.
const FAMILY_HEADERS = [
  "وقت التسجيل",
  "اسم رب الأسرة",
  "رقم الهوية",
  "الجوال الأساسي",
  "مقدمة واتساب",
  "رقم واتساب",
  "تاريخ الميلاد",
  "الجنس",
  "الحالة الاجتماعية",
  "حالة رب الأسرة",
  "حالة العمل",
  "الحالة الصحية",
  "تفاصيل الحالة الصحية",
  "صفة الإقامة",
  "رقم كرت المؤن",
  "الحالة التعليمية",
  "نوع الشهادة أو التخصص",
  "المنطقة الأصلية",
  "العنوان الأصلي",
  "حالة السكن الأصلي",
  "منطقة النزوح",
  "مكان النزوح بالتفصيل",
  "نوع مكان النزوح",
  "صورة الهوية",
  "صورة السليب",
  "صورة الخيمة",
  "عدد الأفراد المحتسب",
  "الاحتياجات",
];
const MEMBER_HEADERS = [
  "رقم هوية رب الأسرة",
  "اسم رب الأسرة",
  "اسم الفرد",
  "رقم هوية الفرد",
  "تاريخ الميلاد",
  "العمر",
  "الجنس",
  "صلة القرابة",
  "الحالة الصحية",
  "الحالة التعليمية",
  "نوع الشهادة أو التخصص",
  "الحالات الخاصة",
  "احتياجات الفرد",
];
const RAW_HEADERS = ["رقم الهوية", "تجزئة كلمة المرور", "JSON", "آخر تحديث"];

function json_(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(
    ContentService.MimeType.JSON,
  );
}

function sheet_(name, headers) {
  const file = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = file.getSheetByName(name);
  if (!sheet) sheet = file.insertSheet(name);
  if (sheet.getMaxColumns() < headers.length)
    sheet.insertColumnsAfter(
      sheet.getMaxColumns(),
      headers.length - sheet.getMaxColumns(),
    );
  sheet
    .getRange(1, 1, 1, headers.length)
    .setValues([headers])
    .setFontWeight("bold")
    .setBackground("#1769e0")
    .setFontColor("#ffffff");
  sheet.setFrozenRows(1);
  sheet.setRightToLeft(true);

  // تعبئة الخلايا الفارغة القديمة أيضًا، بما فيها العمود الجديد لاحتياجات الفرد.
  if (name !== "بيانات النظام" && sheet.getLastRow() > 1) {
    const dataRange = sheet.getRange(
      2,
      1,
      sheet.getLastRow() - 1,
      headers.length,
    );
    const values = dataRange.getValues();
    let changed = false;

    for (let row = 0; row < values.length; row++) {
      for (let column = 0; column < values[row].length; column++) {
        if (String(values[row][column] || "").trim() === "") {
          values[row][column] = "لا يوجد";
          changed = true;
        }
      }
    }

    if (changed) dataRange.setValues(values);
  }

  // ورقة الأفراد تعرض بيانات الفرد فقط للمستخدم.
  // تبقى أعمدة الربط وصلة القرابة محفوظة داخليًا حتى يستمر تحديث العائلة وحذف أفرادها بشكل صحيح.
  if (name === "الأفراد") {
    try {
      sheet.hideColumns(1, 2);
      const relationColumn = headers.indexOf("صلة القرابة") + 1;
      if (relationColumn > 0) sheet.hideColumns(relationColumn);
    } catch (e) {}
  }

  return sheet;
}

function rawSheet_() {
  const raw = sheet_("بيانات النظام", RAW_HEADERS);
  if (String(raw.getRange(1, 2).getValue()) === "JSON")
    raw.insertColumnAfter(1);
  if (raw.getMaxColumns() < RAW_HEADERS.length)
    raw.insertColumnsAfter(
      raw.getMaxColumns(),
      RAW_HEADERS.length - raw.getMaxColumns(),
    );
  raw
    .getRange(1, 1, 1, RAW_HEADERS.length)
    .setValues([RAW_HEADERS])
    .setFontWeight("bold")
    .setBackground("#1769e0")
    .setFontColor("#ffffff");
  try {
    raw.hideSheet();
  } catch (e) {}
  return raw;
}

// شغّل هذه الدالة مرة واحدة بعد تحديث الكود لتطبيق تنسيق الأوراق وإخفاء الأعمدة الداخلية فورًا.
function initializeSheets() {
  sheet_("العائلات", FAMILY_HEADERS);
  sheet_("الأفراد", MEMBER_HEADERS);
  rawSheet_();
  return true;
}

function findIdentity_(sheet, identity, column) {
  if (sheet.getLastRow() < 2) return null;
  return sheet
    .getRange(2, column, sheet.getLastRow() - 1, 1)
    .createTextFinder(String(identity))
    .matchEntireCell(true)
    .findNext();
}

function passwordHash_(password) {
  const properties = PropertiesService.getScriptProperties();
  let salt = properties.getProperty("PASSWORD_SALT");
  if (!salt) {
    salt = Utilities.getUuid() + Utilities.getUuid();
    properties.setProperty("PASSWORD_SALT", salt);
  }
  const digest = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    `${salt}:${password}`,
    Utilities.Charset.UTF_8,
  );
  return digest
    .map((byte) => `0${(byte < 0 ? byte + 256 : byte).toString(16)}`.slice(-2))
    .join("");
}

function normalizeName_(value) {
  return String(value || "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/ء/g, "")
    .replace(/ة/g, "ه")
    .replace(/[،,؛;.:/\\|_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeFamily_(family) {
  family.head = normalizeName_(family.head);
  family.members = (family.members || []).map((member) =>
    Object.assign({}, member, {
      first: normalizeName_(member.first),
      father: normalizeName_(member.father),
      grandfather: normalizeName_(member.grandfather),
      healthNeeds:
        member.health && member.health !== "سليم"
          ? member.healthNeeds || []
          : [],
    }),
  );
  return family;
}

function validateFamily_(family) {
  if (!family || !/^\d{9}$/.test(String(family.identity || "")))
    return "INVALID_IDENTITY";
  if (!/^\d{10}$/.test(String(family.phone || ""))) return "INVALID_PHONE";
  if (
    !/^\d{9,10}$/.test(String(family.alternate || "")) ||
    ["+970", "+972"].indexOf(String(family.whatsappPrefix || "")) === -1
  )
    return "INVALID_WHATSAPP";
  if (
    family.residencyType === "لاجئ" &&
    !String(family.rationCard || "").trim()
  )
    return "RATION_CARD_REQUIRED";
  if (
    ["دبلوم", "بكالوريوس", "ماجستير", "دكتوراه", "تعليم مهني"].indexOf(
      String(family.education || ""),
    ) !== -1 &&
    !String(family.educationDetail || "").trim()
  )
    return "EDUCATION_DETAIL_REQUIRED";
  if (!family.idPhoto || !family.slipPhoto) return "DOCUMENT_PHOTOS_REQUIRED";
  for (let i = 0; i < (family.members || []).length; i++) {
    const member = family.members[i];
    if (!/^\d{9}$/.test(String(member.identity || "")))
      return "INVALID_MEMBER_IDENTITY";
    if (
      ["دبلوم", "بكالوريوس", "ماجستير", "دكتوراه", "تعليم مهني"].indexOf(
        String(member.education || ""),
      ) !== -1 &&
      !String(member.educationDetail || "").trim()
    )
      return "MEMBER_EDUCATION_DETAIL_REQUIRED";
  }
  return "";
}

function age_(birth) {
  if (!birth) return "";
  return new Date().getFullYear() - new Date(birth).getFullYear();
}

// لا نترك أي خلية ظاهرة فارغة في أوراق العائلات والأفراد.
function sheetValue_(value) {
  if (Array.isArray(value)) {
    return value.length ? value.join("، ") : "لا يوجد";
  }
  if (value === null || value === undefined) return "لا يوجد";
  const text = String(value).trim();
  return text || "لا يوجد";
}

function savePhoto_(dataUrl, identity, kind, folderName) {
  const currentValue = String(dataUrl || '').trim();

  // إذا كانت الصورة محفوظة من قبل نحتفظ برقم الملف ونوحد رابطها.
  if (/^https?:\/\//.test(currentValue)) {
    const idMatch =
      currentValue.match(/googleusercontent\.com\/d\/([^/=]+)/) ||
      currentValue.match(/[?&]id=([^&]+)/) ||
      currentValue.match(/\/d\/([^/=?&]+)/);

    if (idMatch && idMatch[1]) {
      return `https://drive.google.com/thumbnail?id=${encodeURIComponent(idMatch[1])}&sz=w1600`;
    }

    return currentValue;
  }

  // التأكد أن القيمة صورة بصيغة Base64.
  if (!currentValue || currentValue.indexOf('data:image/') !== 0) {
    return '';
  }

  const match = currentValue.match(
    /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/
  );

  if (!match) return '';

  // الحصول على مجلد الصور أو إنشاؤه.
  const folders = DriveApp.getFoldersByName(folderName);
  const folder = folders.hasNext()
    ? folders.next()
    : DriveApp.createFolder(folderName);

  const mimeType = match[1];

  const extension = mimeType
    .split('/')[1]
    .replace('jpeg', 'jpg');

  const fileName = `${kind}-${identity}-${Date.now()}.${extension}`;

  const blob = Utilities.newBlob(
    Utilities.base64Decode(match[2]),
    mimeType,
    fileName
  );

  // إنشاء الملف داخل Google Drive.
  const file = folder.createFile(blob);

  // السماح بعرض الصورة لكل من يمتلك الرابط.
  file.setSharing(
    DriveApp.Access.ANYONE_WITH_LINK,
    DriveApp.Permission.VIEW
  );

  // تعطيل مفتاح الحماية الإضافي الذي قد يمنع عرض الصورة في الموقع.
  try {
    file.setSecurityUpdateEnabled(false);
  } catch (error) {
    console.log('تعذر تعطيل Security Update: ' + error);
  }

  // إعطاء Google Drive وقتًا قصيرًا لتطبيق الصلاحية.
  Utilities.sleep(500);

  // رابط مباشر يمكن استخدامه داخل عنصر img.
  return `https://drive.google.com/thumbnail?id=${file.getId()}&sz=w1600`;
}

function upsertFamily_(family, originalIdentity, passwordHash) {
  const families = sheet_("العائلات", FAMILY_HEADERS);
  const members = sheet_("الأفراد", MEMBER_HEADERS);
  const raw = rawSheet_();
  originalIdentity = String(originalIdentity || family.identity);

  const tentPhotoUrl = savePhoto_(
    family.tentPhoto,
    family.identity,
    "خيمة",
    "صور خيام عائلة دلول",
  );
  const idPhotoUrl = savePhoto_(
    family.idPhoto,
    family.identity,
    "هوية",
    "وثائق عائلة دلول",
  );
  const slipPhotoUrl = savePhoto_(
    family.slipPhoto,
    family.identity,
    "سليب",
    "وثائق عائلة دلول",
  );
  const familyRow = [
    new Date(),
    sheetValue_(family.head),
    sheetValue_(family.identity),
    sheetValue_(family.phone),
    sheetValue_(family.whatsappPrefix),
    sheetValue_(family.alternate),
    sheetValue_(family.birth),
    sheetValue_(family.gender),
    sheetValue_(family.marital),
    sheetValue_(family.headStatus),
    sheetValue_(family.work),
    sheetValue_(family.health),
    sheetValue_(family.disease),
    sheetValue_(family.residencyType),
    sheetValue_(family.rationCard),
    sheetValue_(family.education),
    sheetValue_(family.educationDetail),
    sheetValue_(family.originalArea),
    sheetValue_(family.originalAddress),
    sheetValue_(family.originalHousingStatus),
    sheetValue_(family.displacementArea),
    sheetValue_(family.residence),
    sheetValue_(family.housing),
    sheetValue_(idPhotoUrl),
    sheetValue_(slipPhotoUrl),
    sheetValue_(tentPhotoUrl),
    family.members.length + (family.headStatus === "شهيد" ? 0 : 1),
    sheetValue_(family.needs || []),
  ];
  const existing = findIdentity_(families, originalIdentity, 3);
  if (existing)
    families
      .getRange(existing.getRow(), 1, 1, familyRow.length)
      .setValues([familyRow]);
  else families.appendRow(familyRow);

  for (let row = members.getLastRow(); row >= 2; row--)
    if (
      [originalIdentity, String(family.identity)].indexOf(
        String(members.getRange(row, 1).getValue()),
      ) !== -1
    )
      members.deleteRow(row);
  (family.members || []).forEach((member) =>
    members.appendRow([
      sheetValue_(family.identity),
      sheetValue_(family.head),
      sheetValue_(`${member.first} ${member.father} ${member.grandfather} دلول`),
      sheetValue_(member.identity),
      sheetValue_(member.birth),
      sheetValue_(age_(member.birth)),
      sheetValue_(member.gender),
      sheetValue_(member.relation),
      sheetValue_(member.health),
      sheetValue_(member.education),
      sheetValue_(member.educationDetail),
      sheetValue_(member.special || []),
      sheetValue_(member.healthNeeds || []),
    ]),
  );

  const storedFamily = Object.assign({}, family, {
    tentPhoto: tentPhotoUrl,
    idPhoto: idPhotoUrl,
    slipPhoto: slipPhotoUrl,
  });
  const rawMatch = findIdentity_(raw, originalIdentity, 1);
  const rawRow = [
    family.identity,
    passwordHash,
    JSON.stringify(storedFamily),
    new Date(),
  ];
  if (rawMatch)
    raw
      .getRange(rawMatch.getRow(), 1, 1, RAW_HEADERS.length)
      .setValues([rawRow]);
  else raw.appendRow(rawRow);
  return storedFamily;
}

function doPost(e) {
  // تنظيف إجابة سؤال استعادة كلمة المرور.
  function normalizeRecoveryAnswer_(value, type) {
    if (type === "identity") {
      return String(value || "").replace(/\D/g, "");
    }

    return String(value || "")
      .trim()
      .slice(0, 10);
  }

  // إنشاء سؤال عشوائي عن أحد أفراد العائلة.
  function startPasswordReset_(identity) {
    identity = String(identity || "").replace(/\D/g, "");

    if (!/^\d{9}$/.test(identity)) {
      return { ok: false, error: "NOT_FOUND" };
    }

    const cache = CacheService.getScriptCache();
    const rateKey = `password-reset-rate-${passwordHash_(identity).slice(0, 20)}`;

    // منع تكرار طلب الأسئلة بسرعة.
    if (cache.get(rateKey)) {
      return { ok: false, error: "WAIT" };
    }

    cache.put(rateKey, "1", 30);

    const raw = rawSheet_();
    const match = findIdentity_(raw, identity, 1);

    if (!match) {
      return { ok: false, error: "NOT_FOUND" };
    }

    const row = raw
      .getRange(match.getRow(), 1, 1, RAW_HEADERS.length)
      .getValues()[0];

    const family = JSON.parse(String(row[2] || "{}"));

    // نضع رب الأسرة مع أفراد العائلة ضمن خيارات الأسئلة.
    const people = [
      {
        name: family.head || "رب الأسرة",
        identity: family.identity || identity,
        birth: family.birth || "",
      },
    ].concat(
      (family.members || []).map(function (member) {
        return {
          name: [member.first, member.father, member.grandfather, "دلول"]
            .filter(Boolean)
            .join(" "),

          identity: member.identity || "",
          birth: member.birth || "",
        };
      }),
    );

    const questions = [];

    people.forEach(function (person) {
      if (/^\d{9}$/.test(String(person.identity || ""))) {
        questions.push({
          type: "identity",
          inputType: "numeric",
          question: `ما رقم هوية ${person.name}؟`,
          answer: String(person.identity),
        });
      }

      if (person.birth) {
        questions.push({
          type: "birth",
          inputType: "date",
          question: `ما تاريخ ميلاد ${person.name}؟`,
          answer: String(person.birth).slice(0, 10),
        });
      }
    });

    if (!questions.length) {
      return { ok: false, error: "NO_RECOVERY_DATA" };
    }

    // اختيار سؤال مختلف عشوائيًا في كل طلب.
    const selected = questions[Math.floor(Math.random() * questions.length)];
    const token = Utilities.getUuid() + Utilities.getUuid();

    const challenge = {
      identity: identity,
      type: selected.type,
      answerHash: passwordHash_(
        normalizeRecoveryAnswer_(selected.answer, selected.type),
      ),
      attempts: 5,
    };

    // السؤال صالح لمدة 10 دقائق.
    cache.put(`password-reset-${token}`, JSON.stringify(challenge), 600);

    return {
      ok: true,
      token: token,
      question: selected.question,
      inputType: selected.inputType,
    };
  }

  // التحقق من الإجابة وتعيين كلمة المرور المؤقتة.
  function finishPasswordReset_(token, answer) {
    const cache = CacheService.getScriptCache();
    const cacheKey = `password-reset-${String(token || "")}`;
    const savedChallenge = cache.get(cacheKey);

    if (!savedChallenge) {
      return { ok: false, error: "INVALID_CHALLENGE" };
    }

    const challenge = JSON.parse(savedChallenge);
    const cleanAnswer = normalizeRecoveryAnswer_(answer, challenge.type);

    const answerHash = passwordHash_(cleanAnswer);

    if (answerHash !== challenge.answerHash) {
      challenge.attempts = Number(challenge.attempts || 1) - 1;

      if (challenge.attempts <= 0) {
        cache.remove(cacheKey);

        return {
          ok: false,
          error: "TOO_MANY_ATTEMPTS",
          attemptsLeft: 0,
        };
      }

      cache.put(cacheKey, JSON.stringify(challenge), 600);

      return {
        ok: false,
        error: "WRONG_ANSWER",
        attemptsLeft: challenge.attempts,
      };
    }

    const raw = rawSheet_();
    const match = findIdentity_(raw, challenge.identity, 1);

    if (!match) {
      cache.remove(cacheKey);
      return { ok: false, error: "INVALID_CHALLENGE" };
    }

    // تعيين كلمة المرور المؤقتة.
    raw.getRange(match.getRow(), 2).setValue(passwordHash_("12345678"));

    // تسجيل أن المستخدم يجب أن يغير كلمة المرور بعد دخوله.
    const family = JSON.parse(
      String(raw.getRange(match.getRow(), 3).getValue() || "{}"),
    );

    family.mustChangePassword = true;

    raw.getRange(match.getRow(), 3).setValue(JSON.stringify(family));

    raw.getRange(match.getRow(), 4).setValue(new Date());

    cache.remove(cacheKey);

    return { ok: true };
  }
  const lock = LockService.getScriptLock();
  try {
    const body = JSON.parse(e.postData.contents || "{}");
    if (body.action === "ping") return json_({ ok: true });
    // إنشاء سؤال استعادة كلمة المرور.
    if (body.action === "startPasswordReset") {
      return json_(startPasswordReset_(body.identity));
    }

    // التحقق من السؤال وتعيين كلمة المرور المؤقتة.
    if (body.action === "finishPasswordReset") {
      lock.waitLock(30000);

      return json_(finishPasswordReset_(body.token, body.answer));
    }
    if (body.action === "loginFamily") {
      const raw = rawSheet_();
      const match = findIdentity_(raw, body.identity, 1);
      if (!match || !body.password)
        return json_({ ok: false, error: "INVALID_CREDENTIALS" });
      const row = raw
        .getRange(match.getRow(), 1, 1, RAW_HEADERS.length)
        .getValues()[0];
      if (!row[1] || String(row[1]) !== passwordHash_(String(body.password)))
        return json_({ ok: false, error: "INVALID_CREDENTIALS" });
      return json_({ ok: true, family: JSON.parse(row[2]) });
    }
    body.family = normalizeFamily_(body.family || {});
    const validationError = validateFamily_(body.family);
    if (validationError) return json_({ ok: false, error: validationError });
    lock.waitLock(30000);
    const raw = rawSheet_();
    if (body.action === "registerFamily") {
      if (!body.password || String(body.password).length < 6)
        return json_({ ok: false, error: "INVALID_PASSWORD" });
      if (findIdentity_(raw, body.family.identity, 1))
        return json_({ ok: false, error: "IDENTITY_EXISTS" });
      const family = upsertFamily_(
        body.family,
        body.family.identity,
        passwordHash_(String(body.password)),
      );
      return json_({ ok: true, family: family });
    }
    if (body.action === "updateFamily") {
      const originalIdentity = String(body.originalIdentity || "");
      const original = findIdentity_(raw, originalIdentity, 1);
      if (!original) return json_({ ok: false, error: "NOT_FOUND" });
      const duplicate = findIdentity_(raw, body.family.identity, 1);
      if (duplicate && duplicate.getRow() !== original.getRow())
        return json_({ ok: false, error: "IDENTITY_EXISTS" });
      const oldHash = String(
        raw.getRange(original.getRow(), 2).getValue() || "",
      );
      const nextHash = body.newPassword
        ? passwordHash_(String(body.newPassword))
        : oldHash;
      const family = upsertFamily_(body.family, originalIdentity, nextHash);
      return json_({ ok: true, family: family });
    }
    return json_({ ok: false, error: "INVALID_ACTION" });
  } catch (error) {
    return json_({ ok: false, error: String(error) });
  } finally {
    try {
      lock.releaseLock();
    } catch (e) {}
  }
}

function doGet(e) {
  if ((e.parameter.action || "") !== "list")
    return json_({ ok: true, service: "عائلة دلول" });
  const raw = rawSheet_();
  if (raw.getLastRow() < 2) return json_({ ok: true, families: [] });
  const families = raw
    .getRange(2, 3, raw.getLastRow() - 1, 1)
    .getValues()
    .flat()
    .filter(Boolean)
    .map((value) => JSON.parse(value));
  return json_({ ok: true, families: families });
}
