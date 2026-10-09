/**
 * Brian Eno & Peter Chilvers Aleatoric / Probability Engine
 * Governs asynchronous prime cycles, Markov consonance weighting, and circadian drift.
 */
'use strict';

class ProbabilityEngine {
  /**
   * @param {Object} audioEngine Instance of AudioEngine with triggerVoice/setCircadianMultipliers
   * @param {Function} onEventCallback Listener invoked when gate evaluates or note blooms
   */
  constructor(audioEngine, onEventCallback) {
    this.audioEngine = audioEngine || null;
    this.onEvent = typeof onEventCallback === 'function' ? onEventCallback : (() => {});

    // Initial staggered phase offsets across the 6 voices to begin unfolding immediately
    const INITIAL_PHASES = [0.15, 0.82, 0.45, 0.30, 0.65, 0.92];

    const sourceVoices =
        (window.ENO_DATA && Array.isArray(window.ENO_DATA.VOICES)) ?
        window.ENO_DATA.VOICES :
        [
          {
            id: 'pad',
            name: 'CS-80 Ribbon Pad',
            role: 'Warm swell',
            badgeHue: 'blue',
            octaveOffset: 0,
            defaultPrimeCycle: 17.3,
            defaultProb: 0.74,
            defaultGain: 0.36,
            defaultCutoff: 5200,
            defaultResonance: 1.2,
            panSpread: 0.35
          },
          {
            id: 'piano',
            name: 'Felt Piano',
            role: 'Damped hammer',
            badgeHue: 'teal',
            octaveOffset: 0,
            defaultPrimeCycle: 7.9,
            defaultProb: 0.62,
            defaultGain: 2.00,
            defaultCutoff: 12000,
            defaultResonance: 0.8,
            panSpread: 0.45
          },
          {
            id: 'bell',
            name: 'DX7 Glass Bell',
            role: 'FM crystalline',
            badgeHue: 'purple',
            octaveOffset: 1,
            defaultPrimeCycle: 11.3,
            defaultProb: 0.46,
            defaultGain: 0.27,
            defaultCutoff: 9500,
            defaultResonance: 1.4,
            panSpread: 0.65
          },
          {
            id: 'choir',
            name: 'Spectral Choir',
            role: 'Harmonic bloom',
            badgeHue: 'green',
            octaveOffset: 1,
            defaultPrimeCycle: 23.9,
            defaultProb: 0.52,
            defaultGain: 0.30,
            defaultCutoff: 6400,
            defaultResonance: 1.2,
            panSpread: 0.50
          },
          {
            id: 'tape',
            name: 'Revox Tape Loop',
            role: 'Sound-on-sound',
            badgeHue: 'orange',
            octaveOffset: 0,
            defaultPrimeCycle: 13.7,
            defaultProb: 0.60,
            defaultGain: 0.32,
            defaultCutoff: 4200,
            defaultResonance: 1.6,
            panSpread: 0.40
          },
          {
            id: 'drone',
            name: 'Sub-Bass Pedal',
            role: 'Foundational anchor',
            badgeHue: 'yellow',
            octaveOffset: -1,
            defaultPrimeCycle: 31.1,
            defaultProb: 0.82,
            defaultGain: 0.35,
            defaultCutoff: 1800,
            defaultResonance: 1.8,
            panSpread: 0.15
          }
        ];

    this.voices = sourceVoices.map(
        (v, idx) => ({
          id: v.id,
          name: v.name,
          role: v.role,
          badgeHue: v.badgeHue,
          defaultOctave: typeof v.defaultOctave === 'number' ?
              v.defaultOctave :
              (typeof v.octaveOffset === 'number' ? v.octaveOffset : 0),
          octaveOffset: typeof v.octaveOffset === 'number' ? v.octaveOffset : 0,
          defaultOctaveShiftProb: typeof v.defaultOctaveShiftProb === 'number' ?
              v.defaultOctaveShiftProb :
              0.10,
          octaveShiftProb: typeof v.defaultOctaveShiftProb === 'number' ?
              v.defaultOctaveShiftProb :
              0.10,
          defaultNoteOctaveShiftProb:
              typeof v.defaultNoteOctaveShiftProb === 'number' ?
              v.defaultNoteOctaveShiftProb :
              0.03,
          noteOctaveShiftProb:
              typeof v.defaultNoteOctaveShiftProb === 'number' ?
              v.defaultNoteOctaveShiftProb :
              0.03,
          defaultChordOctaveShiftProb:
              typeof v.defaultChordOctaveShiftProb === 'number' ?
              v.defaultChordOctaveShiftProb :
              0.10,
          chordOctaveShiftProb:
              typeof v.defaultChordOctaveShiftProb === 'number' ?
              v.defaultChordOctaveShiftProb :
              0.10,
          roundOctaveShift: 0,
          stayShiftedProb: 0.30,
          twoOctaveRatio: 0.20,
          panSpread: typeof v.panSpread === 'number' ? v.panSpread : 0.4,
          prob: typeof v.defaultProb === 'number' ? v.defaultProb : 0.60,
          cycle: typeof v.defaultPrimeCycle === 'number' ? v.defaultPrimeCycle :
                                                           15.0,
          baseGain: typeof v.defaultGain === 'number' ? v.defaultGain : 0.70,
          gain: typeof v.defaultGain === 'number' ? v.defaultGain : 0.70,
          balanceGain: v.id === 'piano' ? 1.0 : 0.38,
          effectiveGain: Number(
              ((typeof v.defaultGain === 'number' ? v.defaultGain : 0.70) *
               (v.id === 'piano' ? 1.0 : 0.38))
                  .toFixed(4)),
          release: typeof v.defaultRelease === 'number' ? v.defaultRelease :
                                                          7.0,
          defaultCutoff: typeof v.defaultCutoff === 'number' ? v.defaultCutoff :
                                                               8000,
          cutoff: typeof v.defaultCutoff === 'number' ? v.defaultCutoff : 8000,
          defaultResonance:
              typeof v.defaultResonance === 'number' ? v.defaultResonance : 1.0,
          resonance:
              typeof v.defaultResonance === 'number' ? v.defaultResonance : 1.0,
          muted: false,
          solo: false,
          phase: INITIAL_PHASES[idx % INITIAL_PHASES.length],
          lastOutcome: 'IDLE',
          lastNote: '—',
          lastRoll: null,
          passCount: 0,
          restCount: 0
        }));

    this.isRunning = false;
    this.scaleId = 'reflection_eb';
    this.circadianMode = 'off';
    this.densityBias = 0.0;
    this.mutationRate = 0.35;
    this.timeStretch = 1.0;
    this.activeVoiceCount = 6;
    this.rotationSpeed = 1.0;
    this.globalProbability = 0.63;
    this.voiceOrder = ['pad', 'piano', 'bell', 'choir', 'tape', 'drone'];

    const defaultScale = (window.ENO_DATA && window.ENO_DATA.SCALES && window.ENO_DATA.SCALES.reflection_eb) || null;
    this.degreeWeights = defaultScale && Array.isArray(defaultScale.defaultWeights)
      ? [...defaultScale.defaultWeights]
      : [0.95, 0.70, 0.55, 0.40, 0.85, 0.60, 0.35];

    this.noteHistory = [];
    this.eventLog = [];
    this.stats = { totalRolls: 0, totalPasses: 0, totalRests: 0, sessionStartMs: Date.now(), listenedSeconds: 0 };
  }

