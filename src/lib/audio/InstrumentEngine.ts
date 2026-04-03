import { clamp, lerp } from '../math';
import type { InstrumentFrame } from '../../types';

type AudioNodes = {
  accentGain: GainNode;
  bandpass: BiquadFilterNode;
  harmonicOscillator: OscillatorNode;
  lowpass: BiquadFilterNode;
  mainOscillator: OscillatorNode;
  masterGain: GainNode;
  pan: StereoPannerNode;
  sustainGain: GainNode;
  vibrato: GainNode;
  vibratoLfo: OscillatorNode;
};

const ATTACK_TIME = 0.04;
const RELEASE_TIME = 0.12;

const resolveAudioContext = (): typeof AudioContext => {
  const AudioContextConstructor =
    window.AudioContext ||
    (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

  if (!AudioContextConstructor) {
    throw new Error('Web Audio API is not supported in this browser.');
  }

  return AudioContextConstructor;
};

export class InstrumentEngine {
  private audioContext: AudioContext | null = null;

  private nodes: AudioNodes | null = null;

  private initialized = false;

  private controlEnabled = false;

  private smoothedFrequency = 220;

  private smoothedX = 0.5;

  private smoothedY = 0.5;

  public async resume(): Promise<void> {
    await this.ensureReady();

    if (this.audioContext?.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  public async ensureReady(): Promise<void> {
    if (this.initialized) {
      return;
    }

    const AudioContextConstructor = resolveAudioContext();
    const audioContext = new AudioContextConstructor({
      latencyHint: 'interactive',
    });

    const mainOscillator = audioContext.createOscillator();
    mainOscillator.type = 'triangle';
    mainOscillator.frequency.value = this.smoothedFrequency;

    const harmonicOscillator = audioContext.createOscillator();
    harmonicOscillator.type = 'sine';
    harmonicOscillator.frequency.value = this.smoothedFrequency * 2;

    const vibratoLfo = audioContext.createOscillator();
    vibratoLfo.type = 'sine';
    vibratoLfo.frequency.value = 5.5;

    const vibrato = audioContext.createGain();
    vibrato.gain.value = 0;

    const sustainGain = audioContext.createGain();
    sustainGain.gain.value = 0;

    const accentGain = audioContext.createGain();
    accentGain.gain.value = 0;

    const bandpass = audioContext.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.value = 1200;
    bandpass.Q.value = 1.2;

    const lowpass = audioContext.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 1800;
    lowpass.Q.value = 0.9;

    const pan = audioContext.createStereoPanner();
    pan.pan.value = 0;

    const masterGain = audioContext.createGain();
    masterGain.gain.value = 0.8;

    vibratoLfo.connect(vibrato);
    vibrato.connect(mainOscillator.frequency);
    vibrato.connect(harmonicOscillator.frequency);

    mainOscillator.connect(sustainGain);
    harmonicOscillator.connect(sustainGain);
    mainOscillator.connect(accentGain);
    harmonicOscillator.connect(accentGain);

    sustainGain.connect(bandpass);
    accentGain.connect(bandpass);
    bandpass.connect(lowpass);
    lowpass.connect(pan);
    pan.connect(masterGain);
    masterGain.connect(audioContext.destination);

    mainOscillator.start();
    harmonicOscillator.start();
    vibratoLfo.start();

    this.audioContext = audioContext;
    this.nodes = {
      accentGain,
      bandpass,
      harmonicOscillator,
      lowpass,
      mainOscillator,
      masterGain,
      pan,
      sustainGain,
      vibrato,
      vibratoLfo,
    };
    this.initialized = true;
  }

  public setControlEnabled(enabled: boolean): void {
    this.controlEnabled = enabled;
  }

  public update(frame: InstrumentFrame): void {
    if (!this.audioContext || !this.nodes) {
      return;
    }

    const now = this.audioContext.currentTime;
    const {
      accentGain,
      bandpass,
      harmonicOscillator,
      lowpass,
      mainOscillator,
      pan,
      sustainGain,
      vibrato,
    } = this.nodes;

    const shouldSound = frame.hasHand && this.controlEnabled;
    this.smoothedX = lerp(this.smoothedX, frame.center.x, 0.35);
    this.smoothedY = lerp(this.smoothedY, frame.center.y, 0.35);

    const heightControl = clamp(1 - this.smoothedY, 0, 1);
    const pitch = 130 * 2 ** (heightControl * 2.2);
    this.smoothedFrequency = lerp(this.smoothedFrequency, pitch, 0.18);

    mainOscillator.frequency.setTargetAtTime(this.smoothedFrequency, now, 0.04);
    harmonicOscillator.frequency.setTargetAtTime(this.smoothedFrequency * 2, now, 0.04);

    const sustainLevel = shouldSound ? 0.04 + heightControl * 0.18 : 0;
    sustainGain.gain.setTargetAtTime(sustainLevel, now, shouldSound ? ATTACK_TIME : RELEASE_TIME);

    const filterFrequency = 250 + this.smoothedX * 2800 + heightControl * 1800;
    lowpass.frequency.setTargetAtTime(filterFrequency, now, 0.05);
    lowpass.Q.setTargetAtTime(frame.gesture === 'pointing' ? 6 : 1.1, now, 0.08);

    bandpass.frequency.setTargetAtTime(400 + heightControl * 1400, now, 0.08);
    bandpass.Q.setTargetAtTime(frame.gesture === 'pointing' ? 2.8 : 1.2, now, 0.08);

    pan.pan.setTargetAtTime(this.smoothedX * 2 - 1, now, 0.06);
    vibrato.gain.setTargetAtTime(frame.gesture === 'pointing' ? 11 : 3, now, 0.12);

    if (!shouldSound) {
      accentGain.gain.setTargetAtTime(0.0001, now, RELEASE_TIME);
    }
  }

  public triggerNote(intensity: number): void {
    if (!this.audioContext || !this.nodes || !this.controlEnabled) {
      return;
    }

    const now = this.audioContext.currentTime;
    const target = 0.12 + clamp(intensity, 0, 1) * 0.28;
    const accentGain = this.nodes.accentGain.gain;

    accentGain.cancelScheduledValues(now);
    accentGain.setValueAtTime(Math.max(accentGain.value, 0.0001), now);
    accentGain.linearRampToValueAtTime(target, now + 0.02);
    accentGain.exponentialRampToValueAtTime(0.0001, now + 0.45);
  }

  public mute(): void {
    if (!this.audioContext || !this.nodes) {
      return;
    }

    const now = this.audioContext.currentTime;
    this.nodes.sustainGain.gain.setTargetAtTime(0, now, RELEASE_TIME);
    this.nodes.accentGain.gain.setTargetAtTime(0.0001, now, RELEASE_TIME);
  }

  public dispose(): void {
    if (!this.audioContext || !this.nodes) {
      return;
    }

    this.nodes.mainOscillator.stop();
    this.nodes.harmonicOscillator.stop();
    this.nodes.vibratoLfo.stop();
    void this.audioContext.close();
    this.nodes = null;
    this.audioContext = null;
    this.initialized = false;
  }
}
