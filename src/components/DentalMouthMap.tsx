import React, { useState } from 'react';
import { DentalDepartment } from '../types';

export interface DentalAreaSelection {
  code: string;
  name: string;
  dept: DentalDepartment;
  room: string;
  description: string;
}

interface DentalMouthMapProps {
  selectedArea: string;
  onSelect: (selection: DentalAreaSelection) => void;
}

// Structured teeth & oral zones mapping
export const DENTAL_AREAS: DentalAreaSelection[] = [
  // Upper Right Quadrant (Q1)
  { code: '18', name: '상악 우측 사랑니 (#18)', dept: '구강외과', room: '구강외과 1진료실', description: '상악 우측 제3대구치' },
  { code: '16-17', name: '상악 우측 대구치 (#16, #17)', dept: '보존과', room: '보존 1진료실', description: '상악 우측 어금니' },
  { code: '14-15', name: '상악 우측 소구치 (#14, #15)', dept: '보존과', room: '보존 1진료실', description: '상악 우측 작은어금니' },
  { code: '11-13', name: '상악 우측 전치부 (#11-#13)', dept: '보철과', room: '보철 1진료실', description: '상악 우측 앞니/송곳니' },

  // Upper Left Quadrant (Q2)
  { code: '21-23', name: '상악 좌측 전치부 (#21-#23)', dept: '보철과', room: '보철 1진료실', description: '상악 좌측 앞니/송곳니' },
  { code: '24-25', name: '상악 좌측 소구치 (#24, #25)', dept: '보존과', room: '보존 2진료실', description: '상악 좌측 작은어금니' },
  { code: '26-27', name: '상악 좌측 대구치 (#26, #27)', dept: '보존과', room: '보존 2진료실', description: '상악 좌측 어금니' },
  { code: '28', name: '상악 좌측 사랑니 (#28)', dept: '구강외과', room: '구강외과 1진료실', description: '상악 좌측 제3대구치' },

  // Lower Left Quadrant (Q3)
  { code: '38', name: '하악 좌측 사랑니 (#38)', dept: '구강외과', room: '구강외과 1진료실', description: '하악 좌측 제3대구치' },
  { code: '36-37', name: '하악 좌측 대구치 (#36, #37)', dept: '보존과', room: '보존 2진료실', description: '하악 좌측 어금니' },
  { code: '34-35', name: '하악 좌측 소구치 (#34, #35)', dept: '보존과', room: '보존 2진료실', description: '하악 좌측 작은어금니' },
  { code: '31-33', name: '하악 좌측 전치부 (#31-#33)', dept: '치주과', room: '치주 1진료실', description: '하악 좌측 앞니' },

  // Lower Right Quadrant (Q4)
  { code: '41-43', name: '하악 우측 전치부 (#41-#43)', dept: '치주과', room: '치주 1진료실', description: '하악 우측 앞니' },
  { code: '44-45', name: '하악 우측 소구치 (#44, #45)', dept: '보존과', room: '보존 1진료실', description: '하악 우측 작은어금니' },
  { code: '46-47', name: '하악 우측 대구치 (#46, #47)', dept: '보존과', room: '보존 1진료실', description: '하악 우측 어금니' },
  { code: '48', name: '하악 우측 사랑니 (#48)', dept: '구강외과', room: '구강외과 1진료실', description: '하악 우측 제3대구치' },

  // Soft Tissue / Special Zones
  { code: 'gingiva', name: '전악 치은 및 잇몸 출혈 부위', dept: '치주과', room: '치주 1진료실', description: '잇몸/치주조직 전반' },
  { code: 'tmj', name: '양측 악관절(TMJ) 및 저작근 부위', dept: '구강내과', room: '구강내과 1진료실', description: '턱관절 및 턱 주변 통증' },
  { code: 'denture', name: '무치악 잇몸 및 틀니 장착 부위', dept: '보철과', room: '보철 2진료실', description: '틀니/보철 압박 부위' },
  { code: 'mucosa', name: '구강 점막 및 혀(혓바늘/구내염)', dept: '구강내과', room: '구강내과 1진료실', description: '구강 연조직 및 점막 질환' },
];

