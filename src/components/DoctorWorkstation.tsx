import React, { useState, useMemo, useEffect } from 'react';
import {
  Stethoscope,
  Clock,
  User,
  Phone,
  AlertTriangle,
  Flame,
  CheckCircle2,
  Calendar,
  ChevronRight,
  ChevronLeft,
  Save,
  Printer,
  Volume2,
  Sparkles,
  FileText,
  Pill,
  History,
  LogOut,
  ArrowRight,
  Search,
  Layers,
  Filter,
  Activity,
  Check,
  Building2,
  Lock,
  Copy,
  ChevronDown,
  Trash2,
} from 'lucide-react';
import {
  QueuePatient,
  PatientStatus,
  DentalDepartment,
  TriageLevel,
  UserAccount,
  PastVisitRecord,
} from '../types';
import { getTodayDateString, getKoreanDayOfWeek, addMonths } from '../utils/dateUtils';
import { getAggregatedPatientHistory, getPatientConsultationStats } from '../utils/patientHistory';
import { callPatientSmart } from '../utils/audioChime';
import { ClinicalQuestionnaireView } from './ClinicalQuestionnaireView';

interface DoctorWorkstationProps {
  doctor: UserAccount;
  patients: QueuePatient[];
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
  onUpdateStatus: (patientId: string, status: PatientStatus) => Promise<void>;
  onUpdateChair: (patientId: string, chair: string) => Promise<void>;
  onPrintPatient: (patient: QueuePatient) => void;
  onLogout: () => void;
  onSwitchToGeneral: () => void;
  onResetAndCleanDB?: () => Promise<void>;
  onOpenKiosk?: (initialData?: Partial<QueuePatient> | null) => void;
}

// Dental clinical templates
const CLINICAL_TEMPLATES = [
  {
    title: '급성 비가역성 치수염 근관치료 1차',
    dept: '보존과',
    note: '치수강 개방 시 심한 삼출성 출혈 확인. 비가역성 치수염 확진. 근관장 측정(Root ZX) 및 파일링, NaOCl 2.5% 세척, 수산화칼슘 첩약.',
    plan: '#16 근관 1차 발수 완료. 차회 근관장 재확인 및 성형/확대, 이후 지르코니아 크라운 수복 계획.',
    rx: '아목시실린 500mg tid (3일분), 덱시부프로펜 300mg tid, 알마겔정 tid',
  },
  {
    title: '급성 치주농양 절개배농 및 세척',
    dept: '치주과',
    note: '치은 변연부 급성 부종 및 압통(+), 치주낭 7mm 이상 탐침. 농양 절개 배농(I&D) 및 식염수/클로르헥시딘 세척.',
    plan: '급성 부종 가라앉은 후 1주일 뒤 전악 SRP 및 치주소파술(Curettage) 시행 예정.',
    rx: '오구멘틴 375mg tid (4일분), 록소프로펜 60mg tid, 헥사메딘 가글액',
  },
  {
    title: '매복 사랑니 발치(수술발치)',
    dept: '구강외과',
    note: '하악 수평 매복 사랑니. 침윤마취 및 하치조신경전달마취 후 판막 거상, 치관 분할(Sectioning) 및 골삭제 후 안전하게 발치 완료.',
    plan: '지혈 스폰지 삽입 및 4-0 Silk 봉합. 1주일 후 발사(Stitch out) 예정. 냉찜질 지도.',
    rx: '세파클러 250mg tid (5일분), 덱시부프로펜 300mg tid, 소화제',
  },
  {
    title: '악관절 장애(TMJ) 물리치료 및 약물요법',
    dept: '구강내과',
    note: '양측 저작근(교근, 측두근) 압통 심함. 입 벌릴 때 클릭음 및 개구제한(32mm). 이악물기 습관 확인.',
    plan: '온습포 찜질 교육, 턱 안정 운동 지도, 저주파 자극 물리치료 시행. 증상 지속 시 스플린트 장치 고려.',
    rx: '에페리손염산염 50mg bid (7일분), 아세클로페낙 100mg bid',
  },
  {
    title: '지르코니아 보철물 탈락 재접착 및 교합조정',
    dept: '보철과',
    note: '기존 크라운 탈락 지대치 검사 결과 2차 우식 없음. 잔존 시멘트 초음파 세척 후 적합도 확인.',
    plan: 'RMGI 시멘트(RelyX Luting 2)로 영구 재접착 완료. 교합간섭 체크 및 중심위/측방위 교합조정.',
    rx: '필요시 타이레놀 500mg 1회 복용',
  },
];

