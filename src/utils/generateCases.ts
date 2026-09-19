import { QueuePatient, DentalDepartment, TriageLevel, PatientStatus, PastVisitRecord } from '../types';
import { getTodayDateString } from './dateUtils';
import { generatePatientSafetyProfile, generateDetailedQuestionnaire } from './clinicalProfiles';

interface ClinicalArchetype {
  category: '소아' | '청소년' | '청년' | '중장년' | '노년';
  ageRange: [number, number];
  department: DentalDepartment;
  areaTitleTemplate: string;
  locationTitle: string;
  recommendedRoom: string;
  assignedChairOptions: string[];
  triageLevel: TriageLevel;
  chiefComplaintList: string[];
  historyOfPresentIllnessList: string[];
  suspectedConditions: string[];
  doctorDiagnosisNoteList: string[];
  treatmentPlanList: string[];
  prescriptionsList: string[];
}

const FIRST_NAMES_MALE = [
  '민준', '서준', '도윤', '예준', '시우', '하준', '지호', '주원', '지후', '준서',
  '준우', '현우', '도현', '건우', '우진', '선우', '서진', '유찬', '연우', '은우',
  '승우', '승민', '정우', '재윤', '태윤', '시윤', '민규', '성민', '동현', '준혁',
  '성호', '광수', '영수', '정식', '병철', '종환', '기석', '대성', '상훈', '진우',
  '영호', '철수', '동원', '태환', '재현', '성현', '원준', '창현', '재원', '찬우'
];

const FIRST_NAMES_FEMALE = [
  '서연', '서윤', '지우', '서현', '하은', '하윤', '민서', '지아', '윤서', '지유',
  '채원', '수아', '지윤', '은서', '다은', '예나', '수빈', '소율', '예린', '하율',
  '아린', '유나', '소은', '가은', '나은', '채은', '시은', '서아', '민아', '수현',
  '정희', '순자', '옥자', '명숙', '영숙', '경자', '미경', '은영', '현정', '지영',
  '수진', '혜진', '보라', '하나', '미나', '소희', '지민', '유진', '혜원', '소연'
];

const LAST_NAMES = [
  '김', '이', '박', '최', '정', '강', '조', '윤', '장', '임',
  '한', '오', '서', '신', '권', '황', '안', '송', '류', '홍',
  '고', '문', '양', '손', '배', '백', '허', '유', '남', '심',
  '노', '하', '곽', '성', '차', '주', '우', '구', '민', '진'
];