  start() {
    this.isRunning = true;
    if (!this.stats.sessionStartMs) this.stats.sessionStartMs = Date.now();
  }

  stop() {
    this.isRunning = false;
  }

  resetStats() {
    this.stats = { totalRolls: 0, totalPasses: 0, totalRests: 0, sessionStartMs: Date.now(), listenedSeconds: 0 };
    for (const v of this.voices) {
      v.passCount = 0;
      v.restCount = 0;
      v.lastOutcome = 'IDLE';
      v.lastRoll = null;
      v.lastNote = '—';
    }
    this.eventLog = [];
    this.noteHistory = [];
  }

  getEffectiveCircadian() {
    const modes = (window.ENO_DATA && window.ENO_DATA.CIRCADIAN_MODES) ? window.ENO_DATA.CIRCADIAN_MODES : {};
    if (this.circadianMode === 'auto') {
      const h = new Date().getHours();
      let key = 'night';
      if (h >= 6 && h < 12) key = 'morning';
      else if (h >= 12 && h < 18) key = 'afternoon';
      else if (h >= 18 && h < 24) key = 'evening';
      return modes[key] || { id: key, octaveBias: 0, cutoffMultiplier: 1.0, densityOffset: 0, attackMultiplier: 1.0, releaseMultiplier: 1.0, shimmerBoost: 0 };
    }
    return modes[this.circadianMode] || modes.off || { id: 'off', octaveBias: 0, cutoffMultiplier: 1.0, densityOffset: 0, attackMultiplier: 1.0, releaseMultiplier: 1.0, shimmerBoost: 0 };
  }