export const DoctorWorkstation: React.FC<DoctorWorkstationProps> = ({
  doctor,
  patients,
  onSaveChart,
  onUpdateStatus,
  onUpdateChair,
  onPrintPatient,
  onLogout,
  onSwitchToGeneral,
  onResetAndCleanDB,
  onOpenKiosk,
}) => {
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());
  const [deptFilter, setDeptFilter] = useState<string>(doctor.department || 'all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);

  // Active chart editing state
  const [doctorDiagnosisNote, setDoctorDiagnosisNote] = useState('');
  const [treatmentPlan, setTreatmentPlan] = useState('');
  const [prescriptions, setPrescriptions] = useState('');
  const [patientStatus, setPatientStatus] = useState<PatientStatus>('진료중');
  const [assignedChair, setAssignedChair] = useState('1번 체어');

  const [isSaving, setIsSaving] = useState(false);
  const [saveToast, setSaveToast] = useState<string | null>(null);
  const [expandedHistoryIdx, setExpandedHistoryIdx] = useState<number | null>(null);

  // Filter patients for the selected date
  const dayPatients = useMemo(() => {
    return patients
      .filter((p) => p.date === selectedDate)
      .sort((a, b) => a.time.localeCompare(b.time));
  }, [patients, selectedDate]);

  // Apply department, status, and search filters
  const filteredPatients = useMemo(() => {
    return dayPatients.filter((p) => {
      if (deptFilter !== 'all' && p.recommendedDepartment !== deptFilter) return false;
      if (statusFilter !== 'all' && p.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = p.patient?.name?.toLowerCase().includes(q);
        const matchId = p.patient?.patientId?.toLowerCase().includes(q);
        const matchCc = p.chiefComplaint?.toLowerCase().includes(q);
        if (!matchName && !matchId && !matchCc) return false;
      }
      return true;
    });
  }, [dayPatients, deptFilter, statusFilter, searchQuery]);

  // Determine currently selected patient
  const currentPatient = useMemo(() => {
    if (!filteredPatients.length) return null;
    if (selectedPatientId) {
      const found = filteredPatients.find((p) => p.id === selectedPatientId);
      if (found) return found;
    }
    // Default to the first in-progress or waiting patient
    const active =
      filteredPatients.find((p) => p.status === '진료중') ||
      filteredPatients.find((p) => p.status === '호출중') ||
      filteredPatients.find((p) => p.status === '진료대기') ||
      filteredPatients[0];
    return active;
  }, [filteredPatients, selectedPatientId]);

  // Synchronize active editing form when current patient changes
  useEffect(() => {
    if (currentPatient) {
      setDoctorDiagnosisNote(currentPatient.doctorDiagnosisNote || '');
      setTreatmentPlan(currentPatient.treatmentPlan || '');
      setPrescriptions(currentPatient.prescriptions || '');
      setPatientStatus(currentPatient.status);
      setAssignedChair(currentPatient.assignedChair || '1번 체어');
      setExpandedHistoryIdx(null);
    }
  }, [currentPatient?.id]);

  // Cumulative medical & dental history for this patient
  const aggregatedHistory: PastVisitRecord[] = useMemo(() => {
    if (!currentPatient) return [];
    return getAggregatedPatientHistory(currentPatient, patients);
  }, [currentPatient, patients]);

  const historyStats = useMemo(() => {
    if (!currentPatient) return { totalCount: 0, sameDayConsultCount: 0, departments: [] };
    return getPatientConsultationStats(aggregatedHistory);
  }, [aggregatedHistory]);

  // Count stats
  const stats = useMemo(() => {
    const total = dayPatients.length;
    const waiting = dayPatients.filter((p) => p.status === '진료대기' || p.status === '호출중').length;
    const inProgress = dayPatients.filter((p) => p.status === '진료중').length;
    const completed = dayPatients.filter((p) => p.status === '완료').length;
    return { total, waiting, inProgress, completed };
  }, [dayPatients]);

  // Save chart
  const handleSave = async (customStatus?: PatientStatus) => {
    if (!currentPatient) return;
    setIsSaving(true);
    const finalStatus = customStatus || patientStatus;
    try {
      await onSaveChart(currentPatient.id, {
        doctorDiagnosisNote,
        treatmentPlan,
        prescriptions,
        status: finalStatus,
        assignedChair,
      });
      setPatientStatus(finalStatus);
      setSaveToast('진료기록 및 치료계획이 안전하게 보존되었습니다.');
      setTimeout(() => setSaveToast(null), 3000);
    } catch (err) {
      console.error('Failed to save chart:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Complete current patient and move to next waiting patient
  const handleCompleteAndNext = async () => {
    if (!currentPatient) return;
    await handleSave('완료');

    // Find next waiting patient
    const currentIndex = filteredPatients.findIndex((p) => p.id === currentPatient.id);
    const nextPatient =
      filteredPatients.slice(currentIndex + 1).find((p) => p.status !== '완료') ||
      filteredPatients.find((p) => p.status !== '완료' && p.id !== currentPatient.id);

    if (nextPatient) {
      setSelectedPatientId(nextPatient.id);
      // Auto-set next patient status to '진료중'
      await onUpdateStatus(nextPatient.id, '진료중');
    }
  };

  // Start treatment now
  const handleStartTreatment = async () => {
    if (!currentPatient) return;
    setPatientStatus('진료중');
    await onUpdateStatus(currentPatient.id, '진료중');
    setSaveToast(`${currentPatient.patient.name} 환자 진료를 시작합니다. (상태: 진료중)`);
    setTimeout(() => setSaveToast(null), 3000);
  };

  // Audio Call
  const handleCall = () => {
    if (!currentPatient) return;
    callPatientSmart({
      patientName: currentPatient.patient.name,
      assignedChair: currentPatient.assignedChair,
      recommendedRoom: currentPatient.recommendedRoom,
      locationTitle: currentPatient.recommendedDepartment,
    });
    setSaveToast(`'${currentPatient.patient.name}' 환자를 호출하였습니다.`);
    setTimeout(() => setSaveToast(null), 2500);
  };

  // Apply clinical template
  const handleApplyTemplate = (tpl: typeof CLINICAL_TEMPLATES[0]) => {
    setDoctorDiagnosisNote((prev) => (prev ? `${prev}\n\n[${tpl.title}]\n${tpl.note}` : tpl.note));
    setTreatmentPlan((prev) => (prev ? `${prev}\n${tpl.plan}` : tpl.plan));
    setPrescriptions((prev) => (prev ? `${prev}, ${tpl.rx}` : tpl.rx));
  };

  // Cite past note into current chart
  const handleCiteHistory = (record: PastVisitRecord) => {
    const citation = `[과거 ${record.date} ${record.department} 내원 소견]\n- 진단: ${record.diagnosis}\n- 처치: ${record.treatment}`;
    setDoctorDiagnosisNote((prev) => (prev ? `${prev}\n\n${citation}` : citation));
    if (record.prescriptions && record.prescriptions !== '없음') {
      setPrescriptions((prev) => (prev ? `${prev}, ${record.prescriptions}` : record.prescriptions));
    }
    setSaveToast(`과거 ${record.date} ${record.department} 소견이 현재 차트에 인용되었습니다.`);
    setTimeout(() => setSaveToast(null), 2500);
  };

  const getTriageBadge = (level: TriageLevel | string) => {
    if (level === '응급') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200 animate-pulse">
          <Flame className="w-3 h-3 text-rose-500" />
          응급
        </span>
      );
    }
    if (level === '준응급' || level === '비응급') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
          <AlertTriangle className="w-3 h-3 text-amber-500" />
          준응급
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
        일반
      </span>
    );
  };

  const getStatusBadge = (status: PatientStatus) => {
    switch (status) {
      case '진료중':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 animate-pulse">
            진료중
          </span>
        );
      case '호출중':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
            호출중
          </span>
        );
      case '진료대기':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-sky-100 text-sky-800 border border-sky-300">
            진료대기
          </span>
        );
      case '완료':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
            진료완료
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans selection:bg-teal-600 selection:text-white">
      {/* Save Notification Toast */}
      {saveToast && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-700 text-white font-bold text-xs shadow-xl border border-teal-600 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-300" />
          <span>{saveToast}</span>
        </div>
      )}

      {/* Doctor Top Workstation Header */}
      <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3">
          {/* Doctor Profile & Hospital Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-400 font-bold shadow-inner">
              <Stethoscope className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white tracking-tight">
                  {doctor.name} {doctor.title}
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded-full font-bold bg-teal-900 text-teal-300 border border-teal-700">
                  {doctor.department || '치과진료의'}
                </span>
                {doctor.room && (
                  <span className="text-[11px] text-slate-400 font-mono">({doctor.room})</span>
                )}
              </div>
              <p className="text-[11px] text-slate-400">
                오즈치과대학교병원 의사 전용 진료차팅 워크스테이션
              </p>
            </div>
          </div>

          {/* Quick Date and Patient Count Summary */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Date Picker */}
            <div className="flex items-center gap-1.5 bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-xs">
              <Calendar className="w-3.5 h-3.5 text-teal-400" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent text-white text-xs font-mono font-bold focus:outline-none cursor-pointer"
              />
              <span className="text-slate-400 text-[11px]">
                ({getKoreanDayOfWeek(selectedDate)})
              </span>
            </div>

            {/* Daily counts */}
            <div className="hidden sm:flex items-center gap-1 text-xs bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700">
              <span className="text-slate-400 text-[11px]">금일 환자:</span>
              <span className="font-bold text-white font-mono">{stats.total}명</span>
              <span className="text-slate-600 mx-1">|</span>
              <span className="text-sky-400 font-bold text-[11px]">대기 {stats.waiting}</span>
              <span className="text-slate-600 mx-1">|</span>
              <span className="text-emerald-400 font-bold text-[11px]">진료중 {stats.inProgress}</span>
              <span className="text-slate-600 mx-1">|</span>
              <span className="text-slate-400 font-bold text-[11px]">완료 {stats.completed}</span>
            </div>

            {/* Action buttons: Switch to General & Logout */}
            <button
              onClick={onSwitchToGeneral}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
              title="원무 및 전체 대기열 모니터 화면 보기"
            >
              <Layers className="w-3.5 h-3.5 text-teal-400" />
              <span>원무 관제 화면</span>
            </button>

            <button
              onClick={onLogout}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-900/30 hover:bg-rose-900/50 text-rose-300 text-xs font-semibold border border-rose-800/50 transition-colors cursor-pointer"
              title="로그아웃 및 로그인 화면으로 이동"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-400" />
              <span>로그아웃</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Workstation Layout: Left Queue Panel (35%) + Right Charting Panel (65%) */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-4 grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* ============================================================ */}
        {/* LEFT COLUMN: 오늘의 환자 진료 순서 대기열 (4 cols) */}
        {/* ============================================================ */}
        <aside className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col h-[calc(100vh-85px)] overflow-hidden">
          {/* Queue Header & Filters */}
          <div className="p-3.5 border-b border-slate-200 bg-slate-50 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-teal-600" />
                <h2 className="text-sm font-bold text-slate-900">당일 환자 진료 순서</h2>
              </div>
              <span className="text-xs px-2 py-0.5 rounded-full bg-teal-50 text-teal-800 font-bold border border-teal-200">
                {filteredPatients.length}명
              </span>
            </div>

            {/* Department Filter Toggle */}
            <div className="flex items-center gap-1.5 text-xs">
              <button
                onClick={() => setDeptFilter(doctor.department || 'all')}
                className={`flex-1 py-1 rounded-md text-center font-bold text-[11px] transition-colors cursor-pointer ${
                  deptFilter === doctor.department
                    ? 'bg-teal-700 text-white shadow-2xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                내 분과 ({doctor.department})
              </button>
              <button
                onClick={() => setDeptFilter('all')}
                className={`flex-1 py-1 rounded-md text-center font-bold text-[11px] transition-colors cursor-pointer ${
                  deptFilter === 'all'
                    ? 'bg-teal-700 text-white shadow-2xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                전체 진료과 ({stats.total}명)
              </button>
            </div>

            {/* Status Tabs */}
            <div className="grid grid-cols-4 gap-1 text-[11px]">
              {(['all', '진료대기', '진료중', '완료'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`py-1 rounded text-center font-semibold transition-colors cursor-pointer ${
                    statusFilter === st
                      ? 'bg-slate-900 text-white'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {st === 'all' ? '전체' : st}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="환자명, 등록번호(DEN-), 증상 검색..."
                className="w-full bg-white border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-teal-500"
              />
            </div>
          </div>

          {/* Sequential Patient Cards List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {filteredPatients.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-slate-400 text-xs text-center p-4">
                <User className="w-8 h-8 text-slate-300 mb-2" />
                <p>선택한 조건에 해당하는 환자가 없습니다.</p>
              </div>
            ) : (
              filteredPatients.map((patient, index) => {
                const isSelected = currentPatient?.id === patient.id;
                const isUrgent = patient.triageLevel === '응급';

                return (
                  <div
                    key={patient.id}
                    id={`doc-patient-${patient.id}`}
                    onClick={() => setSelectedPatientId(patient.id)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer relative ${
                      isSelected
                        ? 'bg-teal-50/60 border-teal-500 ring-2 ring-teal-500/30 shadow-xs'
                        : 'bg-white border-slate-200 hover:border-teal-300 hover:bg-slate-50/80'
                    }`}
                  >
                    {/* Top Row: Index, Time, Name, ID & Triage Badge */}
                    <div className="flex items-start justify-between gap-1 mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 font-bold text-[10px] flex items-center justify-center font-mono border border-slate-200">
                          {index + 1}
                        </span>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-sm text-slate-900">
                              {patient.patient?.name}
                            </span>
                            <span className="text-xs text-slate-500">
                              ({patient.patient?.gender}/{patient.patient?.age}세)
                            </span>
                          </div>
                          <div className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5 mt-0.5">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span className="font-bold text-slate-700">{patient.time}</span>
                            <span>•</span>
                            <span>{patient.patient?.patientId}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1">
                        {getTriageBadge(patient.triageLevel)}
                        {getStatusBadge(patient.status)}
                      </div>
                    </div>

                    {/* Area Title & Chief Complaint Preview */}
                    <div className="bg-slate-50 rounded-lg p-2 text-xs border border-slate-200/80 mt-1">
                      <div className="text-[11px] font-bold text-teal-800 truncate mb-0.5">
                        {patient.areaTitle}
                      </div>
                      <div className="text-slate-600 line-clamp-2 text-[11px] leading-tight">
                        {patient.chiefComplaint || '호소 증상 없음'}
                      </div>
                      {/* Clinical Safety Alert Badges */}
                      {((patient.drugAllergies && patient.drugAllergies.length > 0) ||
                        (patient.redFlags && patient.redFlags.length > 0) ||
                        (patient.bleedingTendency && patient.bleedingTendency.includes('주의'))) && (
                        <div className="flex items-center gap-1 flex-wrap mt-1.5 pt-1.5 border-t border-slate-200/60">
                          {patient.drugAllergies && patient.drugAllergies.length > 0 && (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-rose-100 text-rose-800 border border-rose-200 flex items-center gap-0.5">
                              <span>🚨</span>
                              <span className="truncate max-w-[120px]">{patient.drugAllergies[0]}</span>
                            </span>
                          )}
                          {patient.bleedingTendency && patient.bleedingTendency.includes('주의') && (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 border border-amber-300">
                              ⚠️ 출혈주의
                            </span>
                          )}
                          {patient.redFlags && patient.redFlags.some((f) => f.includes('골괴사') || f.includes('MRONJ')) && (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-purple-100 text-purple-900 border border-purple-300">
                              🦴 골괴사(MRONJ)
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Footer: Chair & Department */}
                    <div className="flex items-center justify-between text-[10px] text-slate-500 pt-2 mt-1 border-t border-slate-100">
                      <span className="font-semibold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
                        {patient.assignedChair}
                      </span>
                      <span className="text-teal-700 font-bold">
                        {patient.recommendedDepartment} ({patient.recommendedRoom})
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Quick Bottom Control: Advance to next waiting patient */}
          <div className="p-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
            <button
              onClick={() => {
                const nextWaiting = filteredPatients.find(
                  (p) => p.status === '진료대기' || p.status === '호출중'
                );
                if (nextWaiting) {
                  setSelectedPatientId(nextWaiting.id);
                  onUpdateStatus(nextWaiting.id, '진료중');
                }
              }}
              className="w-full py-2 px-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-sm cursor-pointer"
            >
              <span>다음 대기 환자 진료 시작</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </aside>

        {/* ============================================================ */}
        {/* RIGHT COLUMN: 환자 정밀 진료 & 진료차트 워크스테이션 (8 cols) */}
        {/* ============================================================ */}
        <main className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col h-[calc(100vh-85px)] overflow-hidden">
          {currentPatient ? (
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
              {/* 1. 환자 기본 인적사항 헤더 카드 */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-xl font-bold text-slate-900">
                      {currentPatient.patient?.name}
                    </h3>
                    <span className="text-sm font-semibold text-slate-600">
                      ({currentPatient.patient?.gender} / {currentPatient.patient?.age}세)
                    </span>
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-white text-teal-800 border border-slate-200">
                      등록번호: {currentPatient.patient?.patientId}
                    </span>
                    <span className="text-xs font-mono text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                      주민번호: {currentPatient.patient?.rrnFront}-*******
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500 mt-1.5 flex-wrap">
                    <span className="flex items-center gap-1">
                      <Phone className="w-3 h-3 text-slate-400" />
                      {currentPatient.patient?.phone}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      내원일시: {currentPatient.date} {currentPatient.time}
                    </span>
                    <span>•</span>
                    <span>{currentPatient.recommendedDepartment} ({currentPatient.recommendedRoom})</span>
                  </div>
                </div>

                {/* Status & Chair Selector + Call/Start Buttons */}
                <div className="flex items-center gap-2 flex-wrap">
                  {getTriageBadge(currentPatient.triageLevel)}

                  {patientStatus !== '진료중' && patientStatus !== '완료' && (
                    <button
                      id="btn-doc-start-treatment"
                      type="button"
                      onClick={handleStartTreatment}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs hover:shadow cursor-pointer"
                      title="환자 진료 시작 및 체어 착석 처리"
                    >
                      <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>진료 시작</span>
                    </button>
                  )}

                  <select
                    value={patientStatus}
                    onChange={(e) => setPatientStatus(e.target.value as PatientStatus)}
                    className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-teal-700 focus:outline-none focus:border-teal-500 cursor-pointer shadow-2xs"
                  >
                    <option value="호출중">호출중</option>
                    <option value="진료대기">진료대기</option>
                    <option value="진료중">진료중</option>
                    <option value="완료">진료완료</option>
                  </select>

                  <select
                    value={assignedChair}
                    onChange={(e) => setAssignedChair(e.target.value)}
                    className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:border-teal-500 cursor-pointer shadow-2xs"
                  >
                    {['1번 체어', '2번 체어', '3번 체어', '4번 체어', '5번 체어', '특진 체어'].map(
                      (c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      )
                    )}
                  </select>

                  <button
                    onClick={handleCall}
                    className="p-2 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 transition-colors cursor-pointer"
                    title="환자 음성 호출 (TTS 안내방송)"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => onPrintPatient(currentPatient)}
                    className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 transition-colors cursor-pointer"
                    title="의무기록 차트 인쇄"
                  >
                    <Printer className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* 2. 환자 예진 문진 (C.C & Hx) 및 분리된 복용약물 문진 파트 */}
              <ClinicalQuestionnaireView patient={currentPatient} />

              {/* 3. 🩺 문진에 따른 추정 감별진단군 (Suspected Differential Diagnoses) */}
              <div className="p-4 rounded-xl bg-teal-50/50 border border-teal-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-teal-600 text-white flex items-center justify-center">
                      <Stethoscope className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-teal-950 uppercase tracking-wide">
                        문진 및 증상 기반 추정 감별진단군 (Differential Diagnoses)
                      </h4>
                      <p className="text-[11px] text-teal-700">
                        환자 문진 및 예진 데이터 분석에 따른 임상 추정 진단 목록입니다.
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 font-bold border border-teal-300">
                    {currentPatient.suspectedConditions?.length || 0}개 추정 진단군
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {currentPatient.suspectedConditions && currentPatient.suspectedConditions.length > 0 ? (
                    currentPatient.suspectedConditions.map((cond, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-lg bg-white border border-teal-200/80 shadow-2xs flex items-start gap-2 text-xs"
                      >
                        <span className="w-4 h-4 rounded-full bg-teal-100 text-teal-800 font-bold text-[10px] flex items-center justify-center flex-shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <div className="flex-1">
                          <div className="font-bold text-slate-900">{cond}</div>
                          <span className="text-[10px] text-teal-600 font-medium">
                            {idx === 0 ? '★ 1순위 최우선 추정' : '감별 진단 및 검사 확인 필요'}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-3 bg-white rounded-lg border border-slate-200 text-xs text-slate-400">
                      등록된 추정 감별진단 항목이 없습니다.
                    </div>
                  )}
                </div>
              </div>

              {/* 4. 📚 누적 과거 진료 히스토리 & 타과 협진 내역 */}
              <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <History className="w-4 h-4 text-teal-600" />
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                      누적 과거 내원 히스토리 및 타과 협진 이력
                    </h4>
                  </div>
                  <span className="text-[11px] text-slate-500 font-medium">
                    총 {aggregatedHistory.length}건 기록 (타과 협진 {historyStats.sameDayConsultCount}건)
                  </span>
                </div>

                {aggregatedHistory.length > 0 ? (
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {aggregatedHistory.map((rec, i) => {
                      const isExpanded = expandedHistoryIdx === i;
                      return (
                        <div
                          key={i}
                          className={`p-3 rounded-lg border text-xs transition-all ${
                            rec.isSameDayConsultation
                              ? 'bg-amber-50/50 border-amber-300'
                              : 'bg-slate-50/70 border-slate-200 hover:bg-white'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-slate-800">
                                {rec.date} {rec.time || ''}
                              </span>
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-50 text-teal-800 border border-teal-200">
                                {rec.department}
                              </span>
                              {rec.isSameDayConsultation && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                  당일 타과협진
                                </span>
                              )}
                              <span className="text-slate-500 text-[11px]">{rec.doctor}</span>
                            </div>

                            <button
                              type="button"
                              onClick={() => setExpandedHistoryIdx(isExpanded ? null : i)}
                              className="text-[11px] text-teal-700 font-bold flex items-center gap-0.5 cursor-pointer"
                            >
                              <span>{isExpanded ? '간략히' : '소견상세'}</span>
                              <ChevronDown
                                className={`w-3 h-3 transition-transform ${
                                  isExpanded ? 'rotate-180' : ''
                                }`}
                              />
                            </button>
                          </div>

                          <div className="mt-1 font-semibold text-slate-800">
                            진단: {rec.diagnosis}
                          </div>

                          {isExpanded && (
                            <div className="mt-2 pt-2 border-t border-slate-200/80 space-y-1 text-slate-600 text-[11px] bg-white p-2.5 rounded">
                              <div>
                                <strong>시행 처치:</strong> {rec.treatment}
                              </div>
                              {rec.prescriptions && (
                                <div>
                                  <strong>투약 처방:</strong> {rec.prescriptions}
                                </div>
                              )}
                              <button
                                type="button"
                                onClick={() => handleCiteHistory(rec)}
                                className="mt-2 flex items-center gap-1.5 px-2.5 py-1 rounded bg-teal-50 hover:bg-teal-100 text-teal-800 font-bold border border-teal-200 text-[11px] cursor-pointer"
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
                  <div className="p-3 bg-slate-50 rounded-lg text-center text-xs text-slate-400">
                    등록된 과거 내원 기록이 없습니다. (초진 환자)
                  </div>
                )}
              </div>

              {/* 5. ✍️ 의사 전용 진료차팅 입력 영역 */}
              <div className="p-5 rounded-2xl bg-white border border-teal-200/90 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-teal-600" />
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">
                        치과의사 임상 진료 차팅 (Doctor's Clinical Notes)
                      </h4>
                      <p className="text-xs text-slate-500">
                        의학적 진단 소견, 시행 치료 술식 및 처방 내역을 기록하고 보존합니다.
                      </p>
                    </div>
                  </div>

                  <span className="text-xs px-2.5 py-1 rounded-full bg-teal-50 text-teal-800 font-bold border border-teal-200 flex items-center gap-1">
                    <Check className="w-3.5 h-3.5 text-teal-600" />
                    <span>의사 편집 권한 활성</span>
                  </span>
                </div>

                {/* Quick Clinical Templates */}
                <div>
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1 mb-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                    <span>상용 임상 서식 퀵 템플릿 (원클릭 자동 입력)</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-1.5">
                    {CLINICAL_TEMPLATES.map((tpl, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleApplyTemplate(tpl)}
                        className="text-left p-2 rounded-lg bg-slate-50 border border-slate-200 hover:border-teal-400 hover:bg-teal-50/50 transition-all text-xs cursor-pointer group"
                      >
                        <div className="font-bold text-slate-800 group-hover:text-teal-700 truncate">
                          {tpl.title}
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">{tpl.dept}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 1. 의사 진단 소견 */}
                <div>
                  <label className="text-xs font-bold text-teal-900 flex items-center gap-1.5 mb-1">
                    <FileText className="w-3.5 h-3.5 text-teal-600" />
                    <span>1. 의사 진단 소견 (Doctor Diagnosis Note)</span>
                  </label>
                  <textarea
                    rows={4}
                    value={doctorDiagnosisNote}
                    onChange={(e) => setDoctorDiagnosisNote(e.target.value)}
                    placeholder="환자 구강내 시진/촉진 소견, 방사선 판독 결과 및 최종 진단명을 상세히 기록하세요..."
                    className="w-full bg-white border border-slate-300 rounded-xl p-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-teal-500 font-mono leading-relaxed shadow-2xs"
                  />
                </div>

                {/* 2. 치료 계획 및 처치 내용 */}
                <div>
                  <label className="text-xs font-bold text-sky-900 flex items-center gap-1.5 mb-1">
                    <Stethoscope className="w-3.5 h-3.5 text-sky-600" />
                    <span>2. 치료 계획 및 시행 술식 (Treatment Plan & Procedures)</span>
                  </label>
                  <textarea
                    rows={3}
                    value={treatmentPlan}
                    onChange={(e) => setTreatmentPlan(e.target.value)}
                    placeholder="금일 시행한 치료 술식(발치, 근관치료, 수복 등) 및 차회 진료 계획을 입력하세요..."
                    className="w-full bg-white border border-slate-300 rounded-xl p-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-teal-500 font-mono leading-relaxed shadow-2xs"
                  />
                </div>

                {/* 3. 처방 내역 */}
                <div>
                  <label className="text-xs font-bold text-amber-900 flex items-center gap-1.5 mb-1">
                    <Pill className="w-3.5 h-3.5 text-amber-600" />
                    <span>3. 원내/원외 처방 및 투약 (Prescriptions & Medications)</span>
                  </label>
                  <textarea
                    rows={2}
                    value={prescriptions}
                    onChange={(e) => setPrescriptions(e.target.value)}
                    placeholder="항생제, 진통소염제, 소독용 가글액 등 처방 의약품 및 복용법을 입력하세요..."
                    className="w-full bg-white border border-slate-300 rounded-xl p-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-teal-500 font-mono leading-relaxed shadow-2xs"
                  />
                </div>

                {/* Bottom Action Buttons */}
                <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {onOpenKiosk && (
                      <button
                        id="btn-doc-schedule-next-visit"
                        type="button"
                        onClick={() => {
                          onOpenKiosk({
                            patient: currentPatient.patient,
                            recommendedDepartment: currentPatient.recommendedDepartment,
                            recommendedRoom: currentPatient.recommendedRoom,
                            areaTitle: currentPatient.areaTitle,
                            assignedChair: currentPatient.assignedChair || '1번 체어',
                            triageLevel: '일반',
                            date: addMonths(selectedDate, 1),
                            time: '10:00',
                            chiefComplaint: `[외래 재내원 / F/U 예약] ${treatmentPlan ? treatmentPlan.slice(0, 40) : currentPatient.areaTitle + ' 경과 관찰 및 후속 진료'}`,
                            historyOfPresentIllness: `${currentPatient.date} ${currentPatient.recommendedDepartment} 1차 진료 후 외래 F/U 예약.`,
                            drugAllergies: currentPatient.drugAllergies || [],
                            hasNoAllergies: currentPatient.hasNoAllergies ?? true,
                            medicationsList: currentPatient.medicationsList || [],
                            hasNoMedications: currentPatient.hasNoMedications ?? true,
                            bleedingTendency: currentPatient.bleedingTendency || '없음 (정상 지혈)',
                          });
                        }}
                        className="px-3.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold text-xs flex items-center gap-1.5 transition-all shadow-2xs hover:shadow cursor-pointer"
                        title="오늘 진료 후 1개월 뒤 또는 지정일자 외래 예약 등록"
                      >
                        <Calendar className="w-4 h-4 text-indigo-600" />
                        <span>차회 외래 예약 (1개월 뒤 / 날짜 지정)</span>
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      id="btn-doc-save-chart"
                      type="button"
                      onClick={() => handleSave()}
                      disabled={isSaving}
                      className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <Save className="w-4 h-4" />
                      <span>{isSaving ? '저장 중...' : '차트 임시저장'}</span>
                    </button>

                    <button
                      id="btn-doc-complete-next"
                      type="button"
                      onClick={handleCompleteAndNext}
                      disabled={isSaving}
                      className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-md shadow-teal-600/20 cursor-pointer disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>진료 완료 & 다음 환자</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 text-sm p-6 text-center">
              <Stethoscope className="w-12 h-12 text-slate-300 mb-3" />
              <p className="font-bold text-slate-600">진료할 환자를 선택하세요.</p>
              <p className="text-xs text-slate-400 mt-1">
                좌측 순서 대기열에서 환자를 클릭하면 환자 정보, 문진내용 및 진료차팅이 활성화됩니다.
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
