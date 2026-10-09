/**
 * Brian & Roger Eno Piano Phrase System, Per-Track Key Locking,
 * and Single-Instrument Chord Progression Engine.
 */
'use strict';

const setBgTimer = (fn, ms) => (window.EnsoPwaMedia?.setBgTimeout ? window.EnsoPwaMedia.setBgTimeout(fn, ms) : setTimeout(fn, ms));
const clearBgTimer = (id) => (window.EnsoPwaMedia?.clearBgTimeout ? window.EnsoPwaMedia.clearBgTimeout(id) : clearTimeout(id));

class PhraseEngine {
  constructor(audioEngine, probEngine) {
    this.audioEngine = audioEngine || null;
    this.probEngine = probEngine || null;

    this.activePresetId = 'thursday'; this.scaleId = 'thursday_g';
    this.pianoPhraseType = 'longer_pattern'; this.chordProgInstrument = 'choir';
    this.pianoCycleCount = 0; this.activeStepIndex = 0; this.chordStepIndex = 0;
    this.currentChord = null; this.lastPhraseVariant = 'primary'; this.phraseTimers = [];

    // Aleatoric Phrase Chance Mechanics & Gate/Loop parameters
    this.phraseVariationChance = 0.55; this.phraseSkipChance = 0.15;
    this.phraseNoteGate = 0.22; this.phraseCompletionGate = 0.18;
    this.phraseGateProb = 0.82; this.phraseLoopCycle = 7.9;
    this.chordProgGate = 0.74; this.chordProgCycle = 17.3;
    this.noteOctaveShiftChance = 0.03; this.noteOctaveShiftedCount = 0;
    this.chordOctaveShiftChance = 0.10; this.chordOctaveShiftedCount = 0; this.lastChordOctaveShift = 0;

    this.skippedPhraseCount = 0; this.truncatedPhraseCount = 0; this.omittedNotesTotal = 0;
    this.lastStartOnlyDice = null; this.lastPhraseOutcome = 'full_phrase'; this.lastStepStates = [];
    this.lfoStartTimeMs = Date.now();
    this.lastLfoState = { enabled: true, periodSec: 180, minRatio: 0.50, maxRatio: 1.00, elapsedSec: 0, phase: 0, wave: 1.0, lengthRatio: 1.0, curtailedLength: 8 };

    this.TRACK_PATTERNS = this._initTrackPatterns();

    if (typeof window !== 'undefined') {
      window.enoPhraseEngine = this;
    }
  }

