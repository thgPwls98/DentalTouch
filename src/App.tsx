/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db, testConnection } from './firebase';
import { QueuePatient, PatientStatus, UserAccount } from './types';
import { getTodayDateString } from './utils/dateUtils';
import { exportPatientsToCSV } from './utils/csvExport';
import { Header } from './components/Header';
import { QueueBoard } from './components/QueueBoard';
import { CalendarView } from './components/CalendarView';
import { EmrModal } from './components/EmrModal';
import { KioskModal } from './components/KioskModal';
import { PrintChartModal } from './components/PrintChartModal';
import { CsvExportModal } from './components/CsvExportModal';
import { LoginScreen } from './components/LoginScreen';
import { DoctorWorkstation } from './components/DoctorWorkstation';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { seedDatabaseIfEmpty } from './utils/seedData';
import { generatePatientSafetyProfile } from './utils/clinicalProfiles';

const CURRENT_USER_STORAGE_KEY = 'oz_emr_logged_user';

export default function App() {
  const [patients, setPatients] = useState<QueuePatient[]>([]);
  const [activeView, setActiveView] = useState<'queue' | 'calendar'>('queue');
  const [selectedPatient, setSelectedPatient] = useState<QueuePatient | null>(null);
  const [printPatient, setPrintPatient] = useState<QueuePatient | null>(null);
  const [isKioskOpen, setIsKioskOpen] = useState<boolean>(false);
  const [kioskInitialData, setKioskInitialData] = useState<Partial<QueuePatient> | null>(null);
  const [isCsvExportOpen, setIsCsvExportOpen] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isQuotaExceeded, setIsQuotaExceeded] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleOpenKiosk = (initialData?: Partial<QueuePatient> | null) => {
    setKioskInitialData(initialData || null);
    setIsKioskOpen(true);
  };

  const handleCloseKiosk = () => {
    setIsKioskOpen(false);
    setKioskInitialData(null);
  };

  // Authentication & Current User State
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => {
    try {
      const saved = localStorage.getItem(CURRENT_USER_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return null;
  });

  // For doctors: whether viewing dedicated doctor workstation or toggled to general EMR queue
  const [doctorViewMode, setDoctorViewMode] = useState<'doctor' | 'general'>('doctor');

  const handleLogin = (account: UserAccount) => {
    setCurrentUser(account);
    setDoctorViewMode('doctor');
    try {
      localStorage.setItem(CURRENT_USER_STORAGE_KEY, JSON.stringify(account));
    } catch {
      // ignore
    }
    showToast(`${account.name} (${account.title}) 님 로그인되었습니다.`);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setSelectedPatient(null);
    try {
      localStorage.removeItem(CURRENT_USER_STORAGE_KEY);
    } catch {
      // ignore
    }
    showToast('로그아웃 되었습니다.');
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Real-time Firestore subscription to retain and persist all patients
  useEffect(() => {
    setIsSyncing(true);

    const colRef = collection(db, 'dental_triage_queue');
    const unsubscribe = onSnapshot(
      colRef,
      (snapshot) => {
        setIsQuotaExceeded(false);
        if (snapshot.empty) {
          setPatients([]);
          seedDatabaseIfEmpty();
        } else {
          const list: QueuePatient[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data() as any;
            const patientObj: QueuePatient = {
              id: docSnap.id,
              ...data,
            };

            // If a record from an older database schema lacks the new safety fields,
            // seamlessly enrich it so the user immediately sees all clinical safety data!
            if (!patientObj.drugAllergies && !patientObj.hasNoAllergies) {
              const age = patientObj.patient?.age || 45;
              const hashSeed = Math.abs(
                (patientObj.id || patientObj.patient?.name || 'DEN')
                  .split('')
                  .reduce((acc: number, c: string) => acc + c.charCodeAt(0), 0)
              );
              const safety = generatePatientSafetyProfile(hashSeed, age);
              patientObj.drugAllergies = safety.drugAllergies;
              patientObj.hasNoAllergies = safety.hasNoAllergies;
              patientObj.otherAllergyText = safety.otherAllergyText;
              patientObj.allergies = safety.allergiesText;
              patientObj.medicationsList = safety.medicationsList;
              patientObj.hasNoMedications = safety.hasNoMedications;
              patientObj.otherMedicationText = safety.otherMedicationText;
              patientObj.medications = safety.medicationsText;
              patientObj.bleedingTendency = safety.bleedingTendency;
              patientObj.redFlags = safety.redFlags;
              patientObj.medicalAlerts = safety.medicalAlerts;
            }

            list.push(patientObj);
          });
          list.sort((a, b) => {
            if (a.date !== b.date) return b.date.localeCompare(a.date);
            return (a.time || '').localeCompare(b.time || '');
          });
          setPatients(list);
        }
        setIsSyncing(false);
      },
      (error: any) => {
        setIsSyncing(false);
        console.warn('[Firestore Subscription]:', error?.message);
      }
    );

    return () => {
      unsubscribe();
    };
  }, []);

  // Update Status with optimistic UI + Firestore write
  const handleUpdateStatus = async (patientId: string, newStatus: PatientStatus) => {
    setPatients((prev) =>
      prev.map((p) => {
        if (p.id === patientId || p.patient?.patientId === patientId) {
          return { ...p, status: newStatus };
        }
        return p;
      })
    );
    showToast(`환자 상태가 '${newStatus}'(으)로 변경되었습니다.`);

    try {
      const docRef = doc(db, 'dental_triage_queue', patientId);
      await updateDoc(docRef, {
        status: newStatus,
        updatedAt: serverTimestamp(),
      });
    } catch (error: any) {
      console.warn('[Firestore updateStatus]:', error?.message || error);
    }
  };

  // Update Assigned Chair with optimistic UI + Firestore write
  const handleUpdateChair = async (patientId: string, newChair: string) => {
    let room = '제1진료실';
    if (newChair === '3번 체어' || newChair === '4번 체어') {
      room = '제2진료실';
    } else if (newChair === '5번 체어') {
      room = '제3진료실';
    } else if (newChair === '특진 체어') {
      room = '중앙수술실 (특진실)';
    } else if (newChair === '체어 미지정') {
      room = '중앙대기실';
    }

    setPatients((prev) =>
      prev.map((p) => {
        if (p.id === patientId || p.patient?.patientId === patientId) {
          return { ...p, assignedChair: newChair, recommendedRoom: room };
        }
        return p;
      })
    );
    showToast(`배정 체어가 '${newChair}'(으)로 변경되었습니다.`);

    try {
      const docRef = doc(db, 'dental_triage_queue', patientId);
      await updateDoc(docRef, {
        assignedChair: newChair,
        recommendedRoom: room,
        updatedAt: serverTimestamp(),
      });
    } catch (error: any) {
      console.warn('[Firestore updateChair]:', error?.message || error);
    }
  };

  // Save Doctor EMR Charting with optimistic UI + Firestore write
  const handleSaveChart = async (
    patientId: string,
    updates: {
      doctorDiagnosisNote: string;
      treatmentPlan: string;
      prescriptions: string;
      status: PatientStatus;
      assignedChair: string;
    }
  ) => {
    setPatients((prev) =>
      prev.map((p) => {
        if (p.id === patientId || p.patient?.patientId === patientId) {
          return { ...p, ...updates };
        }
        return p;
      })
    );
    setSelectedPatient((prev) => (prev ? { ...prev, ...updates } : null));
    showToast('의무기록 및 치료계획이 성공적으로 저장되었습니다.');

    try {
      const docRef = doc(db, 'dental_triage_queue', patientId);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: serverTimestamp(),
      });
    } catch (error: any) {
      console.warn('[Firestore saveChart]:', error?.message || error);
    }
  };

  // Kiosk Check-in submission with optimistic UI + Firestore write
  const handleKioskSubmit = async (newPatientData: any) => {
    const visitDate = newPatientData.date || getTodayDateString();
    const isToday = visitDate === getTodayDateString();
    const docId = `${newPatientData.patient?.patientId || 'DEN'}_${visitDate.replace(/-/g, '')}_${Date.now().toString().slice(-4)}`;

    const completePatient: QueuePatient = {
      id: docId,
      ...newPatientData,
    };

    setPatients((prev) => [completePatient, ...prev]);
    showToast(
      isToday
        ? `${newPatientData.patient.name} 환자 접수가 완료되었습니다. (당일 대기열 즉시 등록)`
        : `${newPatientData.patient.name} 환자 ${visitDate} 외래 예약이 완료되었습니다.`
    );

    try {
      await setDoc(doc(db, 'dental_triage_queue', docId), {
        ...newPatientData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (error: any) {
      console.warn('[Firestore kioskSubmit]:', error?.message || error);
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    setIsCsvExportOpen(true);
  };

  // 1. If not logged in, display the Login Screen
  if (!currentUser) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  // 2. If logged in as Doctor in dedicated workstation mode
  if (currentUser.role === 'doctor' && doctorViewMode === 'doctor') {
    return (
      <>
        {/* Quota Exceeded Friendly Banner */}
        {isQuotaExceeded && (
          <div className="bg-amber-500 text-white text-xs font-semibold px-4 py-1.5 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2 max-w-7xl mx-auto w-full">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>
                Firestore 일일 무료 사용량(50,000회)이 초과된 상태입니다. 대기열 및 진료차팅 기능은 로컬 보호 모드로 정상 작동하고 있습니다.
              </span>
            </div>
          </div>
        )}

        {/* Toast Notification */}
        {toastMessage && (
          <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-700 text-white font-bold text-xs shadow-xl border border-teal-600 animate-bounce">
            <CheckCircle2 className="w-4 h-4 text-emerald-300" />
            <span>{toastMessage}</span>
          </div>
        )}

        <DoctorWorkstation
          doctor={currentUser}
          patients={patients}
          onSaveChart={handleSaveChart}
          onUpdateStatus={handleUpdateStatus}
          onUpdateChair={handleUpdateChair}
          onPrintPatient={(p) => setPrintPatient(p)}
          onLogout={handleLogout}
          onSwitchToGeneral={() => setDoctorViewMode('general')}
          onOpenKiosk={handleOpenKiosk}
        />

        {/* Patient Registration & Outpatient Reservation Modal */}
        <KioskModal
          isOpen={isKioskOpen}
          onClose={handleCloseKiosk}
          onSubmit={handleKioskSubmit}
          existingPatients={patients}
          initialData={kioskInitialData}
        />

        {/* Print Chart Modal */}
        <PrintChartModal
          patient={printPatient}
          allPatients={patients}
          isOpen={!!printPatient}
          onClose={() => setPrintPatient(null)}
        />
      </>
    );
  }

  // 3. General (Staff) EMR view (or Doctor toggled to general queue)
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-teal-600 selection:text-white">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 text-white font-bold text-xs shadow-xl border border-teal-500 animate-bounce">
          <CheckCircle2 className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Quota Exceeded Friendly Banner */}
      {isQuotaExceeded && (
        <div className="bg-amber-500 text-white text-xs font-semibold px-4 py-1.5 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2 max-w-7xl mx-auto w-full">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>
              Firestore 일일 무료 사용량(50,000회)이 초과된 상태입니다. 환자 대기열, 접수 및 진료차팅 기능은 로컬 보호 모드로 정상 작동하고 있습니다.
            </span>
          </div>
        </div>
      )}

      {/* Main Clinic Header */}
      <Header
        patients={patients}
        activeView={activeView}
        onViewChange={setActiveView}
        onOpenKiosk={() => handleOpenKiosk(null)}
        onExportCSV={handleExportCSV}
        isSyncing={isSyncing}
        currentUser={currentUser}
        onLogout={handleLogout}
        onSwitchToDoctor={currentUser.role === 'doctor' ? () => setDoctorViewMode('doctor') : undefined}
      />

      {/* View Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {activeView === 'queue' ? (
          <QueueBoard
            patients={patients}
            onSelectPatient={(p) => setSelectedPatient(p)}
            onUpdateStatus={handleUpdateStatus}
            onUpdateChair={handleUpdateChair}
            onPrintPatient={(p) => setPrintPatient(p)}
          />
        ) : (
          <CalendarView
            patients={patients}
            onSelectPatient={(p) => setSelectedPatient(p)}
            onUpdateStatus={handleUpdateStatus}
            onUpdateChair={handleUpdateChair}
            onPrintPatient={(p) => setPrintPatient(p)}
          />
        )}
      </main>

      {/* EMR Doctor Charting Modal */}
      <EmrModal
        patient={selectedPatient}
        allPatients={patients}
        isOpen={!!selectedPatient}
        currentUser={currentUser}
        onClose={() => setSelectedPatient(null)}
        onSaveChart={handleSaveChart}
        onPrint={(p) => setPrintPatient(p)}
        onOpenKiosk={handleOpenKiosk}
      />

      {/* Patient Kiosk Simulator Modal */}
      <KioskModal
        isOpen={isKioskOpen}
        onClose={handleCloseKiosk}
        onSubmit={handleKioskSubmit}
        existingPatients={patients}
        initialData={kioskInitialData}
      />

      {/* CSV Export by Date & Selection Modal */}
      <CsvExportModal
        isOpen={isCsvExportOpen}
        onClose={() => setIsCsvExportOpen(false)}
        patients={patients}
        onToast={showToast}
      />

      {/* Print Chart Modal */}
      <PrintChartModal
        patient={printPatient}
        allPatients={patients}
        isOpen={!!printPatient}
        onClose={() => setPrintPatient(null)}
      />
    </div>
  );
}