  tick(dtSeconds) {
    if (!this.isRunning || dtSeconds <= 0) return;
    this.stats.listenedSeconds += dtSeconds;

    const circadian = this.getEffectiveCircadian();
    if (this.audioEngine && typeof this.audioEngine.setCircadianMultipliers === 'function') {
      this.audioEngine.setCircadianMultipliers(circadian);
    }

    const speed = Math.max(0.15, Math.min(3.5, this.rotationSpeed || 1.0));
    for (const voice of this.voices) {
      if (voice.muted) continue;
      const cycleDuration = Math.max(1.5, voice.cycle / speed);
      voice.phase += dtSeconds / cycleDuration;
      while (voice.phase >= 1.0) {
        voice.phase -= 1.0;
        this._evaluateVoiceGate(voice);
      }
    }
  }

  evaluateRoundOctaveShift(voice, options = {}) {
    if (!voice) return 0;
    const p1 = Math.max(
        0,
        Math.min(
            1,
            typeof voice.octaveShiftProb === 'number' ? voice.octaveShiftProb :
                                                        0.10));
    if (p1 <= 0) {
      voice.roundOctaveShift = 0;
      return 0;
    }
    const currentShift = typeof voice.roundOctaveShift === 'number' ?
        Math.max(-1, voice.roundOctaveShift) :
        0;
    if (currentShift !== 0) {
      const stayProb = typeof voice.stayShiftedProb === 'number' ?
          voice.stayShiftedProb :
          0.30;
      const r = typeof options.r === 'number' ? options.r : Math.random();
      if (r < stayProb) {
        voice.roundOctaveShift = currentShift;
        return currentShift;
      }
      voice.roundOctaveShift = 0;
      return 0;
    }
    const p2Ratio =
        typeof voice.twoOctaveRatio === 'number' ? voice.twoOctaveRatio : 0.20;
    const p2 = Math.min(Math.max(0, 1 - p1), p1 * p2Ratio);
    const r = typeof options.r === 'number' ? options.r : Math.random();
    const dirRoll =
        typeof options.dirRoll === 'number' ? options.dirRoll : Math.random();
    const dir = dirRoll < 0.5 ? 1 : -1;
    let nextShift = 0;
    if (r < p2) {
      nextShift = dir > 0 ? 2 : -1;
    } else if (r < p2 + p1) {
      nextShift = 1 * dir;
    } else {
      nextShift = 0;
    }
    nextShift = Math.max(-1, nextShift);
    voice.roundOctaveShift = nextShift;
    return nextShift;
  }

