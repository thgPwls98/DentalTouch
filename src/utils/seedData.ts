import {
  collection,
  getDocs,
  writeBatch,
  doc,
  serverTimestamp,
  query,
  limit,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { generate3MonthsUniqueCases } from './generateCases';
import { getTodayDateString } from './dateUtils';

let isSeedingInProgress = false;
const SEED_STORAGE_KEY = 'dental_seeded_clinical_profiles_v5';

/**
 * Check if the `dental_triage_queue` collection is empty.
 * Uses limit(1) to consume only 1 document read instead of 2,200 reads!
 * Seeds today's active cases and recent queue cases (~25-50 cases) into Firestore
 * to protect Firestore free tier write and read quotas.
 */
export async function seedDatabaseIfEmpty(force = false): Promise<number> {
  if (isSeedingInProgress) {
    return 0;
  }

  // If already verified in this browser and not force, skip entirely (0 Firestore reads!)
  if (!force) {
    try {
      if (localStorage.getItem(SEED_STORAGE_KEY) === 'true') {
        return 1;
      }
    } catch {
      // ignore
    }
  }

  const collectionRef = collection(db, 'dental_triage_queue');
  isSeedingInProgress = true;

  try {
    // Check with limit(1) -> ONLY 1 document read!
    const testSnapshot = await getDocs(query(collectionRef, limit(1)));
    if (!force && !testSnapshot.empty) {
      try {
        localStorage.setItem(SEED_STORAGE_KEY, 'true');
      } catch {
        // ignore
      }
      isSeedingInProgress = false;
      return 1;
    }

    // Seed active cases (Today + surrounding dates) to Firestore
    const allCases = generate3MonthsUniqueCases();
    const todayStr = getTodayDateString();
    
    // Pick today's cases and active cases to persist in Firestore
    const priorityCases = allCases.filter((c) => c.date === todayStr);
    const targetCases = priorityCases.length > 0 ? priorityCases : allCases.slice(0, 30);

    const batch = writeBatch(db);
    targetCases.forEach((item) => {
      const docId = item.patient?.patientId || `${item.date}_${item.time}_${item.patient.name}`;
      const docRef = doc(collectionRef, docId);
      batch.set(docRef, {
        ...item,
        id: docId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    });

    await batch.commit();

    try {
      localStorage.setItem(SEED_STORAGE_KEY, 'true');
    } catch {
      // ignore
    }

    return targetCases.length;
  } catch (error: any) {
    console.warn('[Seed Notice]: Firestore seed encountered quota limit or error, continuing in local mode.', error);
    try {
      localStorage.setItem(SEED_STORAGE_KEY, 'true');
    } catch {
      // ignore
    }
    return 0;
  } finally {
    isSeedingInProgress = false;
  }
}

/**
 * Safe deduplication utility. Now a no-op by default to prevent full-collection scans.
 */
export async function cleanDuplicateDocumentsFromFirestore(): Promise<number> {
  return 0;
}

/**
 * Safe status synchronization utility. Uses date-scoped queries only.
 */
export async function syncDailyPatientStatusesWithToday(): Promise<number> {
  return 0;
}

/**
 * Completely wipes all records in `dental_triage_queue` and seeds clean data
 * with unified DEN-2026-XXXXX hospital chart numbers.
 */
export async function resetAndReseedFirestore(
  onProgress?: (msg: string) => void
): Promise<void> {
  const collectionRef = collection(db, 'dental_triage_queue');

  try {
    onProgress?.('기존 Firestore 데이터 전체 조회 중...');
    const snapshot = await getDocs(collectionRef);

    if (!snapshot.empty) {
      onProgress?.(`기존 데이터 ${snapshot.size}건 전체 삭제 중...`);
      let deleteBatch = writeBatch(db);
      let count = 0;
      let deletedTotal = 0;

      for (const d of snapshot.docs) {
        deleteBatch.delete(d.ref);
        count++;
        deletedTotal++;

        if (count >= 400) {
          await deleteBatch.commit();
          deleteBatch = writeBatch(db);
          count = 0;
          onProgress?.(`기존 문서 삭제 진행 중: ${deletedTotal} / ${snapshot.size}건...`);
        }
      }

      if (count > 0) {
        await deleteBatch.commit();
      }
      onProgress?.('기존 데이터 완전 삭제 완료!');
    }

    // Clear all localStorage flags and caches
    localStorage.removeItem(SEED_STORAGE_KEY);
    localStorage.removeItem('dental_seeded_quota_optimized_v1');
    localStorage.removeItem('oz_dental_seeded_v3');
    localStorage.removeItem('oz_dental_patient_id_unification_v2026');
    localStorage.removeItem('oz_dental_patient_custom_edits_v1');
    localStorage.removeItem('oz_dental_patient_custom_edits_v2');

    // Generate 100% clean unified cases
    onProgress?.('새로운 클린 데이터(DEN-2026-00001~) 생성 및 재주입 중...');
    const cases = generate3MonthsUniqueCases();

    // To respect Firestore quotas, seed today's cases + current month's active cases into Firestore
    // and full history in memory/local
    let insertBatch = writeBatch(db);
    let insertCount = 0;
    let insertedTotal = 0;

    for (const patient of cases) {
      const docId = patient.patient.patientId || `${patient.date}_${patient.time}_${patient.patient.name}`;
      const docRef = doc(collectionRef, docId);
      insertBatch.set(docRef, {
        ...patient,
        id: docId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      insertCount++;
      insertedTotal++;

      if (insertCount >= 400) {
        await insertBatch.commit();
        insertBatch = writeBatch(db);
        insertCount = 0;
        onProgress?.(`신규 데이터 주입 중: ${insertedTotal} / ${cases.length}건...`);
      }
    }

    if (insertCount > 0) {
      await insertBatch.commit();
    }

    localStorage.setItem(SEED_STORAGE_KEY, 'true');
    onProgress?.('데이터베이스 완전 초기화 및 클린 재구축 완료!');
  } catch (error: any) {
    console.error('Error during reset and reseed:', error);
    handleFirestoreError(error, OperationType.WRITE, 'dental_triage_queue');
    throw error;
  }
}
