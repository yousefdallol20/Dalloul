// هذا الملف يُلصق داخل Google Apps Script المرتبط بالملف «عائلة دلول».
// غيّر هذا الرقم كلما غيّرت أعمدة الشيت ليُعاد ضبط الرؤوس تلقائياً.
const SCHEMA_VERSION = "2026-11-11-d";

const FAMILY_HEADERS = [
  "وقت التسجيل",
  "اسم رب الأسرة",
  "رقم الهوية",
  "الجوال الأساسي",
  "رقم جوال بديل",
  "مقدمة واتساب",
  "رقم واتساب",
  "تاريخ الميلاد",
  "الجنس",
  "الحالة الاجتماعية",
  "حالة رب الأسرة",
  "حالة العمل",
  "الحالة الصحية",
  "تفاصيل الحالة الصحية",
  "الحالة التعليمية",
  "نوع الشهادة أو التخصص",
  "المنطقة الأصلية",
  "العنوان الأصلي",
  "حالة السكن الأصلي",
  "حالة النزوح",
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
  "تاريخ الشهادة",
  "تفاصيل الاستشهاد",
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

  // مسار سريع: إذا جُهّزت الورقة بنفس نسخة المخطط لا نعيد ضبطها في كل طلب
  const readyKey = "sheet-ready-" + SCHEMA_VERSION + "-" + name;
  if (sheet && CacheService.getScriptCache().get(readyKey)) return sheet;

  if (!sheet) sheet = file.insertSheet(name);
  if (sheet.getMaxColumns() < headers.length)
    sheet.insertColumnsAfter(
      sheet.getMaxColumns(),
      headers.length - sheet.getMaxColumns(),
    );

  sheet.getRange(1, 1, 1, sheet.getLastColumn() || 1).clearContent();
  sheet
    .getRange(1, 1, 1, headers.length)
    .setValues([headers])
    .setFontWeight("bold")
    .setBackground("#1769e0")
    .setFontColor("#ffffff");
  sheet.setFrozenRows(1);
  sheet.setRightToLeft(true);

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

  if (name === "الأفراد") {
    try {
      sheet.showColumns(1, headers.length);
    } catch (e) {}
  }

  CacheService.getScriptCache().put(readyKey, "1", 21600);
  return sheet;
}

function rawSheet_() {
  const rawKey = "raw-ready-" + SCHEMA_VERSION;
  const existingRaw =
    SpreadsheetApp.getActiveSpreadsheet().getSheetByName("بيانات النظام");
  if (existingRaw && CacheService.getScriptCache().get(rawKey))
    return existingRaw;

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
  CacheService.getScriptCache().put(rawKey, "1", 21600);
  return raw;
}

function initializeSheets() {
  sheet_("العائلات", FAMILY_HEADERS);
  sheet_("الأفراد", MEMBER_HEADERS);
  rawSheet_();
  return true;
}

function migrateExistingFamilies() {
  CacheService.getScriptCache().removeAll([
    "sheet-ready-" + SCHEMA_VERSION + "-العائلات",
    "sheet-ready-" + SCHEMA_VERSION + "-الأفراد",
    "sheet-ready-" + SCHEMA_VERSION + "-بيانات النظام",
    "raw-ready-" + SCHEMA_VERSION,
    "identity-map-v1",
  ]);

  const raw = rawSheet_();
  if (raw.getLastRow() < 2) return "لا توجد بيانات سابقة لإعادة ترتيبها.";

  const rows = raw.getRange(2, 3, raw.getLastRow() - 1, 1).getValues();
  let updatedCount = 0;

  const memberSheet =
    SpreadsheetApp.getActiveSpreadsheet().getSheetByName("الأفراد");
  if (memberSheet && memberSheet.getLastRow() > 1) {
    memberSheet.deleteRows(2, memberSheet.getLastRow() - 1);
  }

  for (let i = 0; i < rows.length; i++) {
    const jsonStr = rows[i][0];
    if (jsonStr) {
      try {
        const family = JSON.parse(jsonStr);
        const passMatch = findIdentity_(raw, family.identity, 1);
        const passwordHash = passMatch
          ? String(raw.getRange(passMatch.getRow(), 2).getValue() || "")
          : "";

        upsertFamily_(family, family.identity, passwordHash);
        updatedCount++;
      } catch (err) {
        console.log("خطأ في معالجة العائلة: " + err);
      }
    }
  }

  const familySheet =
    SpreadsheetApp.getActiveSpreadsheet().getSheetByName("العائلات");
  if (familySheet && familySheet.getLastColumn() > FAMILY_HEADERS.length) {
    const extraCols = familySheet.getLastColumn() - FAMILY_HEADERS.length;
    familySheet.deleteColumns(FAMILY_HEADERS.length + 1, extraCols);
  }

  return `تمت إعادة ترتيب العائلات وملء ورقة الأفراد لـ ${updatedCount} عائلة بنجاح!`;
}

