/**
 * Brian & Roger Eno Piano Phrase System & Per-Track Key Locking Patterns.
 * Each track has distinctive step cadences (delayMs), chord roll spreads (rollMs),
 * and velocity contours matching its Methods page studio technique.
 */
'use strict';

(function() {
  function getPatterns() {
    const s = (d, o, del, v, r, l) => {
      if (typeof r === 'string') return { degrees: d, octaves: o, delayMs: del, vel: v, rollMs: 55, label: r };
      return { degrees: d, octaves: o, delayMs: del, vel: v, rollMs: r, label: l };
    };
    const c = (d, o, del, v, r, l) => ({ degrees: d, octaves: o, delayMs: del, vel: v, rollMs: r, label: l });
    const p = (name, typeLabel, desc, pSteps, vSteps) => ({ name, typeLabel, description: desc, primarySteps: pSteps, variantSteps: vSteps });

    return {
      thursday: {
        presetId: 'thursday',
        scaleId: 'thursday_g',
        keyLabel: 'G Mixolydian',
        defaultPianoPhraseType: 'longer_pattern',
        defaultChordProgInstrument: 'choir',
        melodicFallbackType: 'longer_pattern',
        altChordInstrument: 'choir',
        chordRollMs: 112,
        chordVel: 0.72,
        phraseLengthLfo: { enabled: true, periodSec: 180, minRatio: 0.50, maxRatio: 1.00 },
        defaultVariationChance: 0.55,
        defaultSkipChance: 0.15,
        defaultNoteGate: 0.22,
        defaultCompletionGate: 0.18,
        defaultNoteOctaveShiftChance: 0.03,
        defaultChordOctaveShiftChance: 0.10,
        trackChords: [
          { numeral: 'I', name: 'G', degrees: [0, 2, 4, 6], octaves: [0, 0, 0, 0] },
          { numeral: '♭VII', name: 'F', degrees: [6, 1, 3, 5], octaves: [-1, 0, 0, 0] },
          { numeral: 'IV', name: 'C', degrees: [3, 5, 0, 2], octaves: [0, 0, 1, 1] },
          { numeral: 'v7', name: 'Dm7', degrees: [4, 6, 1, 3], octaves: [0, 0, 1, 1] }
        ],
        phrases: {
          short_motif: p(
            'Atrium Drop Cell', 'Short motif',
            'Delicate 4-note rubato falling motif in pastoral G Mixolydian with warm afternoon overhang.',
            [
              s([4], [1], 0, 0.78, 95, 'D5'), s([2], [1], 360, 0.66, 95, 'B4'),
              s([1], [1], 780, 0.58, 95, 'A4'), s([0], [1], 1520, 0.74, 110, 'G4')
            ],
            [
              s([6], [1], 0, 0.74, 95, 'F5'), s([4], [1], 330, 0.64, 95, 'D5'),
              s([2], [1], 730, 0.56, 95, 'B4'), s([0], [1], 1460, 0.76, 110, 'G4')
            ]
          ),
          chord_progression: p(
            'Mixolydian Sunlit Chords', 'Chord progression',
            'Open spaced Harold Budd triads rolling warmly across G, F, C, and Dm in afternoon light.',
            [
              c([0, 2, 4], [0, 0, 0], 0, 0.78, 96, 'G'),
              c([6, 1, 3], [-1, 0, 0], 1120, 0.68, 118, 'F'),
              c([3, 5, 0], [0, 0, 1], 2480, 0.74, 132, 'C'),
              c([4, 6, 1], [0, 0, 1], 3920, 0.64, 108, 'Dm')
            ],
            [
              c([0, 4, 1], [0, 0, 1], 0, 0.75, 104, 'Gsus2'),
              c([6, 1, 3], [-1, 0, 0], 1180, 0.66, 124, 'F'),
              c([3, 0, 2], [0, 1, 1], 2560, 0.72, 114, 'C'),
              c([0, 2, 4], [0, 0, 0], 4020, 0.76, 98, 'G')
            ]
          ),
          longer_pattern: p(
            'Sunlit Canopy Cascade', 'Longer pattern',
            '8-note cascading Harold Budd rubato waterfall piano phrase with mid-phrase sunlit breath.',
            [
              s([0, 4], [0, 1], 0, 0.82, 115, 'G4+D5'),
              s([2], [1], 310, 0.68, 90, 'B5'), s([1], [1], 640, 0.60, 90, 'A5'),
              s([4], [1], 1010, 0.74, 95, 'D5'), s([6], [0], 1690, 0.56, 95, 'F5'),
              s([5], [0], 2040, 0.64, 95, 'E5'), s([2], [0], 2430, 0.54, 95, 'B4'),
              s([0], [1], 3260, 0.76, 115, 'G5')
            ],
            [
              s([0, 4], [0, 1], 0, 0.80, 115, 'G4+D5'),
              s([1], [1], 330, 0.64, 90, 'A5'), s([2], [1], 690, 0.70, 90, 'B5'),
              s([6], [1], 1080, 0.58, 95, 'F6'), s([4], [1], 1750, 0.72, 95, 'D5'),
              s([3], [0], 2110, 0.55, 95, 'C5'), s([1], [0], 2510, 0.62, 95, 'A4'),
              s([0], [1], 3340, 0.75, 115, 'G5')
            ]
          )
        }
      },

      reflection: {
        presetId: 'reflection',
        scaleId: 'reflection_eb',
        keyLabel: 'C Lydian',
        defaultPianoPhraseType: 'chord_progression',
        defaultChordProgInstrument: 'piano',
        melodicFallbackType: 'short_motif',
        altChordInstrument: 'pad',
        chordRollMs: 168,
        chordVel: 0.62,
        defaultVariationChance: 0.55,
        defaultSkipChance: 0.15,
        defaultNoteGate: 0.22,
        defaultCompletionGate: 0.18,
        defaultNoteOctaveShiftChance: 0.03,
        defaultChordOctaveShiftChance: 0.10,
        trackChords: [
          { numeral: 'Imaj7', name: 'Cmaj7', degrees: [0, 2, 4, 6], octaves: [0, 0, 0, 0] },
          { numeral: 'II7', name: 'D7', degrees: [1, 3, 5, 0], octaves: [0, 0, 0, 1] },
          { numeral: 'vii7', name: 'Bm7', degrees: [6, 1, 3, 5], octaves: [-1, 0, 0, 0] },
          { numeral: 'Imaj7#11', name: 'Cmaj7(#11)', degrees: [0, 3, 4, 6], octaves: [0, 0, 0, 0] }
        ],
        phrases: {
          short_motif: p(
            'Luminous Cell', 'Short motif',
            'Spacious Logic Scripter modal chime in C Lydian gravitating to 1st, 5th, 9th, and #11.',
            [
              s([0], [1], 0, 0.68, 155, 'C4'), s([3], [1], 740, 0.56, 155, 'F#4'),
              s([4], [1], 1620, 0.64, 165, 'G4'), s([1], [1], 2740, 0.52, 175, 'D4')
            ],
            [
              s([0], [1], 0, 0.66, 155, 'C4'), s([3], [1], 790, 0.58, 155, 'F#4'),
              s([6], [1], 1710, 0.54, 165, 'B4'), s([4], [1], 2820, 0.62, 175, 'G4')
            ]
          ),
          chord_progression: p(
            'Lydian Glass Progression', 'Chord progression',
            'Slowly blooming 4-voice C Lydian Scripter chords across Cmaj7, D7, Bm7, and Cmaj7(#11).',
            [
              c([0, 2, 4, 6], [0, 0, 0, 0], 0, 0.70, 162, 'Cmaj7'),
              c([1, 3, 5, 0], [0, 0, 0, 1], 1640, 0.62, 178, 'D7'),
              c([6, 1, 3, 5], [-1, 0, 0, 0], 3480, 0.56, 192, 'Bm7'),
              c([0, 3, 4, 6], [0, 0, 0, 0], 5360, 0.66, 168, 'Cmaj7(#11)')
            ],
            [
              c([0, 2, 4, 1], [0, 0, 0, 1], 0, 0.68, 170, 'Cadd9'),
              c([1, 3, 5, 0], [0, 0, 0, 1], 1720, 0.60, 164, 'D7'),
              c([5, 0, 2, 4], [-1, 0, 0, 0], 3580, 0.54, 188, 'Am7'),
              c([0, 3, 4, 6], [0, 0, 0, 0], 5480, 0.65, 174, 'Cmaj7(#11)')
            ]
          ),
          longer_pattern: p(
            'Luminous Arch Phrase', 'Longer pattern',
            '8-step suspended C Lydian Scripter arc with wide contemplative inter-note spacing.',
            [
              s([0, 4], [0, 1], 0, 0.70, 165, 'C3+G4'),
              s([3], [1], 720, 0.56, 150, 'F#4'), s([2], [1], 1510, 0.62, 150, 'E4'),
              s([1], [1], 2380, 0.58, 150, 'D4'), s([0], [1], 3390, 0.66, 160, 'C4'),
              s([6], [0], 4210, 0.52, 150, 'B3'), s([4], [0], 5080, 0.60, 155, 'G3'),
              s([1], [1], 6060, 0.54, 165, 'D4')
            ],
            [
              s([0, 4], [0, 1], 0, 0.68, 165, 'C3+G4'),
              s([6], [1], 760, 0.54, 150, 'B4'), s([3], [1], 1580, 0.60, 150, 'F#4'),
              s([2], [1], 2460, 0.56, 150, 'E4'), s([1], [1], 3480, 0.64, 160, 'D4'),
              s([4], [1], 4320, 0.58, 150, 'G4'), s([3], [1], 5190, 0.52, 155, 'F#4'),
              s([0], [1], 6180, 0.66, 165, 'C4')
            ]
          )
        }
      },

      installations: {
        presetId: 'installations',
        scaleId: 'lux_a',
        keyLabel: 'F Lydian',
        defaultPianoPhraseType: 'chord_progression',
        defaultChordProgInstrument: 'piano',
        melodicFallbackType: 'longer_pattern',
        altChordInstrument: 'pad',
        chordRollMs: 208,
        chordVel: 0.75,
        defaultVariationChance: 0.58,
        defaultSkipChance: 0.16,
        defaultNoteGate: 0.24,
        defaultCompletionGate: 0.18,
        defaultNoteOctaveShiftChance: 0.03,
        defaultChordOctaveShiftChance: 0.10,
        trackChords: [
          { numeral: 'Imaj9', name: 'Fmaj9', degrees: [0, 2, 4, 1], octaves: [0, 0, 0, 1] },
          { numeral: 'II', name: 'G', degrees: [1, 3, 5, 0], octaves: [0, 0, 0, 1] },
          { numeral: 'vi', name: 'Dm', degrees: [5, 0, 2, 4], octaves: [-1, 0, 0, 0] },
          { numeral: 'V', name: 'C', degrees: [4, 6, 1, 3], octaves: [0, 0, 1, 1] }
        ],
        phrases: {
          short_motif: p(
            'Cathedral Bell Cell', 'Short motif',
            'Stately architectural chime motif in F Lydian spaced for 16.5s cathedral vault decay.',
            [
              s([0], [1], 0, 0.76, 185, 'F4'), s([2], [1], 890, 0.64, 185, 'A4'),
              s([3], [1], 1930, 0.70, 195, 'B4'), s([4], [1], 3170, 0.60, 210, 'C5')
            ],
            [
              s([4], [1], 0, 0.74, 185, 'C5'), s([3], [1], 930, 0.66, 185, 'B4'),
              s([1], [1], 2010, 0.62, 195, 'G4'), s([0], [1], 3290, 0.72, 210, 'F4')
            ]
          ),
          chord_progression: p(
            'Cathedral Vespers Chords', 'Chord progression',
            'Monumental wide-rolled F Lydian cathedral arches with 9th and #11 vault suspensions.',
            [
              c([0, 2, 4, 1], [0, 0, 0, 1], 0, 0.80, 196, 'Fmaj9'),
              c([1, 3, 5, 0], [0, 0, 0, 1], 1890, 0.70, 216, 'G'),
              c([5, 0, 2, 4], [-1, 0, 0, 0], 3910, 0.64, 204, 'Dm'),
              c([4, 6, 1, 3], [0, 0, 1, 1], 6030, 0.74, 224, 'C')
            ],
            [
              c([0, 3, 4, 1], [0, 0, 0, 1], 0, 0.78, 204, 'Fmaj9(#11)'),
              c([1, 3, 5, 0], [0, 0, 0, 1], 1960, 0.68, 220, 'G'),
              c([5, 0, 2, 1], [-1, 0, 0, 0], 4020, 0.62, 198, 'Dmadd4'),
              c([0, 2, 4, 6], [0, 0, 0, 0], 6180, 0.76, 212, 'Fmaj7')
            ]
          ),
          longer_pattern: p(
            'Gallery Horizon Pattern', 'Longer pattern',
            '8-step prime-proportioned F Lydian sequence echoing across wide cathedral gallery spans.',
            [
              s([0], [1], 0, 0.78, 190, 'F4'), s([1], [1], 790, 0.60, 180, 'G4'),
              s([3], [1], 1730, 0.68, 185, 'B4'), s([4], [1], 2830, 0.74, 195, 'C5'),
              s([6], [1], 4010, 0.62, 190, 'E5'), s([4], [1], 4990, 0.70, 185, 'C5'),
              s([2], [1], 6070, 0.58, 180, 'A4'), s([0], [1], 7330, 0.76, 205, 'F4')
            ],
            [
              s([0], [1], 0, 0.76, 190, 'F4'), s([4], [1], 830, 0.70, 180, 'C5'),
              s([3], [1], 1790, 0.64, 185, 'B4'), s([2], [1], 2930, 0.60, 195, 'A4'),
              s([1], [1], 4090, 0.66, 190, 'G4'), s([0], [1], 5090, 0.72, 185, 'F4'),
              s([6], [0], 6190, 0.56, 180, 'E4'), s([4], [0], 7430, 0.68, 205, 'C4')
            ]
          )
        }
      },

      apollo_shimmer: {
        presetId: 'apollo_shimmer',
        scaleId: 'airports_db',
        keyLabel: 'C Major',
        defaultPianoPhraseType: 'longer_pattern',
        defaultChordProgInstrument: 'pad',
        melodicFallbackType: 'longer_pattern',
        altChordInstrument: 'pad',
        chordRollMs: 152,
        chordVel: 0.70,
        defaultVariationChance: 0.60,
        defaultSkipChance: 0.16,
        defaultNoteGate: 0.24,
        defaultCompletionGate: 0.20,
        defaultNoteOctaveShiftChance: 0.03,
        defaultChordOctaveShiftChance: 0.10,
        trackChords: [
          { numeral: 'Imaj7', name: 'Cmaj7', degrees: [0, 2, 4, 6], octaves: [0, 0, 0, 0] },
          { numeral: 'vi7', name: 'Am7', degrees: [5, 0, 2, 4], octaves: [-1, 0, 0, 0] },
          { numeral: 'IVmaj7', name: 'Fmaj7', degrees: [3, 5, 0, 2], octaves: [0, 0, 1, 1] },
          { numeral: 'V7', name: 'G7', degrees: [4, 6, 1, 3], octaves: [0, 0, 1, 1] }
        ],
        phrases: {
          short_motif: p(
            'Lunar Horizon Cell', 'Short motif',
            'Zero-gravity ascending fifth motif in C Major giving the +12st/+24st shimmer cascade room to bloom.',
            [
              s([4], [1], 0, 0.76, 145, 'G4'), s([1], [1], 680, 0.62, 145, 'D4'),
              s([2], [1], 1520, 0.68, 155, 'E4'), s([0], [1], 2660, 0.78, 165, 'C4')
            ],
            [
              s([6], [1], 0, 0.72, 145, 'B4'), s([4], [1], 710, 0.66, 145, 'G4'),
              s([1], [1], 1580, 0.60, 155, 'D4'), s([0], [1], 2740, 0.76, 165, 'C4')
            ]
          ),
          chord_progression: p(
            'Weightless Floating Chords', 'Chord progression',
            'Expansive C Major-seventh pedal-steel chords blossoming into multi-octave shimmer reverb.',
            [
              c([0, 2, 4, 6], [0, 0, 0, 0], 0, 0.78, 148, 'Cmaj7'),
              c([5, 0, 2, 4], [-1, 0, 0, 0], 1560, 0.68, 162, 'Am7'),
              c([3, 5, 0, 2], [0, 0, 1, 1], 3280, 0.72, 154, 'Fmaj7'),
              c([4, 6, 1, 3], [0, 0, 1, 1], 5120, 0.66, 144, 'G7')
            ],
            [
              c([0, 2, 4, 1], [0, 0, 0, 1], 0, 0.76, 152, 'Cadd9'),
              c([5, 0, 2, 4], [-1, 0, 0, 0], 1620, 0.66, 166, 'Am7'),
              c([3, 5, 1, 2], [0, 0, 1, 1], 3380, 0.70, 150, 'Fadd9'),
              c([0, 2, 4, 6], [0, 0, 0, 0], 5240, 0.75, 146, 'Cmaj7')
            ]
          ),
          longer_pattern: p(
            'Tranquility Base Sequence', 'Longer pattern',
            '8-step weightless orbital piano arc with a suspended apogee hold at step 5.',
            [
              s([0, 4], [0, 1], 0, 0.80, 150, 'C3+G4'),
              s([1], [1], 590, 0.62, 135, 'D4'), s([2], [1], 1240, 0.68, 135, 'E4'),
              s([4], [1], 1960, 0.75, 145, 'G4'), s([5], [1], 3040, 0.64, 150, 'A4'),
              s([4], [1], 3720, 0.70, 140, 'G4'), s([2], [1], 4460, 0.58, 135, 'E4'),
              s([0], [1], 5480, 0.76, 155, 'C4')
            ],
            [
              s([0, 4], [0, 1], 0, 0.78, 150, 'C3+G4'),
              s([6], [1], 620, 0.60, 135, 'B4'), s([5], [1], 1290, 0.66, 135, 'A4'),
              s([4], [1], 2020, 0.72, 145, 'G4'), s([2], [1], 3120, 0.62, 150, 'E4'),
              s([1], [1], 3820, 0.56, 140, 'D4'), s([2], [1], 4580, 0.64, 135, 'E4'),
              s([0], [1], 5620, 0.74, 155, 'C4')
            ]
          )
        }
      },

      mixing_colours: {
        presetId: 'mixing_colours',
        scaleId: 'mixing_c',
        keyLabel: 'G Dorian',
        defaultPianoPhraseType: 'short_motif',
        defaultChordProgInstrument: 'pad',
        melodicFallbackType: 'short_motif',
        altChordInstrument: 'pad',
        chordRollMs: 72,
        chordVel: 0.55,
        defaultVariationChance: 0.52,
        defaultSkipChance: 0.14,
        defaultNoteGate: 0.20,
        defaultCompletionGate: 0.18,
        defaultNoteOctaveShiftChance: 0.03,
        defaultChordOctaveShiftChance: 0.10,
        trackChords: [
          { numeral: 'i7', name: 'Gm7', degrees: [0, 2, 4, 6], octaves: [0, 0, 0, 0] },
          { numeral: 'IV7', name: 'C7', degrees: [3, 5, 0, 2], octaves: [0, 0, 1, 1] },
          { numeral: '♭VII', name: 'F', degrees: [6, 1, 3, 5], octaves: [-1, 0, 0, 0] },
          { numeral: 'v7', name: 'Dm7', degrees: [4, 6, 1, 3], octaves: [0, 0, 1, 1] }
        ],
        phrases: {
          short_motif: p(
            'Winter Bell Cell', 'Short motif',
            'Intimate two-plus-two Roger Eno wool-felt piano miniature in nostalgic G Dorian (ppp-mp dynamics).',
            [
              s([0], [1], 0, 0.62, 68, 'G4'), s([2], [1], 470, 0.52, 68, 'B♭4'),
              s([1], [1], 1390, 0.48, 72, 'A4'), s([4], [0], 1910, 0.58, 76, 'D4')
            ],
            [
              s([0], [1], 0, 0.60, 68, 'G4'), s([6], [0], 490, 0.50, 68, 'F4'),
              s([2], [1], 1430, 0.54, 72, 'B♭4'), s([1], [1], 1970, 0.56, 76, 'A4')
            ]
          ),
          chord_progression: p(
            'Dorian Felt Chords', 'Chord progression',
            'Close-mic’d celeste-rail felt piano chords with gentle 68–84ms chamber rolls across Gm7, C7, F, and Dm7.',
            [
              c([0, 2, 4, 6], [0, 0, 0, 0], 0, 0.60, 68, 'Gm7'),
              c([3, 5, 0, 2], [0, 0, 1, 1], 1420, 0.52, 78, 'C7'),
              c([6, 1, 3, 5], [-1, 0, 0, 0], 2960, 0.48, 65, 'F'),
              c([4, 6, 1, 3], [0, 0, 1, 1], 4480, 0.56, 84, 'Dm7')
            ],
            [
              c([0, 2, 4, 1], [0, 0, 0, 1], 0, 0.58, 72, 'Gm9'),
              c([3, 5, 0, 2], [0, 0, 1, 1], 1480, 0.50, 82, 'C7'),
              c([6, 1, 3, 0], [-1, 0, 0, 1], 3040, 0.48, 68, 'Fadd9'),
              c([0, 2, 4, 6], [0, 0, 0, 0], 4560, 0.58, 76, 'Gm7')
            ]
          ),
          longer_pattern: p(
            'Mist & Memory Sequence', 'Longer pattern',
            '7-step lyrical Roger Eno felt piano chamber miniature with intimate breathing pauses.',
            [
              s([0], [1], 0, 0.62, 68, 'G4'), s([1], [1], 490, 0.50, 68, 'A4'),
              s([2], [1], 1010, 0.56, 72, 'B♭4'), s([4], [1], 1820, 0.60, 75, 'D5'),
              s([3], [1], 2380, 0.52, 70, 'C5'), s([1], [1], 2960, 0.48, 68, 'A4'),
              s([0], [1], 3810, 0.58, 78, 'G4')
            ],
            [
              s([4], [0], 0, 0.58, 68, 'D4'), s([0], [1], 510, 0.60, 68, 'G4'),
              s([1], [1], 1050, 0.48, 72, 'A4'), s([2], [1], 1870, 0.54, 75, 'B♭4'),
              s([5], [1], 2440, 0.52, 70, 'E5'), s([4], [1], 3030, 0.56, 68, 'D5'),
              s([2], [1], 3890, 0.50, 78, 'B♭4')
            ]
          )
        }
      },

      discreet_loops: {
        presetId: 'discreet_loops',
        scaleId: 'onland_f',
        keyLabel: 'D Aeolian',
        defaultPianoPhraseType: 'short_motif',
        defaultChordProgInstrument: 'tape',
        melodicFallbackType: 'short_motif',
        altChordInstrument: 'tape',
        chordRollMs: 136,
        chordVel: 0.66,
        defaultVariationChance: 0.55,
        defaultSkipChance: 0.15,
        defaultNoteGate: 0.22,
        defaultCompletionGate: 0.18,
        defaultNoteOctaveShiftChance: 0.03,
        defaultChordOctaveShiftChance: 0.10,
        trackChords: [
          { numeral: 'i7', name: 'Dm7', degrees: [0, 2, 4, 6], octaves: [0, 0, 0, 0] },
          { numeral: '♭VI', name: 'B♭', degrees: [5, 0, 2, 4], octaves: [-1, 0, 0, 0] },
          { numeral: '♭III', name: 'F', degrees: [2, 4, 6, 1], octaves: [0, 0, 0, 1] },
          { numeral: '♭VII', name: 'C', degrees: [6, 1, 3, 5], octaves: [-1, 0, 0, 0] }
        ],
        phrases: {
          short_motif: p(
            'Discreet Tape Fragment', 'Short motif',
            '4-note 1975 Discreet Music motif locked to 610ms/1220ms twin-Revox tape-delay subdivisions in D Aeolian.',
            [
              s([0], [1], 0, 0.72, 125, 'D4'), s([2], [1], 610, 0.60, 125, 'F4'),
              s([4], [1], 1220, 0.66, 135, 'A4'), s([1], [1], 2440, 0.56, 145, 'E4')
            ],
            [
              s([0], [1], 0, 0.70, 125, 'D4'), s([5], [0], 610, 0.58, 125, 'B♭3'),
              s([2], [1], 1830, 0.64, 135, 'F4'), s([4], [1], 2440, 0.68, 145, 'A4')
            ]
          ),
          chord_progression: p(
            'Moss & Tape Chords', 'Chord progression',
            'Somber resonant D Aeolian triads locked to multiples of the 1.22s (1220ms) Revox sound-on-sound tape loop.',
            [
              c([0, 2, 4, 6], [0, 0, 0, 0], 0, 0.72, 128, 'Dm7'),
              c([5, 0, 2, 4], [-1, 0, 0, 0], 1220, 0.64, 142, 'B♭'),
              c([2, 4, 6, 1], [0, 0, 0, 1], 2440, 0.60, 132, 'F'),
              c([6, 1, 3, 5], [-1, 0, 0, 0], 3660, 0.68, 148, 'C')
            ],
            [
              c([0, 2, 4, 1], [0, 0, 0, 1], 0, 0.70, 132, 'Dm9'),
              c([5, 0, 2, 4], [-1, 0, 0, 0], 1220, 0.62, 146, 'B♭'),
              c([2, 4, 6, 0], [0, 0, 0, 1], 2440, 0.58, 128, 'Fmaj7'),
              c([0, 2, 4, 6], [0, 0, 0, 0], 3660, 0.68, 138, 'Dm7')
            ]
          ),
          longer_pattern: p(
            'Earth & Overgrowth Arc', 'Longer pattern',
            '7-step dark D Aeolian sequence locked to 610ms/1220ms Revox capstan delay subdivisions.',
            [
              s([0], [1], 0, 0.72, 125, 'D4'), s([1], [1], 610, 0.58, 125, 'E4'),
              s([2], [1], 1220, 0.64, 130, 'F4'), s([4], [1], 1830, 0.70, 135, 'A4'),
              s([3], [1], 3050, 0.60, 130, 'G4'), s([1], [1], 3660, 0.56, 125, 'E4'),
              s([0], [1], 4880, 0.68, 140, 'D4')
            ],
            [
              s([4], [0], 0, 0.68, 125, 'A3'), s([0], [1], 610, 0.72, 125, 'D4'),
              s([2], [1], 1220, 0.62, 130, 'F4'), s([5], [1], 2440, 0.58, 135, 'B♭4'),
              s([4], [1], 3050, 0.66, 130, 'A4'), s([2], [1], 3660, 0.60, 125, 'F4'),
              s([0], [1], 4880, 0.70, 140, 'D4')
            ]
          )
        }
      }
    };
  }

  const patterns = getPatterns();
  if (typeof window !== 'undefined') {
    window.ENO_PHRASE_PATTERNS = patterns;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { patterns };
  }
})();
