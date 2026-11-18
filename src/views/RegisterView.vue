<script setup lang="ts">
import { ref } from "vue";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CircleUserRound,
  Edit3,
  FileSpreadsheet,
  HeartPulse,
  Home,
  Plus,
  ShieldCheck,
  TentTree,
  UserRound,
  UsersRound,
} from "lucide-vue-next";
import { useRegistry } from "../composables/useRegistry";
import {
  patientNeedOptions,
  originalAreas,
  housingStatusOptions,
  displacementStatusOptions,
} from "../constants/options";

const declarationAgreed = ref(false);

const {
  step,
  editingSection,
  editingGroup,
  editingFamily,
  familySaving,
  needOptions,
  memberConditions,
  regions,
  educationOptions,
  educationNeedsDetail,
  universitySpecializations,
  form,
  memberDraft,
  draftMembers,
  editingMember,
  fullName,
  go,
  normalizeName,
  photoSrc,
  startSectionEdit,
  cancelSectionEdit,
  nextStep,
  identityError,
  memberIdentityError,
  checkHeadIdentity,
  checkMemberIdentity,
  toggleNeed,
  saveMember,
  editMember,
  captureTentPhoto,
  captureDocumentPhoto,
  saveFamily,
  age,
} = useRegistry();
</script>

<template>
  <header class="simple-header">
    <img src="/دلول.jpeg" alt="دلول" />

    <button class="ghost" @click="go('login')">
      <ArrowRight :size="18" />
      العودة لتسجيل الدخول
    </button>
  </header>

  <main class="register-wrap">
    <div class="page-title">
      <div>
        <span class="eyebrow blue">
          {{ editingFamily ? "تعديل ملف العائلة" : "ملف عائلة جديد" }}
        </span>

        <h1>
          {{
            editingSection
              ? "تعديل بيانات هذا القسم"
              : editingFamily
                ? "تعديل بيانات العائلة"
                : "تسجيل بيانات العائلة"
          }}
        </h1>

        <p>
          {{
            editingFamily
              ? "يمكنك تعديل المعلومات المطلوبة، وستُحفظ فوق السجل نفسه في Google Sheets."
              : "أدخل المعلومات بدقة، ويمكنك مراجعتها قبل الحفظ."
          }}
        </p>
      </div>

      <span v-if="!editingSection" class="step-count">
        الخطوة {{ step }} من 4
      </span>

      <span v-else class="step-count"> تعديل قسم واحد </span>
    </div>

    <div v-if="!editingSection" class="stepper">
      <div
        v-for="(stepName, index) in [
          'رب الأسرة',
          'السكن والنزوح',
          'أفراد الأسرة',
          'الاحتياجات',
        ]"
        :key="stepName"
        class="step"
        :class="{
          active: step === index + 1,
          done: step > index + 1,
        }"
      >
        <span>{{ step > index + 1 ? "✓" : index + 1 }}</span>
        <b>{{ stepName }}</b>
      </div>
    </div>

    <section v-if="step === 1" class="form-card">
      <div class="section-head">
        <span class="section-icon">
          <UserRound />
        </span>

        <div>
          <h2>
            {{
              editingGroup === "documents"
                ? "الصور والوثائق"
                : "بيانات رب الأسرة"
            }}
          </h2>

          <p>
            {{
              editingGroup === "documents"
                ? "تعديل صورة الهوية وصورة السليب"
                : "المعلومات الشخصية وبيانات التواصل والحالة"
            }}
          </p>
        </div>
      </div>

      <template v-if="editingGroup !== 'documents'">
        <div class="fields-grid four">
          <label>
            الاسم الأول *
            <input
              v-model="form.first"
              @input="form.first = normalizeName(form.first)"
            />
          </label>

          <label>
            اسم الأب *
            <input
              v-model="form.father"
              @input="form.father = normalizeName(form.father)"
            />
          </label>

          <label>
            اسم الجد *
            <input
              v-model="form.grandfather"
              @input="form.grandfather = normalizeName(form.grandfather)"
            />
          </label>

          <label>
            اسم العائلة
            <input value="دلول" disabled />
          </label>
        </div>

        <div class="name-preview">
          <CircleUserRound />
          <span>الاسم الكامل:</span>
          <b>{{ fullName }}</b>
        </div>

        <div class="fields-grid three">
          <label>
            رقم الهوية *
            <input
              v-model="form.identity"
              maxlength="9"
              inputmode="numeric"
              @input="
                identityError = '';
                form.identity.length === 9 && checkHeadIdentity();
              "
              @blur="checkHeadIdentity"
            />
            <small v-if="identityError" class="field-error" lang="ar">{{
              identityError
            }}</small>
          </label>

          <label>
            رقم الجوال الأساسي *
            <input v-model="form.phone" maxlength="10" inputmode="tel" />
          </label>

          <label>
            <span lang="ar">رقم الجوال الاحتياطي</span>
            <input v-model="form.altPhone" maxlength="10" inputmode="tel" placeholder="رقم جوال بديل" />
          </label>

          <label>
            رقم الجوال عليه واتساب *

            <div class="whatsapp-number">
              <select v-model="form.whatsappPrefix">
                <option>+970</option>
                <option>+972</option>
              </select>

              <input
                v-model="form.alternate"
                maxlength="10"
                inputmode="tel"
                placeholder="رقم الجوال بدون المقدمة"
              />
            </div>
          </label>

          <label>
            تاريخ الميلاد *
            <input v-model="form.birth" type="date" />
          </label>

          <label>
            الجنس *

            <select v-model="form.gender">
              <option value="" disabled>-- اختر --</option>
              <option>ذكر</option>
              <option>أنثى</option>
            </select>
          </label>

          <label>
            الحالة الاجتماعية *

            <select v-model="form.marital">
              <option value="" disabled>-- اختر --</option>
              <option>أعزب/عزباء</option>
              <option>متزوج/متزوجة</option>
              <option>متعدد الزوجات</option>
              <option>مطلق/مطلقة</option>
              <option>أرمل/أرملة</option>
              <option>مهجور/مهجورة</option>
            </select>
          </label>

          <label>
            حالة رب الأسرة *

            <select v-model="form.headStatus">
              <option value="" disabled>-- اختر --</option>
              <option>على قيد الحياة</option>
              <option>شهيد</option>
              <option>مفقود</option>
            </select>
          </label>

          <label>
            حالة العمل

            <select v-model="form.work">
              <option value="" disabled>-- اختر --</option>
              <option>عامل</option>
              <option>موظف</option>
              <option>عاطل عن العمل</option>
              <option>متقاعد</option>
              <option>لا يعمل</option>
            </select>
          </label>

          <label>
            الحالة الصحية

            <select v-model="form.health">
              <option value="" disabled>-- اختر --</option>
              <option>سليم</option>
              <option>مريض</option>
              <option>مصاب</option>
              <option>ذو إعاقة</option>
            </select>
          </label>

          <label>
            الحالة التعليمية

            <select
              v-model="form.education"
              @change="form.educationDetail = ''"
            >
              <option value="" disabled>-- اختر --</option>

              <option v-for="education in educationOptions" :key="education">
                {{ education }}
              </option>
            </select>
          </label>

          <label v-if="educationNeedsDetail(form.education)">
            التخصص *

            <select v-model="form.educationDetail">
              <option value="" disabled>-- اختر التخصص --</option>

              <optgroup
                v-for="(
                  specializations, groupName
                ) in universitySpecializations"
                :key="groupName"
                :label="groupName"
              >
                <option
                  v-for="specialization in specializations"
                  :key="specialization"
                  :value="specialization"
                >
                  {{ specialization }}
                </option>
              </optgroup>
            </select>
          </label>
        </div>

        <label v-if="form.health && form.health !== 'سليم'" class="full-field">
          تفاصيل الحالة الصحية

          <textarea
            v-model="form.disease"
            placeholder="نوع المرض، الأدوية المطلوبة، ملاحظات مهمة"
          ></textarea>
        </label>
      </template>

      <div v-if="editingGroup !== 'head'" class="document-uploads">
        <div class="upload-box compact">
          <UserRound :size="32" />

          <div>
            <b>صورة الهوية (اختياري)</b>
            <p>أضف صورة واضحة للهوية بصيغة JPG أو PNG.</p>
          </div>

          <div class="photo-actions">
            <label class="outline small">
              <span lang="ar">من المعرض</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                hidden
                @change="captureDocumentPhoto($event, 'idPhoto')"
              />
            </label>
            <label class="outline small">
              <span lang="ar">التقاط بالكاميرا</span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                hidden
                @change="captureDocumentPhoto($event, 'idPhoto')"
              />
            </label>
          </div>

          <img
            v-if="form.idPhoto"
            :src="photoSrc(form.idPhoto)"
            alt="صورة الهوية"
            class="tent-preview"
          />
        </div>

        <div class="upload-box compact">
          <FileSpreadsheet :size="32" />

          <div>
            <b>صورة السليب (اختياري)</b>
            <p>أضف صورة واضحة للسليب بصيغة JPG أو PNG.</p>
          </div>

          <div class="photo-actions">
            <label class="outline small">
              <span lang="ar">من المعرض</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                hidden
                @change="captureDocumentPhoto($event, 'slipPhoto')"
              />
            </label>
            <label class="outline small">
              <span lang="ar">التقاط بالكاميرا</span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                hidden
                @change="captureDocumentPhoto($event, 'slipPhoto')"
              />
            </label>
          </div>

          <img
            v-if="form.slipPhoto"
            :src="photoSrc(form.slipPhoto)"
            alt="صورة السليب"
            class="tent-preview"
          />
        </div>
      </div>
    </section>

    <section v-else-if="step === 2" class="form-card">
      <div class="section-head">
        <span class="section-icon">
          <Home />
        </span>

        <div>
          <h2>السكن والنزوح</h2>
          <p>العنوان الأصلي والوضع السكني الحالي</p>
        </div>
      </div>

      <div class="fields-grid two">
        <label>
          المنطقة الأصلية *
          <select v-model="form.originalArea">
            <option value="" disabled>-- اختر المنطقة الأصلية --</option>
            <option v-for="area in originalAreas" :key="area" :value="area">
              {{ area }}
            </option>
          </select>
        </label>

        <label>
          العنوان الأصلي بالتفصيل *
          <input v-model="form.originalAddress" placeholder="الحي، الشارع، أقرب معلم" />
        </label>

        <label>
          حالة السكن الأصلي *

          <select v-model="form.originalHousingStatus">
            <option value="" disabled>-- اختر --</option>
            <option
              v-for="status in housingStatusOptions"
              :key="status"
              :value="status"
            >
              {{ status }}
            </option>
          </select>
        </label>
        
        <label>
          حالة النزوح *
          <select v-model="form.displacementStatus">
            <option value="" disabled>-- اختر --</option>
            <option
              v-for="status in displacementStatusOptions"
              :key="status"
              :value="status"
            >
              {{ status }}
            </option>
          </select>
        </label>

        <label>
          <span>منطقة النزوح <span v-if="form.displacementStatus === 'نازح'">*</span></span>

          <select
            v-model="form.displacementArea"
            :disabled="form.displacementStatus !== 'نازح'"
          >
            <option value="" disabled>-- اختر --</option>

            <option v-for="region in regions" :key="region">
              {{ region }}
            </option>
          </select>
        </label>

        <label>
          <span>مكان النزوح بالتفصيل <span v-if="form.displacementStatus === 'نازح'">*</span></span>
          <input
            v-model="form.residence"
            placeholder="المدينة، الحي، أقرب معلم"
            :disabled="form.displacementStatus !== 'نازح'"
          />
        </label>

        <label>
          <span>نوع مكان النزوح <span v-if="form.displacementStatus === 'نازح'">*</span></span>

          <select
            v-model="form.housing"
            :disabled="form.displacementStatus !== 'نازح'"
          >
            <option value="" disabled>-- اختر --</option>
            <option>منزل ملك</option>
            <option>شقة مستأجرة</option>
            <option>منزل أقارب</option>
            <option>مركز إيواء</option>
            <option>خيمة</option>
          </select>
        </label>
      </div>

      <div
        v-if="form.displacementStatus === 'نازح' && form.housing === 'خيمة'"
        class="upload-box"
      >
        <TentTree :size="38" />

        <div>
          <b>صورة الخيمة *</b>

          <p>يرجى اختيار صورة واضحة للخيمة من الخارج</p>
        </div>

        <label class="outline small">
          اختيار صورة

          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            hidden
            @change="captureTentPhoto"
          />
        </label>

        <img
          v-if="form.tentPhoto"
          :src="photoSrc(form.tentPhoto)"
          alt="صورة الخيمة"
          class="tent-preview"
        />
      </div>
    </section>

    <section v-else-if="step === 3" class="form-card">
      <div class="section-head">
        <span class="section-icon">
          <UsersRound />
        </span>

        <div>
          <h2>أفراد الأسرة</h2>
          <p>أضف كل فرد، ثم يمكنك تعديل بياناته في أي وقت</p>
        </div>

        <span class="count-pill"> {{ draftMembers.length }} أفراد </span>
      </div>

      <div v-if="draftMembers.length" class="members-list">
        <article v-for="member in draftMembers" :key="member.id">
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
              {{ member.relation }} · {{ member.identity }} ·
              <span v-if="member.health === 'شهيد'" class="tag warning"
                >شهيد (غير محتسب)</span
              >
              <span v-else>{{ age(member.birth) }} سنة</span>
            </small>
          </div>

          <button class="icon-button" @click="editMember(member)">
            <Edit3 :size="17" />
            تعديل
          </button>
        </article>
      </div>

      <div class="member-form">
        <h3>
          {{ editingMember ? "تعديل بيانات الفرد" : "إضافة فرد جديد" }}
        </h3>

        <div class="fields-grid four">
          <label>
            الاسم الأول

            <input
              v-model="memberDraft.first"
              @input="memberDraft.first = normalizeName(memberDraft.first)"
            />
          </label>

          <label>
            اسم الأب

            <input
              v-model="memberDraft.father"
              @input="memberDraft.father = normalizeName(memberDraft.father)"
            />
          </label>

          <label>
            اسم الجد

            <input
              v-model="memberDraft.grandfather"
              @input="
                memberDraft.grandfather = normalizeName(memberDraft.grandfather)
              "
            />
          </label>

          <label>
            اسم العائلة
            <input value="دلول" disabled />
          </label>
        </div>

        <div class="fields-grid three member-compact-grid">
          <label>
            رقم الهوية

            <input
              v-model="memberDraft.identity"
              maxlength="9"
              inputmode="numeric"
              @input="
                memberIdentityError = '';
                memberDraft.identity.length === 9 && checkMemberIdentity();
              "
              @blur="checkMemberIdentity"
            />
            <small v-if="memberIdentityError" class="field-error" lang="ar">{{
              memberIdentityError
            }}</small>
          </label>

          <label>
            تاريخ الميلاد

            <input v-model="memberDraft.birth" type="date" />
          </label>

          <div class="inline-pair">
            <label class="compact-sub-label">
              الجنس
              <select
                v-model="memberDraft.gender"
                @change="memberDraft.special = []"
              >
                <option value="" disabled>-- اختر --</option>
                <option>ذكر</option>
                <option>أنثى</option>
              </select>
            </label>

            <label class="compact-sub-label" v-if="memberDraft.birth">
              العمر
              <input type="text" :value="age(memberDraft.birth) + ' سنة'" disabled class="disabled-compact" />
            </label>
          </div>

          <label>
            صلة القرابة

            <select v-model="memberDraft.relation">
              <option value="" disabled>-- اختر --</option>
              <option>زوج</option>
              <option>زوجة</option>
              <option>ابن</option>
              <option>ابنة</option>
              <option>أب</option>
              <option>أم</option>
              <option>أخرى</option>
            </select>
          </label>

          <label>
            الحالة الصحية / العامة

            <select
              v-model="memberDraft.health"
              @change="
                if (
                  memberDraft.health === 'سليم' ||
                  memberDraft.health === 'شهيد'
                ) {
                  memberDraft.healthNeeds = [];
                }
              "
            >
              <option value="" disabled>-- اختر --</option>
              <option>سليم</option>
              <option>مرض مزمن</option>
              <option>مصاب</option>
              <option>ذو إعاقة</option>
              <option>شهيد</option>
            </select>
          </label>

          <template v-if="memberDraft.health === 'شهيد'">
            <label>
              تاريخ الشهادة *
              <input v-model="(memberDraft as any).martyrDate" type="date" />
            </label>

            <label>
              تفاصيل الاستشهاد
              <input
                v-model="(memberDraft as any).martyrDetails"
                placeholder="مثال: استهداف المنزل / حي الزيتون"
              />
            </label>
          </template>

          <label>
            الحالة التعليمية

            <select
              v-model="memberDraft.education"
              @change="memberDraft.educationDetail = ''"
            >
              <option value="" disabled>-- اختر --</option>

              <option v-for="education in educationOptions" :key="education">
                {{ education }}
              </option>
            </select>
          </label>

          <label v-if="educationNeedsDetail(memberDraft.education)">
            التخصص

            <select v-model="memberDraft.educationDetail">
              <option value="" disabled>-- اختر التخصص --</option>

              <optgroup
                v-for="(
                  specializations, groupName
                ) in universitySpecializations"
                :key="groupName"
                :label="groupName"
              >
                <option
                  v-for="specialization in specializations"
                  :key="specialization"
                  :value="specialization"
                >
                  {{ specialization }}
                </option>
              </optgroup>
            </select>
          </label>
        </div>

        <div
          v-if="memberDraft.gender && memberDraft.health !== 'شهيد'"
          class="specials"
        >
          <b>حالات خاصة (اختياري)</b>

          <div>
            <label
              v-for="condition in memberConditions"
              :key="condition"
              class="chip-check"
            >
              <input
                v-model="memberDraft.special"
                type="checkbox"
                :value="condition"
              />

              {{ condition }}
            </label>
          </div>
        </div>

        <div
          v-if="
            memberDraft.health &&
            memberDraft.health !== 'سليم' &&
            memberDraft.health !== 'شهيد'
          "
          class="specials"
        >
          <b>احتياجات الفرد</b>
          <p>يمكن اختيار أكثر من احتياج.</p>

          <div>
            <label
              v-for="need in patientNeedOptions"
              :key="need"
              class="chip-check"
            >
              <input
                v-model="memberDraft.healthNeeds"
                type="checkbox"
                :value="need"
              />

              {{ need }}
            </label>
          </div>
        </div>

        <p class="form-note" lang="ar">
          ملاحظة: يرجى الضغط على زر «إضافة الفرد» قبل حفظ البيانات.
        </p>

        <button class="secondary" @click="saveMember">
          <Plus :size="18" />
          {{ editingMember ? "حفظ التعديلات" : "إضافة الفرد" }}
        </button>
      </div>
    </section>

    <section v-else class="form-card">
      <div class="section-head">
        <span class="section-icon">
          <HeartPulse />
        </span>

        <div>
          <h2>
            {{
              editingGroup === "password"
                ? "تغيير كلمة المرور"
                : editingGroup === "needs"
                  ? "الاحتياجات ذات الأولوية"
                  : "الاحتياجات وكلمة المرور"
            }}
          </h2>

          <p>
            {{
              editingGroup === "password"
                ? "اكتب كلمة المرور الجديدة وأكدها"
                : "اختر أهم 3 احتياجات للعائلة بحد أقصى"
            }}
          </p>
        </div>

        <span v-if="editingGroup !== 'password'" class="count-pill">
          {{ form.needs.length }} / 3
        </span>
      </div>

      <div v-if="editingGroup !== 'password'" class="needs-grid">
        <button
          v-for="need in needOptions"
          :key="need"
          :class="{ selected: form.needs.includes(need) }"
          @click="toggleNeed(need)"
        >
          <span>
            {{ form.needs.includes(need) ? "✓" : "+" }}
          </span>

          {{ need }}
        </button>
      </div>

      <div v-if="editingGroup !== 'needs'" class="password-block">
        <h3>
          {{
            editingFamily ? "تغيير كلمة المرور (اختياري)" : "تعيين كلمة المرور"
          }}
        </h3>

        <div class="fields-grid two">
          <label>
            {{ editingFamily ? "كلمة المرور الجديدة" : "كلمة المرور *" }}

            <input
              v-model="form.password"
              type="password"
              :placeholder="
                editingFamily
                  ? 'اتركها فارغة للإبقاء عليها'
                  : '6 أحرف على الأقل'
              "
            />
          </label>

          <label>
            {{ editingFamily ? "تأكيد كلمة المرور الجديدة" : "تأكيد كلمة المرور *" }}

            <input
              v-model="form.confirm"
              type="password"
              placeholder="أعد كتابة كلمة المرور"
            />
          </label>
        </div>

        <p>
          <ShieldCheck :size="17" />

          {{
            editingFamily
              ? "اترك الحقلين فارغين إذا لم ترغب بتغيير كلمة المرور."
              : "ستستخدم رقم الهوية وكلمة المرور للدخول لاحقاً."
          }}
        </p>
      </div>

      <div v-if="!editingFamily" class="declaration-block">
        <label class="check declaration-check">
          <input v-model="declarationAgreed" type="checkbox" />
          <span>
            أتعهد بصحة البيانات المدخلة، وأي خطأ قد يفقدني الحق فيما يترتب عليه.
          </span>
        </label>
      </div>
    </section>

    <div v-if="editingSection" class="form-actions section-save-actions">
      <button
        class="outline"
        :disabled="familySaving"
        @click="cancelSectionEdit"
      >
        إلغاء
      </button>

      <button
        class="primary success"
        :disabled="familySaving"
        @click="saveFamily"
      >
        <Check :size="18" />

        {{ familySaving ? "جارٍ الحفظ..." : "حفظ هذا القسم" }}
      </button>
    </div>

    <div v-else class="form-actions">
      <button
        class="outline"
        :disabled="step === 1 || familySaving"
        @click="step--"
      >
        <ArrowRight :size="18" />
        السابق
      </button>

      <button
        v-if="step < 4"
        class="primary"
        :disabled="familySaving"
        @click="nextStep"
      >
        التالي
        <ArrowLeft :size="18" />
      </button>

      <button
        v-else
        class="primary success"
        :disabled="familySaving || (!editingFamily && !declarationAgreed)"
        @click="saveFamily"
      >
        <Check :size="18" />

        {{
          familySaving
            ? "جارٍ الحفظ..."
            : editingFamily
              ? "حفظ جميع التعديلات"
              : "حفظ العائلة"
        }}
      </button>
    </div>
  </main>
</template>

<style scoped>
.member-form .fields-grid label,
.member-form .fields-grid input,
.member-form .fields-grid select {
  font-size: 13px !important;
}

.inline-pair {
  display: flex;
  gap: 10px;
}

.inline-pair > label {
  flex: 1;
}

.disabled-compact {
  background-color: #f8fafc;
  color: #64748b;
  text-align: center;
  font-weight: 600;
}
</style>