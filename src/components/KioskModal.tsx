import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  UserPlus,
  Clock,
  Sparkles,
  CheckCircle2,
  Phone,
  Calculator,
  Building2,
  Armchair,
  FileSpreadsheet,
  History,
  UserCheck,
  Calendar,
  Search,
  AlertTriangle,
  Pill,
  ShieldAlert,
  HeartPulse,
  FileText,
} from 'lucide-react';
import {
  DentalDepartment,
  TriageLevel,
  PatientStatus,
  QueuePatient,
  PastVisitRecord,
} from '../types';
import { DentalMouthMap, DentalAreaSelection } from './DentalMouthMap';
import {
  getTodayDateString,
  getNowTimeString,
  addDays,
  addMonths,
  getDaysDiff,
  getKoreanDayOfWeek,
} from '../utils/dateUtils';
import { isSamePatient, getAggregatedPatientHistory } from '../utils/patientHistory';

interface KioskModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingPatients?: QueuePatient[];
  onSubmit: (newPatient: any) => Promise<void>;
  initialData?: Partial<QueuePatient> | null;
}

const CLINICAL_ROOM_OPTIONS = [
  '보존 1진료실',
  '보존 2진료실',
  '치주 1진료실',
  '치주 2진료실',
  '보철 1진료실',
  '보철 2진료실',
  '구강외과 1진료실',
  '구강외과 수술실 (특진실)',
  '구강내과 1진료실',
  '중앙예진실',
];

const CHAIR_OPTIONS = [
  '1번 체어',
  '2번 체어',
  '3번 체어',
  '4번 체어',
  '5번 체어',
  '특진 체어',
];

export const COMMON_DRUG_ALLERGIES = [
  '치과 국소마취제(리도카인) 이상반응',
  '페니실린/세파계 항생제',
  '소염진통제(NSAIDs/아스피린)',
  '라텍스/소독제 알러지',
  '조영제 알러지',
];

export const COMMON_MEDICATIONS = [
  '신장질환/혈액투석',
  '스테로이드/면역억제제',
  '항응고제/항혈소판제 (아스피린, 와파린, NOAC)',
  '골다공증 치료제 (비스포스포네이트/프롤리아)',
  '당뇨병 (혈당 강하제/인슐린)',
  '고혈압/심혈관 질환',
  '간 질환 (간염, 간경변)',
];

const PRESET_CC_OPTIONS = [
  {
    label: '찬물 시림 & 찌릿한 어금니 통증 (특이약물 없음)',
    area: '상악 우측 대구치 (#16, #17)',
    dept: '보존과' as DentalDepartment,
    cc: '찬물이나 단 음식 먹을 때 찌릿하게 시리고 밤에 욱신거려요.',
    hx: '3일 전부터 통증 시작, 진통제 복용했으나 차도 없음.',
    room: '보존 1진료실',
    chair: '1번 체어',
    level: '준응급' as TriageLevel,
    drugAllergies: [] as string[],
    hasNoAllergies: true,
    medicationsList: [] as string[],
    hasNoMedications: true,
    otherMedicationText: '',
    otherAllergyText: '',
    bleedingTendency: '없음 (정상 지혈)',
  },
  {
    label: '사랑니 통증 & 리도카인 마취 알러지 & 우울증약',
    area: '하악 좌측 사랑니 (#38)',
    dept: '구강외과' as DentalDepartment,
    cc: '사랑니 쪽 잇몸이 빨갛게 부어오르고 침 삼킬 때 목까지 아파요.',
    hx: '어제부터 개구장애(손가락 2개 미만) 및 미열 발생.',
    room: '구강외과 1진료실',
    chair: '2번 체어',
    level: '응급' as TriageLevel,
    drugAllergies: ['치과 국소마취제(리도카인) 이상반응'],
    hasNoAllergies: false,
    medicationsList: ['신장질환/혈액투석', '스테로이드/면역억제제'],
    hasNoMedications: false,
    otherMedicationText: '우울증약',
    otherAllergyText: '',
    bleedingTendency: '지혈 지연 (항응고제 복용 / 위험)',
  },
  {
    label: '잇몸 출혈 & 항응고제/아스피린 복용 (지혈 지연)',
    area: '전악 치은 및 잇몸 출혈 부위',
    dept: '치주과' as DentalDepartment,
    cc: '양치할 때 피가 계속 나고 잇몸이 부어서 씹을 때 이가 흔들립니다.',
    hx: '만성 치주염 기왕력, 최근 스트레스로 증상 악화.',
    room: '치주 1진료실',
    chair: '3번 체어',
    level: '준응급' as TriageLevel,
    drugAllergies: ['소염진통제(NSAIDs/아스피린)'],
    hasNoAllergies: false,
    medicationsList: ['항응고제/항혈소판제 (아스피린, 와파린, NOAC)', '고혈압/심혈관 질환'],
    hasNoMedications: false,
    otherMedicationText: '',
    otherAllergyText: '',
    bleedingTendency: '지혈 지연 (항응고제 복용 / 위험)',
  },
  {
    label: '턱관절 소리 & 개구제한 (구강내과)',
    area: '양측 악관절(TMJ) 및 저작근 부위',
    dept: '구강내과' as DentalDepartment,
    cc: '입을 벌릴 때 딱딱 소리가 나고 턱이 꽉 낀 듯 입이 잘 안 벌어져요.',
    hx: '수면 중 이갈이/이악물기 습관, 저작근 피로감 지속.',
    room: '구강내과 1진료실',
    chair: '1번 체어',
    level: '일반' as TriageLevel,
    drugAllergies: [] as string[],
    hasNoAllergies: true,
    medicationsList: [] as string[],
    hasNoMedications: true,
    otherMedicationText: '',
    otherAllergyText: '',
    bleedingTendency: '없음 (정상 지혈)',
  },
  {
    label: '틀니 잇몸 통증 & 골다공증약(MRONJ 고위험) 복용',
    area: '무치악 잇몸 및 틀니 장착 부위',
    dept: '보철과' as DentalDepartment,
    cc: '새로 맞춘 틀니 밑 잇몸이 짓눌려 아파서 식사를 못합니다.',
    hx: '틀니 착용 2주차, 점막에 하얗게 궤양 발생.',
    room: '보철 1진료실',
    chair: '2번 체어',
    level: '일반' as TriageLevel,
    drugAllergies: [] as string[],
    hasNoAllergies: true,
    medicationsList: ['골다공증 치료제 (비스포스포네이트/프롤리아)'],
    hasNoMedications: false,
    otherMedicationText: '고혈압약',
    otherAllergyText: '',
    bleedingTendency: '없음 (정상 지혈)',
  },
  {
    label: '🔴 구강 점막 궤양 & 고위험군 (연조직/삼킴/보철/종양학 Hx)',
    area: '하악 좌측 구강저 및 설측 점막',
    dept: '구강외과' as DentalDepartment,
    cc: '좌측 혀 아래 궤양이 3주째 낫지 않고 쓰라림. [NHS MCM 위험 등급] 🔴 고위험군 (HIGH RISK)',
    hx: '3주 전 발병 후 점진적 악화. [연조직 및 점막 소견] 1.5cm 경결성 궤양 및 발적. [삼킴 및 타액 상태] 구강 건조 및 삼킬 때 통증. [치과 보철 이력] 하악 좌측 브릿지 보철물. [전신질환 및 종양학] 항암 면역요법 기왕력.',
    room: '구강외과 1진료실',
    chair: '2번 체어',
    level: '응급' as TriageLevel,
    drugAllergies: [] as string[],
    hasNoAllergies: true,
    medicationsList: ['스테로이드/면역억제제', '고혈압/심혈관 질환'],
    hasNoMedications: false,
    otherMedicationText: '면역항암제',
    otherAllergyText: '',
    bleedingTendency: '지혈 지연 (항응고제 복용 / 위험)',
  },
];

