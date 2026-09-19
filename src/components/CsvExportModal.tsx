import React, { useState, useMemo, useEffect } from 'react';
import {
  FileSpreadsheet,
  X,
  Calendar,
  ChevronLeft,
  ChevronRight,
  CheckSquare,
  Square,
  Download,
  Search,
  Users,
  AlertCircle,
} from 'lucide-react';
import { QueuePatient, PatientStatus } from '../types';
import { exportPatientsToCSV } from '../utils/csvExport';
import {
  getTodayDateString,
  getKoreanDayOfWeek,
  parseDateString,
  formatDate,
} from '../utils/dateUtils';

interface CsvExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  patients: QueuePatient[];
  onToast?: (msg: string) => void;
}

export const CsvExportModal: React.FC<CsvExportModalProps> = ({
  isOpen,
  onClose,
  patients,
  onToast,
}) => {
  const todayStr = getTodayDateString();
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Filter patients for the selected day
  const dayPatients = useMemo(() => {
    return patients
      .filter((p) => p.date === selectedDate)
      .sort((a, b) => (a.time || '').localeCompare(b.time || ''));
  }, [patients, selectedDate]);

  // When selectedDate changes or modal opens, select all patients on that day by default
  useEffect(() => {
    if (isOpen) {
      const ids = dayPatients.map((p) => p.id);
      setSelectedIds(ids);
    }
  }, [isOpen, selectedDate, dayPatients.length]);

  // Available unique dates in the system with patient counts for quick switching
  const availableDates = useMemo(() => {
    const counts = new Map<string, number>();
    patients.forEach((p) => {
      if (p.date) {
        counts.set(p.date, (counts.get(p.date) || 0) + 1);
      }
    });
    return Array.from(counts.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [patients]);

  // Displayed patients based on search and status filters
  const filteredPatients = useMemo(() => {
    return dayPatients.filter((p) => {
      if (statusFilter !== 'all' && p.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        const matchName = p.patient?.name?.toLowerCase().includes(query);
        const matchId = p.patient?.patientId?.toLowerCase().includes(query);
        const matchDept = p.recommendedDepartment?.toLowerCase().includes(query);
        const matchChair = p.assignedChair?.toLowerCase().includes(query);
        const matchCC = p.chiefComplaint?.toLowerCase().includes(query);
        return matchName || matchId || matchDept || matchChair || matchCC;
      }
      return true;
    });
  }, [dayPatients, statusFilter, searchQuery]);

  if (!isOpen) return null;

  // Day navigation handlers
  const handlePrevDay = () => {
    try {
      const d = parseDateString(selectedDate);
      d.setDate(d.getDate() - 1);
      setSelectedDate(formatDate(d));
    } catch {
      setSelectedDate(todayStr);
    }
  };

  const handleNextDay = () => {
    try {
      const d = parseDateString(selectedDate);
      d.setDate(d.getDate() + 1);
      setSelectedDate(formatDate(d));
    } catch {
      setSelectedDate(todayStr);
    }
  };

  const handleSetToday = () => {
    setSelectedDate(todayStr);
  };

  // Selection toggle handlers
  const toggleSelectPatient = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const isAllSelected =
    filteredPatients.length > 0 &&
    filteredPatients.every((p) => selectedIds.includes(p.id));

  const toggleSelectAll = () => {
    if (isAllSelected) {
      // Unselect all displayed patients
      const displayedIds = new Set(filteredPatients.map((p) => p.id));
      setSelectedIds((prev) => prev.filter((id) => !displayedIds.has(id)));
    } else {
      // Select all displayed patients
      const newIds = new Set([...selectedIds, ...filteredPatients.map((p) => p.id)]);
      setSelectedIds(Array.from(newIds));
    }
  };

  // CSV download execution
  const handleDownload = () => {
    const targets = dayPatients.filter((p) => selectedIds.includes(p.id));
    if (targets.length === 0) {
      alert('CSV로 내보낼 환자가 선택되지 않았습니다. 최소 1명 이상 체크해주세요.');
      return;
    }

    const filename = `dentaltouch_${selectedDate}_${targets.length}cases.csv`;
    exportPatientsToCSV(targets, filename);
    if (onToast) {
      onToast(`${selectedDate} 환자 ${targets.length}명 CSV 다운로드가 완료되었습니다.`);
    }
    onClose();
  };

  const isToday = selectedDate === todayStr;
  const dayOfWeek = getKoreanDayOfWeek(selectedDate);
  const selectedCountInDay = dayPatients.filter((p) => selectedIds.includes(p.id)).length;

  return (
    <div
      id="modal-csv-export"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-white">환자 목록 CSV 내보내기</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  일별 선택 추출
                </span>
              </div>
              <p className="text-xs text-slate-400">
                하루 단위로 환자 목록을 조회하고, CSV 파일로 추출할 환자를 선택하세요.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Date Selector Bar (하루 단위 뷰) */}
        <div className="bg-slate-50 border-b border-slate-200 p-4 space-y-3 shrink-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Daily Navigation Controls */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handlePrevDay}
                className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                title="이전 날짜로 이동"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>이전일</span>
              </button>

              <div className="relative flex items-center">
                <Calendar className="w-4 h-4 text-teal-600 absolute left-2.5 pointer-events-none" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-white border border-slate-300 rounded-lg pl-8 pr-2.5 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-teal-500 cursor-pointer shadow-2xs"
                />
              </div>

              <button
                type="button"
                onClick={handleNextDay}
                className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                title="다음 날짜로 이동"
              >
                <span>다음일</span>
                <ChevronRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={handleSetToday}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                  isToday
                    ? 'bg-teal-600 text-white border-teal-600 shadow-2xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                오늘
              </button>
            </div>

            {/* Current Selected Date & Count Badge */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-800">
                {selectedDate} ({dayOfWeek}요일)
              </span>
              {isToday && (
                <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-teal-100 text-teal-800 border border-teal-200">
                  당일 진료
                </span>
              )}
              <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-200/80 text-slate-700">
                총 {dayPatients.length}명
              </span>
            </div>
          </div>

          {/* Quick Jump Dates Chips */}
          {availableDates.length > 1 && (
            <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-slate-200/70">
              <span className="text-[11px] font-bold text-slate-500 mr-1 shrink-0">
                내원 기록 일자 바로가기:
              </span>
              {availableDates.slice(0, 6).map(([date, count]) => {
                const active = date === selectedDate;
                return (
                  <button
                    key={date}
                    type="button"
                    onClick={() => setSelectedDate(date)}
                    className={`text-[11px] px-2 py-0.5 rounded-md border transition-colors cursor-pointer ${
                      active
                        ? 'bg-slate-800 text-white border-slate-800 font-bold'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {date} {date === todayStr ? '(오늘)' : ''} ({count}명)
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Filter & Selection Control Bar */}
        <div className="px-5 py-2.5 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleSelectAll}
              disabled={filteredPatients.length === 0}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold border border-slate-200 transition-colors cursor-pointer disabled:opacity-50"
            >
              {isAllSelected ? (
                <>
                  <Square className="w-3.5 h-3.5 text-slate-500" />
                  <span>전체 해제</span>
                </>
              ) : (
                <>
                  <CheckSquare className="w-3.5 h-3.5 text-teal-600" />
                  <span>전체 선택</span>
                </>
              )}
            </button>

            <span className="text-slate-500 font-medium">
              선택됨:{' '}
              <strong className="text-teal-700 font-bold">{selectedCountInDay}</strong> /{' '}
              {dayPatients.length}명
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Status Filter */}
            <div className="flex items-center gap-1">
              {(['all', '호출중', '진료대기', '진료중', '완료'] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`px-2 py-0.5 rounded text-[11px] font-semibold border transition-colors cursor-pointer ${
                    statusFilter === st
                      ? 'bg-teal-700 text-white border-teal-700'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {st === 'all' ? '전체 상태' : st}
                </button>
              ))}
            </div>

            {/* Quick Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="환자명, 등록번호..."
                className="pl-7 pr-2.5 py-1 text-[11px] bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:border-teal-500 w-36 sm:w-44"
              />
            </div>
          </div>
        </div>

        {/* Patients List Table */}
        <div className="flex-1 overflow-y-auto p-4">
          {filteredPatients.length > 0 ? (
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100/90 text-slate-700 font-bold border-b border-slate-200 select-none">
                  <tr>
                    <th className="p-3 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 cursor-pointer accent-teal-600"
                        title="전체 선택/해제"
                      />
                    </th>
                    <th className="p-3 w-16">내원시간</th>
                    <th className="p-3 w-32">환자명 (차트번호)</th>
                    <th className="p-3 w-20">성별/나이</th>
                    <th className="p-3 w-28">진료과 / 체어</th>
                    <th className="p-3 w-20">중증도</th>
                    <th className="p-3 w-20">진행상태</th>
                    <th className="p-3">주요 증상 (C.C)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {filteredPatients.map((p) => {
                    const isSelected = selectedIds.includes(p.id);
                    return (
                      <tr
                        key={p.id}
                        onClick={() => toggleSelectPatient(p.id)}
                        className={`transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-teal-50/70 hover:bg-teal-50'
                            : 'hover:bg-slate-50'
                        }`}
                      >
                        <td
                          className="p-3 text-center"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectPatient(p.id)}
                            className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 cursor-pointer accent-teal-600"
                          />
                        </td>
                        <td className="p-3 font-semibold text-slate-600 whitespace-nowrap">
                          {p.time || '-'}
                        </td>
                        <td className="p-3">
                          <div className="font-bold text-slate-900">{p.patient?.name}</div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            {p.patient?.patientId}
                          </div>
                        </td>
                        <td className="p-3 text-slate-600 whitespace-nowrap">
                          {p.patient?.gender} / {p.patient?.age}세
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          <div className="font-semibold text-teal-800">
                            {p.recommendedDepartment}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            {p.assignedChair || '체어 미지정'}
                          </div>
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          {p.triageLevel === '응급' ? (
                            <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                              응급
                            </span>
                          ) : p.triageLevel === '준응급' ? (
                            <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                              준응급
                            </span>
                          ) : (
                            <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                              일반
                            </span>
                          )}
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          <span
                            className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              p.status === '호출중'
                                ? 'bg-rose-50 text-rose-700 border border-rose-200 animate-pulse'
                                : p.status === '진료대기'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : p.status === '진료중'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-slate-100 text-slate-600 border border-slate-200'
                            }`}
                          >
                            {p.status}
                          </span>
                        </td>
                        <td className="p-3 text-slate-700 max-w-xs truncate" title={p.chiefComplaint}>
                          {p.chiefComplaint || '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-12 flex flex-col items-center justify-center text-center p-6 bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <Users className="w-10 h-10 text-slate-300 mb-2" />
              <p className="text-sm font-bold text-slate-700">
                선택한 날짜({selectedDate})에 해당하는 환자 데이터가 없습니다.
              </p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm">
                상단의 날짜 선택기나 바로가기 일자 버튼을 이용해 환자 기록이 있는 날짜를 선택해주세요.
              </p>
              {availableDates.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedDate(availableDates[0][0])}
                  className="mt-3 px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition-colors shadow-2xs cursor-pointer"
                >
                  최근 기록 날짜 ({availableDates[0][0]})로 이동
                </button>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="bg-slate-50 border-t border-slate-200 px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <span className="font-mono bg-white px-2 py-1 rounded border border-slate-200">
              dentaltouch_{selectedDate}_{selectedCountInDay}cases.csv
            </span>
            <span>
              선택:{' '}
              <strong className="text-emerald-700 font-bold">{selectedCountInDay}명</strong>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs border border-slate-200 transition-colors cursor-pointer"
            >
              취소
            </button>

            <button
              type="button"
              onClick={handleDownload}
              disabled={selectedCountInDay === 0}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-2 transition-all shadow-md shadow-emerald-600/20 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4" />
              <span>선택한 환자 CSV 다운로드 ({selectedCountInDay}명)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