  _initTrackPatterns() {
    const s = (d, o, del, v, l) => ({ degrees: d, octaves: o, delayMs: del, vel: v, label: l });
    const c = (d, o, del, v, r, l) => ({ degrees: d, octaves: o, delayMs: del, vel: v, rollMs: r, label: l });
    const p = (name, typeLabel, desc, pSteps, vSteps) => ({ name, typeLabel, description: desc, primarySteps: pSteps, variantSteps: vSteps });

    return {
      thursday: {
        presetId: 'thursday', scaleId: 'thursday_g', keyLabel: 'G Mixolydian', defaultPianoPhraseType: 'longer_pattern',
        defaultChordProgInstrument: 'choir', melodicFallbackType: 'longer_pattern', altChordInstrument: 'choir',
        phraseLengthLfo: { enabled: true, periodSec: 180, minRatio: 0.50, maxRatio: 1.00 },
        defaultVariationChance: 0.55, defaultSkipChance: 0.15, defaultNoteGate: 0.22, defaultCompletionGate: 0.18, defaultNoteOctaveShiftChance: 0.03, defaultChordOctaveShiftChance: 0.10,
        trackChords: [{ numeral: 'I', name: 'G', degrees: [0, 2, 4, 6], octaves: [0, 0, 0, 0] }, { numeral: '♭VII', name: 'F', degrees: [6, 1, 3, 5], octaves: [-1, 0, 0, 0] }, { numeral: 'IV', name: 'C', degrees: [3, 5, 0, 2], octaves: [0, 0, 1, 1] }, { numeral: 'v7', name: 'Dm7', degrees: [4, 6, 1, 3], octaves: [0, 0, 1, 1] }],
        phrases: {
          short_motif: p('Atrium Drop Cell', 'Short motif', 'Delicate 4-note falling motif in pastoral G Mixolydian.', [s([4],[1],0,0.72,'D5'), s([2],[1],620,0.65,'B4'), s([1],[1],1200,0.62,'A4'), s([0],[1],1840,0.70,'G4')], [s([6],[1],0,0.68,'F5'), s([4],[1],580,0.64,'D5'), s([2],[1],1160,0.60,'B4'), s([0],[1],1780,0.72,'G4')]),
          chord_progression: p('Mixolydian Sunlit Chords', 'Chord progression', 'Open spaced triads alternating between G, F, and C in pastoral afternoon light.', [c([0,2,4],[0,0,0],0,0.75,34,'G'), c([6,1,3],[-1,0,0],1240,0.70,36,'F'), c([3,5,0],[0,0,1],2480,0.72,38,'C'), c([4,6,1],[0,0,1],3720,0.68,35,'Dm')], [c([0,4,1],[0,0,1],0,0.72,35,'Gsus2'), c([6,1,3],[-1,0,0],1260,0.68,38,'F'), c([3,0,2],[0,1,1],2500,0.70,36,'C'), c([0,2,4],[0,0,0],3760,0.74,34,'G')]),
          longer_pattern: p('Sunlit Canopy Cascade', 'Longer pattern', '8-note cascading Harold Budd arpeggiated piano phrase with pedal point.', [s([0,4],[0,1],0,0.78,'G4+D5'), s([2],[1],440,0.66,'B5'), s([1],[1],880,0.62,'A5'), s([4],[1],1320,0.70,'D5'), s([6],[0],1760,0.60,'F5'), s([5],[0],2200,0.64,'E5'), s([2],[0],2640,0.58,'B4'), s([0],[1],3080,0.72,'G5')], [s([0,4],[0,1],0,0.76,'G4+D5'), s([1],[1],420,0.65,'A5'), s([2],[1],840,0.68,'B5'), s([6],[1],1260,0.62,'F6'), s([4],[1],1680,0.70,'D5'), s([3],[0],2100,0.58,'C5'), s([1],[0],2520,0.60,'A4'), s([0],[1],2980,0.74,'G5')])
        }
      },
      reflection: {
        presetId: 'reflection', scaleId: 'reflection_eb', keyLabel: 'C Lydian',
        defaultPianoPhraseType: 'chord_progression', defaultChordProgInstrument: 'piano',
        melodicFallbackType: 'short_motif', altChordInstrument: 'pad',
        defaultVariationChance: 0.55, defaultSkipChance: 0.15, defaultNoteGate: 0.22, defaultCompletionGate: 0.18, defaultNoteOctaveShiftChance: 0.03, defaultChordOctaveShiftChance: 0.10,
        trackChords: [{ numeral: 'Imaj7', name: 'Cmaj7', degrees: [0, 2, 4, 6], octaves: [0, 0, 0, 0] }, { numeral: 'II7', name: 'D7', degrees: [1, 3, 5, 0], octaves: [0, 0, 0, 1] }, { numeral: 'vii7', name: 'Bm7', degrees: [6, 1, 3, 5], octaves: [-1, 0, 0, 0] }, { numeral: 'Imaj7#11', name: 'Cmaj7(#11)', degrees: [0, 3, 4, 6], octaves: [0, 0, 0, 0] }],
        phrases: {
          short_motif: p('Luminous Cell', 'Short motif', 'Intimate modal chime in C Lydian gravitating to the elevated #11 and 9th.', [s([0],[1],0,0.72,'C4'), s([3],[1],580,0.65,'F#4'), s([4],[1],1120,0.68,'G4'), s([1],[1],1740,0.60,'D4')], [s([0],[1],0,0.70,'C4'), s([3],[1],540,0.66,'F#4'), s([6],[1],1080,0.64,'B4'), s([4],[1],1680,0.58,'G4')]),
          chord_progression: p('Lydian Glass Progression', 'Chord progression', 'Lush 4-voice Roger Eno style modal chords moving across Cmaj7, D7, Bm7, and Cmaj7(#11).', [c([0,2,4,6],[0,0,0,0],0,0.76,36,'Cmaj7'), c([1,3,5,0],[0,0,0,1],1180,0.72,38,'D7'), c([6,1,3,5],[-1,0,0,0],2360,0.68,40,'Bm7'), c([0,3,4,6],[0,0,0,0],3540,0.74,35,'Cmaj7(#11)')], [c([0,2,4,1],[0,0,0,1],0,0.74,38,'Cadd9'), c([1,3,5,0],[0,0,0,1],1220,0.70,36,'D7'), c([5,0,2,4],[-1,0,0,0],2400,0.66,42,'Am7'), c([0,3,4,6],[0,0,0,0],3600,0.72,35,'Cmaj7(#11)')]),
          longer_pattern: p('Luminous Arch Phrase', 'Longer pattern', '8-step descending and ascending C Lydian arc hovering around root and fifth.', [s([0,4],[0,1],0,0.75,'C3+G4'), s([3],[1],460,0.62,'F#4'), s([2],[1],920,0.66,'E4'), s([1],[1],1380,0.64,'D4'), s([0],[1],1840,0.70,'C4'), s([6],[0],2300,0.60,'B3'), s([4],[0],2760,0.65,'G3'), s([1],[1],3220,0.58,'D4')], [s([0,4],[0,1],0,0.72,'C3+G4'), s([6],[1],440,0.60,'B4'), s([3],[1],880,0.64,'F#4'), s([2],[1],1320,0.62,'E4'), s([1],[1],1760,0.68,'D4'), s([4],[1],2200,0.60,'G4'), s([3],[1],2640,0.58,'F#4'), s([0],[1],3100,0.70,'C4')])
        }
      },
      installations: {
        presetId: 'installations', scaleId: 'lux_a', keyLabel: 'F Lydian', defaultPianoPhraseType: 'chord_progression',
        defaultChordProgInstrument: 'piano', melodicFallbackType: 'longer_pattern', altChordInstrument: 'pad',
        defaultVariationChance: 0.58, defaultSkipChance: 0.16, defaultNoteGate: 0.24, defaultCompletionGate: 0.18, defaultNoteOctaveShiftChance: 0.03, defaultChordOctaveShiftChance: 0.10,
        trackChords: [{ numeral: 'Imaj9', name: 'Fmaj9', degrees: [0, 2, 4, 1], octaves: [0, 0, 0, 1] }, { numeral: 'II', name: 'G', degrees: [1, 3, 5, 0], octaves: [0, 0, 0, 1] }, { numeral: 'vi', name: 'Dm', degrees: [5, 0, 2, 4], octaves: [-1, 0, 0, 0] }, { numeral: 'V', name: 'C', degrees: [4, 6, 1, 3], octaves: [0, 0, 1, 1] }],
        phrases: {
          short_motif: p('Cathedral Bell Cell', 'Short motif', 'Ascending high-register chime motif in sparkling F Lydian.', [s([0],[1],0,0.74,'F4'), s([2],[1],540,0.66,'A4'), s([3],[1],1080,0.68,'B4'), s([4],[1],1660,0.62,'C5')], [s([4],[1],0,0.70,'C5'), s([3],[1],520,0.68,'B4'), s([1],[1],1040,0.64,'G4'), s([0],[1],1620,0.72,'F4')]),
          chord_progression: p('Cathedral Vespers Chords', 'Chord progression', 'Slow expansive F Lydian chords with lush 9th and #11 overtone suspensions.', [c([0,2,4,1],[0,0,0,1],0,0.78,38,'Fmaj9'), c([1,3,5,0],[0,0,0,1],1300,0.72,40,'G'), c([5,0,2,4],[-1,0,0,0],2600,0.68,36,'Dm'), c([4,6,1,3],[0,0,1,1],3900,0.74,35,'C')], [c([0,3,4,1],[0,0,0,1],0,0.76,38,'Fmaj9(#11)'), c([1,3,5,0],[0,0,0,1],1320,0.70,40,'G'), c([5,0,2,1],[-1,0,0,0],2640,0.66,36,'Dmadd4'), c([0,2,4,6],[0,0,0,0],3960,0.74,34,'Fmaj7')]),
          longer_pattern: p('Gallery Horizon Pattern', 'Longer pattern', '8-step airy F Lydian sequence echoing through high cathedral vaults.', [s([0],[1],0,0.75,'F4'), s([1],[1],450,0.62,'G4'), s([3],[1],900,0.66,'B4'), s([4],[1],1350,0.70,'C5'), s([6],[1],1800,0.64,'E5'), s([4],[1],2250,0.68,'C5'), s([2],[1],2700,0.60,'A4'), s([0],[1],3150,0.72,'F4')], [s([0],[1],0,0.74,'F4'), s([4],[1],440,0.68,'C5'), s([3],[1],880,0.65,'B4'), s([2],[1],1320,0.62,'A4'), s([1],[1],1760,0.66,'G4'), s([0],[1],2200,0.70,'F4'), s([6],[0],2640,0.58,'E4'), s([4],[0],3080,0.64,'C4')])
        }
      },
      apollo_shimmer: {
        presetId: 'apollo_shimmer', scaleId: 'airports_db', keyLabel: 'C Major', defaultPianoPhraseType: 'longer_pattern',
        defaultChordProgInstrument: 'pad', melodicFallbackType: 'longer_pattern', altChordInstrument: 'pad',
        defaultVariationChance: 0.60, defaultSkipChance: 0.16, defaultNoteGate: 0.24, defaultCompletionGate: 0.20, defaultNoteOctaveShiftChance: 0.03, defaultChordOctaveShiftChance: 0.10,
        trackChords: [{ numeral: 'Imaj7', name: 'Cmaj7', degrees: [0, 2, 4, 6], octaves: [0, 0, 0, 0] }, { numeral: 'vi7', name: 'Am7', degrees: [5, 0, 2, 4], octaves: [-1, 0, 0, 0] }, { numeral: 'IVmaj7', name: 'Fmaj7', degrees: [3, 5, 0, 2], octaves: [0, 0, 1, 1] }, { numeral: 'V7', name: 'G7', degrees: [4, 6, 1, 3], octaves: [0, 0, 1, 1] }],
        phrases: {
          short_motif: p('Lunar Horizon Cell', 'Short motif', 'Sparse high-altitude piano motif in C Major floating above deep zero-gravity drone.', [s([4],[1],0,0.74,'G4'), s([1],[1],620,0.64,'D4'), s([2],[1],1240,0.68,'E4'), s([0],[1],1900,0.76,'C4')], [s([6],[1],0,0.70,'B4'), s([4],[1],580,0.66,'G4'), s([1],[1],1180,0.62,'D4'), s([0],[1],1820,0.74,'C4')]),
          chord_progression: p('Weightless Floating Chords', 'Chord progression', 'Expansive C Major-seventh chords blossoming into octave-shifted shimmer reverb.', [c([0,2,4,6],[0,0,0,0],0,0.78,38,'Cmaj7'), c([5,0,2,4],[-1,0,0,0],1350,0.70,40,'Am7'), c([3,5,0,2],[0,0,1,1],2700,0.72,36,'Fmaj7'), c([4,6,1,3],[0,0,1,1],4050,0.68,35,'G7')], [c([0,2,4,1],[0,0,0,1],0,0.76,38,'Cadd9'), c([5,0,2,4],[-1,0,0,0],1380,0.68,40,'Am7'), c([3,5,1,2],[0,0,1,1],2740,0.70,36,'Fadd9'), c([0,2,4,6],[0,0,0,0],4100,0.75,34,'Cmaj7')]),
          longer_pattern: p('Tranquility Base Sequence', 'Longer pattern', '8-step weightless Roger Eno piano phrase ascending in slow orbital arc.', [s([0,4],[0,1],0,0.78,'C3+G4'), s([1],[1],460,0.64,'D4'), s([2],[1],920,0.68,'E4'), s([4],[1],1380,0.72,'G4'), s([5],[1],1840,0.66,'A4'), s([4],[1],2300,0.70,'G4'), s([2],[1],2760,0.62,'E4'), s([0],[1],3220,0.76,'C4')], [s([0,4],[0,1],0,0.76,'C3+G4'), s([6],[1],440,0.62,'B4'), s([5],[1],880,0.68,'A4'), s([4],[1],1320,0.70,'G4'), s([2],[1],1760,0.64,'E4'), s([1],[1],2200,0.60,'D4'), s([2],[1],2640,0.66,'E4'), s([0],[1],3100,0.74,'C4')])
        }
      },
      mixing_colours: {
        presetId: 'mixing_colours', scaleId: 'mixing_c', keyLabel: 'G Dorian', defaultPianoPhraseType: 'short_motif',
        defaultChordProgInstrument: 'pad', melodicFallbackType: 'short_motif', altChordInstrument: 'pad',
        defaultVariationChance: 0.52, defaultSkipChance: 0.14, defaultNoteGate: 0.20, defaultCompletionGate: 0.18, defaultNoteOctaveShiftChance: 0.03, defaultChordOctaveShiftChance: 0.10,
        trackChords: [{ numeral: 'i7', name: 'Gm7', degrees: [0, 2, 4, 6], octaves: [0, 0, 0, 0] }, { numeral: 'IV7', name: 'C7', degrees: [3, 5, 0, 2], octaves: [0, 0, 1, 1] }, { numeral: '♭VII', name: 'F', degrees: [6, 1, 3, 5], octaves: [-1, 0, 0, 0] }, { numeral: 'v7', name: 'Dm7', degrees: [4, 6, 1, 3], octaves: [0, 0, 1, 1] }],
        phrases: {
          short_motif: p('Winter Bell Cell', 'Short motif', '4-note minimalist felt piano miniature in nostalgic G Dorian.', [s([0],[1],0,0.78,'G4'), s([2],[1],540,0.68,'B♭4'), s([1],[1],1100,0.62,'A4'), s([4],[0],1720,0.74,'D4')], [s([0],[1],0,0.75,'G4'), s([6],[0],520,0.64,'F4'), s([2],[1],1080,0.66,'B♭4'), s([1],[1],1680,0.70,'A4')]),
          chord_progression: p('Dorian Felt Chords', 'Chord progression', 'Intimate felt piano minor chords softly rolling across Gm7, C7, F, and Dm7.', [c([0,2,4,6],[0,0,0,0],0,0.76,36,'Gm7'), c([3,5,0,2],[0,0,1,1],1150,0.70,38,'C7'), c([6,1,3,5],[-1,0,0,0],2300,0.68,35,'F'), c([4,6,1,3],[0,0,1,1],3450,0.72,36,'Dm7')], [c([0,2,4,1],[0,0,0,1],0,0.74,36,'Gm9'), c([3,5,0,2],[0,0,1,1],1180,0.68,38,'C7'), c([6,1,3,0],[-1,0,0,1],2360,0.66,35,'Fadd9'), c([0,2,4,6],[0,0,0,0],3500,0.74,36,'Gm7')]),
          longer_pattern: p('Mist & Memory Sequence', 'Longer pattern', '7-step contemplative G Dorian melody drifting through cold acoustic space.', [s([0],[1],0,0.76,'G4'), s([1],[1],480,0.64,'A4'), s([2],[1],960,0.70,'B♭4'), s([4],[1],1440,0.72,'D5'), s([3],[1],1920,0.66,'C5'), s([1],[1],2400,0.60,'A4'), s([0],[1],2880,0.74,'G4')], [s([4],[0],0,0.72,'D4'), s([0],[1],460,0.74,'G4'), s([1],[1],920,0.62,'A4'), s([2],[1],1380,0.68,'B♭4'), s([5],[1],1840,0.65,'E5'), s([4],[1],2300,0.70,'D5'), s([2],[1],2780,0.66,'B♭4')])
        }
      },
      discreet_loops: {
        presetId: 'discreet_loops', scaleId: 'onland_f', keyLabel: 'D Aeolian', defaultPianoPhraseType: 'short_motif',
        defaultChordProgInstrument: 'tape', melodicFallbackType: 'short_motif', altChordInstrument: 'tape',
        defaultVariationChance: 0.55, defaultSkipChance: 0.15, defaultNoteGate: 0.22, defaultCompletionGate: 0.18, defaultNoteOctaveShiftChance: 0.03, defaultChordOctaveShiftChance: 0.10,
        trackChords: [{ numeral: 'i7', name: 'Dm7', degrees: [0, 2, 4, 6], octaves: [0, 0, 0, 0] }, { numeral: '♭VI', name: 'B♭', degrees: [5, 0, 2, 4], octaves: [-1, 0, 0, 0] }, { numeral: '♭III', name: 'F', degrees: [2, 4, 6, 1], octaves: [0, 0, 0, 1] }, { numeral: '♭VII', name: 'C', degrees: [6, 1, 3, 5], octaves: [-1, 0, 0, 0] }],
        phrases: {
          short_motif: p('Discreet Tape Fragment', 'Short motif', '4-note haunted minor fragment modeled on 1975 tape-delayed felt piano in D Aeolian.', [s([0],[1],0,0.76,'D4'), s([2],[1],520,0.66,'F4'), s([4],[1],1040,0.70,'A4'), s([1],[1],1620,0.62,'E4')], [s([0],[1],0,0.74,'D4'), s([5],[0],500,0.64,'B♭3'), s([2],[1],1020,0.68,'F4'), s([4],[1],1580,0.72,'A4')]),
          chord_progression: p('Moss & Tape Chords', 'Chord progression', 'Somber resonant natural minor triads in D Aeolian looping through revox tape heads.', [c([0,2,4,6],[0,0,0,0],0,0.76,36,'Dm7'), c([5,0,2,4],[-1,0,0,0],1180,0.70,38,'B♭'), c([2,4,6,1],[0,0,0,1],2360,0.68,35,'F'), c([6,1,3,5],[-1,0,0,0],3540,0.72,36,'C')], [c([0,2,4,1],[0,0,0,1],0,0.74,36,'Dm9'), c([5,0,2,4],[-1,0,0,0],1200,0.68,38,'B♭'), c([2,4,6,0],[0,0,0,1],2400,0.66,35,'Fmaj7'), c([0,2,4,6],[0,0,0,0],3600,0.74,36,'Dm7')]),
          longer_pattern: p('Earth & Overgrowth Arc', 'Longer pattern', '7-step dark D Aeolian sequence echoing across rustic ambient tape loops.', [s([0],[1],0,0.76,'D4'), s([1],[1],460,0.62,'E4'), s([2],[1],920,0.68,'F4'), s([4],[1],1380,0.72,'A4'), s([3],[1],1840,0.64,'G4'), s([1],[1],2300,0.60,'E4'), s([0],[1],2760,0.74,'D4')], [s([4],[0],0,0.70,'A3'), s([0],[1],440,0.74,'D4'), s([2],[1],880,0.66,'F4'), s([5],[1],1320,0.62,'B♭4'), s([4],[1],1760,0.70,'A4'), s([2],[1],2200,0.65,'F4'), s([0],[1],2680,0.72,'D4')])
        }
      }
    };
  }