  _evaluateVoiceGate(voice, forcePass = false) {
    const anySolo = this.voices.some(v => v.solo);
    const isMuted = voice.muted || (anySolo && !voice.solo);
    const circadian = this.getEffectiveCircadian();
    const circDensityOffset = (circadian && typeof circadian.densityOffset === 'number') ? circadian.densityOffset : 0;
    const effectiveProb = Math.max(0, Math.min(1, voice.prob + this.densityBias + circDensityOffset));

    const roll = Math.random();
    voice.lastRoll = Number(roll.toFixed(3));
    this.stats.totalRolls++;

    const passed = forcePass || (!isMuted && roll <= effectiveProb);
    let pitchData = null;

    if (passed) {
      const pe = this.phraseEngine || window.enoPhraseEngine || null;
      const panSpread = typeof voice.panSpread === 'number' ? voice.panSpread : 0.40;
      const styleProf = this.audioEngine && this.audioEngine.getTrackStyleProfile ? this.audioEngine.getTrackStyleProfile() : null;
      const genRules = (styleProf && styleProf.generativeRules) || null;
      let pan = (Math.random() * 2 - 1) * panSpread;
      if (genRules && genRules.stereoFixedPans && typeof genRules.stereoFixedPans[voice.id] === 'number') {
        pan = Math.max(-0.85, Math.min(0.85, genRules.stereoFixedPans[voice.id] + (Math.random() - 0.5) * 0.08));
      }
      const velocity = 0.55 + Math.random() * 0.35;
      const roundShift = this.evaluateRoundOctaveShift(voice);

      if (pe && typeof pe.triggerPianoPhrase === 'function' && voice.id === 'piano') {
        const phraseRes = pe.triggerPianoPhrase(
            voice, circadian,
            {forceFull: forcePass, roundOctaveShift: roundShift});
        const freqVal = (window.ENO_DATA && typeof window.ENO_DATA.midiToFreq === 'function')
          ? Number(window.ENO_DATA.midiToFreq(phraseRes.firstMidi).toFixed(2))
          : 440;
        pitchData = {
          midi: phraseRes.firstMidi,
          noteName: phraseRes.firstNoteName,
          phraseName: phraseRes.phraseName,
          freq: freqVal,
          degreeIdx: 0,
          phraseType: phraseRes.phraseType,
          stepCount: phraseRes.stepCount
        };
      } else if (pe && typeof pe.triggerInstrumentChordProgression === 'function' && voice.id === pe.chordProgInstrument && voice.id !== 'piano') {
        const chordRes = pe.triggerInstrumentChordProgression(
            voice, circadian, {roundOctaveShift: roundShift});
        pitchData = {
          midi: chordRes.firstMidi,
          noteName: chordRes.noteName,
          freq: chordRes.freq,
          degreeIdx: chordRes.degreeIdx,
          isChord: true,
          chordNotes: chordRes.midiNotes
        };
      } else {
        if (pe && typeof pe.selectKeyLockedSinglePitch === 'function') {
          pitchData = pe.selectKeyLockedSinglePitch(voice, circadian, this);
        } else {
          pitchData = this._selectPitch(voice, circadian);
        }
        if (this.audioEngine && typeof this.audioEngine.triggerVoice === 'function') {
          this.audioEngine.triggerVoice(voice.id, pitchData.midi, velocity, pan, voice.gain);
          if (genRules && genRules.scripterEchoProb > 0 && voice.id !== 'drone' && Math.random() < genRules.scripterEchoProb) {
            const echoVoice = genRules.scripterEchoVoice || voice.id;
            const echoDelay = genRules.scripterEchoDelayMs || 650;
            const echoDegs = Array.isArray(genRules.scripterEchoDegrees) ? genRules.scripterEchoDegrees : [4, 2];
            const shiftSemitones = (echoDegs.length > 0 ? (echoDegs[Math.floor(Math.random() * echoDegs.length)] * 2) : 7);
            const echoMidi = pitchData.midi + shiftSemitones;
            setTimeout(() => {
              if (this.isRunning && this.audioEngine) {
                this.audioEngine.triggerVoice(echoVoice, echoMidi, velocity * 0.62, -pan * 0.8, voice.gain);
              }
            }, echoDelay);
          }
        }
      }

      voice.lastOutcome = 'PASS';
      voice.lastNote = pitchData.noteName;
      voice.passCount++;
      this.stats.totalPasses++;

      this.noteHistory.unshift(pitchData.degreeIdx);
      if (this.noteHistory.length > 8) this.noteHistory.length = 8;
    } else {
      voice.lastOutcome = 'REST';
      voice.restCount++;
      this.stats.totalRests++;
      const pe = this.phraseEngine || window.enoPhraseEngine || null;
      if (voice.id === 'piano' && pe && typeof pe.onPhraseGateRest === 'function') {
        pe.onPhraseGateRest(roll, effectiveProb);
      }
    }

    const now = new Date();
    const event = {
      id: 'evt_' + Math.random().toString(36).slice(2, 9),
      timeStr: now.toTimeString().split(' ')[0],
      timestamp: now.getTime(),
      voiceId: voice.id,
      voiceName: voice.name,
      badgeHue: voice.badgeHue,
      roll: voice.lastRoll,
      effectiveProb: Number(effectiveProb.toFixed(3)),
      outcome: passed ? 'PASS' : 'REST',
      midi: passed ? pitchData.midi : null,
      noteName: passed ? pitchData.noteName : '—',
      freq: passed ? pitchData.freq : null
    };

    this.eventLog.unshift(event);
    if (this.eventLog.length > 40) this.eventLog.length = 40;
    if (typeof this.onEvent === 'function') this.onEvent(event);

    return passed;
  }

