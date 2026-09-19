export interface PatientBasicInfo {
  name: string;
  age: number;
  gender: '남' | '여';
  phone: string;
  patientId: string;
  rrnFront: string; // 주민등록번호 앞자리 (예: 920512)
}

export type TriageLevel = '응급' | '준응급' | '일반';
export type PatientStatus = '호출중' | '진료대기' | '진료중' | '완료';
export type DentalDepartment = '보존과' | '치주과' | '보철과' | '구강외과' | '구강내과';

export type UserRole = 'staff' | 'doctor';

export interface UserAccount {
  id: string;
  name: string;
  role: UserRole;
  department?: DentalDepartment;
  title: string;
  licenseNumber?: string;
  room?: string;
}

export interface PastVisitRecord {
  date: string;
  department: DentalDepartment | string;
  areaTitle: string;
  diagnosis: string;
  treatment: string;
  prescriptions: string;
  doctor: string;
  time?: string;
  status?: PatientStatus | string;
  chiefComplaint?: string;
  doctorDiagnosisNote?: string;
  isRealDbRecord?: boolean;
  isSameDayConsultation?: boolean;
  assignedChair?: string;
  recommendedRoom?: string;
}

export interface QueuePatient {
  id: string; // Firestore document ID
  patient: PatientBasicInfo;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  areaTitle: string; // 통증/치료 부위 (예: 상악 우측 제1대구치 #16)
  locationTitle: string; // 원내 위치 (예: 본관 2층 보존진료실)
  chiefComplaint: string; // C.C
  historyOfPresentIllness: string; // Hx
  suspectedConditions: string[]; // 추정 감별 진단군
  recommendedDepartment: DentalDepartment | string;
  recommendedRoom: string;
  assignedChair: string; // 체어 번호 (예: 2번 체어)
  triageLevel: TriageLevel;
  status: PatientStatus;
  doctorDiagnosisNote: string;
  treatmentPlan: string;
  prescriptions: string;
  // Clinical safety & Allergies / Medications
  drugAllergies?: string[];
  hasNoAllergies?: boolean;
  otherAllergyText?: string;
  medicationsList?: string[];
  hasNoMedications?: boolean;
  otherMedicationText?: string;
  bleedingTendency?: string;
  medicalAlerts?: string[];
  redFlags?: string[];
  medications?: string;
  allergies?: string;
  careInstructions?: string[];
  pastVisits?: PastVisitRecord[]; // 과거 진료 내역 및 타과 협진 히스토리
  createdAt?: any;
  updatedAt?: any;
}

export interface DentalDepartmentCount {
  department: string;
  count: number;
}
