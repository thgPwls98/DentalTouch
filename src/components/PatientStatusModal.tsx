import React, { useState } from 'react';
import {
  X,
  Volume2,
  Clock,
  Stethoscope,
  CheckCircle2,
  Check,
  User,
  Armchair,
  Sparkles,
} from 'lucide-react';
import { QueuePatient, PatientStatus } from '../types';
import { callPatientSmart } from '../utils/audioChime';

interface PatientStatusModalProps {
  patient: QueuePatient | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateStatus: (patientId: string, newStatus: PatientStatus) => Promise<void> | void;
}

interface StatusOption {
  status: PatientStatus;
  label: string;
  subText: string;
  icon: React.ComponentType<{ className?: string }>;
  badgeColor: string;
  activeBorder: string;
  activeBg: string;
  dotColor: string;
}

const STATUS_OPTIONS: StatusOption[] = [
  {
    status: '호출중',
    label: '호출중',
    subText: '대기실 스마트 음성 안내 및 호출 전광판 표시',
    icon: Volume2,
    badgeColor: 'bg-amber-50 text-amber-800 border-amber-300',
    activeBorder: 'border-amber-500 ring-2 ring-amber-400/20',
    activeBg: 'bg-amber-50/70',
    dotColor: 'bg-amber-500',
  },
  {
    status: '진료대기',
    label: '진료대기',
    subText: '접수 완료 후 대기실에서 진료 대기 중',
    icon: Clock,
    badgeColor: 'bg-sky-50 text-sky-800 border-sky-300',
    activeBorder: 'border-sky-500 ring-2 ring-sky-400/20',
    activeBg: 'bg-sky-50/70',
    dotColor: 'bg-sky-500',
  },
  {
    status: '진료중',
    label: '진료중',
    subText: '배정된 체어에서 의사/위생사 진료 및 처치 진행',
    icon: Stethoscope,
    badgeColor: 'bg-emerald-50 text-emerald-800 border-emerald-300',
    activeBorder: 'border-emerald-500 ring-2 ring-emerald-400/20',
    activeBg: 'bg-emerald-50/70',
    dotColor: 'bg-emerald-500',
  },
  {
    status: '완료',
    label: '완료 (진료종료)',
    subText: '모든 진료 및 처치 완료, 수납 및 다음 예약 대기',
    icon: CheckCircle2,
    badgeColor: 'bg-slate-100 text-slate-800 border-slate-300',
    activeBorder: 'border-slate-600 ring-2 ring-slate-400/20',
    activeBg: 'bg-slate-100',
    dotColor: 'bg-slate-600',
  },
];

export const PatientStatusModal: React.FC<PatientStatusModalProps> = ({
  patient,
  isOpen,
  onClose,
  onUpdateStatus,
}) => {
  if (!isOpen || !patient) return null;

  const [autoVoiceCall, setAutoVoiceCall] = useState<boolean>(true);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);

  const handleSelectStatus = async (targetStatus: PatientStatus) => {
    if (isUpdating) return;
    setIsUpdating(true);
    try {
      // If switching to '호출중' and auto voice call is checked, trigger chime
      if (targetStatus === '호출중' && autoVoiceCall) {
        callPatientSmart({
          patientName: patient.patient?.name || '환자',
          locationTitle: patient.locationTitle,
          recommendedRoom: patient.recommendedRoom,
          assignedChair: patient.assignedChair,
        });
      }

      await onUpdateStatus(patient.id, targetStatus);
      onClose();
    } catch (err) {
      console.error('Failed to change patient status:', err);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-fade-in">
      <div
        className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="bg-slate-50 px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center font-bold text-base">
              <User className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">
                  <span className="text-teal-700 font-extrabold">{patient.patient?.name}</span> 환자 상태 변경
                </h3>
                <span className="text-[11px] px-2 py-0.5 rounded font-mono font-bold bg-slate-200 text-slate-700">
                  {patient.patient?.patientId}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                변경할 진료 상태 탭을 터치하면 실시간으로 반영됩니다
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Patient Brief Bar */}
        <div className="bg-teal-50/40 px-5 py-2.5 border-b border-teal-100 flex flex-wrap items-center justify-between text-xs gap-2">
          <div className="flex items-center gap-3 text-slate-700">
            <span className="font-semibold">
              {patient.patient?.gender}/{patient.patient?.age}세
            </span>
            <span className="text-slate-400">•</span>
            <span className="font-semibold text-teal-800">{patient.recommendedDepartment}</span>
            <span className="text-slate-400">•</span>
            <span className="inline-flex items-center gap-1 font-semibold text-slate-800">
              <Armchair className="w-3.5 h-3.5 text-teal-600" />
              {patient.assignedChair || '체어 미지정'}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 text-[11px]">현재 상태:</span>
            <span className="font-bold text-xs px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-800">
              {patient.status}
            </span>
          </div>
        </div>

        {/* Status Selection Tabs List */}
        <div className="p-5 space-y-2.5 bg-white">
          <label className="text-xs font-bold text-slate-500 block mb-1">
            진료 상태 탭 선택 (터치 시 즉시 변경):
          </label>

          {STATUS_OPTIONS.map((opt) => {
            const isCurrent = patient.status === opt.status;
            const IconComponent = opt.icon;

            return (
              <button
                key={opt.status}
                type="button"
                onClick={() => handleSelectStatus(opt.status)}
                disabled={isUpdating}
                className={`w-full text-left p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between group ${
                  isCurrent
                    ? `${opt.activeBg} ${opt.activeBorder} shadow-xs`
                    : 'bg-white border-slate-200 hover:border-teal-400 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
                      isCurrent
                        ? `${opt.badgeColor} font-bold`
                        : 'bg-slate-50 border-slate-200 text-slate-500 group-hover:text-teal-700 group-hover:border-teal-200 group-hover:bg-teal-50'
                    }`}
                  >
                    <IconComponent className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900 group-hover:text-teal-800">
                        {opt.label}
                      </span>
                      {isCurrent && (
                        <span className="text-[11px] px-2 py-0.5 rounded-full font-bold bg-teal-600 text-white flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          현재 상태
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 leading-tight">
                      {opt.subText}
                    </p>
                  </div>
                </div>

                <div className="pl-2">
                  <span
                    className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                      isCurrent
                        ? 'border-teal-600 bg-teal-600 text-white'
                        : 'border-slate-300 group-hover:border-teal-400'
                    }`}
                  >
                    {isCurrent && <Check className="w-3.5 h-3.5" />}
                  </span>
                </div>
              </button>
            );
          })}

          {/* Voice chime option helper for '호출중' */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={autoVoiceCall}
                onChange={(e) => setAutoVoiceCall(e.target.checked)}
                className="w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500 cursor-pointer"
              />
              <span className="flex items-center gap-1">
                <Volume2 className="w-3.5 h-3.5 text-teal-600" />
                <span>'호출중' 선택 시 대기실 스마트 음성 안내 자동 방송</span>
              </span>
            </label>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 px-5 py-3 border-t border-slate-200 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 transition-colors cursor-pointer"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