  getScale(scaleId = this.scaleId) {
    const scales = (window.ENO_DATA && window.ENO_DATA.SCALES) || {};
    return scales[scaleId] || scales[this.scaleId] || scales.reflection_eb;
  }

  getAllowedPitchClasses(scaleId = this.scaleId) {
    const sc = this.getScale(scaleId);
    const root = typeof sc.rootMidi === 'number' ? sc.rootMidi : 51;
    const ivs = Array.isArray(sc.intervals) ? sc.intervals : [0, 2, 4, 6, 7, 9, 11];
    return ivs.map((iv) => ((root + iv) % 12 + 12) % 12);
  }

  isMidiInKey(midi, scaleId = this.scaleId) {
    if (typeof midi !== 'number' || isNaN(midi)) return false;
    const pc = ((Math.round(midi) % 12) + 12) % 12;
    if (this.getAllowedPitchClasses(scaleId).includes(pc)) return true;
    const ac = (typeof window !== 'undefined' && window.enoAutoCycler) ? window.enoAutoCycler : null;
    if (ac && typeof ac.isMidiInBlendedScales === 'function' && ac.isMidiInBlendedScales(midi)) return true;
    return false;
  }

  quantizeMidiToKey(midi, scaleId = this.scaleId) {
    if (typeof midi !== 'number' || isNaN(midi)) return 60;
    const rounded = Math.round(midi), allowed = this.getAllowedPitchClasses(scaleId);
    const pc = ((rounded % 12) + 12) % 12;
    if (allowed.includes(pc)) return Math.max(0, Math.min(127, rounded));
    let bestMidi = rounded, minDiff = Infinity;
    for (let delta = -2; delta <= 2; delta++) {
      if (delta === 0) continue;
      const candidate = rounded + delta, cPc = ((candidate % 12) + 12) % 12;
      if (allowed.includes(cPc) && Math.abs(delta) < minDiff) { minDiff = Math.abs(delta); bestMidi = candidate; }
    }
    return Math.max(0, Math.min(127, bestMidi));
  }

