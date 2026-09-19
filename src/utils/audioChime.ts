// Web Audio API Chime & Web Speech API TTS for Hospital Patient Calling

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    const AudioContextClass =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

/**
 * Plays a pleasant, warm 2-tone hospital chime ("딩~동~") using Web Audio API
 */
export function playHospitalChime(): Promise<void> {
  return new Promise((resolve) => {
    try {
      const ctx = getAudioContext();
      const now = ctx.currentTime;

      // Note 1: High tone (~659.25 Hz - E5)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(659.25, now);

      gain1.gain.setValueAtTime(0.001, now);
      gain1.gain.exponentialRampToValueAtTime(0.4, now + 0.04);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.7);

      osc1.connect(gain1);
      gain1.connect(ctx.destination);

      osc1.start(now);
      osc1.stop(now + 0.75);

      // Note 2: Warm resolving tone (~523.25 Hz - C5) 0.35s later
      const note2Time = now + 0.35;
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(523.25, note2Time);

      gain2.gain.setValueAtTime(0.001, note2Time);
      gain2.gain.exponentialRampToValueAtTime(0.45, note2Time + 0.04);
      gain2.gain.exponentialRampToValueAtTime(0.0001, note2Time + 1.1);

      osc2.connect(gain2);
      gain2.connect(ctx.destination);

      osc2.start(note2Time);
      osc2.stop(note2Time + 1.2);

      setTimeout(() => {
        resolve();
      }, 1000);
    } catch (err) {
      console.error('Failed to play audio chime:', err);
      resolve();
    }
  });
}

/**
 * Announces patient call using Web Speech API (TTS)
 * Format: "OOO 환자님, O층 OOO호 O번 체어로 들어오세요"
 */
export function announcePatientCall(options: {
  patientName: string;
  locationTitle?: string;
  assignedChair?: string;
  recommendedRoom?: string;
}): void {
  if (!('speechSynthesis' in window)) {
    console.warn('SpeechSynthesis is not supported in this browser.');
    return;
  }

  window.speechSynthesis.cancel(); // Cancel any lingering speech

  const { patientName, locationTitle, assignedChair, recommendedRoom } = options;

  let destination = '';
  if (recommendedRoom && assignedChair) {
    destination = `${recommendedRoom} ${assignedChair}`;
  } else if (locationTitle && assignedChair) {
    destination = `${locationTitle} ${assignedChair}`;
  } else if (assignedChair) {
    destination = assignedChair;
  } else {
    destination = locationTitle || '진료실 1번 체어';
  }

  const messageText = `${patientName} 환자님, ${destination}로 들어오세요.`;

  const utterance = new SpeechSynthesisUtterance(messageText);
  utterance.lang = 'ko-KR';
  utterance.rate = 0.95; // Slightly measured, clear medical broadcast speed
  utterance.pitch = 1.05; // Friendly, clear tone

  // Select Korean voice if available
  const voices = window.speechSynthesis.getVoices();
  const koreanVoice = voices.find((v) => v.lang.includes('ko') || v.name.includes('Korean') || v.lang === 'ko-KR');
  if (koreanVoice) {
    utterance.voice = koreanVoice;
  }

  window.speechSynthesis.speak(utterance);
}

/**
 * Combined chime sound followed by voice broadcast
 */
export async function callPatientSmart(options: {
  patientName: string;
  locationTitle?: string;
  assignedChair?: string;
  recommendedRoom?: string;
}): Promise<void> {
  await playHospitalChime();
  announcePatientCall(options);
}
