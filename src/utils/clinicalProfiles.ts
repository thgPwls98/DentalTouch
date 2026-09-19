/**
 * Comprehensive Dental Clinical Profiles Generator
 * Provides authentic, diverse dental allergies, systemic medications, chronic diseases,
 * clinical red flags, bleeding tendencies, pain scale (NRS), functional impairments,
 * and structured Hx questionnaire sections for dental EMR & queue systems.
 */

export interface DentalSafetyProfile {
  drugAllergies: string[];
  hasNoAllergies: boolean;
  otherAllergyText: string;
  allergiesText: string;
  medicationsList: string[];
  hasNoMedications: boolean;
  otherMedicationText: string;
  medicationsText: string;
  bleedingTendency: string;
  redFlags: string[];
  medicalAlerts: string[];
}

export interface DetailedQuestionnaireProfile {
  painScale: string;
  functionalImpairment: string;
  onsetTimeline: string;
  softTissueFinding: string;
  prostheticHistory: string;
  swallowingSalivaStatus: string;
  systemicOncologyHx: string;
}

// ============================================================================
// 1. 치과 관련 약물 알러지 데이터셋
// ============================================================================
interface AllergyArchetype {
  label: string;
  flag: string;
  doctorAlert: string;
  category: '마취제' | '항생제' | '진통제' | '치과재료' | '기타';
}

const DENTAL_ALLERGY_POOL: AllergyArchetype[] = [
  {
    label: '치과 국소마취제(리도카인/에피네프린) 이상반응',
    flag: '[마취 쇼크 주의] 리도카인 투여 시 심계항진/호흡곤란 기왕력. 에피네프린 미포함(메피바카인 3% 등) 또는 대체 마취 고려.',
    doctorAlert: '국소마취제 주입 전 흡인(Aspiration) 철저 및 활력징후 모니터링 필수',
    category: '마취제',
  },
  {
    label: '페니실린계 항생제 (아목시실린, 오구멘틴)',
    flag: '[처방 금기] 페니실린계 알러지(전신 두드러기/혈관부종). 아목시실린/오구멘틴 투여 절대 금기. (클린다마이신 또는 마크로라이드계 대체)',
    doctorAlert: '페니실린계 항생제 원내 투여 및 처방전 발행 차단',
    category: '항생제',
  },
  {
    label: '세파계 항생제 (세파클러, 세프라딘)',
    flag: '[항생제 주의] 세팔로스포린계 알러지 이력. 페니실린계 교차반응성 주의 및 비베타락탐계 항생제 처방 권장.',
    doctorAlert: '세파클러/세프트리악손 처방 주의',
    category: '항생제',
  },
  {
    label: '소염진통제(NSAIDs / 아스피린)',
    flag: '[진통제 주의] NSAIDs(이부프로펜/록소프로펜/아스피린) 복용 후 천식 발작 및 두드러기 기왕력. 아세트아미노펜(타이레놀)으로만 진통제 처방.',
    doctorAlert: 'NSAIDs 소염진통제 처방 금기 (타이레놀 단일제 처방)',
    category: '진통제',
  },
  {
    label: '설파제(설폰아마이드계 약물)',
    flag: '[설파제 알러지] 피부 발진 및 가려움 기왕력. 설폰계 약물 성분 포함 제재 처방 금기.',
    doctorAlert: '설폰아마이드계 약물 주의',
    category: '항생제',
  },
  {
    label: '치과 라텍스(Latex / 러버댐 / 글러브)',
    flag: '[접촉 주의] 라텍스 알러지(구순 부종/피부염). 진료 시 논라텍스(니트릴) 글러브 및 논라텍스 러버댐 사용 필수.',
    doctorAlert: '원내 비라텍스 재료 전용 키트 사용',
    category: '치과재료',
  },
  {
    label: '치과 소독제(클로르헥시딘 / 헥사메딘)',
    flag: '[외용제 주의] 클로르헥시딘 가글액 접촉 시 구강 점막 작열감 및 발진. 생리식염수 또는 포비돈 요오드로 대체 소독.',
    doctorAlert: '헥사메딘 가글액 원내 도포 및 처방 금지',
    category: '치과재료',
  },
  {
    label: '포비돈 요오드 (베타딘)',
    flag: '[요오드 알러지] 포비돈 요오드 소독 시 피부 발적. 클로르헥시딘 또는 과산화수소수로 수술 부위 소독 대체.',
    doctorAlert: '베타딘 소독액 사용 금기',
    category: '치과재료',
  },
  {
    label: 'CT 조영제 이상반응',
    flag: '[방사선 주의] 과거 CT 조영제 주사 후 전신 두드러기 및 호흡 곤란. 조영 조기 촬영 필요 시 방사선과 협진.',
    doctorAlert: '조영제 사용 영상 검사 주의',
    category: '기타',
  },
  {
    label: '치과용 금속(니켈, 코발트-크롬 접촉 피부염)',
    flag: '[보철재료 주의] 비귀금속(Ni-Cr) 알러지 기왕력. PFM 보철 금지, 올세라믹(지르코니아/골드) 수복 적응증.',
    doctorAlert: '보철물 기공 시 니켈 프리(Nickel-free) 또는 올지르코니아 지정',
    category: '치과재료',
  },
];

