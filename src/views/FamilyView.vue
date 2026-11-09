<script setup lang="ts">
import {
  ArrowLeft, ArrowRight, Check, ChevronDown, ChevronLeft, CircleUserRound,
  Download, Edit3, Eye, FileSpreadsheet, Filter, HeartPulse, Home, LogOut,
  Menu, MessageCircle, Phone, Plus, Search, Settings, ShieldCheck, TentTree,
  MapPin as MapPinIcon, UserRound, UsersRound, X
} from 'lucide-vue-next';
import { ref } from 'vue';
import { useRegistry } from '../composables/useRegistry';

// واجهة المستخدم التي تعرض ملف العائلة بعد تسجيل الدخول.
const {
  Info, view, adminTab, step, showPassword, menuOpen,
  familyFilterOpen, peopleFilterOpen, bulkMessageOpen, bulkMessage,
  selectedFamily, selectedMember, selectedPhoto, editingMember,
  editingSection, editingGroup, toast, search, peopleSearch,
  loginIdentity, loginPassword, loginBusy, adminToken, familyToken,
  familyId, editingFamily, familySaving, sheetsUrl, sheetsConnected,
  sheetsBusy, needOptions, conditions, womenConditions, memberConditions,
  regions, educationOptions, educationNeedsDetail, form, memberDraft,
  draftMembers, sampleFamilies, familyFilters, peopleFilters,
  allFamilies, filteredFamilies, allPeople, filteredPeople, fullName,
  internationalWhatsapp, currentFamily, totalFamilies, totalPeople,
  displacedFamilies, healthCases, flash, clearFamilyFilters,
  clearPeopleFilters, go, normalizeName, splitLegacyHeadName,
  photoSrc, convertTaaMarbuta, normalizeFamilyNames,
  loadFamilyIntoForm, startFamilyEdit, startSectionEdit,
  startPasswordChange, cancelSectionEdit, openPhoto, loginUser,
  setAdminTab, logoutAdmin, logoutFamily, loadSheetsStatus, loadAdminFamilies,
  saveSheetsSettings, nextStep, toggleNeed, saveMember, editMember,
  captureTentPhoto, captureDocumentPhoto, saveFamily, exportExcel,
  age, familyOfMember
} = useRegistry();

// قائمة اسم المستخدم في رأس الصفحة.
const userMenuOpen = ref(false);

function signOutFamily() {
  userMenuOpen.value = false;
  logoutFamily();
}
</script>