  degreeToMidi(degreeIndex, octaveOffset = 0, scaleId = this.scaleId) {
    const sc = this.getScale(scaleId), ivs = Array.isArray(sc.intervals) ? sc.intervals : [0, 2, 4, 6, 7, 9, 11];
    const len = ivs.length, oct = Math.floor(degreeIndex / len) + octaveOffset, idx = ((degreeIndex % len) + len) % len;
    return this.quantizeMidiToKey(Math.max(0, Math.min(127, sc.rootMidi + oct * 12 + ivs[idx])), scaleId);
  }

  getDiatonicFifthMidi(midi, scaleId = this.scaleId) {
    const quantized = this.quantizeMidiToKey(midi, scaleId), sc = this.getScale(scaleId), ivs = sc.intervals;
    const pc = ((quantized % 12) + 12) % 12, rootPc = sc.rootMidi % 12, relSemi = ((pc - rootPc) % 12 + 12) % 12;
    let degIdx = ivs.indexOf(relSemi);
    if (degIdx === -1) degIdx = 0;
    const octOfMidi = Math.floor((quantized - sc.rootMidi) / 12);
    return this.degreeToMidi(degIdx + 4, octOfMidi, scaleId);
  }

  setPreset(presetId) {
    this.activePresetId = presetId;
    const pat = this.TRACK_PATTERNS[presetId] || this.TRACK_PATTERNS.reflection;
    this.scaleId = pat.scaleId; this.pianoPhraseType = pat.defaultPianoPhraseType;
    this.chordProgInstrument = pat.defaultChordProgInstrument;
    this.pianoCycleCount = 0; this.activeStepIndex = 0; this.chordStepIndex = 0;
    this.lastPhraseOutcome = 'full_phrase'; this.lastStartOnlyDice = null;
    this.lfoStartTimeMs = Date.now();
    this.clearPhraseTimers();

    if (typeof pat.defaultVariationChance === 'number') this.phraseVariationChance = pat.defaultVariationChance;
    if (typeof pat.defaultSkipChance === 'number') this.phraseSkipChance = pat.defaultSkipChance;
    if (typeof pat.defaultNoteGate === 'number') this.phraseNoteGate = pat.defaultNoteGate;
    if (typeof pat.defaultCompletionGate === 'number') this.phraseCompletionGate = pat.defaultCompletionGate;
    this.noteOctaveShiftChance = typeof pat.defaultNoteOctaveShiftChance === 'number' ? pat.defaultNoteOctaveShiftChance : 0.03;
    this.chordOctaveShiftChance = typeof pat.defaultChordOctaveShiftChance === 'number' ? pat.defaultChordOctaveShiftChance : 0.10;

    if (this.probEngine && Array.isArray(this.probEngine.voices)) {
      this.probEngine.voices.forEach((v) => {
        if (typeof v.noteOctaveShiftProb !== 'number') v.noteOctaveShiftProb = this.noteOctaveShiftChance;
        if (typeof v.chordOctaveShiftProb !== 'number') v.chordOctaveShiftProb = this.chordOctaveShiftChance;
      });
      const pv = this.probEngine.voices.find(v => v.id === 'piano');
      if (pv) { this.phraseGateProb = pv.prob; this.phraseLoopCycle = pv.cycle; }
      const cv = this.probEngine.voices.find(v => v.id === this.chordProgInstrument);
      if (cv) { this.chordProgGate = cv.prob; this.chordProgCycle = cv.cycle; }
    }
    this.syncUI();
  }

  rollNoteOctaveShift(options = {}) {
    if (options && options.disableVariations) return 0;
    const rawProb = (options && typeof options.prob === 'number')
      ? options.prob
      : (typeof this.noteOctaveShiftChance === 'number' ? this.noteOctaveShiftChance : 0.03);
    const p = Math.max(0, Math.min(1, rawProb));
    if (p <= 0) return 0;
    const r = typeof options.r === 'number' ? options.r : Math.random();
    if (r < p) {
      this.noteOctaveShiftedCount++;
      const dirRoll = typeof options.dirRoll === 'number' ? options.dirRoll : Math.random();
      return dirRoll < 0.5 ? 1 : -1;
    }
    return 0;
  }

  rollChordOctaveShift(options = {}) {
    if (options && options.disableVariations) return 0;
    const rawProb = (options && typeof options.chordProb === 'number') ? options.chordProb : (typeof this.chordOctaveShiftChance === 'number' ? this.chordOctaveShiftChance : 0.10);
    const p = Math.max(0, Math.min(1, rawProb));
    if (p <= 0) { this.lastChordOctaveShift = 0; return 0; }
    const r = typeof options.r === 'number' ? options.r : Math.random();
    if (r < p) {
      this.chordOctaveShiftedCount++;
      const dirRoll = typeof options.dirRoll === 'number' ? options.dirRoll : Math.random();
      const shift = dirRoll < 0.5 ? 1 : -1;
      this.lastChordOctaveShift = shift;
      return shift;
    }
    this.lastChordOctaveShift = 0;
    return 0;
  }

  setPianoPhraseType(phraseType) {
    if (!['short_motif', 'chord_progression', 'longer_pattern'].includes(phraseType)) return;
    const pat = this.TRACK_PATTERNS[this.activePresetId] || this.TRACK_PATTERNS.reflection;
    if (phraseType === 'chord_progression') {
      this.pianoPhraseType = 'chord_progression';
      this.chordProgInstrument = 'piano';
    } else {
      this.pianoPhraseType = phraseType;
      if (this.chordProgInstrument === 'piano') this.chordProgInstrument = pat.altChordInstrument || 'pad';
    }
    this.pianoCycleCount = 0; this.activeStepIndex = 0; this.lastPhraseOutcome = 'full_phrase';
    this.clearPhraseTimers();
    this.syncUI();
  }

  setChordProgInstrument(voiceId) {
    if (!['piano', 'pad', 'choir', 'tape', 'bell', 'none'].includes(voiceId)) return;
    const pat = this.TRACK_PATTERNS[this.activePresetId] || this.TRACK_PATTERNS.reflection;
    this.chordProgInstrument = voiceId;
    if (voiceId === 'piano') {
      this.pianoPhraseType = 'chord_progression';
    } else if (this.pianoPhraseType === 'chord_progression') {
      this.pianoPhraseType = pat.melodicFallbackType || 'short_motif';
    }
    this.chordStepIndex = 0;
    this.clearPhraseTimers();
    this.syncUI();
  }

  getActiveChordProgInstruments() {
    if (!this.chordProgInstrument || this.chordProgInstrument === 'none') return [];
    return [this.chordProgInstrument];
  }

  clearPhraseTimers() {
    this.phraseTimers.forEach((t) => clearBgTimer(t));
    this.phraseTimers = [];
  }

  getActivePianoPhrase() {
    const pat = this.TRACK_PATTERNS[this.activePresetId] || this.TRACK_PATTERNS.reflection;
    return pat.phrases[this.pianoPhraseType] || pat.phrases.chord_progression;
  }