// ============================================================================
// 2. 현재 복용 중인 약물 및 전신 기저질환 데이터셋
// ============================================================================
interface MedicationArchetype {
  medicationName: string;
  chronicDisease: string;
  bleedingTendency: string;
  flag?: string;
  doctorAlert?: string;
  ageMin: number;
}

const DENTAL_MEDICATION_POOL: MedicationArchetype[] = [
  // 1) 항혈소판제 / 항응고제 (출혈 위험)
  {
    medicationName: '아스피린 100mg (아스트릭스/바이엘)',
    chronicDisease: '심혈관 질환(협심증/스텐트 시술 후 유지)',
    bleedingTendency: '주의: 항혈소판제(아스피린) 복용 중 (압박 지혈 철저 요망)',
    flag: '[출혈 주의] 아스피린 복용 환자. 임의 중단 시 혈전 위험 있으므로 단독 발치/스케일링은 지혈제(지혈스폰지/봉합) 동반하여 지속 복용 하에 진행 권장.',
    doctorAlert: '외과 시술 후 최소 2시간 거즈 압박 지혈 지도',
    ageMin: 45,
  },
  {
    medicationName: '와파린 (쿠마딘정)',
    chronicDisease: '심방세동 및 인공 심장판막 치환술',
    bleedingTendency: '주의: 항응고제(와파린) 복용으로 지혈 지연 위험',
    flag: '[고위험 출혈] 와파린 복용 환자. 침습적 외과 술식 전 최근 72시간 내 PT INR 수치 확인 필수 (INR 2.0~3.0 범위 확인 후 진행).',
    doctorAlert: '내과 주치의 소견서 확인 및 국소 지혈 거즈/Surgicel 준비',
    ageMin: 55,
  },
  {
    medicationName: 'NOAC/DOAC (자렐토 15mg/리바록사반)',
    chronicDisease: '비판막성 심방세동 및 심부정맥 혈전증',
    bleedingTendency: '주의: 신규 경구 항응고제(NOAC) 복용 중 (지혈 지연 주의)',
    flag: '[출혈 주의] NOAC 항응고제 복용 환자. 반감기 고려하여 아침 복용 전 또는 주치의 협진 하에 발치 스케줄링.',
    doctorAlert: '침습적 치과 수술 시 국소 압박 및 봉합 철저',
    ageMin: 55,
  },
  {
    medicationName: '클로피도그렐 75mg (플라빅스정)',
    chronicDisease: '뇌경색 병력 및 경동맥 협착',
    bleedingTendency: '주의: 항혈소판제 복용 중 (지혈 지연 주의)',
    flag: '[출혈 주의] 플라빅스 복용 중. 발치 및 치주소파술 시 지혈 젤라틴 스폰지 삽입 및 단단한 압박 봉합 시행 요망.',
    doctorAlert: '술후 지혈 상태 30분 원내 관찰 후 귀가 지도',
    ageMin: 50,
  },

  // 2) 골다공증 치료제 (MRONJ/BRONJ 턱뼈 괴사 위험)
  {
    medicationName: '비스포스포네이트 경구제 (포사맥스/악토넬 4년 복용)',
    chronicDisease: '폐경 후 골다공증',
    bleedingTendency: '정상 지혈 (골괴사 MRONJ 고위험군)',
    flag: '[골괴사 위험] 비스포스포네이트 3년 이상 장기 복용 환자. 발치 및 임플란트 식립 시 약물관련 악골괴사(MRONJ) 위험성 설명 및 비침습적 보존 치료 우선 고려.',
    doctorAlert: '발치 불가피 시 침습 최소화, 골막 손상 방지, 수술 동의서 작성',
    ageMin: 60,
  },
  {
    medicationName: '프롤리아 피하주사 (데노수맙 6개월 주기 투여)',
    chronicDisease: '고위험군 골다공증',
    bleedingTendency: '정상 지혈 (MRONJ 위험군)',
    flag: '[골괴사 주의] 프롤리아 주사 치료 중. 주사 직후 3~4개월 침습적 외과 처치 유예 권장. 최종 투여 후 5~6개월 경과 시점 발치 계획 수립.',
    doctorAlert: '골흡수억제제 투여 일정 확인 후 침습 처치 스케줄링',
    ageMin: 62,
  },

  // 3) 신장질환 / 혈액투석
  {
    medicationName: '혈액투석 환자 (주 3회 인공신장실 투석, 헤파린 사용)',
    chronicDisease: '말기 신부전증 (ESRD on Hemodialysis)',
    bleedingTendency: '주의: 혈액투석 헤파린 투여로 인한 출혈 지연 위험',
    flag: '[혈액투석 환자] 동정맥루(A-V Fistula) 팔 혈압 측정 금지. 투석 당일은 헤파린 영향으로 치과 치료 금기, 투석 다음 날 오전 치료 권장. 신독성 약물(NSAIDs) 절대 처방 금기.',
    doctorAlert: '진통제 타이레놀 처방, 항생제 투석 후 보충 용량 확인',
    ageMin: 48,
  },
  {
    medicationName: '만성 신부전 3기 (혈청 크레아티닌 상승)',
    chronicDisease: '만성 콩팥병 (CKD Stage 3b)',
    bleedingTendency: '경미한 지혈 지연',
    flag: '[신장 기능 저하] 신배설 약물 용량 50% 감량 필요. 소염진통제(NSAIDs) 복용 시 급성 신부전 악화 위험 있으므로 타이레놀로 대체.',
    doctorAlert: '신독성 약물 처방 배제 및 충분한 수분 섭취 안내',
    ageMin: 55,
  },

  // 4) 스테로이드 / 면역억제제
  {
    medicationName: '경구 스테로이드 (소론도정/프레드니솔론 10mg 장기 복용)',
    chronicDisease: '전신 홍반성 루푸스(SLE) / 만성 천식',
    bleedingTendency: '모세혈관 취약성 (멍이 쉽게 듦)',
    flag: '[부신 부전 주의] 장기 스테로이드 복용으로 인한 외과적 스트레스 시 급성 부신 부전증(Adrenal crisis) 예방 스트레스 평가 및 술전 스테로이드 증량 협진.',
    doctorAlert: '감염 취약성으로 예방적 항생제 투여 검토',
    ageMin: 35,
  },
  {
    medicationName: '면역억제제 (메토트렉세이트 MTX + 류마티스 약물)',
    chronicDisease: '류마티스 관절염 (RA)',
    bleedingTendency: '정상 지혈',
    flag: '[면역 저하 주의] 면역억제제 투여 환자. 구강 내 2차 세균 감염 취약하므로 침습적 처치 전후 예방적 항생제 투약 및 구강 소독 철저.',
    doctorAlert: '술후 치유 지연 및 감염 징후 밀착 관찰',
    ageMin: 40,
  },

  // 5) 당뇨병 (혈당 강하제 / 인슐린)
  {
    medicationName: '경구 혈당강하제 (메트포르민 500mg, 자누비아 100mg)',
    chronicDisease: '제2형 당뇨병 (식후 혈당 조절 중)',
    bleedingTendency: '정상 지혈',
    flag: '[당뇨 저혈당 주의] 공복 상태 치과 진료 시 저혈당 쇼크 위험. 아침 식사 및 당뇨약 정상 복용 후 오전 진료 권장. 원내 포도당 캔디 구비.',
    doctorAlert: '식후 진료 여부 확인 및 스트레스 완화 진료',
    ageMin: 40,
  },
  {
    medicationName: '인슐린 다회 피하주사 (란투스 + 노보래피드)',
    chronicDisease: '제1형 / 조절 불량 당뇨병 (HbA1c 8.4%)',
    bleedingTendency: '정상 지혈 (술후 상처 치유 지연 주의)',
    flag: '[당화혈색소 8.4% 조절 불량] 고혈당으로 인한 술후 창상 치유 지연 및 농양 형성 위험 급증. 침습 수술 전후 감염 관리 철저.',
    doctorAlert: '치과 처치 전 간이 혈당(BST) 측정 후 200mg/dL 미만 확인',
    ageMin: 30,
  },

  // 6) 고혈압 / 심혈관 질환
  {
    medicationName: '노바스크정 5mg (암로디핀 CCB), 코자정 50mg (로사르탄)',
    chronicDisease: '본태성 고혈압',
    bleedingTendency: '정상 지혈 (혈압 상승 시 삼출성 출혈 주의)',
    flag: '[고혈압/치은비대 주의] CCB(칼슘채널차단제) 복용으로 인한 약물 유발성 치은 비대증(Gingival enlargement) 관찰 가능. 체어 기립 시 기립성 저혈압 주의.',
    doctorAlert: '치과 국소마취 시 에피네프린 혈압 상승 반응 주의',
    ageMin: 45,
  },
  {
    medicationName: '협심증 치료제 (시그마트, 니트로글리세린 설하정 지참)',
    chronicDisease: '불안정성 협심증',
    bleedingTendency: '정상 지혈',
    flag: '[협심증 발작 주의] 흉통 발작 시 즉시 체어 수평 유지 후 니트로글리세린 설하정 투여 준비. 국소마취제 에피네프린 1:100,000 최대 2앰플 이하 엄수.',
    doctorAlert: '산소 공급 장비 점검 및 통증 차단 철저',
    ageMin: 55,
  },

  // 7) 간질환 (간염, 간경변)
  {
    medicationName: 'B형 간염 항바이러스제 (바라크루드/비리어드)',
    chronicDisease: '만성 B형 간염 보균 / 초기 간경변',
    bleedingTendency: '주의: 간 기능 저하에 따른 응고인자 감소 및 지혈 지연',
    flag: '[간기능 주의] 간 대사성 마취제(아미드계) 및 소염진통제 체내 축적 주의. 술후 지혈 지연 가능성 대비 봉합 철저.',
    doctorAlert: '원내 교차 감염 예방 감염관리 준수',
    ageMin: 42,
  },

  // 8) 기타: 갑상선, 정신과, 천식
  {
    medicationName: '신지로이드정 0.05mg (레보티록신)',
    chronicDisease: '갑상선 기능 저하증',
    bleedingTendency: '정상 지혈',
    doctorAlert: '진정제 및 마취제 대사 지연 가능성 확인',
    ageMin: 30,
  },
  {
    medicationName: 'SSRI 항우울제 (졸로푸트 50mg) + 신경안정제 (자낙스 0.25mg)',
    chronicDisease: '불안장애 및 주요 우울장애',
    bleedingTendency: '정상 지혈',
    doctorAlert: '치과 공포증 심함. 친절한 안내 및 필요시 흡입 진정치료 고려',
    ageMin: 22,
  },
  {
    medicationName: '기관지 천식 흡입기 (벤토린 에어로졸) 지참',
    chronicDisease: '기관지 천식',
    bleedingTendency: '정상 지혈',
    flag: '[천식 발작 주의] 치과 스트레스 또는 NSAIDs 진통제로 인한 천식 발작 위험. 개인 흡입기(벤토린) 체어 옆 비치 필수 확인.',
    doctorAlert: '흡입기 지참 여부 확인 후 진료 착수',
    ageMin: 18,
  },
];

