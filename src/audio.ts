let context: AudioContext | undefined;
export function sound(kind: 'buy' | 'equip' | 'hit' | 'heavy' | 'win' | 'lose' | 'surgery', enabled: boolean) {
  if (!enabled) return;
  try {
    context ??= new AudioContext();
    if (context.state === 'suspended') void context.resume();
    const osc = context.createOscillator(), gain = context.createGain();
    osc.type = kind === 'heavy' ? 'sawtooth' : kind === 'hit' ? 'triangle' : 'sine';
    const frequency = { buy: 620, equip: 420, hit: 110, heavy: 65, win: 523, lose: 180, surgery: 280 }[kind];
    osc.frequency.setValueAtTime(frequency, context.currentTime);
    osc.frequency.exponentialRampToValueAtTime(kind === 'heavy' ? 25 : kind === 'lose' ? 55 : frequency * 1.35, context.currentTime + .12);
    gain.gain.setValueAtTime(kind === 'hit' ? .018 : .05, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(.001, context.currentTime + .17);
    osc.connect(gain); gain.connect(context.destination); osc.start(); osc.stop(context.currentTime + .18);
  } catch { /* Audio may be unavailable on a device; gameplay remains functional. */ }
}
