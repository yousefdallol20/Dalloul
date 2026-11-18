<script setup lang="ts">
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronLeft,
  CircleUserRound,
  Download,
  Edit3,
  Eye,
  FileSpreadsheet,
  Filter,
  HeartPulse,
  Home,
  LogOut,
  Menu,
  MessageCircle,
  Phone,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  TentTree,
  MapPin as MapPinIcon,
  UserRound,
  UsersRound,
  X,
} from "lucide-vue-next";
import { computed, ref, unref } from "vue";
import { useRegistry } from "../composables/useRegistry";

// لوحة الإدارة التي تضم العائلات والأفراد والإعدادات.
const {
  Info,
  view,
  adminTab,
  step,
  showPassword,
  menuOpen,
  familyFilterOpen,
  peopleFilterOpen,
  bulkMessageOpen,
  bulkMessage,
  selectedFamily,
  selectedMember,
  selectedPhoto,
  editingMember,
  editingSection,
  editingGroup,
  toast,
  search,
  peopleSearch,
  loginIdentity,
  loginPassword,
  loginBusy,
  adminToken,
  familyToken,
  familyId,
  editingFamily,
  familySaving,
  sheetsUrl,
  sheetsConnected,
  sheetsBusy,
  needOptions,
  conditions,
  womenConditions,
  memberConditions,
  regions,
  educationOptions,
  educationNeedsDetail,
  form,
  memberDraft,
  draftMembers,
  sampleFamilies,
  familyFilters,
  peopleFilters,
  allFamilies,
  filteredFamilies,
  allPeople,
  filteredPeople,
  fullName,
  internationalWhatsapp,
  currentFamily,
  totalFamilies,
  totalPeople,
  displacedFamilies,
  healthCases,
  flash,
  clearFamilyFilters,
  clearPeopleFilters,
  go,
  normalizeName,
  splitLegacyHeadName,
  photoSrc,
  convertTaaMarbuta,
  normalizeFamilyNames,
  loadFamilyIntoForm,
  startFamilyEdit,
  startSectionEdit,
  startPasswordChange,
  cancelSectionEdit,
  openPhoto,
  loginUser,
  setAdminTab,
  logoutAdmin,
  loadSheetsStatus,
  loadAdminFamilies,
  saveSheetsSettings,
  nextStep,
  toggleNeed,
  saveMember,
  editMember,
  captureTentPhoto,
  captureDocumentPhoto,
  saveFamily,
  exportExcel,
  age,
  familyOfMember,
} = useRegistry();

// دالة حساب العمر بالشهور والأيام لمن هم أقل من سنة، وبالسنين لمن هم سنة فأكثر
function formatAge(birthDateStr: string) {
  if (!birthDateStr) return "—";
  const birth = new Date(birthDateStr);
  const now = new Date();
  
  if (isNaN(birth.getTime())) return `${age(birthDateStr)} سنة`;

  let years = now.getFullYear() - birth.getFullYear();
  let months = now.getMonth() - birth.getMonth();
  
  if (months < 0 || (months === 0 && now.getDate() < birth.getDate())) {
    years--;
    months += 12;
  }

  const totalMonths = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
  const adjustedMonths = now.getDate() < birth.getDate() ? totalMonths - 1 : totalMonths;

  if (years < 1) {
    const m = Math.max(0, adjustedMonths);
    if (m === 0) {
      const diffTime = Math.abs(now.getTime() - birth.getTime());
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      return diffDays <= 0 ? "حديث الولادة" : `${diffDays} يوم`;
    }
    return `${m} شهر`;
  }
  return `${years} سنة`;
}

// ===== منطق الشهداء: يظهر الاسم مع العائلة لكن لا يدخل في أي تعداد =====
const MARTYR = "شهيد";
const isMartyr = (m: any) => m?.health === MARTYR;
const isHeadMartyr = (f: any) => f?.headStatus === MARTYR;

// عدد أفراد العائلة المحتسبين (بدون الشهداء، ويشمل رب الأسرة إن لم يكن شهيداً)
const countedMembers = (f: any) =>
  (f.members || []).filter((m: any) => !isMartyr(m)).length +
  (isHeadMartyr(f) ? 0 : 1);

// عدد الشهداء داخل العائلة (للعرض فقط)
const martyrsOf = (f: any) =>
  (f.members || []).filter(isMartyr).length + (isHeadMartyr(f) ? 1 : 0);