function findIdentity_(sheet, identity, column) {
  if (sheet.getLastRow() < 2) return null;
  return sheet
    .getRange(2, column, sheet.getLastRow() - 1, 1)
    .createTextFinder(String(identity))
    .matchEntireCell(true)
    .findNext();
}

function idKey_(v) {
  const d = String(v || "").replace(/\D/g, "");
  return d ? d.padStart(9, "0") : "";
}

function identityMap_() {
  const cache = CacheService.getScriptCache();
  const cached = cache.get("identity-map-v1");
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch (e) {}
  }

  const raw = rawSheet_();
  const map = {};
  if (raw.getLastRow() >= 2) {
    raw
      .getRange(2, 1, raw.getLastRow() - 1, 3)
      .getValues()
      .forEach(function (row) {
        const headId = idKey_(row[0]);
        if (!headId) return;
        map[headId] = headId;
        try {
          (JSON.parse(String(row[2] || "{}")).members || []).forEach(
            function (m) {
              if (m && m.identity) map[idKey_(m.identity)] = headId;
            },
          );
        } catch (e) {}
      });
  }

  const text = JSON.stringify(map);
  if (text.length < 90000) cache.put("identity-map-v1", text, 300);
  return map;
}

function collectIdentities_(excludeIdentity) {
  const map = identityMap_();
  const skip = idKey_(excludeIdentity);
  const used = {};
  Object.keys(map).forEach(function (id) {
    if (map[id] !== skip) used[id] = true;
  });
  return used;
}

