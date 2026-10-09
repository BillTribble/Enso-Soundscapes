/**
 * Enso Soundscapes — Modal Circle-of-Fifths Auto-Cycler & Common-Tone Track
 * Blender
 *
 * Automatically cycles between tracks in a modal Circle-of-Fifths order
 * starting with Sunlit Atrium (G Mixolydian), where EVERY transition satisfies
 * BOTH:
 *   1. Tonic root motion by Perfect 4th (+5 st) or Perfect 5th (+7 st) on the
 * Circle of Fifths
 *   2. Modal Key Signature (Parent Major Scale) motion of 0 or 1 accidental
 * (6/7 or 7/7 shared notes):
 *
 *   1. Sunlit Atrium    (thursday)       — G Mixolydian [Parent: C Major,
 * 0♯/0♭] ↓ P4 tonic (G → C) · +1♯ key sig · 6/7 shared notes {C,D,E,G,A,B}
 *   2. Luminous Drift   (reflection)     — C Lydian     [Parent: G Major, 1♯]
 *        ↓ P4 tonic (C → F) · -1♯ key sig · 6/7 shared notes {C,D,E,G,A,B}
 *   3. Cathedral Glass  (installations)  — F Lydian     [Parent: C Major,
 * 0♯/0♭] ↓ P5 tonic (F → C) ·  0  key sig · 7/7 shared notes {C,D,E,F,G,A,B}
 * (Relative Mode)
 *   4. Weightless Orbit (apollo_shimmer) — C Major      [Parent: C Major,
 * 0♯/0♭] ↓ P5 tonic (C → G) · +1♭ key sig · 6/7 shared notes {C,D,E,F,G,A}
 *   5. Felt & Mist      (mixing_colours) — G Dorian     [Parent: F Major, 1♭]
 *        ↓ P5 tonic (G → D) ·  0  key sig · 7/7 shared notes {D,E,F,G,A,B♭,C}
 * (Relative Mode)
 *   6. Moss & Reel      (discreet_loops) — D Aeolian    [Parent: F Major, 1♭]
 *        ↓ P4 tonic (D → G) · -1♭ key sig · 6/7 shared notes {G,A,C,D,E,F} →
 * back to Sunlit Atrium
 */
'use strict';