// الحالة الصحية تُحتسب فقط إذا لم تكن سليم ولا شهيد
const isHealthCase = (h: any) => !!h && h !== "سليم" && h !== MARTYR;

const totalCounted = computed(() =>
  (unref(allFamilies) as any[]).reduce((sum, f) => sum + countedMembers(f), 0),
);

const healthCasesCounted = computed(() =>
  (unref(allFamilies) as any[]).reduce((sum, f) => {
    const members = (f.members || []).filter(
      (m: any) => !isMartyr(m) && isHealthCase(m.health),
    ).length;
    const head = !isHeadMartyr(f) && isHealthCase(f.health) ? 1 : 0;
    return sum + members + head;
  }, 0),
);

// ===== فلترة الأفراد: الشهادة + تاريخ الشهادة =====
const shownPeople = computed(() => {
  const pf: any = unref(peopleFilters) || {};
  const mode = pf.martyr || "all"; // all | alive | martyr
  const from = pf.martyrFrom || "";
  const to = pf.martyrTo || "";
  return (unref(filteredPeople) as any[]).filter((p) => {
    if (mode === "alive") return !isMartyr(p);
    if (mode === "martyr") {
      if (!isMartyr(p)) return false;
      const d = p.martyrDate || "";
      if (from && (!d || d < from)) return false;
      if (to && (!d || d > to)) return false;
    }
    return true;
  });
});

const shownCounted = computed(
  () => shownPeople.value.filter((p) => !isMartyr(p)).length,
);
const shownMartyrs = computed(
  () => shownPeople.value.filter((p) => isMartyr(p)).length,
);
</script>

