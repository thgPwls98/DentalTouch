import React, { useState, useMemo, useEffect } from 'react';
import {
  Volume2,
  FileText,
  Clock,
  Printer,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Search,
  AlertTriangle,
  Flame,
  Table as TableIcon,
  Armchair,
  CheckCircle2,
  ArrowUpDown,
  UserCheck,
  Calendar,
  CalendarDays,
  CalendarRange,
  Tag,
  ShieldCheck,
  UserPlus,
} from 'lucide-react';
import { QueuePatient, PatientStatus, DentalDepartment } from '../types';
import { callPatientSmart } from '../utils/audioChime';
import {
  getWeekRange,
  offsetWeek,
  getTodayDateString,
  getKoreanDayOfWeek,
  addDays,
  addMonths,
  getDaysDiff,
} from '../utils/dateUtils';
import { getAggregatedPatientHistory } from '../utils/patientHistory';
import { PatientStatusModal } from './PatientStatusModal';
import { ChairAssignmentModal } from './ChairAssignmentModal';

interface QueueBoardProps {
  patients: QueuePatient[];
  onSelectPatient: (patient: QueuePatient) => void;
  onUpdateStatus: (patientId: string, newStatus: PatientStatus) => void;
  onUpdateChair: (patientId: string, newChair: string) => void;
  onPrintPatient: (patient: QueuePatient) => void;
}

const DEPARTMENTS: DentalDepartment[] = ['보존과', '치주과', '보철과', '구강외과', '구강내과'];
const STATUSES: PatientStatus[] = ['호출중', '진료대기', '진료중', '완료'];
const CHAIR_UNITS = [
  '1번 체어',
  '2번 체어',
  '3번 체어',
  '4번 체어',
  '5번 체어',
  '특진 체어',
];

