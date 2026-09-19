import React from 'react';
import {
  FileText,
  History,
  ShieldAlert,
  AlertTriangle,
  Pill,
  HeartPulse,
  CheckCircle2,
  Quote,
  Sparkles,
  Info,
} from 'lucide-react';
import { QueuePatient } from '../types';

interface ClinicalQuestionnaireViewProps {
  patient: QueuePatient;
  compact?: boolean;
  showSuspectedConditions?: boolean;
}

export interface FormattedChiefComplaint {
  mainSymptoms: string[];
  painScale?: string;
  functionalImpairment?: string;
  additionalNotes: string[];
}

export interface ProcessedClinicalQuestionnaire {
  cc: FormattedChiefComplaint;
  hxLines: string[];
  symptomTags: string[];
  omittedWarningCount: number;
}

/**
 * Parses and separates raw patient questionnaire inputs into clean clinical sections:
 * 1. Chief Complaint (C.C): Main symptoms, pain scale (NRS), and chewing/functional impairments (with clean line breaks)
 * 2. History of Present Illness (Hx): Pure onset timeline & clinical course (omitting warnings, patient info, and C.C)
 * 3. Medications & Medical History: Preserved in the dedicated safety card
 */
export function processClinicalQuestionnaire(
  patient: Partial<QueuePatient>
): ProcessedClinicalQuestionnaire {
  const cc: FormattedChiefComplaint = {
    mainSymptoms: [],
    additionalNotes: [],
  };
  const hxLines: string[] = [];
  let omittedWarningCount = 0;

  // Collect candidate text lines from both chiefComplaint and historyOfPresentIllness
  const rawSources = [
    patient.chiefComplaint || '',
    patient.historyOfPresentIllness || '',
  ].filter(Boolean);

  const rawChunks: string[] = [];
  for (const src of rawSources) {
    // Split by newlines first
    const lines = src.split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // Further split if multiple bracketed sections or distinct sentence markers are chained
      const subChunks = trimmed
        .split(/(?=\[[^\]]+\])|(?<=[.?!])\s+(?=[가-힣A-Za-z0-9"\[])/g)
        .map((c) => c.trim())
        .filter(Boolean);

      if (subChunks.length > 0) {
        rawChunks.push(...subChunks);
      } else {
        rawChunks.push(trimmed);
      }
    }
  }

  for (const chunk of rawChunks) {
    let text = chunk.trim();
    if (!text) continue;

    // Normalize comma stuttering (e.g., "아픔,, 잇몸이" -> "아픔, 잇몸이")
    text = text.replace(/,{2,}/g, ', ');

    // 0-A. [NHS MCM 위험 등급]: 🔴 고위험군 (HIGH RISK)만 C.C 참고 항목으로 유지, 그 외 참고 등급은 C.C에서 제외
    if (/\[?\s*(?:NHS\s*MCM|MCM)\s*(?:위험\s*등급)?\s*\]?|NHS\s*MCM/i.test(text)) {
      const isHighRisk = /고위험|HIGH\s*RISK|🔴/i.test(text);
      if (isHighRisk) {
        let cleanMcm = text.replace(/^[•*·-]\s*/, '').trim();
        if (!cleanMcm.startsWith('[')) {
          cleanMcm = `[NHS MCM 위험 등급] ${cleanMcm.replace(/^NHS\s*MCM(?:\s*위험\s*등급)?[:\s-]*/i, '')}`;
        }
        if (!cc.additionalNotes.includes(cleanMcm)) {
          cc.additionalNotes.push(cleanMcm);
        }
      }
      // 고위험군이 아닌 위험 등급은 C.C(주소)에서 제외
      continue;
    }

    // 0-B. 현병력 (Hx) 전용 분류 항목: [연조직 및 점막 소견], [삼킴 및 타액 상태], [치과 보철 이력], [전신질환 및 종양학]
    // 1) [연조직 및 점막 소견]
    if (/\[\s*(?:연조직(?:\s*및\s*점막)?(?:\s*소견)?|점막\s*소견)\s*\]|연조직\s*및\s*점막\s*소견/i.test(text)) {
      let cleanBody = text
        .replace(/^\[\s*(?:연조직(?:\s*및\s*점막)?(?:\s*소견)?|점막\s*소견)\s*\][:\s-]*/i, '')
        .replace(/^연조직\s*및\s*점막\s*소견[:\s-]*/i, '')
        .replace(/^[•*·-]\s*/, '')
        .trim();
      const lineToAdd = cleanBody ? `[연조직 및 점막 소견] ${cleanBody}` : '[연조직 및 점막 소견] 특이 소견 관찰';
      if (!hxLines.some((l) => l.includes(cleanBody || '연조직 및 점막 소견'))) {
        hxLines.push(lineToAdd);
      }
      continue;
    }

    // 2) [삼킴 및 타액 상태]
    if (/\[\s*(?:삼킴(?:\s*및\s*타액)?(?:\s*상태)?|타액\s*상태)\s*\]|삼킴\s*및\s*타액\s*상태/i.test(text)) {
      let cleanBody = text
        .replace(/^\[\s*(?:삼킴(?:\s*및\s*타액)?(?:\s*상태)?|타액\s*상태)\s*\][:\s-]*/i, '')
        .replace(/^삼킴\s*및\s*타액\s*상태[:\s-]*/i, '')
        .replace(/^[•*·-]\s*/, '')
        .trim();
      const lineToAdd = cleanBody ? `[삼킴 및 타액 상태] ${cleanBody}` : '[삼킴 및 타액 상태] 특이 소견 관찰';
      if (!hxLines.some((l) => l.includes(cleanBody || '삼킴 및 타액 상태'))) {
        hxLines.push(lineToAdd);
      }
      continue;
    }

    // 3) [치과 보철 이력]
    if (/\[\s*(?:치과\s*)?보철\s*이력\s*\]|(?:치과\s*)?보철\s*이력/i.test(text)) {
      let cleanBody = text
        .replace(/^\[\s*(?:치과\s*)?보철\s*이력\s*\][:\s-]*/i, '')
        .replace(/^(?:치과\s*)?보철\s*이력[:\s-]*/i, '')
        .replace(/^[•*·-]\s*/, '')
        .trim();
      const lineToAdd = cleanBody ? `[치과 보철 이력] ${cleanBody}` : '[치과 보철 이력] 기왕력 있음';
      if (!hxLines.some((l) => l.includes(cleanBody || '보철 이력'))) {
        hxLines.push(lineToAdd);
      }
      continue;
    }

    // 4) [전신질환 및 종양학]
    if (/\[\s*(?:전신질환(?:\s*및\s*종양학)?|종양학)\s*\]|전신질환\s*및\s*종양학/i.test(text)) {
      let cleanBody = text
        .replace(/^\[\s*(?:전신질환(?:\s*및\s*종양학)?|종양학)\s*\][:\s-]*/i, '')
        .replace(/^전신질환\s*및\s*종양학[:\s-]*/i, '')
        .replace(/^[•*·-]\s*/, '')
        .trim();
      const lineToAdd = cleanBody ? `[전신질환 및 종양학] ${cleanBody}` : '[전신질환 및 종양학] 기왕력 있음';
      if (!hxLines.some((l) => l.includes(cleanBody || '전신질환 및 종양학'))) {
        hxLines.push(lineToAdd);
      }
      continue;
    }

    // 1. Exclude Warnings & Medication safety headers (already in the dedicated safety box below)
    if (
      /\[(?:임상\s*필독\s*경고문|진료의\s*필독|주의사항)\]/i.test(text) ||
      /(?:임상\s*필독\s*경고문|진료의\s*필독)/i.test(text) ||
      (/복용\s*(?:중|약물)?/i.test(text) &&
        /(?:아스피린|와파린|항응고|혈압약|당뇨약|진통제|타이레놀|골다공증)/i.test(text)) ||
      /(?:약물\s*알러지|알레르기|지혈\s*지연|출혈\s*성향)/i.test(text)
    ) {
      omittedWarningCount++;
      continue;
    }

    // 2. Exclude Patient demographics (already on the top patient header)
    if (
      /\[환자\s*정보\]/i.test(text) ||
      /(?:성명|등록번호|차트번호)\s*:/i.test(text) ||
      /^\d+세\s*(?:남성|여성|남|여)/i.test(text)
    ) {
      continue;
    }

    // 3. Pain Scale (NRS) -> route to Chief Complaint
    if (/NRS|통증\s*척도|\b\d+\s*\/\s*5점|\b\d+\s*\/\s*10점/i.test(text)) {
      let cleanPain = text.replace(/^[•*·-]\s*/, '').trim();
      if (!cleanPain.endsWith('.')) cleanPain += '.';
      if (!cc.painScale) {
        cc.painScale = cleanPain;
      }
      continue;
    }

    // 4. Chewing & Functional Impairment (저작/일상 장애) -> route to Chief Complaint
    if (
      /\[일상\s*및\s*저작\s*장애\]|저작\s*장애|씹지\s*못함|씹을\s*수\s*없|아픈\s*쪽으로는\s*전혀/i.test(
        text
      )
    ) {
      let cleanImp = text
        .replace(/\[일상\s*및\s*저작\s*장애\]/g, '')
        .replace(/심층\s*증상\s*:.*$/i, '')
        .replace(/^[•*·-]\s*/, '')
        .trim();
      // Clean up punctuation
      cleanImp = cleanImp.replace(/^[,:\s-]+/, '').replace(/[,:\s-]+$/, '');
      if (cleanImp && !cc.functionalImpairment) {
        cc.functionalImpairment = cleanImp;
      }
      continue;
    }

    // 5. Subjective Chief Complaints (주호소, 부위별 호소 증상, 통증 호소 등) -> route to Chief Complaint
    if (
      /\[(?:주호소|주소)\]/i.test(text) ||
      /호소\s*[.]?$/i.test(text) ||
      /부위[에]?\s*["'].+["']\s*호소/i.test(text) ||
      /(?:위쪽|아래쪽|상악|하악|전치부|구치부|치아|잇몸).*(?:아픔|통증|시림|흔들|부었|깨짐|빠짐)/i.test(
        text
      ) ||
      /(?:아파요|시려요|욱신거려요|부었어요|떨어졌어요|흔들려요)/i.test(text)
    ) {
      let cleanSym = text
        .replace(/\[(?:주호소|주소)\]/g, '')
        .replace(/심층\s*증상\s*:.*$/i, '')
        .replace(/^[•*·-]\s*/, '')
        .trim();
      // Strip redundant quotes around entire statement if malformed
      cleanSym = cleanSym.replace(/^["']+|["']+$/g, '').trim();
      if (cleanSym.length >= 2) {
        const isDuplicate = cc.mainSymptoms.some(
          (existing) =>
            existing.includes(cleanSym.substring(0, Math.min(10, cleanSym.length))) ||
            cleanSym.includes(existing.substring(0, Math.min(10, existing.length)))
        );
        if (!isDuplicate) {
          cc.mainSymptoms.push(cleanSym);
        }
      }
      continue;
    }

    // 6. Clinical History of Present Illness (발병 시기, 진행 경과, 유발 자극 등) -> route to Hx
    if (
      /\[(?:발병시기|발병\s*시기\s*및\s*주호소)\]/i.test(text) ||
      /(?:\d+\s*일|\d+\s*주|\d+\s*개월|\d+\s*년|어제|오늘|새벽|최근)\s*전부터/i.test(text) ||
      /급성\s*발병|점진적\s*악화|시작됨|지속|냉자극|온자극|자발통/i.test(text)
    ) {
      let cleanHx = text
        .replace(/\[(?:발병시기|발병\s*시기\s*및\s*주호소)\]/g, '')
        .replace(/시작됨\s*시작[.]?/g, '시작됨.')
        .replace(/^[•*·-]\s*/, '')
        .trim();

      // Clean up punctuation
      cleanHx = cleanHx.replace(/^[,:\s-]+/, '').replace(/[,:\s-]+$/, '');
      if (cleanHx.length >= 2) {
        if (!cleanHx.endsWith('.')) cleanHx += '.';
        const isDuplicate = hxLines.some(
          (existing) =>
            existing.includes(cleanHx.substring(0, Math.min(10, cleanHx.length))) ||
            cleanHx.includes(existing.substring(0, Math.min(10, existing.length)))
        );
        if (!isDuplicate) {
          hxLines.push(cleanHx);
        }
      }
      continue;
    }

    // Fallback: If it has clinical onset/progression keywords, route to Hx; all other unclassified "참고" notes are removed from C.C per instruction
    if (text.length >= 3 && /시작|경과|발병|진행/.test(text)) {
      let cleanFallback = text.replace(/^[•*·-]\s*/, '').trim();
      if (!cleanFallback.endsWith('.')) cleanFallback += '.';
      if (!hxLines.some((l) => l.includes(cleanFallback))) {
        hxLines.push(cleanFallback);
      }
    }
  }

  // If no main symptoms detected, fall back to cleaned chief complaint or safe string
  if (cc.mainSymptoms.length === 0) {
    let cleanedChiefComplaint = (patient.chiefComplaint || '')
      .replace(/\[\s*(?:NHS\s*MCM|MCM|연조직|삼킴|타액|치과\s*보철|보철|전신질환|종양학)[^\]]*\][^\[]*/gi, '')
      .replace(/^[•*·-]\s*/, '')
      .trim();
    if (cleanedChiefComplaint && cleanedChiefComplaint.length >= 2) {
      cc.mainSymptoms.push(cleanedChiefComplaint);
    } else {
      cc.mainSymptoms.push('내원 정기 검진 및 구강 불편감 호소');
    }
  }

  // If no Hx lines left, provide a clean doctor clinical notice
  if (hxLines.length === 0) {
    hxLines.push('급성 발병 호소 (원내 치근단 방사선 촬영 및 치수·치주 정밀 검사 요망)');
  }

  // Extract symptom keywords for tags
  const combinedText = `${cc.mainSymptoms.join(' ')} ${hxLines.join(' ')}`;
  const symptomTags = extractSymptomKeywords(combinedText);

  return {
    cc,
    hxLines,
    symptomTags,
    omittedWarningCount,
  };
}

/**
 * Extracts symptom highlight tags from chief complaint text
 */
function extractSymptomKeywords(text: string): string[] {
  const keywords: string[] = [];
  const map: [RegExp, string][] = [
    [/통증|아파|욱신|찌릿|쑤심/g, '통증 호소'],
    [/시림|찬물|얼음|뜨거운/g, '온도 자극 과민'],
    [/흔들|동요/g, '치아 동요도'],
    [/부어|부종|고름|농/g, '부종·화농'],
    [/출혈|피가|피남/g, '잇몸 출혈'],
    [/빠짐|탈락|떨어/g, '보철 탈락'],
    [/부러|파절|깨짐/g, '치아 파절'],
    [/턱|소리|딱딱/g, '악관절 증상'],
    [/틀니|상처|궤양/g, '의치 불편감'],
    [/스케일링|검진|치석/g, '정기 관리'],
  ];

  for (const [regex, tag] of map) {
    if (regex.test(text) && !keywords.includes(tag)) {
      keywords.push(tag);
    }
  }
  return keywords;
}

export const ClinicalQuestionnaireView: React.FC<ClinicalQuestionnaireViewProps> = ({
  patient,
  compact = false,
  showSuspectedConditions = false,
}) => {
  const { cc, hxLines, symptomTags } = processClinicalQuestionnaire(patient);

  // Allergies resolution
  const hasSpecificAllergies =
    (patient.drugAllergies && patient.drugAllergies.length > 0) ||
    Boolean(patient.otherAllergyText?.trim()) ||
    (Boolean(patient.allergies) && patient.allergies !== '미기재' && !patient.allergies?.includes('없음'));

  // Medications resolution
  const hasSpecificMedications =
    (patient.medicationsList && patient.medicationsList.length > 0) ||
    Boolean(patient.otherMedicationText?.trim()) ||
    (Boolean(patient.medications) && patient.medications !== '미기재' && !patient.medications?.includes('없음'));

  const bleedingTendency = patient.bleedingTendency || '없음 (정상 지혈)';
  const isDelayedBleeding = bleedingTendency.includes('지연') || bleedingTendency.includes('위험');
  const isMildBleeding = bleedingTendency.includes('경미');

  return (
    <div className="space-y-4">
      {/* ============================================================ */}
      {/* 1. 주소 (Chief Complaint - C.C) & 호소 부위 Card */}
      {/* ============================================================ */}
      <div className="rounded-xl bg-gradient-to-br from-amber-50/60 via-amber-50/30 to-white border border-amber-200/90 p-4 shadow-2xs space-y-3">
        {/* Header bar */}
        <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-amber-200/60">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-black text-xs shadow-2xs">
              <Quote className="w-3.5 h-3.5" />
            </span>
            <div>
              <div className="flex items-center gap-1.5">
                <h4 className="text-xs font-bold text-amber-950 tracking-wide uppercase">
                  주소 (Chief Complaint - C.C)
                </h4>
                <span className="text-[10px] px-1.5 py-0.2 rounded font-bold bg-amber-200/80 text-amber-900">
                  환자 직접 호소 내원 사유
                </span>
              </div>
              <p className="text-[11px] text-amber-800">
                환자가 내원 시 주관적으로 표현한 가장 불편한 증상 및 일상 장애입니다.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-bold text-amber-900 bg-white px-2.5 py-1 rounded-lg border border-amber-300 shadow-2xs">
              📍 {patient.areaTitle || '전악 / 구강 전반'}
            </span>
          </div>
        </div>

        {/* C.C Single Card with clean, beautiful line breaks */}
        <div className="bg-white/95 rounded-lg border border-amber-200/80 p-3.5 space-y-2.5 leading-relaxed text-xs text-slate-800 shadow-2xs">
          {/* Main symptoms line by line */}
          {cc.mainSymptoms.map((sentence, idx) => (
            <div key={idx} className="flex items-start gap-2.5">
              <span className="inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-200 shrink-0 mt-0.5">
                주호소
              </span>
              <span className="flex-1 font-semibold text-slate-900 leading-normal">
                "{sentence}"
              </span>
            </div>
          ))}

          {/* Pain Scale (NRS) with dedicated clean line */}
          {cc.painScale && (
            <div className="flex items-center gap-2.5 pt-2 border-t border-amber-100/90">
              <span className="inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-200 shrink-0">
                통증 척도
              </span>
              <span className="flex-1 font-bold text-rose-700">
                {cc.painScale}
              </span>
            </div>
          )}

          {/* Chewing / Functional Disability with dedicated clean line */}
          {cc.functionalImpairment && (
            <div className="flex items-start gap-2.5 pt-2 border-t border-amber-100/90">
              <span className="inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-200/80 text-amber-950 border border-amber-300 shrink-0 mt-0.5">
                일상/저작장애
              </span>
              <span className="flex-1 font-medium text-slate-800 leading-normal">
                {cc.functionalImpairment}
              </span>
            </div>
          )}

          {/* Additional Notes (C.C 참고 항목: 고위험군 NHS MCM만 보존) */}
          {cc.additionalNotes.map((note, idx) => {
            const isHighRisk = /고위험|HIGH\s*RISK|🔴/i.test(note);
            return (
              <div
                key={idx}
                className={`flex items-start gap-2.5 pt-2 border-t ${
                  isHighRisk
                    ? 'border-rose-300/80 bg-rose-50/70 p-2 rounded-lg -mx-0.5'
                    : 'border-amber-100/90'
                }`}
              >
                <span
                  className={`inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 mt-0.5 ${
                    isHighRisk
                      ? 'bg-rose-600 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-700 border border-slate-200'
                  }`}
                >
                  {isHighRisk ? '🔴 참고 (고위험군)' : '참고'}
                </span>
                <span
                  className={`flex-1 leading-normal ${
                    isHighRisk ? 'font-bold text-rose-900 text-xs' : 'text-slate-700'
                  }`}
                >
                  {note}
                </span>
              </div>
            );
          })}
        </div>

        {/* Quick Symptom Keywords Pill Tags */}
        {symptomTags.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
            <span className="text-[10px] font-bold text-amber-800 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-600" />
              <span>주요 증상 분류:</span>
            </span>
            {symptomTags.map((tag) => (
              <span
                key={tag}
                className="text-[11px] px-2 py-0.5 rounded-full font-bold bg-amber-100/90 text-amber-900 border border-amber-200"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* 2. 현병력 (History of Present Illness - Hx) Card */}
      {/* ============================================================ */}
      <div className="rounded-xl bg-gradient-to-br from-sky-50/60 via-sky-50/30 to-white border border-sky-200/90 p-4 shadow-2xs space-y-3">
        {/* Header bar */}
        <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-sky-200/60">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-sky-600 text-white flex items-center justify-center font-black text-xs shadow-2xs">
              <History className="w-3.5 h-3.5" />
            </span>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <h4 className="text-xs font-bold text-sky-950 tracking-wide uppercase">
                  현병력 (History of Present Illness - Hx)
                </h4>
                <span className="text-[10px] px-1.5 py-0.2 rounded font-bold bg-sky-100 text-sky-800 border border-sky-200">
                  의사 필수 임상 경과
                </span>
              </div>
              <p className="text-[11px] text-sky-800">
                발병 시점 및 임상 진행 경과입니다. (연조직/삼킴/보철/전신종양학 포함)
              </p>
            </div>
          </div>

          <div className="text-[11px] font-mono text-sky-800 bg-white px-2 py-0.5 rounded border border-sky-200 font-semibold">
            내원: {patient.date} {patient.time}
          </div>
        </div>

        {/* Single Unified Card: Clean Line-by-Line Break (한 카드에 줄바꿈만 잘 해서 적기) */}
        <div className="bg-white/95 rounded-lg border border-sky-200/80 p-3.5 space-y-2 leading-relaxed text-xs shadow-2xs">
          {hxLines.length > 0 ? (
            hxLines.map((line, idx) => {
              const matchTag = line.match(/^(\[[^\]]+\])\s*(.*)$/);
              if (matchTag) {
                const tag = matchTag[1].replace(/[\[\]]/g, '');
                const rest = matchTag[2];
                return (
                  <div key={idx} className="flex items-start gap-2 pt-1 border-t border-sky-100/80 first:border-t-0 first:pt-0">
                    <span className="inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded bg-sky-100 text-sky-900 border border-sky-200 shrink-0 mt-0.5">
                      {tag}
                    </span>
                    <span className="flex-1 font-medium text-slate-800 leading-normal">
                      {rest || line}
                    </span>
                  </div>
                );
              }
              return (
                <div key={idx} className="flex items-start gap-2.5">
                  <span className="text-sky-600 font-bold text-sm leading-none mt-0.5">•</span>
                  <span className="flex-1 font-medium text-slate-800 leading-normal">
                    {line}
                  </span>
                </div>
              );
            })
          ) : (
            <div className="text-xs text-slate-400 italic">
              기록된 현병력(Hx)이 없습니다.
            </div>
          )}
        </div>
      </div>

      {/* ============================================================ */}
      {/* 3. 복용약물 문진 파트 (현병력 밑에 새로 분리된 전용 박스)       */}
      {/* ============================================================ */}
      <div className="rounded-xl bg-gradient-to-br from-rose-50/70 via-rose-50/30 to-white border-2 border-rose-300 p-4 shadow-sm space-y-4">
        {/* Header bar */}
        <div className="flex items-center justify-between flex-wrap gap-2 pb-2.5 border-b border-rose-200">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-rose-600 text-white flex items-center justify-center font-bold text-xs shadow-2xs">
              <Pill className="w-3.5 h-3.5" />
            </span>
            <div>
              <div className="flex items-center gap-1.5">
                <h4 className="text-xs font-bold text-rose-950 tracking-wide uppercase">
                  복용 약물 및 환자 전신 안전 문진 (Medications & Medical History)
                </h4>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-rose-600 text-white animate-pulse">
                  진료실 전달 필수
                </span>
              </div>
              <p className="text-[11px] text-rose-800">
                발치·치주치료 등 치과 처치 전 출혈 지연 및 약물 부작용(MRONJ, 마취제 이상반응) 예방을 위한 필수 문진입니다.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <span
              className={`text-xs px-2.5 py-1 rounded-lg font-bold border ${
                isDelayedBleeding
                  ? 'bg-rose-600 text-white border-rose-700 shadow-2xs'
                  : isMildBleeding
                  ? 'bg-amber-100 text-amber-900 border-amber-300'
                  : 'bg-emerald-50 text-emerald-800 border-emerald-300'
              }`}
            >
              지혈 성향: {bleedingTendency}
            </span>
          </div>
        </div>

        {/* Detail Breakdown Grid: Allergies vs Current Medications */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {/* 3-1. Drug Allergies Box */}
          <div className="rounded-lg bg-white/95 border border-rose-200 p-3 shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-rose-950 flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                <span>약물 / 국소마취제 / 항생제 알러지</span>
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-rose-50 text-rose-700 border border-rose-200">
                Allergy
              </span>
            </div>

            <div className="space-y-1.5 min-h-[48px]">
              {hasSpecificAllergies ? (
                <div className="flex flex-wrap gap-1.5">
                  {patient.drugAllergies && patient.drugAllergies.length > 0 ? (
                    patient.drugAllergies.map((allergy, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-rose-100 text-rose-900 border border-rose-300"
                      >
                        🚨 {allergy}
                      </span>
                    ))
                  ) : patient.allergies ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-rose-100 text-rose-900 border border-rose-300">
                      🚨 {patient.allergies}
                    </span>
                  ) : null}

                  {patient.otherAllergyText?.trim() && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-rose-50 text-rose-800 border border-rose-200">
                      자필: {patient.otherAllergyText.trim()}
                    </span>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-1.5 p-2 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>특이 약물 알러지 없음 (국소마취제 및 항생제 투여 안전)</span>
                </div>
              )}
            </div>
          </div>

          {/* 3-2. Current Medications & Chronic Diseases Box */}
          <div className="rounded-lg bg-white/95 border border-amber-200 p-3 shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                <Pill className="w-3.5 h-3.5 text-amber-600" />
                <span>현재 복용 중인 약물 및 전신 기저질환</span>
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-50 text-amber-800 border border-amber-200">
                Medication
              </span>
            </div>

            <div className="space-y-1.5 min-h-[48px]">
              {hasSpecificMedications ? (
                <div className="flex flex-wrap gap-1.5">
                  {patient.medicationsList && patient.medicationsList.length > 0 ? (
                    patient.medicationsList.map((med, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-amber-100 text-amber-950 border border-amber-300"
                      >
                        💊 {med}
                      </span>
                    ))
                  ) : patient.medications ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-amber-100 text-amber-950 border border-amber-300">
                      💊 {patient.medications}
                    </span>
                  ) : null}

                  {patient.otherMedicationText?.trim() && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-amber-50 text-amber-900 border border-amber-200">
                      자필: {patient.otherMedicationText.trim()}
                    </span>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-1.5 p-2 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>현재 복용 중인 약물 없음 (항응고제 및 골다공증약 무관)</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 3-3. Clinical Red Flags & Safety Warnings */}
        {patient.redFlags && patient.redFlags.length > 0 && (
          <div className="rounded-lg bg-rose-100/80 border border-rose-300 p-3 space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-rose-950">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>진료의 필독: 임상 위험 주의 경고 (Clinical Red Flags)</span>
            </div>
            <div className="space-y-1 pl-1">
              {patient.redFlags.map((flag, idx) => (
                <div
                  key={idx}
                  className="text-xs text-rose-900 font-medium leading-relaxed flex items-start gap-1.5"
                >
                  <span className="text-rose-600 font-bold">•</span>
                  <span>{flag}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* 4. 문진 기반 추정 감별진단군 (Optional in compact / modal)     */}
      {/* ============================================================ */}
      {showSuspectedConditions && patient.suspectedConditions && patient.suspectedConditions.length > 0 && (
        <div className="rounded-xl bg-teal-50/60 border border-teal-200 p-3.5 space-y-2">
          <span className="text-[11px] font-bold tracking-wide uppercase text-teal-900 block">
            문진 기반 추정 감별진단군 (Suspected Conditions)
          </span>
          <div className="flex flex-wrap gap-1.5">
            {patient.suspectedConditions.map((cond, i) => (
              <span
                key={i}
                className="text-xs px-2.5 py-1 rounded-md bg-white text-teal-900 border border-teal-300 font-semibold shadow-2xs"
              >
                {cond}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