function findDuplicateIdentity_(family, excludeIdentity) {
  const used = collectIdentities_(excludeIdentity);
  const seen = {};
  const ids = [family.identity].concat(
    (family.members || []).map(function (m) {
      return m.identity;
    }),
  );
  for (let i = 0; i < ids.length; i++) {
    const id = idKey_(ids[i]);
    if (!id) continue;
    if (used[id] || seen[id]) return id;
    seen[id] = true;
  }
  return "";
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
    .replace(/[أإ]/g, "ا")
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
        member.health && member.health !== "سليم" && member.health !== "شهيد"
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
  if (family.altPhone && !/^\d{10}$/.test(String(family.altPhone)))
    return "INVALID_ALT_PHONE";
  if (
    !/^\d{9,10}$/.test(String(family.alternate || "")) ||
    ["+970", "+972"].indexOf(String(family.whatsappPrefix || "")) === -1
  )
    return "INVALID_WHATSAPP";
  if (
    ["دبلوم", "بكالوريوس", "ماجستير", "دكتوراه", "تعليم مهني"].indexOf(
      String(family.education || ""),
    ) !== -1 &&
    !String(family.educationDetail || "").trim()
  )
    return "EDUCATION_DETAIL_REQUIRED";

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

function sheetValue_(value) {
  if (Array.isArray(value)) {
    return value.length ? value.join("، ") : "لا يوجد";
  }
  if (value === null || value === undefined) return "لا يوجد";
  const text = String(value).trim();
  return text || "لا يوجد";
}

function savePhoto_(dataUrl, identity, kind, folderName) {
  const currentValue = String(dataUrl || "").trim();

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

  if (!currentValue || currentValue.indexOf("data:image/") !== 0) {
    return "";
  }

  const match = currentValue.match(
    /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/,
  );

  if (!match) return "";

  const folders = DriveApp.getFoldersByName(folderName);
  const folder = folders.hasNext()
    ? folders.next()
    : DriveApp.createFolder(folderName);

  const mimeType = match[1];
  const extension = mimeType.split("/")[1].replace("jpeg", "jpg");
  const fileName = `${kind}-${identity}-${Date.now()}.${extension}`;

  const blob = Utilities.newBlob(
    Utilities.base64Decode(match[2]),
    mimeType,
    fileName,
  );

  const file = folder.createFile(blob);

  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  try {
    file.setSecurityUpdateEnabled(false);
  } catch (error) {
    console.log("تعذر تعطيل Security Update: " + error);
  }

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

  const headName = sheetValue_(family.head);

  const familyRow = [
    new Date(),
    headName,
    sheetValue_(family.identity),
    sheetValue_(family.phone),
    sheetValue_(family.altPhone),
    sheetValue_(family.whatsappPrefix),
    sheetValue_(family.alternate),
    sheetValue_(family.birth),
    sheetValue_(family.gender),
    sheetValue_(family.marital),
    sheetValue_(family.headStatus),
    sheetValue_(family.work),
    sheetValue_(family.health),
    sheetValue_(family.disease),
    sheetValue_(family.education),
    sheetValue_(family.educationDetail),
    sheetValue_(family.originalArea),
    sheetValue_(family.originalAddress),
    sheetValue_(family.originalHousingStatus),
    sheetValue_(family.displacementStatus),
    sheetValue_(family.displacementArea),
    sheetValue_(family.residence),
    sheetValue_(family.housing),
    idPhotoUrl
      ? `=HYPERLINK("${idPhotoUrl}"; "صورة هوية ${headName}")`
      : "لا يوجد",
    slipPhotoUrl
      ? `=HYPERLINK("${slipPhotoUrl}"; "صورة سليب ${headName}")`
      : "لا يوجد",
    tentPhotoUrl
      ? `=HYPERLINK("${tentPhotoUrl}"; "صورة خيمة ${headName}")`
      : "لا يوجد",
    (family.members || []).filter(function (m) {
      return m.health !== "شهيد";
    }).length + (family.headStatus === "شهيد" ? 0 : 1),
    sheetValue_(family.needs || []),
  ];

  const existing = findIdentity_(families, originalIdentity, 3);
  const targetRow = existing ? existing.getRow() : families.getLastRow() + 1;
  if (targetRow > families.getMaxRows())
    families.insertRowsAfter(families.getMaxRows(), 50);
  families.getRange(targetRow, 3, 1, 5).setNumberFormat("@");
  families.getRange(targetRow, 1, 1, familyRow.length).setValues([familyRow]);

  const oldKeys = [idKey_(originalIdentity), idKey_(family.identity)];
  const lastMemberRow = members.getLastRow();
  if (lastMemberRow >= 2) {
    const owners = members.getRange(2, 1, lastMemberRow - 1, 1).getDisplayValues();
    const isOld = function (index) {
      return oldKeys.indexOf(idKey_(owners[index][0])) !== -1;
    };
    let i = owners.length - 1;
    while (i >= 0) {
      if (isOld(i)) {
        let start = i;
        while (start - 1 >= 0 && isOld(start - 1)) start--;
        members.deleteRows(start + 2, i - start + 1);
        i = start - 1;
      } else {
        i--;
      }
    }
  }

  const memberRows = (family.members || []).map(function (member) {
    return [
      sheetValue_(family.identity),
      headName,
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
      sheetValue_(member.health === "شهيد" && member.martyrDate ? member.martyrDate : "لا يوجد"),
      sheetValue_(member.health === "شهيد" && member.martyrDetails ? member.martyrDetails : "لا يوجد"),
    ];
  });
  if (memberRows.length) {
    const firstFree = members.getLastRow() + 1;
    if (firstFree + memberRows.length - 1 > members.getMaxRows())
      members.insertRowsAfter(members.getMaxRows(), memberRows.length + 50);
    const memberRange = members.getRange(firstFree, 1, memberRows.length, MEMBER_HEADERS.length);
    memberRange.setNumberFormat("@");
    memberRange.setValues(memberRows);
  }

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

  CacheService.getScriptCache().remove("identity-map-v1");
  return storedFamily;
}

function doPost(e) {
  function normalizeRecoveryAnswer_(value, type) {
    if (type === "identity") {
      return String(value || "").replace(/\D/g, "");
    }
    return String(value || "")
      .trim()
      .slice(0, 10);
  }

  function startPasswordReset_(identity) {
    identity = String(identity || "").replace(/\D/g, "");

    if (!/^\d{9}$/.test(identity)) {
      return { ok: false, error: "NOT_FOUND" };
    }

    const cache = CacheService.getScriptCache();
    const rateKey = `password-reset-rate-${passwordHash_(identity).slice(0, 20)}`;

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

    cache.put(`password-reset-${token}`, JSON.stringify(challenge), 600);

    return {
      ok: true,
      token: token,
      question: selected.question,
      inputType: selected.inputType,
    };
  }

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

    raw.getRange(match.getRow(), 2).setValue(passwordHash_("12345678"));

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

    if (body.action === "startPasswordReset") {
      return json_(startPasswordReset_(body.identity));
    }

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

    if (body.action === "checkIdentity") {
      return json_({
        ok: true,
        exists: !!collectIdentities_(body.exclude)[idKey_(body.identity)],
      });
    }

    body.family = normalizeFamily_(body.family || {});
    const validationError = validateFamily_(body.family);
    if (validationError) return json_({ ok: false, error: validationError });
    lock.waitLock(30000);
    const raw = rawSheet_();

    if (body.action === "registerFamily") {
      if (!body.password || String(body.password).length < 6)
        return json_({ ok: false, error: "INVALID_PASSWORD" });
      const dup = findDuplicateIdentity_(body.family, "");
      if (dup)
        return json_({ ok: false, error: "IDENTITY_EXISTS", identity: dup });
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
      const dup = findDuplicateIdentity_(body.family, originalIdentity);
      if (dup)
        return json_({ ok: false, error: "IDENTITY_EXISTS", identity: dup });
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
    return json_({ ok: true, service: "عائلة دلول", version: SCHEMA_VERSION });
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