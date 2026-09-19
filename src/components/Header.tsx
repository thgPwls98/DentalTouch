import React, { useState, useEffect } from 'react';
import {
  Activity,
  Calendar as CalendarIcon,
  LayoutGrid,
  UserPlus,
  FileSpreadsheet,
  RefreshCw,
  Clock,
  Radio,
  User,
  LogOut,
  Stethoscope,
  Shield,
  Trash2,
} from 'lucide-react';
import { QueuePatient, UserAccount } from '../types';
import { getTodayDateString, getKoreanDayOfWeek, parseDateString } from '../utils/dateUtils';

interface HeaderProps {
  patients: QueuePatient[];
  activeView: 'queue' | 'calendar';
  onViewChange: (view: 'queue' | 'calendar') => void;
  onOpenKiosk: () => void;
  onExportCSV: () => void;
  isSyncing: boolean;
  currentUser?: UserAccount | null;
  onLogout?: () => void;
  onSwitchToDoctor?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  patients,
  activeView,
  onViewChange,
  onOpenKiosk,
  onExportCSV,
  isSyncing,
  currentUser,
  onLogout,
  onSwitchToDoctor,
}) => {
  const [currentTime, setCurrentTime] = useState<string>('');
  const [todayStr, setTodayStr] = useState<string>(getTodayDateString());

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const formatted = now.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'short',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });
      setCurrentTime(formatted);

      // Automatically update date when midnight passes
      const currentDateStr = getTodayDateString();
      if (currentDateStr !== todayStr) {
        setTodayStr(currentDateStr);
      }
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, [todayStr]);

  // Today's counts based on the dynamic real-time todayStr
  const todayPatients = patients.filter((p) => p.date === todayStr);
  const callingCount = todayPatients.filter((p) => p.status === '호출중').length;
  const waitingCount = todayPatients.filter((p) => p.status === '진료대기').length;
  const inProgressCount = todayPatients.filter((p) => p.status === '진료중').length;
  const completedCount = todayPatients.filter((p) => p.status === '완료').length;

  return (
    <header className="bg-white border-b border-slate-200 text-slate-800 sticky top-0 z-30 shadow-xs">
      {/* Top Banner */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-4">
        {/* Hospital Branding */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-600 font-bold shadow-xs">
            <Activity className="w-6 h-6 text-teal-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-slate-900 flex items-center gap-2">
                오즈치과대학교병원 진료/접수 관리 시스템
              </h1>
              <span className="text-[11px] px-2 py-0.5 rounded-full font-bold bg-teal-50 text-teal-700 border border-teal-200">
                DentalTouch
              </span>
            </div>
            <p className="text-xs text-slate-500">
              실시간 치과 진료/접수 관리 & 환자 대기열 관제 시스템
            </p>
          </div>
        </div>

        {/* Real-time Status and Clock */}
        <div className="flex items-center gap-3 text-xs">
          {/* Live Firestore indicator */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 shadow-2xs">
            <Radio
              className={`w-3.5 h-3.5 ${
                isSyncing ? 'text-amber-500 animate-spin' : 'text-emerald-500 animate-pulse'
              }`}
            />
            <span className="font-medium">
              {isSyncing ? '동기화 중...' : 'Firestore 실시간 연결'}
            </span>
            <span className="px-1.5 py-0.5 rounded text-[11px] font-bold bg-slate-200/80 text-slate-700 font-mono">
              {patients.length}건
            </span>
          </div>

          {/* Clock */}
          <div className="hidden md:flex items-center gap-1.5 text-slate-600 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 font-mono text-xs">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>{currentTime || '2026년 9월 10일'}</span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Logged in User Profile Info */}
          {currentUser && (
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-xs">
              <div
                className={`w-6 h-6 rounded-md flex items-center justify-center font-bold text-white text-[11px] ${
                  currentUser.role === 'doctor' ? 'bg-teal-600' : 'bg-slate-700'
                }`}
              >
                {currentUser.role === 'doctor' ? (
                  <Stethoscope className="w-3.5 h-3.5" />
                ) : (
                  <User className="w-3.5 h-3.5" />
                )}
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1 font-bold text-slate-800 leading-tight">
                  <span>{currentUser.name}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                      currentUser.role === 'doctor'
                        ? 'bg-teal-50 text-teal-700 border border-teal-200'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {currentUser.role === 'doctor' ? '치과의사' : '일반(원무)'}
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 font-normal">
                  {currentUser.title}
                </span>
              </div>
            </div>
          )}

          {/* Switch to Doctor Workstation button (if user is doctor or wants to access doctor station) */}
          {onSwitchToDoctor && (
            <button
              onClick={onSwitchToDoctor}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-lg bg-slate-800 hover:bg-slate-900 text-white transition-colors shadow-2xs cursor-pointer"
              title="의사 전용 진료차트 화면으로 이동"
            >
              <Stethoscope className="w-3.5 h-3.5 text-teal-400" />
              <span>의사 차팅화면</span>
            </button>
          )}

          <button
            id="btn-open-kiosk"
            onClick={onOpenKiosk}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg bg-teal-600 hover:bg-teal-700 text-white transition-colors shadow-sm cursor-pointer"
            title="신규 환자 접수 창구 열기"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>신규 환자 접수</span>
          </button>

          <button
            id="btn-export-csv"
            onClick={onExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 transition-colors shadow-2xs cursor-pointer"
            title="환자 목록 CSV 엑셀 선택 내보내기"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden sm:inline">CSV 내보내기</span>
          </button>

          {/* Logout Button */}
          {onLogout && (
            <button
              id="btn-logout"
              onClick={onLogout}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-colors cursor-pointer"
              title="로그아웃 및 로그인 화면으로 이동"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">로그아웃</span>
            </button>
          )}
        </div>
      </div>

      {/* Navigation Subbar & Daily Stats */}
      <div className="bg-slate-50 border-t border-slate-200 px-4 sm:px-6 lg:px-8 py-2">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Main Module Tabs (대기열 vs 캘린더) */}
          <div className="flex items-center bg-slate-200/80 rounded-lg p-0.5 border border-slate-200">
            <button
              id="view-tab-queue"
              onClick={() => onViewChange('queue')}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                activeView === 'queue'
                  ? 'bg-white text-teal-700 shadow-xs border border-slate-200/60'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>실시간 환자 관제</span>
            </button>
            <button
              id="view-tab-calendar"
              onClick={() => onViewChange('calendar')}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                activeView === 'calendar'
                  ? 'bg-white text-teal-700 shadow-xs border border-slate-200/60'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CalendarIcon className="w-3.5 h-3.5" />
              <span>진료 일정 캘린더 (8~10월)</span>
            </button>
          </div>

          {/* Today's Triage Stats Summary */}
          <div className="flex items-center gap-2 overflow-x-auto text-xs py-0.5">
            <span className="text-slate-500 font-semibold text-[11px] whitespace-nowrap">
              오늘 진료 현황 ({todayStr.slice(5).replace('-', '.')} {getKoreanDayOfWeek(todayStr)}):
            </span>

            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-50 border border-amber-200 text-amber-800 font-semibold">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
              <span>호출중</span>
              <span className="font-bold text-amber-900">{callingCount}</span>
            </div>

            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-sky-50 border border-sky-200 text-sky-800 font-semibold">
              <span className="w-2 h-2 rounded-full bg-sky-500" />
              <span>진료대기</span>
              <span className="font-bold text-sky-900">{waitingCount}</span>
            </div>

            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>진료중</span>
              <span className="font-bold text-emerald-900">{inProgressCount}</span>
            </div>

            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200 text-slate-700 font-semibold">
              <span className="w-2 h-2 rounded-full bg-slate-400" />
              <span>완료</span>
              <span className="font-bold text-slate-900">{completedCount}</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