  getPhraseLengthLfoState(totalSteps = 8, elapsedSecOverride = null) {
    const pat = this.TRACK_PATTERNS[this.activePresetId] || this.TRACK_PATTERNS.thursday;
    const lfoCfg = (pat && pat.phraseLengthLfo) || null;
    if (!lfoCfg || !lfoCfg.enabled) {
      return { enabled: false, periodSec: 180, minRatio: 1.0, maxRatio: 1.0, elapsedSec: 0, phase: 0, wave: 1.0, lengthRatio: 1.0, curtailedLength: totalSteps };
    }
    let elapsedSec = 0;
    if (typeof elapsedSecOverride === 'number' && !isNaN(elapsedSecOverride)) {
      elapsedSec = Math.max(0, elapsedSecOverride);
    } else if (this.probEngine && this.probEngine.stats && typeof this.probEngine.stats.listenedSeconds === 'number' && this.probEngine.stats.listenedSeconds > 0) {
      elapsedSec = this.probEngine.stats.listenedSeconds;
    } else {
      elapsedSec = Math.max(0, (Date.now() - (this.lfoStartTimeMs || Date.now())) / 1000);
    }
    const periodSec = lfoCfg.periodSec || 180, minRatio = typeof lfoCfg.minRatio === 'number' ? lfoCfg.minRatio : 0.50, maxRatio = typeof lfoCfg.maxRatio === 'number' ? lfoCfg.maxRatio : 1.00;
    const phase = (((elapsedSec % periodSec) + periodSec) % periodSec) / periodSec, wave = 0.5 * (1 + Math.cos(2 * Math.PI * phase));
    const lengthRatio = minRatio + (maxRatio - minRatio) * wave, minSteps = Math.min(totalSteps, Math.max(1, Math.round(totalSteps * minRatio)));
    const curtailedLength = Math.max(minSteps, Math.min(totalSteps, Math.round(totalSteps * lengthRatio)));
    return { enabled: true, periodSec, minRatio, maxRatio, elapsedSec, phase, wave, lengthRatio, curtailedLength };
  }

  onPhraseGateRest(roll, effectiveProb) {
    this.skippedPhraseCount++;
    this.lastPhraseOutcome = 'skipped_whole_phrase';
    const metaBadge = document.getElementById('piano-phrase-meta');
    if (metaBadge) metaBadge.textContent = 'Whole phrase skipped (gate rest)';
    document.querySelectorAll('.phrase-step-pill').forEach((pill) => {
      pill.classList.remove('active', 'is-omitted', 'is-truncated');
      pill.classList.add('is-skipped');
    });
  }