  _selectPitch(voice, circadian) {
    const scales = (window.ENO_DATA && window.ENO_DATA.SCALES) ? window.ENO_DATA.SCALES : {};
    const scale = scales[this.scaleId] || scales.reflection_eb || {
      rootMidi: 51,
      intervals: [0, 2, 4, 6, 7, 9, 11],
      defaultWeights: [0.95, 0.70, 0.55, 0.40, 0.85, 0.60, 0.35]
    };

    const intervals = Array.isArray(scale.intervals) ? scale.intervals : [0, 2, 4, 6, 7, 9, 11];
    const baseWeights = (this.degreeWeights && this.degreeWeights.length === intervals.length)
      ? this.degreeWeights
      : (scale.defaultWeights || intervals.map(() => 0.7));

    const styleProf = this.audioEngine && this.audioEngine.getTrackStyleProfile ? this.audioEngine.getTrackStyleProfile() : null;
    const gravity = styleProf && styleProf.generativeRules && styleProf.generativeRules.markovGravity;

    // Dynamic Markov consonance preference based on noteHistory memory buffer and track style gravity
    const adjWeights = intervals.map((interval, i) => {
      let w = Math.max(0.01, baseWeights[i] !== undefined ? baseWeights[i] : 0.5);
      if (gravity) {
        if (Array.isArray(gravity) && typeof gravity[i % gravity.length] === 'number') {
          w *= gravity[i % gravity.length];
        } else if (typeof gravity === 'object' && typeof gravity[i] === 'number') {
          w *= gravity[i];
        }
      }
      if (this.noteHistory.length > 0 && Math.random() >= this.mutationRate) {
        const lastDegree = this.noteHistory[0];
        const lastInterval = intervals[lastDegree] !== undefined ? intervals[lastDegree] : 0;
        const diff = Math.abs(interval - lastInterval) % 12;

        let consonance = 1.0;
        if (diff === 0) consonance = 1.25;                  // Unison/octave
        else if (diff === 7) consonance = 1.50;             // Perfect fifth
        else if (diff === 5) consonance = 1.35;             // Perfect fourth
        else if (diff === 4 || diff === 3) consonance = 1.40; // Major/Minor third
        else if (diff === 9) consonance = 1.20;             // Major sixth
        else if (diff === 2) consonance = 1.15;             // Major second / ninth
        else if (diff === 1) consonance = 0.25;             // Semitone clash
        else if (diff === 6) consonance = 0.35;             // Tritone clash
        else if (diff === 11) consonance = 0.40;            // Major seventh

        const weightMultiplier = consonance * (1.0 - this.mutationRate) + 1.0 * this.mutationRate;
        w *= weightMultiplier;
      }
      return w;
    });

    const sumW = adjWeights.reduce((acc, curr) => acc + curr, 0);
    let target = Math.random() * sumW;
    let chosenDegree = 0;
    for (let i = 0; i < adjWeights.length; i++) {
      target -= adjWeights[i];
      if (target <= 0) {
        chosenDegree = i;
        break;
      }
    }

    const voiceOctave = typeof voice.octaveOffset === 'number' ? voice.octaveOffset : 0;
    const circOctave = (circadian && typeof circadian.octaveBias === 'number') ? circadian.octaveBias : 0;
    const octShift = typeof voice.roundOctaveShift === 'number' ?
        Math.max(-1, voice.roundOctaveShift) :
        0;

    const totalOctave = voiceOctave + Math.max(-1, circOctave + octShift);
    const root = typeof scale.rootMidi === 'number' ? scale.rootMidi : 51;
    let midi = root + (totalOctave * 12) + (intervals[chosenDegree] || 0);
    midi = Math.max(0, Math.min(127, Math.round(midi)));

    const noteName = (window.ENO_DATA && typeof window.ENO_DATA.midiToNoteName === 'function')
      ? window.ENO_DATA.midiToNoteName(midi)
      : `M${midi}`;

    const freq = (window.ENO_DATA && typeof window.ENO_DATA.midiToFreq === 'function')
      ? Number(window.ENO_DATA.midiToFreq(midi).toFixed(2))
      : Number((440 * Math.pow(2, (midi - 69) / 12)).toFixed(2));

    return { midi, noteName, freq, degreeIdx: chosenDegree };
  }