// Clinical Archetypes systematically organized by all 5 departments
export const DEPARTMENT_ARCHETYPES: Record<DentalDepartment, ClinicalArchetype[]> = {
  // ==========================================
  // 1. 보철과 (Prosthodontics)
  // ==========================================
  '보철과': [
    {
      category: '중장년',
      ageRange: [42, 59],
      department: '보철과',
      areaTitleTemplate: '상악 좌측 제2소구치 브릿지 (#25-#27)',
      locationTitle: '본관 3층 보철클리닉',
      recommendedRoom: '보철 1진료실',
      assignedChairOptions: ['1번 체어', '3번 체어'],
      triageLevel: '일반',
      chiefComplaintList: [
        '10년 전에 씌운 3개짜리 금니 브릿지가 덜렁거리더니 밥 먹다 쑥 빠졌어요.',
        '보철물이 빠진 자리 냄새가 나고 안쪽 치아가 까맣게 썩은 것 같습니다.',
        '빠진 보철물을 다시 붙일 수 있는지 아니면 지르코니아로 새로 해야 하는지 봐주세요.'
      ],
      historyOfPresentIllnessList: [
        '지대치 (#25, #27) 시멘트 용해로 보철물 탈락. #25 우식 진행.',
        '잔존 치질 평가: #25 치관 40% 잔존, 코어 재형성 및 치은연하 마진 정리 필요.'
      ],
      suspectedConditions: ['고정성 보철물 탈락 (Bridge Debonding)', '#25 지대치 2차 우식증'],
      doctorDiagnosisNoteList: [
        '기존 보철물 재부착 불가. 지대치 우식 치질 제거 후 코어 빌드업 및 지르코니아 재제작 적응증.',
        '#26 결손 부위 임플란트 식립 또는 지르코니아 3본 브릿지 재수복 상담.'
      ],
      treatmentPlanList: [
        '우식부위 정리 후 복합레진 코어 재구축 및 프렙(지대치 형성), 임시치아 즉일 제작',
        '구강스캐너(Trios 5)를 이용한 디지털 인상 채득 후 지르코니아 브릿지 기공 의뢰'
      ],
      prescriptionsList: ['처방 없음 (임시치아 장착)']
    },
    {
      category: '노년',
      ageRange: [65, 85],
      department: '보철과',
      areaTitleTemplate: '하악 전악 무치악 및 총의치 (Full Denture)',
      locationTitle: '본관 3층 보철클리닉',
      recommendedRoom: '보철 2진료실',
      assignedChairOptions: ['2번 체어', '특진 체어'],
      triageLevel: '일반',
      chiefComplaintList: [
        '틀니를 끼고 씹을 때마다 잇몸 한쪽이 콕콕 찔리고 살이 까져서 피가 나요.',
        '틀니가 헐거워서 말할 때마다 덜커덩 빠지고 잇몸 궤양이 생겼어요.',
        '오래된 틀니가 닳아서 새 틀니(보험 틀니) 제작 상담을 받고 싶습니다.'
      ],
      historyOfPresentIllnessList: [
        '하악 총의치 장착 4년 경과. 치조제 흡수로 의치 부적합(Ill-fitting) 및 유지력 상실.',
        '우측 구후융기(Retromolar pad) 부위 압박 궤양(Sore spot) 확인.'
      ],
      suspectedConditions: ['의치성 구내염 및 압박 궤양 (Denture Stomatitis)', '치조골 고도 흡수'],
      doctorDiagnosisNoteList: [
        'PIP(Pressure Indicating Paste) 도포 후 의치 내면 과도 압박 부위 릴리프(삭제).',
        '하악 치조제 흡수 심각하여 리라이닝(Relining) 또는 오버덴처 고려.'
      ],
      treatmentPlanList: [
        '압박 부위 의치상 선택적 삭제 연마, 연조직 치유용 구강연고 도포',
        '조직 치유 후 연질 이장재(Tissue Conditioner) 도포 및 1주 간격 점검'
      ],
      prescriptionsList: ['페리덱스 연고 1튜브 (궤양 부위 국소 도포)']
    },
    {
      category: '청년',
      ageRange: [22, 35],
      department: '보철과',
      areaTitleTemplate: '상악 전치부 심미 지르코니아 (#11, #21)',
      locationTitle: '본관 3층 보철클리닉',
      recommendedRoom: '보철 1진료실',
      assignedChairOptions: ['1번 체어', '4번 체어'],
      triageLevel: '일반',
      chiefComplaintList: [
        '예전에 했던 앞니 올세라믹 보철물 끝 모서리가 깨져서 웃을 때 너무 흉해요.',
        '앞니 보철물 색상이 인접 자연치와 어색하게 달라서 지르코니아로 재치료 원합니다.',
        '식사 중 앞니 보철물이 흔들려서 탈락될 것 같아요.'
      ],
      historyOfPresentIllnessList: [
        '#11, #21 올세라믹 크라운 절단부 치핑(Chipping) 파절. 교합 간섭 관찰.',
        '변연부 미세 누출 및 치경부 변색 확인. 치은염증 경미.'
      ],
      suspectedConditions: ['심미 보철물 치핑 파절 (Ceramic Fracture)', '전치부 교합 간섭'],
      doctorDiagnosisNoteList: [
        '기존 파절 크라운 철거 후 지대치 재형성(Re-prep). 고투광성 멀티레이어 지르코니아 적응증.',
        '자연치아 셰이드 가이드(VITA 3D Master)로 색조 및 명도 정밀 측정.'
      ],
      treatmentPlanList: [
        '기존 크라운 안전 철거, 지대치 마진 정리 및 임시치아 즉일 셋팅',
        '디지털 구강스캔 및 셰이드 매칭 후 맞춤형 지르코니아 전장관 제작 의뢰'
      ],
      prescriptionsList: ['처방 없음']
    },
    {
      category: '중장년',
      ageRange: [48, 62],
      department: '보철과',
      areaTitleTemplate: '상악 부분틀니 및 지대치 (#14, #15, #24, #25 RPD)',
      locationTitle: '본관 3층 보철클리닉',
      recommendedRoom: '보철 2진료실',
      assignedChairOptions: ['3번 체어', '특진 체어'],
      triageLevel: '일반',
      chiefComplaintList: [
        '부분틀니 걸쇠(고리)가 똑 부러져서 씹을 때 틀니가 들썩거려요.',
        '부분틀니를 걸어놓은 앞쪽 치아가 흔들리고 시큰거려요.',
        '부분틀니 장착 후 잇몸에 턱이 걸리고 헐거워졌습니다.'
      ],
      historyOfPresentIllnessList: [
        '국소의치(RPD) 3년 사용 중 유지장치(I-bar Clasp) 금속 피로 파단.',
        '지대치 과도한 측방력으로 치주인대강 확장. 서베이드 크라운 지대치 보강 필요.'
      ],
      suspectedConditions: ['국소의치 클래스프 파절 (Clasp Fracture)', '지대치 교합성 외상'],
      doctorDiagnosisNoteList: [
        '원내 덴탈 레이저 용접 또는 클래스프 재제작 수리 가능 여부 평가.',
        '의치상 내면 적합도 재검사 및 교합 고경(VDO) 안정성 확인.'
      ],
      treatmentPlanList: [
        '의치 픽업 인상(Pick-up Impression) 채득 및 당일 클래스프 수리/교체 기공',
        '지대치 레스트시트(Rest seat) 교합 조정 및 불소도포'
      ],
      prescriptionsList: ['처방 없음']
    },
    {
      category: '노년',
      ageRange: [68, 86],
      department: '보철과',
      areaTitleTemplate: '하악 2임플란트 오버덴처 (#33, #43 Locator)',
      locationTitle: '본관 3층 보철클리닉',
      recommendedRoom: '보철 1진료실',
      assignedChairOptions: ['2번 체어', '4번 체어'],
      triageLevel: '일반',
      chiefComplaintList: [
        '임플란트 틀니 똑딱이 단추가 헐거워져서 밥 먹을 때 틀니가 자꾸 솟구쳐요.',
        '틀니 안쪽 고무 파킹(나일론 캡)이 닳아 빠진 것 같아요.',
        '임플란트 기둥 주변 틀니가 덜컥거리고 잇몸이 아픕니다.'
      ],
      historyOfPresentIllnessList: [
        '하악 오버덴처 로케이터(Locator) 어태치먼트 장착 2년 경과.',
        '수나일론 캡(Male Retention Cap) 마모로 유지력(1.5lb -> 0.2lb) 소실.'
      ],
      suspectedConditions: ['오버덴처 로케이터 캡 마모 (Attachment Wear)', '유지력 상실'],
      doctorDiagnosisNoteList: [
        '임플란트 지대주(Locator Abutment) 자체 나사 풀림 없음. 캡 마모 확인.',
        '새 나일론 유지 캡(핑크 3.0lb) 즉일 교체로 즉각적인 고정력 회복 가능.'
      ],
      treatmentPlanList: [
        '전용 툴을 이용한 구 캡 제거 및 신품 로케이터 나일론 캡(Pink Medium) 체결',
        '의치 탈착 훈련 및 양측성 균형교합 점검'
      ],
      prescriptionsList: ['처방 없음']
    }
  ],

  // ==========================================
  // 2. 구강내과 (Oral Medicine)
  // ==========================================
  '구강내과': [
    {
      category: '청소년',
      ageRange: [14, 19],
      department: '구강내과',
      areaTitleTemplate: '양측 악관절 (TMJ)',
      locationTitle: '본관 1층 구강내과 진료실',
      recommendedRoom: '구강내과 1진료실',
      assignedChairOptions: ['1번 체어', '특진 체어'],
      triageLevel: '일반',
      chiefComplaintList: [
        '시험공부 스트레스 때문인지 입 벌릴 때 턱에서 딱딱 소리가 나고 아파요.',
        '아침에 일어나면 턱이 뻐근해서 하품을 시원하게 못 하겠어요.',
        '자면서 이를 너무 꽉 깨무는 버릇이 있어 턱관절이 쑤십니다.'
      ],
      historyOfPresentIllnessList: [
        '고등학생 수험생. 최근 3주 전부터 개구 시 우측 관절음(Clicking) 및 통증 악화.',
        '개구량 32mm로 제한 관찰. 교근 및 측두근 압통(Tenderness) 양성.'
      ],
      suspectedConditions: ['악관절 내장증 (TMJ Internal Derangement)', '저작근 근막동통증후군 (Myofascial Pain)'],
      doctorDiagnosisNoteList: [
        '파노라마 및 TMJ 규격 촬영 상 과두 골변화는 없으나 관절원판 전방변위 의심.',
        '저작근 긴장도 증가. 온습포 찜질 및 물리치료, 행동조절 요법 추천.'
      ],
      treatmentPlanList: [
        '구강내과 분사신장치료 및 온습포 물리치료(TENS), 6분 악관절 이완운동 교육',
        '증상 지속 시 이갈이/이악물기 방지용 스플린트(교합안정장치) 고려'
      ],
      prescriptionsList: ['아세클로페낙 100mg 1T bid, 에페리손염산염 50mg 1T bid (5일분)']
    },
    {
      category: '노년',
      ageRange: [63, 85],
      department: '구강내과',
      areaTitleTemplate: '설체부 및 전악 구강점막',
      locationTitle: '본관 1층 구강내과 진료실',
      recommendedRoom: '구강내과 1진료실',
      assignedChairOptions: ['1번 체어', '2번 체어'],
      triageLevel: '일반',
      chiefComplaintList: [
        '입안이 바짝바짝 말라 침이 안 나오고 혀가 고춧가루 뿌린 듯이 화끈화끈 타들어가요.',
        '틀니 끼는 것도 아프고 매운 김치나 찌개를 도저히 먹을 수가 없어요.',
        '혓바닥이 갈라지고 따가워서 밤에 잠을 설칩니다.'
      ],
      historyOfPresentIllnessList: [
        '6개월 전부터 구강 건조 및 작열감 지속. 음식물 섭취 시 자극감 심화.',
        '타액 분비율 측정: 비자극 타액분비 0.05 ml/min (정상치 0.3~0.4 미달).'
      ],
      suspectedConditions: ['구강 작열감 증후군 (Burning Mouth Syndrome)', '노인성 구강 건조증 (Xerostomia)'],
      doctorDiagnosisNoteList: [
        '점막상 궤양이나 진균 감염(캔디다) 없음. 신경병증성 동통 및 타액 분비 저하 소견.',
        '인공타액 스프레이 사용 및 수분 섭취, 자극성 음식 제한 지도.'
      ],
      treatmentPlanList: [
        '인공타액 분무제 처방, 무설탕 자일리톨 껌 저작을 통한 타액선 자극 요법 안내',
        '증상 심할 시 클로나제팜 저용량 구강 가글 후 뱉는 국소 요법 검토'
      ],
      prescriptionsList: ['인공타액액(제로바액) 1병, 비타민 B 복합제 1T qd (30일분)']
    },
    {
      category: '청년',
      ageRange: [20, 35],
      department: '구강내과',
      areaTitleTemplate: '협점막 및 설측 변연부 궤양',
      locationTitle: '본관 1층 구강내과 진료실',
      recommendedRoom: '구강내과 2진료실',
      assignedChairOptions: ['2번 체어', '3번 체어'],
      triageLevel: '일반',
      chiefComplaintList: [
        '입안 빰 안쪽과 혀 옆에 하얗게 헐어서 밥 먹을 때 너무 쓰라리고 아파요.',
        '피곤할 때마다 구내염이 서너 개씩 생겨서 말을 하기 힘들어요.',
        '밥 먹다가 뺨을 세게 씹었는데 그 자리가 며칠째 크게 헐었습니다.'
      ],
      historyOfPresentIllnessList: [
        '반복성 아프타성 구내염 기왕력. 4일 전 직장 야근 후 우측 협점막 4mm 타원형 궤양 발생.',
        '궤양 중심부 황백색 위막, 주변 홍반성 달무리(Erythematous halo) 전형적 소견.'
      ],
      suspectedConditions: ['재발성 소아프타 (Minor Aphthous Ulcer)', '외상성 궤양 (Traumatic Ulcer)'],
      doctorDiagnosisNoteList: [
        '악성 소견 없음. 전형적인 아프타성 구내염. 저출력 다이오드 레이저 조사로 즉시 통증 경감 가능.',
        '국소 스테로이드 연고 도포 및 구강 청결 유지 권고.'
      ],
      treatmentPlanList: [
        '통증 완화 목적 저출력 레이저(LLLT) 궤양 조사 및 구강 소독',
        '트리암시놀론 구강연고 도포 지도 및 비타민 C/B 복합 영양 지도'
      ],
      prescriptionsList: ['오라메디 연고 1튜브, 헥사메딘 0.12% 가글액 (1주일분)']
    },
    {
      category: '청년',
      ageRange: [24, 38],
      department: '구강내과',
      areaTitleTemplate: '양측 교근 및 측두근 (이갈이 마모증)',
      locationTitle: '본관 1층 구강내과 진료실',
      recommendedRoom: '구강내과 1진료실',
      assignedChairOptions: ['1번 체어', '특진 체어'],
      triageLevel: '일반',
      chiefComplaintList: [
        '자면서 이를 너무 심하게 갈아서 룸메이트/배우자가 잠을 못 잔다고 해요.',
        '아침에 일어날 때마다 양쪽 턱과 관자놀이가 뻐근하고 두통이 옵니다.',
        '이갈이 방지용 맞춤형 마우스피스(스플린트) 제작 상담 원합니다.'
      ],
      historyOfPresentIllnessList: [
        '수면 중 심한 이갈이(Sleep Bruxism) 및 주간 이악물기(Clenching) 습관.',
        '전치부 절단연 마모면(Facet) 다수 확인. 교근 비대증(Masseteric Hypertrophy) 관찰.'
      ],
      suspectedConditions: ['수면 이갈이증 (Sleep Bruxism)', '저작근 비대 및 긴장성 두통'],
      doctorDiagnosisNoteList: [
        '치아 마모 진행 및 턱관절 부하 방지 위해 경성 교합안정장치(Hard Stabilization Splint) 필수.',
        '필요시 저작근 보톡스(Botulinum Toxin) 주사 병행 고려.'
      ],
      treatmentPlanList: [
        '상하악 정밀 인상 채득 및 안궁(Face-bow) 이전, 중심위(CR) 기록 채득 후 스플린트 제작 의뢰',
        '구강악안면 근이완 요법 및 이완 스트레칭 안내'
      ],
      prescriptionsList: ['근이완제(에페리손) 50mg 1T hs (취침 전 7일분)']
    },
    {
      category: '중장년',
      ageRange: [46, 62],
      department: '구강내과',
      areaTitleTemplate: '양측 협점막 및 치은 레이스양 백색 병소',
      locationTitle: '본관 1층 구강내과 진료실',
      recommendedRoom: '구강내과 2진료실',
      assignedChairOptions: ['2번 체어', '4번 체어'],
      triageLevel: '준응급',
      chiefComplaintList: [
        '입안 볼 안쪽에 그물 모양 흰 줄이 생기고 매운 음식이 닿으면 불타듯 따가워요.',
        '잇몸이 벗겨지고 칫솔질할 때마다 쓰라려서 치과 진단을 권유받았습니다.',
        '혀 밑과 입술 안쪽이 거칠거칠하고 하얗게 번져서 걱정돼요.'
      ],
      historyOfPresentIllnessList: [
        '52세 여성. 3개월 전부터 구강 협점막 백색 망상형(Wickham striae) 병소 및 미란.',
        '칸디다 도말검사 음성. 자가면역성 점막 질환 의심.'
      ],
      suspectedConditions: ['구강 편평태선 (Oral Lichen Planus - Reticular/Erosive type)'],
      doctorDiagnosisNoteList: [
        '전형적인 미란성 구강 편평태선 소견. 악성화 가능성 매우 낮으나 주기적 추적 필수.',
        '국소 고역가 스테로이드 가글 요법(클로베타솔)으로 증상 조절 시작.'
      ],
      treatmentPlanList: [
        '국소 스테로이드 가글액(Dexamethasone rinse) 투여 요법 개시 및 교육',
        '자극성 음식 및 음주 금지, 1개월 후 병소 크기 및 미란 재평가'
      ],
      prescriptionsList: ['덱사메타손 가글액 0.1mg/ml (14일분), 바셀린 연고']
    }
  ],

  // ==========================================
  // 3. 보존과 (Conservative Dentistry)
  // ==========================================
  '보존과': [
    {
      category: '소아',
      ageRange: [4, 8],
      department: '보존과',
      areaTitleTemplate: '상악 우측 유구치 (#54, #55)',
      locationTitle: '본관 2층 소아·보존진료실',
      recommendedRoom: '보존 1진료실',
      assignedChairOptions: ['1번 체어', '2번 체어', '특진 체어'],
      triageLevel: '일반',
      chiefComplaintList: [
        '단 과자나 초콜릿 먹을 때마다 어금니가 쿡쿡 쑤신다고 울어요.',
        '밥 먹을 때 한쪽으로만 씹으려고 하고 칫솔 닿으면 아프대요.',
        '영치 충치 검진 및 충치 치료 상담으로 내원했습니다.'
      ],
      historyOfPresentIllnessList: [
        '보호자 진술: 2주 전부터 식사 시 간헐적 동통 호소. 인접면 치아 우식 진행.',
        '유치 우식 호발 부위 갈색 변색 확인. 저작 시 불편감 호소.'
      ],
      suspectedConditions: ['#54, #55 유치 우식증 (Early Childhood Caries)', '가역성 유치 치수염'],
      doctorDiagnosisNoteList: [
        '와동 깊이 상아질 중층까지 진행. 치수 노출 없음. 러버댐 적용 하 치료 가능.',
        '유전치 및 유구치 우식 진행. 소아 행동조절 하 레진 충전 시행.'
      ],
      treatmentPlanList: [
        '우식부위 감염치질 제거 후 복합레진 즉일 충전 및 불소도포',
        '기성금속관(SS Crown) 수복 및 인접치아 치면열구전색(실란트)'
      ],
      prescriptionsList: ['어린이용 타이레놀현탁액 5ml (필요시 복용)']
    },
    {
      category: '소아',
      ageRange: [6, 11],
      department: '보존과',
      areaTitleTemplate: '하악 제1대구치 (#36, #46)',
      locationTitle: '본관 2층 보존진료실',
      recommendedRoom: '보존 2진료실',
      assignedChairOptions: ['2번 체어', '3번 체어'],
      triageLevel: '일반',
      chiefComplaintList: [
        '첫 영구치 어금니 홈메우기(실란트) 예방치료 받으러 왔어요.',
        '영구치 올라오는 틈에 충치가 생긴 것 같아요.'
      ],
      historyOfPresentIllnessList: [
        '영구치 맹출 완료. 깊은 소와열구 관찰되어 예방적 실란트 도포 권장.',
        '초등학교 구강검진 후 충치 소견으로 정밀 진단차 내원.'
      ],
      suspectedConditions: ['#36, #46 깊은 소와 및 열구 (Deep Pits and Fissures)', '초기 법랑질 우식'],
      doctorDiagnosisNoteList: [
        '방사선 소견 상 치수 이상 없음. 열구 내 착색 및 초기 우식 양호.',
        '충치 예방 목적 치면열구전색술(실란트) 적응증 확인.'
      ],
      treatmentPlanList: [
        '치면 세마 후 #36, #46 치면열구전색(Sealant) 시술 및 불소바니시 도포',
        '3개월 뒤 정기 검진 및 올바른 칫솔질(TBI) 교육'
      ],
      prescriptionsList: ['처방 없음 (예방 진료)']
    },
    {
      category: '청소년',
      ageRange: [14, 19],
      department: '보존과',
      areaTitleTemplate: '상악 전치부 절단면 (#11, #21)',
      locationTitle: '본관 2층 보존진료실',
      recommendedRoom: '보존 1진료실',
      assignedChairOptions: ['1번 체어', '3번 체어'],
      triageLevel: '준응급',
      chiefComplaintList: [
        '체육 시간에 농구공에 맞아 앞니 끝 모서리가 깨져나갔어요.',
        '앞니가 깨져서 찬 바람이 닿으면 몹시 시리고 혀에 긁혀요.'
      ],
      historyOfPresentIllnessList: [
        '외상 2일 전 발생. 절단면 법랑질 및 상아질 일부 파절(Ellis Class II).',
        '방사선 소견 상 치수 노출은 없으나 잔존 상아질 두께 얇음. 동요도 미미.'
      ],
      suspectedConditions: ['#11 비복잡 치관 파절 (Ellis Class II Crown Fracture)'],
      doctorDiagnosisNoteList: [
        '전기치수검사(EPT) 정상 반응. 치근 파절 없음. 심미 복합레진 수복 최적.',
        '지각과민 억제제 도포 후 자연스러운 셰이드 매칭 수복 필요.'
      ],
      treatmentPlanList: [
        '베벨 형성 후 상아질 접착제 및 복합레진 층상 충전(Layering), 심미 연마',
        '3개월 후 치수 생활력 재평가(Vitality Test) 추적 관찰'
      ],
      prescriptionsList: ['이부프로펜 400mg 1T tid (통증 시)']
    },
    {
      category: '청년',
      ageRange: [23, 34],
      department: '보존과',
      areaTitleTemplate: '상악 소구치 치경부 (#14, #24)',
      locationTitle: '본관 2층 보존진료실',
      recommendedRoom: '보존 2진료실',
      assignedChairOptions: ['2번 체어', '3번 체어'],
      triageLevel: '일반',
      chiefComplaintList: [
        '찬물 마실 때나 양치할 때 치아 목 부분이 찌릿찌릿 칼로 베이는 듯 시려요.',
        '손톱으로 치아 경계를 긁으면 파인 홈이 만져지고 통증이 있습니다.',
        '분노의 양치질 탓인지 이가 닳아서 패였어요.'
      ],
      historyOfPresentIllnessList: [
        '좌우측 소구치 협측 치경부 V자형 치질 결손 확인. 깊이 1.5mm.',
        '지각과민 검사(Air syringe) 시 날카로운 잔존통 3초 발생.'
      ],
      suspectedConditions: ['#14, #24 치경부 마모증 (Cervical Abrasion)', '상아질 지각과민증'],
      doctorDiagnosisNoteList: [
        '치수강 침범 없음. 법랑질 상아질 경계부 쐐기형 결손. 레진 충전 적응증.',
        '칫솔질 방법(회전법) 교정 및 마모도 낮은 치약 사용 권고.'
      ],
      treatmentPlanList: [
        '치면 격리 후 치경부 전용 광중합 복합레진 심미 충전 및 교합 조정',
        '지각과민처치제 도포 및 올바른 칫솔질 교육'
      ],
      prescriptionsList: ['처방 없음 (원내 수복 완료)']
    },
    {
      category: '중장년',
      ageRange: [38, 56],
      department: '보존과',
      areaTitleTemplate: '상악 우측 제1대구치 (#16)',
      locationTitle: '본관 2층 보존진료실',
      recommendedRoom: '보존 1진료실',
      assignedChairOptions: ['1번 체어', '2번 체어', '특진 체어'],
      triageLevel: '응급',
      chiefComplaintList: [
        '밤새 치아가 욱신거려 한숨도 못 잤어요. 타이레놀을 먹어도 통증이 가라앉지 않아요.',
        '찬물을 입에 물고 있으면 통증이 잠깐 멎는데 물을 뱉으면 지옥 같은 통증이 옵니다.',
        '씹는 건 고사하고 혀만 닿아도 심장이 뛰는 것처럼 욱신거립니다.'
      ],
      historyOfPresentIllnessList: [
        '기존 깊은 아말감 하방 2차 우식 진행. 3일 전부터 극심한 자발통 및 야간통.',
        '냉자극 검사 시 30초 이상 지속되는 둔통. 타진 반응(Percussion) 극심 양성.'
      ],
      suspectedConditions: ['#16 급성 비가역성 치수염 (Acute Irreversible Pulpitis)', '#16 급성 치근단 치주염'],
      doctorDiagnosisNoteList: [
        '치수강 개방 시 고압성 출혈 및 삼출액 확인. 즉각적인 치수 발수(Pulpectomy) 필요.',
        '근관 4개(MB1, MB2, DB, P) 확인. 근관장 측정 및 확대 진행.'
      ],
      treatmentPlanList: [
        '마취 하 치수강 개방, 근관 발수 및 성형, Ca(OH)2 첩약 및 임시 밀폐',
        '차주: 근관 소독 세척(NaOCl) 후 가타파차 충전(엔도 완료), 코어 및 크라운 수복'
      ],
      prescriptionsList: ['아목시실린 500mg tid (3일분), 덱시부프로펜 300mg tid, 소화제 tid']
    },
    {
      category: '중장년',
      ageRange: [42, 58],
      department: '보존과',
      areaTitleTemplate: '하악 좌측 제1대구치 (#36)',
      locationTitle: '본관 2층 보존진료실',
      recommendedRoom: '보존 3진료실',
      assignedChairOptions: ['3번 체어', '4번 체어'],
      triageLevel: '준응급',
      chiefComplaintList: [
        '밥이나 고기를 씹을 때 깜짝 놀랄 만큼 찌릿하고 날카로운 통증이 와요.',
        '차가운 음식을 마실 때 시큰거리고 씹을 때마다 턱이 빠질 것 같습니다.',
        '딱딱한 견과류를 씹은 뒤부터 특정 각도로 씹으면 너무 아파요.'
      ],
      historyOfPresentIllnessList: [
        '저작 시 날카로운 통증 호소. 기존 골드 인레이 경계부 미세 크랙 관찰.',
        'Bite-stick 검사 시 근심 설측 교두에서 극심한 통증(Rebound pain) 재현.'
      ],
      suspectedConditions: ['#36 치아 균열 증후군 (Tooth Crack Syndrome)', '가역성/비가역성 치수염 경계'],
      doctorDiagnosisNoteList: [
        '투광검사(Transillumination) 및 메틸렌블루 염색 상 치수강 방향 균열선 확인.',
        '크랙 전파 방지 위해 교합면 삭제 및 임시 밴드/크라운 장착 후 경과 관찰.'
      ],
      treatmentPlanList: [
        '교합면 삭제 후 지르코니아 전장관 임시 세팅하여 저작통 소실 여부 평가',
        '증상 지속 시 근관치료 병행 후 지르코니아 크라운 영구 접착'
      ],
      prescriptionsList: ['록소프로펜나트륨 60mg tid (3일분)']
    }
  ],

  // ==========================================
  // 4. 치주과 (Periodontology)
  // ==========================================
  '치주과': [
    {
      category: '청년',
      ageRange: [21, 33],
      department: '치주과',
      areaTitleTemplate: '전악 치은 및 하악 전치부 설측',
      locationTitle: '본관 2층 치주센터',
      recommendedRoom: '치주 1진료실',
      assignedChairOptions: ['1번 체어', '2번 체어'],
      triageLevel: '일반',
      chiefComplaintList: [
        '양치할 때마다 칫솔에 피가 묻어나오고 입냄새가 신경 쓰여요.',
        '치아 안쪽에 단단한 노란 돌(치석)이 끼어서 스케일링 받으러 왔습니다.',
        '잇몸이 약간 붉게 부어오른 느낌이 듭니다.'
      ],
      historyOfPresentIllnessList: [
        '최근 1년 6개월간 스케일링 미수검. 하악 전치 설측 다량의 치은연상 치석.',
        '치은 출혈지수(BOP) 35%. 치주낭 깊이 2~3mm로 치조골 소실은 없음.'
      ],
      suspectedConditions: ['만성 단순 치은염 (Chronic Marginal Gingivitis)', '치은연상/연하 치석 침착'],
      doctorDiagnosisNoteList: [
        '방사선 소견 상 치조골 흡수 없는 가역적 치은염. 전악 스케일링으로 완전 회복 가능.',
        '초음파 스케일러를 이용한 전악 치석 제거술 시행.'
      ],
      treatmentPlanList: [
        '전악 초음파 치석제거술(스케일링) 및 치면 세마(Polishing)',
        '치간칫솔 및 치실 사용법 교육, 6개월 후 정기 스케일링 권고'
      ],
      prescriptionsList: ['처방 없음']
    },
    {
      category: '중장년',
      ageRange: [45, 59],
      department: '치주과',
      areaTitleTemplate: '하악 대구치 및 전악 치주 (#36, #46)',
      locationTitle: '본관 2층 치주센터',
      recommendedRoom: '치주 2진료실',
      assignedChairOptions: ['2번 체어', '3번 체어', '특진 체어'],
      triageLevel: '준응급',
      chiefComplaintList: [
        '어금니 잇몸이 풍선처럼 부풀어 오르고 손가락으로 누르면 노란 고름이 짜져요.',
        '치아가 들떠서 위아래 이가 먼저 닿아 아프고 씹을 수가 없습니다.',
        '찬물 더운물 모두 닿으면 잇몸 깊은 곳이 쑤시고 냄새가 심합니다.'
      ],
      historyOfPresentIllnessList: [
        '만성 치주염 기왕력. 최근 피로 누적으로 급성 치주농양(Periodontal Abscess) 발생.',
        '치주낭 깊이 8mm 탐침. 치아 동요도 2도. 치근 이개부 침범(Grade II).'
      ],
      suspectedConditions: ['#46 급성 치주농양 (Acute Periodontal Abscess)', '만성 중증 복합 치주염'],
      doctorDiagnosisNoteList: [
        '치주낭 절개 배농(I&D) 시행. 방사선 상 치조골 수직 흡수 관찰.',
        '염증 세척 후 국소 항생 연고 주입. 전악 치주치료 단계적 필수.'
      ],
      treatmentPlanList: [
        '농양 부위 절개 배농 및 소독 세척(0.12% Chlorhexidine), 미노클린 연고 주입',
        '차주 부종 완화 후 4분악 치근활택술(SRP) 및 치주소견 재평가'
      ],
      prescriptionsList: ['아목시실린/클라불란산 375mg tid (5일분), 덱시부프로펜 300mg tid']
    },
    {
      category: '노년',
      ageRange: [62, 82],
      department: '치주과',
      areaTitleTemplate: '상악 우측 제1대구치 임플란트 (#16)',
      locationTitle: '본관 2층 치주센터',
      recommendedRoom: '치주 1진료실',
      assignedChairOptions: ['1번 체어', '3번 체어'],
      triageLevel: '준응급',
      chiefComplaintList: [
        '5년 전 심은 임플란트 잇몸 주변에서 피가 나고 누르면 고름이 스며 나와요.',
        '임플란트 치아 주변 잇몸이 가라앉아 철 기둥이 보이고 씹을 때 불편해요.',
        '임플란트 흔들림은 없는데 잇몸 속이 뻐근합니다.'
      ],
      historyOfPresentIllnessList: [
        '#16 임플란트 식립 5년 경과. 구강위생 관리 미흡으로 치석 부착.',
        '탐침 시 치주낭 6mm, 출혈(BOP+) 및 배농 관찰. 방사선 상 변연골 흡수 2mm.'
      ],
      suspectedConditions: ['#16 임플란트 주위염 (Peri-implantitis)', '치조골 변연 흡수'],
      doctorDiagnosisNoteList: [
        '임플란트 고정체(Fixture) 동요도는 없음. 변연골 흡수 동반된 주위염 확진.',
        '티타늄 전용 큐렛 및 에어플로우(Air-flow)를 이용한 표면 제염술 필요.'
      ],
      treatmentPlanList: [
        '임플란트 보철물 분리 후 글라이신 파우더 표면 디컨태미네이션(Decontamination)',
        '클로르헥시딘 세척 및 국소 항균제 투약, 3개월 정기 치주 유지관리(SPT)'
      ],
      prescriptionsList: ['아목시실린 500mg tid (5일분), 클로르헥시딘 0.12% 양치액']
    }
  ],

  // ==========================================
  // 5. 구강외과 (Oral & Maxillofacial Surgery)
  // ==========================================
  '구강외과': [
    {
      category: '소아',
      ageRange: [5, 10],
      department: '구강외과',
      areaTitleTemplate: '하악 전치부 유치 (#71, #81)',
      locationTitle: '본관 3층 구강외과 진료실',
      recommendedRoom: '외과 1진료실',
      assignedChairOptions: ['1번 체어', '4번 체어'],
      triageLevel: '일반',
      chiefComplaintList: [
        '아래 앞니 유치가 심하게 흔들리고 뒤에서 영구치가 삐죽 나와요.',
        '유치가 안 빠졌는데 안쪽에서 새 이가 솟아올랐어요.'
      ],
      historyOfPresentIllnessList: [
        '유치 치근 흡수 80% 이상. 설측에서 영구 절치 맹출 진행 중.',
        '동요도 3도 확인. 저작 시 유치 걸림으로 발치 필요.'
      ],
      suspectedConditions: ['#71, #81 유치 만기 잔존 (Retained Deciduous Teeth)', '설측 영구치 맹출'],
      doctorDiagnosisNoteList: [
        '국소 표면마취(리도카인 젤) 후 단순 유치 발치 가능. 치근 잔존 없음.',
        '발치 후 혀의 압력으로 영구치가 정상 위치로 이동할 것으로 예상.'
      ],
      treatmentPlanList: [
        '표면마취 후 #71, #81 침윤마취 및 단순 유치 발치술, 거즈 30분 압박 지혈',
        '지혈 확인 및 다음 정기 맹출 검진 안내'
      ],
      prescriptionsList: ['처방 없음']
    },
    {
      category: '청년',
      ageRange: [20, 32],
      department: '구강외과',
      areaTitleTemplate: '하악 우측 수평매복 사랑니 (#48)',
      locationTitle: '본관 3층 구강외과 수술실',
      recommendedRoom: '외과 2진료실',
      assignedChairOptions: ['4번 체어', '5번 체어', '특진 체어'],
      triageLevel: '준응급',
      chiefComplaintList: [
        '오른쪽 아래 사랑니 쪽 잇몸이 빨갛게 붓고 침 삼킬 때 목구멍까지 아파요.',
        '사랑니 주변에서 고름 냄새가 나고 입이 잘 안 벌어져요.',
        '사랑니가 옆으로 누워 자라 앞 어금니를 밀어내서 발치 상담 원합니다.'
      ],
      historyOfPresentIllnessList: [
        '하악 우측 제3대구치 완전 수평 매복. 치관 주위 치은 발적 및 부종 심화.',
        '3일 전부터 개구장애(Trismus, 25mm) 발생. 하치조신경관 근접 소견.'
      ],
      suspectedConditions: ['#48 매복 지치 주위염 (Pericoronitis)', '#48 불완전 수평 매복'],
      doctorDiagnosisNoteList: [
        '3D 덴탈 CT 판독: 치근단이 하치조 신경관과 접촉. 치아 분할 및 골삭제 필요.',
        '급성 염증기 소염 후 발치 계획 수립. 오늘 1차 항생제 세척 시행.'
      ],
      treatmentPlanList: [
        '하치조신경전달마취 후 외과적 매복치 발치술(치관 분할 및 치근 분리 발치)',
        '혈병 형성 후 봉합(3-0 Silk), 지혈제 삽입, 냉찜질 교육 및 1주 뒤 발사'
      ],
      prescriptionsList: ['세파클러수화물 250mg tid (5일분), 록소프로펜 60mg tid, 소염효소제 tid']
    },
    {
      category: '노년',
      ageRange: [60, 86],
      department: '구강외과',
      areaTitleTemplate: '하악 좌측 잔존치근 (#37)',
      locationTitle: '본관 3층 구강외과 진료실',
      recommendedRoom: '외과 1진료실',
      assignedChairOptions: ['4번 체어', '5번 체어'],
      triageLevel: '일반',
      chiefComplaintList: [
        '어금니 머리가 다 부러져 뿌리만 남았는데 잇몸이 자꾸 곪아서 뽑고 싶어요.',
        '틀니를 새로 맞춰야 하는데 남아있는 썩은 뿌리를 빼라고 해서 왔습니다.',
        '뿌리 주변 잇몸이 가끔 붓고 냄새가 심해요.'
      ],
      historyOfPresentIllnessList: [
        '심한 치관 파절로 잇몸 하방 2mm 잔존 치근. 치근단 육아종 형성.',
        '방사선 소견 상 치근단 3mm 방사선 투과상. 치근 만곡 없음.'
      ],
      suspectedConditions: ['#37 만성 치근단 치주염 및 잔존 치근 (Retained Root Tip)'],
      doctorDiagnosisNoteList: [
        '보존 불가능한 잔존 치근. 침윤마취 하 난발치(치근 분할 발치) 적응증.',
        '전신질환(아스피린 복용 여부) 확인 완료: 3일 전 중단 상태 확인.'
      ],
      treatmentPlanList: [
        '국소 침윤마취 후 엘리베이터 및 발치 겸자를 이용한 잔존 치근 단순 발치술',
        '치조와 소파(Curettage)로 육아조직 완전 제거 후 봉합'
      ],
      prescriptionsList: ['세파클러 250mg tid (3일분), 록소프로펜 60mg tid']
    }
  ]
};

