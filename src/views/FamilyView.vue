<script setup lang="ts">
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
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
import { computed, ref } from "vue";
import { useRegistry } from "../composables/useRegistry";

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
  logoutFamily,
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

// دالة حساب العمر الدقيقة بالشهور والأيام لمن هم أقل من سنة، وبالسنين لمن هم سنة فأكثر
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

const userMenuOpen = ref(false);

// هل العائلة نازحة؟
const isDisplaced = computed(
  () =>
    (currentFamily.value.displacementStatus ||
      (currentFamily.value.displacementArea ? "نازح" : "")) === "نازح",
);

// فحص النقص في بيانات الملف
const missingInfo = computed(() => {
  const missing: string[] = [];
  const f = currentFamily.value;

  const needsDetail = ["دبلوم", "بكالوريوس", "ماجستير", "دكتوراه", "تعليم مهني"];

  if (!f.altPhone) missing.push("رقم الجوال البديل");
  if (!f.disease && f.health && f.health !== "سليم") missing.push("تفاصيل الحالة الصحية");
  
  if (needsDetail.includes(f.education) && !f.educationDetail) {
    missing.push("نوع الشهادة أو التخصص");
  }

  if (!f.originalAddress) missing.push("العنوان الأصلي");
  if (!f.originalHousingStatus) missing.push("حالة السكن الأصلي");
  if (isDisplaced.value && !f.displacementArea) missing.push("منطقة النزوح");
  if (isDisplaced.value && !f.housing) missing.push("نوع مكان النزوح");
  
  if (isDisplaced.value && f.housing === "خيمة" && !f.tentPhoto) {
    missing.push("صورة الخيمة");
  }

  if (!f.idPhoto) missing.push("صورة الهوية");
  if (!f.slipPhoto) missing.push("صورة السليب");
  if (!f.needs || f.needs.length === 0) missing.push("الاحتياجات ذات الأولوية");

  return missing;
});

function signOutFamily() {
  userMenuOpen.value = false;
  logoutFamily();
}
</script>