  triggerVoiceManual(voiceId) {
    const voice = this.voices.find(v => v.id === voiceId);
    if (!voice) return false;
    return this._evaluateVoiceGate(voice, true);
  }

  triggerCanvasBloom(normX, normY) {
    const x = Math.max(0, Math.min(1, typeof normX === 'number' ? normX : 0.5));
    const y = Math.max(0, Math.min(1, typeof normY === 'number' ? normY : 0.5));

    const scales = (window.ENO_DATA && window.ENO_DATA.SCALES) ? window.ENO_DATA.SCALES : {};
    const scale = scales[this.scaleId] || scales.reflection_eb || { rootMidi: 51, intervals: [0, 2, 4, 6, 7, 9, 11] };
    const intervals = scale.intervals || [0, 2, 4, 6, 7, 9, 11];
    const degreeIdx = Math.min(intervals.length - 1, Math.floor(x * intervals.length));

    // Invert Y axis: top canvas = bells/choir high register, bottom canvas = pad/drone bass
    const bloomVoiceIds = ['bell', 'choir', 'piano', 'tape', 'pad', 'drone'];
    const voiceIdx = Math.min(bloomVoiceIds.length - 1, Math.floor(y * bloomVoiceIds.length));
    const voiceId = bloomVoiceIds[voiceIdx];
    const voice = this.voices.find(v => v.id === voiceId) || this.voices[0];

    const voiceOct = (voice && typeof voice.octaveOffset === 'number') ? voice.octaveOffset : 0;
    const octaveSpread = Math.round((1.0 - y) * 3) - 1 + voiceOct;
    const root = typeof scale.rootMidi === 'number' ? scale.rootMidi : 51;
    let midi = root + (octaveSpread * 12) + (intervals[degreeIdx] || 0);
    midi = Math.max(0, Math.min(127, Math.round(midi)));

    const pan = (x * 2 - 1) * 0.70;
    const velocity = 0.65 + Math.random() * 0.25;
    const gain = voice ? voice.gain : 0.75;

    if (this.audioEngine && typeof this.audioEngine.triggerVoice === 'function') {
      this.audioEngine.triggerVoice(voiceId, midi, velocity, pan, gain);
    }

    const noteName = (window.ENO_DATA && typeof window.ENO_DATA.midiToNoteName === 'function')
      ? window.ENO_DATA.midiToNoteName(midi)
      : `M${midi}`;

    const freq = (window.ENO_DATA && typeof window.ENO_DATA.midiToFreq === 'function')
      ? Number(window.ENO_DATA.midiToFreq(midi).toFixed(2))
      : Number((440 * Math.pow(2, (midi - 69) / 12)).toFixed(2));

    this.noteHistory.unshift(degreeIdx);
    if (this.noteHistory.length > 8) this.noteHistory.length = 8;
    this.stats.totalPasses++;

    const now = new Date();
    const event = {
      id: 'bloom_' + Math.random().toString(36).slice(2, 9),
      timeStr: now.toTimeString().split(' ')[0],
      timestamp: now.getTime(),
      voiceId: voice.id,
      voiceName: `${voice.name} (Bloom)`,
      badgeHue: voice.badgeHue,
      roll: 0.0,
      effectiveProb: 1.0,
      outcome: 'BLOOM',
      midi,
      noteName,
      freq,
      normX: Number(x.toFixed(3)),
      normY: Number(y.toFixed(3))
    };

    this.eventLog.unshift(event);
    if (this.eventLog.length > 40) this.eventLog.length = 40;
    if (typeof this.onEvent === 'function') this.onEvent(event);

    return event;
  }