// ============================================================================
// 3. 통증 척도 (NRS) 및 일상 저작 장애 풀
// ============================================================================
const NRS_PAIN_SCALES = [
  'NRS 7/10점 (야간 자발통 극심하여 수면 곤란, 진통제 반응 저하)',
  'NRS 8/10점 (맥박 뛰듯 욱신거리는 급성 박동성 격통)',
  'NRS 6/10점 (저작 시 찌릿한 격통 발생, 차가운 물에 10초 이상 통증 지속)',
  'NRS 5/10점 (음식물 끼일 때마다 뻐근하고 시큰거리는 통증)',
  'NRS 4/10점 (간헐적 둔통 및 잇몸 주변 압통)',
  'NRS 3/10점 (찬물 섭취 시 순간적인 시림 발생, 자발통 없음)',
  'NRS 2/10점 (턱관절 개구 시 뻐근한 피로감 및 둔통)',
  'NRS 1/10점 (경미한 불편감 및 이물감)',
  'NRS 0/10점 (자각적 통증 없음, 보철물 탈락 및 정기 검진 내원)',
];

const FUNCTIONAL_IMPAIRMENTS = [
  '[일상 및 저작 장애] 해당 부위로 단단하거나 질긴 음식 저작 불가, 반대편으로만 편측 저작 중.',
  '[일상 및 저작 장애] 찬물이나 뜨거운 국물 섭취 시 찌릿한 통증으로 식사 진행 곤란.',
  '[일상 및 저작 장애] 대화 중 보철물 탈락 우려 및 웃을 때 앞니 파절로 심미적 위축.',
  '[일상 및 저작 장애] 입을 2cm 이상 벌리기 어렵고(개구 제한) 하품 시 턱관절 염발음 발생.',
  '[일상 및 저작 장애] 양치질 시 다량의 잇몸 출혈 발생 및 아침 기상 시 구강 내 피비린내/구취 호소.',
  '[일상 및 저작 장애] 틀니 착용 시 잇몸 궤양 부위가 짓눌려 일반 식사 불가, 유동식/죽 섭취 중.',
  '[일상 및 저작 장애] 음식물이 치아 사이에 깊게 박혀 치실 사용 시 통증 및 잇몸 부종 악화.',
  '[일상 및 저작 장애] 치아가 흔들려 사과나 깍두기 등 전치부 절단 저작 불가능.',
];

