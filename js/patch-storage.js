/**
 * Brian Eno Soundscape Generator — Patch & Settings Storage System
 * Manages localStorage + disk-backed saved-patches.json, custom patch creation,
 * factory patch resets, and full parameter state round-tripping.
 */
'use strict';

(function() {
  const LOCAL_STORAGE_PATCHES_KEY = 'enso_soundscapes_patches_v1';
  const LOCAL_STORAGE_SESSION_KEY = 'enso_soundscapes_session_v1';
  const API_PATCHES_URL = 'api/patches';
  const STATIC_PATCHES_URL = 'saved-patches.json';

  let FACTORY_PRESETS = null;
  let FACTORY_PATTERNS = null;
  let patchOverrides = {};
  let customPresets = {};
  let customTrackPatterns = {};
  let globalVoiceBalance = -0.62;
  let globalVoiceGains = null;
  let globalVoiceFilters = null;
  let savedAutoCycle = null;

  const SLIDER_MAP = {
    attack: 'global-attack', release: 'global-release', sustain: 'global-sustain', masterVolume: 'master-volume',
    cutoff: 'filter-cutoff', resonance: 'filter-resonance', filterDrift: 'filter-drift',
    reverbMix: 'reverb-mix', reverbShimmer: 'reverb-shimmer', reverbDecay: 'reverb-decay', reverbDamping: 'reverb-damping',
    delayMix: 'delay-mix', delayTime: 'delay-time', delayFeedback: 'delay-feedback', delayWow: 'delay-wow'
  };

  const PHRASE_SLIDERS = [
    { key: 'phraseVariationChance', id: 'phrase-variation-chance', lblId: 'val-phrase-variation-chance', fmt: (v) => `${Math.round(v * 100)}%` },
    { key: 'phraseSkipChance', id: 'phrase-skip-chance', lblId: 'val-phrase-skip-chance', fmt: (v) => `${Math.round(v * 100)}%` },
    { key: 'phraseNoteGate', id: 'phrase-note-gate', lblId: 'val-phrase-note-gate', fmt: (v) => `${Math.round(v * 100)}%` },
    { key: 'phraseCompletionGate', id: 'phrase-completion-gate', lblId: 'val-phrase-completion-gate', fmt: (v) => `${Math.round(v * 100)}%` },
    { key: 'phraseGateProb', id: 'phrase-gate-prob', lblId: 'val-phrase-gate-prob', fmt: (v) => `${Math.round(v * 100)}%` },
    { key: 'phraseLoopCycle', id: 'phrase-loop-cycle', lblId: 'val-phrase-loop-cycle', fmt: (v) => `${Number(v).toFixed(1)} s` },
    { key: 'noteOctaveShiftChance', id: 'phrase-note-octave-shift', lblId: 'val-phrase-note-octave-shift', fmt: (v) => `${Math.round(v * 100)}%` },
    { key: 'chordOctaveShiftChance', id: 'phrase-chord-octave-shift', lblId: 'val-phrase-chord-octave-shift', fmt: (v) => `${Math.round(v * 100)}%` },
    { key: 'chordProgGate', id: 'chord-prog-gate', lblId: 'val-chord-prog-gate', fmt: (v) => `${Math.round(v * 100)}%` },
    { key: 'chordProgCycle', id: 'chord-prog-cycle', lblId: 'val-chord-prog-cycle', fmt: (v) => `${Number(v).toFixed(1)} s` }
  ];

  function getApp() {
    return window.enoApp || null;
  }

  function captureCurrentPatchState() {
    const app = getApp();
    if (!app) return null;

    const scale = document.getElementById('select-scale')?.value || app.probEngine?.scaleId || 'thursday_g';
    const circadian = document.getElementById('select-circadian')?.value || app.probEngine?.circadianMode || 'afternoon';

    const globalParams = {};
    Object.entries(SLIDER_MAP).forEach(([k, id]) => {
      const el = document.getElementById(id);
      if (el) {
        globalParams[k] = parseFloat(el.value);
      } else if (app.audioEngine?.params && app.audioEngine.params[k] !== undefined) {
        globalParams[k] = app.audioEngine.params[k];
      }
    });
    globalParams.envelopeMode = app.audioEngine?.envelopeMode || 'override';
    globalParams.filterType = app.audioEngine?.filterType || 'lowpass';
    const xfEl = document.getElementById('piano-other-crossfade');
    const domXf = xfEl && xfEl.value !== '' ? parseFloat(xfEl.value) : NaN;
    const rawXf = Number.isFinite(domXf)
      ? domXf
      : (typeof app.globalVoiceBalance === 'number' ? app.globalVoiceBalance : globalVoiceBalance);
    globalVoiceBalance = Math.max(-1, Math.min(1, Number((Number(rawXf) || 0).toFixed(2))));
    app.globalVoiceBalance = globalVoiceBalance;
    globalParams.pianoCrossfade = globalVoiceBalance;

    const probEngine = app.probEngine || {};
    const probability = {
      activeVoiceCount: probEngine.activeVoiceCount !== undefined ? probEngine.activeVoiceCount : 6,
      rotationSpeed: probEngine.rotationSpeed !== undefined ? probEngine.rotationSpeed : 1.0,
      globalProb: probEngine.globalProbability !== undefined ? probEngine.globalProbability : 0.63,
      voiceOrder: Array.isArray(probEngine.voiceOrder) ? [...probEngine.voiceOrder] : ['pad', 'piano', 'bell', 'choir', 'tape', 'drone'],
      densityBias: probEngine.densityBias !== undefined ? probEngine.densityBias : 0,
      mutationRate: probEngine.mutationRate !== undefined ? probEngine.mutationRate : 0.1,
      timeStretch: probEngine.timeStretch !== undefined ? probEngine.timeStretch : 1.0,
      degreeWeights: Array.isArray(probEngine.degreeWeights) ? [...probEngine.degreeWeights] : [0.9, 0.75, 0.6, 0.3, 0.8, 0.5, 0.4]
    };

    const voices = {};
    const defaultGain = { pad: 0.72, piano: 2.00, bell: 0.54, choir: 0.60, tape: 0.64, drone: 0.70 };
    const defaultRelease = { pad: 8.5, piano: 4.5, bell: 5.2, choir: 9.5, tape: 6.2, drone: 11.0 };
    const defaultOctave = { pad: 0, piano: 0, bell: 1, choir: 1, tape: 0, drone: -1 };
    if (!app.globalVoiceGains) app.globalVoiceGains = {};
    if (!app.globalVoiceFilters) app.globalVoiceFilters = {};
    if (Array.isArray(probEngine.voices)) {
      probEngine.voices.forEach((v) => {
        const gainEl = document.getElementById(`voice-gain-${v.id}`);
        const domGain = gainEl && gainEl.value !== '' ? parseFloat(gainEl.value) : NaN;
        const rawG = Number.isFinite(domGain) && domGain > 0
          ? domGain
          : (typeof v.baseGain === 'number' && v.baseGain > 0 ? v.baseGain : v.gain);
        const g = typeof rawG === 'number' && rawG > 0 ? Number(rawG.toFixed(2)) : (defaultGain[v.id] || 0.35);
        const finalGain = v.id === 'piano' ? (g || 2.00) : g;
        const cutEl = document.getElementById(`voice-cutoff-${v.id}`);
        const resEl = document.getElementById(`voice-resonance-${v.id}`);
        const cutoff = cutEl && cutEl.value !== '' ? Math.round(parseFloat(cutEl.value)) : Math.round(v.cutoff ?? app.globalVoiceFilters?.[v.id]?.cutoff ?? v.defaultCutoff ?? 8000);
        const resonance = resEl && resEl.value !== '' ? Number(parseFloat(resEl.value).toFixed(1)) : Number((v.resonance ?? app.globalVoiceFilters?.[v.id]?.resonance ?? v.defaultResonance ?? 1.0).toFixed(1));
        const oct = typeof v.octaveOffset === 'number' ? Math.max(-4, Math.min(4, Math.round(v.octaveOffset))) : (defaultOctave[v.id] ?? 0);
        app.globalVoiceGains[v.id] = finalGain;
        app.globalVoiceFilters[v.id] = { cutoff, resonance };
        voices[v.id] = {
          prob: v.prob !== undefined ? v.prob : 0.6,
          cycle: v.cycle !== undefined ? v.cycle : 10.0,
          gain: finalGain,
          cutoff,
          resonance,
          release: typeof v.release === 'number' ? v.release : (defaultRelease[v.id] || 7.0),
          octave: oct,
          octaveShiftProb: typeof v.octaveShiftProb === 'number' ? v.octaveShiftProb : (v.defaultOctaveShiftProb ?? 0.10),
          noteOctaveShiftProb: typeof v.noteOctaveShiftProb === 'number' ? v.noteOctaveShiftProb : (v.defaultNoteOctaveShiftProb ?? 0.03),
          chordOctaveShiftProb: typeof v.chordOctaveShiftProb === 'number' ? v.chordOctaveShiftProb : (v.defaultChordOctaveShiftProb ?? 0.10),
          muted: !!v.muted
        };
      });
    }
    if (!voices.piano) {
      voices.piano = { prob: 0.62, cycle: 7.9, gain: 2.00, cutoff: 12000, resonance: 0.8, release: 4.5, octave: 0, octaveShiftProb: 0.10, noteOctaveShiftProb: 0.03, chordOctaveShiftProb: 0.10, muted: false };
    } else if (typeof voices.piano.gain !== 'number' || voices.piano.gain <= 0) {
      voices.piano.gain = 2.00;
    }

    const pe = app.phraseEngine;
    const phraseParams = {};
    if (pe) {
      PHRASE_SLIDERS.forEach((ps) => {
        if (typeof pe[ps.key] === 'number') phraseParams[ps.key] = pe[ps.key];
      });
    }

    const acToggle = document.getElementById('auto-cycle-toggle');
    const acMin = document.getElementById('auto-cycle-minutes');
    const autoCycle = {
      enabled: acToggle ? Boolean(acToggle.checked) : Boolean(app.autoCycler?.enabled ?? true),
      transitionMinutes: acMin && acMin.value !== '' ? Math.round(parseFloat(acMin.value)) : Math.round(app.autoCycler?.transitionMinutes ?? 8)
    };
    const voiceBalance = {
      pianoCrossfade: globalVoiceBalance,
      voiceGains: JSON.parse(JSON.stringify(app.globalVoiceGains)),
      voiceFilters: JSON.parse(JSON.stringify(app.globalVoiceFilters)),
      autoCycle
    };

    return {
      scale, circadian, global: globalParams, probability, voices, voiceBalance,
      pianoPhraseType: pe?.pianoPhraseType || 'longer_pattern',
      chordProgInstrument: pe?.chordProgInstrument || 'choir',
      phraseParams
    };
  }

  function syncPhraseSlidersUI(params) {
    if (!params) return;
    PHRASE_SLIDERS.forEach(({ key, id, lblId, fmt }) => {
      const v = params[key];
      if (typeof v === 'number') {
        const el = document.getElementById(id);
        const lbl = document.getElementById(lblId);
        if (el) el.value = v;
        if (lbl) lbl.textContent = fmt(v);
      }
    });
  }

  function applyFullPatchState(patchObj) {
    const app = getApp();
    if (!app || !patchObj || !patchObj.id) return;

    if (!window.ENO_DATA) window.ENO_DATA = {};
    if (!window.ENO_DATA.PRESETS) window.ENO_DATA.PRESETS = {};
    window.ENO_DATA.PRESETS[patchObj.id] = patchObj;

    if (customTrackPatterns[patchObj.id] && app.phraseEngine?.TRACK_PATTERNS) {
      app.phraseEngine.TRACK_PATTERNS[patchObj.id] = customTrackPatterns[patchObj.id];
    }

    app.applyPreset(patchObj.id, false);
    if (patchObj.phraseParams && app.phraseEngine) {
      Object.assign(app.phraseEngine, patchObj.phraseParams);
      app.phraseEngine.syncUI();
      syncPhraseSlidersUI(patchObj.phraseParams);
    }
    updateResetIcon(patchObj.id);
    markDirty(false);
  }

  function persistToLocalStorage() {
    try {
      const payload = {
        version: 3, globalVoiceBalance, globalVoiceGains, globalVoiceFilters,
        autoCycle: savedAutoCycle, patchOverrides, customPresets, customTrackPatterns
      };
      localStorage.setItem(LOCAL_STORAGE_PATCHES_KEY, JSON.stringify(payload));
      const app = getApp();
      if (app?.activePresetId) {
        localStorage.setItem(LOCAL_STORAGE_SESSION_KEY, JSON.stringify({ activePresetId: app.activePresetId, globalVoiceBalance }));
      }
    } catch (e) {
      console.warn('[patch-storage] localStorage write failed:', e);
    }
  }

  function persistToDisk() {
    if ((window.location.hash || '').includes('selftest=1')) return;
    if (window.location.protocol !== 'http:' && window.location.protocol !== 'https:') return;
    const host = window.location.hostname || '';
    const hasLocalBackend = host === 'localhost' || host === '127.0.0.1' || host === '::1' || host.endsWith('.googlers.com');
    if (!hasLocalBackend) return;

    const app = getApp();
    const payload = {
      version: 3, globalVoiceBalance, globalVoiceGains, globalVoiceFilters,
      autoCycle: savedAutoCycle, patchOverrides, customPresets, customTrackPatterns, activePresetId: app?.activePresetId || null
    };
    fetch(API_PATCHES_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).catch((e) => {
      console.warn('[patch-storage] disk write failed:', e);
    });
  }

  function propagateVoiceBalanceToPresets(xf) {
    if (window.ENO_DATA?.PRESETS) {
      Object.values(window.ENO_DATA.PRESETS).forEach((p) => {
        if (p && p.global) p.global.pianoCrossfade = xf;
      });
    }
    if (FACTORY_PRESETS) {
      Object.values(FACTORY_PRESETS).forEach((p) => {
        if (p && p.global) p.global.pianoCrossfade = xf;
      });
    }
    Object.values(patchOverrides).forEach((ov) => {
      if (ov && ov.global) ov.global.pianoCrossfade = xf;
    });
    Object.values(customPresets).forEach((cp) => {
      if (cp && cp.global) cp.global.pianoCrossfade = xf;
    });
  }

  function saveGlobalVoiceSettings() {
    const app = getApp();
    if (!app) return;
    if (app.globalVoiceGains) globalVoiceGains = JSON.parse(JSON.stringify(app.globalVoiceGains));
    if (app.globalVoiceFilters) globalVoiceFilters = JSON.parse(JSON.stringify(app.globalVoiceFilters));
    persistToLocalStorage();
    persistToDisk();
  }
  window.saveGlobalVoiceSettings = saveGlobalVoiceSettings;

  function saveGlobalVoiceBalance(val) {
    const xf = Math.max(-1, Math.min(1, Number((Number(val) || 0).toFixed(2))));
    globalVoiceBalance = xf;
    const app = getApp();
    if (app) app.globalVoiceBalance = xf;
    propagateVoiceBalanceToPresets(xf);
    persistToLocalStorage();
    persistToDisk();
  }

  function saveCurrentPatch() {
    const app = getApp();
    if (!app) return;
    const activeId = app.activePresetId || 'thursday';
    const state = captureCurrentPatchState();
    if (!state) return;

    if (typeof state.global?.pianoCrossfade === 'number') {
      globalVoiceBalance = state.global.pianoCrossfade;
      app.globalVoiceBalance = globalVoiceBalance;
      propagateVoiceBalanceToPresets(globalVoiceBalance);
      if (typeof window.syncCrossfadeUI === 'function') {
        window.syncCrossfadeUI(globalVoiceBalance);
      }
    }
    if (app.globalVoiceGains) {
      globalVoiceGains = JSON.parse(JSON.stringify(app.globalVoiceGains));
    }
    if (app.globalVoiceFilters) {
      globalVoiceFilters = JSON.parse(JSON.stringify(app.globalVoiceFilters));
    }
    if (state.voiceBalance?.autoCycle) {
      savedAutoCycle = state.voiceBalance.autoCycle;
      if (app.autoCycler) {
        app.autoCycler.enabled = savedAutoCycle.enabled;
        app.autoCycler.transitionMinutes = savedAutoCycle.transitionMinutes;
        app.autoCycler.saveState?.();
      }
    }

    const basePreset = window.ENO_DATA?.PRESETS?.[activeId] || {};
    const updated = { ...basePreset, ...state, id: activeId };

    if (FACTORY_PRESETS && FACTORY_PRESETS[activeId]) {
      patchOverrides[activeId] = state;
    } else {
      customPresets[activeId] = updated;
    }

    if (window.ENO_DATA?.PRESETS) {
      window.ENO_DATA.PRESETS[activeId] = updated;
    }

    persistToLocalStorage();
    persistToDisk();

    const saveBtn = document.getElementById('btn-save-patch');
    const saveIcon = document.getElementById('save-patch-icon');
    const saveLabel = document.getElementById('save-patch-label');
    if (saveBtn) {
      saveBtn.classList.remove('is-dirty');
      saveBtn.classList.add('is-saved');
      if (saveIcon) saveIcon.textContent = 'check';
      if (saveLabel) saveLabel.textContent = 'Saved!';
      setTimeout(() => {
        saveBtn.classList.remove('is-saved');
        if (saveIcon) saveIcon.textContent = 'save';
        if (saveLabel) saveLabel.textContent = 'Save patch';
      }, 1500);
    }
    markDirty(false);
  }

  function registerCustomPatch(presetObj, trackPattern) {
    if (!presetObj || !presetObj.id) return;
    customPresets[presetObj.id] = presetObj;
    if (trackPattern) {
      customTrackPatterns[presetObj.id] = trackPattern;
    }
    persistToLocalStorage();
    persistToDisk();
  }

  function deleteCustomPatchById(patchId) {
    const app = getApp();
    if (!patchId) return;
    delete customPresets[patchId];
    delete customTrackPatterns[patchId];
    if (window.ENO_DATA?.PRESETS) delete window.ENO_DATA.PRESETS[patchId];
    if (app?.phraseEngine?.TRACK_PATTERNS) delete app.phraseEngine.TRACK_PATTERNS[patchId];
    persistToLocalStorage();
    persistToDisk();
    if (typeof app?.renderPresetsAndSelects === 'function') {
      app.renderPresetsAndSelects();
    }
    if (app?.activePresetId === patchId) {
      app.applyPreset('thursday', false);
    }
    markDirty(false);
  }

  function createNewPatch(name) {
    const app = getApp();
    if (!app) return null;

    const cleanName = (name || '').trim() || 'Midnight Conservatory';
    const patchId = 'custom_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6);
    const currentId = app.activePresetId || 'thursday';

    const pe = app.phraseEngine;
    const basePat = pe?.TRACK_PATTERNS?.[currentId] || pe?.TRACK_PATTERNS?.reflection || pe?.TRACK_PATTERNS?.thursday;
    const currentScaleId = document.getElementById('select-scale')?.value || app.probEngine?.scaleId || 'thursday_g';
    const sc = (window.ENO_DATA?.SCALES || {})[currentScaleId];

    if (basePat && pe?.TRACK_PATTERNS) {
      const clonedPat = JSON.parse(JSON.stringify(basePat));
      clonedPat.presetId = patchId;
      clonedPat.scaleId = currentScaleId;
      if (sc) clonedPat.keyLabel = sc.keyLabel || sc.name;
      pe.TRACK_PATTERNS[patchId] = clonedPat;
      customTrackPatterns[patchId] = clonedPat;
    }

    const state = captureCurrentPatchState() || {};
    if (!state.voices) state.voices = {};
    if (!state.voices.piano) state.voices.piano = { prob: 0.62, cycle: 7.9, gain: 2.00, muted: false };
    if (!state.voices.piano.gain) state.voices.piano.gain = 2.00;

    const newPreset = {
      id: patchId,
      name: cleanName,
      custom: true,
      year: new Date().getFullYear().toString(),
      album: 'Custom Patches',
      badgeHue: 'teal',
      summary: `Custom soundscape based on ${sc ? sc.name : 'ambient generative scale'}.`,
      scale: currentScaleId,
      keyLabel: sc ? (sc.keyLabel || sc.name) : 'Custom Scale',
      ...state
    };

    if (!window.ENO_DATA.PRESETS) window.ENO_DATA.PRESETS = {};
    window.ENO_DATA.PRESETS[patchId] = newPreset;
    customPresets[patchId] = newPreset;

    persistToLocalStorage();
    persistToDisk();

    if (typeof app.renderPresetsAndSelects === 'function') {
      app.renderPresetsAndSelects();
    }
    app.applyPreset(patchId, true);
    closeNewPatchModal();
    return patchId;
  }

  function resetOrDeleteCurrentPatch() {
    const app = getApp();
    if (!app) return;
    const activeId = app.activePresetId || 'thursday';

    if (FACTORY_PRESETS && FACTORY_PRESETS[activeId]) {
      delete patchOverrides[activeId];
      if (window.ENO_DATA?.PRESETS) {
        window.ENO_DATA.PRESETS[activeId] = JSON.parse(JSON.stringify(FACTORY_PRESETS[activeId]));
      }
      if (FACTORY_PATTERNS && FACTORY_PATTERNS[activeId] && app.phraseEngine?.TRACK_PATTERNS) {
        app.phraseEngine.TRACK_PATTERNS[activeId] = JSON.parse(JSON.stringify(FACTORY_PATTERNS[activeId]));
      }
      persistToLocalStorage();
      persistToDisk();
      app.applyPreset(activeId, false);
      markDirty(false);
    } else if (customPresets[activeId]) {
      deleteCustomPatchById(activeId);
    }
  }

  function updateResetIcon(presetId) {
    const icon = document.getElementById('reset-patch-icon');
    const btn = document.getElementById('btn-reset-patch');
    if (!icon || !btn) return;
    const isFactory = FACTORY_PRESETS && !!FACTORY_PRESETS[presetId];
    if (isFactory) {
      icon.textContent = 'restart_alt';
      btn.title = 'Reset patch to factory defaults';
      btn.setAttribute('aria-label', 'Reset patch to factory defaults');
    } else {
      icon.textContent = 'delete';
      btn.title = 'Delete custom patch';
      btn.setAttribute('aria-label', 'Delete custom patch');
    }
  }

  function markDirty(dirty = true) {
    const saveBtn = document.getElementById('btn-save-patch');
    if (saveBtn) {
      if (dirty) saveBtn.classList.add('is-dirty');
      else saveBtn.classList.remove('is-dirty');
    }
  }

  function openNewPatchModal() {
    window.EnsoPatchModal?.open?.();
  }

  function closeNewPatchModal() {
    window.EnsoPatchModal?.close?.();
  }

  function bindModalAndActions() {
    if (window.EnsoPatchModal?.init) {
      window.EnsoPatchModal.init({
        getApp,
        saveCurrentPatch,
        createNewPatch,
        resetOrDeleteCurrentPatch,
        markDirty
      });
      return;
    }
    document.getElementById('btn-save-patch')?.addEventListener('click', saveCurrentPatch);
    document.getElementById('btn-reset-patch')?.addEventListener('click', resetOrDeleteCurrentPatch);
    document.querySelectorAll('.control-row input, .piano-phrases-card input, .xy-pad-surface, #settings-popover input').forEach((el) => {
      el.addEventListener('input', () => markDirty(true));
      el.addEventListener('change', () => markDirty(true));
    });
    document.getElementById('btn-reset-crossfade')?.addEventListener('click', () => markDirty(true));
  }

  function hookAppApplyPreset() {
    const app = getApp();
    if (!app || app.__patchStorageHooked) return;
    app.__patchStorageHooked = true;

    const originalApplyPreset = app.applyPreset.bind(app);
    app.applyPreset = function(presetId, triggerPreview = false) {
      originalApplyPreset(presetId, triggerPreview);
      const preset = window.ENO_DATA?.PRESETS?.[presetId];
      if (preset && preset.phraseParams && app.phraseEngine) {
        Object.assign(app.phraseEngine, preset.phraseParams);
        app.phraseEngine.syncUI();
        syncPhraseSlidersUI(preset.phraseParams);
      }
      updateResetIcon(presetId);
      markDirty(false);
    };
  }

  function ingestSavedPayload(data, isMerge = false) {
    if (!data) return;
    if ((data.version || 1) < 3) {
      globalVoiceBalance = -0.62;
      globalVoiceGains = { pad: 0.65, piano: 2.00, bell: 0.50, choir: 0.56, tape: 0.58, drone: 0.62 };
      patchOverrides = {};
      if (data.globalVoiceFilters) globalVoiceFilters = data.globalVoiceFilters;
      if (data.customPresets) customPresets = isMerge ? { ...customPresets, ...data.customPresets } : data.customPresets;
      if (data.customTrackPatterns) customTrackPatterns = isMerge ? { ...customTrackPatterns, ...data.customTrackPatterns } : data.customTrackPatterns;
    } else {
      if (typeof data.globalVoiceBalance === 'number') {
        globalVoiceBalance = Math.max(-1, Math.min(1, Number(data.globalVoiceBalance.toFixed(2))));
      }
      if (data.globalVoiceGains) globalVoiceGains = data.globalVoiceGains;
      if (data.globalVoiceFilters) globalVoiceFilters = data.globalVoiceFilters;
      if (data.autoCycle) savedAutoCycle = data.autoCycle;
      if (data.patchOverrides) patchOverrides = isMerge ? { ...patchOverrides, ...data.patchOverrides } : data.patchOverrides;
      if (data.customPresets) customPresets = isMerge ? { ...customPresets, ...data.customPresets } : data.customPresets;
      if (data.customTrackPatterns) customTrackPatterns = isMerge ? { ...customTrackPatterns, ...data.customTrackPatterns } : data.customTrackPatterns;
    }
  }

  function loadSavedPatchesStartup() {
    const hash = window.location.hash || '';
    if (hash.includes('selftest=1')) return;

    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_PATCHES_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        ingestSavedPayload(parsed, false);
        if ((parsed.version || 1) < 3) persistToLocalStorage();
        applyLoadedData();
        const sessRaw = localStorage.getItem(LOCAL_STORAGE_SESSION_KEY);
        const sess = sessRaw ? JSON.parse(sessRaw) : null;
        const targetId = sess?.activePresetId || getApp()?.activePresetId || 'thursday';
        if (window.ENO_DATA?.PRESETS?.[targetId]) {
          getApp()?.applyPreset(targetId, false);
        }
      }
    } catch (e) {
      console.warn('[patch-storage] localStorage read failed:', e);
    }

    if (window.location.protocol === 'http:' || window.location.protocol === 'https:') {
      fetch(API_PATCHES_URL)
        .then((res) => (res.ok ? res.json() : fetch(STATIC_PATCHES_URL).then((r) => (r.ok ? r.json() : null))))
        .catch(() => fetch(STATIC_PATCHES_URL).then((r) => (r.ok ? r.json() : null)).catch(() => null))
        .then((data) => {
          if (!data) return;
          ingestSavedPayload(data, true);
          applyLoadedData();
          const targetId = data.activePresetId || getApp()?.activePresetId || 'thursday';
          if (targetId && window.ENO_DATA?.PRESETS?.[targetId]) {
            getApp()?.applyPreset(targetId, false);
          }
        })
        .catch(() => {});
    }
  }

  function applyLoadedData() {
    const app = getApp();
    if (!window.ENO_DATA) window.ENO_DATA = {};
    if (!window.ENO_DATA.PRESETS) window.ENO_DATA.PRESETS = {};

    Object.entries(customPresets).forEach(([id, p]) => {
      window.ENO_DATA.PRESETS[id] = p;
      if (p.scaleObj && p.scale) {
        if (!window.ENO_DATA.SCALES) window.ENO_DATA.SCALES = {};
        window.ENO_DATA.SCALES[p.scale] = p.scaleObj;
      }
    });

    if (app?.phraseEngine?.TRACK_PATTERNS) {
      Object.entries(customTrackPatterns).forEach(([id, pat]) => {
        app.phraseEngine.TRACK_PATTERNS[id] = pat;
      });
    }

    Object.entries(patchOverrides).forEach(([id, over]) => {
      if (window.ENO_DATA.PRESETS[id]) {
        window.ENO_DATA.PRESETS[id] = { ...window.ENO_DATA.PRESETS[id], ...over };
      }
    });

    propagateVoiceBalanceToPresets(globalVoiceBalance);
    const xfEl = document.getElementById('piano-other-crossfade');
    if (xfEl) xfEl.value = String(globalVoiceBalance);
    if (app) {
      app.globalVoiceBalance = globalVoiceBalance;
      const xfSt = app.audioEngine?.setPianoCrossfade
        ? app.audioEngine.setPianoCrossfade(globalVoiceBalance)
        : {
            pianoMultiplier: globalVoiceBalance <= 0 ? 1.0 : Math.max(0, 1.0 - globalVoiceBalance),
            otherMultiplier: globalVoiceBalance >= 0 ? 1.0 : Math.max(0, 1.0 + globalVoiceBalance)
          };
      app.probEngine?.applyCrossfadeToVoices?.(xfSt.pianoMultiplier, xfSt.otherMultiplier);
      if (globalVoiceGains) {
        app.globalVoiceGains = { ...app.globalVoiceGains, ...globalVoiceGains };
        Object.entries(app.globalVoiceGains).forEach(([vId, val]) => {
          app.probEngine?.setVoiceParam?.(vId, 'gain', val);
          app.audioEngine?.setVoiceVolume?.(vId, val);
        });
      }
      if (globalVoiceFilters) {
        app.globalVoiceFilters = { ...app.globalVoiceFilters, ...globalVoiceFilters };
        Object.entries(app.globalVoiceFilters).forEach(([vId, flt]) => {
          if (typeof flt?.cutoff === 'number') {
            app.probEngine?.setVoiceParam?.(vId, 'cutoff', flt.cutoff);
            app.audioEngine?.setVoiceFilterCutoff?.(vId, flt.cutoff);
          }
          if (typeof flt?.resonance === 'number') {
            app.probEngine?.setVoiceParam?.(vId, 'resonance', flt.resonance);
            app.audioEngine?.setVoiceFilterResonance?.(vId, flt.resonance);
          }
        });
      }
      if (savedAutoCycle && app.autoCycler) {
        if (typeof savedAutoCycle.enabled === 'boolean') app.autoCycler.enabled = savedAutoCycle.enabled;
        if (typeof savedAutoCycle.transitionMinutes === 'number') app.autoCycler.transitionMinutes = savedAutoCycle.transitionMinutes;
        app.autoCycler.syncUI?.();
      }
      app.syncVoiceGainSlidersFromCrossfade?.();
      app.syncVoiceFilterSliders?.();
    }
    if (typeof window.syncCrossfadeUI === 'function') window.syncCrossfadeUI(globalVoiceBalance);

    if (typeof app?.renderPresetsAndSelects === 'function') {
      app.renderPresetsAndSelects();
    }
  }

  function runSelfTestWhenReady() {
    const raw = document.body.getAttribute('data-selftest');
    if (!raw) {
      setTimeout(runSelfTestWhenReady, 10);
      return;
    }
    const data = JSON.parse(raw);
    if (!data.rotaryDialsCount) {
      setTimeout(runSelfTestWhenReady, 10);
      return;
    }

    const app = getApp();
    const saveBtn = document.getElementById('btn-save-patch');
    const newBtn = document.getElementById('btn-new-patch');
    const patchSaveBtnPresent = !!saveBtn;
    const newPatchBtnPresent = !!newBtn;

    let patchStorageRoundtripVerified = false;
    let voiceBalanceSavedOnSavePatchVerified = false;
    let customPatchCreationVerified = false;
    let patchRandomizerVerified = false;

    try {
      const xfEl = document.getElementById('piano-other-crossfade');
      const padGainEl = document.getElementById('voice-gain-pad');
      const prevXf = xfEl ? parseFloat(xfEl.value) : -0.62;
      const prevPadGain = padGainEl ? parseFloat(padGainEl.value) : 0.65;

      if (xfEl) {
        xfEl.value = '-0.38';
        xfEl.dispatchEvent(new Event('input', { bubbles: true }));
      }
      const dirtyAfterVoiceBalance = saveBtn ? saveBtn.classList.contains('is-dirty') : false;
      if (padGainEl) {
        padGainEl.value = '0.54';
        padGainEl.dispatchEvent(new Event('input', { bubbles: true }));
      }

      saveCurrentPatch();
      const savedRaw = localStorage.getItem(LOCAL_STORAGE_PATCHES_KEY);
      const savedPayload = savedRaw ? JSON.parse(savedRaw) : null;
      const activeId = app?.activePresetId || 'thursday';
      const savedPatch = savedPayload?.patchOverrides?.[activeId] || window.ENO_DATA?.PRESETS?.[activeId];
      voiceBalanceSavedOnSavePatchVerified = Boolean(
        dirtyAfterVoiceBalance &&
        savedPayload &&
        Math.abs(savedPayload.globalVoiceBalance - (-0.38)) < 0.005 &&
        Math.abs((savedPayload.globalVoiceGains?.pad ?? 0) - 0.54) < 0.005 &&
        savedPatch &&
        Math.abs((savedPatch.global?.pianoCrossfade ?? 0) - (-0.38)) < 0.005 &&
        Math.abs((savedPatch.voiceBalance?.pianoCrossfade ?? 0) - (-0.38)) < 0.005 &&
        Math.abs((savedPatch.voices?.pad?.gain ?? 0) - 0.54) < 0.005
      );

      if (xfEl) {
        xfEl.value = String(prevXf);
        xfEl.dispatchEvent(new Event('input', { bubbles: true }));
      }
      if (padGainEl) {
        padGainEl.value = String(prevPadGain);
        padGainEl.dispatchEvent(new Event('input', { bubbles: true }));
      }
      saveCurrentPatch();
      patchStorageRoundtripVerified = true;

      const testPatchId = createNewPatch('Test Selftest Patch');
      const testBtn = document.querySelector(`[data-preset-id="${testPatchId}"]`);
      customPatchCreationVerified = !!testBtn && window.ENO_DATA?.PRESETS?.[testPatchId]?.name === 'Test Selftest Patch';

      deleteCustomPatchById(testPatchId);
      if (app) app.applyPreset('thursday', false);

      const rndPatchId = window.EnsoPatchRandomizer?.randomizeAndAppendPatch?.();
      if (rndPatchId) {
        const rndBtn = document.querySelector(`[data-preset-id="${rndPatchId}"]`);
        const rndDelBtn = rndBtn?.querySelector('.user-patch-delete-btn');
        const rndPreset = window.ENO_DATA?.PRESETS?.[rndPatchId];
        const rndPianoGain = rndPreset?.voices?.piano?.gain;
        const rndScale = window.ENO_DATA?.SCALES?.[rndPreset?.scale];
        deleteCustomPatchById(rndPatchId);
        if (app) app.applyPreset('thursday', false);
        patchRandomizerVerified = !!rndBtn && !!rndDelBtn && rndPianoGain === 2.00 && !!rndScale;
      }
    } catch (e) {
      console.error('[patch-storage] selftest error:', e);
    }

    data.patchSaveBtnPresent = patchSaveBtnPresent;
    data.newPatchBtnPresent = newPatchBtnPresent;
    data.newPatchBtnIcon = document.getElementById('new-patch-icon')?.textContent?.trim() || '';
    data.patchStorageRoundtripVerified = patchStorageRoundtripVerified;
    data.voiceBalanceSavedOnSavePatchVerified = voiceBalanceSavedOnSavePatchVerified;
    data.customPatchCreationVerified = customPatchCreationVerified;
    data.patchRandomizerVerified = patchRandomizerVerified;

    document.body.setAttribute('data-selftest', JSON.stringify(data));
  }

  function initPatchStorage() {
    if (window.ENO_DATA?.PRESETS) {
      FACTORY_PRESETS = JSON.parse(JSON.stringify(window.ENO_DATA.PRESETS));
    }
    const pe = getApp()?.phraseEngine;
    if (pe?.TRACK_PATTERNS) {
      FACTORY_PATTERNS = JSON.parse(JSON.stringify(pe.TRACK_PATTERNS));
    }

    const api = {
      getApp,
      captureCurrentPatchState,
      applyFullPatchState,
      saveCurrentPatch,
      saveGlobalVoiceBalance,
      saveGlobalVoiceSettings,
      createNewPatch,
      registerCustomPatch,
      deleteCustomPatchById,
      resetOrDeleteCurrentPatch,
      openNewPatchModal,
      closeNewPatchModal,
      markDirty,
      FACTORY_PRESETS,
      FACTORY_PATTERNS
    };
    window.enoPatchStorage = api;
    window.EnsoPatchStorage = api;

    bindModalAndActions();
    hookAppApplyPreset();
    loadSavedPatchesStartup();

    const hash = window.location.hash || '';
    if (hash.includes('modal=newpatch')) {
      setTimeout(openNewPatchModal, 100);
    }
    if (hash.includes('selftest=1')) {
      runSelfTestWhenReady();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPatchStorage);
  } else {
    initPatchStorage();
  }
})();
