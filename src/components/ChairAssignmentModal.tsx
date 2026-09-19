import React, { useState } from 'react';
import {
  X,
  Armchair,
  Check,
  Sparkles,
  Volume2,
  Stethoscope,
  Building2,
  AlertCircle,
} from 'lucide-react';
import { QueuePatient } from '../types';
import { callPatientSmart } from '../utils/audioChime';

interface ChairOption {
  id: string;
  name: string;
  room: string;
  deptTag: string;
  description: string;
  equipment: string;
  colorScheme: {
    badge: string;
    border: string;
    bg: string;
    activeRing: string;
  };
}

export const CHAIR_LIST: ChairOption[] = [
  {
    id: '1번 체어',
    name: '1번 체어',
    room: '제1진료실',
    deptTag: '보존과 / 치주과',
    description: '일반 치과 보존 및 치주 치료 전용 유닛',
    equipment: '초음파 스케일러, 고광도 LED 광중합기, 구강내 카메라',
    colorScheme: {
      badge: 'bg-emerald-50 text-emerald-800 border-emerald-300',
      border: 'border-emerald-500',
      bg: 'bg-emerald-50/70',
      activeRing: 'ring-emerald-400/30',
    },
  },
  {
    id: '2번 체어',
    name: '2번 체어',
    room: '제1진료실',
    deptTag: '보철과 / 치주과',
    description: '디지털 보철 프렙 및 인상 채득 특화 유닛',
    equipment: '3D 디지털 구강스캐너(트리오스), 보철 CAD/CAM 연동',
    colorScheme: {
      badge: 'bg-indigo-50 text-indigo-800 border-indigo-300',
      border: 'border-indigo-500',
      bg: 'bg-indigo-50/70',
      activeRing: 'ring-indigo-400/30',
    },
  },
  {
    id: '3번 체어',
    name: '3번 체어',
    room: '제2진료실',
    deptTag: '보존과 / 구강외과',
    description: '미세현미경 신경치료 및 근관 성형 유닛',
    equipment: '치과 미세수술 현미경(Zeiss), Ni-Ti 전동 엔도 모터',
    colorScheme: {
      badge: 'bg-blue-50 text-blue-800 border-blue-300',
      border: 'border-blue-500',
      bg: 'bg-blue-50/70',
      activeRing: 'ring-blue-400/30',
    },
  },
  {
    id: '4번 체어',
    name: '4번 체어',
    room: '제2진료실',
    deptTag: '구강악안면외과 / 보철과',
    description: '매복 사랑니 발치 및 소치조골 수술 전문 유닛',
    equipment: '서지컬 모터, 초음파 피에조 본 수술기, 무영등',
    colorScheme: {
      badge: 'bg-amber-50 text-amber-800 border-amber-300',
      border: 'border-amber-500',
      bg: 'bg-amber-50/70',
      activeRing: 'ring-amber-400/30',
    },
  },
  {
    id: '5번 체어',
    name: '5번 체어',
    room: '제3진료실',
    deptTag: '구강내과 / 턱관절클리닉',
    description: '턱관절 장애, 안면 통증, 구강점막질환 전용 유닛',
    equipment: '저출력 턱관절 레이저, TENS 물리치료기, 구강건조 측정기',
    colorScheme: {
      badge: 'bg-purple-50 text-purple-800 border-purple-300',
      border: 'border-purple-500',
      bg: 'bg-purple-50/70',
      activeRing: 'ring-purple-400/30',
    },
  },
  {
    id: '특진 체어',
    name: '특진 체어',
    room: '중앙수술실 (특진실)',
    deptTag: '대학병원 특진 / 수술 전용',
    description: '임플란트 수술 및 고난이도 악안면 외과 수술실',
    equipment: 'HEPA 클린룸 공조, 환자 생체징후(V/S) 모니터, C-Arm 연동',
    colorScheme: {
      badge: 'bg-rose-50 text-rose-800 border-rose-300',
      border: 'border-rose-500',
      bg: 'bg-rose-50/70',
      activeRing: 'ring-rose-400/30',
    },
  },
  {
    id: '체어 미지정',
    name: '체어 미지정 (대기실)',
    room: '중앙대기실',
    deptTag: '대기 / 재배치',
    description: '체어 배정 전 대기실 대기 또는 임시 체어 해제 상태',
    equipment: '대기 전광판 및 스마트 호출 연동',
    colorScheme: {
      badge: 'bg-slate-100 text-slate-800 border-slate-300',
      border: 'border-slate-500',
      bg: 'bg-slate-100',
      activeRing: 'ring-slate-400/30',
    },
  },
];

interface ChairAssignmentModalProps {
  patient: QueuePatient | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateChair: (patientId: string, newChair: string) => Promise<void> | void;
}