const ONSET_TIMELINES = [
  '[발병시기] 3일 전 저녁 식사 중 딱딱한 음식을 씹은 직후 급성 악화됨.',
  '[발병시기] 1주일 전부터 찬물에 시린 증상 지속되다가 2일 전부터 야간 자발통 시작됨.',
  '[발병시기] 2주 전 타치과 치료 후 불편감 지속되며 최근 3일간 잇몸 팽창.',
  '[발병시기] 1개월 전부터 서서히 잇몸이 들뜨고 양치할 때마다 피가 나기 시작함.',
  '[발병시기] 오늘 아침 기상 후 뺨과 턱 부위가 눈에 띄게 부어오르고 열감 동반됨.',
  '[발병시기] 6개월 전부터 턱관절에서 모래 갈리는 소리(Crepitus) 발생 후 최근 개구 제한 동반.',
  '[발병시기] 3년 전 수복한 보철물이 어제 식사 중 갑자기 탈락됨.',
  '[발병시기] 최근 스트레스 및 과로 후 혀 가장자리와 입술 안쪽에 궤양 및 작열통 급증.',
];

const SOFT_TISSUE_FINDINGS = [
  '[연조직 및 점막 소견] 해당 치은 변연부 급성 발적 및 부종 관찰, 탐침 시 출혈(BOP+).',
  '[연조직 및 점막 소견] 치근단 부위 치루(Sinus tract) 형성 및 압박 시 농양(Pus) 배출 확인.',
  '[연조직 및 점막 소견] 직경 4mm 원형 아프타성 궤양 관찰, 위막 형성 및 접촉 시 극심한 압통.',
  '[연조직 및 점막 소견] 구강 점막 전반에 걸친 망상형 백색 선상 병변(Wickham 선) 관찰.',
  '[연조직 및 점막 소견] 우측 협점막 부위 타구선 개구부 타액 분비 감소 및 점막 건조 양상.',
  '[연조직 및 점막 소견] 치간 유두부 퇴축(Black triangle) 및 치조골 흡수에 따른 치은 위축.',
  '[연조직 및 점막 소견] 연조직 특이 병변 없음, 각화치은 폭경 양호.',
];

