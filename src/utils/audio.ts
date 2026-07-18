const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
let audioCtx: AudioContext | null = null;

function getAudioCtx() {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  return audioCtx;
}
function playTone(type: OscillatorType, freqStart: number, freqEnd: number, timeStart: number, dur: number, volStart: number, volEnd: number) {
  if (volStart <= 0) return;
  const ctx = getAudioCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freqStart, timeStart);
  if (freqEnd && freqEnd !== freqStart) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(freqEnd, 1), timeStart + dur);
  }
  
  gain.gain.setValueAtTime(volStart, timeStart);
  gain.gain.exponentialRampToValueAtTime(volEnd || 0.001, timeStart + dur);
  
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(timeStart);
  osc.stop(timeStart + dur);
  return { osc, gain };
}

export function playStartRecordingSound() {
  const ctx = getAudioCtx();
  if (ctx.state === 'suspended') ctx.resume();
  const t = ctx.currentTime;
  
  // 0. Original Heavy
  const tapDur = 0.02;
  const tapVol = 0.4;
  const thumpDur = 0.06;
  const thumpVol = 1.0;
  const delay = 0.08;

  // Click 1
  playTone('triangle', 600, 600, t, tapDur, tapVol, 0.001);
  playTone('sine', 100, 40, t, thumpDur, thumpVol, 0.001);
  
  // Click 2
  playTone('triangle', 800, 800, t + delay, tapDur, tapVol, 0.001);
  playTone('sine', 120, 50, t + delay, thumpDur, thumpVol, 0.001);
}

export function playStopRecordingSound() {
  const ctx = getAudioCtx();
  if (ctx.state === 'suspended') ctx.resume();
  const t = ctx.currentTime;
  
  // 4. Descending Pop
  const tapDur = 0.02;
  const tapVol = 0.4;
  const thumpDur = 0.06;
  const thumpVol = 1.0;
  const delay = 0.08;

  // Click 1
  playTone('triangle', 900, 900, t, tapDur, tapVol, 0.001);
  playTone('sine', 150, 40, t, thumpDur, thumpVol, 0.001);
  
  // Click 2
  playTone('triangle', 400, 400, t + delay, tapDur, tapVol, 0.001);
  playTone('sine', 80, 50, t + delay, thumpDur, thumpVol, 0.001);
}
