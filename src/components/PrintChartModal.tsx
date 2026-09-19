import React, { useMemo } from 'react';
import { X, Printer } from 'lucide-react';
import { QueuePatient } from '../types';
import { getAggregatedPatientHistory } from '../utils/patientHistory';
import { getTodayDateString } from '../utils/dateUtils';
import { processClinicalQuestionnaire } from './ClinicalQuestionnaireView';

interface PrintChartModalProps {
  patient: QueuePatient | null;
  allPatients?: QueuePatient[];
  isOpen: boolean;
  onClose: () => void;
}

export const PrintChartModal: React.FC<PrintChartModalProps> = ({
  patient,
  allPatients = [],
  isOpen,
  onClose,
}) => {
  if (!isOpen || !patient) return null;

  const handlePrint = () => {
    window.print();
  };

  const aggregatedPastVisits = useMemo(() => {
    if (!patient) return [];
    return getAggregatedPatientHistory(patient, allPatients);
  }, [patient, allPatients]);

  const todayStr = getTodayDateString();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto print:p-0 print:bg-white print:static">
      <div className="bg-white text-slate-900 rounded-xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh] print:max-h-none print:shadow-none print:border-none print:w-full">
        {/* Modal Top Actions (Hidden in Print) */}
        <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex items-center justify-between print:hidden">
          <div className="text-slate-900 text-sm font-bold flex items-center gap-2">
            <Printer className="w-4 h-4 text-teal-600" />
            <span>치과 진료차트 인쇄 미리보기</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white transition-colors cursor-pointer shadow-xs"
            >
              <Printer className="w-4 h-4" />
              <span>지금 인쇄하기</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Document Area */}
        <div className="p-8 overflow-y-auto flex-1 font-serif print:p-6 print:overflow-visible text-slate-900 bg-white">
          {/* Official Document Header */}
          <div className="text-center pb-5 mb-5 border-b-2 border-slate-900">
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 mb-1">
              오즈치과대학교병원 DentalTouch 진료차트
            </h1>
            <p className="text-xs text-slate-600 font-sans tracking-wide">
              OZ UNIVERSITY DENTAL HOSPITAL • DENTALTOUCH CLINICAL RECORD
            </p>
          </div>

          {/* Patient Demographic Table */}
          <table className="w-full border-collapse border border-slate-400 text-xs font-sans mb-5">
            <tbody>
              <tr className="bg-slate-100">
                <th className="border border-slate-400 p-2 text-left w-24 font-bold text-slate-800">
                  등록번호
                </th>
                <td className="border border-slate-400 p-2 font-mono font-bold">
                  {patient.patient?.patientId}
                </td>
                <th className="border border-slate-400 p-2 text-left w-24 font-bold text-slate-800">
                  환자성명
                </th>
                <td className="border border-slate-400 p-2 font-bold text-sm">
                  {patient.patient?.name} ({patient.patient?.gender}/{patient.patient?.age}세)
                </td>
              </tr>
              <tr>
                <th className="border border-slate-400 p-2 text-left font-bold text-slate-800 bg-slate-50">
                  주민번호(앞)
                </th>
                <td className="border border-slate-400 p-2 font-mono">
                  {patient.patient?.rrnFront}-*******
                </td>
                <th className="border border-slate-400 p-2 text-left font-bold text-slate-800 bg-slate-50">
                  연락처
                </th>
                <td className="border border-slate-400 p-2 font-mono">
                  {patient.patient?.phone}
                </td>
              </tr>
              <tr className="bg-slate-100">
                <th className="border border-slate-400 p-2 text-left font-bold text-slate-800">
                  진료일시
                </th>
                <td className="border border-slate-400 p-2">
                  {patient.date} {patient.time}
                </td>
                <th className="border border-slate-400 p-2 text-left font-bold text-slate-800">
                  진료분과/체어
                </th>
                <td className="border border-slate-400 p-2 font-bold">
                  {patient.recommendedDepartment} • {patient.assignedChair} ({patient.recommendedRoom})
                </td>
              </tr>
              <tr>
                <th className="border border-slate-400 p-2 text-left font-bold text-slate-800 bg-slate-50">
                  트리아지등급
                </th>
                <td className="border border-slate-400 p-2 font-bold">
                  {patient.triageLevel === '응급' || (patient.triageLevel as string) === 'Urgent' || (patient.triageLevel as string) === 'Emergency'
                    ? '응급'
                    : patient.triageLevel === '준응급' || (patient.triageLevel as string) === '비응급' || (patient.triageLevel as string) === 'Semi-urgent'
                    ? '준응급'
                    : '일반'}
                </td>
                <th className="border border-slate-400 p-2 text-left font-bold text-slate-800 bg-slate-50">
                  진료상태
                </th>
                <td className="border border-slate-400 p-2 font-bold">
                  {patient.status}
                </td>
              </tr>
            </tbody>
          </table>

          {/* Triage & Clinical Findings (C.C & Hx structured sentences) */}
          <div className="space-y-3 font-sans text-xs mb-4">
            <div className="border border-slate-300 rounded-lg p-3 bg-slate-50 flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-800 text-[11px] block">
                  ■ 호소 부위 (Oral Treatment Area)
                </span>
                <p className="text-slate-900 font-bold text-sm">{patient.areaTitle}</p>
              </div>
              <span className="px-2.5 py-1 rounded bg-amber-100 text-amber-900 font-bold text-xs border border-amber-300">
                트리아지: {patient.triageLevel}
              </span>
            </div>

            {/* C.C (주소) and Hx (현병력) - Clinically separated with line breaks */}
            {(() => {
              const { cc, hxLines } = processClinicalQuestionnaire(patient);
              return (
                <>
                  {/* C.C (주소) formatted line by line */}
                  <div className="border border-amber-300 rounded-lg p-3 bg-amber-50/30">
                    <span className="font-bold text-amber-950 block mb-1 text-[11px]">
                      ■ 주소 (Chief Complaint - C.C)
                    </span>
                    <div className="space-y-1.5 bg-white p-2.5 rounded border border-amber-200 text-slate-900 leading-relaxed font-medium">
                      {cc.mainSymptoms.map((sym, idx) => (
                        <div key={idx} className="flex items-start gap-1.5 text-xs">
                          <span className="text-amber-700 font-bold shrink-0">[주호소]</span>
                          <span className="font-semibold text-slate-900">{sym}</span>
                        </div>
                      ))}
                      {cc.painScale && (
                        <div className="flex items-start gap-1.5 text-xs text-rose-700 font-bold border-t border-amber-100 pt-1">
                          <span className="shrink-0">[통증척도]</span>
                          <span>{cc.painScale}</span>
                        </div>
                      )}
                      {cc.functionalImpairment && (
                        <div className="flex items-start gap-1.5 text-xs text-slate-800 font-medium border-t border-amber-100 pt-1">
                          <span className="text-amber-900 font-bold shrink-0">[저작/일상장애]</span>
                          <span>{cc.functionalImpairment}</span>
                        </div>
                      )}
                      {cc.additionalNotes.map((note, idx) => {
                        const isHighRisk = /고위험|HIGH\s*RISK|🔴/i.test(note);
                        return (
                          <div
                            key={idx}
                            className={`flex items-start gap-1.5 text-xs border-t border-amber-100 pt-1 ${
                              isHighRisk ? 'text-rose-700 font-bold bg-rose-50/50 p-1 rounded' : 'text-slate-700'
                            }`}
                          >
                            <span className={`font-bold shrink-0 ${isHighRisk ? 'text-rose-600' : 'text-slate-500'}`}>
                              {isHighRisk ? '🔴 [고위험 참고]' : '[참고]'}
                            </span>
                            <span>{note}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Hx (현병력) formatted line by line (한 카드에 줄바꿈으로 깔끔하게) */}
                  <div className="border border-sky-300 rounded-lg p-3 bg-sky-50/30">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-sky-950 text-[11px]">
                        ■ 현병력 (History of Present Illness - Hx)
                      </span>
                      <span className="text-[10px] text-sky-800 font-medium">
                        (연조직/삼킴/보철/전신종양학 포함)
                      </span>
                    </div>
                    <div className="space-y-1 bg-white p-2.5 rounded border border-sky-200 text-slate-800 leading-relaxed">
                      {hxLines.length > 0 ? (
                        hxLines.map((line, idx) => {
                          const matchTag = line.match(/^(\[[^\]]+\])\s*(.*)$/);
                          return (
                            <div key={idx} className="flex items-start gap-1.5 text-xs">
                              {matchTag ? (
                                <>
                                  <span className="text-sky-800 font-bold shrink-0">{matchTag[1]}</span>
                                  <span className="text-slate-800 font-medium">{matchTag[2]}</span>
                                </>
                              ) : (
                                <>
                                  <span className="text-sky-600 font-bold shrink-0">•</span>
                                  <span className="text-slate-800 font-medium">{line}</span>
                                </>
                              )}
                            </div>
                          );
                        })
                      ) : (
                        <p className="text-slate-400 text-xs">특이 현병력 사항 없음</p>
                      )}
                    </div>
                  </div>
                </>
              );
            })()}
          </div>

          {/* Drug Allergies & Systemic Medications Box (현병력 바로 밑에 독립 분리된 전용 박스) */}
          <div className="border-2 border-red-500 rounded-lg p-3.5 bg-red-50/40 mb-4 font-sans text-xs">
            <div className="font-bold text-red-900 border-b border-red-200 pb-1.5 mb-2.5 flex items-center justify-between">
              <span className="text-xs">🚨 [복용 약물 및 환자 안전 문진 - Medications & Clinical Safety]</span>
              <span className="text-[10px] bg-red-600 text-white px-2 py-0.5 rounded font-bold">투약 주의</span>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-2">
              <div className="bg-white p-2 rounded border border-red-200">
                <span className="font-bold text-red-950 block mb-0.5 text-[11px]">약물 / 마취제 알러지:</span>
                <p className="text-red-900 font-semibold text-xs">
                  {patient.drugAllergies && patient.drugAllergies.length > 0
                    ? patient.drugAllergies.join(', ') + (patient.otherAllergyText ? ` (${patient.otherAllergyText})` : '')
                    : patient.allergies || (patient.hasNoAllergies ? '특이 약물 알러지 없음' : '미기재')}
                </p>
              </div>
              <div className="bg-white p-2 rounded border border-red-200">
                <span className="font-bold text-red-950 block mb-0.5 text-[11px]">복용 약물 및 기저질환:</span>
                <p className="text-red-900 font-semibold text-xs">
                  {patient.medicationsList && patient.medicationsList.length > 0
                    ? patient.medicationsList.join(', ') + (patient.otherMedicationText ? ` (${patient.otherMedicationText})` : '')
                    : patient.medications || (patient.hasNoMedications ? '복용 약물 없음' : '미기재')}
                </p>
              </div>
            </div>
            {patient.bleedingTendency && (
              <div className="text-xs text-red-900 font-medium pt-1.5 border-t border-red-200 flex items-center gap-1">
                <span className="font-bold">출혈 성향 (지혈): </span>
                <span className={patient.bleedingTendency.includes('지연') ? 'text-red-700 font-bold' : ''}>
                  {patient.bleedingTendency}
                </span>
              </div>
            )}
            {patient.redFlags && patient.redFlags.length > 0 && (
              <div className="mt-2 pt-1.5 border-t border-red-200 space-y-0.5">
                <span className="font-bold text-red-950 block text-[11px]">임상 위험 주의사항:</span>
                {patient.redFlags.map((flag, idx) => (
                  <p key={idx} className="text-xs text-red-800 font-medium">
                    ⚠️ {flag}
                  </p>
                ))}
              </div>
            )}
          </div>

          {/* Suspected Conditions */}
          <div className="border border-teal-300 rounded-lg p-3 bg-teal-50/40 mb-6 font-sans text-xs">
            <span className="font-bold text-teal-950 block mb-1 text-[11px]">
              ■ 추정 감별 진단군 (Suspected Differential Diagnosis)
            </span>
            <p className="text-teal-900 font-semibold text-xs">
              {patient.suspectedConditions?.join(', ') || '미정'}
            </p>
          </div>

          {/* Doctor Charting Section */}
          <div className="space-y-4 font-sans text-xs mb-8">
            <div className="border-2 border-slate-700 rounded-lg p-4 bg-white">
              <h3 className="font-bold text-sm text-slate-900 mb-2 border-b pb-1 border-slate-300">
                [의사 진단 소견 - Doctor Diagnosis Note]
              </h3>
              <p className="text-slate-800 whitespace-pre-wrap leading-relaxed min-h-[60px]">
                {patient.doctorDiagnosisNote || '진료 소견 작성 전 상태입니다.'}
              </p>
            </div>

            <div className="border-2 border-slate-700 rounded-lg p-4 bg-white">
              <h3 className="font-bold text-sm text-slate-900 mb-2 border-b pb-1 border-slate-300">
                [치료 계획 및 처치 내역 - Treatment Plan & Procedures]
              </h3>
              <p className="text-slate-800 whitespace-pre-wrap leading-relaxed min-h-[60px]">
                {patient.treatmentPlan || '치료 계획 작성 전 상태입니다.'}
              </p>
            </div>

            <div className="border-2 border-slate-700 rounded-lg p-4 bg-white">
              <h3 className="font-bold text-sm text-slate-900 mb-2 border-b pb-1 border-slate-300">
                [원내 처방전 및 복약 지도 - Prescriptions]
              </h3>
              <p className="text-slate-800 whitespace-pre-wrap leading-relaxed min-h-[40px]">
                {patient.prescriptions || '처방 내역 없음'}
              </p>
            </div>
          </div>

          {/* Cumulative Past Dental Treatment & Cross-Department Consultation History */}
          <div className="mb-8 font-sans text-xs">
            <div className="border border-slate-400 rounded-lg overflow-hidden">
              <div className="bg-slate-100 p-2.5 border-b border-slate-400 flex items-center justify-between">
                <span className="font-bold text-slate-900 text-xs">
                  ■ 누적 과거 진료 내역 및 타과 협진 기록 (Cumulative Dental EHR History) - 총 {aggregatedPastVisits.length}건
                </span>
                <span className="text-[10px] text-slate-600 font-mono">
                  오즈치과병원 DentalTouch 전산 연동
                </span>
              </div>
              {aggregatedPastVisits.length > 0 ? (
                <table className="w-full border-collapse text-left text-[11px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-300 text-slate-700">
                      <th className="p-2 border-r border-slate-300 w-24">진료일시</th>
                      <th className="p-2 border-r border-slate-300 w-20">진료분과</th>
                      <th className="p-2 border-r border-slate-300 w-24">담당의</th>
                      <th className="p-2 border-r border-slate-300">진료부위 및 진단명</th>
                      <th className="p-2 border-r border-slate-300">처치 및 치료계획</th>
                      <th className="p-2 w-36">처방내역</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {aggregatedPastVisits.map((v, i) => (
                      <tr key={i} className={v.isSameDayConsultation ? 'bg-amber-50/60 font-semibold' : ''}>
                        <td className="p-2 border-r border-slate-300 font-mono text-[10px]">
                          {v.date} {v.time || ''}
                          {v.isSameDayConsultation && (
                            <span className="block text-[9px] text-amber-700 font-bold">★당일협진</span>
                          )}
                        </td>
                        <td className="p-2 border-r border-slate-300 font-bold">{v.department}</td>
                        <td className="p-2 border-r border-slate-300 text-slate-700">{v.doctor}</td>
                        <td className="p-2 border-r border-slate-300">
                          <span className="font-semibold text-slate-900">[{v.areaTitle}]</span> {v.diagnosis}
                        </td>
                        <td className="p-2 border-r border-slate-300 text-slate-700">{v.treatment}</td>
                        <td className="p-2 font-mono text-[10px] text-teal-800">{v.prescriptions}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="p-3 text-center text-slate-400">등록된 과거 내원 히스토리가 없습니다. (초진 환자)</div>
              )}
            </div>
          </div>

          {/* Doctor Signature & Hospital Footer */}
          <div className="border-t-2 border-slate-900 pt-4 flex items-end justify-between font-sans text-xs">
            <div>
              <p className="text-slate-500">인쇄일시: {todayStr} (전자의무기록 발급)</p>
              <p className="text-slate-500 text-[10px]">
                본 의무기록은 의료법 시행규칙에 의거하여 전자의무기록 시스템에 안전하게 보관됩니다.
              </p>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-3">
                <span className="font-semibold text-slate-700">담당 치과의사:</span>
                <span className="font-bold text-sm border-b border-dotted border-slate-800 px-6 py-1">
                  김 치 원 (인)
                </span>
              </div>
              <p className="text-[11px] text-slate-600 mt-1 font-bold">오즈치과대학교병원장</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
