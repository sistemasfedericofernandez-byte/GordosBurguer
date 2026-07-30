"use client";

// Beep corto generado con Web Audio API — no necesita ningún archivo de audio.
//
// Los navegadores bloquean el audio hasta que el usuario interactúa con la página
// (un click/toque). Por eso mantenemos un único AudioContext reutilizado: se "destraba"
// una vez con unlockAudio() dentro de un handler de click, y de ahí en más playBeep()
// puede sonar aunque lo dispare un timer/poll sin interacción directa del usuario.
let ctx: AudioContext | null = null;

function getContext(): AudioContext | null {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!ctx) ctx = new Ctx();
    return ctx;
  } catch {
    return null;
  }
}

/** Llamar dentro de un click/tap del usuario para habilitar el audio antes de necesitarlo. */
export function unlockAudio(): void {
  const c = getContext();
  if (c && c.state === "suspended") c.resume();
}

export function playBeep(): void {
  const c = getContext();
  if (!c) return;
  try {
    if (c.state === "suspended") c.resume();
    const playTone = (freq: number, start: number, duration: number) => {
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.15, c.currentTime + start);
      gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + start + duration);
      osc.connect(gain);
      gain.connect(c.destination);
      osc.start(c.currentTime + start);
      osc.stop(c.currentTime + start + duration);
    };
    playTone(880, 0, 0.15);
    playTone(1046, 0.18, 0.2);
  } catch {
    // el navegador puede bloquear audio sin interacción previa del usuario; no es crítico
  }
}