  setScale(scaleId, resetWeights = true) {
    const scales = (window.ENO_DATA && window.ENO_DATA.SCALES) ? window.ENO_DATA.SCALES : {};
    if (scales[scaleId]) {
      this.scaleId = scaleId;
      if (resetWeights) {
        const sc = scales[scaleId];
        this.degreeWeights = Array.isArray(sc.defaultWeights) ? [...sc.defaultWeights] : sc.intervals.map(() => 0.70);
      }
      const pe = this.phraseEngine || window.enoPhraseEngine;
      if (pe && typeof pe.getScale === 'function') {
        pe.scaleId = scaleId;
        if (typeof pe.syncUI === 'function') pe.syncUI();
      }
    }
  }

  setCircadianMode(mode) {
    this.circadianMode = mode;
  }

  setDensityBias(val) {
    this.densityBias = Math.max(-0.50, Math.min(0.50, Number(val) || 0));
  }

  setMutationRate(val) {
    this.mutationRate = Math.max(0.0, Math.min(1.0, Number(val) || 0));
  }

  setTimeStretch(val) {
    this.timeStretch = Math.max(0.25, Math.min(3.0, Number(val) || 1.0));
    this.rotationSpeed = Number((1.0 / this.timeStretch).toFixed(2));
  }

  setRotationSpeed(val) {
    this.rotationSpeed = Math.max(0.15, Math.min(3.5, Number(val) || 1.0));
    this.timeStretch = Number((1.0 / this.rotationSpeed).toFixed(2));
  }

  setActiveVoiceCount(count, voiceOrder = null) {
    const c = Math.max(1, Math.min(6, Math.round(Number(count) || 1)));
    this.activeVoiceCount = c;
    if (Array.isArray(voiceOrder) && voiceOrder.length) {
      this.voiceOrder = [...voiceOrder];
    }
    const activeIds = new Set(this.voiceOrder.slice(0, c));
    for (const v of this.voices) {
      v.muted = !activeIds.has(v.id);
    }
  }

  setGlobalProbability(prob, updateVoices = true) {
    const target = Math.max(0.05, Math.min(1.0, Number(prob) || 0.5));
    const prevAvg = this.voices.reduce((acc, v) => acc + v.prob, 0) / (this.voices.length || 1);
    this.globalProbability = target;
    if (updateVoices) {
      const ratio = prevAvg > 0.02 ? (target / prevAvg) : 1.0;
      for (const v of this.voices) {
        v.prob = Number(Math.max(0.04, Math.min(1.0, prevAvg > 0.02 ? v.prob * ratio : target)).toFixed(2));
      }
    }
  }

  setDegreeWeight(index, weight) {
    if (index >= 0 && index < this.degreeWeights.length) {
      this.degreeWeights[index] = Math.max(0.0, Math.min(1.0, Number(weight) || 0));
    }
  }

  applyCrossfadeToVoices(pianoMult = 1.0, otherMult = 1.0) {
    for (const v of this.voices) {
      v.balanceGain = Number(
          Math.max(0.0, Math.min(1.0, v.id === 'piano' ? pianoMult : otherMult))
              .toFixed(4));
      v.effectiveGain = Number(
          Math.max(0.0, Math.min(5.0, v.gain * v.balanceGain)).toFixed(4));
    }
  }

