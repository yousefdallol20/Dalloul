// هذا الملف يعرّف أشكال البيانات المستخدمة في جميع أجزاء المشروع.

// بيانات فرد واحد من أفراد الأسرة.
export type Member = {
  id: number;
  first: string;
  father: string;
  grandfather: string;
  identity: string;
  birth: string;
  gender: string;
  relation: string;
  health: string;
  education: string;
  educationDetail: string;
  special: string[];
  healthNeeds: string[];
};

// ملف العائلة الكامل كما ينتقل بين Vue والخادم وGoogle Sheets.
export type Family = {
  id: number;
  head: string;
  first?: string;
  father?: string;
  grandfather?: string;
  identity: string;
  phone: string;
  alternate: string;
  birth: string;
  gender: string;
  marital: string;
  headStatus: string;
  work: string;
  health: string;
  disease: string;
  whatsappPrefix: string;
  whatsapp?: string;
  residencyType: string;
  rationCard: string;
  education: string;
  educationDetail: string;
  originalArea: string;
  originalAddress: string;
  originalHousingStatus: string;
  displacementArea: string;
  residence: string;
  housing: string;
  tentPhoto: string;
  idPhoto: string;
  slipPhoto: string;
  members: Member[];
  needs: string[];
};
