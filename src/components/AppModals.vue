<script setup lang="ts">
import {
  Check, Edit3, FileSpreadsheet, Filter,
  MessageCircle, ShieldCheck, TentTree,
  UserRound, X
} from 'lucide-vue-next';
import { useRegistry } from '../composables/useRegistry';
import { patientNeedOptions } from '../constants/options';

// النوافذ المنبثقة المشتركة للفلاتر والرسائل والتفاصيل والصور.
const {
  Info, familyFilterOpen, peopleFilterOpen, bulkMessageOpen,
  bulkMessage, selectedFamily, selectedMember, selectedPhoto,
  search, peopleSearch, needOptions, conditions, womenConditions,
  regions, educationOptions, familyFilters, peopleFilters,
  filteredFamilies, flash, clearFamilyFilters, clearPeopleFilters,
  photoSrc, age, familyOfMember
} = useRegistry();
</script>

<template>
  <!-- نافذة فلترة العائلات -->
  <div
    v-if="familyFilterOpen"
    class="modal-layer"
    @click.self="familyFilterOpen = false"
  >
    <section class="modal filter-modal">
      <div class="modal-head">
        <div>
          <h2>فلترة العائلات</h2>
          <p>هذه الخيارات تخص ملفات العائلات فقط.</p>
        </div>

        <button @click="familyFilterOpen = false">
          <X/>
        </button>
      </div>

      <div class="fields-grid two">
        <label>
          اسم رب الأسرة
          <input
            v-model="familyFilters.head"
            placeholder="الاسم"
          />
        </label>

        <label>
          رقم هوية رب الأسرة
          <input
            v-model="familyFilters.identity"
            inputmode="numeric"
            placeholder="9 أرقام"
          />
        </label>

        <label>
          رقم الجوال
          <input
            v-model="familyFilters.phone"
            inputmode="tel"
            placeholder="الجوال الأساسي أو واتساب"
          />
        </label>

        <label>
          جنس رب الأسرة

          <select v-model="familyFilters.gender">
            <option value="">-- اختر --</option>
            <option>ذكر</option>
            <option>أنثى</option>
          </select>
        </label>

        <label>
          الحالة الاجتماعية

          <select v-model="familyFilters.marital">
            <option value="">-- اختر --</option>
            <option>أعزب/عزباء</option>
            <option>متزوج/متزوجة</option>
            <option>متعدد الزوجات</option>
            <option>مطلق/مطلقة</option>
            <option>أرمل/أرملة</option>
            <option>مهجور/مهجورة</option>
          </select>
        </label>

        <label>
          حالة رب الأسرة

          <select v-model="familyFilters.headStatus">
            <option value="">-- اختر --</option>
            <option>على قيد الحياة</option>
            <option>شهيد</option>
            <option>مفقود</option>
          </select>
        </label>

        <label>
          حالة العمل

          <select v-model="familyFilters.work">
            <option value="">-- اختر --</option>
            <option>عامل</option>
            <option>موظف</option>
            <option>عاطل عن العمل</option>
            <option>متقاعد</option>
            <option>لا يعمل</option>
          </select>
        </label>

        <label>
          الحالة الصحية لرب الأسرة

          <select v-model="familyFilters.health">
            <option value="">-- اختر --</option>
            <option>سليم</option>
            <option>مريض</option>
            <option>مصاب</option>
            <option>ذو إعاقة</option>
          </select>
        </label>

        <label>
          المنطقة الأصلية
          <input
            v-model="familyFilters.originalArea"
            placeholder="المنطقة أو الحي"
          />
        </label>

        <label>
          العنوان الأصلي بالتفصيل
          <input
            v-model="familyFilters.originalAddress"
            placeholder="اكتب العنوان"
          />
        </label>

        <label>
          حالة السكن الأصلي

          <select v-model="familyFilters.originalHousingStatus">
            <option value="">-- اختر --</option>
            <option>سليم</option>
            <option>متضرر جزئياً</option>
            <option>متضرر كلياً</option>
            <option>مدمّر</option>
            <option>غير معروف</option>
          </select>
        </label>

        <label>
          منطقة النزوح

          <select v-model="familyFilters.displacementArea">
            <option value="">-- اختر --</option>

            <option
              v-for="region in regions"
              :key="region"
            >
              {{ region }}
            </option>
          </select>
        </label>

        <label>
          نوع مكان النزوح

          <select v-model="familyFilters.housing">
            <option value="">-- اختر --</option>
            <option>منزل ملك</option>
            <option>شقة مستأجرة</option>
            <option>منزل أقارب</option>
            <option>مركز إيواء</option>
            <option>خيمة</option>
            <option>مكان مفتوح</option>
          </select>
        </label>

        <label>
          مكان النزوح بالتفصيل
          <input
            v-model="familyFilters.residence"
            placeholder="المدينة أو الحي"
          />
        </label>

        <label>
          وجود صورة خيمة

          <select v-model="familyFilters.hasTentPhoto">
            <option value="">-- اختر --</option>
            <option>يوجد</option>
            <option>لا يوجد</option>
          </select>
        </label>

        <label>
          الاحتياج

          <select v-model="familyFilters.need">
            <option value="">-- اختر --</option>

            <option
              v-for="need in needOptions"
              :key="need"
            >
              {{ need }}
            </option>
          </select>
        </label>

        <label>
          عدد أفراد العائلة من
          <input
            v-model="familyFilters.minMembers"
            type="number"
            min="0"
          />
        </label>

        <label>
          عدد أفراد العائلة إلى
          <input
            v-model="familyFilters.maxMembers"
            type="number"
            min="0"
          />
        </label>
      </div>

      <div class="modal-actions">
        <button
          class="ghost"
          @click="familyFilterOpen = false"
        >
          إلغاء
        </button>

        <button
          class="outline"
          @click="clearFamilyFilters"
        >
          مسح خيارات العائلات
        </button>

        <button
          class="primary"
          @click="
            familyFilterOpen = false;
            flash('تم تطبيق فلترة العائلات')
          "
        >
          <Filter/>
          تطبيق فلترة العائلات
        </button>
      </div>
    </section>
  </div>

  <!-- نافذة فلترة الأفراد -->
  <div
    v-if="peopleFilterOpen"
    class="modal-layer"
    @click.self="peopleFilterOpen = false"
  >
    <section class="modal filter-modal">
      <div class="modal-head">
        <div>
          <h2>فلترة الأفراد</h2>
          <p>هذه الخيارات تخص أفراد العائلات فقط.</p>
        </div>

        <button @click="peopleFilterOpen = false">
          <X/>
        </button>
      </div>

      <div class="fields-grid two">
        <label>
          اسم الفرد
          <input
            v-model="peopleFilters.name"
            placeholder="اسم الفرد"
          />
        </label>

        <label>
          رقم هوية الفرد
          <input
            v-model="peopleFilters.identity"
            inputmode="numeric"
            placeholder="9 أرقام"
          />
        </label>

        <label>
          اسم رب الأسرة
          <input
            v-model="peopleFilters.familyHead"
            placeholder="اسم رب الأسرة"
          />
        </label>

        <label>
          جنس الفرد

          <select v-model="peopleFilters.gender">
            <option value="">-- اختر --</option>
            <option>ذكر</option>
            <option>أنثى</option>
          </select>
        </label>

        <label>
          الحالة الصحية للفرد

          <select
            v-model="peopleFilters.health"
            @change="
              (!peopleFilters.health || peopleFilters.health === 'سليم') &&
              (peopleFilters.healthNeeds = [])
            "
          >
            <option value="">-- اختر --</option>
            <option>سليم</option>
            <option>مرض مزمن</option>
            <option>مصاب</option>
            <option>ذو إعاقة</option>
          </select>
        </label>

        <div
          v-if="peopleFilters.health && peopleFilters.health !== 'سليم'"
          class="specials filter-health-needs"
        >
          <b>احتياجات الفرد (اختياري)</b>
          <p>يمكنك اختيار احتياج واحد أو أكثر، أو تركها بدون اختيار.</p>

          <div>
            <label
              v-for="need in patientNeedOptions"
              :key="need"
              class="chip-check"
            >
              <input
                v-model="peopleFilters.healthNeeds"
                type="checkbox"
                :value="need"
              />

              {{ need }}
            </label>
          </div>
        </div>

        <label>
          الحالة التعليمية للفرد

          <select v-model="peopleFilters.education">
            <option value="">-- اختر --</option>

            <option
              v-for="education in educationOptions"
              :key="education"
            >
              {{ education }}
            </option>
          </select>
        </label>

        <label>
          الحالة الخاصة للفرد

          <select v-model="peopleFilters.special">
            <option value="">-- اختر --</option>

            <option
              v-for="condition in [...conditions, ...womenConditions]"
              :key="condition"
            >
              {{ condition }}
            </option>
          </select>
        </label>

        <label>
          عمر الفرد من
          <input
            v-model="peopleFilters.minAge"
            type="number"
            min="0"
          />
        </label>

        <label>
          عمر الفرد إلى
          <input
            v-model="peopleFilters.maxAge"
            type="number"
            min="0"
          />
        </label>
      </div>

      <div class="modal-actions">
        <button
          class="ghost"
          @click="peopleFilterOpen = false"
        >
          إلغاء
        </button>

        <button
          class="outline"
          @click="clearPeopleFilters"
        >
          مسح خيارات الأفراد
        </button>

        <button
          class="primary"
          @click="
            peopleFilterOpen = false;
            flash('تم تطبيق فلترة الأفراد')
          "
        >
          <Filter/>
          تطبيق فلترة الأفراد
        </button>
      </div>
    </section>
  </div>

  <!-- نافذة الرسائل الجماعية -->
  <div
    v-if="bulkMessageOpen"
    class="modal-layer"
    @click.self="bulkMessageOpen = false"
  >
    <section class="modal message-modal">
      <div class="modal-head">
        <div>
          <h2>إرسال رسالة SMS جماعية</h2>

          <p>
            سيتم الإرسال إلى {{ filteredFamilies.length }}
            من أرباب الأسر الظاهرين في النتائج.
          </p>
        </div>

        <button @click="bulkMessageOpen = false">
          <X/>
        </button>
      </div>

      <label>
        محتوى الرسالة

        <textarea
          v-model="bulkMessage"
          maxlength="500"
          placeholder="اكتب نص الرسالة التي تريد إرسالها..."
          rows="6"
        ></textarea>

        <small>{{ bulkMessage.length }} / 500 حرف</small>
      </label>

      <div class="message-preview">
        <b>معاينة الرسالة قبل الإرسال</b>

        <p>
          {{
            bulkMessage ||
            'سيظهر نص الرسالة هنا كما سيصل إلى رب الأسرة.'
          }}
        </p>
      </div>

      <div class="modal-actions">
        <button
          class="ghost"
          @click="bulkMessageOpen = false"
        >
          إلغاء
        </button>

        <button
          class="primary"
          :disabled="
            !bulkMessage.trim() ||
            !filteredFamilies.length
          "
          @click="
            bulkMessageOpen = false;
            flash('تم تأكيد طلب الإرسال الجماعي')
          "
        >
          <MessageCircle/>

          تأكيد الإرسال إلى
          {{ filteredFamilies.length }}
          عائلة
        </button>
      </div>
    </section>
  </div>

  <!-- نافذة تفاصيل العائلة -->
  <div
    v-if="selectedFamily"
    class="drawer-layer"
    @click.self="selectedFamily = null"
  >
    <aside class="drawer family-drawer">
      <div class="modal-head">
        <div>
          <span class="eyebrow blue">
            ملف العائلة #{{ selectedFamily.id }}
          </span>

          <h2>{{ selectedFamily.head }}</h2>
        </div>

        <button @click="selectedFamily = null">
          <X/>
        </button>
      </div>

      <div class="drawer-stats">
        <span>
          <b>
            {{
              selectedFamily.members.length +
              (selectedFamily.headStatus === 'شهيد' ? 0 : 1)
            }}
          </b>

          أفراد محتسبون
        </span>

        <span>
          <b>{{ selectedFamily.needs.length }}</b>
          احتياجات
        </span>
      </div>

      <div class="drawer-section">
        <h3>جميع بيانات رب الأسرة</h3>

        <div class="detail-grid">
          <Info label="الاسم الكامل" :value="selectedFamily.head"/>
          <Info label="رقم الهوية" :value="selectedFamily.identity"/>
          <Info label="الجوال الأساسي" :value="selectedFamily.phone"/>

          <Info
            label="رقم واتساب"
            :value="
              `${selectedFamily.whatsappPrefix || '+970'}${selectedFamily.alternate}`
            "
          />

          <Info label="تاريخ الميلاد" :value="selectedFamily.birth"/>
          <Info label="الجنس" :value="selectedFamily.gender"/>
          <Info label="الحالة الاجتماعية" :value="selectedFamily.marital"/>
          <Info label="حالة رب الأسرة" :value="selectedFamily.headStatus"/>
          <Info label="حالة العمل" :value="selectedFamily.work"/>
          <Info label="الحالة الصحية" :value="selectedFamily.health"/>

          <Info
            label="تفاصيل الحالة الصحية"
            :value="selectedFamily.disease"
          />

          <Info label="صفة الإقامة" :value="selectedFamily.residencyType"/>
          <Info label="رقم كرت المؤن" :value="selectedFamily.rationCard"/>
          <Info label="الحالة التعليمية" :value="selectedFamily.education"/>

          <Info
            label="نوع الشهادة أو التخصص"
            :value="selectedFamily.educationDetail"
          />
        </div>
      </div>

      <div class="drawer-section">
        <h3>جميع معلومات السكن والنزوح</h3>

        <div class="detail-grid">
          <Info
            label="المنطقة الأصلية"
            :value="selectedFamily.originalArea"
          />

          <Info
            label="العنوان الأصلي بالتفصيل"
            :value="selectedFamily.originalAddress"
          />

          <Info
            label="حالة السكن الأصلي"
            :value="selectedFamily.originalHousingStatus"
          />

          <Info
            label="منطقة النزوح"
            :value="selectedFamily.displacementArea"
          />

          <Info
            label="مكان النزوح بالتفصيل"
            :value="selectedFamily.residence"
          />

          <Info
            label="نوع مكان النزوح"
            :value="selectedFamily.housing"
          />
        </div>

        <img
          v-if="selectedFamily.tentPhoto"
          :src="photoSrc(selectedFamily.tentPhoto)"
          alt="صورة خيمة العائلة"
          class="drawer-tent-photo"
        />
      </div>

      <div class="drawer-section">
        <h3>الصور والوثائق</h3>

        <div class="profile-documents">
          <figure v-if="selectedFamily.idPhoto">
            <img
              :src="photoSrc(selectedFamily.idPhoto)"
              alt="صورة الهوية"
            />

            <figcaption>صورة الهوية</figcaption>
          </figure>

          <figure v-if="selectedFamily.slipPhoto">
            <img
              :src="photoSrc(selectedFamily.slipPhoto)"
              alt="صورة السليب"
            />

            <figcaption>صورة السليب</figcaption>
          </figure>
        </div>
      </div>

      <div class="drawer-section">
        <h3>الاحتياجات</h3>

        <div class="needs-view">
          <span
            v-for="need in selectedFamily.needs"
            :key="need"
          >
            <Check/>
            {{ need }}
          </span>
        </div>
      </div>

      <div class="drawer-section">
        <h3>جميع أفراد الأسرة</h3>

        <div class="drawer-members">
          <article
            v-for="member in selectedFamily.members"
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
                label="احتياجات الفرد"
                :value="
                  (member.healthNeeds || []).join('، ') ||
                  'لم تحدد'
                "
              />
            </div>
          </article>
        </div>
      </div>

      <button
        class="primary wide"
        @click="
          bulkMessageOpen = true;
          selectedFamily = null
        "
      >
        <MessageCircle/>
        كتابة رسالة لرب الأسرة
      </button>
    </aside>
  </div>

  <!-- نافذة تفاصيل الفرد -->
  <div
    v-if="selectedMember"
    class="modal-layer"
    @click.self="selectedMember = null"
  >
    <section class="modal person-modal">
      <div class="modal-head">
        <div class="person-title">
          <span class="avatar xlarge">
            {{ selectedMember.first[0] }}
          </span>

          <div>
            <h2>
              {{ selectedMember.first }}
              {{ selectedMember.father }}
              {{ selectedMember.grandfather }}
              دلول
            </h2>

          </div>
        </div>

        <button @click="selectedMember = null">
          <X/>
        </button>
      </div>

      <div class="detail-grid">
        <Info
          label="العائلة"
          :value="familyOfMember(selectedMember)"
        />

        <Info
          label="رقم الهوية"
          :value="selectedMember.identity"
        />

        <Info
          label="تاريخ الميلاد"
          :value="selectedMember.birth"
        />

        <Info
          label="العمر"
          :value="`${age(selectedMember.birth)} سنة`"
        />

        <Info label="الجنس" :value="selectedMember.gender"/>
        <Info label="الحالة الصحية" :value="selectedMember.health"/>
        <Info label="الحالة التعليمية" :value="selectedMember.education"/>

        <Info
          label="نوع الشهادة أو التخصص"
          :value="selectedMember.educationDetail"
        />

        <Info
          label="الحالات الخاصة"
          :value="
            (selectedMember.special || []).join('، ') ||
            'لا توجد'
          "
        />

        <Info
          v-if="
            selectedMember.health &&
            selectedMember.health !== 'سليم'
          "
          label="احتياجات الفرد"
          :value="
            (selectedMember.healthNeeds || []).join('، ') ||
            'لم تحدد'
          "
        />
      </div>
    </section>
  </div>

  <!-- نافذة عرض الصور -->
  <div
    v-if="selectedPhoto"
    class="modal-layer"
    @click.self="selectedPhoto = null"
  >
    <section class="modal photo-viewer-modal">
      <div class="modal-head">
        <div>
          <h2>{{ selectedPhoto.title }}</h2>
          <p>عرض الصورة بالحجم الكامل</p>
        </div>

        <button @click="selectedPhoto = null">
          <X/>
        </button>
      </div>

      <img
        :src="selectedPhoto.src"
        :alt="selectedPhoto.title"
      />
    </section>
  </div>
</template>
