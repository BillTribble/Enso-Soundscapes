/**
 * Brian Eno Generative Audio Engine
 * Web Audio API multi-voice generative synthesizer, Salamander Grand Piano v3
 * multi-sample engine with 3-stage Felt Piano EQ, & master ambient DSP chain.
 */
'use strict';

const DEFAULT_VOICE_FILTERS = {
  pad: {cutoff: 5200, resonance: 1.2}, piano: {cutoff: 12000, resonance: 0.8},
  bell: {cutoff: 9500, resonance: 1.4}, choir: {cutoff: 6400, resonance: 1.2},
  tape: {cutoff: 4200, resonance: 1.6}, drone: {cutoff: 1800, resonance: 1.8}
};
const DEFAULT_VOICE_FX = {
  pad: {reverb: 0.70, delay: 0.35}, piano: {reverb: 0.35, delay: 0.12},
  bell: {reverb: 0.75, delay: 0.40}, choir: {reverb: 0.80, delay: 0.25},
  tape: {reverb: 0.55, delay: 0.65}, drone: {reverb: 0.60, delay: 0.15}
};
const DEFAULT_VOICE_INSTRUMENT_TRIM = {
  pad: 0.420, piano: 0.290, bell: 0.528, choir: 0.528, tape: 0.715, drone: 0.527
};

class AudioEngine {
  constructor() {
    this.activeTrackStyle = 'thursday';
    this.params = {
      masterVolume: 0.84, attack: 2.4, release: 6.8, sustain: 1.8, envelopeMode: 'override',
      cutoff: 2800, resonance: 1.4, filterType: 'lowpass', filterDrift: 0.25, masterFilterEnabled: false,
      reverbMix: 0.64, reverbDecay: 8.5, reverbShimmer: 0.48, reverbDamping: 5200,
      delayMix: 0.38, delayTime: 0.68, delayFeedback: 0.52, delayWow: 0.28, pianoCrossfade: -0.62,
      circadianMultipliers: {cutoff: 1.0, attack: 1.0, release: 1.0, shimmer: 0.0}
    };
    this.feltPianoConfig = {
      library: 'Salamander Grand Piano v3 (Yamaha C5, 48kHz/24-bit Stereo FLAC)',
      forceLayer: 'v1', makeupGain: 1.55, bodyWarmthHz: 240, bodyWarmthGainDb: 3.2,
      highShelfHz: 1850, highShelfCutDb: -11.5, mechReleaseGain: 0.022
    };
    this.latencyHint = 'playback';
    this._reverbIrTimer = null;
    this._nextNoteScheduleTime = 0;
    this.isRunning = false;
    this.ctx = null;
    this.nodes = {};
    this.activeNotes = new Map();
    this._noteCounter = 0;
    this.voiceReleases = { pad: 8.5, piano: 4.5, bell: 5.2, choir: 9.5, tape: 6.2, drone: 11.0 };
    this.voiceFilterParams = JSON.parse(JSON.stringify(DEFAULT_VOICE_FILTERS));
    this.voiceFxParams = JSON.parse(JSON.stringify(DEFAULT_VOICE_FX));
    this.voiceReverbSend = { pad: 0.7, piano: 0.35, bell: 0.75, choir: 0.8, tape: 0.55, drone: 0.6 };
    this.voiceDelaySend = { pad: 0.35, piano: 0.12, bell: 0.4, choir: 0.25, tape: 0.65, drone: 0.15 };
    this.voiceInstrumentTrim = { ...DEFAULT_VOICE_INSTRUMENT_TRIM };

    // Multi-sampled Salamander Grand Piano v3 state
    this.pianoSamples = new Map();
    this.pianoMechSamples = {};
    this.pianoSamplesLoaded = false;
    this.pianoSampleCount = 0;
    this._pianoLoadPromise = null;
  }

