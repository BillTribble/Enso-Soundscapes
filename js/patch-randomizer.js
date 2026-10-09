/**
 * Brian Eno Soundscape Generator — Modal Circle-of-Fifths Patch Randomizer
 * Generates continuous harmonic stations along the Circle of Fifths with shared modal pitch-classes,
 * mutually prime voice cycles, and Harold Budd / Roger Eno generative piano phrases.
 */
'use strict';

(function () {
  const NOTE_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
  const FIFTHS_MAP = { 0: 0, 7: 1, 2: 2, 9: 3, 4: 4, 11: 5, 6: 6, 1: -5, 8: -4, 3: -3, 10: -2, 5: -1 };

  const MODAL_TEMPLATES = {
    'Lydian': { intervals: [0, 2, 4, 6, 7, 9, 11], fifthsOffset: 1, degrees: ['Root (1)', 'Maj 2nd (9)', 'Maj 3rd', 'Aug 4th (#11)', 'Perfect 5th', 'Maj 6th (13)', 'Maj 7th'] },
    'Major (Ionian)': { intervals: [0, 2, 4, 5, 7, 9, 11], fifthsOffset: 0, degrees: ['Root (1)', 'Maj 2nd (9)', 'Maj 3rd', 'Perf 4th', 'Perfect 5th', 'Maj 6th (13)', 'Maj 7th'] },
    'Mixolydian': { intervals: [0, 2, 4, 5, 7, 9, 10], fifthsOffset: -1, degrees: ['Root (1)', 'Maj 2nd (9)', 'Maj 3rd', 'Perf 4th', 'Perfect 5th', 'Maj 6th (13)', 'Min 7th (b7)'] },
    'Dorian': { intervals: [0, 2, 3, 5, 7, 9, 10], fifthsOffset: -2, degrees: ['Root (1)', 'Maj 2nd (9)', 'Min 3rd (b3)', 'Perf 4th', 'Perfect 5th', 'Maj 6th (13)', 'Min 7th (b7)'] },
    'Aeolian': { intervals: [0, 2, 3, 5, 7, 8, 10], fifthsOffset: -3, degrees: ['Root (1)', 'Maj 2nd (9)', 'Min 3rd (b3)', 'Perf 4th', 'Perfect 5th', 'Min 6th (b6)', 'Min 7th (b7)'] }
  };

  const THEMATIC_NAMES = [
    'Amber Conservatory', 'Prism & Vapour', 'Celestial Vault', 'Silk & Dew',
    'Velvet Astrolabe', 'Glass Pavilion', 'Cedar & Dusk', 'Halcyon Tide',
    'Solar Cloister', 'Fern & Oxide', 'Opal Horizon', 'Chalk & Ember',
    'Quiet Veranda', 'Lichen & Tape', 'Tidal Lantern', 'Shadowed Nave',
    'Obsidian Pool', 'Golden Pergola', 'Rain on Slate', 'Silver Cloister',
    'Mist & Ivories', 'Warm Limestone', 'Dusk & Copper', 'Starlit Arcade',
    'Phosphor Grove', 'Marble & Moss', 'Porcelain Drift', 'Copper Solarium',
    'Canyon & Reed', 'Ember Archway', 'Saffron Mirage', 'Alabaster Fount'
  ];

  const NOUNS = ['Sanctuary', 'Colonnade', 'Observatory', 'Orchard', 'Lagoon', 'Belfry', 'Plateau', 'Glade', 'Hedge', 'Terrace', 'Sanctum', 'Chapel', 'Meadow', 'Canopy'];
  const MODIFIERS = ['Quiet', 'Indigo', 'Misted', 'Dormant', 'Liminal', 'Solar', 'Aeolian', 'Luminous', 'Verdant', 'Gilded', 'Silent', 'Nocturne', 'Seraphic'];

  let pendingDeletePatchId = null;

  function getApp() {
    return window.enoApp || null;
  }

  const MODE_PROGRESSIONS = {
    'Lydian': [
      [{ degs: [0, 2, 4, 6], octs: [0, 0, 0, 1], rootDeg: 0, num: 'Imaj7', suf: 'maj7' }, { degs: [1, 3, 5, 0], octs: [0, 0, 0, 1], rootDeg: 1, num: 'II7', suf: '7' }, { degs: [4, 6, 1, 3], octs: [0, 0, 1, 1], rootDeg: 4, num: 'Vmaj7', suf: 'maj7' }, { degs: [6, 1, 3, 5], octs: [0, 1, 1, 1], rootDeg: 6, num: 'VII#m', suf: 'm7b5' }],
      [{ degs: [0, 2, 4, 6], octs: [0, 0, 0, 1], rootDeg: 0, num: 'Imaj9', suf: 'maj9' }, { degs: [4, 6, 1, 3], octs: [0, 0, 1, 1], rootDeg: 4, num: 'Vmaj7', suf: 'maj7' }, { degs: [1, 3, 5, 0], octs: [0, 0, 0, 1], rootDeg: 1, num: 'II9', suf: '9' }, { degs: [0, 2, 4, 6], octs: [0, 0, 0, 1], rootDeg: 0, num: 'Imaj7', suf: 'maj7' }],
      [{ degs: [1, 3, 5, 0], octs: [0, 0, 0, 1], rootDeg: 1, num: 'II', suf: '' }, { degs: [0, 2, 4, 6], octs: [0, 0, 0, 1], rootDeg: 0, num: 'Imaj7', suf: 'maj7' }, { degs: [5, 0, 2, 4], octs: [0, 1, 1, 1], rootDeg: 5, num: 'VI-7', suf: 'm7' }, { degs: [1, 3, 5, 0], octs: [0, 0, 0, 1], rootDeg: 1, num: 'II7sus4', suf: '7sus4' }]
    ],
    'Mixolydian': [
      [{ degs: [0, 2, 4, 6], octs: [0, 0, 0, 1], rootDeg: 0, num: 'I7', suf: '7' }, { degs: [6, 1, 3, 5], octs: [0, 1, 1, 1], rootDeg: 6, num: 'bVII', suf: 'maj7' }, { degs: [3, 5, 0, 2], octs: [0, 0, 1, 1], rootDeg: 3, num: 'IVmaj7', suf: 'maj7' }, { degs: [0, 2, 4, 6], octs: [0, 0, 0, 1], rootDeg: 0, num: 'Isus4', suf: 'sus4' }],
      [{ degs: [0, 2, 4, 6], octs: [0, 0, 0, 1], rootDeg: 0, num: 'I', suf: 'add9' }, { degs: [4, 6, 1, 3], octs: [0, 0, 1, 1], rootDeg: 4, num: 'Vm7', suf: 'm7' }, { degs: [6, 1, 3, 5], octs: [0, 1, 1, 1], rootDeg: 6, num: 'bVII', suf: '' }, { degs: [3, 5, 0, 2], octs: [0, 0, 1, 1], rootDeg: 3, num: 'IV', suf: 'maj9' }],
      [{ degs: [3, 5, 0, 2], octs: [0, 0, 1, 1], rootDeg: 3, num: 'IV', suf: '6' }, { degs: [6, 1, 3, 5], octs: [0, 1, 1, 1], rootDeg: 6, num: 'bVII', suf: 'sus2' }, { degs: [0, 2, 4, 6], octs: [0, 0, 0, 1], rootDeg: 0, num: 'I7', suf: '7' }, { degs: [4, 6, 1, 3], octs: [0, 0, 1, 1], rootDeg: 4, num: 'Vm', suf: 'm' }]
    ],
    'Major (Ionian)': [
      [{ degs: [0, 2, 4, 6], octs: [0, 0, 0, 1], rootDeg: 0, num: 'Imaj7', suf: 'maj7' }, { degs: [5, 0, 2, 4], octs: [0, 1, 1, 1], rootDeg: 5, num: 'VIm7', suf: 'm7' }, { degs: [3, 5, 0, 2], octs: [0, 0, 1, 1], rootDeg: 3, num: 'IVmaj7', suf: 'maj7' }, { degs: [4, 6, 1, 3], octs: [0, 0, 1, 1], rootDeg: 4, num: 'V7', suf: '7' }],
      [{ degs: [0, 2, 4, 6], octs: [0, 0, 0, 1], rootDeg: 0, num: 'I', suf: 'maj9' }, { degs: [3, 5, 0, 2], octs: [0, 0, 1, 1], rootDeg: 3, num: 'IV', suf: 'maj7' }, { degs: [1, 3, 5, 0], octs: [0, 0, 0, 1], rootDeg: 1, num: 'IIm7', suf: 'm7' }, { degs: [4, 6, 1, 3], octs: [0, 0, 1, 1], rootDeg: 4, num: 'Vsus4', suf: 'sus4' }],
      [{ degs: [5, 0, 2, 4], octs: [0, 1, 1, 1], rootDeg: 5, num: 'VIm', suf: 'm9' }, { degs: [3, 5, 0, 2], octs: [0, 0, 1, 1], rootDeg: 3, num: 'IV', suf: 'maj7' }, { degs: [0, 2, 4, 6], octs: [0, 0, 0, 1], rootDeg: 0, num: 'I', suf: 'maj7' }, { degs: [4, 6, 1, 3], octs: [0, 0, 1, 1], rootDeg: 4, num: 'V', suf: '' }]
    ],
    'Dorian': [
      [{ degs: [0, 2, 4, 6], octs: [0, 0, 0, 1], rootDeg: 0, num: 'Im7', suf: 'm7' }, { degs: [3, 5, 0, 2], octs: [0, 0, 1, 1], rootDeg: 3, num: 'IV7', suf: '7' }, { degs: [6, 1, 3, 5], octs: [0, 1, 1, 1], rootDeg: 6, num: 'bVII', suf: 'maj7' }, { degs: [0, 2, 4, 6], octs: [0, 0, 0, 1], rootDeg: 0, num: 'Im9', suf: 'm9' }],
      [{ degs: [0, 2, 4, 6], octs: [0, 0, 0, 1], rootDeg: 0, num: 'Im', suf: 'm' }, { degs: [1, 3, 5, 0], octs: [0, 0, 0, 1], rootDeg: 1, num: 'IIm7', suf: 'm7' }, { degs: [3, 5, 0, 2], octs: [0, 0, 1, 1], rootDeg: 3, num: 'IV', suf: '6' }, { degs: [6, 1, 3, 5], octs: [0, 1, 1, 1], rootDeg: 6, num: 'bVII', suf: '' }],
      [{ degs: [3, 5, 0, 2], octs: [0, 0, 1, 1], rootDeg: 3, num: 'IV7', suf: '7' }, { degs: [0, 2, 4, 6], octs: [0, 0, 0, 1], rootDeg: 0, num: 'Im7', suf: 'm7' }, { degs: [4, 6, 1, 3], octs: [0, 0, 1, 1], rootDeg: 4, num: 'Vm7', suf: 'm7' }, { degs: [6, 1, 3, 5], octs: [0, 1, 1, 1], rootDeg: 6, num: 'bVII', suf: 'maj7' }]
    ],
    'Aeolian': [
      [{ degs: [0, 2, 4, 6], octs: [0, 0, 0, 1], rootDeg: 0, num: 'Im7', suf: 'm7' }, { degs: [5, 0, 2, 4], octs: [0, 1, 1, 1], rootDeg: 5, num: 'bVI', suf: 'maj7' }, { degs: [2, 4, 6, 1], octs: [0, 0, 1, 1], rootDeg: 2, num: 'bIII', suf: 'maj7' }, { degs: [6, 1, 3, 5], octs: [0, 1, 1, 1], rootDeg: 6, num: 'bVII', suf: '7' }],
      [{ degs: [0, 2, 4, 6], octs: [0, 0, 0, 1], rootDeg: 0, num: 'Im', suf: 'm9' }, { degs: [3, 5, 0, 2], octs: [0, 0, 1, 1], rootDeg: 3, num: 'IVm7', suf: 'm7' }, { degs: [4, 6, 1, 3], octs: [0, 0, 1, 1], rootDeg: 4, num: 'Vm7', suf: 'm7' }, { degs: [5, 0, 2, 4], octs: [0, 1, 1, 1], rootDeg: 5, num: 'bVI', suf: 'maj7' }],
      [{ degs: [5, 0, 2, 4], octs: [0, 1, 1, 1], rootDeg: 5, num: 'bVI', suf: 'maj7' }, { degs: [6, 1, 3, 5], octs: [0, 1, 1, 1], rootDeg: 6, num: 'bVII', suf: '' }, { degs: [0, 2, 4, 6], octs: [0, 0, 0, 1], rootDeg: 0, num: 'Im7', suf: 'm7' }, { degs: [0, 2, 4, 6], octs: [0, 0, 0, 1], rootDeg: 0, num: 'Isus2', suf: 'sus2' }]
    ]
  };

  const MOTIF_CONTOURS = [
    { name: 'Falling Pastoral', p: [4, 2, 1, 0], v: [4, 5, 2, 0], d: [0, 560, 1140, 1720] },
    { name: 'Luminous Arch', p: [0, 3, 4, 1], v: [1, 4, 5, 2], d: [0, 520, 1080, 1640] },
    { name: 'Cathedral Rise', p: [0, 2, 3, 4], v: [2, 4, 5, 6], d: [0, 540, 1100, 1680] },
    { name: 'Lunar Turn', p: [4, 1, 2, 0], v: [5, 2, 3, 1], d: [0, 580, 1160, 1740] },
    { name: 'Dorian Miniature', p: [0, 2, 1, 4], v: [2, 3, 2, 0], d: [0, 530, 1090, 1650] },
    { name: 'Tape Fragment', p: [0, 2, 4, 1], v: [4, 1, 0, 2], d: [0, 550, 1120, 1700] }
  ];

  const BUDD_CASCADES = [
    { p: [2, 4, 1, 5, 0, 3, 2], v: [0, 2, 5, 1, 4, 2, 0], po: [1, 0, 1, 0, 1, 0, 0], vo: [1, 0, 0, 1, 1, 1, 0], step: 440 },
    { p: [1, 3, 5, 2, 4, 1, 0], v: [2, 4, 6, 3, 5, 2, 1], po: [1, 1, 0, 1, 0, 1, 0], vo: [1, 0, 1, 0, 1, 1, 0], step: 460 },
    { p: [4, 2, 5, 1, 3, 0, 2], v: [5, 3, 4, 2, 1, 0, 4], po: [0, 1, 0, 1, 1, 1, 0], vo: [1, 1, 0, 1, 0, 0, 0], step: 430 },
    { p: [0, 2, 4, 6, 1, 3, 5], v: [1, 3, 5, 0, 2, 4, 2], po: [1, 1, 1, 0, 1, 1, 0], vo: [1, 1, 0, 1, 0, 0, 0], step: 450 },
    { p: [3, 1, 4, 2, 0, 5, 1], v: [4, 2, 5, 3, 1, 0, 2], po: [0, 1, 0, 1, 1, 0, 1], vo: [0, 1, 1, 1, 0, 0, 1], step: 470 },
    { p: [5, 4, 2, 1, 3, 0, 4], v: [6, 5, 3, 2, 4, 1, 0], po: [0, 0, 1, 1, 0, 1, 0], vo: [0, 1, 1, 0, 1, 0, 0], step: 435 }
  ];

  function getSharedPitchClasses(scaleA, scaleB) {
    const rootA = typeof scaleA.rootMidi === 'number' ? scaleA.rootMidi : 55;
    const rootB = typeof scaleB.rootMidi === 'number' ? scaleB.rootMidi : 55;
    const setA = new Set(scaleA.intervals.map((iv) => ((rootA + iv) % 12 + 12) % 12));
    const setB = new Set(scaleB.intervals.map((iv) => ((rootB + iv) % 12 + 12) % 12));
    return [...setA].filter((pc) => setB.has(pc));
  }

  function getNextCircleStation(lastPreset) {
    const scales = window.ENO_DATA?.SCALES || {};
    const lastScale = scales[lastPreset?.scale] || scales.thursday_g || { rootMidi: 55, keySigFifths: 0, intervals: [0, 2, 4, 5, 7, 9, 10] };
    const prevPc = ((lastScale.rootMidi % 12) + 12) % 12;
    const prevFifths = typeof lastScale.keySigFifths === 'number' ? lastScale.keySigFifths : 0;

    // Step tonic root by a Perfect 4th (+5 semitones on Circle of Fifths: D -> G -> C -> F -> Bb ...)
    const nextPc = (prevPc + 5) % 12;
    const nextTonic = NOTE_NAMES[nextPc];
    const rootMidi = 48 + nextPc; // Baritone octave 48..59

    // Collect all valid modal candidates sharing >= 6 pitch classes with previous station
    const validModes = [];
    const modeCandidates = ['Lydian', 'Mixolydian', 'Major (Ionian)', 'Dorian', 'Aeolian'];
    for (const mName of modeCandidates) {
      const tmpl = MODAL_TEMPLATES[mName];
      const baseFifths = FIFTHS_MAP[nextPc] ?? 0;
      const parentFifths = baseFifths + tmpl.fifthsOffset;
      const delta = Math.abs(parentFifths - prevFifths);
      const testScale = { rootMidi, intervals: tmpl.intervals };
      const shared = getSharedPitchClasses(lastScale, testScale).length;
      if (shared >= 6) {
        validModes.push({ name: mName, delta, shared, tmpl, parentFifths });
      }
    }
    validModes.sort((a, b) => a.delta - b.delta);
    const chosenMode = validModes[Math.floor(Math.random() * Math.min(validModes.length, 2))] || validModes[0] || {
      name: 'Mixolydian', delta: 0, shared: 6, tmpl: MODAL_TEMPLATES.Mixolydian, parentFifths: 0
    };

    const bestModeName = chosenMode.name;
    const modeInfo = chosenMode.tmpl;
    const parentFifths = chosenMode.parentFifths;
    const tonicSlug = nextTonic.toLowerCase().replace('#', 's');
    const modeSlug = bestModeName.toLowerCase().replace(/[^a-z]/g, '');
    const scaleId = `circle_${tonicSlug}_${modeSlug}_${Date.now().toString(36).slice(-4)}`;

    const sharpsOrFlats = parentFifths > 0 ? `${parentFifths}♯` : parentFifths < 0 ? `${Math.abs(parentFifths)}♭` : '0♯/0♭';
    const parentKeySignature = `${NOTE_NAMES[((parentFifths * 7) % 12 + 12) % 12]} Major (${sharpsOrFlats})`;
    const keyLabel = `${nextTonic} ${bestModeName}`;

    const scaleObj = {
      id: scaleId,
      name: `${keyLabel} (${sharpsOrFlats})`,
      album: 'Circle Station',
      tonic: nextTonic,
      modeName: bestModeName,
      parentKeySignature,
      keySigFifths: parentFifths,
      keyLabel,
      rootMidi,
      circleStepToNext: `P4 tonic (${nextTonic} → ${NOTE_NAMES[(nextPc + 5) % 12]}) · ${chosenMode.shared}/7 shared notes`,
      intervals: [...modeInfo.intervals],
      degreeNames: [...modeInfo.degrees],
      defaultWeights: [0.92, 0.76, 0.65, 0.35, 0.84, 0.55, 0.42],
      description: `Generative ${keyLabel} soundscape station with ${chosenMode.shared}/7 harmonic overlap.`
    };

    if (!window.ENO_DATA.SCALES) window.ENO_DATA.SCALES = {};
    window.ENO_DATA.SCALES[scaleId] = scaleObj;
    return scaleObj;
  }

  function generateThematicPatchName(modeName) {
    const existing = new Set(Object.values(window.ENO_DATA?.PRESETS || {}).map((p) => (p.name || '').toLowerCase()));
    for (const name of THEMATIC_NAMES) {
      if (!existing.has(name.toLowerCase())) return name;
    }
    for (const mod of MODIFIERS) {
      for (const noun of NOUNS) {
        const combo = `${mod} ${noun}`;
        if (!existing.has(combo.toLowerCase())) return combo;
      }
    }
    return `Soundscape Station ${Date.now().toString(36).toUpperCase().slice(-4)}`;
  }

  function generateTrackPattern(patchId, scaleObj, patchName) {
    const root = scaleObj.rootMidi;
    const ivs = scaleObj.intervals;
    const toName = (m) => window.ENO_DATA?.midiToNoteName?.(m) || 'C4';
    const dMidi = (deg, oct = 0) => root + (ivs[deg % ivs.length] || 0) + (oct * 12) + (Math.floor(deg / ivs.length) * 12);
    const chordLabel = (rootDeg, suf) => `${NOTE_NAMES[((root + ivs[rootDeg]) % 12 + 12) % 12]}${suf}`;

    const progList = MODE_PROGRESSIONS[scaleObj.modeName] || MODE_PROGRESSIONS['Mixolydian'];
    const chosenProg = progList[Math.floor(Math.random() * progList.length)];
    const trackChords = chosenProg.map((c) => ({
      degrees: [...c.degs],
      octaves: [...c.octs],
      rootDeg: c.rootDeg,
      numeral: c.num,
      name: chordLabel(c.rootDeg, c.suf)
    }));

    const motifTmpl = MOTIF_CONTOURS[Math.floor(Math.random() * MOTIF_CONTOURS.length)];
    const shortPrimary = motifTmpl.p.map((deg, i) => ({
      degrees: [deg], octaves: [deg < 2 ? 1 : 0], delayMs: motifTmpl.d[i], vel: 0.72 - (i * 0.02), label: toName(dMidi(deg, deg < 2 ? 1 : 0))
    }));
    const shortVariant = motifTmpl.v.map((deg, i) => ({
      degrees: [deg], octaves: [deg < 3 ? 1 : 0], delayMs: motifTmpl.d[i], vel: 0.70 - (i * 0.02), label: toName(dMidi(deg, deg < 3 ? 1 : 0))
    }));

    const chordPrimary = trackChords.map((tc, i) => ({
      degrees: [...tc.degrees], octaves: [...tc.octaves], delayMs: i * 1220, vel: 0.71, rollMs: 37, label: tc.name
    }));
    const chordVariant = trackChords.map((tc, i) => ({
      degrees: [tc.degrees[0], tc.degrees[1], tc.degrees[3]], octaves: [tc.octaves[0], tc.octaves[1] + 1, tc.octaves[3]],
      delayMs: i * 1220, vel: 0.68, rollMs: 35, label: `${tc.name}(add9)`
    }));

    const cascadeTmpl = BUDD_CASCADES[Math.floor(Math.random() * BUDD_CASCADES.length)];
    const longPrimary = [
      { degrees: [0, 4], octaves: [0, 1], delayMs: 0, vel: 0.77, label: `${toName(dMidi(0, 0))}+${toName(dMidi(4, 1))}` },
      ...cascadeTmpl.p.map((deg, i) => ({
        degrees: [deg], octaves: [cascadeTmpl.po[i]], delayMs: cascadeTmpl.step * (i + 1), vel: 0.69 - (i * 0.01), label: toName(dMidi(deg, cascadeTmpl.po[i]))
      }))
    ];
    const longVariant = [
      { degrees: [4, 1], octaves: [0, 1], delayMs: 0, vel: 0.75, label: `${toName(dMidi(4, 0))}+${toName(dMidi(1, 1))}` },
      ...cascadeTmpl.v.map((deg, i) => ({
        degrees: [deg], octaves: [cascadeTmpl.vo[i]], delayMs: cascadeTmpl.step * (i + 1), vel: 0.67 - (i * 0.01), label: toName(dMidi(deg, cascadeTmpl.vo[i]))
      }))
    ];

    return {
      presetId: patchId,
      scaleId: scaleObj.id,
      keyLabel: scaleObj.keyLabel,
      defaultPianoPhraseType: 'longer_pattern',
      defaultChordProgInstrument: 'choir',
      melodicFallbackType: 'longer_pattern',
      altChordInstrument: 'choir',
      phraseLengthLfo: { enabled: true, periodSec: 180, minRatio: 0.50, maxRatio: 1.00 },
      defaultVariationChance: 0.55,
      defaultSkipChance: 0.15,
      defaultNoteGate: 0.22,
      defaultCompletionGate: 0.18,
      defaultNoteOctaveShiftChance: 0.03,
      defaultChordOctaveShiftChance: 0.10,
      trackChords,
      phrases: {
        short_motif: { name: `${motifTmpl.name}`, typeLabel: '4-step contour', description: 'Consonant modal melody.', primarySteps: shortPrimary, variantSteps: shortVariant },
        chord_progression: { name: 'Harmonic Motion', typeLabel: '4 rolled chords', description: 'Slow ambient harmony.', primarySteps: chordPrimary, variantSteps: chordVariant },
        longer_pattern: { name: `${patchName} Cascade`, typeLabel: '8-step Harold Budd cascade', description: 'Cascading modal piano sequence.', primarySteps: longPrimary, variantSteps: longVariant }
      }
    };
  }

  function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function rndRange(min, max, dec = 2) {
    const val = min + Math.random() * (max - min);
    return Number(val.toFixed(dec));
  }

  function randomizeAndAppendPatch() {
    const app = getApp();
    if (!app) return null;

    const allPresets = Object.values(window.ENO_DATA?.PRESETS || {});
    const lastPreset = allPresets[allPresets.length - 1] || null;
    const scaleObj = getNextCircleStation(lastPreset);
    const patchName = generateThematicPatchName(scaleObj.modeName);
    const patchId = 'custom_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6);

    const trackPattern = generateTrackPattern(patchId, scaleObj, patchName);
    if (app.phraseEngine?.TRACK_PATTERNS) {
      app.phraseEngine.TRACK_PATTERNS[patchId] = trackPattern;
    }

    const primePiano = [5.3, 6.1, 6.7, 7.3, 7.9, 8.9, 9.7, 11.3];
    const primeBell = [11.3, 12.7, 13.1, 14.9, 17.1];
    const primeTape = [8.9, 9.7, 13.7, 16.3, 17.9, 19.9];
    const primePad = [13.9, 17.3, 19.1, 21.1, 23.3];
    const primeChoir = [10.7, 19.7, 23.1, 23.9, 27.7, 31.7];
    const primeDrone = [19.3, 29.3, 31.1, 37.3, 37.9, 43.1];

    const pianoGain = 2.00;
    const padGain = app.globalVoiceGains?.pad ?? 0.68;
    const bellGain = app.globalVoiceGains?.bell ?? 0.50;
    const choirGain = app.globalVoiceGains?.choir ?? 0.58;
    const tapeGain = app.globalVoiceGains?.tape ?? 0.62;
    const droneGain = app.globalVoiceGains?.drone ?? 0.66;
    const xf = typeof app.globalVoiceBalance === 'number' ? app.globalVoiceBalance : -0.62;

    const phraseTypes = ['longer_pattern', 'chord_progression', 'short_motif'];
    const chosenPhraseType = pickRandom(phraseTypes);
    const chordInst = chosenPhraseType === 'chord_progression' ? 'piano' : pickRandom(['choir', 'pad', 'tape']);
    const hues = ['teal', 'blue', 'purple', 'orange', 'green', 'yellow'];
    const badgeHue = pickRandom(hues);

    const newPreset = {
      id: patchId,
      name: patchName,
      custom: true,
      isUserPatch: true,
      year: new Date().getFullYear().toString(),
      album: 'Circle of Fifths',
      badgeHue,
      summary: `Circle of Fifths station in ${scaleObj.keyLabel} (${scaleObj.parentKeySignature}).`,
      scale: scaleObj.id,
      scaleObj,
      keyLabel: scaleObj.keyLabel,
      circadian: pickRandom(['morning', 'afternoon', 'dusk', 'night']),
      global: {
        attack: rndRange(2.8, 5.5, 1), release: rndRange(6.8, 11.8, 1), sustain: rndRange(0.65, 0.76, 2), masterVolume: 0.84,
        cutoff: Math.round(rndRange(1650, 2400, 0)), resonance: rndRange(1.0, 1.8, 1), filterDrift: 0.22, filterType: 'lowpass', envelopeMode: 'override',
        reverbMix: rndRange(0.48, 0.68, 2), reverbShimmer: rndRange(0.12, 0.38, 2), reverbDecay: rndRange(8.5, 15.0, 1), reverbDamping: 5800,
        delayMix: rndRange(0.30, 0.45, 2), delayTime: 0.84, delayFeedback: 0.54, delayWow: 0.16,
        pianoCrossfade: xf
      },
      probability: {
        activeVoiceCount: 6, rotationSpeed: 1.0, globalProb: rndRange(0.58, 0.66, 2),
        voiceOrder: ['pad', 'piano', 'bell', 'choir', 'tape', 'drone'],
        densityBias: 0.05, mutationRate: 0.10, timeStretch: 1.0,
        degreeWeights: scaleObj.defaultWeights
      },
      voices: {
        piano: { prob: 0.65, cycle: pickRandom(primePiano), gain: pianoGain, release: 4.5, octave: 0, octaveShiftProb: 0.10, noteOctaveShiftProb: 0.03, chordOctaveShiftProb: 0.10, muted: false },
        pad: { prob: 0.60, cycle: pickRandom(primePad), gain: padGain, release: rndRange(7.5, 10.5, 1), octave: 0, octaveShiftProb: 0.10, noteOctaveShiftProb: 0.03, chordOctaveShiftProb: 0.10, muted: false },
        bell: { prob: 0.48, cycle: pickRandom(primeBell), gain: bellGain, release: rndRange(4.5, 6.0, 1), octave: 1, octaveShiftProb: 0.12, noteOctaveShiftProb: 0.03, chordOctaveShiftProb: 0.10, muted: false },
        choir: { prob: 0.55, cycle: pickRandom(primeChoir), gain: choirGain, release: rndRange(8.5, 11.5, 1), octave: 1, octaveShiftProb: 0.10, noteOctaveShiftProb: 0.03, chordOctaveShiftProb: 0.10, muted: false },
        tape: { prob: 0.58, cycle: pickRandom(primeTape), gain: tapeGain, release: rndRange(5.5, 7.5, 1), octave: 0, octaveShiftProb: 0.10, noteOctaveShiftProb: 0.03, chordOctaveShiftProb: 0.10, muted: false },
        drone: { prob: 0.62, cycle: pickRandom(primeDrone), gain: droneGain, release: rndRange(10.0, 13.0, 1), octave: -1, octaveShiftProb: 0.08, noteOctaveShiftProb: 0.02, chordOctaveShiftProb: 0.08, muted: false }
      },
      pianoPhraseType: chosenPhraseType,
      chordProgInstrument: chordInst,
      phraseParams: {
        phraseVariationChance: 0.55, phraseSkipChance: 0.15, phraseNoteGate: 0.22,
        phraseCompletionGate: 0.18, phraseGateProb: 0.78, phraseLoopCycle: 7.9,
        noteOctaveShiftChance: 0.03, chordOctaveShiftChance: 0.10, chordProgGate: 0.75, chordProgCycle: 17.3
      }
    };

    if (!window.ENO_DATA.PRESETS) window.ENO_DATA.PRESETS = {};
    window.ENO_DATA.PRESETS[patchId] = newPreset;

    window.enoPatchStorage?.registerCustomPatch?.(newPreset, trackPattern);

    if (typeof app.renderPresetsAndSelects === 'function') {
      app.renderPresetsAndSelects();
    }
    app.applyPreset(patchId, true);

    return patchId;
  }

  function promptDeleteUserPatch(patchId) {
    const preset = window.ENO_DATA?.PRESETS?.[patchId];
    if (!preset) return;

    pendingDeletePatchId = patchId;
    const backdrop = document.getElementById('delete-patch-modal-backdrop');
    const msg = document.getElementById('delete-patch-modal-message');

    if (msg) {
      msg.textContent = `Are you sure you want to delete "${preset.name}"? This action removes the custom patch and its melodic patterns.`;
    }
    if (backdrop) {
      backdrop.classList.add('is-open');
      backdrop.setAttribute('aria-hidden', 'false');
    }
  }

  function closeDeletePatchModal() {
    pendingDeletePatchId = null;
    const backdrop = document.getElementById('delete-patch-modal-backdrop');
    if (backdrop) {
      backdrop.classList.remove('is-open');
      backdrop.setAttribute('aria-hidden', 'true');
    }
  }

  function confirmDeleteUserPatch() {
    if (!pendingDeletePatchId) return;
    const idToDelete = pendingDeletePatchId;
    closeDeletePatchModal();
    window.enoPatchStorage?.deleteCustomPatchById?.(idToDelete);
  }

  function bindDeleteModalUI() {
    const backdrop = document.getElementById('delete-patch-modal-backdrop');
    if (backdrop) {
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) closeDeletePatchModal();
      });
    }

    const closeBtn = document.getElementById('btn-close-delete-modal');
    if (closeBtn) closeBtn.addEventListener('click', closeDeletePatchModal);

    const cancelBtn = document.getElementById('btn-cancel-delete-modal');
    if (cancelBtn) cancelBtn.addEventListener('click', closeDeletePatchModal);

    const confirmBtn = document.getElementById('btn-confirm-delete-patch');
    if (confirmBtn) confirmBtn.addEventListener('click', confirmDeleteUserPatch);

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const bd = document.getElementById('delete-patch-modal-backdrop');
        if (bd && bd.classList.contains('is-open')) {
          e.preventDefault();
          closeDeletePatchModal();
        }
      }
    });
    if (window.location.hash.includes('demo=userpatches')) {
      setTimeout(() => {
        if (window.EnsoPatchRandomizer) {
          window.EnsoPatchRandomizer.randomizeAndAppendPatch();
          window.EnsoPatchRandomizer.randomizeAndAppendPatch();
          const pills = document.querySelectorAll('.user-patch-pill');
          if (pills.length > 0) {
            pills[pills.length - 1].classList.add('is-hovered');
            const delBtn = pills[pills.length - 1].querySelector('.user-patch-delete-btn');
            if (delBtn) delBtn.style.opacity = '1';
          }
        }
      }, 150);
    }
    if (window.location.hash.includes('modal=deletepatch')) {
      setTimeout(() => {
        if (window.EnsoPatchRandomizer) {
          const pId = window.EnsoPatchRandomizer.randomizeAndAppendPatch();
          window.EnsoPatchRandomizer.promptDeleteUserPatch(pId);
        }
      }, 150);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindDeleteModalUI);
  } else {
    bindDeleteModalUI();
  }

  window.EnsoPatchRandomizer = {
    getNextCircleStation,
    generateThematicPatchName,
    generateTrackPattern,
    randomizeAndAppendPatch,
    promptDeleteUserPatch,
    closeDeletePatchModal,
    confirmDeleteUserPatch
  };
})();
