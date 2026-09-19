import React, { useState, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Users,
  Volume2,
  FileText,
  Printer,
  Clock,
  Armchair,
} from 'lucide-react';
import { QueuePatient, DentalDepartment, PatientStatus } from '../types';
import { callPatientSmart } from '../utils/audioChime';
import { getTodayDateString, getKoreanDayOfWeek } from '../utils/dateUtils';
import { ChairAssignmentModal } from './ChairAssignmentModal';

interface CalendarViewProps {
  patients: QueuePatient[];
  onSelectPatient: (patient: QueuePatient) => void;
  onUpdateStatus: (patientId: string, newStatus: PatientStatus) => void;
  onUpdateChair?: (patientId: string, newChair: string) => void;
  onPrintPatient: (patient: QueuePatient) => void;
}

const DEPARTMENTS: DentalDepartment[] = ['보존과', '치주과', '보철과', '구강외과', '구강내과'];

export const CalendarView: React.FC<CalendarViewProps> = ({
  patients,
  onSelectPatient,
  onUpdateStatus,
  onUpdateChair,
  onPrintPatient,
}) => {
  // Year & Month: default to current real-time year and month
  const today = new Date();
  const [year, setYear] = useState<number>(today.getFullYear());
  const [month, setMonth] = useState<number>(today.getMonth() + 1); // 1-indexed
  const todayDateStr = getTodayDateString();
  const [selectedDateStr, setSelectedDateStr] = useState<string>(todayDateStr); // Default to Today
  const [selectedDept, setSelectedDept] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [callingId, setCallingId] = useState<string | null>(null);
  const [chairTargetPatient, setChairTargetPatient] = useState<QueuePatient | null>(null);

  // Month navigation
  const handlePrevMonth = () => {
    if (month === 1) {
      setYear(year - 1);
      setMonth(12);
    } else {
      setMonth(month - 1);
    }
  };

  const handleNextMonth = () => {
    if (month === 12) {
      setYear(year + 1);
      setMonth(1);
    } else {
      setMonth(month + 1);
    }
  };

  // Build calendar matrix
  const { daysInMonth, firstDayOfWeek, calendarDays } = useMemo(() => {
    const daysCount = new Date(year, month, 0).getDate();
    const firstDay = new Date(year, month - 1, 1).getDay(); // 0 = Sun, 6 = Sat

    const days: Array<{ day: number | null; dateStr: string | null }> = [];
    // Leading blanks
    for (let i = 0; i < firstDay; i++) {
      days.push({ day: null, dateStr: null });
    }
    // Days in current month
    for (let d = 1; d <= daysCount; d++) {
      const dayStr = d < 10 ? `0${d}` : `${d}`;
      const monthStr = month < 10 ? `0${month}` : `${month}`;
      const dateStr = `${year}-${monthStr}-${dayStr}`;
      days.push({ day: d, dateStr });
    }

    return { daysInMonth: daysCount, firstDayOfWeek: firstDay, calendarDays: days };
  }, [year, month]);

  // Aggregate patients by date
  const patientsByDate = useMemo(() => {
    const map = new Map<string, QueuePatient[]>();
    patients.forEach((p) => {
      const arr = map.get(p.date) || [];
      arr.push(p);
      map.set(p.date, arr);
    });
    return map;
  }, [patients]);

  // Patients on the selected date
  const selectedDatePatients = useMemo(() => {
    const list = patientsByDate.get(selectedDateStr) || [];
    const filtered = list.filter((p) => {
      if (selectedDept !== 'all' && p.recommendedDepartment !== selectedDept) {
        return false;
      }
      if (selectedStatus !== 'all' && p.status !== selectedStatus) {
        return false;
      }
      return true;
    });

    const seen = new Set<string>();
    return filtered.filter((p) => {
      if (!p.id || seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    });
  }, [patientsByDate, selectedDateStr, selectedDept, selectedStatus]);

  const handleCall = async (patient: QueuePatient) => {
    setCallingId(patient.id);
    if (patient.status !== '호출중') {
      onUpdateStatus(patient.id, '호출중');
    }
    await callPatientSmart({
      patientName: patient.patient?.name,
      locationTitle: patient.locationTitle,
      recommendedRoom: patient.recommendedRoom,
      assignedChair: patient.assignedChair,
    });
    setTimeout(() => setCallingId(null), 3000);
  };

  const getDeptBadgeClass = (dept: string) => {
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

  const daysOfWeek = ['일', '월', '화', '수', '목', '금', '토'];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
      {/* Calendar Grid Section (7 cols on lg) */}
      <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
        {/* Calendar Header Navigation */}
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-teal-50 text-teal-600 border border-teal-200">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>
                  {year}년 {month}월
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 font-bold border border-teal-200">
                  진료 예약 캘린더
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                날짜를 클릭하면 해당 일자의 환자 차트 목록을 조회합니다
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => {
                const now = new Date();
                setYear(now.getFullYear());
                setMonth(now.getMonth() + 1);
                setSelectedDateStr(todayDateStr);
              }}
              className="px-3 py-1.5 text-xs font-bold rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 transition-colors cursor-pointer"
            >
              오늘 ({todayDateStr.slice(5).replace('-', '.')} {getKoreanDayOfWeek(todayDateStr)})
            </button>
            <button
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
              title="이전 달"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
              title="다음 달"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Days of week header */}
        <div className="grid grid-cols-7 gap-1 text-center mb-1 text-xs font-bold text-slate-500">
          {daysOfWeek.map((day, idx) => (
            <div
              key={day}
              className={`py-1.5 ${
                idx === 0 ? 'text-rose-600' : idx === 6 ? 'text-sky-600' : 'text-slate-600'
              }`}
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid Days */}
        <div className="grid grid-cols-7 gap-1.5">
          {calendarDays.map((item, index) => {
            if (!item.day || !item.dateStr) {
              return <div key={`empty-${index}`} className="h-22 bg-slate-50/50 rounded-xl" />;
            }

            const dayPatients = patientsByDate.get(item.dateStr) || [];
            const isSelected = selectedDateStr === item.dateStr;
            const isToday = item.dateStr === todayDateStr;
            const dayOfWeek = new Date(year, month - 1, item.day).getDay();

            const completedCount = dayPatients.filter((p) => p.status === '완료').length;
            const waitingCount = dayPatients.filter((p) => p.status === '진료대기').length;
            const activeCount = dayPatients.filter(
              (p) => p.status === '진료중' || p.status === '호출중'
            ).length;

            return (
              <button
                key={item.dateStr}
                onClick={() => setSelectedDateStr(item.dateStr!)}
                className={`h-22 p-2 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer relative group ${
                  isSelected
                    ? 'border-teal-500 bg-teal-50/60 ring-2 ring-teal-500/20 shadow-xs'
                    : isToday
                    ? 'border-teal-400 bg-teal-50/20 hover:bg-slate-50'
                    : 'border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300'
                }`}
              >
                {/* Day Number and Today Indicator */}
                <div className="flex items-center justify-between w-full">
                  <span
                    className={`text-xs font-bold ${
                      isSelected
                        ? 'text-teal-900 font-extrabold'
                        : isToday
                        ? 'text-teal-700 font-extrabold'
                        : dayOfWeek === 0
                        ? 'text-rose-600'
                        : dayOfWeek === 6
                        ? 'text-sky-600'
                        : 'text-slate-800'
                    }`}
                  >
                    {item.day}
                  </span>
                  {isToday && (
                    <span className="text-[9px] px-1.5 py-0.2 rounded font-extrabold bg-teal-600 text-white">
                      오늘
                    </span>
                  )}
                  {dayPatients.length > 0 && (
                    <span className="text-[10px] font-mono font-bold px-1 rounded bg-slate-100 text-slate-700">
                      {dayPatients.length}건
                    </span>
                  )}
                </div>

                {/* Day Status Badges */}
                <div className="w-full space-y-0.5 mt-1">
                  {activeCount > 0 && (
                    <div className="text-[9px] truncate px-1 py-0.2 rounded font-semibold bg-amber-50 text-amber-800 border border-amber-200 flex items-center justify-between">
                      <span>진료/호출</span>
                      <span className="font-mono font-bold">{activeCount}</span>
                    </div>
                  )}
                  {waitingCount > 0 && (
                    <div className="text-[9px] truncate px-1 py-0.2 rounded font-semibold bg-sky-50 text-sky-800 border border-sky-200 flex items-center justify-between">
                      <span>대기</span>
                      <span className="font-mono font-bold">{waitingCount}</span>
                    </div>
                  )}
                  {completedCount > 0 && (
                    <div className="text-[9px] truncate px-1 py-0.2 rounded font-medium bg-slate-100 text-slate-600 flex items-center justify-between">
                      <span>완료</span>
                      <span className="font-mono">{completedCount}</span>
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Day Patient Details Panel (5 cols on lg) */}
      <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col">
        {/* Panel Header */}
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900">
                {selectedDateStr} 환자 명단
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-50 text-teal-700 border border-teal-200">
                총 {selectedDatePatients.length}명
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              환자를 클릭하면 상세 진료차트 열람 및 진단/치료계획 작성이 가능합니다
            </p>
          </div>
        </div>

        {/* Filter Chips inside Selected Date */}
        <div className="space-y-2 mb-3">
          {/* Department Filter */}
          <div className="flex items-center gap-1 overflow-x-auto text-[11px] pb-1">
            <button
              onClick={() => setSelectedDept('all')}
              className={`px-2 py-0.5 rounded-md font-semibold border transition-colors cursor-pointer ${
                selectedDept === 'all'
                  ? 'bg-teal-600 text-white border-teal-600'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              전체 분과
            </button>
            {DEPARTMENTS.map((dept) => (
              <button
                key={dept}
                onClick={() => setSelectedDept(dept)}
                className={`px-2 py-0.5 rounded-md font-semibold border transition-colors cursor-pointer whitespace-nowrap ${
                  selectedDept === dept
                    ? getDeptBadgeClass(dept) + ' font-bold'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {dept}
              </button>
            ))}
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1 text-[11px]">
            {['all', '호출중', '진료대기', '진료중', '완료'].map((st) => (
              <button
                key={st}
                onClick={() => setSelectedStatus(st)}
                className={`px-2 py-0.5 rounded-md font-semibold border transition-colors cursor-pointer ${
                  selectedStatus === st
                    ? 'bg-teal-600 text-white font-bold border-teal-600'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {st === 'all' ? '전체 상태' : st}
              </button>
            ))}
          </div>
        </div>

        {/* Patients List on Selected Date */}
        <div className="space-y-2.5 flex-1 overflow-y-auto pr-1 max-h-[550px]">
          {selectedDatePatients.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-slate-400 text-xs text-center border border-dashed border-slate-200 rounded-xl p-4">
              <Users className="w-8 h-8 text-slate-300 mb-2" />
              <span>해당 일자에 등록된 환자가 없습니다</span>
            </div>
          ) : (
            selectedDatePatients.map((patient) => {
              const isCalling = callingId === patient.id;

              return (
                <div
                  key={patient.id}
                  className={`p-3.5 rounded-xl border transition-all bg-white hover:border-teal-400 hover:shadow-xs group cursor-pointer ${
                    isCalling ? 'border-amber-400 ring-2 ring-amber-400/20 bg-amber-50/30' : 'border-slate-200'
                  }`}
                  onClick={() => onSelectPatient(patient)}
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900 group-hover:text-teal-700 transition-colors">
                          {patient.patient?.name}
                        </span>
                        <span className="text-xs text-slate-500">
                          ({patient.patient?.gender}/{patient.patient?.age}세)
                        </span>
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded font-bold border ${getDeptBadgeClass(
                            patient.recommendedDepartment
                          )}`}
                        >
                          {patient.recommendedDepartment}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5 flex items-center gap-1.5 flex-wrap">
                        <span>{patient.patient?.patientId}</span>
                        <span>•</span>
                        <span className="text-teal-700 font-bold">{patient.time}</span>
                        <span>•</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setChairTargetPatient(patient);
                          }}
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-semibold bg-slate-100 hover:bg-teal-50 text-slate-700 hover:text-teal-800 border border-slate-200 transition-colors cursor-pointer"
                          title="배정 체어 변경"
                        >
                          <Armchair className="w-3 h-3 text-teal-600" />
                          <span>{patient.assignedChair || '미지정'}</span>
                        </button>
                      </div>
                    </div>

                    <span
                      className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${
                        patient.status === '호출중'
                          ? 'bg-amber-50 text-amber-800 border border-amber-200'
                          : patient.status === '진료대기'
                          ? 'bg-sky-50 text-sky-800 border border-sky-200'
                          : patient.status === '진료중'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}
                    >
                      {patient.status}
                    </span>
                  </div>

                  {/* C.C and Oral Area */}
                  <div className="text-xs text-slate-700 bg-slate-50 rounded-lg p-2 border border-slate-200 mb-2">
                    <div className="text-amber-800 font-bold text-[11px] mb-0.5">
                      {patient.areaTitle}
                    </div>
                    <p className="line-clamp-2 text-slate-600">{patient.chiefComplaint}</p>
                  </div>

                  {/* Actions inside card */}
                  <div
                    className="flex items-center justify-between pt-2 border-t border-slate-100"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => handleCall(patient)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-50 hover:bg-amber-500 hover:text-white text-amber-800 border border-amber-200 transition-colors cursor-pointer"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>{isCalling ? '호출중...' : '스마트 호출'}</span>
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onPrintPatient(patient)}
                        className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                        title="차트 인쇄"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onSelectPatient(patient)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-teal-600 text-white hover:bg-teal-700 transition-colors cursor-pointer"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>차팅 열기</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Chair Assignment Modal */}
      {onUpdateChair && (
        <ChairAssignmentModal
          patient={chairTargetPatient}
          isOpen={!!chairTargetPatient}
          onClose={() => setChairTargetPatient(null)}
          onUpdateChair={onUpdateChair}
        />
      )}
    </div>
  );
};