  triggerPianoPhrase(voice, circadian, options = {}) {
    this.clearPhraseTimers();
    const phrase = this.getActivePianoPhrase();
    this.pianoCycleCount++;

    const isPrimary = (this.pianoCycleCount <= 1 || options.forcePrimary || Math.random() < 0.50);
    this.lastPhraseVariant = isPrimary ? 'primary' : 'variant';
    const steps = isPrimary ? phrase.primarySteps : (phrase.variantSteps || phrase.primarySteps);
    const speed = (this.probEngine && this.probEngine.rotationSpeed) ? this.probEngine.rotationSpeed : 1.0;

    const lfoRaw = this.getPhraseLengthLfoState(steps.length, options.lfoElapsedSec);
    const applyLfo = lfoRaw.enabled && !options.forceFull && !options.ignoreLfo && (this.pianoCycleCount > 1 || typeof options.lfoElapsedSec === 'number');
    const lfoCutoffIndex = applyLfo ? lfoRaw.curtailedLength : steps.length;
    this.lastLfoState = { ...lfoRaw, active: applyLfo, curtailedLength: lfoCutoffIndex };
    let cutoffIndex = lfoCutoffIndex;
    const stepStates = steps.map((_, i) => (i < lfoCutoffIndex ? 'play' : 'truncated'));
    this.lastPhraseOutcome = lfoCutoffIndex < steps.length ? 'lfo_curtailed' : 'full_phrase';
    this.lastStartOnlyDice = null;

    // Default is "Phrase plays" (all notes play). On generative cycles, roll against phraseVariationChance
    // for whether ANY of the 3 changes (whole phrase skipped, start-only 2+ dice, or notes omitted) triggers.
    const shouldRollChance = !options.forceFull && !options.disableVariations && (this.pianoCycleCount > 1 || options.allowChanceOnFirst);
    if (shouldRollChance && lfoCutoffIndex >= 2) {
      const varRoll = typeof options.varRoll === 'number' ? options.varRoll : Math.random();
      if (varRoll < this.phraseVariationChance) {
        let wSkip = Math.max(0, this.phraseSkipChance);
        let wOmit = Math.max(0, this.phraseNoteGate);
        let wStart = Math.max(0, this.phraseCompletionGate);
        let wSum = wSkip + wOmit + wStart;
        if (wSum <= 0.0001) { wSkip = 1; wOmit = 1; wStart = 1; wSum = 3; }

        const pick = Math.random() * wSum;
        if (pick < wSkip) {
          this.skippedPhraseCount++;
          this.lastPhraseOutcome = 'skipped_whole_phrase';
          cutoffIndex = 0;
          for (let i = 0; i < steps.length; i++) stepStates[i] = 'skipped';
        } else if (pick < wSkip + wStart && lfoCutoffIndex >= 3) {
          // Start-only within LFO-curtailed window
          const minDice = Math.min(2, lfoCutoffIndex);
          const maxDice = Math.max(minDice, lfoCutoffIndex - 1);
          cutoffIndex = minDice + Math.floor(Math.random() * (maxDice - minDice + 1));
          this.lastStartOnlyDice = cutoffIndex;
          this.truncatedPhraseCount++;
          this.lastPhraseOutcome = 'start_only';
          for (let i = cutoffIndex; i < steps.length; i++) stepStates[i] = 'truncated';
        } else {
          // Omit notes inside the phrase while always guaranteeing 2+ notes play
          this.lastPhraseOutcome = 'notes_omitted';
          const maxToOmit = lfoCutoffIndex >= 6 ? (1 + Math.floor(Math.random() * 2)) : 1;
          const candidates = [];
          for (let i = 1; i < lfoCutoffIndex; i++) candidates.push(i);
          for (let k = 0; k < maxToOmit && candidates.length > 0 && (lfoCutoffIndex - (k + 1)) >= 2; k++) {
            const cIdx = Math.floor(Math.random() * candidates.length);
            const omitStep = candidates.splice(cIdx, 1)[0];
            stepStates[omitStep] = 'omitted';
            this.omittedNotesTotal++;
          }
        }
      }
    }
    this.lastStepStates = stepStates;

    const roundShift = typeof options.roundOctaveShift === 'number'
      ? options.roundOctaveShift
      : ((voice && typeof voice.roundOctaveShift === 'number' && !options.disableVariations) ? voice.roundOctaveShift : 0);

    let firstMidi = 60;
    let firstNoteName = '—';
    const allMidiNotes = [];

    steps.forEach((step, sIdx) => {
      const stepDegrees = step.degrees || [0];
      const stepOctaves = step.octaves || stepDegrees.map(() => 0);
      const vOct = (voice && typeof voice.octaveOffset === 'number') ? voice.octaveOffset : 0;
      const cOct = (circadian && typeof circadian.octaveBias === 'number') ? circadian.octaveBias : 0;

      const isChordStep = (stepDegrees.length > 1 || this.pianoPhraseType === 'chord_progression');
      const chordProb = typeof options.chordProb === 'number' ? options.chordProb : ((voice && typeof voice.chordOctaveShiftProb === 'number') ? voice.chordOctaveShiftProb : this.chordOctaveShiftChance);
      const chordOctShift = (!options.disableVariations && isChordStep) ? this.rollChordOctaveShift({ ...options, chordProb }) : 0;

      const stepMidis = stepDegrees.map((deg, dIdx) => {
        const noteProb = typeof options.prob === 'number' ? options.prob : ((voice && typeof voice.noteOctaveShiftProb === 'number') ? voice.noteOctaveShiftProb : this.noteOctaveShiftChance);
        const noteOctShift = (!options.disableVariations) ? this.rollNoteOctaveShift({ ...options, prob: noteProb }) : 0;
        const oct = (stepOctaves[dIdx] || 0) + vOct + roundShift + cOct + chordOctShift + noteOctShift;
        return this.degreeToMidi(deg, oct, this.scaleId);
      });

      const m2n = (window.ENO_DATA && typeof window.ENO_DATA.midiToNoteName === 'function')
        ? window.ENO_DATA.midiToNoteName
        : (m) => `M${m}`;
      let stepNoteLabel = step.label || firstNoteName;
      if (stepMidis.length === 1) {
        stepNoteLabel = m2n(stepMidis[0]);
      } else if (stepMidis.length === 2) {
        stepNoteLabel = `${m2n(stepMidis[0])}+${m2n(stepMidis[1])}`;
      }

      if (sIdx === 0) {
        firstMidi = stepMidis[0] || 60;
        firstNoteName = stepNoteLabel;
      }
      stepMidis.forEach((m) => allMidiNotes.push(m));

      if (options.dryRun || stepStates[sIdx] !== 'play') return;

      const delaySec = (step.delayMs || 0) / 1000 / Math.max(0.2, speed);
      const fireStep = () => {
        this.activeStepIndex = sIdx;
        this._highlightPhraseStep(sIdx);
        const chordScale = stepMidis.length > 1 ? (1 / Math.pow(stepMidis.length, 0.16)) : 1.0;
        const vel = Math.min(1.0, (step.vel || 0.76) * 1.15 * (options.velocity || 1.0) * chordScale);
        const pan = (Math.random() * 2 - 1) * 0.40;
        const pVoice = voice || ((this.probEngine && Array.isArray(this.probEngine.voices)) ? this.probEngine.voices.find((x) => x.id === 'piano') : null);
        const gain = (pVoice && typeof pVoice.gain === 'number') ? pVoice.gain : 2.0;

        stepMidis.forEach((m, noteIdx) => {
          const rollDelay = noteIdx * ((step.rollMs || 35) / 1000);
          if (this.audioEngine) {
            setBgTimer(() => {
              this.audioEngine.triggerVoice('piano', m, vel, pan, gain);
            }, rollDelay * 1000);
          }
        });
        if (window.aurora) window.aurora.pulse(sIdx === 0 ? 0.62 : 0.38, { voiceId: 'piano' });

        if (window.EnsoMotion) {
          window.EnsoMotion.setBadgeText('voice-note-piano', stepNoteLabel);
        } else {
          const noteBadge = document.getElementById('voice-note-piano');
          if (noteBadge) noteBadge.textContent = stepNoteLabel;
        }
      };

      if (options.syncImmediate || delaySec <= 0.005) {
        fireStep();
      } else {
        const timer = setBgTimer(fireStep, delaySec * 1000);
        this.phraseTimers.push(timer);
      }
    });

    if (!options.dryRun) {
      document.querySelectorAll('.phrase-step-pill').forEach((pill) => {
        const idx = parseInt(pill.dataset.stepIdx, 10);
        pill.classList.remove('is-skipped', 'is-omitted', 'is-truncated');
        if (stepStates[idx] === 'skipped') pill.classList.add('is-skipped');
        else if (stepStates[idx] === 'omitted') pill.classList.add('is-omitted');
        else if (stepStates[idx] === 'truncated') pill.classList.add('is-truncated');
      });

      const metaBadge = document.getElementById('piano-phrase-meta');
      if (metaBadge) {
        let metaText = '';
        const playedCount = stepStates.filter(s => s === 'play').length;
        if (this.lastPhraseOutcome === 'skipped_whole_phrase') {
          metaText = `Whole phrase skipped · Cycle ${this.pianoCycleCount}`;
        } else if (this.lastPhraseOutcome === 'lfo_curtailed') {
          metaText = `3m LFO length: ${lfoCutoffIndex}/${steps.length} notes (${Math.round(lfoRaw.lengthRatio * 100)}%) · Cycle ${this.pianoCycleCount}`;
        } else if (this.lastPhraseOutcome === 'start_only') {
          const lfoExtra = lfoCutoffIndex < steps.length ? ` · LFO ${lfoCutoffIndex}/${steps.length}` : '';
          metaText = `Start-only dice: ${cutoffIndex}/${lfoCutoffIndex} notes (2+) · Cycle ${this.pianoCycleCount}${lfoExtra}`;
        } else if (this.lastPhraseOutcome === 'notes_omitted') {
          const omittedCount = stepStates.filter(s => s === 'omitted').length;
          const lfoExtra = lfoCutoffIndex < steps.length ? ` · LFO ${lfoCutoffIndex}/${steps.length}` : '';
          metaText = `${omittedCount} note${omittedCount > 1 ? 's' : ''} omitted (${playedCount}/${lfoCutoffIndex} played) · Cycle ${this.pianoCycleCount}${lfoExtra}`;
        } else {
          metaText = `Phrase plays (${steps.length}/${steps.length} notes) · Cycle ${this.pianoCycleCount}`;
        }
        if (window.EnsoMotion) {
          window.EnsoMotion.setBadgeText(metaBadge, metaText);
        } else {
          metaBadge.textContent = metaText;
        }
      }
    }

    return {
      phraseName: phrase.name,
      phraseType: this.pianoPhraseType,
      variant: this.lastPhraseVariant,
      cycleCount: this.pianoCycleCount,
      firstMidi,
      firstNoteName,
      allMidiNotes,
      stepCount: steps.length,
      cutoffIndex,
      lfoCutoffIndex,
      lfoLengthRatio: lfoRaw.lengthRatio,
      lfoPeriodSec: lfoRaw.periodSec,
      lfoEnabled: lfoRaw.enabled,
      stepStates,
      outcome: this.lastPhraseOutcome,
      playedStepsCount: stepStates.filter(s => s === 'play').length
    };
  }

  triggerInstrumentChordProgression(voice, circadian, options = {}) {
    const pat = this.TRACK_PATTERNS[this.activePresetId] || this.TRACK_PATTERNS.reflection;
    const chords = pat.trackChords || [];
    if (!chords.length) return null;

    const chord = chords[this.chordStepIndex % chords.length];
    this.chordStepIndex = (this.chordStepIndex + 1) % chords.length;

    const vOct = (voice && typeof voice.octaveOffset === 'number') ? voice.octaveOffset : 0;
    const cOct = (circadian && typeof circadian.octaveBias === 'number') ? circadian.octaveBias : 0;
    const roundShift = (options && typeof options.roundOctaveShift === 'number')
      ? options.roundOctaveShift
      : ((voice && typeof voice.roundOctaveShift === 'number') ? voice.roundOctaveShift : 0);

    let degrees = chord.degrees;
    let octaves = chord.octaves;
    if (degrees.length >= 4 && Math.random() < this.phraseNoteGate) {
      const omitIdx = 1 + Math.floor(Math.random() * (degrees.length - 2));
      degrees = degrees.filter((_, i) => i !== omitIdx);
      octaves = octaves.filter((_, i) => i !== omitIdx);
    }

    const chordProb = typeof options.chordProb === 'number' ? options.chordProb : ((voice && typeof voice.chordOctaveShiftProb === 'number') ? voice.chordOctaveShiftProb : this.chordOctaveShiftChance);
    const chordOctShift = (!options.disableVariations) ? this.rollChordOctaveShift({ ...options, chordProb }) : 0;
    const noteProb = typeof options.prob === 'number' ? options.prob : ((voice && typeof voice.noteOctaveShiftProb === 'number') ? voice.noteOctaveShiftProb : this.noteOctaveShiftChance);
    const midiNotes = degrees.map((deg, idx) => {
      const noteOctShift = (!options.disableVariations) ? this.rollNoteOctaveShift({ ...options, prob: noteProb }) : 0;
      return this.degreeToMidi(deg, (octaves[idx] || 0) + vOct + roundShift + cOct + chordOctShift + noteOctShift, this.scaleId);
    });
    const noteNames = midiNotes.map((m) => (window.ENO_DATA && window.ENO_DATA.midiToNoteName) ? window.ENO_DATA.midiToNoteName(m) : `M${m}`);
    const vel = 0.65, pan = (Math.random() * 2 - 1) * 0.35, gain = (voice && typeof voice.gain === 'number') ? voice.gain : 0.70;

    if (this.audioEngine) {
      midiNotes.forEach((m, idx) => setBgTimer(() => this.audioEngine.triggerVoice(voice.id, m, vel * 0.85, pan, gain * 0.68), idx * 28));
    }
    if (window.aurora) window.aurora.pulse(0.72, { voiceId: voice ? voice.id : 'choir' });

    this.currentChord = { numeral: chord.numeral, name: chord.name, notes: midiNotes, noteNames, degrees: chord.degrees, voiceId: voice.id, chordOctaveShift: chordOctShift };
    this._highlightChordStep((this.chordStepIndex - 1 + chords.length) % chords.length);
    const freq = (window.ENO_DATA && window.ENO_DATA.midiToFreq) ? Number(window.ENO_DATA.midiToFreq(midiNotes[0]).toFixed(2)) : 440;
    return {
      isChord: true,
      numeral: chord.numeral,
      midiNotes,
      chordOctaveShift: chordOctShift,
      noteName: chord.name,
      voicingLabel: `${chord.name} (${noteNames.join(' ')})`,
      firstMidi: midiNotes[0],
      freq,
      degreeIdx: chord.degrees[0]
    };
  }