const TIME_SLOTS_WEEKDAY = [
  '09:00', '09:15', '09:30', '09:45', '10:00', '10:15', '10:30', '10:45',
  '11:00', '11:15', '11:30', '11:45', '14:00', '14:15', '14:30', '14:45',
  '15:00', '15:15', '15:30', '15:45', '16:00', '16:15', '16:30', '16:45',
  '17:00', '17:15'
];

const TIME_SLOTS_SATURDAY = [
  '09:00', '09:20', '09:40', '10:00', '10:20', '10:40', '11:00', '11:20',
  '11:40', '12:00', '12:20', '12:40', '13:00', '13:20', '13:40'
];

const TIME_SLOTS_SUNDAY = [
  '09:30', '10:15', '11:00', '11:45', '14:00', '14:45', '15:30'
];

const DEPARTMENTS: DentalDepartment[] = ['보존과', '치주과', '보철과', '구강외과', '구강내과'];

/**
 * Generates realistic past visits across hospital departments for each patient
 */
function generatePatientPastVisits(
  seed: number,
  patientAge: number,
  currentDept: DentalDepartment
): PastVisitRecord[] {
  const visitCounts = (seed % 3) + 1; // 1 to 3 past visits
  const visits: PastVisitRecord[] = [];

  const candidateDepts: DentalDepartment[] = ['보철과', '구강내과', '치주과', '보존과', '구강외과'];

  const pastTemplates: Record<DentalDepartment, Array<{
    area: string;
    diag: string;
    tx: string;
    rx: string;
    doc: string;
  }>> = {
    '보철과': [
      {
        area: '상악 우측 제1대구치 (#16)',
        diag: '골드 인레이 탈락 및 2차 우식',
        tx: '지르코니아 인레이 재수복 및 교합 조정 완료',
        rx: '처방 없음',
        doc: '김보철 교수'
      },
      {
        area: '하악 의치 (Denture)',
        diag: '의치 점막 압박성 궤양',
        tx: 'PIP 도포 후 의치 내면 선택적 릴리프 및 연질이장재 도포',
        rx: '페리덱스 연고 도포',
        doc: '이보철 임상강사'
      },
      {
        area: '상악 전치부 (#11, #21)',
        diag: '전치부 도재관 마모 및 색조 부조화',
        tx: '지르코니아 올세라믹 전장관 세팅 및 심미 연마',
        rx: '처방 없음',
        doc: '박보철 교수'
      }
    ],
    '구강내과': [
      {
        area: '양측 악관절 (TMJ)',
        diag: '악관절 내장증 및 저작근 근막동통',
        tx: '온열 분사신장치료(TENS) 및 턱관절 6-6-6 운동 교육',
        rx: '에페리손 50mg, 나프록센 250mg (5일분)',
        doc: '정내과 교수'
      },
      {
        area: '협점막 및 혀',
        diag: '재발성 아프타성 구내염',
        tx: '저출력 레이저(LLLT) 조사 및 구강 소독',
        rx: '오라메디 연고 1튜브, 탄튬 가글액',
        doc: '최내과 임상강사'
      },
      {
        area: '전악 치아 교합면',
        diag: '수면 이갈이(Bruxism) 및 치아 마모',
        tx: '경성 교합안정장치(Splint) 장착 및 교합 점검',
        rx: '근이완제 7일분',
        doc: '한내과 교수'
      }
    ],
    '치주과': [
      {
        area: '전악 치은 및 치주낭',
        diag: '만성 단순 치은염',
        tx: '전악 초음파 치석제거술(스케일링) 및 치주낭 측정',
        rx: '처방 없음',
        doc: '윤치주 교수'
      },
      {
        area: '상악 대구치부 (#16, #17)',
        diag: '중등도 치주염 (치주낭 5mm)',
        tx: '1/4분악 치근활택술(SRP) 및 치주 세척',
        rx: '클로르헥시딘 0.12% 가글액',
        doc: '강치주 교수'
      }
    ],
    '보존과': [
      {
        area: '하악 제1대구치 (#36)',
        diag: '심연성 치아우식증 (Caries)',
        tx: '우식 치질 제거 및 복합레진 즉일 충전(Filtek Z350)',
        rx: '처방 없음',
        doc: '조보존 교수'
      },
      {
        area: '상악 소구치 (#14)',
        diag: '치경부 마모증 (Cervical Abrasion)',
        tx: '러버댐 하 광중합 레진 충전 및 지각과민처치',
        rx: '처방 없음',
        doc: '문보존 임상강사'
      }
    ],
    '구강외과': [
      {
        area: '하악 좌측 사랑니 (#38)',
        diag: '매복 지치 주위염',
        tx: '소염 세척 및 1주일 후 발치 예약',
        rx: '세파클러 250mg, 록소프로펜 60mg (3일분)',
        doc: '유외과 교수'
      }
    ]
  };

  const dates = ['2026-03-15', '2025-11-20', '2025-06-08', '2024-12-14'];
  const usedDepts = new Set<DentalDepartment>();

  for (let i = 0; i < visitCounts; i++) {
    // Select department systematically, ensuring strictly distinct departments per visit
    let deptIdx = (seed + i * 2) % candidateDepts.length;
    let attempts = 0;
    while (usedDepts.has(candidateDepts[deptIdx]) && attempts < candidateDepts.length) {
      deptIdx = (deptIdx + 1) % candidateDepts.length;
      attempts++;
    }
    const d = candidateDepts[deptIdx];
    usedDepts.add(d);

    const templates = pastTemplates[d];
    const tpl = templates[(seed + i) % templates.length];
    visits.push({
      date: dates[i % dates.length],
      department: d,
      areaTitle: tpl.area,
      diagnosis: tpl.diag,
      treatment: tpl.tx,
      prescriptions: tpl.rx,
      doctor: tpl.doc,
    });
  }

  // Sort past visits strictly descending by date (most recent first)
  visits.sort((a, b) => b.date.localeCompare(a.date));

  return visits;
}