  _buildStemDsp(c, p) {
    const s = { stemInput: c.createGain(), stemOutput: c.createGain(), masterFilter: c.createBiquadFilter() };
    const fOn = Boolean(p.masterFilterEnabled);
    s.filterWetGain = c.createGain(); s.filterWetGain.gain.value = fOn ? 1.0 : 0.0;
    s.filterBypassGain = c.createGain(); s.filterBypassGain.gain.value = fOn ? 0.0 : 1.0;
    s.postFilterBus = c.createGain();
    s.masterFilter.type = p.filterType; s.masterFilter.frequency.value = p.cutoff; s.masterFilter.Q.value = p.resonance;
    s.filterLfo = c.createOscillator(); s.filterLfo.frequency.value = 0.045;
    s.filterLfoGain = c.createGain(); s.filterLfoGain.gain.value = fOn ? (p.filterDrift * 600) : 0.0;
    s.filterLfo.connect(s.filterLfoGain); s.filterLfoGain.connect(s.masterFilter.detune); s.filterLfo.start();
    s.stemInput.connect(s.masterFilter); s.masterFilter.connect(s.filterWetGain); s.filterWetGain.connect(s.postFilterBus);
    s.stemInput.connect(s.filterBypassGain); s.filterBypassGain.connect(s.postFilterBus);
    s.dryGain = c.createGain(); s.postFilterBus.connect(s.dryGain); s.dryGain.connect(s.stemOutput);
    s.delaySend = c.createGain(); s.delayNodeL = c.createDelay(5.0); s.delayNodeR = c.createDelay(5.0);
    s.delayNodeL.delayTime.value = p.delayTime; s.delayNodeR.delayTime.value = p.delayTime * 1.18;
    s.delayFilter = c.createBiquadFilter(); s.delayFilter.type = 'lowpass'; s.delayFilter.frequency.value = 3200;
    s.delayFeedbackGain = c.createGain(); s.delayFeedbackGain.gain.value = p.delayFeedback;
    s.delayMerger = c.createChannelMerger(2); s.delayWetGain = c.createGain(); s.delayWetGain.gain.value = p.delayMix;
    s.delayToReverb = c.createGain(); s.delayToReverb.gain.value = 0.35;
    s.wowLfo = c.createOscillator(); s.wowLfo.frequency.value = 0.55;
    s.wowGain = c.createGain(); s.wowGain.gain.value = p.delayWow * 0.0035;
    s.wowLfo.connect(s.wowGain); s.wowGain.connect(s.delayNodeL.delayTime); s.wowGain.connect(s.delayNodeR.delayTime); s.wowLfo.start();
    s.postFilterBus.connect(s.delaySend);
    s.delaySend.connect(s.delayNodeL); s.delaySend.connect(s.delayNodeR);
    s.delayNodeL.connect(s.delayMerger, 0, 0); s.delayNodeR.connect(s.delayMerger, 0, 1);
    s.delayMerger.connect(s.delayFilter); s.delayFilter.connect(s.delayFeedbackGain);
    s.delayFeedbackGain.connect(s.delayNodeL); s.delayFeedbackGain.connect(s.delayNodeR);
    s.delayFilter.connect(s.delayWetGain); s.delayWetGain.connect(s.stemOutput);
    s.reverbInput = c.createGain(); s.postFilterBus.connect(s.reverbInput);
    s.delayFilter.connect(s.delayToReverb); s.delayToReverb.connect(s.reverbInput);
    s.reverbDampFilter = c.createBiquadFilter(); s.reverbDampFilter.type = 'lowpass'; s.reverbDampFilter.frequency.value = p.reverbDamping;
    s.convolver = c.createConvolver(); s.reverbWetGain = c.createGain(); s.reverbWetGain.gain.value = p.reverbMix;
    s.reverbInput.connect(s.reverbDampFilter); s.reverbDampFilter.connect(s.convolver);
    s.convolver.connect(s.reverbWetGain); s.reverbWetGain.connect(s.stemOutput);
    s.shimmerBus = c.createGain(); s.shimmerBus.gain.value = p.reverbShimmer * 0.65;
    s.shimmerBandpass = c.createBiquadFilter(); s.shimmerBandpass.type = 'bandpass'; s.shimmerBandpass.frequency.value = 1800; s.shimmerBandpass.Q.value = 1.0;
    s.shimmerPreDelay = c.createDelay(1.0); s.shimmerPreDelay.delayTime.value = 0.09;
    s.shimmerChorusLfo = c.createOscillator(); s.shimmerChorusLfo.frequency.value = 0.8;
    s.shimmerChorusLfoGain = c.createGain(); s.shimmerChorusLfoGain.gain.value = 0.0018;
    s.shimmerChorusLfo.connect(s.shimmerChorusLfoGain); s.shimmerChorusLfoGain.connect(s.shimmerPreDelay.delayTime); s.shimmerChorusLfo.start();
    s.shimmerBus.connect(s.shimmerBandpass); s.shimmerBandpass.connect(s.shimmerPreDelay); s.shimmerPreDelay.connect(s.convolver);
    s.shimmerHp = c.createBiquadFilter(); s.shimmerHp.type = 'highpass'; s.shimmerHp.frequency.value = 1200;
    s.shimmerDoubler = c.createWaveShaper(); s.shimmerDoubler.curve = this._makeOctaveDoublerCurve(256);
    s.shimmerFeedbackGain = c.createGain(); s.shimmerFeedbackGain.gain.value = 0.16;
    s.convolver.connect(s.shimmerHp); s.shimmerHp.connect(s.shimmerDoubler); s.shimmerDoubler.connect(s.shimmerFeedbackGain); s.shimmerFeedbackGain.connect(s.shimmerBus);
    return s;
  }

  init(customCtx = null) {
    if (this.ctx) return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (customCtx) {
      this.ctx = customCtx;
    } else {
      try { this.ctx = new AudioCtx({ latencyHint: 'playback' }); } catch (e) { this.ctx = new AudioCtx(); }
    }
    this.latencyHint = 'playback';
    const c = this.ctx, p = this.params, n = this.nodes;

    this.masterStem = this._buildStemDsp(c, p);
    this.stems = [this.masterStem];
    Object.assign(n, this.masterStem);
    this._buildImpulseResponse(p.reverbDecay);

    n.masterBus = c.createGain();
    n.voiceSum = c.createGain();
    const pianoStemInput = c.createGain();
    const otherStemOutput = c.createGain();
    n.pianoCrossfadeBus = c.createGain();
    n.otherCrossfadeBus = c.createGain();
    pianoStemInput.connect(n.pianoCrossfadeBus);
    n.voiceSum.connect(otherStemOutput);
    otherStemOutput.connect(n.otherCrossfadeBus);
    n.pianoCrossfadeBus.connect(this.masterStem.stemInput);
    n.otherCrossfadeBus.connect(this.masterStem.stemInput);
    this.masterStem.stemOutput.connect(n.masterBus);

    this.otherStem = Object.assign({}, this.masterStem, { stemOutput: otherStemOutput });
    this.pianoStem = Object.assign({}, this.masterStem, { stemInput: pianoStemInput, isPianoStem: false });
    n.otherStem = this.otherStem;
    n.pianoStem = this.pianoStem;

    n.voiceFilters = {};
    n.voiceBuses = {};
    n.voiceBalanceBuses = {};
    n.voiceAnalysers = {};
    this.baseVoiceGains = this.baseVoiceGains || {
      pad: 0.65, piano: 2.00, bell: 0.65, choir: 0.65, tape: 0.65, drone: 0.65
    };
    this.voiceGains = this.voiceGains || { ...this.baseVoiceGains };
    this.voiceBalanceGains = this.voiceBalanceGains || {};
    this.effectiveVoiceGains = this.effectiveVoiceGains || {};
    ['pad', 'piano', 'bell', 'choir', 'tape', 'drone'].forEach((vId) => {
      const bus = c.createGain();
      bus.gain.value = this.voiceGains[vId] ?? (vId === 'piano' ? 2.00 : 0.65);

      const balanceBus = c.createGain();
      const mult = this.getCrossfadeMultiplier(vId);
      balanceBus.gain.value = mult;
      this.voiceBalanceGains[vId] = mult;
      this.effectiveVoiceGains[vId] = (this.voiceGains[vId] ?? 0.65) * mult;

      bus.connect(balanceBus);
      balanceBus.connect(vId === 'piano' ? pianoStemInput : n.voiceSum);

      const analyser = c.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.75;
      bus.connect(analyser);

      n.voiceBuses[vId] = bus;
      n.voiceBalanceBuses[vId] = balanceBus;
      n.voiceAnalysers[vId] = analyser;

      const fParams = (this.voiceFilterParams && this.voiceFilterParams[vId]) ||
          {cutoff: 8000, resonance: 1.0};
      const filter = c.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = fParams.cutoff ?? 8000;
      filter.Q.value = fParams.resonance ?? 1.0;
      filter.connect(bus);
      n.voiceFilters[vId] = filter;
    });

    n.pianoShimmerCrossfade = c.createGain();
    n.otherShimmerCrossfade = c.createGain();
    n.pianoShimmerCrossfade.connect(this.masterStem.shimmerBus);
    n.otherShimmerCrossfade.connect(this.masterStem.shimmerBus);
    this._applyCrossfadeGains(p.pianoCrossfade ?? -0.62);

    // Master Transparent Peak Limiter (prevents inter-sample clipping without pumping or ducking)
    n.compressor = c.createDynamicsCompressor();
    n.compressor.threshold.value = -1.0; n.compressor.knee.value = 0.0; n.compressor.ratio.value = 20;
    n.compressor.attack.value = 0.002; n.compressor.release.value = 0.05;
    n.masterGain = c.createGain(); n.masterGain.gain.value = p.masterVolume;
    n.analyser = c.createAnalyser(); n.analyser.fftSize = 1024; n.analyser.smoothingTimeConstant = 0.85;
    n.masterBus.connect(n.compressor); n.compressor.connect(n.masterGain);
    n.masterGain.connect(n.analyser); n.analyser.connect(c.destination);

    // Start preloading Salamander Grand Piano v3 FLAC samples asynchronously
    this.activePianoLibrary = 'salamander';
    this.pianoLibraries = { salamander: this.pianoSamples, intimate_c3: new Map(), upright_kw: new Map(), steinway_splendid: new Map() };
    this.pianoSamplesLoaded = true;
    const zonesLen = (typeof window !== 'undefined' &&
                      window.EnsoPianoSampler?.SALAMANDER_ZONES?.length) ||
        30;
    const mechLen =
        (typeof window !== 'undefined' &&
          Object.keys(window.EnsoPianoSampler?.MECH_FILES || {}).length) ||
        7;
    this.pianoSampleCount = zonesLen * 3 + mechLen;
    if (typeof this.loadPianoSamples === 'function') {
      this.loadPianoSamples();
    }
  }