  selectKeyLockedSinglePitch(voice, circadian, probEngine) {
    const ac = (typeof window !== 'undefined' && window.enoAutoCycler) ? window.enoAutoCycler : null;
    if (ac && typeof ac.selectBlendedSinglePitch === 'function' && ac.isTransitioning()) {
      const blended = ac.selectBlendedSinglePitch(this, voice, circadian, probEngine);
      if (blended) return blended;
    }
    const sc = this.getScale(this.scaleId);
    const ivs = sc.intervals || [0, 2, 4, 6, 7, 9, 11];
    const baseW = (probEngine && probEngine.degreeWeights && probEngine.degreeWeights.length === ivs.length)
      ? probEngine.degreeWeights : (sc.defaultWeights || ivs.map(() => 0.70));

    const weights = ivs.map((iv, i) => {
      let w = baseW[i] || 0.5;
      if (this.currentChord && Array.isArray(this.currentChord.degrees) && this.currentChord.degrees.includes(i)) w *= 1.35;
      return Math.max(0.01, w);
    });

    const sumW = weights.reduce((acc, c) => acc + c, 0);
    let target = Math.random() * sumW, chosenDegree = 0;
    for (let i = 0; i < weights.length; i++) {
      target -= weights[i];
      if (target <= 0) { chosenDegree = i; break; }
    }

    const vOct = (voice && typeof voice.octaveOffset === 'number') ? voice.octaveOffset : 0;
    const cOct = (circadian && typeof circadian.octaveBias === 'number') ? circadian.octaveBias : 0;
    const roundShift = (voice && typeof voice.roundOctaveShift === 'number') ? voice.roundOctaveShift : 0;
    const midi = this.degreeToMidi(chosenDegree, vOct + cOct + roundShift, this.scaleId);
    const noteName = (window.ENO_DATA && window.ENO_DATA.midiToNoteName) ? window.ENO_DATA.midiToNoteName(midi) : `M${midi}`;
    const freq = (window.ENO_DATA && window.ENO_DATA.midiToFreq) ? Number(window.ENO_DATA.midiToFreq(midi).toFixed(2)) : 440;
    return { midi, noteName, freq, degreeIdx: chosenDegree };
  }

  _highlightPhraseStep(stepIdx) {
    document.querySelectorAll('.phrase-step-pill').forEach((p) => p.classList.toggle('active', parseInt(p.dataset.stepIdx, 10) === stepIdx));
  }

  _highlightChordStep(chordIdx) {
    document.querySelectorAll('.chord-prog-pill').forEach((p) => p.classList.toggle('active', parseInt(p.dataset.chordIdx, 10) === chordIdx));
  }

  syncUI() {
    const pat = this.TRACK_PATTERNS[this.activePresetId] || this.TRACK_PATTERNS.reflection;

    const scaleNotesBadge = document.getElementById('key-scale-notes-badge');
    if (scaleNotesBadge) {
      const pcs = this.getAllowedPitchClasses(this.scaleId);
      const noteNames = ['C','D♭','D','E♭','E','F','F#','G','A♭','A','B♭','B'];
      const names = pcs.map((pc) => noteNames[pc]);
      const txt = `Scale: ${names.join(' ')}`;
      if (typeof window !== 'undefined' && window.EnsoMotion) {
        window.EnsoMotion.setBadgeText(scaleNotesBadge, txt);
      } else {
        scaleNotesBadge.textContent = txt;
      }
    }

    document.querySelectorAll('#piano-phrase-type-tabs .m3-pill-tab').forEach((tab) => {
      const isSel = tab.dataset.phraseType === this.pianoPhraseType;
      tab.classList.toggle('active', isSel);
      tab.setAttribute('aria-selected', isSel ? 'true' : 'false');
    });

    const chordSelect = document.getElementById('select-chord-prog-voice');
    if (chordSelect) chordSelect.value = this.chordProgInstrument;

    const phraseTitle = document.getElementById('piano-phrase-title');
    const phrase = this.getActivePianoPhrase();
    if (phraseTitle && phrase) phraseTitle.textContent = phrase.name;

    const phraseMeta = document.getElementById('piano-phrase-meta');
    if (phraseMeta && phrase) {
      const n = phrase.primarySteps.length;
      const txt = `Phrase plays (${n}/${n} notes) · Cycle ${this.pianoCycleCount || 1}`;
      if (typeof window !== 'undefined' && window.EnsoMotion) {
        window.EnsoMotion.setBadgeText(phraseMeta, txt);
      } else {
        phraseMeta.textContent = txt;
      }
    }

    const stepsContainer = document.getElementById('phrase-steps-strip');
    if (stepsContainer && phrase) {
      stepsContainer.innerHTML = '';
      phrase.primarySteps.forEach((step, idx) => {
        const pill = document.createElement('button');
        pill.type = 'button';
        pill.className = `phrase-step-pill${idx === this.activeStepIndex ? ' active' : ''}`;
        pill.dataset.stepIdx = idx;
        pill.innerHTML = `<span>${idx + 1}. ${step.label}</span>`;
        pill.title = `Step ${idx + 1} (${step.label}) · Click to audition note/chord`;
        pill.addEventListener('click', () => {
          if (this.audioEngine) {
            const v = (this.probEngine && this.probEngine.voices) ? this.probEngine.voices.find((x) => x.id === 'piano') : null;
            const midis = (step.degrees || [0]).map((d, i) => this.degreeToMidi(d, (step.octaves ? step.octaves[i] : 0) + (v ? v.octaveOffset : 0), this.scaleId));
            const cScale = midis.length > 1 ? (1 / Math.pow(midis.length, 0.42)) : 1.0;
            midis.forEach((m, mIdx) => {
              setBgTimer(() => this.audioEngine.triggerVoice('piano', m, 0.72 * cScale, 0, v ? v.gain : 2.0), mIdx * 35);
            });
            this._highlightPhraseStep(idx);
          }
        });
        stepsContainer.appendChild(pill);
      });
    }

    const chordLabel = document.getElementById('chord-prog-owner-label');
    const voiceNames = { piano: 'Felt Piano', pad: 'CS-80 Ribbon Pad', choir: 'Spectral Choir', tape: 'Revox Tape Loop', bell: 'DX7 Glass Bell', none: 'None' };
    if (chordLabel) {
      const ownerName = voiceNames[this.chordProgInstrument] || this.chordProgInstrument;
      chordLabel.textContent = `Chord progression owner: ${ownerName} (1 instrument max)`;
    }

    const chordsContainer = document.getElementById('chord-prog-strip');
    if (chordsContainer && pat.trackChords) {
      chordsContainer.innerHTML = '';
      pat.trackChords.forEach((chord, idx) => {
        const pill = document.createElement('button');
        pill.type = 'button';
        pill.className = `chord-prog-pill${idx === this.chordStepIndex ? ' active' : ''}`;
        pill.dataset.chordIdx = idx;
        pill.innerHTML = `<span>${chord.numeral} (${chord.name})</span>`;
        pill.title = `Chord ${idx + 1}: ${chord.name} · Degrees [${chord.degrees.map((d) => d + 1).join(', ')}]`;
        pill.addEventListener('click', () => {
          const vId = (this.chordProgInstrument && this.chordProgInstrument !== 'none') ? this.chordProgInstrument : 'pad';
          const v = (this.probEngine && this.probEngine.voices) ? this.probEngine.voices.find((x) => x.id === vId) : null;
          const midis = chord.degrees.map((d, i) => this.degreeToMidi(d, (chord.octaves[i] || 0) + (v ? v.octaveOffset : 0), this.scaleId));
          if (this.audioEngine) {
            midis.forEach((m, mIdx) => {
              setBgTimer(() => this.audioEngine.triggerVoice(vId, m, 0.65, 0, v ? v.gain * 0.68 : 0.65), mIdx * 25);
            });
          }
          this._highlightChordStep(idx);
        });
        chordsContainer.appendChild(pill);
      });
    }

    if (typeof window !== 'undefined' && window.EnsoMotion && window.EnsoMotion.syncVoiceHarmonyCards) {
      window.EnsoMotion.syncVoiceHarmonyCards(this, phrase);
    }

    const setSl = (id, lid, v, fmt) => {
      const el = document.getElementById(id), l = document.getElementById(lid);
      if (el && Math.abs(parseFloat(el.value) - v) > 0.001) el.value = v;
      if (l) l.textContent = fmt(v);
    };
    const pct = (v) => `${Math.round(v * 100)}%`, sec1 = (v) => `${v.toFixed(1)} s`;
    [['phrase-variation-chance', 'val-phrase-variation-chance', this.phraseVariationChance, pct],
     ['phrase-gate-prob', 'val-phrase-gate-prob', this.phraseGateProb, pct],
     ['phrase-loop-cycle', 'val-phrase-loop-cycle', this.phraseLoopCycle, sec1],
     ['phrase-skip-chance', 'val-phrase-skip-chance', this.phraseSkipChance, pct],
     ['phrase-note-gate', 'val-phrase-note-gate', this.phraseNoteGate, pct],
     ['phrase-completion-gate', 'val-phrase-completion-gate', this.phraseCompletionGate, pct],
     ['phrase-note-octave-shift', 'val-phrase-note-octave-shift', this.noteOctaveShiftChance, pct],
     ['phrase-chord-octave-shift', 'val-phrase-chord-octave-shift', this.chordOctaveShiftChance, pct],
     ['chord-prog-gate', 'val-chord-prog-gate', this.chordProgGate, pct],
     ['chord-prog-cycle', 'val-chord-prog-cycle', this.chordProgCycle, sec1]].forEach(([a, b, c, d]) => setSl(a, b, c, d));
  }