  setVoiceParam(voiceId, key, val) {
    const voice = this.voices.find(v => v.id === voiceId);
    if (!voice) return;
    if (key === 'prob') voice.prob = Math.max(0.0, Math.min(1.0, Number(val) || 0));
    else if (key === 'cycle') voice.cycle = Math.max(1.5, Math.min(120.0, Number(val) || 15.0));
    else if (key === 'gain') {
      voice.gain =
          Number(Math.max(0.0, Math.min(5.0, Number(val) || 0)).toFixed(4));
      voice.baseGain = voice.gain;
      voice.effectiveGain = Number(
          Math.max(0.0, Math.min(5.0, voice.gain * (voice.balanceGain ?? 1.0)))
              .toFixed(4));
    }
    else if (key === 'release') voice.release = Math.max(0.2, Math.min(20.0, Number(val) || 7.0));
    else if (key === 'cutoff')
      voice.cutoff = Math.max(80, Math.min(16000, Number(val) || 8000));
    else if (key === 'resonance')
      voice.resonance = Math.max(0.1, Math.min(14.0, Number(val) || 1.0));
    else if (key === 'octave' || key === 'octaveOffset') {
      const parsed = Number(val);
      voice.octaveOffset = Math.max(-4, Math.min(4, Math.round(Number.isNaN(parsed) ? 0 : parsed)));
    } else if (key === 'octaveShiftProb' || key === 'octaveShift') {
      voice.octaveShiftProb = Math.max(0, Math.min(1, Number(val)));
      if (voice.octaveShiftProb <= 0) voice.roundOctaveShift = 0;
    } else if (
        key === 'noteOctaveShiftProb' || key === 'noteOctaveShift' ||
        key === 'note-octave-shift') {
      voice.noteOctaveShiftProb = Math.max(0, Math.min(1, Number(val)));
    } else if (
        key === 'chordOctaveShiftProb' || key === 'chordOctaveShift' ||
        key === 'chord-octave-shift') {
      voice.chordOctaveShiftProb = Math.max(0, Math.min(1, Number(val)));
    } else if (key === 'muted') {
      voice.muted = Boolean(val);
      this.activeVoiceCount = this.voices.filter(v => !v.muted).length;
    } else if (key === 'solo')
      voice.solo = Boolean(val);
  }

  computeNonRepeatingHorizon() {
    const speed = Math.max(0.15, Math.min(3.5, this.rotationSpeed || 1.0));
    const activeVoices = this.voices.filter(v => !v.muted);
    if (activeVoices.length <= 1) {
      const singleSec = activeVoices[0] ? (activeVoices[0].cycle / speed).toFixed(1) : '0';
      return `${singleSec}s solo loop cycle`;
    }
    const cyclesTenths = activeVoices.map(v => Math.max(1, Math.round((v.cycle / speed) * 10)));

    function gcd(a, b) {
      while (b) { const t = b; b = a % b; a = t; }
      return a;
    }
    function lcm(a, b) {
      if (!a || !b) return 0;
      return Math.round((a * b) / gcd(a, b));
    }

    const totalTenths = cyclesTenths.reduce((acc, c) => lcm(acc, c), cyclesTenths[0] || 100);
    const totalSec = totalTenths / 10;
    const totalHours = totalSec / 3600;

    if (totalHours >= 87600) {
      const centuries = Math.round(totalHours / 8760).toLocaleString();
      return `~${centuries} years before phase alignment`;
    } else if (totalHours >= 8760) {
      const years = (totalHours / 8760).toFixed(1);
      return `~${years} years before phase alignment`;
    } else if (totalHours >= 24) {
      const days = Math.round(totalHours / 24).toLocaleString();
      return `~${days} days before phase alignment`;
    } else if (totalHours >= 1) {
      return `~${totalHours.toFixed(1)} hours before phase alignment`;
    }
    return `~${Math.round(totalSec / 60)} mins before phase alignment`;
  }
}

if (typeof window !== 'undefined') {
  window.ProbabilityEngine = ProbabilityEngine;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ProbabilityEngine };
}