<template>
  <!-- لوحة الإدارة التي تضم العائلات والأفراد والإعدادات. -->
  <aside class="sidebar" :class="{ open: menuOpen }">
    <div class="side-brand app-logo-brand">
      <img src="/دلول.jpeg" alt="شعار عائلة دلول" class="app-logo-img" />
      <span class="app-logo-title">عائلة دلول</span>
      <button @click="menuOpen = false">
        <X />
      </button>
    </div>
    <nav>
      <button
        :class="{ active: adminTab === 'families' }"
        @click="setAdminTab('families')"
      >
        <Home />العائلات</button
      ><button
        :class="{ active: adminTab === 'people' }"
        @click="setAdminTab('people')"
      >
        <UsersRound />جميع الأفراد</button
      ><button
        :class="{ active: adminTab === 'settings' }"
        @click="setAdminTab('settings')"
      >
        <Settings />إعدادات الإدارة
      </button>
    </nav>
    <div class="side-footer">
      <button @click="logoutAdmin"><LogOut />تسجيل الخروج</button>
    </div>
  </aside>
  <div v-if="menuOpen" class="backdrop" @click="menuOpen = false"></div>
  <main class="admin-main">
    <header class="admin-header">
      <button class="menu-button" @click="menuOpen = true"><Menu /></button>
      <div>
        <h1>
          {{
            adminTab === "families"
              ? "العائلات"
              : adminTab === "people"
                ? "جميع الأفراد"
                : "إعدادات الإدارة"
          }}
        </h1>
        <p>
          {{
            adminTab === "families"
              ? "متابعة وإدارة ملفات العائلات المسجلة"
              : adminTab === "people"
                ? "قائمة موحّدة مرتبة حسب العمر"
                : "بيانات الحساب وربط Google Sheets"
          }}
        </p>
      </div>
      <div class="admin-actions">
        <span class="sync" :class="{ disconnected: !sheetsConnected }"
          ><i></i
          >{{
            sheetsConnected ? "Google Sheets مربوط" : "Google Sheets غير مربوط"
          }}</span
        >
      </div>
    </header>

    <template v-if="adminTab === 'families'">
      <div class="stat-grid">
        <article>
          <span><UsersRound /></span>
          <div>
            <small>إجمالي العائلات</small><b>{{ totalFamilies }}</b
            ><em>عائلة مسجلة</em>
          </div>
        </article>
        <article>
          <span><CircleUserRound /></span>
          <div>
            <small>إجمالي الأفراد (المحتسبين)</small>
            <b>{{ totalCounted }}</b>
            <em>بدون الشهداء</em>
          </div>
        </article>
        <article>
          <span><TentTree /></span>
          <div>
            <small>العائلات النازحة</small><b>{{ displacedFamilies }}</b
            ><em>لديها منطقة نزوح</em>
          </div>
        </article>
        <article>
          <span><HeartPulse /></span>
          <div>
            <small>حالات صحية</small><b>{{ healthCasesCounted }}</b
            ><em>مرضى، مصابون، ذوو إعاقة</em>
          </div>
        </article>
      </div>
      <section class="data-section">
        <div class="data-toolbar">
          <div class="search-box">
            <Search /><input
              v-model="search"
              placeholder="ابحث بالاسم، الهوية، الجوال أو المنطقة..."
            />
          </div>
          <button class="outline" @click="familyFilterOpen = true">
            <Filter /> الفلترة</button
          ><button class="outline sms-button" @click="bulkMessageOpen = true">
            <MessageCircle /> رسالة SMS جماعية</button
          ><button class="primary" @click="exportExcel('families')">
            <Download /> تصدير Excel
          </button>
        </div>
        <div class="section-meta">
          <div>
            <h2>ملفات العائلات</h2>
            <p>مرتبة حسب عدد أفراد الأسرة من الأكبر إلى الأصغر</p>
          </div>
          <b>{{ filteredFamilies.length }} عائلات معروضة</b>
        </div>
        <div v-if="!filteredFamilies.length" class="empty-state">
          <UsersRound />
          <h3>لا توجد عائلات مسجلة بعد</h3>
          <p>ستظهر هنا العائلات التي تُسجّل بياناتها الفعلية.</p>
        </div>
        <div v-else class="family-grid">
          <article
            v-for="f in filteredFamilies"
            :key="f.id"
            class="family-card"
            @click="selectedFamily = f"
          >
            <div class="family-top">
              <span class="avatar large">{{ f.head[0] }}</span>
              <div>
                <h3>{{ f.head }}</h3>
                <div style="display: flex; align-items: center; gap: 16px;">
                  <small># {{ f.identity }}</small>
                  <small v-if="f.birth"># {{ formatAge(f.birth) }}</small>
                </div>
              </div>
              <span class="tag" :class="{ warning: f.headStatus === 'شهيد' }">{{
                f.headStatus
              }}</span>
            </div>
            <div class="family-facts">
              <span
                ><UsersRound />{{ countedMembers(f) }}
                أفراد<small v-if="martyrsOf(f)" class="martyr-note">
                  (+{{ martyrsOf(f) }} شهيد)</small></span
              ><span
                ><MapPinIcon />{{
                  f.displacementStatus === 'غير نازح'
                    ? 'غير نازح'
                    : f.displacementArea
                }}</span
              ><span><Home />{{ f.housing }}</span
              ><span><HeartPulse />{{ f.health }}</span>
            </div>
            <div class="family-bottom">
              <a :href="`tel:${f.phone}`" @click.stop><Phone />{{ f.phone }}</a>
              <div>
                <button
                  title="إرسال رسالة"
                  @click.stop="bulkMessageOpen = true"
                >
                  <MessageCircle /></button
                ><button title="فتح الملف"><Eye /></button>
              </div>
            </div>
          </article>
        </div>
      </section>
    </template>

    <template v-else-if="adminTab === 'people'">
      <section class="data-section people-section">
        <div class="data-toolbar">
          <div class="search-box">
            <Search /><input
              v-model="peopleSearch"
              placeholder="ابحث عن فرد بالاسم أو رقم الهوية..."
            />
          </div>
          <button class="outline" @click="peopleFilterOpen = true">
            <Filter /> فلترة الأفراد والشهداء</button
          ><button class="primary" @click="exportExcel('people')">
            <Download /> تصدير Excel
          </button>
        </div>
        <div class="section-meta">
          <div>
            <h2>قائمة الأفراد</h2>
            <p>مرتبة حسب العمر من الأكبر إلى الأصغر</p>
          </div>
          <b
            >{{ shownCounted }} أفراد<template v-if="shownMartyrs">
              + {{ shownMartyrs }} شهيد</template
            ></b
          >
        </div>
        <div v-if="!shownPeople.length" class="empty-state">
          <CircleUserRound />
          <h3>لا يوجد أفراد مسجلون</h3>
          <p>ستظهر هنا بيانات الأفراد بعد تسجيل العائلات.</p>
        </div>
        <div v-else class="people-table">
          <div class="table-head">
            <span>الاسم</span><span>رقم الهوية</span><span>العمر</span
            ><span></span>
          </div>
          <button
            v-for="p in shownPeople"
            :key="p.id"
            @click="selectedMember = p"
          >
            <span class="person-cell"
              ><i class="avatar">{{ p.first[0] }}</i
              ><b>{{ p.first }} {{ p.father }} {{ p.grandfather }} دلول</b>
              <em
                v-if="isMartyr(p)"
                class="status-pill martyr"
                >شهيد<template v-if="p.martyrDate"> · {{ p.martyrDate }}</template></em
              ></span
            ><span>{{ p.identity }}</span
            ><span>{{ formatAge(p.birth) }}</span>
            <ChevronLeft />
          </button>
        </div>
      </section>
    </template>

    <template v-else>
      <div class="settings-grid">
        <section class="detail-card">
          <div class="card-title">
            <div>
              <CircleUserRound />
              <h2>بيانات المدير</h2>
            </div>
          </div>
          <div class="fields-grid two">
            <label>الاسم الكامل<input placeholder="أدخل اسم المدير" /></label
            ><label
              >البريد الإلكتروني<input
                type="email"
                placeholder="أدخل البريد الإلكتروني" /></label
            ><label
              >رقم الجوال<input
                inputmode="tel"
                placeholder="أدخل رقم الجوال" /></label
            ><label>رقم هوية المدير<input value="422693648" readonly /></label>
          </div>
          <div class="secure-login-note">
            <ShieldCheck />
            <div>
              <b>بيانات دخول الإدارة محمية</b>
              <p>
                يتم التحقق من رقم الهوية وكلمة المرور على الخادم ولا تظهر كلمة
                المرور داخل الواجهة أو ملفات الموقع.
              </p>
            </div>
          </div>
          <button class="primary"><Check />حفظ بيانات المدير</button>
        </section>
        <section class="detail-card sheets-settings">
          <div class="card-title">
            <div>
              <FileSpreadsheet />
              <h2>إعدادات Google Sheets</h2>
            </div>
            <span
              class="status"
              :class="sheetsConnected ? 'connected' : 'pending'"
              >{{ sheetsConnected ? "مربوط" : "غير مربوط" }}</span
            >
          </div>
          <p class="settings-intro">
            اربط ملف Google Sheets لحفظ كل عائلة وأفرادها تلقائياً عند التسجيل.
          </p>
          <label
            >رابط Google Apps Script Web App<input
              v-model="sheetsUrl"
              dir="ltr"
              placeholder="https://script.google.com/macros/s/.../exec" /></label
          ><button
            class="primary wide"
            :disabled="sheetsBusy"
            @click="saveSheetsSettings"
          >
            <FileSpreadsheet />{{
              sheetsBusy ? "جارٍ الحفظ..." : "حفظ واختبار الربط"
            }}
          </button>
          <div class="setup-steps">
            <b>طريقة التجهيز لأول مرة</b>
            <ol>
              <li>أنشئ ملف Google Sheets باسم «عائلة دلول».</li>
              <li>
                من الإضافات افتح Apps Script والصق ملف الربط المرفق مع المشروع.
              </li>
              <li>انشره كتطبيق ويب بصلاحية «أي شخص» وانسخ رابط Web App.</li>
              <li>ألصق الرابط أعلاه واضغط «حفظ واختبار الربط».</li>
            </ol>
          </div>
          <div class="note-box">
            <ShieldCheck />
            <p>
              بعد نجاح الربط، تُحفظ العائلات في صفحة «العائلات» والأفراد في صفحة
              «الأفراد» داخل الملف نفسه.
            </p>
          </div>
        </section>
      </div>
    </template>
  </main>
</template>

<style scoped>
.app-logo-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
}
.app-logo-img {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  object-fit: cover;
  border: 1px solid var(--border-color, #e2e8f0);
}
.app-logo-title {
  font-weight: 700;
  font-size: 1rem;
  color: var(--text-color, #1e293b);
  flex: 1;
}
.status-pill {
  margin-inline-start: 0.5rem;
  padding-block: 0.15rem;
  padding-inline: 0.5rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-style: normal;
  white-space: nowrap;
}
.status-pill.martyr {
  background: #fee4e2;
  color: #b42318;
}
.martyr-note {
  margin-inline-start: 0.35rem;
  color: #b54708;
  font-size: 0.75rem;
}
</style>