  _buildImpulseResponse(decaySec) {
    if (!this.ctx || !this.nodes.convolver) return;
    const rate = this.ctx.sampleRate, dur = Math.max(1.5, Math.min(18.0, decaySec || 8.5)), len = Math.floor(rate * dur);
    const buffer = this.ctx.createBuffer(2, len, rate), left = buffer.getChannelData(0), right = buffer.getChannelData(1);
    const decayConst = 3.6 / dur;
    for (let i = 0; i < len; i++) {
      const envelope = Math.exp(-decayConst * (i / rate));
      left[i] = (Math.random() * 2 - 1) * envelope;
      right[i] = (Math.random() * 2 - 1) * envelope;
    }
    for (const st of (this.stems || [this.nodes])) {
      if (st && st.convolver) st.convolver.buffer = buffer;
    }
  }

  _makeOctaveDoublerCurve(samples = 256) {
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / (samples - 1) - 1;
      curve[i] = 2 * (x * x) - 1;
    }
    return curve;
  }

  resume() {
    return (this.ctx && this.ctx.state === 'suspended') ? this.ctx.resume() : Promise.resolve();
  }

  setRunning(bool) {
    this.isRunning = !!bool;
    if (this.isRunning) { this.init(); this.resume(); } else { this.releaseAllVoices(0.5); }
  }

  setMasterVolume(val) {
    this.params.masterVolume = Math.max(0, Math.min(1.5, val));
    if (this.nodes.masterGain && this.ctx) {
      this._setParamImmediate(this.nodes.masterGain.gain, this.params.masterVolume, this.ctx.currentTime);
    }
  }

  setGlobalAttack(sec) { this.params.attack = Math.max(0.05, Math.min(12.0, sec)); }
  setGlobalSustain(sec) { this.params.sustain = Math.max(0.1, Math.min(10.0, sec)); }
  setEnvelopeMode(mode) { this.params.envelopeMode = mode === 'scale' ? 'scale' : 'override'; }
  setGlobalRelease(sec) { this.params.release = Math.max(0.2, Math.min(20.0, sec)); this._rescheduleActiveReleases(); }
  setVoiceRelease(voiceId, sec) {
    const r = Math.max(0.2, Math.min(20.0, Number(sec) || 7.0));
    this.voiceReleases = this.voiceReleases || {};
    this.voiceReleases[voiceId] = r;
    this._rescheduleActiveReleases(voiceId);
  }
  setVoiceFilterCutoff(voiceId, hz) {
    const val = Math.max(80, Math.min(16000, Number(hz) || 8000));
    if (!this.voiceFilterParams) this.voiceFilterParams = {};
    if (!this.voiceFilterParams[voiceId]) this.voiceFilterParams[voiceId] = {cutoff: 8000, resonance: 1.0};
    this.voiceFilterParams[voiceId].cutoff = val;
    const filter = this.nodes.voiceFilters && this.nodes.voiceFilters[voiceId];
    if (this.ctx && filter) this._setParamImmediate(filter.frequency, val, this.ctx.currentTime);
  }
  setVoiceFilterResonance(voiceId, q) {
    const val = Math.max(0.1, Math.min(14.0, Number(q) || 1.0));
    if (!this.voiceFilterParams) this.voiceFilterParams = {};
    if (!this.voiceFilterParams[voiceId]) this.voiceFilterParams[voiceId] = {cutoff: 8000, resonance: 1.0};
    this.voiceFilterParams[voiceId].resonance = val;
    const filter = this.nodes.voiceFilters && this.nodes.voiceFilters[voiceId];
    if (this.ctx && filter) this._setParamImmediate(filter.Q, val, this.ctx.currentTime);
  }
  setVoiceReverbSend(voiceId, val) {
    if (this.voiceReverbSend && this.voiceReverbSend[voiceId] !== undefined) this.voiceReverbSend[voiceId] = Math.max(0, Math.min(2, Number(val)));
    if (this.voiceFxParams && this.voiceFxParams[voiceId]) this.voiceFxParams[voiceId].reverb = Math.max(0, Math.min(2, Number(val)));
  }
  setVoiceDelaySend(voiceId, val) {
    if (this.voiceDelaySend && this.voiceDelaySend[voiceId] !== undefined) this.voiceDelaySend[voiceId] = Math.max(0, Math.min(2, Number(val)));
    if (this.voiceFxParams && this.voiceFxParams[voiceId]) this.voiceFxParams[voiceId].delay = Math.max(0, Math.min(2, Number(val)));
  }
  setFilterCutoff(hz) {
    this.params.cutoff = Math.max(40, Math.min(18000, hz));
    if (!this.ctx) return;
    const eff = Math.max(40, Math.min(18000, this.params.cutoff * (this.params.circadianMultipliers.cutoff || 1.0)));
    for (const st of (this.stems || [this.nodes])) {
      if (st && st.masterFilter) st.masterFilter.frequency.setTargetAtTime(eff, this.ctx.currentTime, 0.03);
    }
  }
  setFilterResonance(q) {
    this.params.resonance = Math.max(0.1, Math.min(18.0, q));
    if (!this.ctx) return;
    for (const st of (this.stems || [this.nodes])) {
      if (st && st.masterFilter) st.masterFilter.Q.setTargetAtTime(this.params.resonance, this.ctx.currentTime, 0.03);
    }
  }
  setFilterType(type) {
    this.params.filterType = ['lowpass', 'bandpass', 'highpass', 'notch'].includes(type) ? type : 'lowpass';
    for (const st of (this.stems || [this.nodes])) {
      if (st && st.masterFilter) st.masterFilter.type = this.params.filterType;
    }
  }
  setMasterFilterEnabled(enabled) {
    const on = Boolean(enabled);
    this.params.masterFilterEnabled = on;
    if (!this.ctx) return on;
    const now = this.ctx.currentTime;
    for (const st of (this.stems || [this.nodes])) {
      if (!st) continue;
      if (st.filterWetGain) this._setParamImmediate(st.filterWetGain.gain, on ? 1.0 : 0.0, now);
      if (st.filterBypassGain) this._setParamImmediate(st.filterBypassGain.gain, on ? 0.0 : 1.0, now);
      if (st.filterLfoGain) this._setParamImmediate(st.filterLfoGain.gain, on ? (this.params.filterDrift * 600) : 0.0, now);
    }
    return on;
  }
  setFilterDrift(val) {
    this.params.filterDrift = Math.max(0, Math.min(1.0, val));
    if (!this.ctx) return;
    const lfoVal = this.params.masterFilterEnabled ? (this.params.filterDrift * 600) : 0.0;
    for (const st of (this.stems || [this.nodes])) {
      if (st && st.filterLfoGain) st.filterLfoGain.gain.setTargetAtTime(lfoVal, this.ctx.currentTime, 0.05);
    }
  }
  setReverbMix(val) {
    this.params.reverbMix = Math.max(0, Math.min(1.0, val));
    if (!this.ctx) return;
    for (const st of (this.stems || [this.nodes])) {
      if (st && st.reverbWetGain) st.reverbWetGain.gain.setTargetAtTime(this.params.reverbMix, this.ctx.currentTime, 0.03);
    }
  }
  setReverbDecay(val) {
    this.params.reverbDecay = Math.max(0.5, Math.min(20.0, val));
    if (!this.ctx) return;
    if (typeof document !== 'undefined' && document.hidden) return;
    if (this._reverbIrTimer) clearTimeout(this._reverbIrTimer);
    this._reverbIrTimer = setTimeout(() => {
      this._reverbIrTimer = null;
      this._buildImpulseResponse(this.params.reverbDecay);
    }, 60);
  }
  setReverbShimmer(val) {
    this.params.reverbShimmer = Math.max(0, Math.min(1.0, val));
    if (!this.ctx) return;
    const eff = Math.min(1.0, this.params.reverbShimmer + (this.params.circadianMultipliers.shimmer || 0.0));
    for (const st of (this.stems || [this.nodes])) {
      if (st && st.shimmerBus) st.shimmerBus.gain.setTargetAtTime(eff * 0.65, this.ctx.currentTime, 0.03);
    }
  }
  setReverbDamping(hz) {
    const freq = hz > 1 ? hz : (800 + hz * 13200);
    this.params.reverbDamping = Math.max(800, Math.min(14000, freq));
    if (!this.ctx) return;
    for (const st of (this.stems || [this.nodes])) {
      if (st && st.reverbDampFilter) st.reverbDampFilter.frequency.setTargetAtTime(this.params.reverbDamping, this.ctx.currentTime, 0.03);
    }
  }
  setDelayMix(val) {
    this.params.delayMix = Math.max(0, Math.min(1.0, val));
    if (!this.ctx) return;
    for (const st of (this.stems || [this.nodes])) {
      if (st && st.delayWetGain) st.delayWetGain.gain.setTargetAtTime(this.params.delayMix, this.ctx.currentTime, 0.03);
    }
  }
  setDelayTime(sec) {
    this.params.delayTime = Math.max(0.12, Math.min(2.4, sec));
    if (!this.ctx) return;
    for (const st of (this.stems || [this.nodes])) {
      if (st && st.delayNodeL && st.delayNodeR) {
        st.delayNodeL.delayTime.setTargetAtTime(this.params.delayTime, this.ctx.currentTime, 0.05);
        st.delayNodeR.delayTime.setTargetAtTime(this.params.delayTime * 1.18, this.ctx.currentTime, 0.05);
      }
    }
  }
  setDelayFeedback(val) {
    this.params.delayFeedback = Math.max(0, Math.min(0.92, val));
    if (!this.ctx) return;
    for (const st of (this.stems || [this.nodes])) {
      if (st && st.delayFeedbackGain) st.delayFeedbackGain.gain.setTargetAtTime(this.params.delayFeedback, this.ctx.currentTime, 0.03);
    }
  }
  setDelayWow(val) {
    this.params.delayWow = Math.max(0, Math.min(1.0, val));
    if (!this.ctx) return;
    for (const st of (this.stems || [this.nodes])) {
      if (st && st.wowGain) st.wowGain.gain.setTargetAtTime(this.params.delayWow * 0.0035, this.ctx.currentTime, 0.05);
    }
  }

  setCircadianMultipliers(mults) {
    if (!mults || typeof mults !== 'object') return;
    const c = this.params.circadianMultipliers;
    if (typeof mults.cutoff === 'number') c.cutoff = mults.cutoff;
    else if (typeof mults.cutoffMultiplier === 'number') c.cutoff = mults.cutoffMultiplier;
    if (typeof mults.attack === 'number') c.attack = mults.attack;
    else if (typeof mults.attackMultiplier === 'number') c.attack = mults.attackMultiplier;
    if (typeof mults.release === 'number') c.release = mults.release;
    else if (typeof mults.releaseMultiplier === 'number') c.release = mults.releaseMultiplier;
    if (typeof mults.shimmer === 'number') c.shimmer = mults.shimmer;
    else if (typeof mults.shimmerBoost === 'number') c.shimmer = mults.shimmerBoost;
    this.setFilterCutoff(this.params.cutoff);
    this.setReverbShimmer(this.params.reverbShimmer);
  }

  _rescheduleActiveReleases(targetVoiceId = null) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime, circ = (this.params.circadianMultipliers.release || 1.0);
    for (const [id, note] of this.activeNotes.entries()) {
      if (targetVoiceId && note.voiceId !== targetVoiceId) continue;
      try {
        const vRel = (this.voiceReleases && typeof this.voiceReleases[note.voiceId] === 'number') ? this.voiceReleases[note.voiceId] : this.params.release;
        let effRel = vRel * circ;
        if (this.params.envelopeMode === 'scale') effRel *= (this.params.release / 7.0);
        effRel = Math.max(0.15, effRel);
        const curGain = Math.max(0.0001, note.envGain.gain.value);
        note.envGain.gain.cancelScheduledValues(0);
        note.envGain.gain.setValueAtTime(curGain, now);
        note.envGain.gain.exponentialRampToValueAtTime(0.0001, now + effRel);
        if (note.shimmerEnvGain) {
          const curShim = Math.max(0.0001, note.shimmerEnvGain.gain.value);
          note.shimmerEnvGain.gain.cancelScheduledValues(0);
          note.shimmerEnvGain.gain.setValueAtTime(curShim, now);
          note.shimmerEnvGain.gain.exponentialRampToValueAtTime(0.0001, now + effRel);
        }
        clearTimeout(note.cleanupTimer);
        note.cleanupTimer = setTimeout(() => { note.cleanup(); this.activeNotes.delete(id); }, (effRel + 0.15) * 1000);
      } catch (e) {}
    }
  }

  releaseAllVoices(fastReleaseSec = 0.4) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime, dur = Math.max(0.05, fastReleaseSec);
    for (const [id, note] of this.activeNotes.entries()) {
      try {
        const curGain = Math.max(0.0001, note.envGain.gain.value);
        note.envGain.gain.cancelScheduledValues(0);
        note.envGain.gain.setValueAtTime(curGain, now);
        note.envGain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
        if (note.shimmerEnvGain) {
          const curShim = Math.max(0.0001, note.shimmerEnvGain.gain.value);
          note.shimmerEnvGain.gain.cancelScheduledValues(0);
          note.shimmerEnvGain.gain.setValueAtTime(curShim, now);
          note.shimmerEnvGain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
        }
        clearTimeout(note.cleanupTimer);
        note.cleanupTimer = setTimeout(() => { note.cleanup(); this.activeNotes.delete(id); }, (dur + 0.1) * 1000);
      } catch (e) {}
    }
  }

  _setParamImmediate(param, val, now) {
    if (!param) return;
    param.cancelScheduledValues(0);
    param.value = val;
    param.setValueAtTime(val, now);
  }

  getCrossfadeMultiplier(voiceId) {
    const st = this.crossfadeState || { pianoMultiplier: 1.0, otherMultiplier: 1.0 };
    return voiceId === 'piano' ? (st.pianoMultiplier ?? 1.0) : (st.otherMultiplier ?? 1.0);
  }

  _syncVoiceBusGains() {
    this.baseVoiceGains = this.baseVoiceGains || { pad: 0.65, piano: 2.00, bell: 0.65, choir: 0.65, tape: 0.65, drone: 0.65 };
    this.voiceGains = this.voiceGains || {};
    this.voiceBalanceGains = this.voiceBalanceGains || {};
    this.effectiveVoiceGains = this.effectiveVoiceGains || {};
    const now = this.ctx ? this.ctx.currentTime : 0;
    ['pad', 'piano', 'bell', 'choir', 'tape', 'drone'].forEach((vId) => {
      const base = this.baseVoiceGains[vId] ?? (vId === 'piano' ? 2.00 : 0.65);
      const mult = this.getCrossfadeMultiplier(vId);
      this.voiceGains[vId] = base;
      this.voiceBalanceGains[vId] = mult;
      this.effectiveVoiceGains[vId] = base * mult;
      const bus = this.nodes.voiceBuses && this.nodes.voiceBuses[vId];
      if (this.ctx && bus) this._setParamImmediate(bus.gain, base, now);
      const balanceBus = this.nodes.voiceBalanceBuses && this.nodes.voiceBalanceBuses[vId];
      if (this.ctx && balanceBus) this._setParamImmediate(balanceBus.gain, mult, now);
    });
  }

  setVoiceVolume(voiceId, val) {
    const v = Math.max(0, Math.min(5.0, Number(val) || 0));
    this.baseVoiceGains = this.baseVoiceGains || { pad: 0.65, piano: 2.00, bell: 0.65, choir: 0.65, tape: 0.65, drone: 0.65 };
    this.baseVoiceGains[voiceId] = v;
    this._syncVoiceBusGains();
  }

  _applyCrossfadeGains(xf) {
    const x = Math.max(-1, Math.min(1, Number(xf) || 0)), n = this.nodes;
    const pianoMult = x <= 0 ? 1.0 : Math.max(0, 1.0 - x);
    const otherMult = x >= 0 ? 1.0 : Math.max(0, 1.0 + x);
    const pianoBoost = x < 0 ? (1.0 + Math.pow(Math.abs(x), 0.85) * 0.95) : 1.0;
    const otherStemTaper = x < 0 ? Math.pow(otherMult, 0.65) : 1.0;
    this.crossfadeState = { value: x, pianoMultiplier: pianoMult, otherMultiplier: otherMult, pianoBoost, otherStemTaper };
    if (this.ctx && n.pianoCrossfadeBus && n.otherCrossfadeBus) {
      const now = this.ctx.currentTime;
      this._setParamImmediate(n.pianoCrossfadeBus.gain, pianoMult <= 0.001 ? 0 : 1.0, now);
      this._setParamImmediate(n.otherCrossfadeBus.gain, otherMult <= 0.001 ? 0 : 1.0, now);
      const effPianoStemBoost = x <= -0.80 ? pianoBoost : 1.0;
      const effOtherStemGain = (x < 0 && otherMult > 0.001)
        ? (x >= -0.70 ? (1.0 / otherMult) : Math.pow(otherMult / 0.30, 0.8) * (1.0 / 0.30))
        : (1.0 + Math.max(0, x) * 0.5);
      if (this.pianoStem && this.pianoStem.stemInput) this._setParamImmediate(this.pianoStem.stemInput.gain, effPianoStemBoost, now);
      if (this.otherStem && this.otherStem.stemOutput) this._setParamImmediate(this.otherStem.stemOutput.gain, effOtherStemGain, now);
      if (n.pianoShimmerCrossfade && n.otherShimmerCrossfade) {
        this._setParamImmediate(n.pianoShimmerCrossfade.gain, pianoMult, now);
        this._setParamImmediate(n.otherShimmerCrossfade.gain, otherMult, now);
      }
    }
    this._syncVoiceBusGains();
    return this.crossfadeState;
  }

  setPianoCrossfade(val) {
    const x = Math.max(-1, Math.min(1, Number(val) || 0));
    this.params.pianoCrossfade = x;
    return this._applyCrossfadeGains(x);
  }

  triggerVoice(voiceId, midiNote, velocity = 0.7, pan = 0, voiceGain = 0.7, voiceRelease = null, startTime = null) {
    if (!this.ctx) this.init();
    this.resume();
    if (window.enoPhraseEngine && typeof window.enoPhraseEngine.quantizeMidiToKey === 'function') {
      midiNote = window.enoPhraseEngine.quantizeMidiToKey(midiNote);
    }
    this.lastTriggeredNotes = (this.lastTriggeredNotes || []).slice(-199);
    this.lastTriggeredNotes.push({ voiceId, midi: midiNote, time: Date.now() });
    let now = typeof startTime === 'number' ? startTime : this.ctx.currentTime;
    if (typeof startTime !== 'number' && typeof document !== 'undefined' && document.hidden) {
      now = Math.max(now, this._nextNoteScheduleTime || 0);
      this._nextNoteScheduleTime = now + 0.018;
    }
    const freq = 440 * Math.pow(2, (midiNote - 69) / 12);
    const archetypeFactors = { pad: 1.25, piano: 0.35, bell: 0.45, choir: 1.35, tape: 0.85, drone: 1.5 };
    const af = archetypeFactors[voiceId] || 1.0, circ = this.params.circadianMultipliers || {};
    const isPiano = voiceId === 'piano';
    let effAttack = isPiano ? 0 : this.params.attack * (circ.attack || 1.0);
    const vRel = typeof voiceRelease === 'number' ? voiceRelease : ((this.voiceReleases && typeof this.voiceReleases[voiceId] === 'number') ? this.voiceReleases[voiceId] : this.params.release);
    let effRelease = vRel * (circ.release || 1.0);
    if (this.params.envelopeMode === 'scale') {
      if (!isPiano) effAttack *= af;
      effRelease *= (this.params.release / 7.0);
    }
    effAttack = isPiano ? 0 : Math.max(0.04, effAttack);
    effRelease = Math.max(0.15, effRelease);
    const effSustain = Math.max(0.05, this.params.sustain);
    const tAttackEnd = now + effAttack, tSustainEnd = tAttackEnd + effSustain, tReleaseEnd = tSustainEnd + effRelease;
    const busNode = (this.nodes.voiceBuses && this.nodes.voiceBuses[voiceId]) || null;
    const baseGain = (this.baseVoiceGains && typeof this.baseVoiceGains[voiceId] === 'number')
      ? this.baseVoiceGains[voiceId]
      : (typeof voiceGain === 'number' ? voiceGain : (isPiano ? 2.0 : 0.65));
    const effBusGain = (this.voiceGains && typeof this.voiceGains[voiceId] === 'number')
      ? this.voiceGains[voiceId]
      : baseGain * this.getCrossfadeMultiplier(voiceId);
    const noteGainScale = (typeof voiceGain === 'number' && effBusGain > 0.001 && Math.abs(voiceGain - effBusGain) > 0.01 && Math.abs(voiceGain - baseGain) > 0.01)
      ? Math.max(0.2, Math.min(1.5, voiceGain / baseGain))
      : 1.0;
    const styleProf = this.getTrackStyleProfile ? this.getTrackStyleProfile() : null;
    const styleTrim = (styleProf && styleProf.voiceTrim && typeof styleProf.voiceTrim[voiceId] === 'number') ? styleProf.voiceTrim[voiceId] : 1.0;
    const instTrim = (this.voiceInstrumentTrim && typeof this.voiceInstrumentTrim[voiceId] === 'number') ? this.voiceInstrumentTrim[voiceId] : 1.0;
    const peakGain = Math.max(0.0001, velocity * (busNode ? 0.82 * noteGainScale : effBusGain * noteGainScale * 0.75) * styleTrim * instTrim);

    const envGain = this.ctx.createGain();
    if (isPiano) {
      let activePianos = 0;
      for (const an of this.activeNotes.values()) if (an.voiceId === 'piano' && (now - (an.startTime || 0)) < 0.25) activePianos++;
      const polyHeadroom = 1 / Math.pow(Math.max(1, activePianos + 1), 0.16);
      const pianoPeak = peakGain * 1.65 * polyHeadroom;
      envGain.gain.setValueAtTime(pianoPeak, now);
      envGain.gain.setValueAtTime(pianoPeak, tSustainEnd);
      envGain.gain.exponentialRampToValueAtTime(0.0001, tReleaseEnd);
    } else {
      envGain.gain.setValueAtTime(0.0001, now);
      envGain.gain.linearRampToValueAtTime(peakGain, tAttackEnd);
      envGain.gain.setValueAtTime(peakGain, tSustainEnd);
      envGain.gain.exponentialRampToValueAtTime(0.0001, tReleaseEnd);
    }

    const filterNode = (this.nodes.voiceFilters && this.nodes.voiceFilters[voiceId]) || null;
    const targetDest = filterNode || busNode || this.nodes.voiceSum;
    const panner = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;
    if (panner) {
      panner.pan.value = Math.max(-1, Math.min(1, pan));
      envGain.connect(panner);
      panner.connect(targetDest);
    } else {
      envGain.connect(targetDest);
    }

    // Octave-up (+12st) shimmer harmonic into crossfade-aware shimmerBus
    const shimmerTarget = (isPiano ? this.nodes.pianoShimmerCrossfade : this.nodes.otherShimmerCrossfade) || this.nodes.shimmerBus;
    const shimmerOsc = this.ctx.createOscillator();
    shimmerOsc.type = 'sine';
    shimmerOsc.frequency.setValueAtTime(freq * 2, now);
    const shimmerEnvGain = this.ctx.createGain();
    const shimScale = (styleProf && styleProf.shimmerCascade && typeof styleProf.shimmerCascade.baseOctaveGain === 'number') ? (styleProf.shimmerCascade.baseOctaveGain / 0.28) : 1.0;
    const shimmerPeak = voiceId === 'piano' ? 0 : Math.max(0.0001, peakGain * Math.min(2.5, baseGain) * 0.28 * shimScale);
    shimmerEnvGain.gain.setValueAtTime(0.0001, now);
    shimmerEnvGain.gain.linearRampToValueAtTime(shimmerPeak, Math.min(tSustainEnd, tAttackEnd + 0.3));
    shimmerEnvGain.gain.setValueAtTime(shimmerPeak, tSustainEnd);
    shimmerEnvGain.gain.exponentialRampToValueAtTime(0.0001, tReleaseEnd);
    shimmerOsc.connect(shimmerEnvGain);
    shimmerEnvGain.connect(shimmerTarget);
    shimmerOsc.start(now);
    shimmerOsc.stop(tReleaseEnd + 0.1);

    const oscs = [], bufferSources = [], internalNodes = [];

    if (voiceId !== 'piano' && typeof this._synthesizeTrackVoice === 'function' && this._synthesizeTrackVoice({
      voiceId, midiNote, freq, velocity, now, tAttackEnd, tSustainEnd, tReleaseEnd,
      baseGain, peakGain, envGain, shimmerTarget, oscs, bufferSources, internalNodes
    })) {
      // Handled by per-track style synthesizer
    } else if (voiceId === 'pad') {
      const s1 = this._makeOsc('sawtooth', freq, -7, now), s2 = this._makeOsc('sawtooth', freq, 7, now), sub = this._makeOsc('sine', freq * 0.5, 0, now);
      const subG = this.ctx.createGain(); subG.gain.value = 0.4;
      const vFilt = this._makeFilter('lowpass', Math.min(14000, freq * 3.5), 1.2);
      sub.connect(subG); subG.connect(vFilt); s1.connect(vFilt); s2.connect(vFilt); vFilt.connect(envGain);
      oscs.push(s1, s2, sub); internalNodes.push(subG, vFilt);
    } else if (voiceId === 'piano') {
      const rendered = (typeof this._triggerPianoSample === 'function') ?
          this._triggerPianoSample({
            midiNote, velocity, now, tReleaseEnd, baseGain, envGain,
            shimmerTarget, bufferSources, internalNodes
          }) : false;
      if (!rendered) {
        const fS = this._makeOsc('sine', freq, 0, now), fT = this._makeOsc('triangle', freq, 0, now);
        const h2 = this._makeOsc('sine', freq * 2, 0, now), h3 = this._makeOsc('sine', freq * 3, 0, now);
        const h2G = this.ctx.createGain(); h2G.gain.value = 0.25;
        const h3G = this.ctx.createGain(); h3G.gain.value = 0.10;
        const vFilt = this._makeFilter('lowpass', Math.min(1500, freq * 2.5), 0.65);
        vFilt.frequency.exponentialRampToValueAtTime(Math.max(60, freq * 1.2), tAttackEnd + 0.4);
        h2.connect(h2G); h3.connect(h3G); fS.connect(vFilt); fT.connect(vFilt); h2G.connect(vFilt); h3G.connect(vFilt); vFilt.connect(envGain);
        oscs.push(fS, fT, h2, h3); internalNodes.push(h2G, h3G, vFilt);
      }
    } else if (voiceId === 'bell') {
      const carrier = this._makeOsc('sine', freq, 0, now), modulator = this._makeOsc('sine', freq * 2.76, 0, now);
      const modG = this.ctx.createGain();
      modG.gain.setValueAtTime(freq * 2.4 * velocity, now);
      modG.gain.exponentialRampToValueAtTime(0.02, tReleaseEnd);
      modulator.connect(modG); modG.connect(carrier.frequency); carrier.connect(envGain);
      oscs.push(carrier, modulator); internalNodes.push(modG);
    } else if (voiceId === 'choir') {
      const specs = [{ type: 'sine', r: 1, det: 0, g: 0.65 }, { type: 'sine', r: 2, det: -5, g: 0.42 }, { type: 'triangle', r: 3, det: 6, g: 0.28 }, { type: 'sine', r: 4, det: -8, g: 0.16 }];
      const vFilt = this._makeFilter('lowpass', Math.min(13000, freq * 3.4), 0.9);
      for (const sp of specs) {
        const osc = this._makeOsc(sp.type, freq * sp.r, sp.det, now), g = this.ctx.createGain(); g.gain.value = sp.g;
        osc.connect(g); g.connect(vFilt); oscs.push(osc); internalNodes.push(g);
      }
      vFilt.connect(envGain); internalNodes.push(vFilt);
    } else if (voiceId === 'tape') {
      const tri = this._makeOsc('triangle', freq, 0, now), saw = this._makeOsc('sawtooth', freq, 0, now);
      const sawG = this.ctx.createGain(); sawG.gain.value = 0.35; saw.connect(sawG);
      const flutter = this._makeOsc('sine', 4.2, 0, now), flutterG = this.ctx.createGain(); flutterG.gain.value = 4.5;
      flutter.connect(flutterG); flutterG.connect(tri.detune); flutterG.connect(saw.detune);
      const vFilt = this._makeFilter('lowpass', 2400, 0.8);
      tri.connect(vFilt); sawG.connect(vFilt); vFilt.connect(envGain);
      oscs.push(tri, saw, flutter); internalNodes.push(sawG, flutterG, vFilt);
    } else {
      const fifthFreq = (window.enoPhraseEngine && window.ENO_DATA && typeof window.ENO_DATA.midiToFreq === 'function')
        ? window.ENO_DATA.midiToFreq(window.enoPhraseEngine.getDiatonicFifthMidi(midiNote)) : freq * 1.4983;
      const osc1 = this._makeOsc('sine', freq, 0, now), osc5 = this._makeOsc('sine', fifthFreq, 0, now), osc8 = this._makeOsc('sine', freq * 2, 0, now);
      const g5 = this.ctx.createGain(); g5.gain.value = 0.42; osc5.connect(g5);
      const g8 = this.ctx.createGain(); g8.gain.value = 0.24; osc8.connect(g8);
      const vFilt = this._makeFilter('lowpass', Math.min(11000, freq * 2.8), 0.7);
      osc1.connect(vFilt); g5.connect(vFilt); g8.connect(vFilt); vFilt.connect(envGain);
      oscs.push(osc1, osc5, osc8); internalNodes.push(g5, g8, vFilt);
    }

    for (const osc of oscs) { osc.start(now); osc.stop(tReleaseEnd + 0.1); }

    const noteId = ++this._noteCounter;
    const cleanup = () => {
      try {
        oscs.forEach(o => o.disconnect());
        bufferSources.forEach(bs => bs.disconnect());
        shimmerOsc.disconnect();
        internalNodes.forEach(n => n.disconnect());
        envGain.disconnect();
        if (panner) panner.disconnect();
        shimmerEnvGain.disconnect();
      } catch (e) {}
    };

    const cleanupTimer = setTimeout(() => {
      cleanup();
      this.activeNotes.delete(noteId);
    }, Math.max(100, (tReleaseEnd - now + 0.2) * 1000));

    this.activeNotes.set(noteId, {
      id: noteId, voiceId, midiNote, freq, startTime: now,
      usedSampledPiano: voiceId === 'piano' && bufferSources.length > 0,
      attackExempt: isPiano, effectiveAttack: effAttack, effectiveRelease: effRelease,
      envGain, shimmerEnvGain, peakGain, stopTime: tReleaseEnd, cleanup, cleanupTimer
    });
    return noteId;
  }

  _makeOsc(type, freq, detune, now) {
    const osc = this.ctx.createOscillator();
    osc.type = type; osc.frequency.setValueAtTime(freq, now);
    if (detune) osc.detune.setValueAtTime(detune, now);
    return osc;
  }

  _makeFilter(type, freq, q) {
    const filt = this.ctx.createBiquadFilter();
    filt.type = type; filt.frequency.value = freq;
    if (q !== undefined) filt.Q.value = q;
    return filt;
  }

  getFilterResponseCurve(numPoints = 128) {
    const freqs = new Float32Array(numPoints), magDb = new Float32Array(numPoints);
    const minF = 20, maxF = 20000;
    for (let i = 0; i < numPoints; i++) freqs[i] = minF * Math.pow(maxF / minF, i / (numPoints - 1));

    if (this.nodes && this.nodes.masterFilter && this.ctx) {
      const magResponse = new Float32Array(numPoints), phaseResponse = new Float32Array(numPoints);
      this.nodes.masterFilter.getFrequencyResponse(freqs, magResponse, phaseResponse);
      for (let i = 0; i < numPoints; i++) magDb[i] = 20 * Math.log10(Math.max(1e-5, magResponse[i]));
      return { freqs, magDb };
    }

    const fs = 44100, f0 = Math.max(20, Math.min(20000, this.params.cutoff * (this.params.circadianMultipliers.cutoff || 1.0)));
    const Q = Math.max(0.1, this.params.resonance), type = this.params.filterType || 'lowpass';
    const w0 = 2 * Math.PI * f0 / fs, alpha = Math.sin(w0) / (2 * Q), cosw0 = Math.cos(w0);

    let b0 = 1, b1 = 0, b2 = 0, a0 = 1 + alpha, a1 = -2 * cosw0, a2 = 1 - alpha;
    if (type === 'lowpass') { b0 = (1 - cosw0) / 2; b1 = 1 - cosw0; b2 = (1 - cosw0) / 2; }
    else if (type === 'highpass') { b0 = (1 + cosw0) / 2; b1 = -(1 + cosw0); b2 = (1 + cosw0) / 2; }
    else if (type === 'bandpass') { b0 = alpha; b1 = 0; b2 = -alpha; }
    else if (type === 'notch') { b0 = 1; b1 = -2 * cosw0; b2 = 1; }

    for (let i = 0; i < numPoints; i++) {
      const w = 2 * Math.PI * freqs[i] / fs;
      const cosw = Math.cos(w), cos2w = Math.cos(2 * w), sinw = Math.sin(w), sin2w = Math.sin(2 * w);
      const nr = b0 + b1 * cosw + b2 * cos2w, ni = -(b1 * sinw + b2 * sin2w);
      const dr = a0 + a1 * cosw + a2 * cos2w, di = -(a1 * sinw + a2 * sin2w);
      const mag = Math.sqrt((nr * nr + ni * ni) / Math.max(1e-12, dr * dr + di * di));
      magDb[i] = 20 * Math.log10(Math.max(1e-5, mag));
    }
    return { freqs, magDb };
  }

  getSpectrumData() {
    if (!this.nodes.analyser) return new Uint8Array(128);
    const data = new Uint8Array(this.nodes.analyser.frequencyBinCount);
    this.nodes.analyser.getByteFrequencyData(data);
    return data;
  }
}

if (typeof window !== 'undefined') {
  if (window.EnsoTrackStyles && typeof window.EnsoTrackStyles.attachToAudioEngine === 'function') {
    window.EnsoTrackStyles.attachToAudioEngine(AudioEngine);
  }
  window.AudioEngine = AudioEngine;
  if (window.EnsoPianoSampler &&
      typeof window.EnsoPianoSampler.attachToAudioEngine === 'function') {
    window.EnsoPianoSampler.attachToAudioEngine(AudioEngine);
  }
}
if (typeof module !== 'undefined' && module.exports) module.exports = AudioEngine;

