import { QueuePatient } from '../types';

export function exportPatientsToCSV(patients: QueuePatient[], filename = 'dentaltouch_patients.csv') {
  if (patients.length === 0) {
    alert('내보낼 환자 데이터가 없습니다.');
    return;
  }

  const headers = [
    '등록번호(ID)',
    '환자명',
    '성별',
    '나이',
    '연락처',
    '주민번호앞자리',
    '내원일자',
    '내원시간',
    '진료과목',
    '지정체어',
    '진료위치',
    '트리아지등급',
    '진료상태',
    '주소(C.C)',
    '약물알러지',
    '복용약물/기저질환',
    '출혈성향',
    '위험주의경고(RedFlags)',
    '현병력(Hx)',
    '의심진단군',
    '의사진단소견',
    '치료계획',
    '처방내역',
  ];

  const rows = patients.map((p) => {
    const allergyVal =
      p.drugAllergies && p.drugAllergies.length > 0
        ? p.drugAllergies.join('; ') + (p.otherAllergyText ? ` (${p.otherAllergyText})` : '')
        : p.allergies || (p.hasNoAllergies ? '없음' : '');

    const medVal =
      p.medicationsList && p.medicationsList.length > 0
        ? p.medicationsList.join('; ') + (p.otherMedicationText ? ` (${p.otherMedicationText})` : '')
        : p.medications || (p.hasNoMedications ? '없음' : '');

    const redFlagsVal = p.redFlags?.join(' | ') || '';

    return [
      `"${p.patient?.patientId || ''}"`,
      `"${p.patient?.name || ''}"`,
      `"${p.patient?.gender || ''}"`,
      p.patient?.age || '',
      `"${p.patient?.phone || ''}"`,
      `"${p.patient?.rrnFront || ''}"`,
      `"${p.date || ''}"`,
      `"${p.time || ''}"`,
      `"${p.recommendedDepartment || ''}"`,
      `"${p.assignedChair || ''}"`,
      `"${p.locationTitle || ''}"`,
      `"${p.triageLevel || ''}"`,
      `"${p.status || ''}"`,
      `"${(p.chiefComplaint || '').replace(/"/g, '""')}"`,
      `"${allergyVal.replace(/"/g, '""')}"`,
      `"${medVal.replace(/"/g, '""')}"`,
      `"${(p.bleedingTendency || '').replace(/"/g, '""')}"`,
      `"${redFlagsVal.replace(/"/g, '""')}"`,
      `"${(p.historyOfPresentIllness || '').replace(/"/g, '""')}"`,
      `"${(p.suspectedConditions?.join(', ') || '').replace(/"/g, '""')}"`,
      `"${(p.doctorDiagnosisNote || '').replace(/"/g, '""')}"`,
      `"${(p.treatmentPlan || '').replace(/"/g, '""')}"`,
      `"${(p.prescriptions || '').replace(/"/g, '""')}"`,
    ].join(',');
  });

  // Prepend UTF-8 BOM (\uFEFF) for Excel compatibility
  const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
