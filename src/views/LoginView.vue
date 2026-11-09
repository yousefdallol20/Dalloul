<script setup lang="ts">
import { ref } from "vue";
// بيانات نافذة استعادة كلمة المرور.
const forgotPasswordOpen = ref(false);
const recoveryStep = ref<1 | 2 | 3>(1);
const recoveryIdentity = ref("");
const recoveryToken = ref("");
const recoveryQuestion = ref("");
const recoveryAnswer = ref("");
const recoveryAnswerType = ref<"date" | "numeric">("numeric");
const recoveryBusy = ref(false);

// فتح نافذة استعادة كلمة المرور وإفراغ البيانات القديمة.
function openPasswordRecovery() {
  forgotPasswordOpen.value = true;
  recoveryStep.value = 1;
  recoveryIdentity.value = loginIdentity.value || "";
  recoveryToken.value = "";
  recoveryQuestion.value = "";
  recoveryAnswer.value = "";
}

// إغلاق نافذة الاستعادة.
function closePasswordRecovery() {
  forgotPasswordOpen.value = false;
  recoveryBusy.value = false;
}

// طلب سؤال عشوائي متعلق بأحد أفراد العائلة.
async function requestPasswordChallenge() {
  if (!/^\d{9}$/.test(recoveryIdentity.value)) {
    flash("أدخل رقم هوية مكوّنًا من 9 أرقام");
    return;
  }

  recoveryBusy.value = true;

  try {
    const response = await fetch("/api/families/password-reset/challenge", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ identity: recoveryIdentity.value }),
    });

    const data = await response.json();

    if (!response.ok || !data.ok) {
      const messages: Record<string, string> = {
        NOT_FOUND: "تعذر العثور على ملف عائلة بهذا الرقم",
        NO_RECOVERY_DATA: "لا توجد بيانات كافية للتحقق من الهوية",
        WAIT: "انتظر قليلًا قبل طلب سؤال جديد",
      };

      throw new Error(messages[data.error] || "تعذر بدء استعادة كلمة المرور");
    }

    recoveryToken.value = data.token;
    recoveryQuestion.value = data.question;
    recoveryAnswerType.value = data.inputType === "date" ? "date" : "numeric";
    recoveryAnswer.value = "";
    recoveryStep.value = 2;
  } catch (error) {
    flash(error instanceof Error ? error.message : "تعذر الاتصال بالخادم");
  } finally {
    recoveryBusy.value = false;
  }
}

// إرسال إجابة السؤال والتحقق منها.
async function confirmPasswordRecovery() {
  if (!recoveryAnswer.value) {
    flash("أدخل إجابة السؤال");
    return;
  }

  recoveryBusy.value = true;

  try {
    const response = await fetch("/api/families/password-reset/verify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        token: recoveryToken.value,
        answer: recoveryAnswer.value,
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.ok) {
      const messages: Record<string, string> = {
        INVALID_CHALLENGE: "انتهت مدة السؤال، اطلب سؤالًا جديدًا",
        WRONG_ANSWER: `الإجابة غير صحيحة. المحاولات المتبقية: ${data.attemptsLeft || 0}`,
        TOO_MANY_ATTEMPTS: "تم إيقاف المحاولة. اطلب سؤالًا جديدًا",
      };

      throw new Error(messages[data.error] || "تعذر إعادة تعيين كلمة المرور");
    }

    recoveryStep.value = 3;
  } catch (error) {
    flash(error instanceof Error ? error.message : "تعذر الاتصال بالخادم");
  } finally {
    recoveryBusy.value = false;
  }
}

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
import { useRegistry } from "../composables/useRegistry";

// واجهة تسجيل الدخول وإنشاء مستخدم جديد.
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
</script>