export const ChairAssignmentModal: React.FC<ChairAssignmentModalProps> = ({
  patient,
  isOpen,
  onClose,
  onUpdateChair,
}) => {
  if (!isOpen || !patient) return null;

  const [selectedChair, setSelectedChair] = useState<string>(
    patient.assignedChair || '1번 체어'
  );
  const [autoVoiceAnnounce, setAutoVoiceAnnounce] = useState<boolean>(true);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);

  const handleSelectChair = async (chairName: string) => {
    if (isUpdating) return;
    setIsUpdating(true);
    try {
      // If voice announcement option is checked, announce the chair movement
      if (autoVoiceAnnounce && chairName !== '체어 미지정') {
        const targetOption = CHAIR_LIST.find((c) => c.id === chairName);
        callPatientSmart({
          patientName: patient.patient?.name || '환자',
          locationTitle: targetOption?.room || patient.locationTitle,
          recommendedRoom: targetOption?.room || patient.recommendedRoom,
          assignedChair: chairName,
        });
      }

      await onUpdateChair(patient.id, chairName);
      onClose();
    } catch (err) {
      console.error('Failed to update chair:', err);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="bg-slate-50 px-5 py-4 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center font-bold text-base shadow-2xs">
              <Armchair className="w-5 h-5 text-teal-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-slate-900">
                  배정 체어 변경
                </h3>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 border border-teal-200">
                  실시간 재배정
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                터치하여 진료 체어를 즉시 변경하고 진료실 위치를 재지정합니다.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Patient Summary Card */}
        <div className="p-4 bg-slate-50/50 border-b border-slate-100 shrink-0">
          <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-slate-900 text-sm">
                  {patient.patient?.name}
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  ({patient.patient?.gender}/{patient.patient?.age}세)
                </span>
                <span className="text-[11px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                  {patient.patient?.patientId}
                </span>
              </div>
              <span className="px-2 py-0.5 rounded text-[11px] font-bold border bg-teal-50 text-teal-800 border-teal-200">
                {patient.recommendedDepartment}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-600 pt-1 border-t border-slate-100">
              <div className="flex items-center gap-1.5 truncate max-w-xs">
                <Stethoscope className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                <span className="font-medium truncate">{patient.areaTitle}</span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <span className="text-slate-400">현재 배정:</span>
                <span className="font-bold text-teal-700 px-2 py-0.5 rounded bg-teal-50 border border-teal-200">
                  {patient.assignedChair || '체어 미지정'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Chair Selection List */}
        <div className="p-4 space-y-2.5 overflow-y-auto flex-1">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider px-1 flex items-center justify-between">
            <span>배정할 체어 유닛 선택</span>
            <span className="text-teal-700 font-semibold normal-case">
              {patient.recommendedDepartment} 맞춤 유닛
            </span>
          </div>

          <div className="grid grid-cols-1 gap-2">
            {CHAIR_LIST.map((chair) => {
              const isCurrent = patient.assignedChair === chair.id;
              const isDeptMatch =
                chair.deptTag.includes(patient.recommendedDepartment) ||
                chair.id === '특진 체어';

              return (
                <button
                  key={chair.id}
                  type="button"
                  disabled={isUpdating}
                  onClick={() => handleSelectChair(chair.id)}
                  className={`w-full text-left p-3.5 rounded-xl border transition-all cursor-pointer relative group flex items-start justify-between gap-3 ${
                    isCurrent
                      ? `${chair.colorScheme.border} ${chair.colorScheme.bg} ring-2 ${chair.colorScheme.activeRing} shadow-2xs`
                      : 'bg-white hover:bg-slate-50 border-slate-200 hover:border-slate-300'
                  } ${isUpdating ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className="flex items-start gap-3 flex-1">
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm shrink-0 border ${chair.colorScheme.badge}`}
                    >
                      <Armchair className="w-4 h-4" />
                    </div>

                    <div className="space-y-0.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900 text-sm">
                          {chair.name}
                        </span>
                        <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1">
                          <Building2 className="w-3 h-3 text-slate-400" />
                          {chair.room}
                        </span>
                        {isDeptMatch && chair.id !== '체어 미지정' && (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-teal-100 text-teal-800 border border-teal-200">
                            권장 분과
                          </span>
                        )}
                        {isCurrent && (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-800 text-white">
                            현재 배정됨
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-600 font-medium">
                        {chair.description}
                      </p>
                      <p className="text-[11px] text-slate-400 truncate">
                        • 구비: {chair.equipment}
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center self-center">
                    {isCurrent ? (
                      <div className="w-6 h-6 rounded-full bg-teal-600 text-white flex items-center justify-center shadow-xs">
                        <Check className="w-3.5 h-3.5" />
                      </div>
                    ) : (
                      <div className="w-6 h-6 rounded-full border border-slate-300 group-hover:border-teal-500 flex items-center justify-center text-transparent group-hover:text-teal-600 transition-colors">
                        <Check className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Modal Footer with Voice TTS Option */}
        <div className="bg-slate-50 px-5 py-3.5 border-t border-slate-200 flex items-center justify-between shrink-0">
          <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 select-none">
            <input
              type="checkbox"
              checked={autoVoiceAnnounce}
              onChange={(e) => setAutoVoiceAnnounce(e.target.checked)}
              className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 border-slate-300"
            />
            <Volume2 className="w-4 h-4 text-teal-600" />
            <span>체어 변경 시 대기실 이동 안내 방송 자동 송출</span>
          </label>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-100 transition-colors cursor-pointer shadow-2xs"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
