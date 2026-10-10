/**
 * Enso Soundscapes — Per-Track Acoustic, Synthesis & Generative Style Profiles
 * Tailors each of the 6 tracks to sound distinctively like its Brian Eno studio
 * method description on the Methods page.
 */
'use strict';

(function() {
const TRACK_STYLE_PROFILES = {
  thursday: {
    id: 'thursday',
    name: 'Sunlit Atrium',
    methodTitle: 'Circadian & Seasonal Generative Rule Shifting',
    pianoEq: { bodyWarmthHz: 265, bodyWarmthGainDb: 2.2, highShelfHz: 2800, highShelfCutDb: -5.5, mechReleaseGain: 0.030, shimmerSend: 0.24, chorusDetuneCents: 3.8, tapeWowHz: 0, tapeWowDepth: 0, feltThumpGain: 0.06 },
    voiceTrim:
        {pad: 1.0, piano: 1.0, bell: 1.0, choir: 1.0, tape: 1.0, drone: 1.0},
    padSynth: { wave1: 'sawtooth', wave2: 'triangle', detuneCents: 6, oscGain: 1.0, subGain: 0.34, fifthGain: 0.24, lydianSharp11Gain: 0, filterMult: 4.2, filterQ: 1.0, glideRatio: 1.0, glideDurationSec: 0 },
    bellSynth: { mod1Ratio: 2.0, mod1Index: 1.35, mod2Ratio: 3.0, mod2Index: 0.48, attackBloomSec: 0.035, carrierGain: 1.0 },
    choirSynth: {
      partials: [
        {type: 'sine', r: 1, det: 0, g: 0.65},
        {type: 'sine', r: 2, det: -4, g: 0.48},
        {type: 'triangle', r: 3, det: 5, g: 0.35},
        {type: 'sine', r: 4, det: -6, g: 0.22},
        {type: 'sine', r: 5, det: 4, g: 0.15}
      ],
      filterMult: 4.5,
      filterQ: 0.85,
      vibratoHz: 0.22,
      vibratoCents: 3.2
    },
    tapeSynth: {
      triGain: 0.78,
      sawGain: 0.24,
      squareGain: 0,
      wowHz: 0.35,
      wowCents: 2.5,
      flutterHz: 3.8,
      flutterCents: 2.0,
      filterHz: 3300,
      filterQ: 0.85
    },
    droneSynth: { rootGain: 0.86, fifthGain: 0.48, octaveGain: 0.30, subOctaveGain: 0.20, filterMult: 3.2, filterQ: 0.75, breathLfoHz: 0.05 },
    shimmerCascade: { baseOctaveGain: 0.26, upperOctaveGain: 0.10, fifthOctaveGain: 0.08, bloomDelaySec: 0.25, tankFeedback: 0.16, detuneCents: 3.5 },
    generativeRules: {
      markovGravity: [0.92, 0.78, 0.72, 0.32, 0.88, 0.62, 0.76],
      scripterEchoProb: 0.14,
      scripterEchoDelayMs: 520,
      scripterEchoDegrees: [4, 2],
      scripterEchoVoice: null,
      stereoFixedPans: null
    }
  },

  reflection: {
    id: 'reflection',
    name: 'Luminous Drift',
    methodTitle: 'Logic Pro X Scripter Probability Gates (with Peter Chilvers)',
    pianoEq: { bodyWarmthHz: 245, bodyWarmthGainDb: 3.0, highShelfHz: 2150, highShelfCutDb: -8.8, mechReleaseGain: 0.036, shimmerSend: 0.18, chorusDetuneCents: 2.2, tapeWowHz: 0, tapeWowDepth: 0, feltThumpGain: 0.10 },
    voiceTrim:
        {pad: 1.0, piano: 1.0, bell: 1.0, choir: 1.0, tape: 1.0, drone: 1.0},
    padSynth: { wave1: 'triangle', wave2: 'sawtooth', detuneCents: 8, oscGain: 0.99, subGain: 0.43, fifthGain: 0.31, lydianSharp11Gain: 0.17, filterMult: 3.0, filterQ: 1.35, glideRatio: 1.0, glideDurationSec: 0 },
    bellSynth: { mod1Ratio: 2.0, mod1Index: 1.10, mod2Ratio: 3.0, mod2Index: 0.42, attackBloomSec: 0.12, carrierGain: 0.992 },
    choirSynth: {
      partials: [
        {type: 'sine', r: 1, det: 0, g: 0.73},
        {type: 'sine', r: 1.498, det: -3, g: 0.355},
        {type: 'sine', r: 2, det: 4, g: 0.44},
        {type: 'triangle', r: 3, det: -5, g: 0.21}
      ],
      filterMult: 3.1,
      filterQ: 1.1,
      vibratoHz: 0.15,
      vibratoCents: 2.5
    },
    tapeSynth: {
      triGain: 0.756,
      sawGain: 0.176,
      squareGain: 0,
      wowHz: 0.28,
      wowCents: 3.2,
      flutterHz: 3.4,
      flutterCents: 2.4,
      filterHz: 2500,
      filterQ: 1.05
    },
    droneSynth: { rootGain: 0.799, fifthGain: 0.486, octaveGain: 0.217, subOctaveGain: 0.278, filterMult: 2.5, filterQ: 0.85, breathLfoHz: 0.04 },
    shimmerCascade: { baseOctaveGain: 0.24, upperOctaveGain: 0.08, fifthOctaveGain: 0.14, bloomDelaySec: 0.35, tankFeedback: 0.18, detuneCents: 4.0 },
    generativeRules: {
      markovGravity: [0.98, 0.86, 0.35, 0.78, 0.92, 0.42, 0.28],
      scripterEchoProb: 0.36,
      scripterEchoDelayMs: 680,
      scripterEchoDegrees: [4, 1, 3],
      scripterEchoVoice: null,
      stereoFixedPans: null
    }
  },

  installations: {
    id: 'installations',
    name: 'Cathedral Glass',
    methodTitle: 'Incommensurable Prime-Length Tape Loops',
    pianoEq: { bodyWarmthHz: 215, bodyWarmthGainDb: 1.2, highShelfHz: 3500, highShelfCutDb: -3.5, mechReleaseGain: 0.022, shimmerSend: 0.30, chorusDetuneCents: 4.8, tapeWowHz: 0.34, tapeWowDepth: 0.0010, feltThumpGain: 0.03 },
    voiceTrim:
        {pad: 1.0, piano: 1.0, bell: 1.0, choir: 1.0, tape: 1.0, drone: 1.0},
    padSynth: { wave1: 'sawtooth', wave2: 'sawtooth', detuneCents: 11, oscGain: 1.18, subGain: 0.35, fifthGain: 0.44, lydianSharp11Gain: 0.16, filterMult: 5.0, filterQ: 1.55, glideRatio: 1.0, glideDurationSec: 0 },
    bellSynth: { mod1Ratio: 3.0, mod1Index: 1.85, mod2Ratio: 4.02, mod2Index: 0.95, attackBloomSec: 0.18, carrierGain: 1.008 },
    choirSynth: {
      partials: [
        {type: 'sine', r: 1, det: 0, g: 0.629},
        {type: 'sine', r: 1.498, det: -4, g: 0.406},
        {type: 'sine', r: 2, det: 4, g: 0.508},
        {type: 'triangle', r: 3, det: -6, g: 0.345},
        {type: 'sine', r: 4, det: 7, g: 0.254},
        {type: 'sine', r: 6, det: -8, g: 0.162}
      ],
      filterMult: 5.4,
      filterQ: 1.2,
      vibratoHz: 0.26,
      vibratoCents: 4.2
    },
    tapeSynth: {
      triGain: 0.583,
      sawGain: 0.377,
      squareGain: 0.103,
      wowHz: 0.48,
      wowCents: 6.2,
      flutterHz: 4.7,
      flutterCents: 5.8,
      filterHz: 2950,
      filterQ: 1.35
    },
    droneSynth: { rootGain: 0.743, fifthGain: 0.531, octaveGain: 0.336, subOctaveGain: 0.301, filterMult: 3.5, filterQ: 0.95, breathLfoHz: 0.06 },
    shimmerCascade: { baseOctaveGain: 0.32, upperOctaveGain: 0.16, fifthOctaveGain: 0.18, bloomDelaySec: 0.32, tankFeedback: 0.22, detuneCents: 5.0 },
    generativeRules: {
      markovGravity: {0: 1.40, 1: 1.32, 3: 1.44, 4: 1.55},
      scripterEchoProb: 0.18,
      scripterEchoDelayMs: 890,
      scripterEchoDegrees: [4, 3],
      scripterEchoVoice: 'bell',
      stereoFixedPans: {
        piano: -0.58,
        bell: 0.68,
        pad: -0.38,
        tape: 0.56,
        choir: -0.72,
        drone: 0.18
      }
    }
  },

  apollo_shimmer: {
    id: 'apollo_shimmer',
    name: 'Weightless Orbit',
    methodTitle: 'The Eno / Lanois Octave-Feedback "Shimmer" Reverb Chain',
    pianoEq: { bodyWarmthHz: 250, bodyWarmthGainDb: 2.8, highShelfHz: 2450, highShelfCutDb: -7.2, mechReleaseGain: 0.028, shimmerSend: 0.46, chorusDetuneCents: 5.2, tapeWowHz: 0.24, tapeWowDepth: 0.0007, feltThumpGain: 0.07 },
    voiceTrim:
        {pad: 1.0, piano: 1.0, bell: 1.0, choir: 1.0, tape: 1.0, drone: 1.0},
    padSynth: { wave1: 'sawtooth', wave2: 'sawtooth', detuneCents: 12, oscGain: 1.09, subGain: 0.54, fifthGain: 0.44, lydianSharp11Gain: 0, filterMult: 3.9, filterQ: 1.45, glideRatio: 0.992, glideDurationSec: 0.52 },
    bellSynth: { mod1Ratio: 2.0, mod1Index: 1.65, mod2Ratio: 3.005, mod2Index: 0.88, attackBloomSec: 0.09, carrierGain: 1.005 },
    choirSynth: {
      partials: [
        {type: 'sine', r: 1, det: 0, g: 0.548},
        {type: 'sine', r: 2, det: -6, g: 0.479},
        {type: 'sine', r: 2, det: 6, g: 0.479},
        {type: 'triangle', r: 3, det: -8, g: 0.342},
        {type: 'sine', r: 4, det: 9, g: 0.291}
      ],
      filterMult: 4.9,
      filterQ: 1.05,
      vibratoHz: 0.32,
      vibratoCents: 5.8
    },
    tapeSynth: {
      triGain: 0.739,
      sawGain: 0.333,
      squareGain: 0,
      wowHz: 0.36,
      wowCents: 4.8,
      flutterHz: 3.9,
      flutterCents: 3.6,
      filterHz: 2800,
      filterQ: 1.3,
      glideRatio: 0.994,
      glideDurationSec: 0.42
    },
    droneSynth: { rootGain: 0.758, fifthGain: 0.447, octaveGain: 0.287, subOctaveGain: 0.399, filterMult: 2.8, filterQ: 1.1, breathLfoHz: 0.045 },
    shimmerCascade: { baseOctaveGain: 0.52, upperOctaveGain: 0.38, fifthOctaveGain: 0.28, bloomDelaySec: 0.55, tankFeedback: 0.28, detuneCents: 6.5 },
    generativeRules: {
      markovGravity: {0: 1.55, 1: 1.42, 2: 1.32, 4: 1.60, 5: 1.35},
      scripterEchoProb: 0.22,
      scripterEchoDelayMs: 940,
      scripterEchoDegrees: [4, 0],
      scripterEchoVoice: 'choir',
      stereoFixedPans: null
    }
  },

  mixing_colours: {
    id: 'mixing_colours',
    name: 'Felt & Mist',
    methodTitle: 'Damped Felt Piano & DX7 FM Glass Miniatures (with Roger Eno)',
    pianoEq: { bodyWarmthHz: 230, bodyWarmthGainDb: 4.8, highShelfHz: 1350, highShelfCutDb: -15.5, mechReleaseGain: 0.085, shimmerSend: 0.05, chorusDetuneCents: 0, tapeWowHz: 0, tapeWowDepth: 0, feltThumpGain: 0.28 },
    voiceTrim:
        {pad: 1.0, piano: 1.0, bell: 1.0, choir: 1.0, tape: 1.0, drone: 1.0},
    padSynth: { wave1: 'triangle', wave2: 'sine', detuneCents: 4, oscGain: 0.83, subGain: 0.22, fifthGain: 0.11, lydianSharp11Gain: 0, filterMult: 2.1, filterQ: 0.8, glideRatio: 1.0, glideDurationSec: 0 },
    bellSynth: { mod1Ratio: 2.76, mod1Index: 2.95, mod2Ratio: 5.41, mod2Index: 1.42, attackBloomSec: 0.006, carrierGain: 1.02 },
    choirSynth: {
      partials: [
        {type: 'sine', r: 1, det: 0, g: 0.878},
        {type: 'sine', r: 2, det: -3, g: 0.317},
        {type: 'triangle', r: 3, det: 3, g: 0.146}
      ],
      filterMult: 2.0,
      filterQ: 0.75,
      vibratoHz: 0.14,
      vibratoCents: 2.0
    },
    tapeSynth: {
      triGain: 0.777,
      sawGain: 0.141,
      squareGain: 0,
      wowHz: 0.42,
      wowCents: 4.8,
      flutterHz: 4.5,
      flutterCents: 4.2,
      filterHz: 1850,
      filterQ: 0.95
    },
    droneSynth: { rootGain: 0.915, fifthGain: 0.354, octaveGain: 0.146, subOctaveGain: 0.250, filterMult: 1.85, filterQ: 0.68, breathLfoHz: 0.04 },
    shimmerCascade: { baseOctaveGain: 0.08, upperOctaveGain: 0.0, fifthOctaveGain: 0.0, bloomDelaySec: 0.20, tankFeedback: 0.08, detuneCents: 2.0 },
    generativeRules: {
      markovGravity: {0: 1.48, 2: 1.55, 4: 1.42, 5: 1.38},
      scripterEchoProb: 0.30,
      scripterEchoDelayMs: 620,
      scripterEchoDegrees: [2, 4],
      scripterEchoVoice: 'bell',
      stereoFixedPans: null
    }
  },

  discreet_loops: {
    id: 'discreet_loops',
    name: 'Moss & Reel',
    methodTitle: 'Pauline Oliveros & Brian Eno: Deep Listening & Attention',
    pianoEq: { bodyWarmthHz: 212, bodyWarmthGainDb: 4.5, highShelfHz: 1420, highShelfCutDb: -14.2, mechReleaseGain: 0.068, shimmerSend: 0.04, chorusDetuneCents: 0, tapeWowHz: 0.58, tapeWowDepth: 0.0042, feltThumpGain: 0.20 },
    voiceTrim:
        {pad: 1.0, piano: 1.0, bell: 1.0, choir: 1.0, tape: 1.0, drone: 1.0},
    padSynth: { wave1: 'sawtooth', wave2: 'triangle', detuneCents: 9, oscGain: 1.005, subGain: 0.48, fifthGain: 0.28, lydianSharp11Gain: 0, filterMult: 2.0, filterQ: 1.85, glideRatio: 1.0, glideDurationSec: 0 },
    bellSynth: { mod1Ratio: 2.76, mod1Index: 1.20, mod2Ratio: 1.41, mod2Index: 0.40, attackBloomSec: 0.05, carrierGain: 0.998 },
    choirSynth: {
      partials: [
        {type: 'sine', r: 1, det: 0, g: 0.823},
        {type: 'triangle', r: 2, det: -6, g: 0.424}
      ],
      filterMult: 1.9,
      filterQ: 1.2,
      vibratoHz: 0.40,
      vibratoCents: 6.2
    },
    tapeSynth: {
      triGain: 0.511,
      sawGain: 0.431,
      squareGain: 0.240,
      wowHz: 0.62,
      wowCents: 12.0,
      flutterHz: 5.4,
      flutterCents: 7.0,
      filterHz: 1380,
      filterQ: 2.70
    },
    droneSynth: { rootGain: 0.673, fifthGain: 0.435, octaveGain: 0.196, subOctaveGain: 0.421, filterMult: 1.75, filterQ: 1.50, breathLfoHz: 0.085 },
    shimmerCascade: { baseOctaveGain: 0.05, upperOctaveGain: 0.0, fifthOctaveGain: 0.0, bloomDelaySec: 0.40, tankFeedback: 0.06, detuneCents: 3.0 },
    generativeRules: {
      markovGravity: {0: 1.58, 2: 1.48, 4: 1.52, 5: 1.38, 6: 1.32},
      scripterEchoProb: 0.32,
      scripterEchoDelayMs: 1220,
      scripterEchoDegrees: [0, 4, 2],
      scripterEchoVoice: 'tape',
      stereoFixedPans: null
    }
  }
};

function getTrackProfile(styleId) {
  return TRACK_STYLE_PROFILES[styleId] || TRACK_STYLE_PROFILES.thursday;
}

function synthesizeTrackVoice(engine, {
  voiceId,
  midiNote,
  freq,
  velocity,
  now,
  tAttackEnd,
  tSustainEnd,
  tReleaseEnd,
  baseGain,
  peakGain,
  envGain,
  shimmerTarget,
  oscs,
  bufferSources,
  internalNodes
}) {
  const ctx = engine.ctx;
  const profile = getTrackProfile(engine.activeTrackStyle);
  const voiceSynthDest = envGain;

  if (voiceId === 'pad') {
    const ps = profile.padSynth;
    const det = ps.detuneCents || 7;
    const startFreq = (ps.glideRatio && ps.glideRatio !== 1.0) ?
        freq * ps.glideRatio :
        freq;
    const s1 = engine._makeOsc(ps.wave1 || 'sawtooth', startFreq, -det, now);
    const s2 = engine._makeOsc(ps.wave2 || 'sawtooth', startFreq, det, now);
    if (startFreq !== freq && ps.glideDurationSec > 0) {
      s1.frequency.exponentialRampToValueAtTime(freq, now + ps.glideDurationSec);
      s2.frequency.exponentialRampToValueAtTime(freq, now + ps.glideDurationSec);
    }
    const oscG = ctx.createGain();
    oscG.gain.value = ps.oscGain ?? 1.0;
    const sub = engine._makeOsc('sine', freq * 0.5, 0, now);
    const subG = ctx.createGain();
    subG.gain.value = ps.subGain ?? 0.4;
    const vFilt = engine._makeFilter(
        'lowpass', Math.min(14000, freq * (ps.filterMult || 3.5)),
        ps.filterQ || 1.2);
    sub.connect(subG);
    subG.connect(vFilt);
    s1.connect(oscG);
    s2.connect(oscG);
    oscG.connect(vFilt);
    oscs.push(s1, s2, sub);
    internalNodes.push(oscG, subG, vFilt);

    if (ps.fifthGain > 0.01) {
      const f5 = engine._makeOsc('sine', freq * 1.4983, 2, now);
      const g5 = ctx.createGain();
      g5.gain.value = ps.fifthGain;
      f5.connect(g5);
      g5.connect(vFilt);
      oscs.push(f5);
      internalNodes.push(g5);
    }
    if (ps.lydianSharp11Gain > 0.01) {
      const f11 = engine._makeOsc('sine', freq * 1.4142, -3, now);
      const g11 = ctx.createGain();
      g11.gain.value = ps.lydianSharp11Gain;
      f11.connect(g11);
      g11.connect(vFilt);
      oscs.push(f11);
      internalNodes.push(g11);
    }
    vFilt.connect(voiceSynthDest);
    return true;
  }

  if (voiceId === 'bell') {
    const bs = profile.bellSynth;
    const carrier = engine._makeOsc('sine', freq, 0, now);
    const carrierG = ctx.createGain();
    carrierG.gain.value = bs.carrierGain ?? 1.0;
    const mod1 = engine._makeOsc('sine', freq * (bs.mod1Ratio || 2.76), 0, now);
    const mod1G = ctx.createGain();
    const peakMod1 = Math.max(1, freq * (bs.mod1Index || 2.2) * velocity);
    if (bs.attackBloomSec > 0.02) {
      mod1G.gain.setValueAtTime(peakMod1 * 0.15, now);
      mod1G.gain.linearRampToValueAtTime(peakMod1, now + bs.attackBloomSec);
      mod1G.gain.exponentialRampToValueAtTime(0.02, tReleaseEnd);
    } else {
      mod1G.gain.setValueAtTime(peakMod1, now);
      mod1G.gain.exponentialRampToValueAtTime(0.02, tReleaseEnd);
    }
    mod1.connect(mod1G);
    mod1G.connect(carrier.frequency);
    oscs.push(carrier, mod1);
    internalNodes.push(carrierG, mod1G);

    if (bs.mod2Ratio && bs.mod2Index > 0.01) {
      const mod2 = engine._makeOsc('sine', freq * bs.mod2Ratio, 3, now);
      const mod2G = ctx.createGain();
      mod2G.gain.setValueAtTime(
          Math.max(1, freq * bs.mod2Index * velocity), now);
      mod2G.gain.exponentialRampToValueAtTime(
          0.01, now + Math.max(0.25, (tReleaseEnd - now) * 0.55));
      mod2.connect(mod2G);
      mod2G.connect(carrier.frequency);
      oscs.push(mod2);
      internalNodes.push(mod2G);
    }
    carrier.connect(carrierG);
    carrierG.connect(voiceSynthDest);
    return true;
  }

  if (voiceId === 'choir') {
    const cs = profile.choirSynth;
    const vFilt = engine._makeFilter(
        'lowpass', Math.min(14000, freq * (cs.filterMult || 3.4)),
        cs.filterQ || 0.9);
    let vibOsc = null, vibG = null;
    if (cs.vibratoHz && cs.vibratoCents) {
      vibOsc = engine._makeOsc('sine', cs.vibratoHz, 0, now);
      vibG = ctx.createGain();
      vibG.gain.value = cs.vibratoCents;
      vibOsc.connect(vibG);
      oscs.push(vibOsc);
      internalNodes.push(vibG);
    }
    for (const sp of (cs.partials || [])) {
      const osc = engine._makeOsc(sp.type, freq * sp.r, sp.det, now);
      const g = ctx.createGain();
      g.gain.value = sp.g;
      if (vibG) vibG.connect(osc.detune);
      osc.connect(g);
      g.connect(vFilt);
      oscs.push(osc);
      internalNodes.push(g);
    }
    vFilt.connect(voiceSynthDest);
    internalNodes.push(vFilt);
    return true;
  }

  if (voiceId === 'tape') {
    const ts = profile.tapeSynth;
    const startFreq = (ts.glideRatio && ts.glideRatio !== 1.0) ?
        freq * ts.glideRatio :
        freq;
    const tri = engine._makeOsc('triangle', startFreq, 0, now);
    const saw = engine._makeOsc('sawtooth', startFreq, 0, now);
    if (startFreq !== freq && ts.glideDurationSec > 0) {
      tri.frequency.exponentialRampToValueAtTime(freq, now + ts.glideDurationSec);
      saw.frequency.exponentialRampToValueAtTime(freq, now + ts.glideDurationSec);
    }
    const triG = ctx.createGain();
    triG.gain.value = ts.triGain ?? 0.75;
    const sawG = ctx.createGain();
    sawG.gain.value = ts.sawGain ?? 0.35;
    tri.connect(triG);
    saw.connect(sawG);

    const wow = engine._makeOsc('sine', ts.wowHz || 0.55, 0, now);
    const wowG = ctx.createGain();
    wowG.gain.value = ts.wowCents || 4.0;
    const flutter = engine._makeOsc('sine', ts.flutterHz || 4.2, 0, now);
    const flutterG = ctx.createGain();
    flutterG.gain.value = ts.flutterCents || 4.5;
    wow.connect(wowG);
    flutter.connect(flutterG);
    [tri, saw].forEach((o) => {
      wowG.connect(o.detune);
      flutterG.connect(o.detune);
    });

    const vFilt = engine._makeFilter(
        'lowpass', ts.filterHz || 2400, ts.filterQ || 0.8);
    triG.connect(vFilt);
    sawG.connect(vFilt);
    oscs.push(tri, saw, wow, flutter);
    internalNodes.push(triG, sawG, wowG, flutterG, vFilt);

    if (ts.squareGain > 0.01) {
      const sq = engine._makeOsc('square', startFreq, -2, now);
      const sqG = ctx.createGain();
      sqG.gain.value = ts.squareGain;
      wowG.connect(sq.detune);
      flutterG.connect(sq.detune);
      sq.connect(sqG);
      sqG.connect(vFilt);
      oscs.push(sq);
      internalNodes.push(sqG);
    }
    vFilt.connect(voiceSynthDest);
    return true;
  }

  if (voiceId === 'drone') {
    const ds = profile.droneSynth;
    const fifthFreq =
        (window.enoPhraseEngine && window.ENO_DATA &&
         typeof window.ENO_DATA.midiToFreq === 'function') ?
        window.ENO_DATA.midiToFreq(
            window.enoPhraseEngine.getDiatonicFifthMidi(midiNote)) :
        freq * 1.4983;
    const osc1 = engine._makeOsc('sine', freq, 0, now);
    const osc5 = engine._makeOsc('sine', fifthFreq, 0, now);
    const osc8 = engine._makeOsc('sine', freq * 2, 0, now);
    const g1 = ctx.createGain();
    g1.gain.value = ds.rootGain ?? 0.88;
    const g5 = ctx.createGain();
    g5.gain.value = ds.fifthGain ?? 0.42;
    const g8 = ctx.createGain();
    g8.gain.value = ds.octaveGain ?? 0.24;
    osc1.connect(g1);
    osc5.connect(g5);
    osc8.connect(g8);

    const vFilt = engine._makeFilter(
        'lowpass', Math.min(11000, freq * (ds.filterMult || 2.8)),
        ds.filterQ || 0.7);
    g1.connect(vFilt);
    g5.connect(vFilt);
    g8.connect(vFilt);
    oscs.push(osc1, osc5, osc8);
    internalNodes.push(g1, g5, g8, vFilt);

    if (ds.subOctaveGain > 0.01 && freq * 0.5 >= 24) {
      const subOsc = engine._makeOsc('triangle', freq * 0.5, 0, now);
      const subG = ctx.createGain();
      subG.gain.value = ds.subOctaveGain;
      subOsc.connect(subG);
      subG.connect(vFilt);
      oscs.push(subOsc);
      internalNodes.push(subG);
    }
    vFilt.connect(voiceSynthDest);
    return true;
  }

  return false;
}

function attachToAudioEngine(AE) {
  if (!AE || !AE.prototype) return;
  AE.prototype.getTrackStyleProfile = function(styleId) {
    return getTrackProfile(styleId || this.activeTrackStyle || 'thursday');
  };
  AE.prototype.setTrackStyle = function(styleId) {
    const prof = getTrackProfile(styleId);
    this.activeTrackStyle = prof.id;
    return prof;
  };
  AE.prototype._synthesizeTrackVoice = function(opts) {
    return synthesizeTrackVoice(this, opts);
  };
}

function verifyTrackStylesDistinctive() {
  const ids = Object.keys(TRACK_STYLE_PROFILES);
  if (ids.length < 6) return {ok: false, reason: 'fewer than 6 profiles'};
  const shelfSet = new Set(ids.map((k) => TRACK_STYLE_PROFILES[k].pianoEq.highShelfCutDb));
  const bellSet = new Set(ids.map((k) => `${TRACK_STYLE_PROFILES[k].bellSynth.mod1Ratio}:${TRACK_STYLE_PROFILES[k].bellSynth.mod2Ratio}:${TRACK_STYLE_PROFILES[k].bellSynth.mod1Index}`));
  const tapeSet = new Set(ids.map((k) => `${TRACK_STYLE_PROFILES[k].tapeSynth.filterHz}:${TRACK_STYLE_PROFILES[k].tapeSynth.wowCents}`));
  const pats = window.ENO_PHRASE_PATTERNS || {};
  const phraseDelaySet = new Set(ids.map((k) => {
    const p = pats[k]?.phrases?.longer_pattern?.primarySteps || [];
    return p.map((st) => st.delayMs).join(',');
  }));
  const chordRollSet = new Set(ids.map((k) => pats[k]?.chordRollMs || 0));
  const cards = (window.ENO_DATA && window.ENO_DATA.RESEARCH_CARDS) || [];
  const methodsText = JSON.stringify(cards).toLowerCase();
  const domResearch = (document.getElementById('tab-research')?.textContent || '').toLowerCase();
  const methodsNoSalamander = !methodsText.includes('salamander') && !domResearch.includes('salamander');
  return {
    ok: shelfSet.size === 6 && bellSet.size === 6 && tapeSet.size === 6 &&
        phraseDelaySet.size === 6 && chordRollSet.size === 6 && methodsNoSalamander,
    distinctPianoShelves: shelfSet.size,
    distinctBellConfigs: bellSet.size,
    distinctTapeConfigs: tapeSet.size,
    distinctPhraseCadences: phraseDelaySet.size,
    distinctChordRolls: chordRollSet.size,
    methodsNoSalamander
  };
}

if (typeof window !== 'undefined') {
  window.EnsoTrackStyles = {
    TRACK_STYLE_PROFILES,
    getTrackProfile,
    synthesizeTrackVoice,
    attachToAudioEngine,
    verifyTrackStylesDistinctive
  };
  if (window.AudioEngine) attachToAudioEngine(window.AudioEngine);
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    TRACK_STYLE_PROFILES,
    getTrackProfile,
    synthesizeTrackVoice,
    attachToAudioEngine,
    verifyTrackStylesDistinctive
  };
}
})();