<template>
  <header class="family-header">
    <img src="/logo.png" alt="دلول"/>

    <div class="family-user-menu">
      <button
        class="user-menu"
        :aria-expanded="userMenuOpen"
        @click="userMenuOpen = !userMenuOpen"
      >
        <span>
          {{
            (
              currentFamily.first ||
              currentFamily.head.split(' ')[0]
            ).charAt(0)
          }}
        </span>

        {{
          currentFamily.first ||
          currentFamily.head.split(' ')[0]
        }}

        <ChevronDown
          :size="17"
          :class="{ open: userMenuOpen }"
        />
      </button>

      <div
        v-if="userMenuOpen"
        class="family-user-dropdown"
      >
        <button @click="signOutFamily">
          <LogOut :size="18"/>
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
          {{ currentFamily.first || currentFamily.head.split(' ')[0] }}
          دلول
        </h1>
      </div>
    </section>

    <div class="summary-cards">
      <article>
        <span><UsersRound/></span>

        <div>
          <small>عدد أفراد الأسرة</small>

          <b>
            {{
              currentFamily.members.length +
              (currentFamily.headStatus === 'شهيد' ? 0 : 1)
            }}
          </b>
        </div>
      </article>

      <article>
        <span><Home/></span>

        <div>
          <small>السكن الحالي</small>
          <b>{{ currentFamily.housing }}</b>
        </div>
      </article>

      <article>
        <span><MapPinIcon/></span>

        <div>
          <small>مكان الإقامة</small>
          <b>{{ currentFamily.residence }}</b>
        </div>
      </article>

      <article>
        <span><ShieldCheck/></span>

        <div>
          <small>حالة الملف</small>
          <b class="green">مكتمل</b>
        </div>
      </article>
    </div>

    <section class="detail-card">
      <div class="card-title">
        <div>
          <UserRound/>
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
            <Edit3 :size="16"/>
            تعديل
          </button>
        </div>
      </div>

      <div class="detail-grid">
        <Info label="الاسم الكامل" :value="currentFamily.head"/>
        <Info label="رقم الهوية" :value="currentFamily.identity"/>
        <Info label="رقم الجوال الأساسي" :value="currentFamily.phone"/>

        <Info
          label="رقم واتساب"
          :value="
            currentFamily.whatsapp ||
            internationalWhatsapp(
              currentFamily.whatsappPrefix,
              currentFamily.alternate
            )
          "
          :ltr="true"
        />

        <Info label="تاريخ الميلاد" :value="currentFamily.birth"/>
        <Info label="الجنس" :value="currentFamily.gender"/>
        <Info label="الحالة الاجتماعية" :value="currentFamily.marital"/>
        <Info label="حالة رب الأسرة" :value="currentFamily.headStatus"/>
        <Info label="حالة العمل" :value="currentFamily.work"/>
        <Info label="الحالة الصحية" :value="currentFamily.health"/>
        <Info label="تفاصيل الحالة الصحية" :value="currentFamily.disease"/>
        <Info label="صفة الإقامة" :value="currentFamily.residencyType"/>
        <Info label="رقم كرت المؤن" :value="currentFamily.rationCard"/>
        <Info label="الحالة التعليمية" :value="currentFamily.education"/>

        <Info
          label="نوع الشهادة أو التخصص"
          :value="currentFamily.educationDetail"
        />
      </div>
    </section>

    <section class="detail-card">
      <div class="card-title">
        <div>
          <Home/>
          <h2>جميع بيانات السكن والنزوح</h2>
        </div>

        <div class="card-title-actions">
          <button
            class="section-edit-button"
            @click="startSectionEdit(2, 'housing')"
          >
            <Edit3 :size="16"/>
            تعديل
          </button>
        </div>
      </div>

      <div class="detail-grid">
        <Info label="المنطقة الأصلية" :value="currentFamily.originalArea"/>
        <Info label="العنوان الأصلي" :value="currentFamily.originalAddress"/>

        <Info
          label="حالة السكن الأصلي"
          :value="currentFamily.originalHousingStatus"
        />

        <Info
          label="منطقة النزوح"
          :value="currentFamily.displacementArea"
        />

        <Info
          label="مكان النزوح بالتفصيل"
          :value="currentFamily.residence"
        />

        <Info
          label="نوع مكان النزوح"
          :value="currentFamily.housing"
        />
      </div>

      <div
        v-if="currentFamily.tentPhoto"
        class="document-links single-document"
      >
        <article class="document-link-card">
          <div>
            <TentTree/>

            <span>
              <b>صورة الخيمة</b>
              <small>صورة مكان النزوح</small>
            </span>
          </div>

          <button
            class="outline small"
            @click="openPhoto(currentFamily.tentPhoto, 'صورة الخيمة')"
          >
            <Eye :size="17"/>
            عرض
          </button>
        </article>
      </div>
    </section>

    <section class="detail-card">
      <div class="card-title">
        <div>
          <ShieldCheck/>
          <h2>الصور والوثائق</h2>
        </div>

        <div class="card-title-actions">
          <button
            class="section-edit-button"
            @click="startSectionEdit(1, 'documents')"
          >
            <Edit3 :size="16"/>
            تعديل
          </button>
        </div>
      </div>

      <div class="document-links">
        <article
          v-if="currentFamily.idPhoto"
          class="document-link-card"
        >
          <div>
            <UserRound/>

            <span>
              <b>صورة الهوية</b>
              <small>وثيقة رب الأسرة</small>
            </span>
          </div>

          <button
            class="outline small"
            @click="openPhoto(currentFamily.idPhoto, 'صورة الهوية')"
          >
            <Eye :size="17"/>
            عرض
          </button>
        </article>

        <article
          v-if="currentFamily.slipPhoto"
          class="document-link-card"
        >
          <div>
            <FileSpreadsheet/>

            <span>
              <b>صورة السليب</b>
              <small>وثيقة رب الأسرة</small>
            </span>
          </div>

          <button
            class="outline small"
            @click="openPhoto(currentFamily.slipPhoto, 'صورة السليب')"
          >
            <Eye :size="17"/>
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
          <UsersRound/>
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
            <Edit3 :size="16"/>
            تعديل
          </button>
        </div>
      </div>

      <div class="drawer-members">
        <article
          v-for="member in currentFamily.members"
          :key="member.id"
        >
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

              <small>{{ member.relation }}</small>
            </div>
          </div>

          <div class="detail-grid">
            <Info label="رقم الهوية" :value="member.identity"/>
            <Info label="تاريخ الميلاد" :value="member.birth"/>

            <Info
              label="العمر"
              :value="`${age(member.birth)} سنة`"
            />

            <Info label="الجنس" :value="member.gender"/>
            <Info label="صلة القرابة" :value="member.relation"/>
            <Info label="الحالة الصحية" :value="member.health"/>
            <Info label="الحالة التعليمية" :value="member.education"/>

            <Info
              label="نوع الشهادة أو التخصص"
              :value="member.educationDetail"
            />

            <Info
              label="الحالات الخاصة"
              :value="
                (member.special || []).join('، ') ||
                'لا توجد'
              "
            />

            <Info
              v-if="member.health && member.health !== 'سليم'"
              label="احتياجات المريض"
              :value="
                (member.healthNeeds || []).join('، ') ||
                'لم تحدد'
              "
            />
          </div>
        </article>
      </div>
    </section>

    <section class="detail-card">
      <div class="card-title">
        <div>
          <HeartPulse/>
          <h2>الاحتياجات ذات الأولوية</h2>
        </div>

        <div class="card-title-actions">
          <button
            class="section-edit-button"
            @click="startSectionEdit(4, 'needs')"
          >
            <Edit3 :size="16"/>
            تعديل
          </button>
        </div>
      </div>

      <div class="needs-view">
        <span
          v-for="need in currentFamily.needs"
          :key="need"
        >
          <Check/>
          {{ need }}
        </span>
      </div>
    </section>

    <section class="detail-card password-profile-card">
      <div class="card-title">
        <div>
          <ShieldCheck/>
          <h2>كلمة المرور</h2>
        </div>

        <div class="card-title-actions">
          <button
            class="outline"
            @click="startPasswordChange"
          >
            <Edit3 :size="18"/>
            تغيير كلمة المرور
          </button>
        </div>
      </div>

      <p>
        يمكنك تغيير كلمة المرور من هنا. إذا لم ترغب بتغييرها
        فستبقى كما هي.
      </p>

    </section>
  </main>
</template>