export const KioskModal: React.FC<KioskModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  existingPatients,
  initialData,
}) => {
  if (!isOpen) return null;

  const todayStr = getTodayDateString();

  // Visit & Reservation Date and Time
  const [visitDate, setVisitDate] = useState<string>(() => initialData?.date || todayStr);
  const [visitTime, setVisitTime] = useState<string>(() => initialData?.time || getNowTimeString());

  // Patient Registration Details
  const [name, setName] = useState('이지안');
  const [gender, setGender] = useState<'남' | '여'>('여');
  const [age, setAge] = useState<number>(31);
  const [phone, setPhone] = useState('010-8821-9934');
  const [rrnFront, setRrnFront] = useState('950412');
  const [rrnBackDigit, setRrnBackDigit] = useState('2'); // First digit of rear SSN

  // Department & Dental Area
  const [department, setDepartment] = useState<DentalDepartment>('보존과');
  const [areaTitle, setAreaTitle] = useState('상악 우측 대구치 (#16, #17)');
  const [recommendedRoom, setRecommendedRoom] = useState('보존 1진료실');
  const [assignedChair, setAssignedChair] = useState('1번 체어');
  const [triageLevel, setTriageLevel] = useState<TriageLevel>('준응급');

  // Drug Allergies
  const [drugAllergies, setDrugAllergies] = useState<string[]>([]);
  const [hasNoAllergies, setHasNoAllergies] = useState<boolean>(true);
  const [otherAllergyText, setOtherAllergyText] = useState<string>('');

  // Medications & Chronic conditions
  const [medicationsList, setMedicationsList] = useState<string[]>([]);
  const [hasNoMedications, setHasNoMedications] = useState<boolean>(true);
  const [otherMedicationText, setOtherMedicationText] = useState<string>('');

  // Bleeding tendency
  const [bleedingTendency, setBleedingTendency] = useState<string>('없음 (정상 지혈)');

  // Chief complaint & visit notes
  const [chiefComplaint, setChiefComplaint] = useState(
    '찬물 마실 때 찌릿하게 시리고 밤에 욱신거려요.'
  );
  const [historyOfPresentIllness, setHistoryOfPresentIllness] = useState(
    '3일 전 급성 발병. 냉자극 10초 이상 잔존 및 야간 자발통 동반.'
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ageCalculatedFeedback, setAgeCalculatedFeedback] = useState<string>('만 31세 자동 계산됨');

  // Load initialData when opening with follow-up or specific patient info
  useEffect(() => {
    if (initialData) {
      if (initialData.patient?.name) setName(initialData.patient.name);
      if (initialData.patient?.gender) setGender(initialData.patient.gender);
      if (initialData.patient?.age) setAge(initialData.patient.age);
      if (initialData.patient?.phone) setPhone(initialData.patient.phone);
      if (initialData.patient?.rrnFront) {
        setRrnFront(initialData.patient.rrnFront);
        setRrnBackDigit(initialData.patient.gender === '남' ? '1' : '2');
      }
      if (initialData.recommendedDepartment) setDepartment(initialData.recommendedDepartment as DentalDepartment);
      if (initialData.recommendedRoom) setRecommendedRoom(initialData.recommendedRoom);
      if (initialData.areaTitle) setAreaTitle(initialData.areaTitle);
      if (initialData.assignedChair) setAssignedChair(initialData.assignedChair);
      if (initialData.triageLevel) setTriageLevel(initialData.triageLevel);
      if (initialData.date) setVisitDate(initialData.date);
      if (initialData.time) setVisitTime(initialData.time);
      if (initialData.chiefComplaint) setChiefComplaint(initialData.chiefComplaint);
      if (initialData.historyOfPresentIllness) setHistoryOfPresentIllness(initialData.historyOfPresentIllness);
      if (initialData.drugAllergies) setDrugAllergies(initialData.drugAllergies);
      if (initialData.hasNoAllergies !== undefined) setHasNoAllergies(initialData.hasNoAllergies);
      if (initialData.medicationsList) setMedicationsList(initialData.medicationsList);
      if (initialData.hasNoMedications !== undefined) setHasNoMedications(initialData.hasNoMedications);
      if (initialData.bleedingTendency) setBleedingTendency(initialData.bleedingTendency);
    }
  }, [initialData]);

  // Days difference from today (0 = today, >0 = future reservation, <0 = past)
  const daysDiff = useMemo(() => {
    return getDaysDiff(visitDate, todayStr);
  }, [visitDate, todayStr]);

  const handleSetQuickDays = (daysToAdd: number) => {
    setVisitDate(addDays(todayStr, daysToAdd));
  };

  const handleSetQuickMonths = (monthsToAdd: number) => {
    setVisitDate(addMonths(todayStr, monthsToAdd));
  };

  // Automatic Age and Gender Calculation from RRN Front (6 digits) & Back First Digit (1 digit)
  useEffect(() => {
    if (rrnFront.length === 6 && rrnBackDigit.length === 1) {
      const yy = parseInt(rrnFront.substring(0, 2), 10);
      const mm = parseInt(rrnFront.substring(2, 4), 10);
      const dd = parseInt(rrnFront.substring(4, 6), 10);
      const code = parseInt(rrnBackDigit, 10);

      if (!isNaN(yy) && !isNaN(mm) && !isNaN(dd) && !isNaN(code)) {
        let birthYear = 1900 + yy;
        if (code === 3 || code === 4 || code === 7 || code === 8) {
          birthYear = 2000 + yy;
        } else if (code === 9 || code === 0) {
          birthYear = 1800 + yy;
        }

        // Gender determination
        if (code === 1 || code === 3 || code === 5 || code === 7) {
          setGender('남');
        } else if (code === 2 || code === 4 || code === 6 || code === 8) {
          setGender('여');
        }

        // Dynamic real-time date base age calculation (Korean International Age)
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1;
        const currentDay = now.getDate();

        let calculatedAge = currentYear - birthYear;
        if (currentMonth < mm || (currentMonth === mm && currentDay < dd)) {
          calculatedAge -= 1;
        }

        if (calculatedAge >= 0 && calculatedAge <= 120) {
          setAge(calculatedAge);
          setAgeCalculatedFeedback(`${birthYear}년생 • 만 ${calculatedAge}세 자동 계산`);
        }
      }
    }
  }, [rrnFront, rrnBackDigit]);

  // Real-time Past Clinical History Lookup
  const historyMatch = useMemo(() => {
    const trimmedName = name.trim();
    if (trimmedName.length < 2 || rrnFront.length < 6) {
      return {
        status: 'idle' as const,
        isReturning: false,
        totalVisits: 0,
        departments: [] as string[],
        recentVisit: null as PastVisitRecord | null,
        matchedPatient: null as QueuePatient | null,
      };
    }

    const dummyTarget: QueuePatient = {
      id: 'kiosk-match-probe',
      patient: {
        name: trimmedName,
        age,
        gender,
        phone,
        patientId: '',
        rrnFront,
      },
      date: getTodayDateString(),
      time: '',
      areaTitle: '',
      locationTitle: '',
      chiefComplaint: '',
      historyOfPresentIllness: '',
      suspectedConditions: [],
      recommendedDepartment: department,
      recommendedRoom: '',
      assignedChair: '',
      triageLevel: '일반',
      status: '진료대기',
      doctorDiagnosisNote: '',
      treatmentPlan: '',
      prescriptions: '',
    };

    const records = getAggregatedPatientHistory(dummyTarget, existingPatients || []);
    const matchedEp = (existingPatients || []).find((ep) =>
      isSamePatient(dummyTarget.patient, ep.patient)
    );

    if (records.length > 0 || matchedEp) {
      const depts = Array.from(
        new Set(records.map((r) => r.department).filter(Boolean))
      );
      if (depts.length === 0 && matchedEp?.recommendedDepartment) {
        depts.push(matchedEp.recommendedDepartment);
      }
      return {
        status: 'returning' as const,
        isReturning: true,
        totalVisits: Math.max(records.length, 1),
        departments: depts.length > 0 ? depts : ['보존과'],
        recentVisit: records[0] || null,
        matchedPatient: matchedEp || null,
      };
    }

    return {
      status: 'new' as const,
      isReturning: false,
      totalVisits: 0,
      departments: [] as string[],
      recentVisit: null,
      matchedPatient: null,
    };
  }, [name, rrnFront, age, gender, department, existingPatients]);

  // Auto-complete previous phone number and auto-link chart number & medical history when returning patient is detected
  const [autoFilledPhoneFor, setAutoFilledPhoneFor] = useState<string>('');
  useEffect(() => {
    if (historyMatch.isReturning && historyMatch.matchedPatient?.patient) {
      const prevPhone = historyMatch.matchedPatient.patient.phone;
      const patientKey = `${historyMatch.matchedPatient.patient.name}_${historyMatch.matchedPatient.patient.patientId || ''}`;
      if (prevPhone && autoFilledPhoneFor !== patientKey) {
        setPhone(prevPhone);
        setAutoFilledPhoneFor(patientKey);
      }

      // Auto-load previous recorded allergies and medications if present
      const mp = historyMatch.matchedPatient;
      if (mp.drugAllergies && mp.drugAllergies.length > 0) {
        setDrugAllergies(mp.drugAllergies);
        setHasNoAllergies(false);
      }
      if (mp.medicationsList && mp.medicationsList.length > 0) {
        setMedicationsList(mp.medicationsList);
        setHasNoMedications(false);
      }
      if (mp.otherAllergyText) setOtherAllergyText(mp.otherAllergyText);
      if (mp.otherMedicationText) setOtherMedicationText(mp.otherMedicationText);
      if (mp.bleedingTendency) setBleedingTendency(mp.bleedingTendency);
    }
  }, [historyMatch.isReturning, historyMatch.matchedPatient, autoFilledPhoneFor]);

  // Quick helper to load an authentic returning patient from hospital DB for testing
  const handleLoadSampleReturningPatient = () => {
    if (!existingPatients || existingPatients.length === 0) return;
    const sample = existingPatients.find(
      (p) => p.patient?.name && p.patient?.rrnFront && p.patient?.phone
    );
    if (sample?.patient) {
      setName(sample.patient.name);
      if (sample.patient.rrnFront) setRrnFront(sample.patient.rrnFront);
      if (sample.patient.gender) {
        setGender(sample.patient.gender);
        setRrnBackDigit(sample.patient.gender === '남' ? '1' : '2');
      }
      if (sample.patient.age) setAge(sample.patient.age);
      if (sample.patient.phone) setPhone(sample.patient.phone);

      if (sample.drugAllergies && sample.drugAllergies.length > 0) {
        setDrugAllergies(sample.drugAllergies);
        setHasNoAllergies(false);
      }
      if (sample.medicationsList && sample.medicationsList.length > 0) {
        setMedicationsList(sample.medicationsList);
        setHasNoMedications(false);
      }
      if (sample.otherAllergyText) setOtherAllergyText(sample.otherAllergyText);
      if (sample.otherMedicationText) setOtherMedicationText(sample.otherMedicationText);
      if (sample.bleedingTendency) setBleedingTendency(sample.bleedingTendency);
    }
  };

  // Handler for Interactive Mouth Map selection
  const handleSelectDentalArea = (selection: DentalAreaSelection) => {
    setAreaTitle(selection.name);
    setDepartment(selection.dept);
    setRecommendedRoom(selection.room);
  };

  // Quick Preset Selection
  const applyPreset = (preset: (typeof PRESET_CC_OPTIONS)[0]) => {
    setAreaTitle(preset.area);
    setDepartment(preset.dept);
    setChiefComplaint(preset.cc);
    setHistoryOfPresentIllness(preset.hx);
    setRecommendedRoom(preset.room);
    setAssignedChair(preset.chair);
    setTriageLevel(preset.level);

    if (preset.drugAllergies) setDrugAllergies(preset.drugAllergies);
    setHasNoAllergies(preset.hasNoAllergies ?? (preset.drugAllergies?.length === 0));
    if (preset.medicationsList) setMedicationsList(preset.medicationsList);
    setHasNoMedications(preset.hasNoMedications ?? (preset.medicationsList?.length === 0));
    setOtherAllergyText(preset.otherAllergyText || '');
    setOtherMedicationText(preset.otherMedicationText || '');
    if (preset.bleedingTendency) setBleedingTendency(preset.bleedingTendency);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      const timeStr = getNowTimeString();
      const todayStr = getTodayDateString();

      // Determine next sequential hospital registration ID (e.g., DEN-2026-02501)
      let nextSeq = 1;
      if (existingPatients && existingPatients.length > 0) {
        for (const ep of existingPatients) {
          const pid = ep.patient?.patientId || '';
          // Match standard DEN-2026-XXXXX or legacy DEN-MMDD-XXX
          const matchStandard = pid.match(/^DEN-2026-(\d+)$/);
          if (matchStandard) {
            const seq = parseInt(matchStandard[1], 10);
            if (seq >= nextSeq) nextSeq = seq + 1;
          } else {
            const matchLegacy = pid.match(/^DEN-\d+-(\d+)$/);
            if (matchLegacy) {
              const seq = parseInt(matchLegacy[1], 10);
              if (seq >= nextSeq) nextSeq = seq + 1;
            }
          }
        }
      }

      // Re-use existing hospital registration ID if returning patient, or create new unified sequential ID
      let patientId = `DEN-2026-${String(nextSeq).padStart(5, '0')}`;
      if (historyMatch.isReturning && historyMatch.matchedPatient?.patient?.patientId) {
        patientId = historyMatch.matchedPatient.patient.patientId;
      }

      // Construct clinical red flags and alerts for doctor
      const medicalAlerts: string[] = [];
      const redFlags: string[] = [];

      // Drug allergies processing
      drugAllergies.forEach((al) => {
        medicalAlerts.push(`알러지:${al}`);
        if (al.includes('리도카인') || al.includes('국소마취제')) {
          redFlags.push(
            '🚨 [치과 국소마취제(리도카인) 이상반응] 과거 치과 마취 주사 후 극심한 어지러움, 혈압 급변, 심계항진, 실신 경험. 혈관수축제(에피네프린) 무첨가 Mepivacaine 검토 및 천천히 소량 주입, V/S 모니터링.'
          );
        } else if (al.includes('페니실린') || al.includes('세파')) {
          redFlags.push(
            '🚨 [페니실린/세파계 항생제 알러지] 아목시실린 등 베타락탐계 항생제 투여 금기. 마크로라이드계(클라리스로마이신) 또는 린코사마이드계(클린다마이신) 대체 처방 검토.'
          );
        } else if (al.includes('진통제') || al.includes('NSAID') || al.includes('아스피린')) {
          redFlags.push(
            '🚨 [소염진통제(NSAIDs/아스피린) 알러지/과민반응] 이부프로펜/덱시부프로펜 계열 천식 및 혈관부종 유발 주의. 아세트아미노펜(타이레놀) 단일제제 처방 검토.'
          );
        } else {
          redFlags.push(`⚠️ [약물 알러지 주의: ${al}] 처방 및 주사 전 성분 확인 필수.`);
        }
      });

      if (otherAllergyText.trim()) {
        medicalAlerts.push(`알러지:${otherAllergyText.trim()}`);
        redFlags.push(`⚠️ [환자 기재 기타 알러지] ${otherAllergyText.trim()} 확인 요망.`);
      }

      // Medications processing
      medicationsList.forEach((med) => {
        medicalAlerts.push(med);
        if (med.includes('항응고제') || med.includes('아스피린') || med.includes('출혈')) {
          redFlags.push(
            '⚠️ [항응고제/항혈소판제 복용] 발치 및 치주수술 등 관혈적 처치 시 출혈 지연 주의. 주치의 협진 및 국소 지혈제재(거즈 압박, 젤폼, 봉합) 철저 대비.'
          );
        } else if (med.includes('골다공증') || med.includes('MRONJ') || med.includes('비스포스포네이트')) {
          redFlags.push(
            '🚨 [골다공증 약물 관련 악골괴사증(MRONJ) 주의] 비스포스포네이트 또는 데노수맙 복용력. 침습적 외과 치료(발치/임플란트) 전 투약 기간 확인 및 비침습적 보존 치료 우선 검토.'
          );
        } else if (med.includes('신장질환') || med.includes('혈액투석')) {
          redFlags.push(
            '⚠️ [신장질환 및 혈액투석 환자] 투석 당일에는 헤파린 투여로 출혈 위험(투석 다음 날 치과 치료 권장). 신장 배설 약물(진통제/항생제) 용량 감량.'
          );
        } else if (med.includes('스테로이드') || med.includes('면역억제제')) {
          redFlags.push(
            '⚠️ [면역 저하 및 부신 위기 주의] 장기 스테로이드 또는 면역억제제 복용 환자. 스트레스성 부신 기능 저하 및 술후 감염 취약. 예방적 항생제 및 수술 스트레스 완화 프로토콜.'
          );
        } else if (med.includes('당뇨')) {
          redFlags.push(
            '⚠️ [당뇨병 기저질환] 공복 내원 시 저혈당 쇼크 주의. 아침 식사 및 당뇨약 복용 여부 확인, 술후 감염 및 치유 지연 모니터링.'
          );
        } else if (med.includes('고혈압') || med.includes('심혈관')) {
          redFlags.push(
            '⚠️ [고혈압 및 심혈관 질환] 진료 전 혈압 측정 필수. 국소마취제 혈관수축제(에피네프린) 과량 주입 주의 (1:100,000 기준 최대 2앰플 이내 제한).'
          );
        }
      });

      if (otherMedicationText.trim()) {
        medicalAlerts.push(otherMedicationText.trim());
        redFlags.push(`💊 [기타 복용 약물 자필 보고] 환자 기재: "${otherMedicationText.trim()}". 상호작용 검토 요망.`);
      }

      const medicationsSummary =
        medicationsList.length > 0 || otherMedicationText.trim()
          ? [...medicationsList, otherMedicationText.trim()].filter(Boolean).join(', ')
          : hasNoMedications
          ? '복용 약물 없음'
          : '미기재';

      const allergiesSummary =
        drugAllergies.length > 0 || otherAllergyText.trim()
          ? [...drugAllergies, otherAllergyText.trim()].filter(Boolean).join(', ')
          : hasNoAllergies
          ? '특이 알러지 없음'
          : '미기재';

      await onSubmit({
        patient: {
          name,
          age,
          gender,
          phone,
          patientId,
          rrnFront,
        },
        date: visitDate || todayStr, // Selected Date (Today or Scheduled Future Date)
        time: visitTime || timeStr, // Selected Time
        areaTitle,
        locationTitle: `본관 ${department} 진료센터`,
        chiefComplaint,
        historyOfPresentIllness,
        // Desk/Nurse reception: differential diagnosis is left for the dentist EMR chart
        suspectedConditions: [],
        recommendedDepartment: department,
        recommendedRoom,
        assignedChair,
        triageLevel,
        status: '진료대기',
        doctorDiagnosisNote: '',
        treatmentPlan: '',
        prescriptions: '',
        // Full clinical safety payload unified with Kiosk and EMR
        drugAllergies,
        hasNoAllergies,
        otherAllergyText,
        medicationsList,
        hasNoMedications,
        otherMedicationText,
        bleedingTendency,
        medicalAlerts,
        redFlags,
        medications: medicationsSummary,
        allergies: allergiesSummary,
      });
      onClose();
    } catch (err) {
      console.error('Kiosk submit error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header: Designed specifically for Desk Staff / Reception Nurses */}
        <div className="bg-slate-50 px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-teal-50 text-teal-600 border border-teal-200">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">
                  신규 환자 접수
                </h2>
                <span className="text-[11px] px-2 py-0.5 rounded-full font-bold bg-teal-50 text-teal-700 border border-teal-200">
                  원무 접수 · 의사 차트 실시간 연동
                </span>
              </div>
              <p className="text-xs text-slate-500">
                인적사항, 구강 호소 부위 및 약물 알러지·복용약을 입력하면 의사 진료차트에 안전 경고가 즉시 등록됩니다.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1 bg-white">
          {/* 1. Quick Presets for Fast Registration */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div className="flex items-center gap-1.5 text-xs font-bold text-teal-800 mb-1.5">
              <Sparkles className="w-3.5 h-3.5 text-teal-600" />
              <span>원클릭 다빈도 접수 프리셋 (빠른 입력):</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_CC_OPTIONS.map((p, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => applyPreset(p)}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium bg-white hover:bg-teal-50 hover:text-teal-800 text-slate-700 border border-slate-200 transition-colors cursor-pointer shadow-2xs"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* 2. 내원/진료 일시 지정 (당일 접수 또는 외래 예약) */}
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-teal-600" />
                <span>진료 / 내원 일시 지정 (당일 접수 또는 외래 예약)</span>
              </span>
              {daysDiff === 0 ? (
                <span className="text-[11px] px-2.5 py-0.5 rounded-full font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  ⚡ 당일 즉시 접수 (오늘 {visitDate})
                </span>
              ) : daysDiff > 0 ? (
                <span className="text-[11px] px-2.5 py-0.5 rounded-full font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1">
                  📅 D-{daysDiff}일 뒤 외래 예약 ({visitDate} {getKoreanDayOfWeek(visitDate)}요일)
                </span>
              ) : (
                <span className="text-[11px] px-2.5 py-0.5 rounded-full font-bold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                  🕒 과거 기록 등록 ({Math.abs(daysDiff)}일 전)
                </span>
              )}
            </div>

            {/* Quick Date Presets */}
            <div>
              <div className="text-[11px] font-bold text-slate-600 mb-1.5 flex items-center justify-between">
                <span>빠른 일자 지정 프리셋:</span>
                <span className="text-[10px] text-slate-400 font-normal">
                  오늘 당일 진료 혹은 1주일~한달 뒤 외래 예약 바로가기
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => handleSetQuickDays(0)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    daysDiff === 0
                      ? 'bg-teal-600 text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  ⚡ 오늘 (당일 접수)
                </button>
                <button
                  type="button"
                  onClick={() => handleSetQuickDays(1)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    daysDiff === 1
                      ? 'bg-teal-600 text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  내일 (+1일)
                </button>
                <button
                  type="button"
                  onClick={() => handleSetQuickDays(7)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    daysDiff === 7
                      ? 'bg-teal-600 text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  1주일 뒤 (+7일)
                </button>
                <button
                  type="button"
                  onClick={() => handleSetQuickDays(14)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    daysDiff === 14
                      ? 'bg-teal-600 text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  2주일 뒤 (+14일)
                </button>
                <button
                  type="button"
                  onClick={() => handleSetQuickMonths(1)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    visitDate === addMonths(todayStr, 1)
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200'
                  }`}
                >
                  📅 1개월 뒤 (한달 뒤 외래)
                </button>
                <button
                  type="button"
                  onClick={() => handleSetQuickMonths(3)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    visitDate === addMonths(todayStr, 3)
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  3개월 뒤 (정기검진)
                </button>
                <button
                  type="button"
                  onClick={() => handleSetQuickMonths(6)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    visitDate === addMonths(todayStr, 6)
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  6개월 뒤 (스케일링/유지)
                </button>
              </div>
            </div>

            {/* Date & Time Picker Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-1">
              {/* Date Input */}
              <div className="sm:col-span-6">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  내원 / 예약 일자 *
                </label>
                <div className="relative">
                  <input
                    type="date"
                    required
                    value={visitDate}
                    onChange={(e) => setVisitDate(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 font-mono font-bold focus:outline-none focus:border-teal-500 cursor-pointer shadow-2xs"
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-slate-500 font-semibold pointer-events-none">
                    {getKoreanDayOfWeek(visitDate)}요일
                  </span>
                </div>
              </div>

              {/* Time Input & Quick chips */}
              <div className="sm:col-span-6">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">
                    진료 / 예약 시간 *
                  </label>
                  <button
                    type="button"
                    onClick={() => setVisitTime(getNowTimeString())}
                    className="text-[10px] text-teal-700 hover:text-teal-800 font-bold hover:underline cursor-pointer"
                  >
                    현재 시각으로 ({getNowTimeString()})
                  </button>
                </div>
                <div className="flex gap-1.5">
                  <input
                    type="time"
                    required
                    value={visitTime}
                    onChange={(e) => setVisitTime(e.target.value)}
                    className="w-28 bg-white border border-slate-300 rounded-lg px-2.5 py-2 text-xs text-slate-900 font-mono font-bold focus:outline-none focus:border-teal-500 cursor-pointer shadow-2xs"
                  />
                  <div className="flex-1 flex flex-wrap gap-1 items-center">
                    {['09:30', '10:30', '11:30', '14:00', '15:30', '16:30'].map((timeSlot) => (
                      <button
                        key={timeSlot}
                        type="button"
                        onClick={() => setVisitTime(timeSlot)}
                        className={`px-2 py-1 rounded text-[11px] font-mono font-bold cursor-pointer transition-colors ${
                          visitTime === timeSlot
                            ? 'bg-teal-700 text-white'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                      >
                        {timeSlot}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Informational Guidance */}
            {daysDiff > 0 && (
              <div className="p-2.5 rounded-lg bg-indigo-50/70 border border-indigo-200 text-xs text-indigo-950 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>
                  <strong>외래 예약 안내:</strong> {visitDate} ({getKoreanDayOfWeek(visitDate)}요일) {visitTime}에 내원 예정으로 등록되며, 캘린더 및 해당 일자의 진료실 워크스테이션에 예약 환자로 자동 편성됩니다.
                </span>
              </div>
            )}
          </div>

          {/* 3. Patient Demographics & SSN with Auto Age/Gender Calculation */}
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Calculator className="w-4 h-4 text-teal-600" />
                <span>환자 기본 인적사항 & 주민번호 자동 연산</span>
              </span>
              <span className="text-[11px] text-teal-700 font-semibold bg-teal-50 px-2 py-0.5 rounded-full border border-teal-100">
                {ageCalculatedFeedback}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              {/* Name */}
              <div className="sm:col-span-4">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  환자 성명 *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="예: 홍길동"
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 font-semibold focus:outline-none focus:border-teal-500"
                />
              </div>

              {/* SSN Input (Front 6 digits - Back 1st digit) */}
              <div className="sm:col-span-5">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  주민등록번호 (뒷자리 첫번호까지) *
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    maxLength={6}
                    required
                    value={rrnFront}
                    onChange={(e) => setRrnFront(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="생년월일 6자리"
                    className="w-28 bg-white border border-slate-300 rounded-lg px-2.5 py-2 text-xs text-slate-900 font-mono text-center font-bold focus:outline-none focus:border-teal-500"
                  />
                  <span className="text-slate-400 font-bold">-</span>
                  <input
                    type="text"
                    maxLength={1}
                    required
                    value={rrnBackDigit}
                    onChange={(e) => setRrnBackDigit(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="1"
                    className="w-9 bg-white border border-slate-300 rounded-lg px-2 py-2 text-xs text-slate-900 font-mono text-center font-bold focus:outline-none focus:border-teal-500"
                  />
                  <span className="text-xs font-mono text-slate-400 tracking-widest pl-1">
                    ******
                  </span>
                </div>
              </div>

              {/* Age (Auto-calculated, manually editable) */}
              <div className="sm:col-span-3">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  만 나이 (자동 산출)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    max={120}
                    value={age}
                    onChange={(e) => setAge(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 font-bold focus:outline-none focus:border-teal-500"
                  />
                  <span className="absolute right-3 top-2 text-xs text-slate-400">세</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {/* Gender (Auto set from SSN, manually toggleable) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  성별 (주민번호 뒷자리 연동)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setGender('남')}
                    className={`py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                      gender === '남'
                        ? 'bg-sky-600 text-white border-sky-700'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    남성 (1, 3)
                  </button>
                  <button
                    type="button"
                    onClick={() => setGender('여')}
                    className={`py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                      gender === '여'
                        ? 'bg-rose-600 text-white border-rose-700'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    여성 (2, 4)
                  </button>
                </div>
              </div>

              {/* Phone */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  환자 휴대전화 연락처 *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="010-0000-0000"
                    className="w-full bg-white border border-slate-300 rounded-lg pl-8 pr-3 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:border-teal-500"
                  />
                  <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                </div>
              </div>
            </div>
          </div>

          {/* 3. Real-time Past History Lookup Panel (실시간 과거 진료 이력 조회) */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 shadow-2xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <div className="flex items-center gap-1.5">
                <History className="w-4 h-4 text-teal-600" />
                <span className="text-xs font-bold text-slate-800">
                  실시간 과거 진료 이력 조회 (원무 DB 자동 연동)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleLoadSampleReturningPatient}
                  className="text-[10px] text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 px-2 py-0.5 rounded-md font-semibold transition-colors cursor-pointer"
                >
                  재진 환자 자동 불러오기 테스트
                </button>
                <span className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  실시간 연동중
                </span>
              </div>
            </div>

            {historyMatch.status === 'returning' ? (
              <div className="space-y-2.5">
                {/* Returning Patient Badge (재진 환자 배지) */}
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-teal-50 border border-teal-300 text-teal-900 font-bold text-xs shadow-2xs">
                  <UserCheck className="w-4 h-4 text-teal-600 shrink-0" />
                  <span>
                    오즈치과병원 기존 내원 환자입니다 (과거 {historyMatch.totalVisits}회 방문: {historyMatch.departments.join(', ')})
                  </span>
                </div>

                {/* Details: Recent Date, Primary Diagnosis, Previous ID, Phone */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-lg bg-white border border-slate-200 flex flex-col justify-between">
                    <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-400" /> 최근 진료일자
                    </span>
                    <span className="text-xs font-bold text-slate-800 mt-1">
                      {historyMatch.recentVisit?.date || historyMatch.matchedPatient?.date || '기록 확인됨'}
                      {historyMatch.recentVisit?.department && (
                        <span className="ml-1.5 font-semibold text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded text-[10px] border border-teal-200">
                          {historyMatch.recentVisit.department}
                        </span>
                      )}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-white border border-slate-200 flex flex-col justify-between">
                    <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1">
                      <FileSpreadsheet className="w-3 h-3 text-slate-400" /> 최근 주 진단명
                    </span>
                    <span
                      className="text-xs font-bold text-slate-800 mt-1 truncate"
                      title={
                        historyMatch.recentVisit?.diagnosis ||
                        historyMatch.recentVisit?.areaTitle ||
                        historyMatch.matchedPatient?.areaTitle ||
                        '치과 임상 진료'
                      }
                    >
                      {historyMatch.recentVisit?.diagnosis ||
                        historyMatch.recentVisit?.areaTitle ||
                        historyMatch.matchedPatient?.areaTitle ||
                        '치과 임상 진료'}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-white border border-slate-200 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-medium text-slate-500 block">이전 등록번호</span>
                      <span className="text-xs font-mono font-bold text-slate-800">
                        {historyMatch.matchedPatient?.patient?.patientId || '기존 차트 연동'}
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-teal-700 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-full">
                      차트번호 자동 연동
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-white border border-slate-200 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-medium text-slate-500 block">이전 등록 연락처</span>
                      <span className="text-xs font-mono font-bold text-slate-800">
                        {phone}
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                      전화번호 자동 완성
                    </span>
                  </div>
                </div>
              </div>
            ) : historyMatch.status === 'new' ? (
              <div className="space-y-2">
                {/* New Patient Badge (신규 초진 배지) */}
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-sky-50 border border-sky-200 text-sky-900 font-bold text-xs shadow-2xs">
                  <UserPlus className="w-4 h-4 text-sky-600 shrink-0" />
                  <span>병원 첫 방문(신규 초진) 환자</span>
                </div>
                <p className="text-[11px] text-slate-500 px-1">
                  과거 오즈치과병원 내원 기록이 확인되지 않은 신규 환자입니다. 접수 완료 시 고유 신규 등록번호가 발급됩니다.
                </p>
              </div>
            ) : (
              <div className="py-2.5 px-2 text-slate-500 text-xs flex items-center gap-2 bg-white rounded-lg border border-dashed border-slate-300">
                <Search className="w-4 h-4 text-slate-400 shrink-0" />
                <span>성명과 주민등록번호 6자리를 입력하시면 병원 내원 이력을 실시간으로 자동 조회합니다.</span>
              </div>
            )}
          </div>

          {/* 4. Interactive Mouth & Teeth Map (환자가 통증을 호소하는 입안 부위 원클릭 자동 입력) */}
          <DentalMouthMap
            selectedArea={areaTitle}
            onSelect={handleSelectDentalArea}
          />

          {/* 4. Oral Area, Department, Room, and Chair Assignment */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            {/* Selected Oral Area (Auto-filled by Mouth Map or manually typed) */}
            <div className="sm:col-span-6">
              <label className="block text-xs font-bold text-amber-900 mb-1 flex items-center justify-between">
                <span>호소 부위 (입안 그림 클릭 시 자동 입력) *</span>
                <span className="text-[10px] text-amber-700 font-normal">직접 수정 가능</span>
              </label>
              <input
                type="text"
                required
                value={areaTitle}
                onChange={(e) => setAreaTitle(e.target.value)}
                placeholder="예: 상악 우측 제1대구치 (#16)"
                className="w-full bg-amber-50/60 border border-amber-300 rounded-lg px-3 py-2 text-xs text-amber-900 font-bold focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Department */}
            <div className="sm:col-span-6">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                추천 전문 분과
              </label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value as DentalDepartment)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-teal-800 font-bold focus:outline-none focus:border-teal-500 cursor-pointer"
              >
                <option value="보존과">보존과 (충치, 신경치료, 레진)</option>
                <option value="치주과">치주과 (잇몸출혈, 풍치, 스케일링)</option>
                <option value="보철과">보철과 (크라운, 브릿지, 틀니)</option>
                <option value="구강외과">구강외과 (사랑니, 외과발치, 낭종)</option>
                <option value="구강내과">구강내과 (턱관절, 구내염, 이갈이)</option>
              </select>
            </div>

            {/* Assigned Room: DROPDOWN as requested */}
            <div className="sm:col-span-4">
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-teal-600" />
                <span>배정 진료실 (드롭다운) *</span>
              </label>
              <select
                value={recommendedRoom}
                onChange={(e) => setRecommendedRoom(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 font-bold focus:outline-none focus:border-teal-500 cursor-pointer"
              >
                {CLINICAL_ROOM_OPTIONS.map((room) => (
                  <option key={room} value={room}>
                    {room}
                  </option>
                ))}
              </select>
            </div>

            {/* Assigned Chair */}
            <div className="sm:col-span-4">
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Armchair className="w-3.5 h-3.5 text-teal-600" />
                <span>지정 체어</span>
              </label>
              <select
                value={assignedChair}
                onChange={(e) => setAssignedChair(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-teal-500 cursor-pointer"
              >
                {CHAIR_OPTIONS.map((chair) => (
                  <option key={chair} value={chair}>
                    {chair}
                  </option>
                ))}
              </select>
            </div>

            {/* Triage Level */}
            <div className="sm:col-span-4">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                접수 트리아지 등급
              </label>
              <select
                value={triageLevel}
                onChange={(e) => setTriageLevel(e.target.value as TriageLevel)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 font-bold focus:outline-none focus:border-teal-500 cursor-pointer"
              >
                <option value="응급">응급 (심한 통증, 안면부종, 개구장애, 지속 출혈)</option>
                <option value="준응급">준응급 (중등도 통증, 찬물 시림, 잇몸 출혈, 보철 탈락)</option>
                <option value="일반">일반 (정기검진, 스케일링, 경미한 불편감)</option>
              </select>
            </div>
          </div>

          {/* 5. Patient Chief Complaint (C.C) & History of Illness (Hx) */}
          <div className="bg-amber-50/30 rounded-xl p-4 border border-amber-200 shadow-2xs space-y-3.5">
            <div className="flex items-center justify-between border-b border-amber-200/60 pb-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-950">
                <FileText className="w-4 h-4 text-amber-600" />
                <span>환자 주소 (C.C) 및 현병력 (Hx) 상세 문진</span>
              </div>
              <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                원무/키오스크 접수 필수 문진
              </span>
            </div>

            {/* 5-1. Chief Complaint (C.C) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-800">
                  주소 (Chief Complaint - 환자가 직접 말한 가장 불편한 내원 사유) *
                </label>
                <span className="text-[11px] text-amber-800 font-semibold">
                  부위: {areaTitle}
                </span>
              </div>
              <textarea
                rows={2}
                required
                value={chiefComplaint}
                onChange={(e) => setChiefComplaint(e.target.value)}
                placeholder="환자가 호소하는 주된 증상을 입력하세요..."
                className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 focus:outline-none focus:border-teal-500 leading-relaxed font-medium"
              />

              {/* Quick Suggestion Chips for Chief Complaint */}
              <div className="flex items-center gap-1 flex-wrap pt-0.5">
                <span className="text-[10px] font-bold text-slate-500 mr-1">자주 쓰는 호소 증상:</span>
                {[
                  '찬물 마실 때 찌릿하게 시림',
                  '음식 씹을 때 욱신거리는 통증',
                  '양치할 때 잇몸 출혈',
                  '기존 보철물 탈락',
                  '사랑니 잇몸 붓고 아픔',
                  '정기 구강검진 및 스케일링',
                  '[NHS MCM 위험 등급] 🔴 고위험군 (HIGH RISK)',
                ].map((symptom) => {
                  const isMcm = symptom.includes('NHS MCM');
                  return (
                    <button
                      key={symptom}
                      type="button"
                      onClick={() => {
                        if (!chiefComplaint || chiefComplaint.includes('찬물 마실 때 찌릿하게 시리고 밤에 욱신거려요')) {
                          setChiefComplaint(symptom);
                        } else if (!chiefComplaint.includes(symptom)) {
                          setChiefComplaint(`${chiefComplaint}. ${symptom}`);
                        }
                      }}
                      className={`text-[10px] px-2 py-0.5 rounded-md border transition-colors cursor-pointer ${
                        isMcm
                          ? 'bg-rose-50 border-rose-300 text-rose-800 font-bold hover:bg-rose-100'
                          : 'bg-white border-amber-200 text-amber-900 hover:bg-amber-100 hover:border-amber-300'
                      }`}
                    >
                      + {symptom}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 5-2. History of Present Illness (Hx) */}
            <div className="space-y-1.5 pt-2 border-t border-amber-200/50">
              <div className="flex items-center justify-between flex-wrap gap-1">
                <label className="block text-xs font-bold text-slate-800">
                  현병력 및 임상 경과 (History of Present Illness - Hx)
                </label>
                <span className="text-[10px] text-slate-500">
                  ※ 연조직·삼킴타액·보철이력·전신질환종양학 및 발병 경과 기재
                </span>
              </div>
              <input
                type="text"
                value={historyOfPresentIllness}
                onChange={(e) => setHistoryOfPresentIllness(e.target.value)}
                placeholder="예: 3일 전 급성 발병. [연조직 및 점막 소견] 궤양. [삼킴 및 타액 상태] 구강건조."
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-teal-500 font-medium"
              />

              {/* Quick Suggestion Chips for Hx (Doctor Essential: Timeline, Provocation, Clinical course) */}
              <div className="flex items-center gap-1 flex-wrap pt-0.5">
                <span className="text-[10px] font-bold text-slate-500 mr-1">발병 경과 및 특수 소견 (Hx):</span>
                {[
                  '3일 전 급성 발병',
                  '자극 후 10초 이상 통증 잔존',
                  '야간 수면 시 자발통 동반',
                  '음식물 저작 시 교합통',
                  '[연조직 및 점막 소견] 점막 궤양 및 발적',
                  '[삼킴 및 타액 상태] 구강건조 및 삼킴통',
                  '[치과 보철 이력] 기존 보철물 탈락',
                  '[전신질환 및 종양학] 항암/방사선 치료 기왕력',
                ].map((prog) => {
                  const isSpecialHx = prog.startsWith('[');
                  return (
                    <button
                      key={prog}
                      type="button"
                      onClick={() => {
                        if (
                          !historyOfPresentIllness ||
                          historyOfPresentIllness.includes('3일 전 급성 발병. 냉자극 10초')
                        ) {
                          setHistoryOfPresentIllness(prog);
                        } else if (!historyOfPresentIllness.includes(prog)) {
                          setHistoryOfPresentIllness(`${historyOfPresentIllness}. ${prog}`);
                        }
                      }}
                      className={`text-[10px] px-2 py-0.5 rounded-md border transition-colors cursor-pointer ${
                        isSpecialHx
                          ? 'bg-sky-50 border-sky-300 text-sky-900 font-semibold hover:bg-sky-100'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      + {prog}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 6. Patient Drug Allergies, Medications & Systemic Conditions (현병력 밑에 독립 분리된 전용 박스) */}
          <div className="bg-rose-50/40 rounded-xl p-4 border border-rose-200 shadow-2xs space-y-3.5">
            <div className="flex items-center justify-between border-b border-rose-100 pb-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-rose-900">
                <ShieldAlert className="w-4 h-4 text-rose-600" />
                <span>복용 약물 및 환자 안전 정밀 문진 (진료실 전달 필수)</span>
              </div>
              <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full">
                진료실 및 차트 빨간색 경고 배너 실시간 연동
              </span>
            </div>

            {/* 6-1. Drug & Injection Allergies */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-rose-600" />
                  <span>약물 / 국소마취제 / 항생제 알러지</span>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const next = !hasNoAllergies;
                    setHasNoAllergies(next);
                    if (next) {
                      setDrugAllergies([]);
                      setOtherAllergyText('');
                    }
                  }}
                  className={`text-[11px] px-2.5 py-0.5 rounded-md font-bold transition-colors cursor-pointer border ${
                    hasNoAllergies
                      ? 'bg-emerald-600 text-white border-emerald-700'
                      : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  ✓ 특이 약물 알러지 없음
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-1.5">
                {COMMON_DRUG_ALLERGIES.map((allergy) => {
                  const isSelected = drugAllergies.includes(allergy);
                  return (
                    <button
                      key={allergy}
                      type="button"
                      disabled={hasNoAllergies}
                      onClick={() => {
                        if (isSelected) {
                          setDrugAllergies(drugAllergies.filter((a) => a !== allergy));
                        } else {
                          setDrugAllergies([...drugAllergies, allergy]);
                          setHasNoAllergies(false);
                        }
                      }}
                      className={`text-left px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-rose-600 text-white border-rose-700 shadow-2xs font-bold'
                          : hasNoAllergies
                          ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-rose-50 hover:border-rose-300'
                      }`}
                    >
                      {isSelected ? '🚨 ' : '▫️ '}
                      {allergy}
                    </button>
                  );
                })}
              </div>

              {/* Other Allergy Manual Input */}
              <div className="pt-1">
                <input
                  type="text"
                  disabled={hasNoAllergies}
                  value={otherAllergyText}
                  onChange={(e) => {
                    setOtherAllergyText(e.target.value);
                    if (e.target.value) setHasNoAllergies(false);
                  }}
                  placeholder="기타 알러지 직접 입력 (예: 설파제, 요오드, 라텍스 등)..."
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-rose-500 disabled:bg-slate-100 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            {/* 6-2. Current Medications & Chronic Conditions */}
            <div className="space-y-2 pt-2 border-t border-rose-100">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-600" />
                  <span>현재 복용 중인 약물 및 전신 기저질환 (출혈/골괴사 위험)</span>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const next = !hasNoMedications;
                    setHasNoMedications(next);
                    if (next) {
                      setMedicationsList([]);
                      setOtherMedicationText('');
                    }
                  }}
                  className={`text-[11px] px-2.5 py-0.5 rounded-md font-bold transition-colors cursor-pointer border ${
                    hasNoMedications
                      ? 'bg-emerald-600 text-white border-emerald-700'
                      : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  ✓ 복용 중인 약물 없음
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-1.5">
                {COMMON_MEDICATIONS.map((med) => {
                  const isSelected = medicationsList.includes(med);
                  return (
                    <button
                      key={med}
                      type="button"
                      disabled={hasNoMedications}
                      onClick={() => {
                        if (isSelected) {
                          setMedicationsList(medicationsList.filter((m) => m !== med));
                        } else {
                          setMedicationsList([...medicationsList, med]);
                          setHasNoMedications(false);
                        }
                      }}
                      className={`text-left px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-2xs font-bold'
                          : hasNoMedications
                          ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-amber-50 hover:border-amber-300'
                      }`}
                    >
                      {isSelected ? '💊 ' : '▫️ '}
                      {med}
                    </button>
                  );
                })}
              </div>

              {/* Other Medication Manual Input */}
              <div className="pt-1">
                <input
                  type="text"
                  disabled={hasNoMedications}
                  value={otherMedicationText}
                  onChange={(e) => {
                    setOtherMedicationText(e.target.value);
                    if (e.target.value) setHasNoMedications(false);
                  }}
                  placeholder="환자 자필 기재 기타 복용약 (예: 우울증약, 혈압약, 갑상선약 등)..."
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-500 disabled:bg-slate-100 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            {/* 6-3. Bleeding Tendency */}
            <div className="pt-2 border-t border-rose-100 flex items-center justify-between flex-wrap gap-2 text-xs">
              <label className="font-bold text-slate-800 flex items-center gap-1">
                <HeartPulse className="w-3.5 h-3.5 text-rose-600" />
                <span>출혈 성향 (지혈 반응):</span>
              </label>
              <div className="flex items-center gap-1.5">
                {(['없음 (정상 지혈)', '경미 (잇몸 출혈 잦음)', '지혈 지연 (항응고제 복용 / 위험)'] as const).map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setBleedingTendency(opt)}
                    className={`px-2.5 py-1 rounded-md font-semibold text-xs border transition-colors cursor-pointer ${
                      bleedingTendency === opt
                        ? opt.includes('지연')
                          ? 'bg-rose-600 text-white border-rose-700'
                          : 'bg-teal-600 text-white border-teal-700'
                        : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Notice: Diagnosis note is handled by dentist */}
          <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-500 flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-teal-600 shrink-0" />
            <span>
              원무/데스크 접수 완료 시 대기열에 실시간 등록되며, 전문 감별진단 및 치료계획은 진료실 치과의사가 진료차트에서 직접 기록합니다.
            </span>
          </div>

          {/* Bottom Actions */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
            >
              닫기
            </button>
            <button
              id="btn-submit-kiosk-reception"
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-6 py-2.5 text-xs font-bold rounded-xl bg-teal-600 hover:bg-teal-700 text-white transition-all shadow-md shadow-teal-600/20 disabled:opacity-50 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {isSubmitting
                  ? '처리 중...'
                  : daysDiff === 0
                  ? '환자 접수 완료 (당일 대기열 즉시 등록)'
                  : daysDiff > 0
                  ? `${visitDate} 외래 예약 등록 완료 (D-${daysDiff}일)`
                  : `${visitDate} 과거 진료기록 등록 완료`}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