(function() {
const STORAGE_KEY = 'enso_auto_cycler_v1';
const DEFAULT_ENABLED = true;
const DEFAULT_TRANSITION_MINUTES = 8;
const DEFAULT_BLEND_SECONDS = 36;
const NOTE_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
const CIRCLE_ORDER = ['thursday', 'reflection', 'installations', 'apollo_shimmer', 'mixing_colours', 'discreet_loops'];
const GLOBAL_SLIDER_IDS = {
  attack: 'global-attack', release: 'global-release', sustain: 'global-sustain', masterVolume: 'master-volume',
  cutoff: 'filter-cutoff', resonance: 'filter-resonance', filterDrift: 'filter-drift',
  reverbMix: 'reverb-mix', reverbShimmer: 'reverb-shimmer', reverbDecay: 'reverb-decay', reverbDamping: 'reverb-damping',
  delayMix: 'delay-mix', delayTime: 'delay-time', delayFeedback: 'delay-feedback', delayWow: 'delay-wow'
};

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
function lerp(a, b, t) { return a + (b - a) * t; }
function formatMmSs(totalSeconds) {
  const sec = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  return `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;
}
function getCircleFifthsDistance(pcA, pcB) {
  const diff = ((pcB - pcA) % 12 + 12) % 12;
  const steps = [0, 5, 2, 3, 4, 1, 6, 1, 4, 3, 2, 5];
  return steps[diff] ?? 6;
}
function getIntervalRelationshipLabel(pcA, pcB) {
  const semi = ((pcB - pcA) % 12 + 12) % 12;
  return semi === 0 ? 'Same tonic' : semi === 5 ? 'P4 tonic (+5 st)' : semi === 7 ? 'P5 tonic (+7 st)' : `${semi} st`;
}

class EnsoAutoCycler {
  constructor(app) {
    this.app = app || window.enoApp || null;
    this.enabled = DEFAULT_ENABLED;
    this.transitionMinutes = DEFAULT_TRANSITION_MINUTES;
    this.blendDurationSec = DEFAULT_BLEND_SECONDS;

    this.trackElapsedSec = 0;
    this.trackStartedAtMs = Date.now();
    this.totalTransitionsCompleted = 0;

    this.blending = false;
    this.blendElapsedSec = 0;
    this.blendProgress = 0;
    this.blendAlpha = 0;
    this.fromPresetId = null;
    this.toPresetId = null;
    this.fromScaleId = null;
    this.toScaleId = null;
    this.fromSnapshot = null;
    this.toSnapshot = null;
    this.midpointSwitched = false;

    this._loadPersistedSettings();
    this.bindUI();
    this.syncUI();
  }

  _loadPersistedSettings() {
    const hash = (typeof window !== 'undefined' && window.location && window.location.hash) || '';
    if (hash.includes('selftest=1')) {
      this.enabled = DEFAULT_ENABLED; this.transitionMinutes = DEFAULT_TRANSITION_MINUTES; return;
    }
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (typeof parsed.enabled === 'boolean') this.enabled = parsed.enabled;
        if (typeof parsed.transitionMinutes === 'number' && !isNaN(parsed.transitionMinutes)) {
          this.transitionMinutes = clamp(Math.round(parsed.transitionMinutes), 1, 30);
        }
      }
    } catch (e) {}
  }

  _persistSettings() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ enabled: this.enabled, transitionMinutes: this.transitionMinutes }));
    } catch (e) {}
  }

  getOrderedPresetIds() {
    const presets = (window.ENO_DATA && window.ENO_DATA.PRESETS) || {};
    const available = Object.keys(presets);
    const base = CIRCLE_ORDER.filter((id) => available.includes(id));
    const extras = available.filter((id) => !base.includes(id));
    return [...base, ...extras];
  }

  getNextPresetId(currentId = null) {
    const app = this.app || window.enoApp;
    const activeId = currentId || (app && app.activePresetId) || 'thursday';
    const order = this.getOrderedPresetIds();
    if (!order.length) return 'thursday';
    const idx = order.indexOf(activeId);
    if (idx === -1) return order[0];
    return order[(idx + 1) % order.length];
  }

  getScaleInfo(scaleId) {
    const scales = (window.ENO_DATA && window.ENO_DATA.SCALES) || {};
    return scales[scaleId] || scales.thursday_g || {
      id: 'thursday_g', tonic: 'G', modeName: 'Mixolydian', parentKeySignature: 'C Major (0♯/0♭)',
      keySigFifths: 0, keyLabel: 'G Mixolydian', rootMidi: 55, intervals: [0, 2, 4, 5, 7, 9, 10],
      defaultWeights: [0.9, 0.75, 0.6, 0.3, 0.8, 0.5, 0.4]
    };
  }

  getPitchClassesForScale(scaleId) {
    const sc = this.getScaleInfo(scaleId);
    const root = typeof sc.rootMidi === 'number' ? sc.rootMidi : 55;
    const ivs =
        Array.isArray(sc.intervals) ? sc.intervals : [0, 2, 4, 5, 7, 9, 10];
    return ivs.map((iv) => ((root + iv) % 12 + 12) % 12);
  }

  getSharedPitchClasses(scaleIdA, scaleIdB) {
    const pcsA = this.getPitchClassesForScale(scaleIdA);
    const setB = new Set(this.getPitchClassesForScale(scaleIdB));
    return pcsA.filter((pc) => setB.has(pc));
  }

  verifyCircleOfFifthsOrder() {
    const presets = (window.ENO_DATA && window.ENO_DATA.PRESETS) || {};
    const order = CIRCLE_ORDER.filter((id) => !!presets[id]);
    const sunlitFirst =
        order[0] === 'thursday' && presets.thursday?.name === 'Sunlit Atrium';
    const transitions = [];
    let allValidModalSteps = order.length === 6 && sunlitFirst;

    for (let i = 0; i < order.length; i++) {
      const fromId = order[i];
      const toId = order[(i + 1) % order.length];
      const fromP = presets[fromId];
      const toP = presets[toId];
      const scA = this.getScaleInfo(fromP.scale);
      const scB = this.getScaleInfo(toP.scale);
      const pcA = ((scA.rootMidi % 12) + 12) % 12;
      const pcB = ((scB.rootMidi % 12) + 12) % 12;
      const semi = ((pcB - pcA) % 12 + 12) % 12;
      const fifthsDist = getCircleFifthsDistance(pcA, pcB);
      const shared = this.getSharedPitchClasses(fromP.scale, toP.scale);
      const ksA = typeof scA.keySigFifths === 'number' ? scA.keySigFifths : 0;
      const ksB = typeof scB.keySigFifths === 'number' ? scB.keySigFifths : 0;
      const keySigDelta = Math.abs(ksB - ksA);
      const validTonicStep =
          (semi === 0 || semi === 5 || semi === 7) && fifthsDist <= 1;
      const validModalOverlap = shared.length >= 6 && keySigDelta <= 1;
      const validStep = validTonicStep && validModalOverlap;
      if (!validStep) allValidModalSteps = false;

      transitions.push({
        fromPresetId: fromId, fromName: fromP.name, fromKey: scA.keyLabel || fromP.keyLabel,
        fromParentKeySig: scA.parentKeySignature || 'C Major (0♯/0♭)',
        toPresetId: toId, toName: toP.name, toKey: scB.keyLabel || toP.keyLabel,
        toParentKeySig: scB.parentKeySignature || 'C Major (0♯/0♭)',
        semitones: semi, circleFifthsDistance: fifthsDist, keySigDelta,
        relationship: getIntervalRelationshipLabel(pcA, pcB),
        sharedPitchClassesCount: shared.length, sharedNoteNames: shared.map((pc) => NOTE_NAMES[pc]),
        validStep
      });
    }

    return {
      ok: allValidModalSteps,
      sunlitAtriumFirst: sunlitFirst,
      order,
      transitions
    };
  }

  setEnabled(val, persist = true) {
    this.enabled = Boolean(val);
    if (!this.enabled && this.blending) this._cancelBlendAndRestoreCurrent();
    if (persist) this._persistSettings();
    this.syncUI();
  }

  setTransitionMinutes(mins, persist = true) {
    this.transitionMinutes = clamp(Math.round(Number(mins) || DEFAULT_TRANSITION_MINUTES), 1, 30);
    this.blendDurationSec = clamp(Math.round(this.transitionMinutes * 60 * 0.10), 12, 45);
    if (persist) this._persistSettings();
    this.syncUI();
  }

  onManualPresetChange(presetId) {
    if (this._internalApplyingPreset) return;
    if (this.blending) {
      this.blending = false; this.blendElapsedSec = 0; this.blendProgress = 0; this.blendAlpha = 0;
    }
    this.trackElapsedSec = 0;
    this.trackStartedAtMs = Date.now();
    this.fromPresetId = presetId;
    this.syncUI();
  }

  isTransitioning() {
    return Boolean(this.blending && this.fromScaleId && this.toScaleId);
  }

  isMidiInBlendedScales(midi) {
    if (!this.blending) return false;
    const pc = ((Math.round(midi) % 12) + 12) % 12;
    const pcsFrom =
        this.fromScaleId ? this.getPitchClassesForScale(this.fromScaleId) : [];
    const pcsTo =
        this.toScaleId ? this.getPitchClassesForScale(this.toScaleId) : [];
    return pcsFrom.includes(pc) || pcsTo.includes(pc);
  }

  snapMidiToSharedModalPivot(midi) {
    if (!this.blending || !this.fromScaleId || !this.toScaleId) return midi;
    if (this.blendProgress < 0.10 || this.blendProgress > 0.90) return midi;
    const shared = this.getSharedPitchClasses(this.fromScaleId, this.toScaleId);
    if (shared.length >= 7 || shared.length === 0) return midi;
    const rounded = Math.round(midi);
    const pc = ((rounded % 12) + 12) % 12;
    if (shared.includes(pc)) return rounded;
    for (let delta = 1; delta <= 2; delta++) {
      for (const sign of [-1, 1]) {
        const cand = rounded + sign * delta;
        const cPc = ((cand % 12) + 12) % 12;
        if (shared.includes(cPc)) return clamp(cand, 0, 127);
      }
    }
    return rounded;
  }

  selectBlendedSinglePitch(phraseEngine, voice, circadian, probEngine) {
    if (!this.blending || !phraseEngine) return null;
    const alpha = clamp(this.blendAlpha || 0, 0, 1);
    const chosenScaleId = (Math.random() < alpha) ?
        (this.toScaleId || phraseEngine.scaleId) :
        (this.fromScaleId || phraseEngine.scaleId);
    const sc = phraseEngine.getScale(chosenScaleId);
    const ivs = sc.intervals || [0, 2, 4, 6, 7, 9, 11];
    const root = typeof sc.rootMidi === 'number' ? sc.rootMidi : 55;
    const sharedPcs = new Set(this.getSharedPitchClasses(
        this.fromScaleId || chosenScaleId, this.toScaleId || chosenScaleId));
    const inCoreOverlap =
        this.blendProgress >= 0.10 && this.blendProgress <= 0.90;
    const pivotBoost =
        1.0 + 0.65 * Math.sin(Math.PI * clamp(this.blendProgress || 0, 0, 1));

    const baseW = (probEngine && Array.isArray(probEngine.degreeWeights) &&
                   probEngine.degreeWeights.length === ivs.length) ?
        probEngine.degreeWeights :
        (sc.defaultWeights || ivs.map(() => 0.70));

    const weights = ivs.map((iv, i) => {
      let w = baseW[i] !== undefined ? baseW[i] : 0.5;
      const pc = ((root + iv) % 12 + 12) % 12;
      if (sharedPcs.has(pc)) {
        w *= pivotBoost;
      } else if (inCoreOverlap && sharedPcs.size >= 5) {
        // Suppress the 1 non-shared modal accidental during the crossfade
        // overlap so zero cross-relations occur
        w = 0.0;
      }
      if (phraseEngine.currentChord &&
          Array.isArray(phraseEngine.currentChord.degrees) &&
          phraseEngine.currentChord.degrees.includes(i)) {
        w *= 1.25;
      }
      return Math.max(0.0, w);
    });

    const sumW = weights.reduce((a, b) => a + b, 0);
    let chosenDegree = 0;
    if (sumW > 0) {
      let target = Math.random() * sumW;
      for (let i = 0; i < weights.length; i++) {
        target -= weights[i];
        if (target <= 0) {
          chosenDegree = i;
          break;
        }
      }
    }

    const vOct = (voice && typeof voice.octaveOffset === 'number') ?
        voice.octaveOffset :
        0;
    const cOct = (circadian && typeof circadian.octaveBias === 'number') ?
        circadian.octaveBias :
        0;
    const roundShift = (voice && typeof voice.roundOctaveShift === 'number') ?
        voice.roundOctaveShift :
        0;
    const rawMidi = phraseEngine.degreeToMidi(
        chosenDegree, vOct + cOct + roundShift, chosenScaleId);
    const midi = this.snapMidiToSharedModalPivot(rawMidi);
    const noteName = (window.ENO_DATA && window.ENO_DATA.midiToNoteName) ?
        window.ENO_DATA.midiToNoteName(midi) :
        `M${midi}`;
    const freq = (window.ENO_DATA && window.ENO_DATA.midiToFreq) ?
        Number(window.ENO_DATA.midiToFreq(midi).toFixed(2)) :
        440;
    return {
      midi,
      noteName,
      freq,
      degreeIdx: chosenDegree,
      blendedScaleId: chosenScaleId
    };
  }

  _captureSnapshotFromPreset(presetId) {
    const app = this.app || window.enoApp;
    const presets = (window.ENO_DATA && window.ENO_DATA.PRESETS) || {};
    const p = presets[presetId] || presets.thursday;
    if (!p) return null;
    const sc = this.getScaleInfo(p.scale);
    const voices = {};
    const defaultVoices = (window.ENO_DATA && window.ENO_DATA.VOICES) || [];
    defaultVoices.forEach((dv) => {
      const pv = (p.voices && p.voices[dv.id]) || {};
      const globalGain = (app && app.globalVoiceGains &&
                          typeof app.globalVoiceGains[dv.id] === 'number') ?
          app.globalVoiceGains[dv.id] :
          (pv.gain !== undefined ? pv.gain : dv.defaultGain);
      voices[dv.id] = {
        prob: pv.prob !== undefined ? pv.prob : dv.defaultProb,
        cycle: pv.cycle !== undefined ? pv.cycle : dv.defaultPrimeCycle,
        gain: globalGain,
        release: pv.release !== undefined ? pv.release : dv.defaultRelease,
        octave: pv.octave !== undefined ? pv.octave : dv.defaultOctave,
        muted: Boolean(pv.muted)
      };
    });

    const pr = p.probability || {};
    return {
      presetId: p.id,
      name: p.name,
      scale: p.scale || 'thursday_g',
      keyLabel: sc.keyLabel || p.keyLabel || 'G Mixolydian',
      circadian: p.circadian || 'off',
      global: {...(p.global || {})},
      probability: {
        activeVoiceCount: pr.activeVoiceCount ?? 6,
        rotationSpeed: pr.rotationSpeed ?? 1.0,
        globalProb: pr.globalProb ?? 0.60,
        densityBias: pr.densityBias ?? 0.0,
        mutationRate: pr.mutationRate ?? 0.12,
        timeStretch: pr.timeStretch ?? 1.0,
        degreeWeights: Array.isArray(pr.degreeWeights) ?
            [...pr.degreeWeights] :
            [...(sc.defaultWeights || [0.9, 0.7, 0.6, 0.3, 0.8, 0.5, 0.4])]
      },
      voices
    };
  }

  startTransition(targetPresetId = null, customDurationSec = null) {
    const app = this.app || window.enoApp;
    if (!app) return false;
    const currentId = app.activePresetId || 'thursday';
    const nextId = targetPresetId || this.getNextPresetId(currentId);
    if (!nextId || nextId === currentId) return false;

    this.fromPresetId = currentId;
    this.toPresetId = nextId;
    this.fromSnapshot = this._captureSnapshotFromPreset(currentId);
    this.toSnapshot = this._captureSnapshotFromPreset(nextId);
    if (!this.fromSnapshot || !this.toSnapshot) return false;

    this.fromScaleId = this.fromSnapshot.scale;
    this.toScaleId = this.toSnapshot.scale;
    this.blending = true;
    this.blendElapsedSec = 0;
    this.blendProgress = 0;
    this.blendAlpha = 0;
    this.midpointSwitched = false;
    this.blendDurationSec =
        (typeof customDurationSec === 'number' && customDurationSec > 0) ?
        customDurationSec :
        clamp(Math.round(this.transitionMinutes * 60 * 0.10), 12, 45);

    if (app.probEngine && Array.isArray(app.probEngine.voices)) {
      app.probEngine.voices.forEach((v) => {
        const fromV = this.fromSnapshot.voices[v.id];
        const toV = this.toSnapshot.voices[v.id];
        if (fromV && toV && fromV.muted && !toV.muted) {
          app.probEngine.setVoiceParam(v.id, 'muted', false);
        }
      });
    }

    this.syncUI();
    return true;
  }

  _applyBlendAtProgress(progress) {
    const app = this.app || window.enoApp;
    if (!app || !this.fromSnapshot || !this.toSnapshot) return;
    const p = clamp(progress, 0, 1);
    const alpha = 0.5 - 0.5 * Math.cos(Math.PI * p);
    this.blendProgress = p;
    this.blendAlpha = alpha;

    const gA = this.fromSnapshot.global;
    const gB = this.toSnapshot.global;

    Object.entries(GLOBAL_SLIDER_IDS).forEach(([key, domId]) => {
      if (typeof gA[key] === 'number' && typeof gB[key] === 'number') {
        let val;
        if (key === 'cutoff' || key === 'reverbDamping') {
          const safeA = Math.max(40, gA[key]);
          const safeB = Math.max(40, gB[key]);
          val = safeA * Math.pow(safeB / safeA, alpha);
        } else {
          val = lerp(gA[key], gB[key], alpha);
        }
        const decimals = (key === 'cutoff' || key === 'reverbDamping') ?
            0 :
            (key === 'reverbDecay' ? 1 : 2);
        app.setSliderAndDispatch(domId, Number(val.toFixed(decimals)));
      }
    });

    const topVol = document.getElementById('top-master-volume');
    const topVolLbl = document.getElementById('val-top-master-volume');
    if (topVol && typeof gA.masterVolume === 'number' &&
        typeof gB.masterVolume === 'number') {
      const mv = lerp(gA.masterVolume, gB.masterVolume, alpha);
      topVol.value = mv.toFixed(2);
      if (topVolLbl) topVolLbl.textContent = `${Math.round(mv * 100)}%`;
      topVol.closest('.control-row')
          ?.querySelector('.rotary-dial-widget')
          ?._syncVisual?.();
    }

    const prA = this.fromSnapshot.probability;
    const prB = this.toSnapshot.probability;
    if (app.probEngine) {
      app.probEngine.setRotationSpeed(
          Number(lerp(prA.rotationSpeed, prB.rotationSpeed, alpha).toFixed(2)));
      app.probEngine.globalProbability =
          Number(lerp(prA.globalProb, prB.globalProb, alpha).toFixed(2));
      app.probEngine.setDensityBias(
          Number(lerp(prA.densityBias, prB.densityBias, alpha).toFixed(2)));
      app.probEngine.setMutationRate(
          Number(lerp(prA.mutationRate, prB.mutationRate, alpha).toFixed(2)));

      const len = Math.min(prA.degreeWeights.length, prB.degreeWeights.length);
      for (let i = 0; i < len; i++) {
        const w = Number(
            lerp(prA.degreeWeights[i], prB.degreeWeights[i], alpha).toFixed(3));
        app.probEngine.setDegreeWeight(i, w);
        const sl = document.querySelector(
            `.degree-weight-slider[data-degree-idx="${i}"]`);
        const lbl = document.getElementById(`val-deg-weight-${i}`);
        if (sl) sl.value = String(w);
        if (lbl) lbl.textContent = `${Math.round(w * 100)}%`;
      }
    }

    if (app.probEngine && Array.isArray(app.probEngine.voices)) {
      app.probEngine.voices.forEach((v) => {
        const vA = this.fromSnapshot.voices[v.id];
        const vB = this.toSnapshot.voices[v.id];
        if (!vA || !vB) return;
        const curProb = lerp(vA.prob, vB.prob, alpha);
        const curCycle = lerp(vA.cycle, vB.cycle, alpha);
        const curRelease = lerp(vA.release, vB.release, alpha);

        app.probEngine.setVoiceParam(v.id, 'prob', curProb);
        app.probEngine.setVoiceParam(v.id, 'cycle', curCycle);
        app.probEngine.setVoiceParam(v.id, 'release', curRelease);
        if (app.audioEngine) {
          app.audioEngine.setVoiceRelease(v.id, curRelease);
        }
      });
      if (typeof app.syncVoiceGainSlidersFromCrossfade === 'function') {
        app.syncVoiceGainSlidersFromCrossfade();
      }
    }

    if (p >= 0.5 && !this.midpointSwitched) {
      this.midpointSwitched = true;
      if (app.probEngine) {
        app.probEngine.setScale(this.toScaleId, false);
        const selScale = document.getElementById('select-scale');
        if (selScale) selScale.value = this.toScaleId;
      }
      if (app.phraseEngine) {
        app.phraseEngine.setPreset(this.toPresetId);
      }
      if (window.aurora && typeof window.aurora.setTrackVibe === 'function') {
        window.aurora.setTrackVibe(
            this.toPresetId, this.toScaleId, this.toSnapshot.circadian);
      }
      document.querySelectorAll('#preset-buttons-container [data-preset-id]')
          .forEach((btn) => {
            const isTarget = btn.dataset.presetId === this.toPresetId;
            btn.classList.toggle('active', isTarget);
            btn.setAttribute('aria-selected', isTarget ? 'true' : 'false');
          });
    }
  }

  _completeTransition() {
    const app = this.app || window.enoApp;
    const targetId = this.toPresetId || this.getNextPresetId();
    this.blending = false;
    this.blendElapsedSec = 0;
    this.blendProgress = 0;
    this.blendAlpha = 0;
    this.midpointSwitched = false;
    this.trackElapsedSec = 0;
    this.trackStartedAtMs = Date.now();
    this.totalTransitionsCompleted++;

    if (app && targetId) {
      this._internalApplyingPreset = true;
      try {
        app.applyPreset(targetId, false);
      } finally {
        this._internalApplyingPreset = false;
      }
    }
    this.syncUI();
  }

  _cancelBlendAndRestoreCurrent() {
    const app = this.app || window.enoApp;
    const restoreId =
        this.fromPresetId || (app && app.activePresetId) || 'thursday';
    this.blending = false;
    this.blendElapsedSec = 0;
    this.blendProgress = 0;
    this.blendAlpha = 0;
    this.midpointSwitched = false;
    if (app) {
      this._internalApplyingPreset = true;
      try {
        app.applyPreset(restoreId, false);
      } finally {
        this._internalApplyingPreset = false;
      }
    }
  }

  tick(dtSeconds) {
    if (typeof dtSeconds !== 'number' || dtSeconds <= 0) return;
    this.trackElapsedSec += dtSeconds;

    const totalCycleSec = Math.max(30, this.transitionMinutes * 60);
    const blendSec = clamp(Math.round(totalCycleSec * 0.10), 12, 45);
    this.blendDurationSec = blendSec;

    if (this.enabled) {
      if (!this.blending &&
          this.trackElapsedSec >= (totalCycleSec - blendSec)) {
        this.startTransition(this.getNextPresetId(), blendSec);
      }
      if (this.blending) {
        this.blendElapsedSec += dtSeconds;
        const prog = clamp(
            this.blendElapsedSec / Math.max(1, this.blendDurationSec), 0, 1);
        this._applyBlendAtProgress(prog);
        if (prog >= 1.0) {
          this._completeTransition();
        }
      }
    }

    const now = performance.now();
    if (!this._lastUiSyncMs || (now - this._lastUiSyncMs) > 220) {
      this._lastUiSyncMs = now;
      this.syncUI();
    }
  }

  simulateTransitionForTest(
      fromPresetId = 'thursday', toPresetId = 'reflection') {
    const app = this.app || window.enoApp;
    if (!app) return {ok: false};
    const origPreset = app.activePresetId || 'thursday';
    this._internalApplyingPreset = true;
    app.applyPreset(fromPresetId, false);
    this._internalApplyingPreset = false;

    const started = this.startTransition(toPresetId, 20);
    this._applyBlendAtProgress(0.25);
    const cutoffAt25 = app.audioEngine?.params?.cutoff || 0;
    const pitchSample = app.phraseEngine ?
        this.selectBlendedSinglePitch(
            app.phraseEngine, app.probEngine?.voices?.[0], {octaveBias: 0},
            app.probEngine) :
        null;
    const sharedSet =
        new Set(this.getSharedPitchClasses(this.fromScaleId, this.toScaleId));
    const pitchInSharedModalPivots = pitchSample ?
        sharedSet.has(((pitchSample.midi % 12) + 12) % 12) :
        false;
    this._applyBlendAtProgress(0.55);
    const midpointSwitchedOk = this.midpointSwitched === true;
    this._completeTransition();
    const landedOnTarget = app.activePresetId === toPresetId;

    this._internalApplyingPreset = true;
    app.applyPreset(origPreset, false);
    this._internalApplyingPreset = false;
    this.trackElapsedSec = 0;
    this.syncUI();

    return {
      ok: Boolean(
          started && cutoffAt25 > 0 && pitchSample &&
          pitchInSharedModalPivots && midpointSwitchedOk && landedOnTarget),
      started,
      cutoffAt25,
      pitchSampleMidi: pitchSample ? pitchSample.midi : null,
      pitchInSharedModalPivots,
      midpointSwitchedOk,
      landedOnTarget
    };
  }

  bindUI() {
    const toggleEl = document.getElementById('auto-cycle-toggle');
    const minsSlider = document.getElementById('auto-cycle-minutes');
    const nowBtn = document.getElementById('btn-trigger-transition');

    if (toggleEl) {
      toggleEl.checked = this.enabled;
      toggleEl.addEventListener('change', () => {
        this.setEnabled(toggleEl.checked, true);
      });
    }

    if (minsSlider) {
      minsSlider.value = String(this.transitionMinutes);
      minsSlider.addEventListener('input', () => {
        this.setTransitionMinutes(parseFloat(minsSlider.value), false);
      });
      minsSlider.addEventListener('change', () => {
        this.setTransitionMinutes(parseFloat(minsSlider.value), true);
      });
      minsSlider.addEventListener('dblclick', () => {
        minsSlider.value = String(DEFAULT_TRANSITION_MINUTES);
        this.setTransitionMinutes(DEFAULT_TRANSITION_MINUTES, true);
      });
    }

    if (nowBtn) {
      nowBtn.addEventListener('click', () => {
        if (!this.enabled) this.setEnabled(true, true);
        this.startTransition(this.getNextPresetId(), 14);
      });
    }
  }

  syncUI() {
    const app = this.app || window.enoApp;
    const presets = (window.ENO_DATA && window.ENO_DATA.PRESETS) || {};
    const activeId = (app && app.activePresetId) || 'thursday';
    const curPreset = presets[activeId] || presets.thursday ||
        {name: 'Sunlit Atrium', keyLabel: 'G Mixolydian', scale: 'thursday_g'};
    const nextId = this.blending ?
        (this.toPresetId || this.getNextPresetId(activeId)) :
        this.getNextPresetId(activeId);
    const nextPreset = presets[nextId] || presets.reflection ||
        {name: 'Luminous Drift', keyLabel: 'C Lydian', scale: 'reflection_eb'};

    const scCur = this.getScaleInfo(curPreset.scale);
    const scNext = this.getScaleInfo(nextPreset.scale);
    const pcCur = ((scCur.rootMidi % 12) + 12) % 12;
    const pcNext = ((scNext.rootMidi % 12) + 12) % 12;
    const relLabel = getIntervalRelationshipLabel(pcCur, pcNext);
    const sharedCount =
        this.getSharedPitchClasses(curPreset.scale, nextPreset.scale).length;

    const totalSec = Math.max(60, this.transitionMinutes * 60);
    const elapsed = Math.min(totalSec, Math.max(0, this.trackElapsedSec));
    const elapsedStr = formatMmSs(elapsed);
    const totalStr = formatMmSs(totalSec);
    const pct = clamp((elapsed / totalSec) * 100, 0, 100);

    const toggleEl = document.getElementById('auto-cycle-toggle');
    if (toggleEl && toggleEl.checked !== this.enabled) {
      toggleEl.checked = this.enabled;
    }

    const minsSlider = document.getElementById('auto-cycle-minutes');
    const minsLbl = document.getElementById('val-auto-cycle-minutes');
    if (minsSlider) {
      if (Math.abs(parseFloat(minsSlider.value) - this.transitionMinutes) >
          0.1) {
        minsSlider.value = String(this.transitionMinutes);
      }
      const sliderPct = ((this.transitionMinutes - 1) / (30 - 1)) * 100;
      minsSlider.style.setProperty('--pct', `${sliderPct.toFixed(2)}%`);
      minsSlider.closest('.control-row')
          ?.querySelector('.rotary-dial-widget')
          ?._syncVisual?.();
    }
    if (minsLbl) {
      minsLbl.textContent = `${this.transitionMinutes} min`;
    }

    const statusPill = document.getElementById('auto-cycle-status-pill');
    if (statusPill) {
      if (!this.enabled) {
        statusPill.textContent = 'Off · Manual lock';
        statusPill.className = 'badge';
      } else if (this.blending) {
        statusPill.textContent =
            `Blending · ${Math.round(this.blendProgress * 100)}%`;
        statusPill.className = 'badge badge-purple';
      } else {
        statusPill.textContent = 'Modal 5ths · On';
        statusPill.className = 'badge badge-teal';
      }
    }

    const elapsedLbl = document.getElementById('auto-cycle-elapsed-label');
    if (elapsedLbl) {
      elapsedLbl.textContent = `${curPreset.name} (${
          scCur.keyLabel || curPreset.keyLabel}) · ${elapsedStr} / ${totalStr}`;
    }

    const nextLbl = document.getElementById('auto-cycle-next-label');
    if (nextLbl) {
      const modalShareText = sharedCount === 7 ?
          '7/7 shared notes · Relative mode' :
          `${sharedCount}/7 shared notes · ${relLabel}`;
      nextLbl.textContent = this.blending ?
          `Crossfading into ${nextPreset.name} (${
              scNext.keyLabel || nextPreset.keyLabel} · ${modalShareText})` :
          `Next: ${nextPreset.name} (${
              scNext.keyLabel || nextPreset.keyLabel} · ${modalShareText})`;
    }

    const progFill = document.getElementById('auto-cycle-progress-fill');
    if (progFill) {
      const fillPct =
          this.blending ? clamp(this.blendProgress * 100, 0, 100) : pct;
      progFill.style.width = `${fillPct.toFixed(1)}%`;
    }

    const hudTrackTimer = document.getElementById('track-timer-label');
    if (hudTrackTimer) {
      if (this.enabled) {
        hudTrackTimer.textContent = `Track ${elapsedStr} / ${totalStr}`;
      } else {
        hudTrackTimer.textContent = `Track ${elapsedStr}`;
      }
    }
  }
}

if (typeof window !== 'undefined') {
  window.EnsoAutoCycler = EnsoAutoCycler;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {EnsoAutoCycler};
}
})();