const PROSTHETIC_HISTORIES = [
  '[치과 보철 이력] 7년 전 상악 구치부 PFM 브릿지 수복 기왕력 있음.',
  '[치과 보철 이력] 5년 전 하악 제1대구치 골드크라운 치료 완료 후 유지 중.',
  '[치과 보철 이력] 3년 전 제작한 하악 국소의치(RPD) 장착 중, 지대치 통증 호소.',
  '[치과 보철 이력] 2년 전 #11, #21 올세라믹 전장관 심미 수복 이력.',
  '[치과 보철 이력] 1년 전 타원 임플란트 2개 식립 수술 기왕력.',
  '[치과 보철 이력] 보철 수복 이력 없음 (자연치열 상태).',
];

const SWALLOWING_SALIVA_STATUS = [
  '[삼킴 및 타액 상태] 정상 연하 기능 및 정상 타액 분비 확인.',
  '[삼킴 및 타액 상태] 타액 분비 저하로 인한 구강 건조감(Xerostomia) 및 혀 백태 관찰.',
  '[삼킴 및 타액 상태] 연하 시 인후통 없음, 음식물 삼킴 장애 없음.',
  '[삼킴 및 타액 상태] 구강 점막 작열감으로 매운 음식 섭취 시 삼킴 곤란 호소.',
];

