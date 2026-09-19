import {
  collection,
  getDocs,
  writeBatch,
  doc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import { QueuePatient } from '../types';

const MIGRATION_FLAG_KEY = 'oz_dental_patient_id_unification_v2026';

export interface MigrationResult {
  totalProcessed: number;
  updatedCount: number;
  success: boolean;
  error?: string;
}

/**
 * Migrates all Firestore patient documents in `dental_triage_queue`:
 * 1. Checks all documents in the collection.
 * 2. Unifies patient ID format into `DEN-2026-XXXXX` sequentially ordered by createdAt or date/time.
 * 3. Updates both the patient object and the document fields cleanly.
 */
export async function runPatientIdUnificationMigration(force = false): Promise<MigrationResult> {
  if (!force) {
    try {
      if (localStorage.getItem(MIGRATION_FLAG_KEY) === 'completed') {
        return { totalProcessed: 0, updatedCount: 0, success: true };
      }
    } catch {
      // ignore
    }
  }

  const collectionRef = collection(db, 'dental_triage_queue');

  try {
    const snapshot = await getDocs(collectionRef);
    if (snapshot.empty) {
      localStorage.setItem(MIGRATION_FLAG_KEY, 'completed');
      return { totalProcessed: 0, updatedCount: 0, success: true };
    }

    const docsWithData: { id: string; data: any; sortKey: string }[] = [];
    snapshot.forEach((d) => {
      const data = d.data();
      // sort key: date + time or createdAt
      const date = data.date || '2026-09-16';
      const time = data.time || '00:00';
      docsWithData.push({
        id: d.id,
        data,
        sortKey: `${date}_${time}`,
      });
    });

    // Sort chronologically
    docsWithData.sort((a, b) => a.sortKey.localeCompare(b.sortKey));

    // Map each patient name/RRN to a persistent unified serial number
    const personToIdMap = new Map<string, string>();
    let serialCounter = 1;

    let batch = writeBatch(db);
    let batchCount = 0;
    let updatedCount = 0;

    for (const item of docsWithData) {
      const patient = item.data.patient || {};
      const personKey = `${(patient.name || '').trim()}_${patient.rrnFront || patient.phone || ''}`;

      let unifiedPatientId = personToIdMap.get(personKey);
      if (!unifiedPatientId) {
        // Check if patient already has a valid DEN-2026-XXXXX
        const currentId = patient.patientId || '';
        const match = currentId.match(/^DEN-2026-(\d+)$/);
        if (match) {
          unifiedPatientId = currentId;
          const num = parseInt(match[1], 10);
          if (num >= serialCounter) {
            serialCounter = num + 1;
          }
        } else {
          unifiedPatientId = `DEN-2026-${String(serialCounter).padStart(5, '0')}`;
          serialCounter++;
        }
        personToIdMap.set(personKey, unifiedPatientId);
      }

      // If document patientId differs, update it
      const currentPatientId = patient.patientId;
      if (currentPatientId !== unifiedPatientId) {
        const docRef = doc(collectionRef, item.id);
        batch.update(docRef, {
          'patient.patientId': unifiedPatientId,
          updatedAt: serverTimestamp(),
        });
        batchCount++;
        updatedCount++;

        // Commit every 400 operations to respect Firestore 500 limit
        if (batchCount >= 400) {
          await batch.commit();
          batch = writeBatch(db);
          batchCount = 0;
        }
      }
    }

    if (batchCount > 0) {
      await batch.commit();
    }

    try {
      localStorage.setItem(MIGRATION_FLAG_KEY, 'completed');
    } catch {
      // ignore
    }

    return {
      totalProcessed: docsWithData.length,
      updatedCount,
      success: true,
    };
  } catch (error: any) {
    console.warn('[Migration Notice]: Could not complete remote migration due to:', error);
    return {
      totalProcessed: 0,
      updatedCount: 0,
      success: false,
      error: error?.message || String(error),
    };
  }
}