<template>
  <header class="family-header">
    <img src="/دلول.jpeg" alt="دلول" />

    <div class="family-user-menu">
      <button
        class="user-menu"
        :aria-expanded="userMenuOpen"
        @click="userMenuOpen = !userMenuOpen"
      >
        <span>
          {{
            (currentFamily.first || currentFamily.head.split(" ")[0]).charAt(0)
          }}
        </span>

        {{ currentFamily.first || currentFamily.head.split(" ")[0] }}

        <ChevronDown :size="17" :class="{ open: userMenuOpen }" />
      </button>

      <div v-if="userMenuOpen" class="family-user-dropdown">
        <button @click="signOutFamily">
          <LogOut :size="18" />
          تسجيل الخروج
        </button>
      </div>
    </div>
  </header>

  <main class="family-page">
    <section class="welcome">
      <div>
        <span class="eyebrow blue">ملف العائلة</span>

        <h1>
          أهلاً بابن العائلة،
          {{ currentFamily.first || currentFamily.head.split(" ")[0] }}
          دلول
        </h1>
      </div>
    </section>

    <div class="summary-cards">
      <article>
        <span><UsersRound /></span>

        <div>
          <small>عدد أفراد الأسرة</small>

          <b>
            {{
              currentFamily.members.filter((m: any) => m.health !== "شهيد").length +
              (currentFamily.headStatus === "شهيد" ? 0 : 1)
            }}
          </b>
        </div>
      </article>

      <article>
        <span><Home /></span>

        <div>
          <small>السكن الحالي</small>
          <b>{{ isDisplaced ? currentFamily.housing : "غير نازح" }}</b>
        </div>
      </article>

      <article>
        <span><MapPinIcon /></span>

        <div>
          <small>مكان الإقامة</small>
          <b>
            {{
              isDisplaced
                ? currentFamily.residence
                : currentFamily.originalArea
            }}
          </b>
        </div>
      </article>

      <article>
        <span><ShieldCheck /></span>

        <div>
          <small>حالة الملف</small>
          <div style="display: flex; flex-direction: column;">
            <b :class="missingInfo.length === 0 ? 'green' : ''" style="color: var(--danger-color, #e53e3e);" v-if="missingInfo.length > 0">غير مكتمل</b>
            <b class="green" v-else>مكتمل</b>
            
            <small v-if="missingInfo.length > 0" style="font-size: 10px; color: #718096; margin-top: 2px; line-height: 1.2;">
              ناقص: {{ missingInfo.join("، ") }}
            </small>
          </div>
        </div>
      </article>
    </div>

    <section class="detail-card">
      <div class="card-title">
        <div>
          <UserRound />
          <h2>جميع بيانات رب الأسرة</h2>
        </div>

        <div class="card-title-actions">
          <span class="status">
            {{ currentFamily.headStatus }}
          </span>

          <button
            class="section-edit-button"
            @click="startSectionEdit(1, 'head')"
          >
            <Edit3 :size="16" />
            تعديل
          </button>
        </div>
      </div>

      <div class="detail-grid">
        <Info class="wide" label="الاسم الكامل" :value="currentFamily.head" />
        <Info label="رقم الهوية" :value="currentFamily.identity" />
        <Info label="رقم الجوال الأساسي" :value="currentFamily.phone" />
        <Info label="رقم جوال بديل" :value="currentFamily.altPhone" />

        <Info
          label="رقم واتساب"
          :value="
            currentFamily.whatsapp ||
            internationalWhatsapp(
              currentFamily.whatsappPrefix,
              currentFamily.alternate,
            )
          "
          :ltr="true"
        />

        <Info label="تاريخ الميلاد" :value="currentFamily.birth" />
        <Info label="الجنس" :value="currentFamily.gender" />
        <Info label="الحالة الاجتماعية" :value="currentFamily.marital" />
        <Info label="حالة رب الأسرة" :value="currentFamily.headStatus" />
        <Info label="حالة العمل" :value="currentFamily.work" />
        <Info label="الحالة الصحية" :value="currentFamily.health" />
        <Info
          class="wide"
          label="تفاصيل الحالة الصحية"
          :value="currentFamily.disease"
        />
        <Info label="الحالة التعليمية" :value="currentFamily.education" />

        <Info
          class="wide"
          label="نوع الشهادة أو التخصص"
          :value="currentFamily.educationDetail"
        />
      </div>
    </section>

    <section class="detail-card">
      <div class="card-title">
        <div>
          <Home />
          <h2>جميع بيانات السكن والنزوح</h2>
        </div>

        <div class="card-title-actions">
          <button
            class="section-edit-button"
            @click="startSectionEdit(2, 'housing')"
          >
            <Edit3 :size="16" />
            تعديل
          </button>
        </div>
      </div>

      <div class="detail-grid">
        <Info label="المنطقة الأصلية" :value="currentFamily.originalArea" />
        <Info
          class="wide"
          label="العنوان الأصلي"
          :value="currentFamily.originalAddress"
        />

        <Info
          label="حالة السكن الأصلي"
          :value="currentFamily.originalHousingStatus"
        />

        <Info
          label="حالة النزوح"
          :value="isDisplaced ? 'نازح' : 'غير نازح'"
        />

        <template v-if="isDisplaced">
          <Info
            label="منطقة النزوح"
            :value="currentFamily.displacementArea"
          />

          <Info
            class="wide"
            label="مكان النزوح بالتفصيل"
            :value="currentFamily.residence"
          />

          <Info label="نوع مكان النزوح" :value="currentFamily.housing" />
        </template>
      </div>

      <div
        v-if="currentFamily.tentPhoto"
        class="document-links single-document"
      >
        <article class="document-link-card">
          <div>
            <TentTree />

            <span>
              <b>صورة الخيمة</b>
              <small>صورة مكان النزوح</small>
            </span>
          </div>

          <button
            class="outline small"
            @click="openPhoto(currentFamily.tentPhoto, 'صورة الخيمة')"
          >
            <Eye :size="17" />
            عرض
          </button>
        </article>
      </div>
    </section>

    <section class="detail-card">
      <div class="card-title">
        <div>
          <ShieldCheck />
          <h2>الصور والوثائق</h2>
        </div>

        <div class="card-title-actions">
          <button
            class="section-edit-button"
            @click="startSectionEdit(1, 'documents')"
          >
            <Edit3 :size="16" />
            تعديل
          </button>
        </div>
      </div>

      <div class="document-links">
        <article v-if="currentFamily.idPhoto" class="document-link-card">
          <div>
            <UserRound />

            <span>
              <b>صورة الهوية</b>
              <small>وثيقة رب الأسرة</small>
            </span>
          </div>

          <button
            class="outline small"
            @click="openPhoto(currentFamily.idPhoto, 'صورة الهوية')"
          >
            <Eye :size="17" />
            عرض
          </button>
        </article>

        <article v-if="currentFamily.slipPhoto" class="document-link-card">
          <div>
            <FileSpreadsheet />

            <span>
              <b>صورة السليب</b>
              <small>وثيقة رب الأسرة</small>
            </span>
          </div>

          <button
            class="outline small"
            @click="openPhoto(currentFamily.slipPhoto, 'صورة السليب')"
          >
            <Eye :size="17" />
            عرض
          </button>
        </article>

        <p v-if="!currentFamily.idPhoto && !currentFamily.slipPhoto">
          لا توجد صور مضافة.
        </p>
      </div>
    </section>

    <section class="detail-card">
      <div class="card-title">
        <div>
          <UsersRound />
          <h2>جميع بيانات أفراد الأسرة</h2>
        </div>

        <div class="card-title-actions">
          <span class="count-pill">
            {{ currentFamily.members.length }} أفراد
          </span>

          <button
            class="section-edit-button"
            @click="startSectionEdit(3, 'members')"
          >
            <Edit3 :size="16" />
            تعديل
          </button>
        </div>
      </div>

      <div class="drawer-members">
        <article v-for="member in currentFamily.members" :key="member.id">
          <div class="member-card-title">
            <span class="avatar">
              {{ member.first[0] }}
            </span>

            <div>
              <b>
                {{ member.first }}
                {{ member.father }}
                {{ member.grandfather }}
                دلول
              </b>

              <small>
                {{ member.relation }}
                <span
                  v-if="member.health === 'شهيد'"
                  class="tag warning"
                  style="margin-right: 6px"
                  >شهيد (غير محتسب)</span
                >
              </small>
            </div>
          </div>

          <div class="detail-grid member-grid">
            <Info label="رقم الهوية" :value="member.identity" />
            <Info label="تاريخ الميلاد" :value="member.birth" />

            <Info label="العمر" :value="formatAge(member.birth)" />

            <Info label="الجنس" :value="member.gender" />
            <Info label="صلة القرابة" :value="member.relation" />
            <Info label="الحالة الصحية" :value="member.health" />

            <template v-if="member.health === 'شهيد'">
              <Info
                label="تاريخ الشهادة"
                :value="(member as any).martyrDate || 'لا يوجد'"
              />
              <Info
                class="wide"
                label="تفاصيل الاستشهاد"
                :value="(member as any).martyrDetails || 'لا يوجد'"
              />
            </template>

            <Info label="الحالة التعليمية" :value="member.education" />

            <Info
              class="wide"
              label="نوع الشهادة أو التخصص"
              :value="member.educationDetail"
            />

            <Info
              v-if="member.health !== 'شهيد'"
              class="wide"
              label="الحالات الخاصة"
              :value="(member.special || []).join('، ') || 'لا توجد'"
            />

            <Info
              v-if="
                member.health &&
                member.health !== 'سليم' &&
                member.health !== 'شهيد'
              "
              class="wide"
              label="احتياجات المريض"
              :value="(member.healthNeeds || []).join('، ') || 'لم تحدد'"
            />
          </div>
        </article>
      </div>
    </section>

    <section class="detail-card">
      <div class="card-title">
        <div>
          <HeartPulse />
          <h2>الاحتياجات ذات الأولوية</h2>
        </div>

        <div class="card-title-actions">
          <button
            class="section-edit-button"
            @click="startSectionEdit(4, 'needs')"
          >
            <Edit3 :size="16" />
            تعديل
          </button>
        </div>
      </div>

      <div class="needs-view">
        <span v-for="need in currentFamily.needs" :key="need">
          <Check />
          {{ need }}
        </span>
      </div>
    </section>

    <section class="detail-card password-profile-card">
      <div class="card-title">
        <div>
          <ShieldCheck />
          <h2>كلمة المرور</h2>
        </div>

        <div class="card-title-actions">
          <button class="outline" @click="startPasswordChange">
            <Edit3 :size="18" />
            تغيير كلمة المرور
          </button>
        </div>
      </div>

      <p>يمكنك تغيير كلمة المرور من هنا. إذا لم ترغب بتغييرها فستبقى كما هي.</p>
    </section>
  </main>
</template>