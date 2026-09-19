import React, { useState } from 'react';
import {
  Activity,
  User,
  Stethoscope,
  Shield,
  CheckCircle2,
  Lock,
  ArrowRight,
  Sparkles,
  Building2,
  BadgeCheck,
  Eye,
  FileEdit,
} from 'lucide-react';
import { UserAccount, UserRole, DentalDepartment } from '../types';

interface LoginScreenProps {
  onLogin: (account: UserAccount) => void;
}

// Preset Accounts for convenient clinical demonstration & hospital workflow
const PRESET_STAFF_ACCOUNTS: UserAccount[] = [
  {
    id: 'staff-01',
    name: '김민경',
    role: 'staff',
    title: '원무데스크 수석간호사',
    room: '원무접수처',
  },
  {
    id: 'staff-02',
    name: '박지선',
    role: 'staff',
    title: '진료지원팀 코디네이터',
    room: '중앙안내데스크',
  },
];

const PRESET_DOCTOR_ACCOUNTS: (UserAccount & { department: DentalDepartment })[] = [
  {
    id: 'doc-01',
    name: '김민준',
    role: 'doctor',
    title: '주임교수 / 보존과 전문의',
    department: '보존과',
    room: '보존 1진료실',
    licenseNumber: '치과의사 제41829호',
  },
  {
    id: 'doc-02',
    name: '박서연',
    role: 'doctor',
    title: '진료과장 / 치주과 전문의',
    department: '치주과',
    room: '치주 2진료실',
    licenseNumber: '치과의사 제45102호',
  },
  {
    id: 'doc-03',
    name: '이재혁',
    role: 'doctor',
    title: '임상교수 / 구강악안면외과 전문의',
    department: '구강외과',
    room: '외과 1진료실 (수술실)',
    licenseNumber: '치과의사 제39912호',
  },
  {
    id: 'doc-04',
    name: '정우진',
    role: 'doctor',
    title: '진료과장 / 구강내과 전문의',
    department: '구강내과',
    room: '구강내과 1진료실',
    licenseNumber: '치과의사 제47219호',
  },
  {
    id: 'doc-05',
    name: '최수민',
    role: 'doctor',
    title: '임상과장 / 치과보철과 전문의',
    department: '보철과',
    room: '보철 1진료실',
    licenseNumber: '치과의사 제43301호',
  },
];

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [activeTab, setActiveTab] = useState<UserRole>('doctor');
  const [selectedStaff, setSelectedStaff] = useState<UserAccount>(PRESET_STAFF_ACCOUNTS[0]);
  const [selectedDoctor, setSelectedDoctor] = useState<UserAccount>(PRESET_DOCTOR_ACCOUNTS[0]);
  const [customId, setCustomId] = useState('');
  const [customPassword, setCustomPassword] = useState('••••••••');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setTimeout(() => {
      if (activeTab === 'staff') {
        onLogin(selectedStaff);
      } else {
        onLogin(selectedDoctor);
      }
      setIsLoggingIn(false);
    }, 250);
  };

  const handleQuickLogin = (account: UserAccount) => {
    setIsLoggingIn(true);
    setTimeout(() => {
      onLogin(account);
      setIsLoggingIn(false);
    }, 150);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-center items-center p-4 sm:p-6 selection:bg-teal-600 selection:text-white relative overflow-hidden">
      {/* Background Subtle Medical Grid Pattern */}
      <div className="absolute inset-0 opacity-5 pointer-events-none bg-[radial-gradient(#14b8a6_1px,transparent_1px)] [background-size:24px_24px]" />

      {/* Main Container */}
      <div className="w-full max-w-2xl z-10">
        {/* Hospital Header Branding */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-teal-500/10 border border-teal-500/30 text-teal-400 mb-3 shadow-lg shadow-teal-500/10">
            <Activity className="w-8 h-8" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center justify-center gap-2">
            오즈치과대학교병원 진료/접수 관리 시스템 (DentalTouch)
          </h1>
          <p className="text-sm text-slate-400 mt-1.5 font-medium">
            진료/접수 관리 시스템 및 트리아지 관제 통합 포털
          </p>
        </div>

        {/* Card Box */}
        <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl shadow-2xl backdrop-blur-md overflow-hidden">
          {/* Two Main Role Tabs: 일반 (원무/데스크) vs 의사 (진료의) */}
          <div className="grid grid-cols-2 border-b border-slate-700/80 bg-slate-850">
            <button
              id="login-tab-staff"
              type="button"
              onClick={() => setActiveTab('staff')}
              className={`py-4 px-4 text-center font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer relative ${
                activeTab === 'staff'
                  ? 'text-teal-400 bg-slate-800'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <User className="w-4 h-4" />
              <span>일반 (원무 / 간호 / 데스크)</span>
              {activeTab === 'staff' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-500" />
              )}
            </button>

            <button
              id="login-tab-doctor"
              type="button"
              onClick={() => setActiveTab('doctor')}
              className={`py-4 px-4 text-center font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer relative ${
                activeTab === 'doctor'
                  ? 'text-teal-400 bg-slate-800'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Stethoscope className="w-4 h-4" />
              <span>치과의사 (진료의 진료차트 워크스테이션)</span>
              {activeTab === 'doctor' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-500" />
              )}
            </button>
          </div>

          <div className="p-6 sm:p-8 space-y-6">
            {/* Role Notice & Security Scope */}
            {activeTab === 'staff' ? (
              <div className="rounded-xl p-4 bg-slate-900/60 border border-slate-700/70 text-xs text-slate-300 space-y-2">
                <div className="flex items-center gap-2 text-teal-400 font-bold">
                  <Shield className="w-4 h-4" />
                  <span>원무 / 데스크 진료지원 권한</span>
                </div>
                <p className="text-slate-300 leading-relaxed">
                  실시간 대기열 관제, 환자 접수, 체어 배정 및 진료기록 열람이 가능합니다.
                </p>
                <div className="flex items-center gap-1.5 text-[11px] text-amber-400 bg-amber-400/10 px-2.5 py-1.5 rounded-lg border border-amber-400/20">
                  <Lock className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>의료법에 따라 의사 진단소견 및 치료계획 편집은 제한(열람 전용)됩니다.</span>
                </div>
              </div>
            ) : (
              <div className="rounded-xl p-4 bg-slate-900/60 border border-teal-500/30 text-xs text-slate-300 space-y-2">
                <div className="flex items-center gap-2 text-teal-400 font-bold">
                  <Stethoscope className="w-4 h-4" />
                  <span>치과의사 전용 진료 워크스테이션 권한</span>
                </div>
                <p className="text-slate-300 leading-relaxed">
                  당일 진료 환자를 순서대로 확인하고, 환자 정보·예진 문진내용·추정 감별진단군 및 누적 과거 히스토리를 대조하며 실시간 진료차팅을 진행합니다.
                </p>
                <div className="flex items-center gap-1.5 text-[11px] text-teal-300 bg-teal-500/10 px-2.5 py-1.5 rounded-lg border border-teal-500/20">
                  <FileEdit className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>의사 진단소견, 치료계획, 원내외 처방 작성 및 즉시 저장이 가능합니다.</span>
                </div>
              </div>
            )}

            {/* Quick Demo Account Selector */}
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <BadgeCheck className="w-3.5 h-3.5 text-teal-400" />
                  <span>
                    {activeTab === 'staff' ? '원무 / 간호 계정 선택' : '진료의 (담당 교수/과장) 선택'}
                  </span>
                </label>
                <span className="text-[11px] text-slate-400">클릭 시 즉시 로그인</span>
              </div>

              {activeTab === 'staff' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {PRESET_STAFF_ACCOUNTS.map((acc) => {
                    const isSelected = selectedStaff.id === acc.id;
                    return (
                      <button
                        key={acc.id}
                        type="button"
                        onClick={() => {
                          setSelectedStaff(acc);
                          handleQuickLogin(acc);
                        }}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'bg-teal-500/15 border-teal-500/60 ring-1 ring-teal-500/40 text-white'
                            : 'bg-slate-900/50 border-slate-700 hover:border-slate-600 hover:bg-slate-900 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-sm text-white">{acc.name}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-700/80 text-slate-300">
                            {acc.room}
                          </span>
                        </div>
                        <span className="text-xs text-teal-400 mt-1">{acc.title}</span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {PRESET_DOCTOR_ACCOUNTS.map((doc) => {
                    const isSelected = selectedDoctor.id === doc.id;
                    return (
                      <button
                        key={doc.id}
                        type="button"
                        onClick={() => {
                          setSelectedDoctor(doc);
                          handleQuickLogin(doc);
                        }}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'bg-teal-500/15 border-teal-500/60 ring-1 ring-teal-500/40 text-white'
                            : 'bg-slate-900/50 border-slate-700 hover:border-slate-600 hover:bg-slate-900 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-sm text-white">
                            {doc.name} <span className="text-xs font-normal text-slate-300">({doc.department})</span>
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-900/50 text-teal-300 border border-teal-700/40">
                            {doc.room}
                          </span>
                        </div>
                        <div className="text-[11px] text-teal-400 mt-1 truncate">{doc.title}</div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">{doc.licenseNumber}</div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Direct Login Form */}
            <form onSubmit={handleLoginSubmit} className="space-y-4 pt-2 border-t border-slate-700/60">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-400 mb-1">
                    사번 / 면허번호
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={
                      activeTab === 'staff'
                        ? `${selectedStaff.id} (${selectedStaff.name})`
                        : `${selectedDoctor.id} (${selectedDoctor.name})`
                    }
                    className="w-full bg-slate-900/80 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 font-mono focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-400 mb-1">
                    인증 비밀번호
                  </label>
                  <input
                    type="password"
                    readOnly
                    value="••••••••••••"
                    className="w-full bg-slate-900/80 border border-slate-700 rounded-xl px-3 py-2 text-slate-400 font-mono focus:outline-none"
                  />
                </div>
              </div>

              <button
                id="btn-login-submit"
                type="submit"
                disabled={isLoggingIn}
                className="w-full py-3 px-4 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-sm transition-all shadow-lg shadow-teal-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <span>
                  {activeTab === 'staff'
                    ? `[일반] ${selectedStaff.name} 계정으로 로그인`
                    : `[의사] ${selectedDoctor.name} 진료실 워크스테이션 입장`}
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>

          {/* Footer Info */}
          <div className="px-6 py-3.5 bg-slate-900/80 border-t border-slate-700/60 flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-teal-400" />
              오즈치과대학교병원 전산관리시스템 (DentalTouch)
            </span>
            <span>의료보안 규정 준수</span>
          </div>
        </div>
      </div>
    </div>
  );
};