// ============================================================================
// 4. 환자 안전 프로필 및 상세 문진 조합 생성기
// ============================================================================

export function generatePatientSafetyProfile(
  patientSeed: number,
  age: number
): DentalSafetyProfile {
  const redFlags: string[] = [];
  const medicalAlerts: string[] = [];

  // 1. 알러지 생성 로직 (약 20% 확률로 특이 알러지 보유, 80%는 무알러지)
  const allergyRandom = (patientSeed * 37 + 11) % 100;
  let drugAllergies: string[] = [];
  let hasNoAllergies = true;
  let otherAllergyText = '';
  let allergiesText = '특이 약물 알러지 없음';

  if (allergyRandom < 22) {
    // 알러지 보유군
    hasNoAllergies = false;
    const allergyIdx = (patientSeed + age) % DENTAL_ALLERGY_POOL.length;
    const item = DENTAL_ALLERGY_POOL[allergyIdx];
    drugAllergies.push(item.label);
    allergiesText = item.label;

    if (item.flag) redFlags.push(item.flag);
    if (item.doctorAlert) medicalAlerts.push(item.doctorAlert);

    // 5% 확률로 2종 복합 알러지 (예: 페니실린 + NSAIDs 또는 라텍스)
    if (allergyRandom < 5) {
      const secondIdx = (allergyIdx + 3) % DENTAL_ALLERGY_POOL.length;
      const secondItem = DENTAL_ALLERGY_POOL[secondIdx];
      drugAllergies.push(secondItem.label);
      allergiesText += `, ${secondItem.label}`;
      if (secondItem.flag) redFlags.push(secondItem.flag);
    }
  }

  // 2. 기저질환 및 복용약 생성 로직 (연령대별 가중치)
  // 고령(60세 이상): 약 75% 기저질환/복용약 보유
  // 중장년(40~59세): 약 45% 보유
  // 청년/소아(40세 미만): 약 15% 보유
  const medRandom = (patientSeed * 53 + 7) % 100;
  const threshold = age >= 65 ? 80 : age >= 50 ? 55 : age >= 40 ? 40 : 15;

  let medicationsList: string[] = [];
  let hasNoMedications = true;
  let otherMedicationText = '';
  let medicationsText = '복용 약물 없음';
  let bleedingTendency = '없음 (정상 지혈)';

  if (medRandom < threshold) {
    hasNoMedications = false;
    // Filter available pool by age requirement
    const eligiblePool = DENTAL_MEDICATION_POOL.filter((m) => age >= m.ageMin);
    const poolToUse = eligiblePool.length > 0 ? eligiblePool : DENTAL_MEDICATION_POOL;

    const medIdx = (patientSeed * 3 + age) % poolToUse.length;
    const item = poolToUse[medIdx];

    medicationsList.push(`${item.medicationName} (${item.chronicDisease})`);
    medicationsText = `${item.medicationName} [${item.chronicDisease}]`;
    bleedingTendency = item.bleedingTendency;

    if (item.flag) redFlags.push(item.flag);
    if (item.doctorAlert) medicalAlerts.push(item.doctorAlert);

    // 고령층(60세 이상)인 경우 30% 확률로 2종 복합 질환 (예: 고혈압 + 당뇨, 또는 아스피린 + 골다공증)
    if (age >= 60 && medRandom < threshold * 0.4) {
      const secondMedIdx = (medIdx + 4) % poolToUse.length;
      const secondItem = poolToUse[secondMedIdx];
      if (secondItem.medicationName !== item.medicationName) {
        medicationsList.push(`${secondItem.medicationName} (${secondItem.chronicDisease})`);
        medicationsText += `, ${secondItem.medicationName} [${secondItem.chronicDisease}]`;
        if (secondItem.flag && !redFlags.includes(secondItem.flag)) {
          redFlags.push(secondItem.flag);
        }
        if (secondItem.bleedingTendency.includes('주의')) {
          bleedingTendency = secondItem.bleedingTendency;
        }
      }
    }
  }

  return {
    drugAllergies,
    hasNoAllergies,
    otherAllergyText,
    allergiesText,
    medicationsList,
    hasNoMedications,
    otherMedicationText,
    medicationsText,
    bleedingTendency,
    redFlags,
    medicalAlerts,
  };
}

