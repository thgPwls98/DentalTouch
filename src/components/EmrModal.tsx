import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Save,
  Printer,
  Volume2,
  Stethoscope,
  Clock,
  Phone,
  FileText,
  Pill,
  Sparkles,
  Check,
  History,
  Database,
  ChevronDown,
  ChevronUp,
  Copy,
  Calendar,
  Lock,
  ShieldAlert,
} from 'lucide-react';
import { QueuePatient, PatientStatus, DentalDepartment, PastVisitRecord, UserAccount } from '../types';
import { callPatientSmart } from '../utils/audioChime';
import { getAggregatedPatientHistory, getPatientConsultationStats } from '../utils/patientHistory';
import { addMonths, getTodayDateString } from '../utils/dateUtils';
import { ClinicalQuestionnaireView } from './ClinicalQuestionnaireView';

interface EmrModalProps {
  patient: QueuePatient | null;
  allPatients?: QueuePatient[];
  isOpen: boolean;
  onClose: () => void;
  currentUser?: UserAccount | null;
  onSaveChart: (
    patientId: string,
    updates: {
      doctorDiagnosisNote: string;
      treatmentPlan: string;
      prescriptions: string;
      status: PatientStatus;
      assignedChair: string;
    }
  ) => Promise<void>;
  onPrint: (patient: QueuePatient) => void;
  onOpenKiosk?: (initialData?: Partial<QueuePatient> | null) => void;
}

// Medical Clinical Quick Templates
const QUICK_TEMPLATES = [
  {
    title: '치수염 근관치료(1차)',
    dept: '보존과',
    note: '치수강 개방 시 심한 출혈 및 삼출액 관찰. 비가역성 치수염 확진. 근관장 측정 및 발수, NaOCl 세척 시행.',
    plan: '근관 1차 발수 완료. 다음 내원 시 근관 소독 및 성형, 이후 코어 및 지르코니아 크라운 수복 예정.',
    rx: '아목시실린 500mg tid (3일분), 덱시부프로펜 300mg tid, 알마겔현탁액 tid',
  },
  {
    title: '치주낭 소파 및 SRP',
    dept: '치주과',
    note: '전체 치주낭 5~7mm 깊이, 치석 침착 및 탐침 시 출혈(BOP+). 치조골 수평 흡수 관찰.',
    plan: '전악 스케일링 시행 및 1/4분악 치근활택술(SRP) 완료. 2주 후 치주낭 재평가.',
    rx: '클로르헥시딘 0.12% 가글액 1병, 세파클러 250mg tid (3일분)',
  },
  {
    title: '매복 사랑니 외과발치',
    dept: '구강외과',
    note: '하악 수평 매복 지치 협측 치은 부종. 파노라마 및 CBCT 판독 후 하치조신경관 안전거리 확인.',
    plan: '침윤마취 하 치은 절개, 고속 버를 이용한 치관 분할(Odontosection) 후 발치, 3-0 Silk 2stitch 봉합. 1주일 후 발사 예정.',
    rx: '오구멘틴정 625mg tid (5일분), 아세클로페낙 100mg bid, 얼음찜질 안내',
  },
  {
    title: '턱관절 장애 물리치료',
    dept: '구강내과',
    note: '자발 개구량 26mm로 제한. 우측 턱관절낭 압통 심하며 저작근 뻐근한 연관통 호소.',
    plan: '도수 수기치료(Manual reduction) 및 온열 분사신장치료 시행. 교합안정장치(Splint) 본뜨기 진행.',
    rx: '에페리손 50mg tid (7일분), 나프록센 250mg bid, 턱관절 6-6-6 운동 안내',
  },
  {
    title: '틀니 압박부 릴리프',
    dept: '보철과',
    note: '의치상 내면 과압박으로 인한 치조제 점막 5mm 아프타성 궤양 확인.',
    plan: '의치 내면 PIP(Pressure Indicator Paste) 검사로 과압박 부위 선택적 삭제 및 연마. 3일간 의치 탈착 권고.',
    rx: '덱사메타손 구강연고(페리덱스) 환부 도포, 탄튬 가글액',
  },
];