<template>
  <!-- واجهة تسجيل الدخول وإنشاء مستخدم جديد. -->
  <main class="auth-page">
    <section class="auth-brand">
      <div class="brand-copy">
        <span class="eyebrow">منصة بيانات العائلة</span>
        <h1>أهلاً بأبناء<br /><em>عائلة دلول</em></h1>
        <p>
          مرحباً بكم في المنصة الموحّدة والآمنة لتنظيم بيانات عائلة دلول وخدمة
          أبنائها.
        </p>
        <div class="trust-row">
          <ShieldCheck /><span>خصوصية وأمان</span><span class="dot"></span
          ><UsersRound /><span>بيانات منظمة</span>
        </div>
      </div>
      <div class="brand-rings"><span></span><span></span><span></span></div>
    </section>
    <section class="login-panel">
      <div class="login-card">
        <img src="/logo.png" alt="شعار دلول" class="auth-logo" />
        <div>
          <span class="eyebrow blue">أهلاً بعودتك</span>
          <h2>تسجيل الدخول</h2>
          <p>أدخل بياناتك للوصول إلى ملف عائلتك</p>
        </div>
        <form @submit.prevent="loginUser" class="form-stack">
          <label
            >رقم الهوية<input
              v-model="loginIdentity"
              inputmode="numeric"
              maxlength="9"
              placeholder="أدخل رقم الهوية المكوّن من 9 أرقام"
              required
          /></label>
          <label
            >كلمة المرور
            <div class="input-action">
              <input
                v-model="loginPassword"
                :type="showPassword ? 'text' : 'password'"
                placeholder="أدخل كلمة المرور"
                required
              /><button type="button" @click="showPassword = !showPassword">
                <Eye :size="19" />
              </button></div
          ></label>
          <div class="login-options">
            <label class="check"><input type="checkbox" /> تذكرني</label
            ><button
              type="button"
              class="forgot-link"
              @click="openPasswordRecovery"
            >
              نسيت كلمة المرور؟
            </button>
          </div>
          <button class="primary wide" type="submit" :disabled="loginBusy">
            {{ loginBusy ? "جارٍ التحقق..." : "تسجيل الدخول" }}
            <ArrowLeft :size="19" />
          </button>
        </form>
        <div class="divider"><span>أو</span></div>
        <button
          class="outline wide"
          @click="
            editingFamily = false;
            familyId = Date.now();
            go('register');
            step = 1;
          "
        >
          <Plus :size="19" /> تسجيل مستخدم جديد
        </button>
      </div>
    </section>
    <!-- نافذة استعادة كلمة المرور. -->
    <div
      v-if="forgotPasswordOpen"
      class="modal-layer"
      @click.self="closePasswordRecovery"
    >
      <section class="modal message-modal password-recovery-modal">
        <div class="modal-head">
          <div>
            <h2>استعادة كلمة المرور</h2>
            <p>أجب عن سؤال متعلق بأحد أفراد العائلة.</p>
          </div>

          <button type="button" @click="closePasswordRecovery">
            <X />
          </button>
        </div>

        <!-- الخطوة الأولى: رقم هوية رب الأسرة. -->
        <div v-if="recoveryStep === 1" class="form-stack">
          <label>
            رقم هوية رب الأسرة
            <input
              v-model="recoveryIdentity"
              inputmode="numeric"
              maxlength="9"
              placeholder="أدخل رقم الهوية المكوّن من 9 أرقام"
            />
          </label>

          <div class="modal-actions">
            <button type="button" class="ghost" @click="closePasswordRecovery">
              إلغاء
            </button>

            <button
              type="button"
              class="primary"
              :disabled="recoveryBusy"
              @click="requestPasswordChallenge"
            >
              {{ recoveryBusy ? "جارٍ التحقق..." : "متابعة" }}
            </button>
          </div>
        </div>

        <!-- الخطوة الثانية: السؤال العشوائي. -->
        <div v-else-if="recoveryStep === 2" class="form-stack">
          <div class="message-preview">
            <b>سؤال التحقق</b>
            <p>{{ recoveryQuestion }}</p>
          </div>

          <label>
            الإجابة
            <input
              v-if="recoveryAnswerType === 'date'"
              v-model="recoveryAnswer"
              type="date"
            />

            <input
              v-else
              v-model="recoveryAnswer"
              inputmode="numeric"
              maxlength="9"
              placeholder="أدخل رقم الهوية"
            />
          </label>

          <div class="modal-actions">
            <button
              type="button"
              class="outline"
              @click="
                recoveryStep = 1;
                recoveryAnswer = '';
              "
            >
              رجوع
            </button>

            <button
              type="button"
              class="primary"
              :disabled="recoveryBusy"
              @click="confirmPasswordRecovery"
            >
              {{ recoveryBusy ? "جارٍ التحقق..." : "تأكيد الإجابة" }}
            </button>
          </div>
        </div>

        <!-- الخطوة الثالثة: نجاح إعادة التعيين. -->
        <div v-else class="form-stack">
          <div class="message-preview recovery-success">
            <b>تم تعيين كلمة المرور المؤقتة بنجاح</b>
            <p>
              كلمة المرور الجديدة هي:
              <strong dir="ltr">12345678</strong>
            </p>
            <p>يرجى تسجيل الدخول وتغييرها من الصفحة الشخصية مباشرة.</p>
          </div>

          <button
            type="button"
            class="primary wide"
            @click="closePasswordRecovery"
          >
            العودة لتسجيل الدخول
          </button>
        </div>
      </section>
    </div>
  </main>
</template>