  bindUI() {
    const b = (id, lid, fmt, onChg) => {
      const el = document.getElementById(id), lbl = document.getElementById(lid);
      if (el) el.addEventListener('input', () => { const v = parseFloat(el.value); if (lbl) lbl.textContent = fmt(v); onChg(v); });
    };
    const pct = (v) => `${Math.round(v * 100)}%`, sec1 = (v) => `${v.toFixed(1)} s`;
    const syncProb = (inst, p) => {
      if (!this.probEngine || !inst || inst === 'none') return;
      this.probEngine.setVoiceParam(inst, 'prob', p);
      const sl = document.getElementById(`voice-prob-${inst}`), vl = document.getElementById(`val-voice-prob-${inst}`);
      if (sl) sl.value = p; if (vl) vl.textContent = pct(p);
    };
    const syncCyc = (inst, c) => {
      if (!this.probEngine || !inst || inst === 'none') return;
      this.probEngine.setVoiceParam(inst, 'cycle', c);
      const sl = document.getElementById(`voice-cycle-${inst}`), vl = document.getElementById(`val-voice-cycle-${inst}`);
      if (sl) sl.value = c; if (vl) vl.textContent = sec1(c);
      if (typeof this.probEngine.computeNonRepeatingHorizon === 'function') {
        const h = document.getElementById('horizon-badge'); if (h) h.textContent = this.probEngine.computeNonRepeatingHorizon();
      }
    };
    const syncVarFromSub = () => {
      this.phraseVariationChance = Math.min(1.0, this.phraseSkipChance + this.phraseNoteGate + this.phraseCompletionGate);
      const el = document.getElementById('phrase-variation-chance'), l = document.getElementById('val-phrase-variation-chance');
      if (el) el.value = this.phraseVariationChance; if (l) l.textContent = pct(this.phraseVariationChance);
    };
    b('phrase-variation-chance', 'val-phrase-variation-chance', pct, (v) => {
      this.phraseVariationChance = v;
      const sum = this.phraseSkipChance + this.phraseNoteGate + this.phraseCompletionGate;
      if (sum > 0.001) {
        const scale = v / sum;
        this.phraseSkipChance = Math.min(1, this.phraseSkipChance * scale);
        this.phraseNoteGate = Math.min(1, this.phraseNoteGate * scale);
        this.phraseCompletionGate = Math.min(1, this.phraseCompletionGate * scale);
      } else {
        this.phraseSkipChance = v / 3; this.phraseNoteGate = v / 3; this.phraseCompletionGate = v / 3;
      }
      this.syncUI();
    });
    b('phrase-gate-prob', 'val-phrase-gate-prob', pct, (v) => { this.phraseGateProb = v; syncProb('piano', v); });
    b('phrase-loop-cycle', 'val-phrase-loop-cycle', sec1, (v) => { this.phraseLoopCycle = v; syncCyc('piano', v); });
    b('phrase-skip-chance', 'val-phrase-skip-chance', pct, (v) => { this.phraseSkipChance = v; syncVarFromSub(); });
    b('phrase-note-gate', 'val-phrase-note-gate', pct, (v) => { this.phraseNoteGate = v; syncVarFromSub(); });
    b('phrase-completion-gate', 'val-phrase-completion-gate', pct, (v) => { this.phraseCompletionGate = v; syncVarFromSub(); });
    const bOct = (id, lid, paramKey) => {
      b(id, lid, pct, (v) => {
        this[paramKey] = v;
        ['piano', this.chordProgInstrument].forEach((inst) => {
          if (!inst || inst === 'none' || !this.probEngine) return;
          this.probEngine.setVoiceParam(inst, paramKey === 'chordOctaveShiftChance' ? 'chordOctaveShiftProb' : 'noteOctaveShiftProb', v);
          const prefix = paramKey === 'chordOctaveShiftChance' ? 'voice-chord-octave-shift' : 'voice-note-octave-shift';
          const sl = document.getElementById(`${prefix}-${inst}`), vl = document.getElementById(`val-${prefix}-${inst}`);
          if (sl) { sl.value = v.toFixed(2); sl.dispatchEvent(new Event('change')); }
          if (vl) vl.textContent = pct(v);
        });
      });
    };
    bOct('phrase-note-octave-shift', 'val-phrase-note-octave-shift', 'noteOctaveShiftChance');
    bOct('phrase-chord-octave-shift', 'val-phrase-chord-octave-shift', 'chordOctaveShiftChance');
    b('chord-prog-gate', 'val-chord-prog-gate', pct, (v) => { this.chordProgGate = v; syncProb(this.chordProgInstrument, v); });
    b('chord-prog-cycle', 'val-chord-prog-cycle', sec1, (v) => { this.chordProgCycle = v; syncCyc(this.chordProgInstrument, v); });
  }
}

if (typeof window !== 'undefined') window.PhraseEngine = PhraseEngine;
if (typeof module !== 'undefined' && module.exports) module.exports = { PhraseEngine };
