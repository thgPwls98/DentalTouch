import { QueuePatient, PastVisitRecord, DentalDepartment } from '../types';

/**
 * Maps dental departments to standard attending faculty professors
 */
const PROFESSOR_BY_DEPT: Record<string, string> = {
  보존과: '조보존 교수',
  치주과: '윤치주 교수',
  보철과: '김보철 교수',
  구강외과: '유외과 교수',
  구강내과: '정내과 교수',
};

/**
 * Checks if two patient records represent the same clinical patient
 */
export function isSamePatient(
  a: QueuePatient['patient'],
  b: QueuePatient['patient']
): boolean {
  if (!a || !b) return false;

  const nameA = a.name?.trim();
  const nameB = b.name?.trim();
  if (!nameA || !nameB) return false;

  // 1. If names are identical
  if (nameA === nameB) {
    // If both have RRN front and they are different, they are definitely different patients
    if (a.rrnFront && b.rrnFront && a.rrnFront !== b.rrnFront) {
      return false;
    }
    // If both have phone numbers and they match
    if (a.phone && b.phone && a.phone === b.phone) return true;
    // If both have RRN front and they match
    if (a.rrnFront && b.rrnFront && a.rrnFront === b.rrnFront) return true;
    // If gender matches and age is identical or close (+/- 1)
    if (a.gender && b.gender && a.gender === b.gender) {
      if (typeof a.age === 'number' && typeof b.age === 'number') {
        if (Math.abs(a.age - b.age) <= 2) return true;
      }
      return true;
    }
    // If age is available and differs significantly (>2 years), they are different
    if (typeof a.age === 'number' && typeof b.age === 'number') {
      if (Math.abs(a.age - b.age) > 2) return false;
    }
    // Fallback: If names match in the hospital registry
    return true;
  }

  // 2. If phone number matches exactly
  if (a.phone && b.phone && a.phone === b.phone) return true;

  // 3. If patient ID matches
  if (a.patientId && b.patientId && a.patientId === b.patientId) return true;

  return false;
}

/**
 * Aggregates all clinical records for a given patient from:
 * 1. The live Firestore database (`allPatients`)
 * 2. Embedded baseline medical records (`patient.pastVisits`)
 *
 * Excludes the current active consultation itself, merges duplicates,
 * and sorts all visits strictly by date (most recent first).
 */
export function getAggregatedPatientHistory(
  targetPatient: QueuePatient,
  allPatients: QueuePatient[] = []
): PastVisitRecord[] {
  if (!targetPatient) return [];

  const history: PastVisitRecord[] = [];
  const seenKeys = new Set<string>();

  // 1. Gather real clinical records from the database
  for (const other of allPatients) {
    // Skip the current visit record itself
    if (other.id === targetPatient.id) continue;

    if (isSamePatient(targetPatient.patient, other.patient)) {
      const dept = other.recommendedDepartment || '보존과';
      const doctor = PROFESSOR_BY_DEPT[dept] || `${dept} 담당교수`;
      const isSameDay = other.date === targetPatient.date;

      const diagnosis =
        other.suspectedConditions && other.suspectedConditions.length > 0
          ? other.suspectedConditions.join(', ')
          : other.areaTitle;

      const treatment =
        other.treatmentPlan || other.doctorDiagnosisNote || '임상 검진 및 처치 시행';

      const recordKey = `${other.date}_${dept}_${other.time || ''}`;
      if (!seenKeys.has(recordKey)) {
        seenKeys.add(recordKey);
        history.push({
          date: other.date,
          time: other.time,
          department: dept,
          areaTitle: other.areaTitle,
          diagnosis,
          treatment,
          prescriptions: other.prescriptions || '처방 없음',
          doctor,
          status: other.status,
          chiefComplaint: other.chiefComplaint,
          doctorDiagnosisNote: other.doctorDiagnosisNote,
          isRealDbRecord: true,
          isSameDayConsultation: isSameDay,
          assignedChair: other.assignedChair,
          recommendedRoom: other.recommendedRoom,
        });
      }
    }
  }

  // 2. Gather embedded baseline past visits (e.g. prior years / initial transfer)
  if (targetPatient.pastVisits && Array.isArray(targetPatient.pastVisits)) {
    for (const v of targetPatient.pastVisits) {
      const recordKey = `${v.date}_${v.department}`;
      if (!seenKeys.has(recordKey)) {
        seenKeys.add(recordKey);
        history.push({
          ...v,
          isRealDbRecord: false,
          isSameDayConsultation: false,
        });
      }
    }
  }

  // 3. Sort strictly descending by date and time (most recent first)
  history.sort((a, b) => {
    const dateCmp = b.date.localeCompare(a.date);
    if (dateCmp !== 0) return dateCmp;
    return (b.time || '').localeCompare(a.time || '');
  });

  return history;
}

/**
 * Computes multi-disciplinary consultation summary statistics
 */
export function getPatientConsultationStats(records: PastVisitRecord[]) {
  const totalCount = records.length;
  const realDbCount = records.filter((r) => r.isRealDbRecord).length;
  const sameDayConsultCount = records.filter((r) => r.isSameDayConsultation).length;

  const deptCounts: Record<string, number> = {};
  records.forEach((r) => {
    const d = r.department || '치과';
    deptCounts[d] = (deptCounts[d] || 0) + 1;
  });

  const departments = Object.keys(deptCounts);

  return {
    totalCount,
    realDbCount,
    sameDayConsultCount,
    deptCounts,
    departments,
    isReturningPatient: totalCount > 0,
    isMultiDeptPatient: departments.length >= 2,
  };
}