export function generateDetailedQuestionnaire(
  patientSeed: number,
  triageLevel: string,
  safetyProfile: DentalSafetyProfile
): DetailedQuestionnaireProfile {
  // Pain scale (NRS) - triage level influences severity
  let painIdx: number;
  if (triageLevel === '응급') {
    painIdx = (patientSeed % 2); // NRS 7, 8
  } else if (triageLevel === '준응급') {
    painIdx = 2 + (patientSeed % 3); // NRS 6, 5, 4
  } else {
    painIdx = 4 + (patientSeed % 5); // NRS 4, 3, 2, 1, 0
  }
  const painScale = NRS_PAIN_SCALES[painIdx];

  const funcIdx = (patientSeed + 2) % FUNCTIONAL_IMPAIRMENTS.length;
  const functionalImpairment = FUNCTIONAL_IMPAIRMENTS[funcIdx];

  const onsetIdx = (patientSeed + 5) % ONSET_TIMELINES.length;
  const onsetTimeline = ONSET_TIMELINES[onsetIdx];

  const softIdx = (patientSeed + 3) % SOFT_TISSUE_FINDINGS.length;
  const softTissueFinding = SOFT_TISSUE_FINDINGS[softIdx];

  const prostIdx = (patientSeed + 7) % PROSTHETIC_HISTORIES.length;
  const prostheticHistory = PROSTHETIC_HISTORIES[prostIdx];

  const swallowIdx = (patientSeed + 4) % SWALLOWING_SALIVA_STATUS.length;
  const swallowingSalivaStatus = SWALLOWING_SALIVA_STATUS[swallowIdx];

  // Systemic oncology / chronic diseases Hx line
  let systemicOncologyHx = '[전신질환 및 종양학] 특이 전신 악성종양 기왕력 없음, 방사선 치료력 없음.';
  if (safetyProfile.medicationsList.length > 0) {
    systemicOncologyHx = `[전신질환 및 종양학] ${safetyProfile.medicationsText} 복용 중. 주기적 경과 관찰 중.`;
  }

  return {
    painScale,
    functionalImpairment,
    onsetTimeline,
    softTissueFinding,
    prostheticHistory,
    swallowingSalivaStatus,
    systemicOncologyHx,
  };
}
