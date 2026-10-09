/**
 * Brian Eno Soundscape Generator — Presets, Musical Scales & Research Context
 */
'use strict';

const ENO_DATA = (function() {
  const NOTE_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

  const CIRCLE_OF_FIFTHS_ORDER = [
    'thursday', 'reflection', 'installations', 'apollo_shimmer',
    'mixing_colours', 'discreet_loops'
  ];

  const SCALES = {
    thursday_g: {
      id: 'thursday_g',
      name: 'G Mixolydian Pastoral (Sunlit Atrium)',
      album: 'Sunlit Atrium',
      tonic: 'G',
      modeName: 'Mixolydian',
      parentKeySignature: 'C Major (0♯/0♭)',
      keySigFifths: 0,
      keyLabel: 'G Mixolydian',
      rootMidi: 55,
      circleStepToNext: 'P4 tonic (G → C) · 6/7 shared notes (F → F♯)',
      intervals: [0, 2, 4, 5, 7, 9, 10],
      degreeNames: [
        'Root (1)', 'Maj 2nd (9)', 'Maj 3rd', 'Perf 4th', 'Perfect 5th',
        'Maj 6th (13)', 'Min 7th (b7)'
      ],
      defaultWeights: [0.90, 0.75, 0.60, 0.30, 0.80, 0.50, 0.40],
      description:
          'Sunlit pastoral G Mixolydian (parent C Major 0♯/0♭) with a softened flat-seventh evoking endless warm light.'
    },
    reflection_eb: {
      id: 'reflection_eb',
      name: 'C Lydian Suspended (Luminous Drift)',
      album: 'Luminous Drift',
      tonic: 'C',
      modeName: 'Lydian',
      parentKeySignature: 'G Major (1♯)',
      keySigFifths: 1,
      keyLabel: 'C Lydian',
      rootMidi: 48,
      circleStepToNext: 'P4 tonic (C → F) · 6/7 shared notes (F♯ → F♮)',
      intervals: [0, 2, 4, 6, 7, 9, 11],
      degreeNames: [
        'Root (1)', 'Maj 2nd (9)', 'Maj 3rd', 'Aug 4th (#11)', 'Perfect 5th',
        'Maj 6th (13)', 'Maj 7th'
      ],
      defaultWeights: [0.98, 0.86, 0.42, 0.78, 0.92, 0.48, 0.32],
      description:
          'Luminous C Lydian mode (parent G Major 1♯) with an elevated #11 avoiding tonic cadence closure.'
    },
    lux_a: {
      id: 'lux_a',
      name: 'F Lydian Hexatonic (Cathedral Glass)',
      album: 'Cathedral Glass',
      tonic: 'F',
      modeName: 'Lydian',
      parentKeySignature: 'C Major (0♯/0♭)',
      keySigFifths: 0,
      keyLabel: 'F Lydian',
      rootMidi: 53,
      circleStepToNext: 'P5 tonic (F → C) · 7/7 shared notes (Relative Mode)',
      intervals: [0, 2, 4, 6, 7, 9, 11],
      degreeNames: [
        'Root (1)', 'Maj 2nd (9)', 'Maj 3rd', 'Aug 4th (#11)', 'Perfect 5th',
        'Maj 6th (13)', 'Maj 7th'
      ],
      defaultWeights: [0.85, 0.75, 0.70, 0.50, 0.90, 0.60, 0.35],
      description:
          'Airy, crystalline F Lydian architecture (parent C Major 0♯/0♭) built for long gallery and cathedral reverberation.'
    },
    airports_db: {
      id: 'airports_db',
      name: 'C Major Pentatonic 9th (Weightless Orbit)',
      album: 'Weightless Orbit',
      tonic: 'C',
      modeName: 'Major (Ionian)',
      parentKeySignature: 'C Major (0♯/0♭)',
      keySigFifths: 0,
      keyLabel: 'C Major',
      rootMidi: 48,
      circleStepToNext: 'P5 tonic (C → G) · 6/7 shared notes (B♮ → B♭)',
      intervals: [0, 2, 4, 5, 7, 9, 11],
      degreeNames: [
        'Root (1)', 'Maj 2nd (9)', 'Maj 3rd', 'Perf 4th (11)', 'Perfect 5th',
        'Maj 6th (13)', 'Maj 7th'
      ],
      defaultWeights: [0.90, 0.82, 0.65, 0.20, 0.85, 0.70, 0.30],
      description:
          'Peaceful, unhurried C Major landscape (0♯/0♭, relative to F Lydian) evoking acoustic piano and vocal cluster tape loops.'
    },
    mixing_c: {
      id: 'mixing_c',
      name: 'G Dorian Felt (Felt & Mist)',
      album: 'Felt & Mist',
      tonic: 'G',
      modeName: 'Dorian',
      parentKeySignature: 'F Major (1♭)',
      keySigFifths: -1,
      keyLabel: 'G Dorian',
      rootMidi: 55,
      circleStepToNext: 'P5 tonic (G → D) · 7/7 shared notes (Relative Mode)',
      intervals: [0, 2, 3, 5, 7, 9, 10],
      degreeNames: [
        'Root (1)', 'Maj 2nd (9)', 'Min 3rd (b3)', 'Perf 4th (11)',
        'Perfect 5th', 'Maj 6th (13)', 'Min 7th (b7)'
      ],
      defaultWeights: [0.95, 0.70, 0.80, 0.35, 0.85, 0.65, 0.45],
      description:
          'Poignant, reflective G Dorian modal palette (parent F Major 1♭) layered with damped felt piano tone.'
    },
    onland_f: {
      id: 'onland_f',
      name: 'D Aeolian Dark (Moss & Reel)',
      album: 'Moss & Reel',
      tonic: 'D',
      modeName: 'Aeolian',
      parentKeySignature: 'F Major (1♭)',
      keySigFifths: -1,
      keyLabel: 'D Aeolian',
      rootMidi: 50,
      circleStepToNext: 'P4 tonic (D → G) · 6/7 shared notes (B♭ → B♮)',
      intervals: [0, 2, 3, 5, 7, 8, 10],
      degreeNames: [
        'Root (1)', 'Maj 2nd (9)', 'Min 3rd (b3)', 'Perf 4th', 'Perfect 5th',
        'Min 6th (b6)', 'Min 7th (b7)'
      ],
      defaultWeights: [0.90, 0.50, 0.75, 0.45, 0.80, 0.60, 0.40],
      description:
          'Shadowed D Aeolian natural minor (parent F Major 1♭, relative to G Dorian) evoking rural earth and damp moss.'
    }
  };

  const VOICES = [
    {
      id: 'pad',
      name: 'CS-80 Ribbon Pad',
      role: 'Warm detuned saw/triangle swell',
      badgeHue: 'blue',
      octaveOffset: 0,
      defaultOctave: 0,
      defaultPrimeCycle: 17.3,
      defaultProb: 0.74,
      defaultGain: 0.72,
      defaultCutoff: 5200,
      defaultResonance: 1.2,
      panSpread: 0.35,
      defaultRelease: 8.5,
      defaultOctaveShiftProb: 0.10,
      defaultNoteOctaveShiftProb: 0.03,
      defaultChordOctaveShiftProb: 0.10
    },
    {
      id: 'piano',
      name: 'Felt Piano',
      role: 'Damped Felt Piano + Shimmer',
      badgeHue: 'teal',
      octaveOffset: 0,
      defaultOctave: 0,
      defaultPrimeCycle: 7.9,
      defaultProb: 0.62,
      defaultGain: 2.00,
      defaultCutoff: 12000,
      defaultResonance: 0.8,
      panSpread: 0.45,
      defaultRelease: 4.5,
      defaultOctaveShiftProb: 0.10,
      defaultNoteOctaveShiftProb: 0.03,
      defaultChordOctaveShiftProb: 0.10
    },
    {
      id: 'bell',
      name: 'DX7 Glass Bell',
      role: 'FM crystalline chime (Chilvers/Lanois patch)',
      badgeHue: 'purple',
      octaveOffset: 1,
      defaultOctave: 1,
      defaultPrimeCycle: 11.3,
      defaultProb: 0.46,
      defaultGain: 0.54,
      defaultCutoff: 9500,
      defaultResonance: 1.4,
      panSpread: 0.65,
      defaultRelease: 5.2,
      defaultOctaveShiftProb: 0.10,
      defaultNoteOctaveShiftProb: 0.03,
      defaultChordOctaveShiftProb: 0.10
    },
    {
      id: 'choir',
      name: 'Spectral Choir',
      role: 'Staggered additive harmonic bloom',
      badgeHue: 'green',
      octaveOffset: 1,
      defaultOctave: 1,
      defaultPrimeCycle: 23.9,
      defaultProb: 0.52,
      defaultGain: 0.60,
      defaultCutoff: 6400,
      defaultResonance: 1.2,
      panSpread: 0.50,
      defaultRelease: 9.5,
      defaultOctaveShiftProb: 0.10,
      defaultNoteOctaveShiftProb: 0.03,
      defaultChordOctaveShiftProb: 0.10
    },
    {
      id: 'tape',
      name: 'Revox Tape Loop',
      role: 'Varispeed sound-on-sound fragment',
      badgeHue: 'orange',
      octaveOffset: 0,
      defaultOctave: 0,
      defaultPrimeCycle: 13.7,
      defaultProb: 0.60,
      defaultGain: 0.64,
      defaultCutoff: 4200,
      defaultResonance: 1.6,
      panSpread: 0.40,
      defaultRelease: 6.2,
      defaultOctaveShiftProb: 0.10,
      defaultNoteOctaveShiftProb: 0.03,
      defaultChordOctaveShiftProb: 0.10
    },
    {
      id: 'drone',
      name: 'Sub-Bass Pedal',
      role: 'Deep foundational root + fifth anchor',
      badgeHue: 'yellow',
      octaveOffset: -1,
      defaultOctave: -1,
      defaultPrimeCycle: 31.1,
      defaultProb: 0.82,
      defaultGain: 0.70,
      defaultCutoff: 1800,
      defaultResonance: 1.8,
      panSpread: 0.15,
      defaultRelease: 11.0,
      defaultOctaveShiftProb: 0.10,
      defaultNoteOctaveShiftProb: 0.03,
      defaultChordOctaveShiftProb: 0.10
    }
  ];

  const CIRCADIAN_MODES = {
    off: { id: 'off', name: 'Circadian Off', description: 'Static time-invariant generation', octaveBias: 0, cutoffMultiplier: 1.0, densityOffset: 0, attackMultiplier: 1.0, releaseMultiplier: 1.0, shimmerBoost: 0 },
    auto: { id: 'auto', name: 'Realtime Circadian (Auto)', description: 'Diurnal cycle tracking local sun position', octaveBias: 'auto', cutoffMultiplier: 1.0, densityOffset: 0, attackMultiplier: 1.0, releaseMultiplier: 1.0, shimmerBoost: 0 },
    morning: { id: 'morning', name: 'Morning (06:00 - 12:00)', description: 'Bright, high octave bias, crisp open filters and brisk swells', octaveBias: 1, cutoffMultiplier: 1.35, densityOffset: 0.08, attackMultiplier: 0.75, releaseMultiplier: 0.85, shimmerBoost: 0.12 },
    afternoon: { id: 'afternoon', name: 'Afternoon (12:00 - 18:00)', description: 'Pastoral steady warmth, centered octave and balanced density', octaveBias: 0, cutoffMultiplier: 1.0, densityOffset: 0, attackMultiplier: 1.0, releaseMultiplier: 1.0, shimmerBoost: 0 },
    evening: { id: 'evening', name: 'Evening (18:00 - 23:00)', description: 'Warm twilight softening, elongated tails and rich shimmer', octaveBias: 0, cutoffMultiplier: 0.82, densityOffset: -0.06, attackMultiplier: 1.35, releaseMultiplier: 1.30, shimmerBoost: 0.15 },
    night: { id: 'night', name: 'Night / Deep Rest (23:00 - 06:00)', description: 'Subterranean bass bias, lowpass veil, sparse nocturnal spacing', octaveBias: -1, cutoffMultiplier: 0.58, densityOffset: -0.18, attackMultiplier: 1.65, releaseMultiplier: 1.60, shimmerBoost: 0.05 }
  };

  const PRESETS = {
    thursday: {
      id: 'thursday',
      name: 'Sunlit Atrium',
      year: '1985',
      album: 'Sunlit Atrium',
      badgeHue: 'teal',
      summary:
          'Warm afternoon soundscape in G Mixolydian (parent C Major 0♯/0♭) with treated piano and shimmering tails.',
      scale: 'thursday_g',
      keyLabel: 'G Mixolydian',
      parentKeySignature: 'C Major (0♯/0♭)',
      tonic: 'G',
      circleStepToNext: 'P4 tonic (G → C) · 6/7 shared notes (F → F♯)',
      pianoPhraseType: 'longer_pattern',
      pianoPhraseName: 'Sunlit Canopy Cascade',
      chordProgInstrument: 'choir',
      noteOctaveShiftChance: 0.03,
      chordOctaveShiftChance: 0.10,
      phraseLengthLfo:
          {enabled: true, periodSec: 180, minRatio: 0.50, maxRatio: 1.00},
      circadian: 'off',
      auroraPalette: 'thursday',
      global: {
        attack: 3.2,
        release: 7.0,
        sustain: 0.70,
        envelopeMode: 'override',
        cutoff: 2200,
        resonance: 1.1,
        filterType: 'lowpass',
        filterDrift: 0.20,
        reverbMix: 0.50,
        reverbDecay: 9.5,
        reverbShimmer: 0.14,
        reverbDamping: 6200,
        delayMix: 0.38,
        delayTime: 0.82,
        delayFeedback: 0.58,
        delayWow: 0.18,
        masterVolume: 0.84,
        pianoCrossfade: -0.62
      },
      phraseParams: {
        chordProgCycle: 10.7,
        chordProgGate: 0.87,
        phraseCompletionGate: 0.18,
        phraseGateProb: 0.76,
        phraseLoopCycle: 6.7,
        phraseNoteGate: 0.22,
        phraseSkipChance: 0.15,
        phraseVariationChance: 0.55,
        noteOctaveShiftChance: 0.03,
        chordOctaveShiftChance: 0.10
      },
      probability: {
        activeVoiceCount: 6,
        rotationSpeed: 0.90,
        globalProb: 0.58,
        voiceOrder: ['pad', 'piano', 'bell', 'choir', 'tape', 'drone'],
        densityBias: 0.05,
        mutationRate: 0.10,
        timeStretch: 1.11,
        degreeWeights: [0.90, 0.75, 0.60, 0.30, 0.80, 0.50, 0.40]
      },
      voices: {
        pad: { prob: 0.68, cycle: 19.1, gain: 0.65, release: 8.0, octave: 0, octaveShiftProb: 0.10, muted: false },
        piano: { prob: 0.76, cycle: 6.7, gain: 2.00, release: 4.2, octave: 0, octaveShiftProb: 0.10, muted: false },
        bell: { prob: 0.40, cycle: 13.1, gain: 0.50, release: 4.8, octave: 1, octaveShiftProb: 0.10, muted: false },
        choir: { prob: 0.92, cycle: 10.7, gain: 0.56, release: 9.2, octave: 1, octaveShiftProb: 0.10, muted: false },
        tape: { prob: 0.50, cycle: 17.9, gain: 0.58, release: 5.8, octave: 0, octaveShiftProb: 0.10, muted: false },
        drone: { prob: 0.70, cycle: 37.3, gain: 0.62, release: 10.5, octave: -1, octaveShiftProb: 0.10, muted: false }
      }
    },
    reflection: {
      id: 'reflection',
      name: 'Luminous Drift',
      year: '2017',
      album: 'Luminous Drift',
      badgeHue: 'blue',
      summary:
          'Endless generative ambient piece using Logic Pro Scripter probability gates in C Lydian (parent G Major 1♯).',
      scale: 'reflection_eb',
      keyLabel: 'C Lydian',
      parentKeySignature: 'G Major (1♯)',
      tonic: 'C',
      circleStepToNext: 'P4 tonic (C → F) · 6/7 shared notes (F♯ → F♮)',
      pianoPhraseType: 'chord_progression',
      pianoPhraseName: 'Lydian Glass Progression',
      chordProgInstrument: 'piano',
      noteOctaveShiftChance: 0.03,
      chordOctaveShiftChance: 0.10,
      circadian: 'auto',
      auroraPalette: 'reflection',
      global: {
        attack: 4.8,
        release: 8.5,
        sustain: 0.70,
        envelopeMode: 'override',
        cutoff: 1850,
        resonance: 1.4,
        filterType: 'lowpass',
        filterDrift: 0.35,
        reverbMix: 0.58,
        reverbDecay: 12.0,
        reverbShimmer: 0.22,
        reverbDamping: 5200,
        delayMix: 0.32,
        delayTime: 0.68,
        delayFeedback: 0.52,
        delayWow: 0.25,
        masterVolume: 0.84,
        pianoCrossfade: -0.62
      },
      probability: {
        activeVoiceCount: 6,
        rotationSpeed: 1.00,
        globalProb: 0.63,
        voiceOrder: ['pad', 'piano', 'bell', 'choir', 'tape', 'drone'],
        densityBias: 0.0,
        mutationRate: 0.15,
        timeStretch: 1.0,
        degreeWeights: [0.98, 0.86, 0.42, 0.78, 0.92, 0.48, 0.32]
      },
      voices: {
        pad: { prob: 0.74, cycle: 17.3, gain: 0.72, release: 9.5, octave: 0, octaveShiftProb: 0.10, muted: false },
        piano: { prob: 0.62, cycle: 7.9, gain: 2.00, release: 4.8, octave: 0, octaveShiftProb: 0.10, muted: false },
        bell: { prob: 0.46, cycle: 11.3, gain: 0.54, release: 5.5, octave: 1, octaveShiftProb: 0.10, muted: false },
        choir: { prob: 0.52, cycle: 23.9, gain: 0.60, release: 10.5, octave: 1, octaveShiftProb: 0.10, muted: false },
        tape: { prob: 0.60, cycle: 13.7, gain: 0.64, release: 6.5, octave: 0, octaveShiftProb: 0.10, muted: false },
        drone: { prob: 0.82, cycle: 31.1, gain: 0.70, release: 12.0, octave: -1, octaveShiftProb: 0.10, muted: false }
      }
    },
    installations: {
      id: 'installations',
      name: 'Cathedral Glass',
      year: '2018',
      album: 'Cathedral Glass',
      badgeHue: 'purple',
      summary:
          'Asynchronous architectural generative sound environments in F Lydian (parent C Major 0♯/0♭) with long prime phase drift.',
      scale: 'lux_a',
      keyLabel: 'F Lydian',
      parentKeySignature: 'C Major (0♯/0♭)',
      tonic: 'F',
      circleStepToNext: 'P5 tonic (F → C) · 7/7 shared notes (Relative Mode)',
      pianoPhraseType: 'chord_progression',
      pianoPhraseName: 'Cathedral Vespers Chords',
      chordProgInstrument: 'piano',
      noteOctaveShiftChance: 0.03,
      chordOctaveShiftChance: 0.10,
      circadian: 'evening',
      auroraPalette: 'installations',
      global: {
        attack: 6.0,
        release: 11.5,
        sustain: 0.75,
        envelopeMode: 'override',
        cutoff: 1600,
        resonance: 1.8,
        filterType: 'lowpass',
        filterDrift: 0.45,
        reverbMix: 0.90,
        reverbDecay: 16.5,
        reverbShimmer: 0.42,
        reverbDamping: 4800,
        delayMix: 0.34,
        delayTime: 0.89,
        delayFeedback: 0.52,
        delayWow: 0.38,
        masterVolume: 0.78,
        pianoCrossfade: -0.62
      },
      probability: {
        activeVoiceCount: 6,
        rotationSpeed: 0.80,
        globalProb: 0.66,
        voiceOrder: ['pad', 'piano', 'bell', 'choir', 'tape', 'drone'],
        densityBias: -0.10,
        mutationRate: 0.22,
        timeStretch: 1.25,
        degreeWeights: [0.85, 0.75, 0.70, 0.50, 0.90, 0.60, 0.35]
      },
      voices: {
        pad: { prob: 0.78, cycle: 23.9, gain: 0.75, release: 12.0, octave: 0, octaveShiftProb: 0.10, muted: false },
        piano: { prob: 0.68, cycle: 11.3, gain: 2.00, release: 6.0, octave: 0, octaveShiftProb: 0.10, muted: false },
        bell: { prob: 0.58, cycle: 7.9, gain: 0.60, release: 7.2, octave: 1, octaveShiftProb: 0.10, muted: false },
        choir: { prob: 0.66, cycle: 31.1, gain: 0.70, release: 13.5, octave: 1, octaveShiftProb: 0.10, muted: false },
        tape: { prob: 0.62, cycle: 17.3, gain: 0.68, release: 8.5, octave: 0, octaveShiftProb: 0.10, muted: false },
        drone: { prob: 0.88, cycle: 43.1, gain: 0.75, release: 15.0, octave: -1, octaveShiftProb: 0.10, muted: false }
      }
    },
    apollo_shimmer: {
      id: 'apollo_shimmer',
      name: 'Weightless Orbit',
      year: '1983',
      album: 'Weightless Orbit',
      badgeHue: 'orange',
      summary:
          'Iconic pitch-shifted octave feedback reverb in C Major (0♯/0♭, relative to F Lydian) creating floating zero-gravity majesty.',
      scale: 'airports_db',
      keyLabel: 'C Major',
      parentKeySignature: 'C Major (0♯/0♭)',
      tonic: 'C',
      circleStepToNext: 'P5 tonic (C → G) · 6/7 shared notes (B♮ → B♭)',
      pianoPhraseType: 'longer_pattern',
      pianoPhraseName: 'Tranquility Base Sequence',
      chordProgInstrument: 'pad',
      noteOctaveShiftChance: 0.03,
      chordOctaveShiftChance: 0.10,
      circadian: 'night',
      auroraPalette: 'apollo_shimmer',
      global: {
        attack: 5.5,
        release: 12.0,
        sustain: 0.80,
        envelopeMode: 'override',
        cutoff: 2400,
        resonance: 1.5,
        filterType: 'lowpass',
        filterDrift: 0.30,
        reverbMix: 0.92,
        reverbDecay: 17.5,
        reverbShimmer: 0.94,
        reverbDamping: 6800,
        delayMix: 0.48,
        delayTime: 0.82,
        delayFeedback: 0.68,
        delayWow: 0.24,
        masterVolume: 0.76,
        pianoCrossfade: -0.62
      },
      probability: {
        activeVoiceCount: 6,
        rotationSpeed: 0.74,
        globalProb: 0.68,
        voiceOrder: ['pad', 'piano', 'bell', 'choir', 'tape', 'drone'],
        densityBias: -0.15,
        mutationRate: 0.18,
        timeStretch: 1.35,
        degreeWeights: [0.90, 0.82, 0.65, 0.20, 0.85, 0.70, 0.30]
      },
      voices: {
        pad: { prob: 0.82, cycle: 21.1, gain: 0.78, release: 12.5, octave: 0, octaveShiftProb: 0.10, muted: false },
        piano: { prob: 0.72, cycle: 8.9, gain: 2.00, release: 5.8, octave: 0, octaveShiftProb: 0.10, muted: false },
        bell: { prob: 0.65, cycle: 14.9, gain: 0.62, release: 7.5, octave: 1, octaveShiftProb: 0.10, muted: false },
        choir: { prob: 0.70, cycle: 27.7, gain: 0.72, release: 14.0, octave: 1, octaveShiftProb: 0.10, muted: false },
        tape: { prob: 0.58, cycle: 16.3, gain: 0.60, release: 8.0, octave: 0, octaveShiftProb: 0.10, muted: false },
        drone: { prob: 0.85, cycle: 37.9, gain: 0.74, release: 15.5, octave: -1, octaveShiftProb: 0.10, muted: false }
      }
    },
    mixing_colours: {
      id: 'mixing_colours',
      name: 'Felt & Mist',
      year: '2020',
      album: 'Felt & Mist',
      badgeHue: 'green',
      summary:
          'Intimate felt piano miniatures in G Dorian (parent F Major 1♭) bathed in subtle modular electronics and tape flutter.',
      scale: 'mixing_c',
      keyLabel: 'G Dorian',
      parentKeySignature: 'F Major (1♭)',
      tonic: 'G',
      circleStepToNext: 'P5 tonic (G → D) · 7/7 shared notes (Relative Mode)',
      pianoPhraseType: 'short_motif',
      pianoPhraseName: 'Winter Bell Cell',
      chordProgInstrument: 'pad',
      noteOctaveShiftChance: 0.03,
      chordOctaveShiftChance: 0.10,
      circadian: 'off',
      auroraPalette: 'mixing_colours',
      global: {
        attack: 2.8,
        release: 6.5,
        sustain: 0.60,
        envelopeMode: 'override',
        cutoff: 2400,
        resonance: 1.2,
        filterType: 'lowpass',
        filterDrift: 0.25,
        reverbMix: 0.36,
        reverbDecay: 6.2,
        reverbShimmer: 0.08,
        reverbDamping: 4200,
        delayMix: 0.16,
        delayTime: 0.52,
        delayFeedback: 0.28,
        delayWow: 0.12,
        masterVolume: 0.84,
        pianoCrossfade: -0.62
      },
      probability: {
        activeVoiceCount: 6,
        rotationSpeed: 1.05,
        globalProb: 0.60,
        voiceOrder: ['pad', 'piano', 'bell', 'choir', 'tape', 'drone'],
        densityBias: 0.08,
        mutationRate: 0.08,
        timeStretch: 0.95,
        degreeWeights: [0.95, 0.70, 0.80, 0.35, 0.85, 0.65, 0.45]
      },
      voices: {
        pad: { prob: 0.55, cycle: 13.9, gain: 0.60, release: 7.2, octave: 0, octaveShiftProb: 0.10, muted: false },
        piano: { prob: 0.88, cycle: 5.3, gain: 2.00, release: 3.8, octave: 0, octaveShiftProb: 0.10, muted: false },
        bell: { prob: 0.35, cycle: 11.3, gain: 0.45, release: 4.2, octave: 1, octaveShiftProb: 0.10, muted: false },
        choir: { prob: 0.42, cycle: 23.1, gain: 0.52, release: 8.0, octave: 1, octaveShiftProb: 0.10, muted: false },
        tape: { prob: 0.72, cycle: 9.7, gain: 0.70, release: 5.2, octave: 0, octaveShiftProb: 0.10, muted: false },
        drone: { prob: 0.65, cycle: 29.3, gain: 0.62, release: 9.0, octave: -1, octaveShiftProb: 0.10, muted: false }
      }
    },
    discreet_loops: {
      id: 'discreet_loops',
      name: 'Moss & Reel',
      year: '1975',
      album: 'Moss & Reel',
      badgeHue: 'yellow',
      summary:
          'Hypnotic 4-voice twin-Revox tape loop machine in D Aeolian (parent F Major 1♭) with faster rotation and resonant tape echo.',
      scale: 'onland_f',
      keyLabel: 'D Aeolian',
      parentKeySignature: 'F Major (1♭)',
      tonic: 'D',
      circleStepToNext: 'P4 tonic (D → G) · 6/7 shared notes (B♭ → B♮)',
      pianoPhraseType: 'short_motif',
      pianoPhraseName: 'Discreet Tape Fragment',
      chordProgInstrument: 'tape',
      noteOctaveShiftChance: 0.03,
      chordOctaveShiftChance: 0.10,
      circadian: 'morning',
      auroraPalette: 'discreet_loops',
      global: {
        attack: 1.4,
        release: 5.8,
        sustain: 0.60,
        envelopeMode: 'override',
        cutoff: 1950,
        resonance: 3.2,
        filterType: 'lowpass',
        filterDrift: 0.45,
        reverbMix: 0.58,
        reverbDecay: 9.8,
        reverbShimmer: 0.12,
        reverbDamping: 3200,
        delayMix: 0.72,
        delayTime: 1.22,
        delayFeedback: 0.82,
        delayWow: 0.64,
        masterVolume: 0.87,
        pianoCrossfade: -0.62
      },
      phraseParams: {
        chordProgCycle: 8.9,
        chordProgGate: 0.84,
        phraseCompletionGate: 0.18,
        phraseGateProb: 0.97,
        phraseLoopCycle: 11.7,
        phraseNoteGate: 0.22,
        phraseSkipChance: 0.15,
        phraseVariationChance: 0.55,
        noteOctaveShiftChance: 0.03,
        chordOctaveShiftChance: 0.10
      },
      probability: {
        activeVoiceCount: 4,
        rotationSpeed: 1.55,
        globalProb: 0.70,
        voiceOrder: ['tape', 'drone', 'pad', 'piano', 'bell', 'choir'],
        densityBias: 0.08,
        mutationRate: 0.12,
        timeStretch: 0.65,
        degreeWeights: [0.90, 0.50, 0.75, 0.45, 0.85, 0.60, 0.40]
      },
      voices: {
        pad: { prob: 0.66, cycle: 13.7, gain: 0.64, release: 7.9, octave: 0, octaveShiftProb: 0.10, muted: false },
        piano: { prob: 0.97, cycle: 11.7, gain: 2.00, release: 3.6, octave: 0, octaveShiftProb: 0.10, muted: false },
        bell: { prob: 0.45, cycle: 11.3, gain: 0.48, release: 0.2, octave: 1, octaveShiftProb: 0.10, muted: true },
        choir: { prob: 0.48, cycle: 23.9, gain: 0.56, release: 7.5, octave: 1, octaveShiftProb: 0.10, muted: true },
        tape: { prob: 0.84, cycle: 8.9, gain: 0.86, release: 8.0, octave: 0, octaveShiftProb: 0.10, muted: false },
        drone: { prob: 0.74, cycle: 19.3, gain: 0.74, release: 9.5, octave: -1, octaveShiftProb: 0.10, muted: false }
      }
    }
  };

  const RESEARCH_CARDS = [
    {
      id: 'reflection_scripter',
      title: 'Logic Pro X Scripter Probability Gates (with Peter Chilvers)',
      subtitle: 'Algorithmic state machines powering Luminous Drift',
      era: '2017 - Present',
      badge: 'Luminous Drift',
      badgeHue: 'blue',
      presetId: 'reflection',
      bullets: [
        { lead: 'Logic Pro X Scripter', body: 'Eno and Chilvers authored custom JavaScript Scripter MIDI plugins in Logic to govern note choice, intervals, and conditional rest probabilities.' },
        { lead: 'Autonomous Variation', body: 'Rather than uniform randomness, rules specify weighted Markovian transitions where notes gravitate towards 1st, 5th, and 9th scale degrees.' },
        { lead: 'Indefinite Playback', body: 'The generative system compiles music in realtime, never repeating identical phrasing across centuries of execution.' }
      ]
    },
    {
      id: 'circadian_rules',
      title: 'Circadian & Seasonal Generative Rule Shifting',
      subtitle: 'Living acoustic environments responding to diurnal cycles',
      era: '1985 - Present',
      badge: 'Sunlit Atrium',
      badgeHue: 'teal',
      presetId: 'thursday',
      bullets: [
        { lead: 'Diurnal Harmonics', body: 'Morning rules elevate octaves and filter cutoffs; evening regimes slow attack times and enrich octave-up shimmer reverb.' },
        { lead: 'Nocturnal Sub-Pedals', body: 'Night modes dampen treble above 1 kHz and favor foundational bass pedal drones for unforced passive listening.' },
        { lead: 'Calendar Modulation', body: 'Long-term installations modulate scale intervals according to solstices and equinoxes, merging architecture with astronomical cycles.' }
      ]
    },
    {
      id: 'prime_loops',
      title: 'Incommensurable Prime-Length Tape Loops',
      subtitle: 'Asynchronous prime loop periods that phase without repeating',
      era: '1975 - 2018',
      badge: 'Cathedral Glass',
      badgeHue: 'purple',
      presetId: 'installations',
      bullets: [
        { lead: 'Non-Repeating Phasing', body: 'Loops cut to mutually prime durations (e.g. 7.9s, 11.3s, 17.3s, 23.9s, 31.1s) require tens of thousands of years before exact coincident alignment.' },
        { lead: 'Physical Tape Paths', body: 'In 1978, tape loops were physically strung around the control room on microphone stands, giving each loop tactile flutter.' },
        { lead: 'Generative Simplicity', body: 'A handful of simple monophonic phrases generate endlessly complex, ever-shifting vertical counterpoint through asynchronous replay.' }
      ]
    },
    {
      id: 'shimmer_chain',
      title: 'The Eno / Lanois Octave-Feedback "Shimmer" Reverb Chain',
      subtitle: 'AMS Neve / Eventide pitch transposer looped into Lexicon plate',
      era: '1983 - Present',
      badge: 'Weightless Orbit',
      badgeHue: 'orange',
      presetId: 'apollo_shimmer',
      bullets: [
        { lead: 'Feedback Loop Topology', body: 'Reverb sends routed into an Eventide H910 or AMS 15-80S pitch-shifted +12 semitones, then fed back into the reverb tank input.' },
        { lead: 'Orchestral String Bloom', body: 'Single notes blossom into ethereal, angelic choir-like overtones that hover weightlessly behind the dry fundamental.' },
        { lead: 'Damping & Wow Control', body: 'Subtle high-frequency damping and tape wow/flutter prevent high-register runaway, keeping the shimmer lush and atmospheric.' }
      ]
    },
    {
      id: 'mixing_colours_felt',
      trackId: 'mixing_colours',
      trackName: 'Felt & Mist',
      title: 'Damped Felt Piano & DX7 FM Glass Miniatures (with Roger Eno)',
      subtitle: 'Intimate celeste-rail wool felt damping paired with Yamaha DX7 non-integer FM chimes',
      icon: 'piano',
      era: '2020',
      badge: 'Felt & Mist',
      badgeHue: 'green',
      presetId: 'mixing_colours',
      bullets: [
        { lead: 'Celeste-Rail Wool Felt Damping', body: 'Interposing a strip of soft wool felt between hammers and strings absorbs upper-partial strike transients while preserving intimate close-mic’d keybed and damper release mechanics.' },
        { lead: '230 Hz Soundboard Body & 1.35 kHz Silk Cut', body: 'A +4.8 dB low-mid soundboard resonance boost at 230 Hz paired with a -15.5 dB high-shelf roll-off above 1.35 kHz produces the warm, woody intimacy of Mixing Colours (2020).' },
        { lead: 'Yamaha DX7 Non-Integer FM Glass Chimes', body: 'Pairs the close-mic’d felt piano with custom FM synthesis patches using non-integer carrier-to-modulator ratios (1:2.76 and 1:5.41) for crystalline, bell-like upper partials.' },
        { lead: 'Minimalist Chamber Proximity', body: 'Shorter 6.2s chamber reverb decay and restrained 36% wet mix keep the felt hammer strike and breathy harmonic bloom right in front of the listener.' }
      ],
      citation: 'Ref: Roger Eno & Brian Eno, Mixing Colours (Deutsche Grammophon, 2020); Brian Eno DX7 Patch Archives.'
    },
    {
      id: 'deep_listening',
      title: 'Pauline Oliveros & Brian Eno: Deep Listening & Attention',
      subtitle: 'Acoustic presence: focal attention vs. global ambient awareness',
      era: '1975 - Present',
      badge: 'Moss & Reel',
      badgeHue: 'yellow',
      presetId: 'discreet_loops',
      bullets: [
        { lead: 'Ignorable as it is Interesting', body: 'Eno defined Ambient music in 1978 as music that can accommodate many levels of listening attention without enforcing one.' },
        { lead: 'Oliveros Sonic Meditation', body: 'Pauline Oliveros distinguished between hearing (unconscious) and listening (conscious), fostering environmental resonance.' },
        { lead: 'Non-Invasive Sound Art', body: 'The generative soundscape tints the acoustic room environment rather than commanding the listener to pause and observe.' }
      ]
    }
  ];

  function midiToNoteName(midi) {
    if (typeof midi !== 'number' || isNaN(midi)) return 'C4';
    const noteIndex = ((Math.round(midi) % 12) + 12) % 12;
    const octave = Math.floor(Math.round(midi) / 12) - 1;
    return `${NOTE_NAMES[noteIndex]}${octave}`;
  }

  function midiToFreq(midi) {
    if (typeof midi !== 'number' || isNaN(midi)) return 440;
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  return {
    CIRCLE_OF_FIFTHS_ORDER,
    SCALES,
    VOICES,
    CIRCADIAN_MODES,
    PRESETS,
    RESEARCH_CARDS,
    midiToNoteName,
    midiToFreq
  };
})();

if (typeof window !== 'undefined') window.ENO_DATA = ENO_DATA;
if (typeof module !== 'undefined' && module.exports) module.exports = ENO_DATA;