/**
 * Generates rich, authentic clinical data for 3 months (Aug, Sep, Oct 2026).
 * Ensures ALL 5 departments are represented EVERY day, with complete
 * history for 보철과, 구강내과, 보존과, 치주과, and 구강외과.
 */
export function generate3MonthsUniqueCases(): Omit<QueuePatient, 'id'>[] {
  const result: Omit<QueuePatient, 'id'>[] = [];
  const usedPhoneNumbers = new Set<string>();

  let globalPatientCounter = 0;

  const months = [
    { year: 2026, month: 8, days: 31, prefix: '08' },
    { year: 2026, month: 9, days: 30, prefix: '09' },
    { year: 2026, month: 10, days: 31, prefix: '10' },
  ];

  for (const m of months) {
    for (let day = 1; day <= m.days; day++) {
      const dayStr = day < 10 ? `0${day}` : `${day}`;
      const dateStr = `${m.year}-${m.prefix}-${dayStr}`;
      const dateObj = new Date(m.year, m.month - 1, day);
      const dayOfWeek = dateObj.getDay(); // 0 = Sun, 6 = Sat

      let timeSlots: string[];
      if (dayOfWeek === 0) {
        timeSlots = TIME_SLOTS_SUNDAY; // 7 slots
      } else if (dayOfWeek === 6) {
        timeSlots = TIME_SLOTS_SATURDAY; // 15 slots
      } else {
        timeSlots = TIME_SLOTS_WEEKDAY; // 26 slots
      }

      for (let idx = 0; idx < timeSlots.length; idx++) {
        globalPatientCounter++;
        const timeSlot = timeSlots[idx];

        // CRITICAL: Guarantee that EVERY single day systematically rotates
        // through ALL 5 DEPARTMENTS so that every day has patients in
        // 보존과, 치주과, 보철과, 구강외과, and 구강내과!
        const dept = DEPARTMENTS[(idx + day) % 5];
        const archetypesForDept = DEPARTMENT_ARCHETYPES[dept];
        const arch = archetypesForDept[(globalPatientCounter + idx) % archetypesForDept.length];

        // Gender & Name
        const isMale = (globalPatientCounter + day) % 2 === 0;
        const lastName = LAST_NAMES[(globalPatientCounter * 3 + day * 7) % LAST_NAMES.length];
        const firstName = isMale
          ? FIRST_NAMES_MALE[(globalPatientCounter + idx * 3) % FIRST_NAMES_MALE.length]
          : FIRST_NAMES_FEMALE[(globalPatientCounter + idx * 3) % FIRST_NAMES_FEMALE.length];
        const fullName = `${lastName}${firstName}`;

        // Age calculated precisely within range
        const [minAge, maxAge] = arch.ageRange;
        const age = minAge + ((globalPatientCounter + day * 2 + idx) % (maxAge - minAge + 1));

        // RRN Front calculation matching 2026
        const birthYear = 2026 - age;
        const yy = String(birthYear).slice(-2);
        const mm = String(((globalPatientCounter + day) % 12) + 1).padStart(2, '0');
        const dd = String(((globalPatientCounter + idx) % 28) + 1).padStart(2, '0');
        const rrnFront = `${yy}${mm}${dd}`;

        // Distinct Phone number
        let phoneMid = 1000 + ((globalPatientCounter * 17) % 9000);
        let phoneEnd = 1000 + ((globalPatientCounter * 31 + day * 13) % 9000);
        let phone = `010-${phoneMid}-${phoneEnd}`;
        while (usedPhoneNumbers.has(phone)) {
          phoneEnd = (phoneEnd + 1) % 10000;
          phone = `010-${phoneMid}-${String(phoneEnd).padStart(4, '0')}`;
        }
        usedPhoneNumbers.add(phone);

        // Standard Hospital Chart Serial Number (Unified format: DEN-2026-00001)
        const patientId = `DEN-2026-${String(globalPatientCounter).padStart(5, '0')}`;

        // Determine Status based on date:
        // 1. August 2026 (all): '완료' (과거 전체 진료 완료 히스토리)
        // 2. September 1~9: '완료' (과거 전체 진료 완료 히스토리)
        // 3. September 10 (Today):
        //    - Slots 0 ~ 9: '완료' (오늘 오전 진료 완료 히스토리 - 보철과 2건, 구강내과 2건 포함!)
        //    - Slots 10 ~ 13: '진료중'
        //    - Slots 14 ~ 15: '호출중'
        //    - Slots 16 ~ 25: '진료대기'
        // 4. September 11~30 & October 1~31: '진료대기' (미래 진료 대기열)
        // Determine Status based on dynamic real-time today date:
        // 1. Past dates (dateStr < todayStr): '완료' (과거 전체 진료 완료 히스토리)
        // 2. Today (dateStr === todayStr):
        //    - Slots 0 ~ 9: '완료' (오늘 오전 진료 완료 히스토리 - 5개 분과 골고루)
        //    - Slots 10 ~ 13: '진료중'
        //    - Slots 14 ~ 15: '호출중'
        //    - Slots 16 ~ 25: '진료대기'
        // 3. Future dates (dateStr > todayStr): '진료대기' (미래 진료 대기열)
        const todayStr = getTodayDateString();
        let status: PatientStatus = '완료';

        if (dateStr < todayStr) {
          status = '완료';
        } else if (dateStr === todayStr) {
          if (idx <= 9) {
            status = '완료'; // Finished morning cases covering ALL 5 departments
          } else if (idx <= 13) {
            status = '진료중'; // Currently in chair
          } else if (idx <= 15) {
            status = '호출중'; // Currently calling
          } else {
            status = '진료대기'; // Waiting in waiting lounge
          }
        } else {
          // Future dates
          status = '진료대기';
        }

        // Assigned Chair
        const assignedChair = arch.assignedChairOptions[idx % arch.assignedChairOptions.length];

        // Generate realistic clinical safety profile (allergies, systemic medications, bleeding risk, red flags)
        const safetyProfile = generatePatientSafetyProfile(globalPatientCounter, age);
        const questionnaire = generateDetailedQuestionnaire(globalPatientCounter, arch.triageLevel, safetyProfile);

        // Specific clinical text variations
        const ccIdx = (globalPatientCounter + day) % arch.chiefComplaintList.length;
        const hpiIdx = (globalPatientCounter + idx) % arch.historyOfPresentIllnessList.length;
        const noteIdx = (globalPatientCounter + day * 3) % arch.doctorDiagnosisNoteList.length;
        const planIdx = (globalPatientCounter + idx * 2) % arch.treatmentPlanList.length;
        const rxIdx = (globalPatientCounter + day) % arch.prescriptionsList.length;

        // Structured multi-part Chief Complaint (spoken complaint, pain scale, chewing/daily limitation)
        const chiefComplaint = [
          arch.chiefComplaintList[ccIdx],
          questionnaire.painScale,
          questionnaire.functionalImpairment,
        ].join('\n');

        // Structured multi-part History of Present Illness (Hx onset, clinical course, soft tissue, prosthetics, saliva, systemic)
        const historyOfPresentIllness = [
          questionnaire.onsetTimeline,
          arch.historyOfPresentIllnessList[hpiIdx],
          questionnaire.softTissueFinding,
          questionnaire.prostheticHistory,
          questionnaire.swallowingSalivaStatus,
          questionnaire.systemicOncologyHx,
        ].join('\n');

        const doctorDiagnosisNote =
          status === '완료' || status === '진료중'
            ? arch.doctorDiagnosisNoteList[noteIdx]
            : status === '호출중'
            ? '초진/재진 접수 확인. 대기실 스마트 호출 및 진료실 안내 진행.'
            : '';

        const treatmentPlan =
          status === '완료' || status === '진료중'
            ? arch.treatmentPlanList[planIdx]
            : status === '호출중'
            ? '임상 검사 및 방사선 판독 후 처치 결정'
            : '';

        const prescriptions =
          status === '완료'
            ? arch.prescriptionsList[rxIdx]
            : '';

        // Generate rich past visits across departments (including 보철과, 구강내과)
        const pastVisits = generatePatientPastVisits(globalPatientCounter, age, arch.department);

        result.push({
          patient: {
            name: fullName,
            age,
            gender: isMale ? '남' : '여',
            phone,
            patientId,
            rrnFront,
          },
          date: dateStr,
          time: timeSlot,
          areaTitle: arch.areaTitleTemplate,
          locationTitle: arch.locationTitle,
          chiefComplaint,
          historyOfPresentIllness,
          suspectedConditions: arch.suspectedConditions,
          recommendedDepartment: arch.department,
          recommendedRoom: arch.recommendedRoom,
          assignedChair,
          triageLevel: arch.triageLevel,
          status,
          doctorDiagnosisNote,
          treatmentPlan,
          prescriptions,
          pastVisits,
          // Comprehensive Clinical Safety & Pre-examination data
          drugAllergies: safetyProfile.drugAllergies,
          hasNoAllergies: safetyProfile.hasNoAllergies,
          otherAllergyText: safetyProfile.otherAllergyText,
          allergies: safetyProfile.allergiesText,
          medicationsList: safetyProfile.medicationsList,
          hasNoMedications: safetyProfile.hasNoMedications,
          otherMedicationText: safetyProfile.otherMedicationText,
          medications: safetyProfile.medicationsText,
          bleedingTendency: safetyProfile.bleedingTendency,
          redFlags: safetyProfile.redFlags,
          medicalAlerts: safetyProfile.medicalAlerts,
        });
      }
    }
  }

  return result;
}

export function clearGeneratedCasesCache(): void {
  // Clears any local memory or generation counters
  console.log('[Cases Cache]: Generation cache cleared.');
}