export const DentalMouthMap: React.FC<DentalMouthMapProps> = ({
  selectedArea,
  onSelect,
}) => {
  const [hoveredCode, setHoveredCode] = useState<string | null>(null);

  const getDeptBadgeColor = (dept: DentalDepartment) => {
    switch (dept) {
      case '보존과': return 'bg-sky-100 text-sky-800 border-sky-200';
      case '치주과': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case '보철과': return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case '구강외과': return 'bg-rose-100 text-rose-800 border-rose-200';
      case '구강내과': return 'bg-amber-100 text-amber-800 border-amber-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-800">
            구강 악궁 및 통증 호소 부위 터치 맵
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 font-bold border border-teal-200">
            터치 시 자동 입력
          </span>
        </div>
        <span className="text-[11px] text-slate-500">
          환자가 가리키는 부위를 클릭하세요
        </span>
      </div>

      {/* Visual Arch Diagram */}
      <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-2xs space-y-2.5">
        {/* Upper Arch (상악) */}
        <div>
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>상악 (Upper Jaw / Maxilla)</span>
            <span className="text-[10px] text-slate-400">우측(Rt) ⟵ ⟶ 좌측(Lt)</span>
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-1">
            {DENTAL_AREAS.slice(0, 8).map((area) => {
              const isSelected = selectedArea.includes(area.name) || selectedArea.includes(area.code);
              return (
                <button
                  key={area.code}
                  type="button"
                  onClick={() => onSelect(area)}
                  onMouseEnter={() => setHoveredCode(area.code)}
                  onMouseLeave={() => setHoveredCode(null)}
                  className={`p-1.5 rounded-lg text-center transition-all cursor-pointer border flex flex-col items-center justify-center min-h-[50px] ${
                    isSelected
                      ? 'bg-amber-500 text-white border-amber-600 shadow-xs scale-[1.02] font-bold'
                      : 'bg-slate-50 hover:bg-teal-50 hover:border-teal-300 text-slate-700 border-slate-200'
                  }`}
                  title={`${area.name} - ${area.dept}`}
                >
                  <span className="text-[10px] font-mono font-bold leading-tight">
                    {area.code}
                  </span>
                  <span className="text-[9px] truncate w-full px-0.5 opacity-90">
                    {area.description.split(' ').slice(-1)[0]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Divider with Center Line */}
        <div className="relative py-0.5">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-dashed border-slate-200" />
          </div>
          <div className="relative flex justify-center text-[10px] uppercase">
            <span className="bg-white px-2 text-slate-400 font-bold">중심 교합면</span>
          </div>
        </div>

        {/* Lower Arch (하악) */}
        <div>
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>하악 (Lower Jaw / Mandible)</span>
            <span className="text-[10px] text-slate-400">우측(Rt) ⟵ ⟶ 좌측(Lt)</span>
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-1">
            {DENTAL_AREAS.slice(8, 16).map((area) => {
              const isSelected = selectedArea.includes(area.name) || selectedArea.includes(area.code);
              return (
                <button
                  key={area.code}
                  type="button"
                  onClick={() => onSelect(area)}
                  onMouseEnter={() => setHoveredCode(area.code)}
                  onMouseLeave={() => setHoveredCode(null)}
                  className={`p-1.5 rounded-lg text-center transition-all cursor-pointer border flex flex-col items-center justify-center min-h-[50px] ${
                    isSelected
                      ? 'bg-amber-500 text-white border-amber-600 shadow-xs scale-[1.02] font-bold'
                      : 'bg-slate-50 hover:bg-teal-50 hover:border-teal-300 text-slate-700 border-slate-200'
                  }`}
                  title={`${area.name} - ${area.dept}`}
                >
                  <span className="text-[10px] font-mono font-bold leading-tight">
                    {area.code}
                  </span>
                  <span className="text-[9px] truncate w-full px-0.5 opacity-90">
                    {area.description.split(' ').slice(-1)[0]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Soft Tissue & Specialized Joint Buttons */}
        <div className="pt-2 border-t border-slate-100">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
            잇몸 및 특수 부위 (치은 / 턱관절 / 틀니 / 점막)
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            {DENTAL_AREAS.slice(16).map((area) => {
              const isSelected = selectedArea.includes(area.name);
              return (
                <button
                  key={area.code}
                  type="button"
                  onClick={() => onSelect(area)}
                  className={`px-2.5 py-1.5 rounded-lg text-left transition-all cursor-pointer border text-xs flex items-center justify-between ${
                    isSelected
                      ? 'bg-teal-600 text-white border-teal-700 font-bold shadow-xs'
                      : 'bg-slate-50 hover:bg-teal-50 text-slate-700 border-slate-200'
                  }`}
                >
                  <span className="truncate">{area.name.split(' ')[0]} {area.name.split(' ')[1]}</span>
                  <span
                    className={`text-[9px] px-1.5 py-0.2 rounded font-semibold ${
                      isSelected ? 'bg-white/20 text-white' : getDeptBadgeColor(area.dept)
                    }`}
                  >
                    {area.dept}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