const CHAIR_OPTIONS = ['1번 체어', '2번 체어', '3번 체어', '4번 체어', '5번 체어', '특진 체어'];

export const EmrModal: React.FC<EmrModalProps> = ({
  patient,
  allPatients = [],
  isOpen,
  onClose,
  currentUser,
  onSaveChart,
  onPrint,
  onOpenKiosk,
}) => {
  if (!isOpen || !patient) return null;

  const isDoctor = currentUser?.role === 'doctor';

  const [doctorDiagnosisNote, setDoctorDiagnosisNote] = useState<string>(
    patient.doctorDiagnosisNote || ''
  );
  const [treatmentPlan, setTreatmentPlan] = useState<string>(
    patient.treatmentPlan || ''
  );
  const [prescriptions, setPrescriptions] = useState<string>(
    patient.prescriptions || ''
  );
  const [status, setStatus] = useState<PatientStatus>(patient.status);
  const [assignedChair, setAssignedChair] = useState<string>(
    patient.assignedChair || '1번 체어'
  );
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  // Aggregated live clinical history across all departments from Firestore
  const aggregatedPastVisits = useMemo(() => {
    if (!patient) return [];
    return getAggregatedPatientHistory(patient, allPatients);
  }, [patient, allPatients]);

  const stats = useMemo(() => {
    return getPatientConsultationStats(aggregatedPastVisits);
  }, [aggregatedPastVisits]);

  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>('all');
  const [expandedVisitIdx, setExpandedVisitIdx] = useState<number | null>(null);
  const [citeSuccessNotice, setCiteSuccessNotice] = useState<string | null>(null);

  const filteredVisits = useMemo(() => {
    if (selectedDeptFilter === 'all') return aggregatedPastVisits;
    return aggregatedPastVisits.filter((v) => v.department === selectedDeptFilter);
  }, [aggregatedPastVisits, selectedDeptFilter]);

  const handleCiteHistory = (visit: PastVisitRecord) => {
    if (!isDoctor) return;
    const citation = `[과거 ${visit.date} ${visit.department} 소견 인용]\n- 진단: ${visit.diagnosis}\n- 처치: ${visit.treatment}`;
    setDoctorDiagnosisNote((prev) => (prev ? `${prev}\n\n${citation}` : citation));
    if (visit.prescriptions && visit.prescriptions !== '처방 없음') {
      setPrescriptions((prev) => (prev ? `${prev}, ${visit.prescriptions}` : visit.prescriptions));
    }
    setCiteSuccessNotice(`${visit.department} (${visit.date}) 소견이 차트에 추가되었습니다.`);
    setTimeout(() => setCiteSuccessNotice(null), 2500);
  };

  // Sync state when patient changes
  useEffect(() => {
    setDoctorDiagnosisNote(patient.doctorDiagnosisNote || '');
    setTreatmentPlan(patient.treatmentPlan || '');
    setPrescriptions(patient.prescriptions || '');
    setStatus(patient.status);
    setAssignedChair(patient.assignedChair || '1번 체어');
    setSaveSuccess(false);
    setSelectedDeptFilter('all');
    setExpandedVisitIdx(null);
  }, [patient]);

  const handleApplyTemplate = (tpl: (typeof QUICK_TEMPLATES)[0]) => {
    if (!isDoctor) return;
    setDoctorDiagnosisNote((prev) => (prev ? `${prev}\n${tpl.note}` : tpl.note));
    setTreatmentPlan((prev) => (prev ? `${prev}\n${tpl.plan}` : tpl.plan));
    setPrescriptions((prev) => (prev ? `${prev}\n${tpl.rx}` : tpl.rx));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSaveChart(patient.id, {
        doctorDiagnosisNote: isDoctor ? doctorDiagnosisNote : (patient.doctorDiagnosisNote || ''),
        treatmentPlan: isDoctor ? treatmentPlan : (patient.treatmentPlan || ''),
        prescriptions: isDoctor ? prescriptions : (patient.prescriptions || ''),
        status,
        assignedChair,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err) {
      console.error('Failed to save chart:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCall = () => {
    callPatientSmart({
      patientName: patient.patient?.name,
      locationTitle: patient.locationTitle,
      recommendedRoom: patient.recommendedRoom,
      assignedChair,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Topbar */}
        <div className="bg-slate-50 px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-teal-50 text-teal-600 border border-teal-200">
              <Stethoscope className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">
                  DentalTouch 치과의사 임상 차트 기록실
                </h2>
                <span className="text-xs px-2 py-0.5 rounded font-mono font-bold bg-slate-100 text-teal-800 border border-slate-200">
                  {patient.patient?.patientId}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-teal-50 text-teal-700 border border-teal-200">
                  {patient.recommendedDepartment}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                실시간 진료기록 저장 및 환자 상태/체어 관제
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCall}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-50 hover:bg-amber-500 hover:text-white text-amber-800 border border-amber-200 transition-colors cursor-pointer"
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>환자 호출</span>
            </button>

            <button
              onClick={() => onPrint(patient)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>차트 인쇄</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body: 2 Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 overflow-y-auto divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
          {/* Left Column: Patient Profile & Triage Info (5 cols) */}
          <div className="lg:col-span-5 p-5 space-y-4 bg-slate-50/60">
            {/* Patient Header Card */}
            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-full bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center font-bold text-sm">
                    {patient.patient?.name?.[0] || '환'}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">
                      {patient.patient?.name}
                    </h3>
                    <p className="text-xs text-slate-500">
                      {patient.patient?.gender} • 만 {patient.patient?.age}세 (주민번호 앞{' '}
                      {patient.patient?.rrnFront})
                    </p>
                  </div>
                </div>
                <span
                  className={`text-xs px-2.5 py-1 rounded-full font-bold ${
                    patient.triageLevel === '응급' || (patient.triageLevel as string) === 'Urgent' || (patient.triageLevel as string) === 'Emergency'
                      ? 'bg-rose-50 text-rose-700 border border-rose-200 animate-pulse'
                      : patient.triageLevel === '준응급' || (patient.triageLevel as string) === '비응급' || (patient.triageLevel as string) === 'Semi-urgent'
                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                      : 'bg-slate-100 text-slate-600 border border-slate-200'
                  }`}
                >
                  트리아지:{' '}
                  {patient.triageLevel === '응급' || (patient.triageLevel as string) === 'Urgent' || (patient.triageLevel as string) === 'Emergency'
                    ? '응급'
                    : patient.triageLevel === '준응급' || (patient.triageLevel as string) === '비응급' || (patient.triageLevel as string) === 'Semi-urgent'
                    ? '준응급'
                    : '일반'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs border-t border-slate-100 pt-2.5">
                <div className="flex items-center gap-1.5 text-slate-500">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-mono font-semibold text-slate-800">
                    {patient.patient?.phone}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-500">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>
                    {patient.date} <strong className="text-teal-700 font-bold">{patient.time}</strong>
                  </span>
                </div>
              </div>
            </div>

            {/* Clinical Questionnaire: C.C, Hx, and Separated Medication/Allergies Box */}
            <ClinicalQuestionnaireView patient={patient} showSuspectedConditions={true} />

            {/* Clinical History & Cross-departmental Past Visits */}
            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <History className="w-4 h-4 text-teal-600" />
                  <span>누적 과거 진료 내역 & 타과 협진 히스토리</span>
                </span>
                <div className="flex items-center gap-1">
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                    총 {stats.totalCount}건
                  </span>
                  {stats.realDbCount > 0 && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      차트 연동 {stats.realDbCount}건
                    </span>
                  )}
                </div>
              </div>

              {/* Toast for citing past note */}
              {citeSuccessNotice && (
                <div className="p-2 rounded-lg bg-teal-50 border border-teal-200 text-teal-800 text-xs font-bold flex items-center gap-1.5 animate-pulse">
                  <Check className="w-3.5 h-3.5 text-teal-600" />
                  <span>{citeSuccessNotice}</span>
                </div>
              )}

              {/* Same day cross-department alert */}
              {stats.sameDayConsultCount > 0 && (
                <div className="px-2.5 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs font-medium flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                    <strong>금일 타과 협진 이력 ({stats.sameDayConsultCount}건)</strong>
                  </span>
                  <span className="text-[10px] text-amber-700">실시간 연동</span>
                </div>
              )}

              {/* Department Filter Pills (if multiple departments exist) */}
              {stats.departments.length > 1 && (
                <div className="flex flex-wrap gap-1 pt-1 pb-0.5">
                  <button
                    type="button"
                    onClick={() => setSelectedDeptFilter('all')}
                    className={`text-[10px] px-2 py-0.5 rounded-md font-bold transition-colors cursor-pointer ${
                      selectedDeptFilter === 'all'
                        ? 'bg-teal-700 text-white shadow-2xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    전체 ({stats.totalCount})
                  </button>
                  {stats.departments.map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setSelectedDeptFilter(d)}
                      className={`text-[10px] px-2 py-0.5 rounded-md font-bold transition-colors cursor-pointer ${
                        selectedDeptFilter === d
                          ? 'bg-teal-700 text-white shadow-2xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {d} ({stats.deptCounts[d] || 0})
                    </button>
                  ))}
                </div>
              )}

              {/* History Records List */}
              {filteredVisits && filteredVisits.length > 0 ? (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {filteredVisits.map((v, i) => {
                    const isExpanded = expandedVisitIdx === i;
                    const isConservation = v.department.includes('보존');
                    const isPerio = v.department.includes('치주');
                    const isProstho = v.department.includes('보철');
                    const isSurgery = v.department.includes('외과');
                    const isMed = v.department.includes('내과');

                    const deptBadgeColor = isConservation
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : isPerio
                      ? 'bg-sky-50 text-sky-800 border-sky-200'
                      : isProstho
                      ? 'bg-amber-50 text-amber-800 border-amber-200'
                      : isSurgery
                      ? 'bg-rose-50 text-rose-800 border-rose-200'
                      : isMed
                      ? 'bg-purple-50 text-purple-800 border-purple-200'
                      : 'bg-slate-100 text-slate-800 border-slate-200';

                    return (
                      <div
                        key={i}
                        className={`p-2.5 rounded-lg border transition-all text-xs space-y-1.5 ${
                          v.isSameDayConsultation
                            ? 'bg-amber-50/40 border-amber-300 ring-1 ring-amber-400/20'
                            : 'bg-slate-50/70 border-slate-200 hover:bg-white'
                        }`}
                      >
                        {/* Header: Date, Department, Doctor, Badges */}
                        <div className="flex items-center justify-between gap-1 flex-wrap">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono text-[11px] text-slate-700 font-bold flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-slate-400" />
                              {v.date} {v.time ? <span className="text-teal-700 font-bold">{v.time}</span> : ''}
                            </span>
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${deptBadgeColor}`}>
                              {v.department}
                            </span>
                            {v.isSameDayConsultation && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                ★ 금일 협진
                              </span>
                            )}
                            {v.isRealDbRecord && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                차트 연동
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-600 font-semibold">{v.doctor}</span>
                        </div>

                        {/* Area & Diagnosis */}
                        <div className="font-bold text-slate-900 text-xs flex items-start justify-between gap-2">
                          <div>
                            <span className="text-amber-800 font-bold mr-1">[{v.areaTitle}]</span>
                            <span>{v.diagnosis}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setExpandedVisitIdx(isExpanded ? null : i)}
                            className="text-[10px] text-slate-400 hover:text-teal-700 p-0.5 cursor-pointer flex items-center gap-0.5 shrink-0"
                            title="상세 내역 토글"
                          >
                            <span>{isExpanded ? '접기' : '상세'}</span>
                            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </button>
                        </div>

                        {/* Treatment Summary */}
                        <div className="text-[11px] text-slate-700">
                          <strong>• 처치:</strong> {v.treatment}
                        </div>

                        {/* Prescriptions */}
                        {v.prescriptions && v.prescriptions !== '처방 없음' && (
                          <div className="text-[10px] text-teal-800 font-medium">
                            <strong>• 처방:</strong> {v.prescriptions}
                          </div>
                        )}

                        {/* Expanded Clinical Details */}
                        {isExpanded && (
                          <div className="pt-2 mt-2 border-t border-slate-200/80 space-y-1.5 bg-white p-2.5 rounded-md border border-slate-100">
                            {v.chiefComplaint && (
                              <div className="text-[11px] text-slate-600">
                                <strong className="text-slate-800">주소 (C.C):</strong> {v.chiefComplaint}
                              </div>
                            )}
                            {v.doctorDiagnosisNote && (
                              <div className="text-[11px] text-slate-700 bg-slate-50 p-2 rounded border border-slate-200">
                                <strong className="text-teal-800 block mb-0.5">의사 진단 소견:</strong>
                                <p className="whitespace-pre-wrap">{v.doctorDiagnosisNote}</p>
                              </div>
                            )}
                            {v.assignedChair && (
                              <div className="text-[10px] text-slate-500">
                                진행 위치: {v.recommendedRoom || '진료실'} • {v.assignedChair}
                              </div>
                            )}

                            {/* Cite past note button */}
                            <button
                              type="button"
                              onClick={() => handleCiteHistory(v)}
                              className="mt-1 flex items-center gap-1.5 px-2 py-1 rounded bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 text-[10px] font-bold cursor-pointer transition-colors"
                            >
                              <Copy className="w-3 h-3" />
                              <span>현재 차트에 소견 및 처방 인용하기</span>
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-3 text-center text-xs text-slate-400 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                  {selectedDeptFilter === 'all'
                    ? '등록된 과거 내원 히스토리가 없습니다. (초진 환자)'
                    : `'${selectedDeptFilter}' 진료 내역이 없습니다.`}
                </div>
              )}
            </div>

            {/* Quick Templates (상용구 퀵 클릭) */}
            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between gap-1.5 mb-2.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                  <Sparkles className="w-4 h-4 text-teal-600" />
                  <span>치과 전문 상용구 퀵 템플릿</span>
                </div>
                {!isDoctor && (
                  <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                    <Lock className="w-3 h-3 text-slate-400" />
                    의사 전용
                  </span>
                )}
              </div>
              {isDoctor ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {QUICK_TEMPLATES.map((tpl, i) => (
                    <button
                      key={i}
                      onClick={() => handleApplyTemplate(tpl)}
                      className="text-left p-2 rounded-lg bg-slate-50 border border-slate-200 hover:border-teal-400 hover:bg-teal-50/50 transition-all text-xs cursor-pointer group"
                    >
                      <div className="font-bold text-slate-800 group-hover:text-teal-700">
                        {tpl.title}
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">{tpl.dept}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="p-3 bg-slate-50 rounded-lg text-slate-500 text-xs text-center border border-slate-200/80">
                  상용구 퀵 입력은 의사 로그인 상태에서만 차트에 적용할 수 있습니다.
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Doctor Charting Inputs (7 cols) */}
          <div className="lg:col-span-7 p-5 space-y-4 flex flex-col justify-between bg-white">
            <div className="space-y-4">
              {/* Staff Read-only Notice Banner */}
              {!isDoctor && (
                <div className="p-3 rounded-xl bg-amber-50/90 border border-amber-200 text-amber-950 text-xs font-medium flex items-start gap-2.5">
                  <Lock className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-amber-900">
                      일반(원무/간호) 모드: 의사 진단소견 및 처방 편집 제한 (열람 전용)
                    </div>
                    <div className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                      의료법 및 병원 진료권한 정책에 따라 의사 진단소견, 치료 계획 및 처방 내용은 의사 로그인 시에만 작성/수정할 수 있습니다. 일반 모드에서는 환자 상태 및 체어 배정 변경만 저장됩니다.
                    </div>
                  </div>
                </div>
              )}

              {/* Status and Chair Assignment Controls */}
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 flex flex-wrap items-center justify-between gap-3">
                {/* Status Selector */}
                <div className="flex items-center gap-2">
                  <label className="text-xs font-bold text-slate-700">진료 상태:</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as PatientStatus)}
                    className="bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-bold text-teal-700 focus:outline-none focus:border-teal-500 cursor-pointer shadow-2xs"
                  >
                    <option value="호출중">호출중</option>
                    <option value="진료대기">진료대기</option>
                    <option value="진료중">진료중</option>
                    <option value="완료">완료 (진료종료)</option>
                  </select>
                </div>

                {/* Chair Selector */}
                <div className="flex items-center gap-2">
                  <label className="text-xs font-bold text-slate-700">지정 체어:</label>
                  <select
                    value={assignedChair}
                    onChange={(e) => setAssignedChair(e.target.value)}
                    className="bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:border-teal-500 cursor-pointer shadow-2xs"
                  >
                    {CHAIR_OPTIONS.map((chair) => (
                      <option key={chair} value={chair}>
                        {chair}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 1. Doctor Clinical Diagnosis Note */}
              <div>
                <label className="text-xs font-bold tracking-wide uppercase text-teal-800 flex items-center justify-between mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-teal-600" />
                    <span>의사 진단 소견 (Doctor Diagnosis Note)</span>
                  </span>
                  {!isDoctor && (
                    <span className="text-[10px] text-amber-700 bg-amber-100/70 font-semibold px-2 py-0.5 rounded flex items-center gap-1">
                      <Lock className="w-3 h-3 text-amber-600" />
                      열람 전용 (편집 불가)
                    </span>
                  )}
                </label>
                <textarea
                  rows={4}
                  readOnly={!isDoctor}
                  value={doctorDiagnosisNote}
                  onChange={(e) => isDoctor && setDoctorDiagnosisNote(e.target.value)}
                  placeholder={
                    isDoctor
                      ? '환자 임상 검사, 방사선 판독 및 의학적 진단 소견을 기록하세요...'
                      : '등록된 의사 진단 소견이 없습니다.'
                  }
                  className={`w-full rounded-xl p-3 text-xs font-mono leading-relaxed transition-all ${
                    !isDoctor
                      ? 'bg-slate-100 text-slate-700 border border-slate-200 cursor-not-allowed select-text'
                      : 'bg-white border border-slate-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500'
                  }`}
                />
              </div>

              {/* 2. Treatment Plan */}
              <div>
                <label className="text-xs font-bold tracking-wide uppercase text-sky-800 flex items-center justify-between mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <Stethoscope className="w-3.5 h-3.5 text-sky-600" />
                    <span>치료 계획 및 처치 내용 (Treatment Plan & Procedures)</span>
                  </span>
                  {!isDoctor && (
                    <span className="text-[10px] text-amber-700 bg-amber-100/70 font-semibold px-2 py-0.5 rounded flex items-center gap-1">
                      <Lock className="w-3 h-3 text-amber-600" />
                      열람 전용 (편집 불가)
                    </span>
                  )}
                </label>
                <textarea
                  rows={3}
                  readOnly={!isDoctor}
                  value={treatmentPlan}
                  onChange={(e) => isDoctor && setTreatmentPlan(e.target.value)}
                  placeholder={
                    isDoctor
                      ? '시행한 치과 치료 술식 및 향후 치료 계획을 입력하세요...'
                      : '등록된 치료 계획 및 처치 내용이 없습니다.'
                  }
                  className={`w-full rounded-xl p-3 text-xs font-mono leading-relaxed transition-all ${
                    !isDoctor
                      ? 'bg-slate-100 text-slate-700 border border-slate-200 cursor-not-allowed select-text'
                      : 'bg-white border border-slate-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500'
                  }`}
                />
              </div>

              {/* 3. Prescriptions */}
              <div>
                <label className="text-xs font-bold tracking-wide uppercase text-amber-800 flex items-center justify-between mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <Pill className="w-3.5 h-3.5 text-amber-600" />
                    <span>원내 처방 및 복약 지도 (Prescriptions & Medications)</span>
                  </span>
                  {!isDoctor && (
                    <span className="text-[10px] text-amber-700 bg-amber-100/70 font-semibold px-2 py-0.5 rounded flex items-center gap-1">
                      <Lock className="w-3 h-3 text-amber-600" />
                      열람 전용 (편집 불가)
                    </span>
                  )}
                </label>
                <textarea
                  rows={2}
                  readOnly={!isDoctor}
                  value={prescriptions}
                  onChange={(e) => isDoctor && setPrescriptions(e.target.value)}
                  placeholder={
                    isDoctor
                      ? '항생제, 진통소염제, 소독액 등 처방 의약품 및 복용법을 입력하세요...'
                      : '등록된 처방 및 복약 지도 내역이 없습니다.'
                  }
                  className={`w-full rounded-xl p-3 text-xs font-mono leading-relaxed transition-all ${
                    !isDoctor
                      ? 'bg-slate-100 text-slate-700 border border-slate-200 cursor-not-allowed select-text'
                      : 'bg-white border border-slate-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500'
                  }`}
                />
              </div>
            </div>

            {/* Bottom Actions and Feedback */}
            <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
              <div>
                {saveSuccess && (
                  <div className="flex items-center gap-1.5 text-xs text-emerald-800 font-bold bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg animate-fade-in">
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span>{isDoctor ? 'Firestore에 실시간 저장 완료!' : '체어 및 상태 변경 저장 완료!'}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                {onOpenKiosk && isDoctor && (
                  <button
                    id="btn-emr-schedule-next-visit"
                    type="button"
                    onClick={() => {
                      onOpenKiosk({
                        patient: patient.patient,
                        recommendedDepartment: patient.recommendedDepartment,
                        recommendedRoom: patient.recommendedRoom,
                        areaTitle: patient.areaTitle,
                        assignedChair: patient.assignedChair || '1번 체어',
                        triageLevel: '일반',
                        date: addMonths(patient.date || getTodayDateString(), 1),
                        time: '10:00',
                        chiefComplaint: `[외래 재내원 / F/U 예약] ${treatmentPlan ? treatmentPlan.slice(0, 40) : patient.areaTitle + ' 경과 관찰 및 후속 진료'}`,
                        historyOfPresentIllness: `${patient.date} ${patient.recommendedDepartment} 진료 후 외래 F/U 예약.`,
                        drugAllergies: patient.drugAllergies || [],
                        hasNoAllergies: patient.hasNoAllergies ?? true,
                        medicationsList: patient.medicationsList || [],
                        hasNoMedications: patient.hasNoMedications ?? true,
                        bleedingTendency: patient.bleedingTendency || '없음 (정상 지혈)',
                      });
                      onClose();
                    }}
                    className="px-3.5 py-2 text-xs font-bold rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-colors cursor-pointer flex items-center gap-1.5"
                    title="오늘 진료 후 1개월 뒤 또는 지정일자 외래 예약 등록"
                  >
                    <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                    <span>차회 외래 예약 (1개월 뒤 / 날짜 지정)</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                >
                  닫기
                </button>
                <button
                  id="btn-save-emr-chart"
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-5 py-2 text-xs font-bold rounded-xl bg-teal-600 hover:bg-teal-700 text-white transition-colors shadow-md shadow-teal-600/20 disabled:opacity-50 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>
                    {isSaving
                      ? '저장 중...'
                      : !isDoctor
                      ? '체어 / 상태 변경 저장'
                      : '차트 저장 (Firestore 보존)'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