export const QueueBoard: React.FC<QueueBoardProps> = ({
  patients,
  onSelectPatient,
  onUpdateStatus,
  onUpdateChair,
  onPrintPatient,
}) => {
  const [selectedDept, setSelectedDept] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [callingPatientId, setCallingPatientId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'chair'>('table');
  const [sortBy, setSortBy] = useState<'time' | 'name' | 'chair'>('time');

  // Dynamic Today tracking
  const [todayStr, setTodayStr] = useState<string>(getTodayDateString());

  // Check every minute if the date rolled over to next day
  useEffect(() => {
    const timer = setInterval(() => {
      const current = getTodayDateString();
      if (current !== todayStr) {
        setTodayStr(current);
        setWeekAnchor(current);
      }
    }, 10000);
    return () => clearInterval(timer);
  }, [todayStr]);

  // Weekly Query & Date Filter State (No "All" view to prevent data overload)
  const [dateMode, setDateMode] = useState<'today' | 'week' | 'custom'>('today');
  const [customDate, setCustomDate] = useState<string>(getTodayDateString());
  const [weekAnchor, setWeekAnchor] = useState<string>(getTodayDateString());
  const [selectedWeekDay, setSelectedWeekDay] = useState<string>('all');

  // Status Change Tab Modal state for selected patient
  const [statusTargetPatient, setStatusTargetPatient] = useState<QueuePatient | null>(null);
  // Chair Assignment Modal state for selected patient
  const [chairTargetPatient, setChairTargetPatient] = useState<QueuePatient | null>(null);

  // Compute current week range
  const currentWeek = useMemo(() => getWeekRange(weekAnchor), [weekAnchor]);

  // Compute patient count per day for the current week
  const weekDayCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    currentWeek.days.forEach((day) => {
      counts[day.date] = 0;
    });
    patients.forEach((p) => {
      if (counts[p.date] !== undefined) {
        counts[p.date]++;
      }
    });
    return counts;
  }, [patients, currentWeek]);

  // Quick lookup for cumulative past visits & cross-department counts per patient
  const patientHistoryCountMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of patients) {
      const hist = getAggregatedPatientHistory(p, patients);
      map.set(p.id, hist.length);
    }
    return map;
  }, [patients]);

  // Filter patients based on weekly / today restriction, dept, status, search
  const filteredPatients = useMemo(() => {
    const list = patients.filter((p) => {
      // Date restriction: Today, 7-day Week, or Custom Date
      if (dateMode === 'today') {
        if (p.date !== todayStr) return false;
      } else if (dateMode === 'week') {
        // Week Mode: strictly within the 7-day Monday-Sunday range
        if (p.date < currentWeek.startDate || p.date > currentWeek.endDate) {
          return false;
        }
        // Specific day filter within the week
        if (selectedWeekDay !== 'all' && p.date !== selectedWeekDay) {
          return false;
        }
      } else if (dateMode === 'custom') {
        if (p.date !== customDate) return false;
      }

      // Department filter
      if (selectedDept !== 'all' && p.recommendedDepartment !== selectedDept) {
        return false;
      }

      // Status filter
      if (selectedStatus !== 'all' && p.status !== selectedStatus) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const name = p.patient?.name?.toLowerCase() || '';
        const id = p.patient?.patientId?.toLowerCase() || '';
        const cc = p.chiefComplaint?.toLowerCase() || '';
        const chair = p.assignedChair?.toLowerCase() || '';
        const area = p.areaTitle?.toLowerCase() || '';
        if (
          !name.includes(query) &&
          !id.includes(query) &&
          !cc.includes(query) &&
          !chair.includes(query) &&
          !area.includes(query)
        ) {
          return false;
        }
      }
      return true;
    });

    // Sorting
    const sorted = list.sort((a, b) => {
      if (sortBy === 'time') {
        if (a.date !== b.date) return b.date.localeCompare(a.date);
        return a.time.localeCompare(b.time);
      }
      if (sortBy === 'name') {
        return (a.patient?.name || '').localeCompare(b.patient?.name || '');
      }
      if (sortBy === 'chair') {
        return (a.assignedChair || '').localeCompare(b.assignedChair || '');
      }
      return 0;
    });

    // Strictly deduplicate by unique patient ID to prevent React duplicate key warnings
    const seen = new Set<string>();
    return sorted.filter((p) => {
      if (!p.id || seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    });
  }, [
    patients,
    dateMode,
    currentWeek,
    selectedWeekDay,
    selectedDept,
    selectedStatus,
    searchQuery,
    sortBy,
  ]);

  // Handle Smart Patient Call
  const handleCallPatient = async (patient: QueuePatient) => {
    setCallingPatientId(patient.id);
    try {
      if (patient.status !== '호출중') {
        onUpdateStatus(patient.id, '호출중');
      }
      await callPatientSmart({
        patientName: patient.patient?.name || '환자',
        locationTitle: patient.locationTitle,
        recommendedRoom: patient.recommendedRoom,
        assignedChair: patient.assignedChair,
      });
    } catch (err) {
      console.error('Call patient error:', err);
    } finally {
      setTimeout(() => {
        setCallingPatientId(null);
      }, 3000);
    }
  };

  // Dept Badge color helper
  const getDeptColor = (dept: string) => {
    switch (dept) {
      case '보존과':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case '치주과':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case '보철과':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case '구강외과':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case '구강내과':
        return 'bg-sky-50 text-sky-700 border-sky-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  // Triage badge helper (응급, 준응급, 일반)
  const getTriageBadge = (level: string) => {
    const normalized =
      level === '응급' || level === 'Urgent' || level === 'Emergency'
        ? '응급'
        : level === '준응급' || level === '비응급' || level === 'Semi-urgent'
        ? '준응급'
        : '일반';

    switch (normalized) {
      case '응급':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200 animate-pulse">
            <Flame className="w-3 h-3 text-rose-500" />
            응급
          </span>
        );
      case '준응급':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <AlertTriangle className="w-3 h-3 text-amber-500" />
            준응급
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-50 text-slate-600 border border-slate-200">
            일반
          </span>
        );
    }
  };

  // Interactive Patient Status Tag: Opens status change selection tab for that patient
  const renderStatusTag = (patient: QueuePatient) => {
    let colorClasses = '';
    let dotClass = '';
    let label = patient.status;

    switch (patient.status) {
      case '호출중':
        colorClasses =
          'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-300 ring-1 ring-amber-400/30';
        dotClass = 'bg-amber-500 animate-ping';
        break;
      case '진료대기':
        colorClasses = 'bg-sky-50 hover:bg-sky-100 text-sky-800 border-sky-300';
        dotClass = 'bg-sky-500';
        break;
      case '진료중':
        colorClasses = 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300';
        dotClass = 'bg-emerald-500';
        break;
      case '완료':
        colorClasses = 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300';
        dotClass = 'bg-slate-400';
        break;
    }

    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setStatusTargetPatient(patient);
        }}
        title={`터치하여 '${patient.patient?.name}' 환자의 상태 변경 탭 열기`}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border transition-all cursor-pointer shadow-2xs hover:scale-105 active:scale-95 group ${colorClasses}`}
      >
        <span className={`w-2 h-2 rounded-full ${dotClass}`} />
        <span>{label}</span>
        <ChevronDown className="w-3 h-3 text-slate-400 group-hover:text-slate-700 transition-transform" />
      </button>
    );
  };

  // Interactive Chair Badge: Touch/click to change patient's assigned chair
  const renderChairBadge = (patient: QueuePatient) => {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setChairTargetPatient(patient);
        }}
        title={`터치하여 '${patient.patient?.name}' 환자의 배정 체어 변경`}
        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-slate-100 hover:bg-teal-50 text-slate-800 hover:text-teal-800 border border-slate-200 hover:border-teal-300 transition-all cursor-pointer shadow-2xs hover:scale-105 active:scale-95 group select-none"
      >
        <Armchair className="w-3.5 h-3.5 text-teal-600 group-hover:text-teal-700 shrink-0" />
        <span>{patient.assignedChair || '체어 미지정'}</span>
        <ChevronDown className="w-3 h-3 text-slate-400 group-hover:text-teal-600 transition-transform shrink-0" />
      </button>
    );
  };

  return (
    <div className="space-y-4">
      {/* Control / Filter Bar (Clean White Theme) */}
      <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs space-y-3.5">
        {/* Row 1: View Modes Switcher & Date Query Mode (Today vs 1-Week Query) */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
          {/* View Mode Switcher */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-white text-teal-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <TableIcon className="w-4 h-4 text-teal-600" />
              <span>임상 목록 표 뷰</span>
            </button>
            <button
              onClick={() => setViewMode('chair')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'chair'
                  ? 'bg-white text-teal-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Armchair className="w-4 h-4 text-teal-600" />
              <span>체어별 관제 뷰</span>
            </button>
          </div>

          {/* Date Query Selector: Today vs 1-Week vs Custom Date Query */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200 text-xs">
              <button
                onClick={() => {
                  setDateMode('today');
                  setSelectedWeekDay('all');
                }}
                className={`flex items-center gap-1 px-3 py-1 rounded-md font-bold transition-colors cursor-pointer ${
                  dateMode === 'today'
                    ? 'bg-white text-teal-700 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>오늘 ({todayStr.slice(5).replace('-', '.')} {getKoreanDayOfWeek(todayStr)})</span>
              </button>
              <button
                onClick={() => setDateMode('week')}
                className={`flex items-center gap-1 px-3 py-1 rounded-md font-bold transition-colors cursor-pointer ${
                  dateMode === 'week'
                    ? 'bg-white text-teal-700 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <CalendarRange className="w-3.5 h-3.5 text-teal-600" />
                <span>일주일 주간 조회</span>
              </button>
              <button
                onClick={() => setDateMode('custom')}
                className={`flex items-center gap-1 px-3 py-1 rounded-md font-bold transition-colors cursor-pointer ${
                  dateMode === 'custom'
                    ? 'bg-white text-indigo-700 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                <span>지정일자 조회</span>
              </button>
            </div>

            {/* Sort Control */}
            <div className="hidden sm:flex items-center gap-1 text-xs text-slate-500 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
              <span>정렬:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-transparent font-semibold text-slate-700 focus:outline-none cursor-pointer"
              >
                <option value="time">내원 시간순</option>
                <option value="name">환자명순</option>
                <option value="chair">체어 번호순</option>
              </select>
            </div>
          </div>
        </div>

        {/* Custom Date Navigator Bar (Visible only in 'custom' mode) */}
        {dateMode === 'custom' && (
          <div className="bg-indigo-50/70 rounded-xl p-3 border border-indigo-200 flex flex-wrap items-center justify-between gap-3 animate-fade-in">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-indigo-600" />
                <span>조회 일자 지정 (외래 예약일):</span>
              </span>
              <div className="relative flex items-center">
                <input
                  type="date"
                  value={customDate}
                  onChange={(e) => setCustomDate(e.target.value)}
                  className="bg-white border border-indigo-300 rounded-lg px-3 py-1 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-indigo-500 shadow-2xs cursor-pointer"
                />
              </div>
              <span className="text-xs font-bold text-indigo-800">
                ({getKoreanDayOfWeek(customDate)}요일)
              </span>
              {customDate === todayStr ? (
                <span className="text-[11px] px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800">
                  오늘
                </span>
              ) : customDate > todayStr ? (
                <span className="text-[11px] px-2 py-0.5 rounded-full font-bold bg-indigo-200 text-indigo-900">
                  D-{getDaysDiff(customDate, todayStr)}일 외래 예약
                </span>
              ) : (
                <span className="text-[11px] px-2 py-0.5 rounded-full font-bold bg-amber-100 text-amber-900">
                  과거 기록
                </span>
              )}
            </div>

            {/* Quick date jumps */}
            <div className="flex items-center gap-1.5 text-xs flex-wrap">
              <span className="text-[11px] text-indigo-700 font-semibold mr-0.5">빠른 이동:</span>
              <button
                type="button"
                onClick={() => setCustomDate(addDays(todayStr, 1))}
                className="px-2 py-1 rounded-lg bg-white hover:bg-indigo-100 text-indigo-800 border border-indigo-200 font-bold transition-colors cursor-pointer text-xs"
              >
                내일
              </button>
              <button
                type="button"
                onClick={() => setCustomDate(addDays(todayStr, 7))}
                className="px-2 py-1 rounded-lg bg-white hover:bg-indigo-100 text-indigo-800 border border-indigo-200 font-bold transition-colors cursor-pointer text-xs"
              >
                1주일 뒤
              </button>
              <button
                type="button"
                onClick={() => setCustomDate(addMonths(todayStr, 1))}
                className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-colors cursor-pointer text-xs shadow-2xs"
              >
                📅 1개월 뒤 (한달 뒤 외래)
              </button>
              <button
                type="button"
                onClick={() => {
                  setCustomDate(todayStr);
                  setDateMode('today');
                }}
                className="px-2 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-semibold transition-colors cursor-pointer text-xs"
              >
                오늘로
              </button>
            </div>
          </div>
        )}

        {/* Weekly Navigator Bar (Visible only in 'week' mode) */}
        {dateMode === 'week' && (
          <div className="bg-teal-50/50 rounded-xl p-3 border border-teal-200 space-y-2.5 animate-fade-in">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setWeekAnchor((prev) => offsetWeek(prev, -1));
                    setSelectedWeekDay('all');
                  }}
                  className="p-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs cursor-pointer flex items-center gap-1 text-xs font-semibold"
                  title="이전 1주일 조회"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span className="hidden sm:inline">이전 주</span>
                </button>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 font-bold text-xs sm:text-sm text-slate-900">
                    <Calendar className="w-4 h-4 text-teal-600" />
                    <span>{currentWeek.fullLabel}</span>
                  </div>
                  {currentWeek.isCurrentWeek ? (
                    <span className="text-[11px] px-2 py-0.5 rounded-full font-bold bg-teal-600 text-white shadow-2xs">
                      이번 주
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setWeekAnchor(getTodayDateString());
                        setSelectedWeekDay('all');
                      }}
                      className="text-[11px] px-2 py-0.5 rounded-full font-bold bg-white text-teal-700 border border-teal-300 hover:bg-teal-100 transition-colors cursor-pointer shadow-2xs"
                    >
                      오늘 주간으로 이동
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setWeekAnchor((prev) => offsetWeek(prev, 1));
                    setSelectedWeekDay('all');
                  }}
                  className="p-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs cursor-pointer flex items-center gap-1 text-xs font-semibold"
                  title="다음 1주일 조회"
                >
                  <span className="hidden sm:inline">다음 주</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Data Safety Notice */}
              <div className="flex items-center gap-1.5 text-[11px] text-teal-800 font-medium">
                <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
                <span>데이터 과부하 방지: 최대 7일 단위 분할 조회</span>
              </div>
            </div>

            {/* 7 Days Quick Day Filter Pills within this week */}
            <div className="flex items-center gap-1 overflow-x-auto pt-1 text-xs">
              <button
                type="button"
                onClick={() => setSelectedWeekDay('all')}
                className={`px-3 py-1 rounded-lg font-bold border transition-colors cursor-pointer whitespace-nowrap ${
                  selectedWeekDay === 'all'
                    ? 'bg-teal-700 text-white border-teal-700 shadow-2xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                전체 7일간
              </button>

              {currentWeek.days.map((day) => {
                const count = weekDayCounts[day.date] || 0;
                const isSelected = selectedWeekDay === day.date;

                return (
                  <button
                    key={day.date}
                    type="button"
                    onClick={() => setSelectedWeekDay(day.date)}
                    className={`px-2.5 py-1 rounded-lg border transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 text-xs ${
                      isSelected
                        ? 'bg-teal-700 text-white border-teal-700 font-bold shadow-2xs'
                        : day.isToday
                        ? 'bg-white text-teal-700 border-teal-400 font-bold hover:bg-teal-50'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <span>
                      {day.dayLabel} ({day.dayOfWeek})
                    </span>
                    {day.isToday && (
                      <span
                        className={`text-[10px] px-1 rounded ${
                          isSelected ? 'bg-teal-800 text-teal-100' : 'bg-teal-100 text-teal-800'
                        }`}
                      >
                        오늘
                      </span>
                    )}
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                        isSelected
                          ? 'bg-white text-teal-800'
                          : count > 0
                          ? 'bg-slate-100 text-slate-700'
                          : 'bg-slate-50 text-slate-400'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Row 2: Department Pills & Search Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Department Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto text-xs py-0.5">
            <span className="text-[11px] font-bold text-slate-500 mr-1 shrink-0">진료과:</span>
            <button
              onClick={() => setSelectedDept('all')}
              className={`px-3 py-1 rounded-lg font-semibold border transition-colors cursor-pointer whitespace-nowrap ${
                selectedDept === 'all'
                  ? 'bg-teal-600 text-white border-teal-600 shadow-2xs'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              전체 분과
            </button>
            {DEPARTMENTS.map((dept) => (
              <button
                key={dept}
                onClick={() => setSelectedDept(dept)}
                className={`px-2.5 py-1 rounded-lg font-semibold border transition-colors cursor-pointer whitespace-nowrap ${
                  selectedDept === dept
                    ? getDeptColor(dept) + ' ring-2 ring-teal-500/20 font-bold'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {dept}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="환자명, 등록번호, 증상, 체어..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-teal-500 transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Row 3: Patient Status & Clinical History Filter Pills */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
            <span className="text-[11px] font-bold text-slate-500 mr-1 shrink-0">진행 상태:</span>
            <button
              onClick={() => setSelectedStatus('all')}
              className={`px-2.5 py-1 rounded-lg font-semibold border transition-colors cursor-pointer whitespace-nowrap ${
                selectedStatus === 'all'
                  ? 'bg-slate-800 text-white border-slate-800 shadow-2xs'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              전체 상태
            </button>
            <button
              onClick={() => setSelectedStatus('호출중')}
              className={`px-2.5 py-1 rounded-lg font-semibold border transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                selectedStatus === '호출중'
                  ? 'bg-rose-600 text-white border-rose-600 shadow-2xs font-bold'
                  : 'bg-white text-rose-700 border-rose-200 hover:bg-rose-50'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
              호출중
            </button>
            <button
              onClick={() => setSelectedStatus('진료대기')}
              className={`px-2.5 py-1 rounded-lg font-semibold border transition-colors cursor-pointer whitespace-nowrap ${
                selectedStatus === '진료대기'
                  ? 'bg-amber-600 text-white border-amber-600 shadow-2xs font-bold'
                  : 'bg-white text-amber-700 border-amber-200 hover:bg-amber-50'
              }`}
            >
              진료대기
            </button>
            <button
              onClick={() => setSelectedStatus('진료중')}
              className={`px-2.5 py-1 rounded-lg font-semibold border transition-colors cursor-pointer whitespace-nowrap ${
                selectedStatus === '진료중'
                  ? 'bg-teal-600 text-white border-teal-600 shadow-2xs font-bold'
                  : 'bg-white text-teal-700 border-teal-200 hover:bg-teal-50'
              }`}
            >
              진료중
            </button>
            <button
              onClick={() => setSelectedStatus('완료')}
              className={`px-3 py-1 rounded-lg font-bold border transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                selectedStatus === '완료'
                  ? 'bg-slate-700 text-white border-slate-700 shadow-2xs'
                  : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
              }`}
              title="과거 진료 완료된 환자 히스토리만 필터링"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>완료 (진료 히스토리)</span>
            </button>
          </div>

          <div className="text-[11px] text-slate-500 font-medium">
            현재 조건 환자: <strong className="text-teal-700 font-bold">{filteredPatients.length}</strong>명
          </div>
        </div>
      </div>

      {/* VIEW 1: 임상 목록 표 뷰 (Table View) */}
      {viewMode === 'table' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase text-[11px] tracking-wider">
                <tr>
                  <th className="py-3 px-3.5">
                    {dateMode === 'week' ? '내원일 / 시간 / ID' : '시간 / 등록번호'}
                  </th>
                  <th className="py-3 px-3.5">환자 정보</th>
                  <th className="py-3 px-3.5">배정 체어</th>
                  <th className="py-3 px-3.5">진료 분과</th>
                  <th className="py-3 px-3.5 min-w-[240px]">호소 부위 & 주소 (C.C)</th>
                  <th className="py-3 px-3.5">트리아지</th>
                  <th className="py-3 px-3.5">환자 상태</th>
                  <th className="py-3 px-3.5 text-right">환자 관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPatients.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <UserCheck className="w-8 h-8 text-slate-300" />
                        <span>조회 기간 내 조건에 일치하는 환자 기록이 없습니다.</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredPatients.map((patient) => {
                    const isCalling = callingPatientId === patient.id;

                    return (
                      <tr
                        key={patient.id}
                        onClick={() => onSelectPatient(patient)}
                        className={`hover:bg-slate-50/80 transition-colors group cursor-pointer ${
                          isCalling ? 'bg-amber-50/40' : ''
                        }`}
                      >
                        {/* 1. Date/Time / Patient ID */}
                        <td className="py-3.5 px-3.5">
                          <div className="font-bold text-slate-900 font-mono text-xs flex items-center gap-1.5 flex-wrap">
                            <Clock className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                            <span>
                              {(dateMode === 'week' || dateMode === 'custom' || patient.date !== todayStr) && (
                                <span className="text-slate-500 font-semibold mr-1">
                                  {patient.date.slice(5).replace('-', '.')}
                                </span>
                              )}
                              {patient.time}
                            </span>
                            {patient.date > todayStr && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                외래예약
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                            {patient.patient?.patientId}
                          </div>
                        </td>

                        {/* 2. Patient Info */}
                        <td className="py-3.5 px-3.5">
                          <div className="font-bold text-slate-900 text-sm group-hover:text-teal-700 transition-colors flex items-center gap-1.5 flex-wrap">
                            <span>{patient.patient?.name}</span>
                            <span className="text-xs font-normal text-slate-500">
                              ({patient.patient?.gender}/{patient.patient?.age}세)
                            </span>
                            {(patientHistoryCountMap.get(patient.id) || 0) > 0 && (
                              <span
                                className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-bold bg-teal-50 text-teal-800 border border-teal-200"
                                title={`원내 과거 진료 및 타과 협진 ${patientHistoryCountMap.get(patient.id)}건 기록`}
                              >
                                <span>협진·재진</span>
                                <span className="font-mono text-teal-900">{patientHistoryCountMap.get(patient.id)}건</span>
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                            {patient.patient?.phone}
                          </div>
                        </td>

                        {/* 3. Assigned Chair (Interactive Touch Badge) */}
                        <td className="py-3.5 px-3.5" onClick={(e) => e.stopPropagation()}>
                          {renderChairBadge(patient)}
                        </td>

                        {/* 4. Dental Department */}
                        <td className="py-3.5 px-3.5">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold border ${getDeptColor(
                              patient.recommendedDepartment
                            )}`}
                          >
                            {patient.recommendedDepartment}
                          </span>
                        </td>

                        {/* 5. Dental Area & C.C */}
                        <td className="py-3.5 px-3.5">
                          <div className="font-bold text-amber-800 text-xs truncate max-w-xs">
                            {patient.areaTitle}
                          </div>
                          <p className="text-slate-600 text-xs line-clamp-1 mt-0.5 max-w-sm">
                            {patient.chiefComplaint || '호소 증상 없음'}
                          </p>
                          {/* Clinical Safety Alert Badges */}
                          {((patient.drugAllergies && patient.drugAllergies.length > 0) ||
                            (patient.redFlags && patient.redFlags.length > 0) ||
                            (patient.bleedingTendency && patient.bleedingTendency.includes('주의'))) && (
                            <div className="flex items-center gap-1 flex-wrap mt-1">
                              {patient.drugAllergies && patient.drugAllergies.length > 0 && (
                                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-0.5">
                                  <span>🚨</span>
                                  <span className="truncate max-w-[130px]">{patient.drugAllergies[0]}</span>
                                </span>
                              )}
                              {patient.bleedingTendency && patient.bleedingTendency.includes('주의') && (
                                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-50 text-amber-800 border border-amber-300">
                                  ⚠️ 출혈주의
                                </span>
                              )}
                              {patient.redFlags && patient.redFlags.some((f) => f.includes('골괴사') || f.includes('MRONJ')) && (
                                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-purple-50 text-purple-800 border border-purple-200">
                                  🦴 골괴사(MRONJ)
                                </span>
                              )}
                            </div>
                          )}
                          {patient.doctorDiagnosisNote && (
                            <div className="text-[11px] text-teal-700 truncate max-w-xs mt-0.5 font-medium">
                              소견: {patient.doctorDiagnosisNote}
                            </div>
                          )}
                        </td>

                        {/* 6. Triage */}
                        <td className="py-3.5 px-3.5">{getTriageBadge(patient.triageLevel)}</td>

                        {/* 7. Status Tag (Touch to open status change tab) */}
                        <td className="py-3.5 px-3.5" onClick={(e) => e.stopPropagation()}>
                          {renderStatusTag(patient)}
                        </td>

                        {/* 8. Actions */}
                        <td className="py-3.5 px-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Call Button */}
                            <button
                              onClick={() => handleCallPatient(patient)}
                              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                isCalling
                                  ? 'bg-amber-400 text-slate-900 animate-bounce'
                                  : 'bg-amber-50 hover:bg-amber-500 hover:text-white text-amber-800 border border-amber-200'
                              }`}
                              title="스마트 음성 호출"
                            >
                              <Volume2 className="w-3.5 h-3.5" />
                              <span>{isCalling ? '호출중' : '호출'}</span>
                            </button>

                            {/* Chart Button */}
                            <button
                              onClick={() => onSelectPatient(patient)}
                              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-teal-50 hover:bg-teal-600 hover:text-white text-teal-700 border border-teal-200 transition-colors cursor-pointer"
                              title="진료차트 열기"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span>차팅</span>
                            </button>

                            {/* Print Button */}
                            <button
                              onClick={() => onPrintPatient(patient)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                              title="차트 인쇄"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 2: 체어별 관제 뷰 (Chair / Unit Matrix View) */}
      {viewMode === 'chair' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {CHAIR_UNITS.map((chair) => {
              // Patients on this chair
              const chairPatients = filteredPatients.filter((p) => p.assignedChair === chair);
              const activePatient = chairPatients.find(
                (p) => p.status === '진료중' || p.status === '호출중'
              );
              const waitingPatients = chairPatients.filter((p) => p.status === '진료대기');
              const completedPatients = chairPatients.filter((p) => p.status === '완료');

              const isOccupied = !!activePatient;

              return (
                <div
                  key={chair}
                  className={`bg-white rounded-xl border p-4 shadow-xs transition-all flex flex-col justify-between ${
                    activePatient?.status === '호출중'
                      ? 'border-amber-400 ring-2 ring-amber-400/20'
                      : isOccupied
                      ? 'border-emerald-300'
                      : 'border-slate-200'
                  }`}
                >
                  {/* Chair Header */}
                  <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${
                          isOccupied
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-500 border border-slate-200'
                        }`}
                      >
                        <Armchair className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-sm">{chair}</h3>
                        <p className="text-[11px] text-slate-500 font-mono">
                          {isOccupied ? (
                            <span className="text-emerald-600 font-bold">진료 가동 중</span>
                          ) : (
                            <span className="text-slate-400">빈 체어 (배정 가능)</span>
                          )}
                        </p>
                      </div>
                    </div>

                    <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-slate-100 text-slate-600 border border-slate-200">
                      총 {chairPatients.length}건
                    </span>
                  </div>

                  {/* Chair Active Patient or Empty State */}
                  <div className="flex-1 space-y-3 mb-3">
                    {activePatient ? (
                      <div
                        onClick={() => onSelectPatient(activePatient)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer group ${
                          activePatient.status === '호출중'
                            ? 'bg-amber-50/70 border-amber-300'
                            : 'bg-emerald-50/50 border-emerald-200'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-sm text-slate-900 group-hover:text-teal-700">
                                {activePatient.patient?.name}
                              </span>
                              <span className="text-xs text-slate-500">
                                ({activePatient.patient?.gender}/{activePatient.patient?.age}세)
                              </span>
                              {(patientHistoryCountMap.get(activePatient.id) || 0) > 0 && (
                                <span
                                  className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-bold bg-teal-50 text-teal-800 border border-teal-200"
                                  title={`원내 과거 진료 및 타과 협진 ${patientHistoryCountMap.get(activePatient.id)}건 기록`}
                                >
                                  <span>협진</span>
                                  <span className="font-mono text-teal-900">{patientHistoryCountMap.get(activePatient.id)}건</span>
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono">
                              {dateMode === 'week' && `${activePatient.date.slice(5)} `}
                              {activePatient.time} 내원 • {activePatient.patient?.patientId}
                            </div>
                          </div>
                          {/* Touchable Status Tag */}
                          <div onClick={(e) => e.stopPropagation()}>
                            {renderStatusTag(activePatient)}
                          </div>
                        </div>

                        {/* C.C */}
                        <div className="text-xs text-slate-700 bg-white/80 rounded-lg p-2 border border-slate-200/80 mb-2">
                          <div className="font-bold text-amber-800 text-[11px] truncate">
                            {activePatient.areaTitle}
                          </div>
                          <p className="text-slate-600 text-xs line-clamp-2 mt-0.5">
                            {activePatient.chiefComplaint}
                          </p>
                        </div>

                        {/* Actions */}
                        <div
                          className="flex items-center justify-between pt-1.5 border-t border-slate-200/60"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleCallPatient(activePatient)}
                              className="flex items-center gap-1 px-2.5 py-1 rounded text-xs font-bold bg-amber-50 hover:bg-amber-500 hover:text-white text-amber-800 border border-amber-200 transition-colors cursor-pointer"
                            >
                              <Volume2 className="w-3.5 h-3.5" />
                              <span>호출</span>
                            </button>
                            <button
                              onClick={() => setChairTargetPatient(activePatient)}
                              className="flex items-center gap-1 px-2 py-1 rounded text-xs font-bold bg-slate-100 hover:bg-teal-50 text-slate-700 hover:text-teal-700 border border-slate-200 transition-colors cursor-pointer"
                              title="체어 재배정 / 이동"
                            >
                              <Armchair className="w-3.5 h-3.5 text-teal-600" />
                              <span>이동</span>
                            </button>
                          </div>
                          <button
                            onClick={() => onSelectPatient(activePatient)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white transition-colors cursor-pointer"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>차트 작성</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-28 border border-dashed border-slate-200 rounded-xl bg-slate-50 text-slate-400 text-xs">
                        <Armchair className="w-6 h-6 text-slate-300 mb-1" />
                        <span>현재 진료 중인 환자가 없습니다</span>
                      </div>
                    )}

                    {/* Waiting list in this chair */}
                    {waitingPatients.length > 0 && (
                      <div className="space-y-1">
                        <span className="text-[11px] font-bold text-slate-600 block">
                          다음 대기 환자 ({waitingPatients.length}명):
                        </span>
                        <div className="space-y-1 max-h-28 overflow-y-auto">
                          {waitingPatients.map((wp) => (
                            <div
                              key={wp.id}
                              onClick={() => onSelectPatient(wp)}
                              className="p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs flex items-center justify-between cursor-pointer"
                            >
                              <div className="flex items-center gap-1.5 truncate">
                                <span className="font-bold text-slate-800">{wp.patient?.name}</span>
                                <span className="text-slate-400 font-mono text-[11px]">
                                  {dateMode === 'week' && `${wp.date.slice(5)} `}
                                  {wp.time}
                                </span>
                              </div>
                              <div
                                className="flex items-center gap-1.5"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  onClick={() => setChairTargetPatient(wp)}
                                  className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-slate-100 hover:bg-teal-50 text-slate-700 hover:text-teal-700 border border-slate-200 cursor-pointer flex items-center gap-0.5"
                                  title="체어 재배정 / 이동"
                                >
                                  <Armchair className="w-3 h-3 text-teal-600" />
                                  <span>이동</span>
                                </button>
                                {renderStatusTag(wp)}
                                <button
                                  onClick={() => handleCallPatient(wp)}
                                  className="text-[10px] px-2 py-0.5 rounded font-bold bg-amber-100 text-amber-800 hover:bg-amber-200 cursor-pointer"
                                >
                                  호출
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Completed count footer */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <span>
                      {dateMode === 'week' ? '기간 내 완료:' : '오늘 완료:'}
                    </span>
                    <span className="font-bold text-slate-700 font-mono">
                      {completedPatients.length}명
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Patient Status Change Tab Modal */}
      <PatientStatusModal
        patient={statusTargetPatient}
        isOpen={!!statusTargetPatient}
        onClose={() => setStatusTargetPatient(null)}
        onUpdateStatus={onUpdateStatus}
      />

      {/* Chair Assignment Change Modal */}
      <ChairAssignmentModal
        patient={chairTargetPatient}
        isOpen={!!chairTargetPatient}
        onClose={() => setChairTargetPatient(null)}
        onUpdateChair={onUpdateChair}
      />
    </div>
  );
};
