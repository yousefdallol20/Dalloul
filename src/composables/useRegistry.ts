import {
  computed,
  defineComponent,
  h,
  onMounted,
  reactive,
  ref
} from 'vue';

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
  X
} from 'lucide-vue-next';

import * as XLSX from 'xlsx';
import type { Family, Member } from '../types/models';

import {
  conditions,
  educationNeedsDetail,
  educationOptions,
  needOptions,
  regions,
  universitySpecializations,
  womenConditions
} from '../constants/options';

// هذا الملف هو العقل المركزي للمشروع.
// يجمع حالة الصفحات والعمليات المشتركة في مكان واحد.
let registryState: ReturnType<typeof createRegistry> | null = null;

function createRegistry() {
  // مكوّن موحد لعرض اسم المعلومة وقيمتها.
  const Info = defineComponent({
    props: {
      label: String,
      value: [String, Number],
      ltr: Boolean
    },

    setup: (props) => () =>
      h('div', { class: 'info-item' }, [
        h('small', props.label || ''),

        h(
          'b',
          {
            dir: props.ltr ? 'ltr' : undefined
          },
          String(props.value || '—')
        )
      ])
  });

  // حالة الصفحات.
  const view = ref<'login' | 'register' | 'family' | 'admin'>('login');

  const adminTab = ref<'families' | 'people' | 'settings'>(
    'families'
  );

  const step = ref(1);
  const showPassword = ref(false);
  const menuOpen = ref(false);

  const familyFilterOpen = ref(false);
  const peopleFilterOpen = ref(false);

  const bulkMessageOpen = ref(false);
  const bulkMessage = ref('');

  const selectedFamily = ref<Family | null>(null);
  const selectedMember = ref<Member | null>(null);

  const selectedPhoto = ref<{
    src: string;
    title: string;
  } | null>(null);

  const editingMember = ref<number | null>(null);
  const editingSection = ref<number | null>(null);

  const editingGroup = ref<
    | 'head'
    | 'documents'
    | 'housing'
    | 'members'
    | 'needs'
    | 'password'
    | null
  >(null);

  const toast = ref('');
  const search = ref('');
  const peopleSearch = ref('');

  const loginIdentity = ref('');
  const loginPassword = ref('');
  const loginBusy = ref(false);

  const adminToken = ref(
    sessionStorage.getItem('dalloul-admin-token') || ''
  );

  const familyToken = ref(
    sessionStorage.getItem('dalloul-family-token') || ''
  );

  const familyId = ref(Date.now());

  const editingFamily = ref(false);
  const familySaving = ref(false);

  const sheetsUrl = ref('');
  const sheetsConnected = ref(false);
  const sheetsBusy = ref(false);

  // النموذج الرئيسي لبيانات العائلة.
  const form = reactive({
    first: '',
    father: '',
    grandfather: '',
    identity: '',
    phone: '',
    alternate: '',
    birth: '',
    gender: '',
    marital: '',
    headStatus: '',
    work: '',
    health: '',
    disease: '',
    originalArea: '',
    originalAddress: '',
    whatsappPrefix: '+970',
    residencyType: '',
    rationCard: '',
    education: '',
    educationDetail: '',
    originalHousingStatus: '',
    displacementArea: '',
    residence: '',
    housing: '',
    tentPhoto: '',
    idPhoto: '',
    slipPhoto: '',
    needs: [] as string[],
    password: '',
    confirm: ''
  });

  // نموذج إضافة أو تعديل فرد.
  const memberDraft = reactive<Member>({
    id: Date.now(),
    first: '',
    father: '',
    grandfather: '',
    identity: '',
    birth: '',
    gender: '',
    relation: '',
    health: '',
    education: '',
    educationDetail: '',
    special: [],
    healthNeeds: []
  });

  // حالات النساء تظهر فقط عندما يكون جنس الفرد أنثى.
  const memberConditions = computed(() =>
    memberDraft.gender === 'أنثى'
      ? [...conditions, ...womenConditions]
      : conditions
  );

  const draftMembers = ref<Member[]>([]);
  const sampleFamilies = ref<Family[]>([]);

  // فلترة العائلات.
  const familyFilters = reactive({
    head: '',
    identity: '',
    phone: '',
    gender: '',
    marital: '',
    headStatus: '',
    work: '',
    health: '',
    originalArea: '',
    originalAddress: '',
    originalHousingStatus: '',
    displacementArea: '',
    housing: '',
    residence: '',
    hasTentPhoto: '',
    need: '',
    minMembers: '',
    maxMembers: ''
  });

  // فلترة الأفراد.
  const peopleFilters = reactive({
    name: '',
    identity: '',
    familyHead: '',
    gender: '',
    health: '',
    healthNeeds: [] as string[],
    education: '',
    special: '',
    minAge: '',
    maxAge: ''
  });

  // ترتيب العائلات حسب عدد أفرادها.
  const allFamilies = computed(() =>
    [...sampleFamilies.value].sort(
      (firstFamily, secondFamily) =>
        secondFamily.members.length -
        firstFamily.members.length
    )
  );

  // نتائج فلترة العائلات.
  const filteredFamilies = computed(() =>
    allFamilies.value.filter((family) => {
      const membersCount =
        family.members.length +
        (family.headStatus === 'شهيد' ? 0 : 1);

      const text = `
        ${family.head}
        ${family.identity}
        ${family.phone}
        ${family.alternate}
        ${family.originalArea}
        ${family.residence}
      `;

      return (
        text.includes(search.value) &&

        (!familyFilters.head ||
          family.head.includes(familyFilters.head)) &&

        (!familyFilters.identity ||
          family.identity.includes(familyFilters.identity)) &&

        (!familyFilters.phone ||
          `${family.phone} ${family.alternate} ${family.whatsapp || ''}`
            .includes(familyFilters.phone)) &&

        (!familyFilters.gender ||
          family.gender === familyFilters.gender) &&

        (!familyFilters.marital ||
          family.marital === familyFilters.marital) &&

        (!familyFilters.headStatus ||
          family.headStatus === familyFilters.headStatus) &&

        (!familyFilters.work ||
          family.work === familyFilters.work) &&

        (!familyFilters.health ||
          family.health === familyFilters.health) &&

        (!familyFilters.originalArea ||
          family.originalArea.includes(
            familyFilters.originalArea
          )) &&

        (!familyFilters.originalAddress ||
          family.originalAddress.includes(
            familyFilters.originalAddress
          )) &&

        (!familyFilters.originalHousingStatus ||
          family.originalHousingStatus ===
            familyFilters.originalHousingStatus) &&

        (!familyFilters.displacementArea ||
          family.displacementArea ===
            familyFilters.displacementArea) &&

        (!familyFilters.housing ||
          family.housing === familyFilters.housing) &&

        (!familyFilters.residence ||
          family.residence.includes(
            familyFilters.residence
          )) &&

        (!familyFilters.hasTentPhoto ||
          (
            familyFilters.hasTentPhoto === 'يوجد'
              ? Boolean(family.tentPhoto)
              : !family.tentPhoto
          )) &&

        (!familyFilters.need ||
          family.needs.includes(familyFilters.need)) &&

        (!familyFilters.minMembers ||
          membersCount >=
            Number(familyFilters.minMembers)) &&

        (!familyFilters.maxMembers ||
          membersCount <=
            Number(familyFilters.maxMembers))
      );
    })
  );

  // جميع الأفراد، مع إضافة رب الأسرة.
  const allPeople = computed(() =>
    allFamilies.value
      .flatMap((family) => [
        ...(
          family.headStatus === 'شهيد'
            ? []
            : [
                {
                  id: family.id,

                  first:
                    family.first ||
                    splitLegacyHeadName(family.head).first,

                  father:
                    family.father ||
                    splitLegacyHeadName(family.head).father,

                  grandfather:
                    family.grandfather ||
                    splitLegacyHeadName(family.head).grandfather,

                  identity: family.identity,
                  birth: family.birth,
                  gender: family.gender,
                  relation: 'رب الأسرة',
                  health: family.health,
                  education: family.education || '—',
                  educationDetail:
                    family.educationDetail || '',
                  special: [],
                  healthNeeds: [],
                  familyHead: family.head
                }
              ]
        ),

        ...family.members.map((member) => ({
          ...member,
          familyHead: family.head
        }))
      ])
      .sort(
        (firstPerson, secondPerson) =>
          new Date(firstPerson.birth).getTime() -
          new Date(secondPerson.birth).getTime()
      )
  );

  // نتائج فلترة الأفراد.
  const filteredPeople = computed(() =>
    allPeople.value.filter((person) => {
      const personName = `
        ${person.first}
        ${person.father}
        ${person.grandfather}
        دلول
      `;

      const personAge = age(person.birth);

      return (
        `${personName} ${person.identity}`
          .includes(peopleSearch.value) &&

        (!peopleFilters.name ||
          personName.includes(peopleFilters.name)) &&

        (!peopleFilters.identity ||
          person.identity.includes(
            peopleFilters.identity
          )) &&

        (!peopleFilters.familyHead ||
          person.familyHead.includes(
            peopleFilters.familyHead
          )) &&

        (!peopleFilters.gender ||
          person.gender === peopleFilters.gender) &&

        (!peopleFilters.health ||
          person.health === peopleFilters.health) &&

        (!peopleFilters.healthNeeds.length ||
          peopleFilters.healthNeeds.every((need) =>
            (person.healthNeeds || []).includes(need)
          )) &&

        (!peopleFilters.education ||
          person.education === peopleFilters.education) &&

        (!peopleFilters.special ||
          (person.special || []).includes(
            peopleFilters.special
          )) &&

        (!peopleFilters.minAge ||
          personAge >= Number(peopleFilters.minAge)) &&

        (!peopleFilters.maxAge ||
          personAge <= Number(peopleFilters.maxAge))
      );
    })
  );

  const fullName = computed(() =>
    [
      form.first,
      form.father,
      form.grandfather,
      'دلول'
    ]
      .filter(Boolean)
      .join(' ')
  );

  // إنشاء رقم واتساب دولي.
  function internationalWhatsapp(
    prefix: string,
    number: string
  ) {
    const cleanPrefix = String(prefix || '+970')
      .replace(/[^+\d]/g, '');

    const cleanNumber = String(number || '')
      .replace(/\D/g, '')
      .replace(/^0/, '');

    return cleanNumber
      ? `${cleanPrefix}${cleanNumber}`
      : '';
  }

  // العائلة الحالية.
  const currentFamily = computed<Family>(() => ({
    id: familyId.value,
    head: fullName.value,
    first: form.first,
    father: form.father,
    grandfather: form.grandfather,
    identity: form.identity,
    phone: form.phone,
    alternate: form.alternate,
    birth: form.birth,
    gender: form.gender,
    marital: form.marital,
    headStatus: form.headStatus,
    health: form.health,
    disease: form.disease,
    whatsappPrefix: form.whatsappPrefix,

    whatsapp: internationalWhatsapp(
      form.whatsappPrefix,
      form.alternate
    ),

    residencyType: form.residencyType,
    rationCard: form.rationCard,
    education: form.education,
    educationDetail: form.educationDetail,
    work: form.work,
    originalArea: form.originalArea,
    originalAddress: form.originalAddress,
    originalHousingStatus:
      form.originalHousingStatus,
    displacementArea: form.displacementArea,
    residence: form.residence,
    housing: form.housing,
    tentPhoto: form.tentPhoto,
    idPhoto: form.idPhoto,
    slipPhoto: form.slipPhoto,
    members: draftMembers.value,
    needs: form.needs
  }));

  const totalFamilies = computed(
    () => allFamilies.value.length
  );

  const totalPeople = computed(
    () => allPeople.value.length
  );

  const displacedFamilies = computed(
    () =>
      allFamilies.value.filter(
        (family) => family.displacementArea
      ).length
  );

  const healthCases = computed(
    () =>
      allPeople.value.filter(
        (person) =>
          person.health &&
          person.health !== 'سليم'
      ).length
  );

  // إظهار رسالة قصيرة.
  function flash(message: string) {
    toast.value = message;

    setTimeout(() => {
      toast.value = '';
    }, 2600);
  }

  function clearFamilyFilters() {
    Object.assign(familyFilters, {
      head: '',
      identity: '',
      phone: '',
      gender: '',
      marital: '',
      headStatus: '',
      work: '',
      health: '',
      originalArea: '',
      originalAddress: '',
      originalHousingStatus: '',
      displacementArea: '',
      housing: '',
      residence: '',
      hasTentPhoto: '',
      need: '',
      minMembers: '',
      maxMembers: ''
    });
  }

  function clearPeopleFilters() {
    Object.assign(peopleFilters, {
      name: '',
      identity: '',
      familyHead: '',
      gender: '',
      health: '',
      healthNeeds: [],
      education: '',
      special: '',
      minAge: '',
      maxAge: ''
    });
  }

  function go(nextView: typeof view.value) {
    view.value = nextView;
    menuOpen.value = false;

    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }

  // تنظيف الأسماء.
  function normalizeName(value: string) {
    return String(value || '')
      .replace(/[أإآ]/g, 'ا')
      .replace(/ؤ/g, 'و')
      .replace(/ئ/g, 'ي')
      .replace(/ء/g, '')
      .replace(/ة/g, 'ه')
      .replace(/[،,؛;.:/\\|_-]+/g, '')
      .replace(/\s+/g, '')
      .trim();
  }

  function splitLegacyHeadName(value: string) {
    const words = String(value || '')
      .replace(/[أإآ]/g, 'ا')
      .replace(/ؤ/g, 'و')
      .replace(/ئ/g, 'ي')
      .replace(/ء/g, '')
      .replace(/ة/g, 'ه')
      .replace(/[،,؛;.:/\\|_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    if (words[words.length - 1] === 'دلول') {
      words.pop();
    }

    const names: string[] = [];

    for (
      let wordIndex = 0;
      wordIndex < words.length;
      wordIndex++
    ) {
      if (
        ['عبد', 'ابو', 'ام'].includes(
          words[wordIndex]
        ) &&
        words[wordIndex + 1]
      ) {
        names.push(
          `${words[wordIndex]} ${words[wordIndex + 1]}`
        );

        wordIndex++;
      } else {
        names.push(words[wordIndex]);
      }
    }

    return {
      first: names[0] || '',
      father: names[1] || '',
      grandfather: names.slice(2).join(' ')
    };
  }

  // تحويل روابط Google Drive إلى رابط صورة مباشر.
  function photoSrc(value: string) {
    const url = String(value || '').trim();

    if (!url) {
      return '';
    }

    // الصورة الجديدة قبل حفظها.
    if (url.startsWith('data:image/')) {
      return url;
    }

    /*
     * يجب فحص رابط googleusercontent أولًا.
     * الرابط يكون:
     * https://lh3.googleusercontent.com/d/FILE_ID=w1600
     *
     * إذا استخدمنا تعبير /d/ العام أولًا،
     * سيتم اعتبار =w1600 جزءًا من رقم الملف،
     * وينتج رابط خاطئ ينتهي بـ:
     * =w1600=w1600
     */
    const googleUserContentId = url.match(
      /googleusercontent\.com\/d\/([^/=]+)/
    )?.[1];

    // روابط مثل:
    // drive.google.com/uc?export=view&id=FILE_ID
    const queryId = url.match(
      /[?&]id=([^&]+)/
    )?.[1];

    // روابط مثل:
    // drive.google.com/file/d/FILE_ID/view
    const drivePathId = url.match(
      /\/d\/([^/=?&]+)/
    )?.[1];

    const fileId =
      googleUserContentId ||
      queryId ||
      drivePathId;

    // رابط ليس تابعًا إلى Google Drive.
    if (!fileId) {
      return url;
    }

    // رابط الصور المصغرة أكثر ثباتًا للعرض داخل الموقع.
    return (
      'https://drive.google.com/thumbnail?id=' +
      encodeURIComponent(fileId) +
      '&sz=w1600'
    );
  }

  function convertTaaMarbuta(event: Event) {
    const field = event.target;

    if (
      !(field instanceof HTMLInputElement) &&
      !(field instanceof HTMLTextAreaElement)
    ) {
      return;
    }

    if (
      field instanceof HTMLInputElement &&
      [
        'password',
        'email',
        'file',
        'date',
        'number',
        'tel'
      ].includes(field.type)
    ) {
      return;
    }

    field.value = field.value.replace(/ة/g, 'ه');
  }

  function normalizeFamilyNames() {
    form.first = normalizeName(form.first);
    form.father = normalizeName(form.father);
    form.grandfather = normalizeName(
      form.grandfather
    );

    draftMembers.value = draftMembers.value.map(
      (member) => ({
        ...member,
        first: normalizeName(member.first),
        father: normalizeName(member.father),
        grandfather: normalizeName(
          member.grandfather
        )
      })
    );
  }

  // تحميل بيانات العائلة داخل النموذج.
  function loadFamilyIntoForm(family: Family) {
    const name = splitLegacyHeadName(
      family.head || ''
    );

    familyId.value =
      family.id || Date.now();

    Object.assign(form, {
      first: family.first || name.first,
      father: family.father || name.father,

      grandfather:
        family.grandfather ||
        name.grandfather,

      identity: family.identity || '',
      phone: family.phone || '',
      alternate: family.alternate || '',

      whatsappPrefix:
        family.whatsappPrefix || '+970',

      birth: family.birth || '',
      gender: family.gender || '',
      marital: family.marital || '',
      headStatus: family.headStatus || '',
      work: family.work || '',
      health: family.health || '',
      disease: family.disease || '',

      residencyType:
        family.residencyType || '',

      rationCard:
        family.rationCard || '',

      education:
        family.education || '',

      educationDetail:
        family.educationDetail || '',

      originalArea:
        family.originalArea || '',

      originalAddress:
        family.originalAddress || '',

      originalHousingStatus:
        family.originalHousingStatus || '',

      displacementArea:
        family.displacementArea || '',

      residence:
        family.residence || '',

      housing:
        family.housing || '',

      tentPhoto:
        family.tentPhoto || '',

      idPhoto:
        family.idPhoto || '',

      slipPhoto:
        family.slipPhoto || '',

      needs: Array.isArray(family.needs)
        ? family.needs
        : [],

      password: '',
      confirm: ''
    });

    form.tentPhoto = photoSrc(form.tentPhoto);
    form.idPhoto = photoSrc(form.idPhoto);
    form.slipPhoto = photoSrc(form.slipPhoto);

    draftMembers.value =
      Array.isArray(family.members)
        ? JSON.parse(
            JSON.stringify(family.members)
          ).map((member: Member) => ({
            ...member,

            educationDetail:
              member.educationDetail || '',

            special:
              Array.isArray(member.special)
                ? member.special
                : [],

            healthNeeds:
              Array.isArray(member.healthNeeds)
                ? member.healthNeeds
                : []
          }))
        : [];

    localStorage.setItem(
      'dalloul-family-v2',
      JSON.stringify(family)
    );
  }

  function startFamilyEdit() {
    editingFamily.value = true;
    form.password = '';
    form.confirm = '';
    step.value = 1;

    go('register');
  }

  function startSectionEdit(
    targetStep: number,
    group:
      | 'head'
      | 'documents'
      | 'housing'
      | 'members'
      | 'needs'
      | 'password'
  ) {
    editingFamily.value = true;
    editingSection.value = targetStep;
    editingGroup.value = group;

    form.password = '';
    form.confirm = '';
    step.value = targetStep;

    go('register');
  }

  function startPasswordChange() {
    startSectionEdit(4, 'password');
  }

  function cancelSectionEdit() {
    editingSection.value = null;
    editingGroup.value = null;
    editingFamily.value = false;

    go('family');
  }

  // فتح الصورة داخل النافذة المنبثقة.
  function openPhoto(
    source: string,
    title: string
  ) {
    selectedPhoto.value = {
      src: photoSrc(source),
      title
    };
  }

  // تسجيل الدخول.
  async function loginUser() {
    if (
      !/^\d{9}$/.test(loginIdentity.value) ||
      !loginPassword.value
    ) {
      flash(
        'أدخل رقم هوية صحيح وكلمة المرور'
      );

      return;
    }

    loginBusy.value = true;

    // محاولة تسجيل دخول المدير.
    try {
      const response = await fetch(
        '/api/admin/login',
        {
          method: 'POST',

          headers: {
            'content-type': 'application/json'
          },

          body: JSON.stringify({
            identity: loginIdentity.value,
            password: loginPassword.value
          })
        }
      );

      if (response.ok) {
        const data = await response.json();

        adminToken.value = data.token;

        sessionStorage.setItem(
          'dalloul-admin-token',
          data.token
        );

        go('admin');

        await Promise.all([
          loadSheetsStatus(),
          loadAdminFamilies()
        ]);

        loginBusy.value = false;
        return;
      }
    } catch {
      // إذا فشل دخول المدير نحاول دخول العائلة.
    }

    // محاولة تسجيل دخول العائلة.
    try {
      const response = await fetch(
        '/api/families/login',
        {
          method: 'POST',

          headers: {
            'content-type': 'application/json'
          },

          body: JSON.stringify({
            identity: loginIdentity.value,
            password: loginPassword.value
          })
        }
      );

      if (response.ok) {
        const data = await response.json();

        familyToken.value = data.token;

        sessionStorage.setItem(
          'dalloul-family-token',
          data.token
        );

        loadFamilyIntoForm(
          data.family as Family
        );

        editingFamily.value = false;

        go('family');

        loginBusy.value = false;
        return;
      }
    } catch {
      // التحقق يتم من الخادم.
    }

    flash(
      'رقم الهوية أو كلمة المرور غير صحيحة، أو تعذر الاتصال بالخادم'
    );

    loginBusy.value = false;
  }

  function setAdminTab(
    tab: typeof adminTab.value
  ) {
    adminTab.value = tab;
    menuOpen.value = false;

    if (tab === 'settings') {
      loadSheetsStatus();
    }
  }

  function logoutAdmin() {
    adminToken.value = '';

    sessionStorage.removeItem(
      'dalloul-admin-token'
    );

    go('login');
  }

  // إنهاء جلسة العائلة وحذف البيانات المحفوظة في هذا المتصفح.
  function logoutFamily() {
    familyToken.value = '';

    sessionStorage.removeItem(
      'dalloul-family-token'
    );

    localStorage.removeItem(
      'dalloul-family-v2'
    );

    editingFamily.value = false;
    editingSection.value = null;
    editingGroup.value = null;
    loginIdentity.value = '';
    loginPassword.value = '';

    go('login');
  }

  async function loadSheetsStatus() {
    if (!adminToken.value) return;

    try {
      const response = await fetch(
        '/api/admin/google-sheets',
        {
          headers: {
            authorization:
              `Bearer ${adminToken.value}`
          }
        }
      );

      if (response.ok) {
        const data = await response.json();

        sheetsConnected.value =
          data.connected;

        sheetsUrl.value =
          data.url || '';
      }
    } catch {
      // يبقى الربط غير متصل.
    }
  }

  async function loadAdminFamilies() {
    if (!adminToken.value) return;

    try {
      const response = await fetch(
        '/api/admin/families',
        {
          headers: {
            authorization:
              `Bearer ${adminToken.value}`
          }
        }
      );

      if (response.ok) {
        const data = await response.json();

        sampleFamilies.value =
          Array.isArray(data.families)
            ? data.families
            : [];

        sheetsConnected.value =
          Boolean(data.connected);
      }
    } catch {
      // تبقى القائمة فارغة.
    }
  }

  // استعادة جلسة المدير بعد تحديث الصفحة.
  async function restoreSavedAdminSession() {
    if (!adminToken.value) return;

    try {
      const response = await fetch(
        '/api/admin/google-sheets',
        {
          headers: {
            authorization:
              `Bearer ${adminToken.value}`
          }
        }
      );

      if (!response.ok) {
        throw new Error(
          'انتهت جلسة المدير'
        );
      }

      const data = await response.json();

      sheetsConnected.value =
        Boolean(data.connected);

      sheetsUrl.value =
        data.url || '';

      view.value = 'admin';

      await loadAdminFamilies();
    } catch {
      adminToken.value = '';

      sessionStorage.removeItem(
        'dalloul-admin-token'
      );

      view.value = 'login';
    }
  }

  // استعادة جلسة العائلة بعد تحديث الصفحة.
  // رمز الجلسة يبقى داخل التبويب، بينما تُستعاد بيانات العائلة المحفوظة لعرض الصفحة مباشرة.
  function restoreSavedFamilySession() {
    if (!familyToken.value || adminToken.value) return;

    try {
      const savedFamily = localStorage.getItem(
        'dalloul-family-v2'
      );

      if (!savedFamily) {
        throw new Error('لا توجد بيانات عائلة محفوظة');
      }

      const family = JSON.parse(
        savedFamily
      ) as Family;

      if (!family?.identity || !/^\d{9}$/.test(family.identity)) {
        throw new Error('بيانات العائلة المحفوظة غير صالحة');
      }

      loadFamilyIntoForm(family);
      editingFamily.value = false;
      editingSection.value = null;
      editingGroup.value = null;
      view.value = 'family';
    } catch {
      familyToken.value = '';

      sessionStorage.removeItem(
        'dalloul-family-token'
      );

      localStorage.removeItem(
        'dalloul-family-v2'
      );

      view.value = 'login';
    }
  }

  onMounted(async () => {
    if (adminToken.value) {
      await restoreSavedAdminSession();
      return;
    }

    restoreSavedFamilySession();
  });

  async function saveSheetsSettings() {
    if (
      !/^https:\/\/script\.google\.com\/macros\/s\//
        .test(sheetsUrl.value)
    ) {
      flash(
        'ألصق رابط Web App الصحيح من Google Apps Script'
      );

      return;
    }

    sheetsBusy.value = true;

    try {
      const response = await fetch(
        '/api/admin/google-sheets',
        {
          method: 'POST',

          headers: {
            'content-type': 'application/json',

            authorization:
              `Bearer ${adminToken.value}`
          },

          body: JSON.stringify({
            url: sheetsUrl.value
          })
        }
      );

      if (!response.ok) {
        throw new Error();
      }

      sheetsConnected.value = true;

      await loadAdminFamilies();

      flash(
        'تم ربط Google Sheets بنجاح'
      );
    } catch {
      flash(
        'تعذر حفظ إعدادات Google Sheets'
      );
    } finally {
      sheetsBusy.value = false;
    }
  }

  function nextStep() {
    if (step.value < 4) {
      step.value++;

      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
  }

  function toggleNeed(need: string) {
    if (form.needs.includes(need)) {
      form.needs = form.needs.filter(
        (currentNeed) =>
          currentNeed !== need
      );

      return;
    }

    if (form.needs.length < 3) {
      form.needs.push(need);
      return;
    }

    flash(
      'يمكن اختيار 3 احتياجات فقط'
    );
  }

  // إضافة فرد أو حفظ تعديله.
  function saveMember() {
    memberDraft.first = normalizeName(
      memberDraft.first
    );

    memberDraft.father = normalizeName(
      memberDraft.father
    );

    memberDraft.grandfather =
      normalizeName(
        memberDraft.grandfather
      );

    if (
      !memberDraft.first ||
      !/^\d{9}$/.test(
        memberDraft.identity
      )
    ) {
      flash(
        'أدخل اسم الفرد ورقم هوية من 9 أرقام'
      );

      return;
    }

    if (
      educationNeedsDetail(
        memberDraft.education
      ) &&
      !memberDraft.educationDetail.trim()
    ) {
      flash(
        'أدخل نوع الشهادة أو التخصص للفرد'
      );

      return;
    }

    const record = JSON.parse(
      JSON.stringify(memberDraft)
    );

    if (editingMember.value) {
      const memberIndex =
        draftMembers.value.findIndex(
          (member) =>
            member.id ===
            editingMember.value
        );

      if (memberIndex !== -1) {
        draftMembers.value[
          memberIndex
        ] = record;
      }
    } else {
      record.id = Date.now();

      draftMembers.value.push(record);
    }

    Object.assign(memberDraft, {
      id: Date.now(),
      first: '',
      father: form.first,
      grandfather: form.father,
      identity: '',
      birth: '',
      gender: '',
      relation: '',
      health: '',
      education: '',
      educationDetail: '',
      special: [],
      healthNeeds: []
    });

    editingMember.value = null;

    flash('تم حفظ بيانات الفرد');
  }

  function editMember(member: Member) {
    Object.assign(memberDraft, {
      ...JSON.parse(
        JSON.stringify(member)
      ),

      special:
        Array.isArray(member.special)
          ? member.special
          : [],

      healthNeeds:
        Array.isArray(member.healthNeeds)
          ? member.healthNeeds
          : []
    });

    editingMember.value = member.id;
  }

  function captureTentPhoto(
    event: Event
  ) {
    const file =
      (
        event.target as HTMLInputElement
      ).files?.[0];

    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {
      form.tentPhoto =
        String(reader.result || '');

      flash(
        'تم التقاط صورة الخيمة'
      );
    };

    reader.readAsDataURL(file);
  }

  function captureDocumentPhoto(
    event: Event,
    target: 'idPhoto' | 'slipPhoto'
  ) {
    const file =
      (
        event.target as HTMLInputElement
      ).files?.[0];

    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {
      form[target] =
        String(reader.result || '');

      flash(
        target === 'idPhoto'
          ? 'تمت إضافة صورة الهوية'
          : 'تمت إضافة صورة السليب'
      );
    };

    reader.readAsDataURL(file);
  }

  // حفظ العائلة.
  async function saveFamily() {
    normalizeFamilyNames();

    if (form.needs.length === 0) {
      flash(
        'اختر احتياجاً واحداً على الأقل'
      );

      return;
    }

    if (
      !/^\d{9}$/.test(form.identity)
    ) {
      flash(
        'رقم هوية رب الأسرة يجب أن يتكون من 9 أرقام'
      );

      return;
    }

    if (
      !/^\d{10}$/.test(form.phone)
    ) {
      flash(
        'رقم الجوال الأساسي يجب أن يتكون من 10 أرقام'
      );

      return;
    }

    if (
      !/^\d{9,10}$/.test(
        form.alternate
      )
    ) {
      flash(
        'أدخل رقم واتساب صحيحًا بدون المقدمة'
      );

      return;
    }

    if (
      form.residencyType === 'لاجئ' &&
      !form.rationCard.trim()
    ) {
      flash('أدخل رقم كرت المؤن');
      return;
    }

    if (
      educationNeedsDetail(
        form.education
      ) &&
      !form.educationDetail.trim()
    ) {
      flash(
        'أدخل نوع الشهادة أو التخصص لرب الأسرة'
      );

      return;
    }

    if (
      !form.idPhoto ||
      !form.slipPhoto
    ) {
      flash(
        'أضف صورة الهوية وصورة السليب'
      );

      return;
    }

    if (
      !editingFamily.value &&
      (
        form.password.length < 6 ||
        form.password !== form.confirm
      )
    ) {
      flash(
        'تحقق من كلمة المرور وتأكيدها'
      );

      return;
    }

    if (
      editingFamily.value &&
      (
        form.password ||
        form.confirm
      ) &&
      (
        form.password.length < 6 ||
        form.password !== form.confirm
      )
    ) {
      flash(
        'كلمة المرور الجديدة وتأكيدها غير متطابقين'
      );

      return;
    }

    familySaving.value = true;

    const family = JSON.parse(
      JSON.stringify(
        currentFamily.value
      )
    ) as Family;

    try {
      const response = await fetch(
        editingFamily.value
          ? '/api/families'
          : '/api/families/register',
        {
          method:
            editingFamily.value
              ? 'PUT'
              : 'POST',

          headers: {
            'content-type':
              'application/json',

            ...(
              familyToken.value
                ? {
                    authorization:
                      `Bearer ${familyToken.value}`
                  }
                : {}
            )
          },

          body: JSON.stringify({
            family,

            password:
              editingFamily.value
                ? undefined
                : form.password,

            newPassword:
              editingFamily.value &&
              form.password
                ? form.password
                : undefined
          })
        }
      );

      const data = await response
        .json()
        .catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.error ||
          'تعذر حفظ البيانات'
        );
      }

      if (data.token) {
        familyToken.value =
          data.token;

        sessionStorage.setItem(
          'dalloul-family-token',
          data.token
        );
      }

      loadFamilyIntoForm(
        data.family || family
      );

      sampleFamilies.value = [
        JSON.parse(
          JSON.stringify(
            data.family || family
          )
        )
      ];

      localStorage.removeItem(
        'dalloul-user-auth-v1'
      );

      editingFamily.value = false;
      editingSection.value = null;
      editingGroup.value = null;

      go('family');

      flash(
        'تم حفظ التعديلات في Google Sheets'
      );
    } catch (error) {
      localStorage.setItem(
        'dalloul-family-v2',
        JSON.stringify(family)
      );

      flash(
        error instanceof Error &&
        error.message !==
          'تعذر حفظ البيانات'
          ? error.message
          : 'تعذر الحفظ في Google Sheets؛ تأكد من الربط'
      );
    } finally {
      familySaving.value = false;
    }
  }

  // تصدير Excel.
  function exportExcel(
    kind: 'families' | 'people'
  ) {
    const rows =
      kind === 'families'
        ? allFamilies.value.map(
            (family) => ({
              'رب الأسرة':
                family.head,

              'رقم الهوية':
                family.identity,

              'الجوال الأساسي':
                family.phone,

              'رقم واتساب الدولي':
                family.whatsapp ||
                internationalWhatsapp(
                  family.whatsappPrefix,
                  family.alternate
                ),

              'تاريخ الميلاد':
                family.birth,

              'الجنس':
                family.gender,

              'الحالة الاجتماعية':
                family.marital,

              'حالة رب الأسرة':
                family.headStatus,

              'حالة العمل':
                family.work,

              'الحالة الصحية':
                family.health,

              'تفاصيل الحالة الصحية':
                family.disease,

              'صفة الإقامة':
                family.residencyType,

              'رقم كرت المؤن':
                family.rationCard,

              'الحالة التعليمية':
                family.education,

              'نوع الشهادة أو التخصص':
                family.educationDetail,

              'المنطقة الأصلية':
                family.originalArea,

              'العنوان الأصلي':
                family.originalAddress,

              'حالة السكن الأصلي':
                family.originalHousingStatus,

              'منطقة النزوح':
                family.displacementArea,

              'مكان النزوح بالتفصيل':
                family.residence,

              'نوع مكان النزوح':
                family.housing,

              'صورة الهوية':
                family.idPhoto,

              'صورة السليب':
                family.slipPhoto,

              'صورة الخيمة':
                family.tentPhoto,

              'عدد الأفراد':
                family.members.length +
                (
                  family.headStatus ===
                  'شهيد'
                    ? 0
                    : 1
                ),

              'الاحتياجات':
                family.needs.join('، '),

              'احتياجات مرضى الأسرة':
                (family.members || [])
                  .filter(
                    (member) =>
                      member.health &&
                      member.health !==
                        'سليم'
                  )
                  .map(
                    (member) =>
                      `${member.first} ${member.father}: ${
                        (
                          member.healthNeeds ||
                          []
                        ).join('، ') ||
                        'لم تحدد'
                      }`
                  )
                  .join(' | ')
            })
          )
        : filteredPeople.value.map(
            (person) => ({
              'الاسم':
                `${person.first} ${person.father} ${person.grandfather} دلول`,

              'رقم الهوية':
                person.identity,

              'الميلاد':
                person.birth,

              'الجنس':
                person.gender,

              'الصحة':
                person.health,

              'التعليم':
                person.education,

              'نوع الشهادة أو التخصص':
                person.educationDetail,

              'الحالات الخاصة':
                (
                  person.special ||
                  []
                ).join('، '),

              'احتياجات الفرد':
                (
                  person.healthNeeds ||
                  []
                ).join('، ')
            })
          );

    const worksheet =
      XLSX.utils.json_to_sheet(rows);

    const workbook =
      XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      kind === 'families'
        ? 'العائلات'
        : 'الأفراد'
    );

    XLSX.writeFile(
      workbook,
      kind === 'families'
        ? 'بيانات-العائلات.xlsx'
        : 'بيانات-الأفراد.xlsx'
    );

    flash('تم تجهيز ملف Excel');
  }

  function age(birth: string) {
    return (
      new Date().getFullYear() -
      new Date(birth).getFullYear()
    );
  }

  function familyOfMember(
    member: Member
  ) {
    return (
      allFamilies.value.find(
        (family) =>
          family.identity ===
            member.identity ||
          family.members.some(
            (currentMember) =>
              currentMember.id ===
              member.id
          )
      )?.head || '—'
    );
  }

  // القيم والدوال المستخدمة في الصفحات.
  return {
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
    universitySpecializations,
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
    familyOfMember
  };
}

// جميع الصفحات تستخدم نفس الحالة المشتركة.
export function useRegistry() {
  if (!registryState) {
    registryState = createRegistry();
  }

  return registryState;
}