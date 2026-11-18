import {
  computed,
  defineComponent,
  h,
  onMounted,
  reactive,
  ref,
  watch
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

let registryState: ReturnType<typeof createRegistry> | null = null;

function createRegistry() {
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
  const identityError = ref('');
  const memberIdentityError = ref('');
  const originalIdentity = ref('');
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

  const form = reactive({
    first: '',
    father: '',
    grandfather: '',
    identity: '',
    phone: '',
    altPhone: '',
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
    displacementStatus: '',
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

  watch(
    () => form.displacementStatus,
    (status) => {
      if (status === 'غير نازح') {
        form.displacementArea = '';
        form.residence = '';
        form.housing = '';
        form.tentPhoto = '';
      }
    }
  );

  watch(
    () => form.housing,
    (housing) => {
      if (housing !== 'خيمة') {
        form.tentPhoto = '';
      }
    }
  );

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

  const memberConditions = computed(() =>
    memberDraft.gender === 'أنثى'
      ? [...conditions, ...womenConditions]
      : conditions
  );

  const draftMembers = ref<Member[]>([]);
  const sampleFamilies = ref<Family[]>([]);

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
    displacementStatus: '',
    displacementArea: '',
    housing: '',
    residence: '',
    hasTentPhoto: '',
    need: '',
    familyStatus: '',
    minMembers: '',
    maxMembers: ''
  });

  const peopleFilters = reactive({
    name: '',
    identity: '',
    familyHead: '',
    gender: '',
    martyr: '',
    health: '',
    healthNeeds: [] as string[],
    education: '',
    special: '',
    minAge: '',
    maxAge: ''
  });

  const allFamilies = computed(() =>
    [...sampleFamilies.value].sort(
      (firstFamily, secondFamily) =>
        secondFamily.members.length -
        firstFamily.members.length
    )
  );

  const filteredFamilies = computed(() =>
    allFamilies.value.filter((family) => {
      const membersCount =
        family.members.filter((m) => m.health !== 'شهيد').length +
        (family.headStatus === 'شهيد' ? 0 : 1);

      const isAllMartyrs =
        family.headStatus === 'شهيد' &&
        (family.members || []).every((m: any) => m.health === 'شهيد');

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
            `${family.phone} ${family.altPhone || ''} ${family.alternate} ${family.whatsapp || ''}`
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
          family.originalArea === familyFilters.originalArea) &&

        (!familyFilters.originalAddress ||
          family.originalAddress.includes(
            familyFilters.originalAddress
          )) &&

        (!familyFilters.originalHousingStatus ||
          family.originalHousingStatus ===
            familyFilters.originalHousingStatus) &&

        (!familyFilters.displacementStatus ||
          (family.displacementStatus ||
            (family.displacementArea ? 'نازح' : '')) ===
            familyFilters.displacementStatus) &&

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

        (!familyFilters.familyStatus ||
          (familyFilters.familyStatus === 'شهداء'
            ? isAllMartyrs
            : !isAllMartyrs)) &&

        (!familyFilters.minMembers ||
          membersCount >=
            Number(familyFilters.minMembers)) &&

        (!familyFilters.maxMembers ||
          membersCount <=
            Number(familyFilters.maxMembers))
      );
    })
  );

  const allPeople = computed(() =>
    allFamilies.value
      .flatMap((family) => [
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
          health: family.headStatus === 'شهيد' ? 'شهيد' : family.health,
          martyrDate: (family as any).martyrDate || '',
          education: family.education || '—',
          educationDetail:
            family.educationDetail || '',
          special: [] as string[],
          healthNeeds: [] as string[],
          familyHead: family.head
        },

        ...family.members.map((member) => ({
          ...member,
          special: Array.isArray(member.special) ? member.special : ([] as string[]),
          healthNeeds: Array.isArray(member.healthNeeds) ? member.healthNeeds : ([] as string[]),
          familyHead: family.head
        }))
      ])
      .sort(
        (firstPerson, secondPerson) =>
          new Date(firstPerson.birth).getTime() -
          new Date(secondPerson.birth).getTime()
      )
  );

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

  const currentFamily = computed<Family>(() => ({
    id: familyId.value,
    head: fullName.value,
    first: form.first,
    father: form.father,
    grandfather: form.grandfather,
    identity: form.identity,
    phone: form.phone,
    altPhone: form.altPhone,
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
    displacementStatus: form.displacementStatus,
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
        (family) =>
          family.displacementStatus === 'نازح' ||
          (!family.displacementStatus &&
            family.displacementArea)
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
      displacementStatus: '',
      displacementArea: '',
      housing: '',
      residence: '',
      hasTentPhoto: '',
      need: '',
      familyStatus: '',
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
      martyr: '',
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

  function normalizeName(value: string) {
    return String(value || '')
      .replace(/[أإ]/g, 'ا')
      .replace(/ة/g, 'ه')
      .replace(/[،,؛;.:/\\|_-]+/g, '')
      .replace(/\s+/g, '')
      .trim();
  }

  function splitLegacyHeadName(value: string) {
    const words = String(value || '')
      .replace(/[أإ]/g, 'ا')
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

  function photoSrc(value: string) {
    const url = String(value || '').trim();

    if (!url) {
      return '';
    }

    if (url.startsWith('data:image/')) {
      return url;
    }

    const googleUserContentId = url.match(
      /googleusercontent\.com\/d\/([^/=]+)/
    )?.[1];

    const queryId = url.match(
      /[?&]id=([^&]+)/
    )?.[1];

    const drivePathId = url.match(
      /\/d\/([^/=?&]+)/
    )?.[1];

    const fileId =
      googleUserContentId ||
      queryId ||
      drivePathId;

    if (!fileId) {
      return url;
    }

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

  function loadFamilyIntoForm(family: Family) {
    originalIdentity.value = family.identity || '';
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
      altPhone: family.altPhone || '',
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
      displacementStatus:
        family.displacementStatus ||
        (family.displacementArea || family.residence
          ? 'نازح'
          : ''),

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

  function openPhoto(
    source: string,
    title: string
  ) {
    selectedPhoto.value = {
      src: photoSrc(source),
      title
    };
  }

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
      // فشل دخول المدير
    }

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
      // فشل دخول العائلة
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
      // خطأ في جلب الحالة
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
      // خطأ في جلب العائلات
    }
  }

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

  const DUP_MESSAGE = 'رقم الهوية مستخدم من قبل، يرجى إزالته من المكان الآخر لتتمكن من المتابعة';

  const identityCache = new Map<string, boolean>();
  const identityPending = new Map<string, Promise<boolean>>();

  function serverIdentityExists(identity: string): Promise<boolean> {
    const key = `${identity}|${originalIdentity.value}`;

    if (identityCache.has(key)) {
      return Promise.resolve(identityCache.get(key) as boolean);
    }

    const running = identityPending.get(key);
    if (running) return running;

    const request = fetch('/api/families/check-identity', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ identity, exclude: originalIdentity.value })
    })
      .then((response) => response.json())
      .then((data) => {
        const exists = Boolean(data?.exists);
        identityCache.set(key, exists);
        return exists;
      })
      .catch(() => false)
      .finally(() => identityPending.delete(key));

    identityPending.set(key, request);
    return request;
  }

  async function identityTaken(identity: string, isMember: boolean) {
    if (!/^\d{9}$/.test(identity)) return false;

    if (!isMember && identity === form.identity) {
      // رب الأسرة يطابق نفسه
    } else if (isMember && identity === form.identity) {
      return true;
    }

    const others = draftMembers.value
      .filter((m) => m.id !== editingMember.value)
      .map((m) => m.identity);

    if (others.includes(identity)) return true;

    return serverIdentityExists(identity);
  }

  async function checkHeadIdentity() {
    identityError.value = (await identityTaken(form.identity, false)) ? DUP_MESSAGE : '';
  }

  async function checkMemberIdentity() {
    memberIdentityError.value = (await identityTaken(memberDraft.identity, true)) ? DUP_MESSAGE : '';
  }

  async function nextStep() {
    if (step.value === 1) {
      await checkHeadIdentity();
      if (identityError.value) { flash(identityError.value); return; }

      if (!form.first.trim() || !form.father.trim() || !form.grandfather.trim()) {
        flash('يجب تسجيل الاسم رباعي (الاسم الأول، اسم الأب، واسم الجد)');
        return;
      }

      if (!form.identity || form.identity.length !== 9) {
        flash('أدخل رقم هوية صحيح من 9 أرقام');
        return;
      }

      if (!form.phone || form.phone.length !== 10) {
        flash('أدخل رقم جوال أساسي صحيح من 10 أرقام');
        return;
      }

      if (!form.alternate) {
        flash('أدخل رقم واتساب صحيح');
        return;
      }

      if (!form.birth) {
        flash('أدخل تاريخ الميلاد');
        return;
      }

      if (!form.gender) {
        flash('يرجى اختيار الجنس');
        return;
      }

      if (!form.marital) {
        flash('يرجى اختيار الحالة الاجتماعية');
        return;
      }

      if (!form.headStatus) {
        flash('يرجى اختيار حالة رب الأسرة');
        return;
      }

      if (educationNeedsDetail(form.education) && !form.educationDetail.trim()) {
        flash('يرجى اختيار التخصص');
        return;
      }
    }

    if (step.value === 2) {
      if (!form.originalArea) {
        flash('اختر المنطقة الأصلية');
        return;
      }

      if (!form.originalAddress.trim()) {
        flash('أدخل العنوان الأصلي بالتفصيل');
        return;
      }

      if (!form.originalHousingStatus) {
        flash('اختر حالة السكن الأصلي');
        return;
      }

      if (!form.displacementStatus) {
        flash('اختر حالة النزوح');
        return;
      }

      if (form.displacementStatus === 'نازح') {
        if (!form.displacementArea) {
          flash('اختر منطقة النزوح');
          return;
        }

        if (!form.residence.trim()) {
          flash('أدخل مكان النزوح بالتفصيل');
          return;
        }

        if (!form.housing) {
          flash('اختر نوع مكان النزوح');
          return;
        }

        if (form.housing === 'خيمة' && !form.tentPhoto) {
          flash('يرجى اختيار صورة واضحة للخيمة من الخارج');
          return;
        }
      }
    }

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

  async function saveMember() {
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

    await checkMemberIdentity();
    if (memberIdentityError.value) { flash(memberIdentityError.value); return; }

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
    memberIdentityError.value = '';

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

  function compressImage(
    file: File,
    maxSize = 1600,
    quality = 0.75
  ): Promise<string> {
    return new Promise((resolve) => {
      const readOriginal = () => {
        const reader = new FileReader();

        reader.onload = () =>
          resolve(String(reader.result || ''));

        reader.readAsDataURL(file);
      };

      const objectUrl = URL.createObjectURL(file);
      const image = new Image();

      image.onload = () => {
        const scale = Math.min(
          1,
          maxSize / Math.max(image.width, image.height)
        );

        const canvas = document.createElement('canvas');
        canvas.width = Math.round(image.width * scale);
        canvas.height = Math.round(image.height * scale);

        const context = canvas.getContext('2d');
        URL.revokeObjectURL(objectUrl);

        if (!context) {
          readOriginal();
          return;
        }

        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 0, 0, canvas.width, canvas.height);

        resolve(canvas.toDataURL('image/jpeg', quality));
      };

      image.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        readOriginal();
      };

      image.src = objectUrl;
    });
  }

  async function captureTentPhoto(
    event: Event
  ) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) return;

    form.tentPhoto = await compressImage(file);
    input.value = '';

    flash(
      'تمت إضافة صورة الخيمة'
    );
  }

  async function captureDocumentPhoto(
    event: Event,
    target: 'idPhoto' | 'slipPhoto'
  ) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) return;

    form[target] = await compressImage(file);
    input.value = '';

    flash(
      target === 'idPhoto'
        ? 'تمت إضافة صورة الهوية'
        : 'تمت إضافة صورة السليب'
    );
  }

  async function saveFamily() {
    normalizeFamilyNames();

    if (form.needs.length === 0 && editingGroup.value !== 'password' && editingGroup.value !== 'housing') {
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
      form.altPhone && !/^\d{10}$/.test(form.altPhone)
    ) {
      flash(
        'رقم الجوال البديل يجب أن يتكون من 10 أرقام'
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

    if (!editingFamily.value || editingGroup.value === 'housing') {
      if (!form.originalArea) {
        flash('اختر المنطقة الأصلية');
        return;
      }

      if (!form.originalAddress.trim()) {
        flash('أدخل العنوان الأصلي بالتفصيل');
        return;
      }

      if (!form.originalHousingStatus) {
        flash('اختر حالة السكن الأصلي');
        return;
      }

      if (!form.displacementStatus) {
        flash('اختر حالة النزوح');
        return;
      }

      if (form.displacementStatus === 'نازح') {
        if (!form.displacementArea) {
          flash('اختر منطقة النزوح');
          return;
        }

        if (!form.residence.trim()) {
          flash('أدخل مكان النزوح بالتفصيل');
          return;
        }

        if (!form.housing) {
          flash('اختر نوع مكان النزوح');
          return;
        }

        if (form.housing === 'خيمة' && !form.tentPhoto) {
          flash('يرجى اختيار صورة واضحة للخيمة من الخارج');
          return;
        }
      }
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
        'تم حفظ البيانات بنجاح'
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
          : 'تعذر حفظ البيانات؛ تأكد من الاتصال'
      );
    } finally {
      familySaving.value = false;
    }
  }

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

              'رقم جوال بديل':
                family.altPhone || '',

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

              'حالة النزوح':
                family.displacementStatus ||
                (family.displacementArea ? 'نازح' : ''),

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
                family.members.filter((m) => m.health !== 'شهيد').length +
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
    familyOfMember,
    identityError,
    memberIdentityError,
    checkHeadIdentity,
    checkMemberIdentity
  };
}

export function useRegistry() {
  if (!registryState) {
    registryState = createRegistry();
  }

  return registryState;
}