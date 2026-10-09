/**
 * Enso Soundscapes — Circle-of-Fifths Auto-Cycler & Smooth Harmonic Track Blender
 *
 * Automatically cycles between tracks in a clashing-free Circle of Fifths order
 * (starting with Sunlit Atrium in G Mixolydian -> C Dorian -> F Aeolian -> B♭ Lydian -> F Major -> C Lydian -> G Mixolydian),
 * where every transition is a pure Perfect 4th (+5 semitones) or Perfect 5th (+7 semitones).
 *
 * Smoothly crossfades & morphs all continuous DSP macros, voice gains/probabilities/cycles,
 * modal degree weights, and shared Circle-of-Fifths pivot pitches across the transition window
 * without cutting off active decaying notes.
 */
'use strict';

(function () {
  const STORAGE_KEY = 'enso_auto_cycler_v1';
  const DEFAULT_ENABLED = true;
  const DEFAULT_TRANSITION_MINUTES = 8;
  const DEFAULT_BLEND_SECONDS = 36;

  const CIRCLE_ORDER = [
    'thursday',        // 1. Sunlit Atrium   — G Mixolydian (Tonic G, rootMidi 55)
    'mixing_colours',  // 2. Felt & Mist     — C Dorian     (Tonic C, rootMidi 48, P4 from G)
    'discreet_loops',  // 3. Moss & Reel     — F Aeolian    (Tonic F, rootMidi 53, P4 from C)
    'reflection',      // 4. Luminous Drift  — B♭ Lydian    (Tonic B♭, rootMidi 58, P4 from F)
    'apollo_shimmer',  // 5. Weightless Orbit— F Major      (Tonic F, rootMidi 53, P5 from B♭)
    'installations'    // 6. Cathedral Glass — C Lydian     (Tonic C, rootMidi 48, P5 from F -> P5 to G)
  ];

  const GLOBAL_SLIDER_IDS = {
    attack: 'global-attack',
    release: 'global-release',
    sustain: 'global-sustain',
    masterVolume: 'master-volume',
    cutoff: 'filter-cutoff',
    resonance: 'filter-resonance',
    filterDrift: 'filter-drift',
    reverbMix: 'reverb-mix',
    reverbShimmer: 'reverb-shimmer',
    reverbDecay: 'reverb-decay',
    reverbDamping: 'reverb-damping',
    delayMix: 'delay-mix',
    delayTime: 'delay-time',
    delayFeedback: 'delay-feedback',
    delayWow: 'delay-wow'
  };

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function formatMmSs(totalSeconds) {
    const sec = Math.max(0, Math.floor(Number(totalSeconds) || 0));
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  function getCircleFifthsDistance(pcA, pcB) {
    const diff = ((pcB - pcA) % 12 + 12) % 12;
    const steps = [0, 5, 2, 3, 4, 1, 6, 1, 4, 3, 2, 5];
    return steps[diff] ?? 6;
  }

  function getIntervalRelationshipLabel(pcA, pcB) {
    const semi = ((pcB - pcA) % 12 + 12) % 12;
    if (semi === 0) return 'Same tonic key';
    if (semi === 5) return 'Perfect 4th (+5 st)';
    if (semi === 7) return 'Perfect 5th (+7 st)';
    return `${semi} semitones`;
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

      // Active transition blend state
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
        this.enabled = DEFAULT_ENABLED;
        this.transitionMinutes = DEFAULT_TRANSITION_MINUTES;
        return;
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
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          enabled: this.enabled,
          transitionMinutes: this.transitionMinutes
        }));
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
        id: 'thursday_g',
        tonic: 'G',
        keyLabel: 'G Mixolydian',
        rootMidi: 55,
        intervals: [0, 2, 4, 5, 7, 9, 10],
        defaultWeights: [0.9, 0.75, 0.6, 0.3, 0.8, 0.5, 0.4]
      };
    }

    getPitchClassesForScale(scaleId) {
      const sc = this.getScaleInfo(scaleId);
      const root = typeof sc.rootMidi === 'number' ? sc.rootMidi : 55;
      const ivs = Array.isArray(sc.intervals) ? sc.intervals : [0, 2, 4, 5, 7, 9, 10];
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
      const sunlitFirst = order[0] === 'thursday' && presets.thursday?.name === 'Sunlit Atrium';
      const transitions = [];
      let allFourthOrFifthOrSame = order.length === 6 && sunlitFirst;

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
        const validStep = (semi === 0 || semi === 5 || semi === 7) && fifthsDist <= 1;
        if (!validStep) allFourthOrFifthOrSame = false;
        const shared = this.getSharedPitchClasses(fromP.scale, toP.scale);
        transitions.push({
          fromPresetId: fromId,
          fromName: fromP.name,
          fromKey: scA.keyLabel || fromP.keyLabel,
          toPresetId: toId,
          toName: toP.name,
          toKey: scB.keyLabel || toP.keyLabel,
          semitones: semi,
          circleFifthsDistance: fifthsDist,
          relationship: getIntervalRelationshipLabel(pcA, pcB),
          sharedPitchClassesCount: shared.length,
          validStep
        });
      }

      return {
        ok: allFourthOrFifthOrSame,
        sunlitAtriumFirst: sunlitFirst,
        order,
        transitions
      };
    }

    setEnabled(val, persist = true) {
      this.enabled = Boolean(val);
      if (!this.enabled && this.blending) {
        this._cancelBlendAndRestoreCurrent();
      }
      if (persist) this._persistSettings();
      this.syncUI();
    }

    setTransitionMinutes(mins, persist = true) {
      const m = clamp(Math.round(Number(mins) || DEFAULT_TRANSITION_MINUTES), 1, 30);
      this.transitionMinutes = m;
      const totalSec = m * 60;
      this.blendDurationSec = clamp(Math.round(totalSec * 0.10), 12, 45);
      if (persist) this._persistSettings();
      this.syncUI();
    }

    onManualPresetChange(presetId) {
      if (this._internalApplyingPreset) return;
      if (this.blending) {
        this.blending = false;
        this.blendElapsedSec = 0;
        this.blendProgress = 0;
        this.blendAlpha = 0;
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
      const pcsFrom = this.fromScaleId ? this.getPitchClassesForScale(this.fromScaleId) : [];
      const pcsTo = this.toScaleId ? this.getPitchClassesForScale(this.toScaleId) : [];
      return pcsFrom.includes(pc) || pcsTo.includes(pc);
    }

    selectBlendedSinglePitch(phraseEngine, voice, circadian, probEngine) {
      if (!this.blending || !phraseEngine) return null;
      const alpha = clamp(this.blendAlpha || 0, 0, 1);
      const chosenScaleId = (Math.random() < alpha) ? (this.toScaleId || phraseEngine.scaleId) : (this.fromScaleId || phraseEngine.scaleId);
      const sc = phraseEngine.getScale(chosenScaleId);
      const ivs = sc.intervals || [0, 2, 4, 6, 7, 9, 11];
      const root = typeof sc.rootMidi === 'number' ? sc.rootMidi : 55;
      const sharedPcs = new Set(this.getSharedPitchClasses(this.fromScaleId || chosenScaleId, this.toScaleId || chosenScaleId));
      const pivotBoost = 1.0 + 0.55 * Math.sin(Math.PI * clamp(this.blendProgress || 0, 0, 1));

      const baseW = (probEngine && Array.isArray(probEngine.degreeWeights) && probEngine.degreeWeights.length === ivs.length)
        ? probEngine.degreeWeights
        : (sc.defaultWeights || ivs.map(() => 0.70));

      const weights = ivs.map((iv, i) => {
        let w = baseW[i] !== undefined ? baseW[i] : 0.5;
        const pc = ((root + iv) % 12 + 12) % 12;
        if (sharedPcs.has(pc)) w *= pivotBoost;
        if (phraseEngine.currentChord && Array.isArray(phraseEngine.currentChord.degrees) && phraseEngine.currentChord.degrees.includes(i)) {
          w *= 1.25;
        }
        return Math.max(0.01, w);
      });

      const sumW = weights.reduce((a, b) => a + b, 0);
      let target = Math.random() * sumW;
      let chosenDegree = 0;
      for (let i = 0; i < weights.length; i++) {
        target -= weights[i];
        if (target <= 0) {
          chosenDegree = i;
          break;
        }
      }

      const vOct = (voice && typeof voice.octaveOffset === 'number') ? voice.octaveOffset : 0;
      const cOct = (circadian && typeof circadian.octaveBias === 'number') ? circadian.octaveBias : 0;
      const roundShift = (voice && typeof voice.roundOctaveShift === 'number') ? voice.roundOctaveShift : 0;
      const midi = phraseEngine.degreeToMidi(chosenDegree, vOct + cOct + roundShift, chosenScaleId);
      const noteName = (window.ENO_DATA && window.ENO_DATA.midiToNoteName) ? window.ENO_DATA.midiToNoteName(midi) : `M${midi}`;
      const freq = (window.ENO_DATA && window.ENO_DATA.midiToFreq) ? Number(window.ENO_DATA.midiToFreq(midi).toFixed(2)) : 440;
      return { midi, noteName, freq, degreeIdx: chosenDegree, blendedScaleId: chosenScaleId };
    }

    _captureSnapshotFromPreset(presetId) {
      const presets = (window.ENO_DATA && window.ENO_DATA.PRESETS) || {};
      const p = presets[presetId] || presets.thursday;
      if (!p) return null;
      const sc = this.getScaleInfo(p.scale);
      const voices = {};
      const defaultVoices = (window.ENO_DATA && window.ENO_DATA.VOICES) || [];
      defaultVoices.forEach((dv) => {
        const pv = (p.voices && p.voices[dv.id]) || {};
        voices[dv.id] = {
          prob: pv.prob !== undefined ? pv.prob : dv.defaultProb,
          cycle: pv.cycle !== undefined ? pv.cycle : dv.defaultPrimeCycle,
          gain: pv.gain !== undefined ? pv.gain : dv.defaultGain,
          release: pv.release !== undefined ? pv.release : dv.defaultRelease,
          octave: pv.octave !== undefined ? pv.octave : dv.defaultOctave,
          octaveShiftProb: pv.octaveShiftProb !== undefined ? pv.octaveShiftProb : 0.10,
          noteOctaveShiftProb: pv.noteOctaveShiftProb !== undefined ? pv.noteOctaveShiftProb : 0.03,
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
        global: { ...(p.global || {}) },
        probability: {
          activeVoiceCount: pr.activeVoiceCount ?? 6,
          rotationSpeed: pr.rotationSpeed ?? 1.0,
          globalProb: pr.globalProb ?? 0.60,
          densityBias: pr.densityBias ?? 0.0,
          mutationRate: pr.mutationRate ?? 0.12,
          timeStretch: pr.timeStretch ?? 1.0,
          degreeWeights: Array.isArray(pr.degreeWeights) ? [...pr.degreeWeights] : [...(sc.defaultWeights || [0.9, 0.7, 0.6, 0.3, 0.8, 0.5, 0.4])]
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
      if (typeof customDurationSec === 'number' && customDurationSec > 0) {
        this.blendDurationSec = customDurationSec;
      } else {
        this.blendDurationSec = clamp(Math.round(this.transitionMinutes * 60 * 0.10), 12, 45);
      }

      // Unmute any voices that are active in the incoming track at gain 0 so they fade in without clicks
      if (app.probEngine && Array.isArray(app.probEngine.voices)) {
        app.probEngine.voices.forEach((v) => {
          const fromV = this.fromSnapshot.voices[v.id];
          const toV = this.toSnapshot.voices[v.id];
          if (fromV && toV && fromV.muted && !toV.muted) {
            app.probEngine.setVoiceParam(v.id, 'muted', false);
            app.probEngine.setVoiceParam(v.id, 'gain', 0.001);
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

      // 1. Interpolate Master DSP global sliders smoothly
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
          const decimals = (key === 'cutoff' || key === 'reverbDamping') ? 0 : (key === 'reverbDecay' ? 1 : 2);
          app.setSliderAndDispatch(domId, Number(val.toFixed(decimals)));
        }
      });

      // Keep top-bar volume dial in sync with master-volume
      const topVol = document.getElementById('top-master-volume');
      const topVolLbl = document.getElementById('val-top-master-volume');
      if (topVol && typeof gA.masterVolume === 'number' && typeof gB.masterVolume === 'number') {
        const mv = lerp(gA.masterVolume, gB.masterVolume, alpha);
        topVol.value = mv.toFixed(2);
        if (topVolLbl) topVolLbl.textContent = `${Math.round(mv * 100)}%`;
        topVol.closest('.control-row')?.querySelector('.rotary-dial-widget')?._syncVisual?.();
      }

      // 2. Interpolate Probability & Degree Weights
      const prA = this.fromSnapshot.probability;
      const prB = this.toSnapshot.probability;
      if (app.probEngine) {
        const rot = Number(lerp(prA.rotationSpeed, prB.rotationSpeed, alpha).toFixed(2));
        const gProb = Number(lerp(prA.globalProb, prB.globalProb, alpha).toFixed(2));
        const dens = Number(lerp(prA.densityBias, prB.densityBias, alpha).toFixed(2));
        const mut = Number(lerp(prA.mutationRate, prB.mutationRate, alpha).toFixed(2));
        app.probEngine.setRotationSpeed(rot);
        app.probEngine.globalProbability = gProb;
        app.probEngine.setDensityBias(dens);
        app.probEngine.setMutationRate(mut);

        const len = Math.min(prA.degreeWeights.length, prB.degreeWeights.length);
        for (let i = 0; i < len; i++) {
          const w = Number(lerp(prA.degreeWeights[i], prB.degreeWeights[i], alpha).toFixed(3));
          app.probEngine.setDegreeWeight(i, w);
          const sl = document.querySelector(`.degree-weight-slider[data-degree-idx="${i}"]`);
          const lbl = document.getElementById(`val-deg-weight-${i}`);
          if (sl) sl.value = String(w);
          if (lbl) lbl.textContent = `${Math.round(w * 100)}%`;
        }
      }

      // 3. Interpolate 6 Voices (gain, prob, cycle, release)
      if (app.probEngine && Array.isArray(app.probEngine.voices)) {
        app.probEngine.voices.forEach((v) => {
          const vA = this.fromSnapshot.voices[v.id];
          const vB = this.toSnapshot.voices[v.id];
          if (!vA || !vB) return;
          const startGain = vA.muted ? 0 : vA.gain;
          const endGain = vB.muted ? 0 : vB.gain;
          const curBaseGain = lerp(startGain, endGain, alpha);
          const curProb = lerp(vA.prob, vB.prob, alpha);
          const curCycle = lerp(vA.cycle, vB.cycle, alpha);
          const curRelease = lerp(vA.release, vB.release, alpha);

          app.probEngine.setVoiceParam(v.id, 'gain', curBaseGain);
          app.probEngine.setVoiceParam(v.id, 'prob', curProb);
          app.probEngine.setVoiceParam(v.id, 'cycle', curCycle);
          app.probEngine.setVoiceParam(v.id, 'release', curRelease);
          if (app.audioEngine) {
            app.audioEngine.setVoiceVolume(v.id, curBaseGain);
            app.audioEngine.setVoiceRelease(v.id, curRelease);
          }
        });
        if (typeof app.syncVoiceGainSlidersFromCrossfade === 'function') {
          app.syncVoiceGainSlidersFromCrossfade();
        }
      }

      // 4. At midpoint (p >= 0.5), shift scale, phrase pattern & aurora palette to incoming track
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
          window.aurora.setTrackVibe(this.toPresetId, this.toScaleId, this.toSnapshot.circadian);
        }
        document.querySelectorAll('#preset-buttons-container [data-preset-id]').forEach((btn) => {
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
          // Do not release sustaining notes; applyPreset updates parameters and UI cleanly
          app.applyPreset(targetId, false);
        } finally {
          this._internalApplyingPreset = false;
        }
      }
      this.syncUI();
    }

    _cancelBlendAndRestoreCurrent() {
      const app = this.app || window.enoApp;
      const restoreId = this.fromPresetId || (app && app.activePresetId) || 'thursday';
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
        if (!this.blending && this.trackElapsedSec >= (totalCycleSec - blendSec)) {
          this.startTransition(this.getNextPresetId(), blendSec);
        }

        if (this.blending) {
          this.blendElapsedSec += dtSeconds;
          const prog = clamp(this.blendElapsedSec / Math.max(1, this.blendDurationSec), 0, 1);
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

    simulateTransitionForTest(fromPresetId = 'thursday', toPresetId = 'mixing_colours') {
      const app = this.app || window.enoApp;
      if (!app) return { ok: false };
      const origPreset = app.activePresetId || 'thursday';
      this._internalApplyingPreset = true;
      app.applyPreset(fromPresetId, false);
      this._internalApplyingPreset = false;

      const started = this.startTransition(toPresetId, 20);
      this._applyBlendAtProgress(0.25);
      const cutoffAt25 = app.audioEngine?.params?.cutoff || 0;
      const pitchSample = app.phraseEngine
        ? this.selectBlendedSinglePitch(app.phraseEngine, app.probEngine?.voices?.[0], { octaveBias: 0 }, app.probEngine)
        : null;
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
        ok: Boolean(started && cutoffAt25 > 0 && pitchSample && midpointSwitchedOk && landedOnTarget),
        started,
        cutoffAt25,
        pitchSampleMidi: pitchSample ? pitchSample.midi : null,
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
      const curPreset = presets[activeId] || presets.thursday || { name: 'Sunlit Atrium', keyLabel: 'G Mixolydian', scale: 'thursday_g' };
      const nextId = this.blending ? (this.toPresetId || this.getNextPresetId(activeId)) : this.getNextPresetId(activeId);
      const nextPreset = presets[nextId] || presets.mixing_colours || { name: 'Felt & Mist', keyLabel: 'C Dorian', scale: 'mixing_c' };

      const scCur = this.getScaleInfo(curPreset.scale);
      const scNext = this.getScaleInfo(nextPreset.scale);
      const pcCur = ((scCur.rootMidi % 12) + 12) % 12;
      const pcNext = ((scNext.rootMidi % 12) + 12) % 12;
      const relLabel = getIntervalRelationshipLabel(pcCur, pcNext);

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
        if (Math.abs(parseFloat(minsSlider.value) - this.transitionMinutes) > 0.1) {
          minsSlider.value = String(this.transitionMinutes);
        }
        const sliderPct = ((this.transitionMinutes - 1) / (30 - 1)) * 100;
        minsSlider.style.setProperty('--pct', `${sliderPct.toFixed(2)}%`);
        minsSlider.closest('.control-row')?.querySelector('.rotary-dial-widget')?._syncVisual?.();
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
          statusPill.textContent = `Blending → ${nextPreset.name} (${Math.round(this.blendProgress * 100)}%)`;
          statusPill.className = 'badge badge-purple';
        } else {
          statusPill.textContent = 'Circle of 5ths · On';
          statusPill.className = 'badge badge-teal';
        }
      }

      const elapsedLbl = document.getElementById('auto-cycle-elapsed-label');
      if (elapsedLbl) {
        elapsedLbl.textContent = `${curPreset.name} (${scCur.keyLabel || curPreset.keyLabel}) · ${elapsedStr} / ${totalStr}`;
      }

      const nextLbl = document.getElementById('auto-cycle-next-label');
      if (nextLbl) {
        nextLbl.textContent = this.blending
          ? `Crossfading into ${nextPreset.name} (${scNext.keyLabel || nextPreset.keyLabel} · ${relLabel})`
          : `Next: ${nextPreset.name} (${scNext.keyLabel || nextPreset.keyLabel} · ${relLabel})`;
      }

      const progFill = document.getElementById('auto-cycle-progress-fill');
      if (progFill) {
        const fillPct = this.blending ? clamp(this.blendProgress * 100, 0, 100) : pct;
        progFill.style.width = `${fillPct.toFixed(1)}%`;
      }

      const hudTrackTimer = document.getElementById('track-timer-label');
      if (hudTrackTimer) {
        if (this.blending) {
          hudTrackTimer.textContent = `Blending → ${nextPreset.name} (${Math.round(this.blendProgress * 100)}%)`;
        } else if (this.enabled) {
          hudTrackTimer.textContent = `Track ${elapsedStr} / ${totalStr} · → ${nextPreset.name}`;
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
    module.exports = { EnsoAutoCycler };
  }
})();
