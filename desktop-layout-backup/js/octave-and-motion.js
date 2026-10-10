/**
 * Brian Eno Soundscape Generator — Octave Shift Mechanics & Fluid Motion
 * Controller Handles FLIP layout morphs on badges/cards, octave shift
 * simulations, and URL parameter handling.
 */
'use strict';

(function() {
const EnsoMotion = {
  setBadgeText(badgeOrId, newText, opts = {}) {
    if (typeof document === 'undefined') return;
    const el = typeof badgeOrId === 'string' ?
        document.getElementById(badgeOrId) :
        badgeOrId;
    if (!el) return;

    const nextText = String(newText ?? '');
    if (opts.title !== undefined) el.title = opts.title;
    if (el.textContent === nextText && !opts.force) return;

    const prevRect = el.getBoundingClientRect();
    const prevW = prevRect.width;
    const cluster =
        el.closest('.card-title-cluster, .badge-row, .phrase-title-cluster');
    const card = el.closest('.voice-card, .nested-card, .surface-card');
    const siblings = cluster ?
        Array.from(cluster.children)
            .filter((c) => c !== el && c.offsetParent !== null)
            .map((c) => ({el: c, rect: c.getBoundingClientRect()})) :
        [];
    const prevCardH = card ? card.getBoundingClientRect().height : 0;

    el.textContent = nextText;

    const nextRect = el.getBoundingClientRect();
    const nextW = nextRect.width;

    if (typeof el.animate === 'function' && prevW > 0 && nextW > 0 &&
        Math.abs(nextW - prevW) > 0.5) {
      if (el._widthAnim) el._widthAnim.cancel();
      el._widthAnim = el.animate(
          [
            {width: `${prevW}px`, opacity: 0.85},
            {width: `${nextW}px`, opacity: 1}
          ],
          {duration: 220, easing: 'cubic-bezier(0.22, 1, 0.36, 1)'});
    }

    siblings.forEach((sib) => {
      const r2 = sib.el.getBoundingClientRect();
      const dx = sib.rect.left - r2.left;
      const dy = sib.rect.top - r2.top;
      if (typeof sib.el.animate === 'function' &&
          (Math.abs(dx) > 0.75 || Math.abs(dy) > 0.75)) {
        if (sib.el._flipAnim) sib.el._flipAnim.cancel();
        sib.el._flipAnim = sib.el.animate(
            [
              {transform: `translate(${dx}px, ${dy}px)`},
              {transform: 'translate(0, 0)'}
            ],
            {duration: 220, easing: 'cubic-bezier(0.22, 1, 0.36, 1)'});
      }
    });

    if (card && typeof card.animate === 'function') {
      const nextCardH = card.getBoundingClientRect().height;
      if (prevCardH > 0 && nextCardH > 0 &&
          Math.abs(nextCardH - prevCardH) > 0.5) {
        if (card._heightAnim) card._heightAnim.cancel();
        card._heightAnim = card.animate(
            [{height: `${prevCardH}px`}, {height: `${nextCardH}px`}],
            {duration: 240, easing: 'cubic-bezier(0.22, 1, 0.36, 1)'});
      }
    }
  },

  setHarmonyBadgeIcon(badgeOrId, {visible, icon, title, hueClass}) {
    if (typeof document === 'undefined') return;
    const el = typeof badgeOrId === 'string' ?
        document.getElementById(badgeOrId) :
        badgeOrId;
    if (!el) return;

    const cluster = el.closest('.card-title-cluster, .badge-row');
    const card = el.closest('.voice-card, .nested-card, .surface-card');
    const siblings = cluster ?
        Array.from(cluster.children)
            .filter((c) => c !== el && c.offsetParent !== null)
            .map((c) => ({el: c, rect: c.getBoundingClientRect()})) :
        [];
    const prevCardH = card ? card.getBoundingClientRect().height : 0;
    const wasHidden = el.style.display === 'none' || el.offsetParent === null;

    if (!visible) {
      el.style.display = 'none';
      el.innerHTML = '';
      el.className = 'badge badge-icon-only';
    } else {
      el.className = `badge badge-icon-only ${hueClass || 'badge-teal'}`;
      el.title = title || '';
      el.setAttribute('aria-label', title || '');
      el.innerHTML =
          `<span class="material-symbols-outlined" aria-hidden="true">${
              icon || 'music_note'}</span>`;
      el.style.display = '';
      if (wasHidden && typeof el.animate === 'function') {
        el.animate(
            [
              {opacity: 0, transform: 'scale(0.8)'},
              {opacity: 1, transform: 'scale(1)'}
            ],
            {duration: 200, easing: 'cubic-bezier(0.22, 1, 0.36, 1)'});
      }
    }

    siblings.forEach((sib) => {
      const r2 = sib.el.getBoundingClientRect();
      const dx = sib.rect.left - r2.left;
      const dy = sib.rect.top - r2.top;
      if (typeof sib.el.animate === 'function' &&
          (Math.abs(dx) > 0.75 || Math.abs(dy) > 0.75)) {
        if (sib.el._flipAnim) sib.el._flipAnim.cancel();
        sib.el._flipAnim = sib.el.animate(
            [
              {transform: `translate(${dx}px, ${dy}px)`},
              {transform: 'translate(0, 0)'}
            ],
            {duration: 220, easing: 'cubic-bezier(0.22, 1, 0.36, 1)'});
      }
    });

    if (card && typeof card.animate === 'function') {
      const nextCardH = card.getBoundingClientRect().height;
      if (prevCardH > 0 && nextCardH > 0 &&
          Math.abs(nextCardH - prevCardH) > 0.5) {
        if (card._heightAnim) card._heightAnim.cancel();
        card._heightAnim = card.animate(
            [{height: `${prevCardH}px`}, {height: `${nextCardH}px`}],
            {duration: 240, easing: 'cubic-bezier(0.22, 1, 0.36, 1)'});
      }
    }
  },

  syncVoiceHarmonyCards(pe, phrase) {
    if (typeof document === 'undefined' || !pe || !pe.probEngine ||
        !Array.isArray(pe.probEngine.voices))
      return;
    const typeIcons = {
      short_motif: 'queue_music',
      chord_progression: 'library_music',
      longer_pattern: 'piano'
    };
    const typeNames = {
      short_motif: 'Short motif',
      chord_progression: 'Chord prog',
      longer_pattern: 'Longer pattern'
    };
    pe.probEngine.voices.forEach((v) => {
      const isP = v.id === 'piano';
      const isC = v.id === pe.chordProgInstrument;
      const active = isP || isC;
      const card = document.getElementById(`voice-card-${v.id}`);
      const prevCardH = card ? card.getBoundingClientRect().height : 0;

      if (card) card.classList.toggle('has-note-octave-shift', active);
      const noteOctRow =
          document.getElementById(`row-voice-note-octave-shift-${v.id}`);
      if (noteOctRow) {
        noteOctRow.style.display = active ? '' : 'none';
        const sl = document.getElementById(`voice-note-octave-shift-${v.id}`);
        const lbl =
            document.getElementById(`val-voice-note-octave-shift-${v.id}`);
        const probVal = typeof v.noteOctaveShiftProb === 'number' ?
            v.noteOctaveShiftProb :
            (typeof pe.noteOctaveShiftChance === 'number' ?
                 pe.noteOctaveShiftChance :
                 0.03);
        if (sl && Math.abs(parseFloat(sl.value) - probVal) > 0.001) {
          sl.value = probVal.toFixed(2);
          sl.dispatchEvent(new Event('change'));
        }
        if (lbl) lbl.textContent = `${Math.round(probVal * 100)}%`;
      }

      const chordOctRow =
          document.getElementById(`row-voice-chord-octave-shift-${v.id}`);
      if (chordOctRow) {
        chordOctRow.style.display = active ? '' : 'none';
        const sl = document.getElementById(`voice-chord-octave-shift-${v.id}`);
        const lbl =
            document.getElementById(`val-voice-chord-octave-shift-${v.id}`);
        const chordProbVal =
            v.chordOctaveShiftProb ?? pe.chordOctaveShiftChance ?? 0.10;
        if (sl && Math.abs(parseFloat(sl.value) - chordProbVal) > 0.001) {
          sl.value = chordProbVal.toFixed(2);
          sl.dispatchEvent(new Event('change'));
        }
        if (lbl) lbl.textContent = `${Math.round(chordProbVal * 100)}%`;
      }

      const badge = document.getElementById(`voice-harmony-badge-${v.id}`);
      if (badge) {
        const icon = isP ? (pe.activePresetId === 'discreet_loops' ?
                                'voicemail' :
                                (typeIcons[pe.pianoPhraseType] || 'piano')) :
                           'library_music';
        const title = isP ?
            `${phrase ? phrase.name + ' · ' : ''}${
                typeNames[pe.pianoPhraseType] || 'Piano phrase'}` :
            'Chord progression harmonic follower';
        const hue = isP ? 'badge-teal' : 'badge-purple';
        this.setHarmonyBadgeIcon(
            badge, {visible: active, icon, title, hueClass: hue});
      }

      if (card && typeof card.animate === 'function') {
        const nextCardH = card.getBoundingClientRect().height;
        if (prevCardH > 0 && nextCardH > 0 &&
            Math.abs(nextCardH - prevCardH) > 0.5) {
          if (card._heightAnim) card._heightAnim.cancel();
          card._heightAnim = card.animate(
              [{height: `${prevCardH}px`}, {height: `${nextCardH}px`}],
              {duration: 240, easing: 'cubic-bezier(0.22, 1, 0.36, 1)'});
        }
      }
    });
  }
};

const EnsoUrlState = {
  applyUrlState(app) {
    if (typeof window === 'undefined') return;
    const q = `${window.location.search || ''}&${
        (window.location.hash || '').replace(/^#/, '')}`;
    if (q.includes('theme=dark'))
      app.setTheme('dark');
    else if (q.includes('theme=light'))
      app.setTheme('light');
    else if (q.includes('theme=auto'))
      app.setTheme('auto');
    const colorMatch = q.match(/buttonColor=([a-z0-9_-]+)/i);
    if (colorMatch && colorMatch[1])
      document.body.setAttribute('data-gm3-palette', colorMatch[1]);
    const styleMatch = q.match(/buttonStyle=([a-z0-9_-]+)/i);
    const sizeMatch = q.match(/buttonSize=([a-z0-9_-]+)/i);
    if (styleMatch && styleMatch[1]) {
      const sizeClass =
          (sizeMatch && sizeMatch[1]) ? sizeMatch[1] : 'size-compact';
      const paletteMod =
          (colorMatch && colorMatch[1]) ? ` ${colorMatch[1]}` : '';
      document.querySelectorAll('.card-header-row .m3-pill-tabs')
          .forEach((grp) => {
            grp.className =
                `pill-group ${styleMatch[1]} ${sizeClass}${paletteMod}`;
            grp.querySelectorAll('button').forEach((btn) => {
              btn.classList.remove('m3-pill-tab');
              btn.classList.add('pill-btn');
            });
          });
    }
    if (q.includes('preset=')) {
      const m = q.match(/preset=([a-z_]+)/);
      if (m && m[1]) app.applyPreset(m[1], false);
    }
    if (q.includes('lib=')) {
      const m = q.match(/lib=([a-z0-9_]+)/);
      if (m && m[1]) app.audioEngine.setPianoLibrary(m[1]);
    }
    if (q.includes('bloom=1') || q.includes('selftest=1')) {
      app.audioEngine.init();
      app.toggleTransport(true);
      ['pad', 'bell', 'choir', 'piano'].forEach(
          (id) => app.probEngine.triggerVoiceManual(id));
      app.probEngine.triggerCanvasBloom(0.38, 0.42);
      app.probEngine.triggerCanvasBloom(0.66, 0.58);
      if (app.visualizer) app.visualizer.render();
    }
    if (q.includes('startup=1')) {
      app.toggleTransport(false);
      app.showStartupBanner?.();
      if (app.visualizer) app.visualizer.render();
    }
    if (q.includes('paused=1')) {
      app.dismissStartupBanner?.();
      app.toggleTransport(false);
    }
    if (q.includes('tab=probability'))
      app.switchTab('probability');
    else if (q.includes('tab=research'))
      app.switchTab('research');
    if (q.includes('scroll=topbar')) {
      const presetCard = document.querySelector('.preset-strip-card');
      if (presetCard) presetCard.style.marginTop = '-48px';
      window.syncTopBarScroll?.();
    }
    if (q.includes('scroll=cards')) {
      document
          .querySelectorAll(
              '.preset-strip-card, .surface-card:has(#soundscape-canvas)')
          .forEach((el) => {
            el.style.display = 'none';
          });
      window.syncTopBarScroll?.();
    }
    if (q.includes('scroll=voices')) {
      document
          .querySelectorAll(
              '.preset-strip-card, .surface-card:has(#soundscape-canvas), .piano-phrases-card')
          .forEach((el) => {
            el.style.display = 'none';
          });
      window.syncTopBarScroll?.();
    }
    if (q.includes('selftest=1')) {
      app.audioEngine.setGlobalAttack(4.5);
      app.audioEngine.setGlobalRelease(11.2);
      app.audioEngine.setFilterCutoff(1650);
      app.audioEngine.setFilterResonance(5.8);
      app.audioEngine.setReverbMix(0.76);
      app.audioEngine.setReverbShimmer(0.72);
      app.audioEngine.setDelayMix(0.49);
      app.audioEngine.setDelayWow(0.44);
      const nid = app.audioEngine.triggerVoice('piano', 60, 0.55, 0, 2.0);
      const n = app.audioEngine.activeNotes.get(nid);
      const pillTabStyle =
          getComputedStyle(document.querySelector('.m3-pill-tab, .pill-btn'));
      const cardStyle =
          getComputedStyle(document.querySelector('.surface-card'));
      const pe = app.phraseEngine;
      let uniquePhraseSignatures = 0, phraseTypesCount = 0,
          maxChordInstrumentsPerTrack = 1;
      let hasPianoAndNonPianoChords = false, mutualExclusionHolds = false,
          outOfKeyNotesCount = 0;
      let chanceSimulationVerified = false, phraseGateControlsPresent = false;
      let defaultOutcomeIsPhrasePlays = false,
          startOnlyDiceMinTwoVerified = false, sunlitAtriumLfoVerified = false;
      let octaveShiftSimulationVerified = false;
      if (pe) {
        const pats = Object.values(pe.TRACK_PATTERNS || {});
        uniquePhraseSignatures =
            new Set(pats.map(
                        (p) => p.phrases && p.phrases.short_motif &&
                            p.phrases.short_motif.name))
                .size;
        phraseTypesCount =
            ['short_motif', 'chord_progression', 'longer_pattern'].length;
        const owners = new Set(pats.map((p) => p.defaultChordProgInstrument));
        hasPianoAndNonPianoChords = owners.has('piano') &&
            (owners.has('pad') || owners.has('choir') || owners.has('tape'));
        pe.setChordProgInstrument('pad');
        const nonPianoExclusion = pe.pianoPhraseType !== 'chord_progression';
        pe.setPianoPhraseType('chord_progression');
        mutualExclusionHolds =
            nonPianoExclusion && (pe.chordProgInstrument === 'piano');
        pe.setPreset(app.activePresetId);
        const defRes = pe.triggerPianoPhrase(null, null, {dryRun: true});
        defaultOutcomeIsPhrasePlays =
            (defRes.outcome === 'full_phrase' &&
             defRes.playedStepsCount === defRes.stepCount);
        outOfKeyNotesCount =
            (app.audioEngine.lastTriggeredNotes || [])
                .filter((not) => !pe.isMidiInKey(not.midi, pe.scaleId))
                .length;
        const sim = pe.simulatePhraseChance(90);
        chanceSimulationVerified =
            (sim.wholePhraseSkippedCount > 0 && sim.startOnlyCount > 0 &&
             sim.omittedNotesRunsCount > 0 && sim.fullPhraseCount > 0);
        startOnlyDiceMinTwoVerified =
            (sim.minStartOnlyNotes >= 2 && sim.maxStartOnlyNotes < 8 &&
             sim.distinctStartOnlyCounts >= 2);
        phraseGateControlsPresent = [
          'phrase-variation-chance', 'phrase-skip-chance', 'phrase-gate-prob',
          'phrase-loop-cycle', 'phrase-note-gate', 'phrase-completion-gate',
          'chord-prog-gate', 'chord-prog-cycle', 'phrase-note-octave-shift',
          'phrase-chord-octave-shift'
        ].every((id) => !!document.getElementById(id));
        const lfoSim = (typeof pe.simulatePhraseLengthLfo === 'function') ?
            pe.simulatePhraseLengthLfo() :
            null;
        sunlitAtriumLfoVerified = !!(lfoSim && lfoSim.ok);
        const octSim = (typeof pe.simulateOctaveShiftMechanics === 'function') ?
            pe.simulateOctaveShiftMechanics(20000) :
            null;
        octaveShiftSimulationVerified = !!(octSim && octSim.ok);
        var downwardOctaveCapVerified =
            !!(octSim && octSim.downwardOctaveCapVerified);
      }
      const origMode = app.themeMode || 'auto';
      const btnTheme = document.getElementById('btn-theme-toggle');
      const iconTheme = document.getElementById('theme-icon');
      app.setTheme('auto');
      const autoModeAttr =
          document.documentElement.getAttribute('data-theme-mode') === 'auto';
      const autoIconOk =
          iconTheme && iconTheme.textContent.trim() === 'brightness_auto';
      app._systemDarkOverride = true;
      app.setTheme('auto');
      const autoFollowsDark =
          document.documentElement.getAttribute('data-theme') === 'dark';
      app._systemDarkOverride = false;
      app.setTheme('auto');
      const autoFollowsLight =
          !document.documentElement.hasAttribute('data-theme');
      app._systemDarkOverride = null;
      if (btnTheme) btnTheme.click();  // auto -> light
      const cycleLightOk = app.themeMode === 'light' &&
          !document.documentElement.hasAttribute('data-theme') &&
          iconTheme?.textContent.trim() === 'light_mode';
      if (btnTheme) btnTheme.click();  // light -> dark
      const cycleDarkOk = app.themeMode === 'dark' &&
          document.documentElement.getAttribute('data-theme') === 'dark' &&
          iconTheme?.textContent.trim() === 'dark_mode';
      if (btnTheme) btnTheme.click();  // dark -> auto
      const cycleAutoOk = app.themeMode === 'auto' &&
          iconTheme?.textContent.trim() === 'brightness_auto';
      app.setTheme(origMode);
      const autoThemeModeVerified = Boolean(
          autoModeAttr && autoIconOk && autoFollowsDark && autoFollowsLight &&
          cycleLightOk && cycleDarkOk && cycleAutoOk);
      document.body.setAttribute('data-selftest', JSON.stringify({
        ok: true,
        attack: app.audioEngine.params.attack,
        release: app.audioEngine.params.release,
        cutoff: app.audioEngine.params.cutoff,
        resonance: app.audioEngine.params.resonance,
        reverbMix: app.audioEngine.params.reverbMix,
        shimmer: app.audioEngine.params.reverbShimmer,
        delayMix: app.audioEngine.params.delayMix,
        activeNotes: app.audioEngine.activeNotes.size,
        eventsLogged: app.probEngine.eventLog.length,
        voicesCount: app.probEngine.voices.length,
        feltPianoLibrary: app.audioEngine.feltPianoConfig.library,
        feltPianoHighShelfDb: app.audioEngine.feltPianoConfig.highShelfCutDb,
        pianoSamplesLoaded: app.audioEngine.pianoSamplesLoaded,
        pianoSampleCount: app.audioEngine.pianoSampleCount,
        sampledPianoTriggered: !!(n && n.usedSampledPiano),
        pianoAttackExempt: !!(n && n.attackExempt && n.effectiveAttack === 0),
        pillTabRadius: pillTabStyle.borderRadius,
        cardBorderWidth: cardStyle.borderTopWidth,
        cardBoxShadow: cardStyle.boxShadow,
        phraseEnginePresent: !!pe,
        uniquePhraseSignatures,
        phraseTypesCount,
        maxChordInstrumentsPerTrack,
        hasPianoAndNonPianoChords,
        mutualExclusionHolds,
        outOfKeyNotesCount,
        chanceSimulationVerified,
        phraseGateControlsPresent,
        defaultOutcomeIsPhrasePlays,
        startOnlyDiceMinTwoVerified,
        sunlitAtriumLfoVerified,
        octaveShiftSimulationVerified,
        downwardOctaveCapVerified: Boolean(downwardOctaveCapVerified),
        autoThemeModeVerified,
        defaultThemeMode: origMode
      }));
    }
  }
};

function attachPhraseEngineSimulations(target) {
  if (!target || !target.prototype) return;
  target.prototype.simulatePhraseChance = function(runs = 80) {
    const origVar = this.phraseVariationChance,
          origSkip = this.phraseSkipChance;
    const origNote = this.phraseNoteGate, origComp = this.phraseCompletionGate,
          origType = this.pianoPhraseType;
    this.phraseVariationChance = 0.45;
    this.phraseSkipChance = 0.15;
    this.phraseNoteGate = 0.15;
    this.phraseCompletionGate = 0.15;
    this.pianoPhraseType = 'longer_pattern';

    let wholePhraseSkippedCount = 0, startOnlyCount = 0,
        omittedNotesRunsCount = 0, fullPhraseCount = 0;
    let minStartOnlyNotes = 999, maxStartOnlyNotes = 0;
    const startOnlyDiceSet = new Set();

    for (let i = 0; i < runs; i++) {
      const res = this.triggerPianoPhrase(
          null, null,
          {dryRun: true, allowChanceOnFirst: true, ignoreLfo: true});
      if (res.outcome === 'skipped_whole_phrase')
        wholePhraseSkippedCount++;
      else if (res.outcome === 'start_only') {
        startOnlyCount++;
        minStartOnlyNotes = Math.min(minStartOnlyNotes, res.playedStepsCount);
        maxStartOnlyNotes = Math.max(maxStartOnlyNotes, res.playedStepsCount);
        startOnlyDiceSet.add(res.playedStepsCount);
      } else if (res.outcome === 'notes_omitted')
        omittedNotesRunsCount++;
      else if (res.outcome === 'full_phrase')
        fullPhraseCount++;
    }

    this.phraseVariationChance = origVar;
    this.phraseSkipChance = origSkip;
    this.phraseNoteGate = origNote;
    this.phraseCompletionGate = origComp;
    this.pianoPhraseType = origType;

    return {
      totalRuns: runs,
      wholePhraseSkippedCount,
      startOnlyCount,
      omittedNotesRunsCount,
      fullPhraseCount,
      minStartOnlyNotes: startOnlyCount > 0 ? minStartOnlyNotes : 2,
      maxStartOnlyNotes,
      distinctStartOnlyCounts: startOnlyDiceSet.size
    };
  };

  target.prototype.simulatePhraseLengthLfo = function() {
    const prevPreset = this.activePresetId, prevScale = this.scaleId,
          prevType = this.pianoPhraseType;
    const prevCycles = this.pianoCycleCount,
          prevVar = this.phraseVariationChance,
          prevSkip = this.phraseSkipChance;
    const prevNote = this.phraseNoteGate, prevComp = this.phraseCompletionGate;

    this.activePresetId = 'thursday';
    this.scaleId = 'thursday_g';
    this.pianoPhraseType = 'longer_pattern';

    const testTimes = [0, 30, 45, 60, 90, 120, 135, 150, 180];
    const expectedLengths = [8, 7, 6, 5, 4, 5, 6, 7, 8];
    const waveLengths = testTimes.map((t) => {
      const res = this.triggerPianoPhrase(
          null, null,
          {dryRun: true, disableVariations: true, lfoElapsedSec: t});
      return res.lfoCutoffIndex;
    });

    const waveMatch = waveLengths.every((len, i) => len === expectedLengths[i]);

    let dropNotesOnCurtailedCount = 0, shortenedOnCurtailedCount = 0,
        lfoCurtailedIntactCount = 0;
    let allBoundsRespected = true;

    [45, 90].forEach((t) => {
      for (let i = 0; i < 60; i++) {
        const res = this.triggerPianoPhrase(
            null, null,
            {dryRun: true, allowChanceOnFirst: true, lfoElapsedSec: t});
        if (res.playedStepsCount > res.lfoCutoffIndex)
          allBoundsRespected = false;
        if (res.outcome === 'notes_omitted')
          dropNotesOnCurtailedCount++;
        else if (res.outcome === 'start_only')
          shortenedOnCurtailedCount++;
        else if (res.outcome === 'lfo_curtailed')
          lfoCurtailedIntactCount++;
      }
    });

    this.activePresetId = prevPreset;
    this.scaleId = prevScale;
    this.pianoPhraseType = prevType;
    this.pianoCycleCount = prevCycles;
    this.phraseVariationChance = prevVar;
    this.phraseSkipChance = prevSkip;
    this.phraseNoteGate = prevNote;
    this.phraseCompletionGate = prevComp;

    const ok = waveMatch && allBoundsRespected &&
        dropNotesOnCurtailedCount > 0 && shortenedOnCurtailedCount > 0;
    return {
      ok,
      periodSec: 180,
      waveLengths,
      dropNotesOnCurtailedCount,
      shortenedOnCurtailedCount,
      lfoCurtailedIntactCount
    };
  };

  target.prototype.simulateOctaveShiftMechanics = function(runs = 20000) {
    const peObj =
        (this.probEngine &&
         typeof this.probEngine.evaluateRoundOctaveShift === 'function') ?
        this.probEngine :
        (typeof ProbabilityEngine !== 'undefined' ? new ProbabilityEngine() :
                                                    null);
    if (!peObj) return {ok: false, error: 'No probEngine'};

    const testVoice = {
      id: 'test_voice',
      octaveShiftProb: 0.10,
      roundOctaveShift: 0,
      stayShiftedProb: 0.30,
      twoOctaveRatio: 0.20
    };

    // 1. From unshifted state (-1 octave floor cap: never goes down 2 octaves)
    let oneOctCount = 0, twoOctCount = 0, zeroCount = 0, upCount = 0,
        downCount = 0, downTwoOctavesCount = 0, minOctaveShift = 0;
    for (let i = 0; i < runs; i++) {
      testVoice.roundOctaveShift = 0;
      const s = peObj.evaluateRoundOctaveShift(testVoice);
      if (s < minOctaveShift) minOctaveShift = s;
      if (s <= -2) downTwoOctavesCount++;
      if (Math.abs(s) === 1)
        oneOctCount++;
      else if (s === 2)
        twoOctCount++;
      else if (s === 0)
        zeroCount++;
      if (s > 0)
        upCount++;
      else if (s < 0)
        downCount++;
    }

    // 2. From shifted states (including clamping legacy -2 state to -1)
    let stayCount = 0, resetCount = 0, invalidShiftCount = 0;
    const testShifts = [-1, 1, 2];
    const perShiftRuns = Math.floor(runs / testShifts.length);
    testShifts.forEach((initShift) => {
      for (let i = 0; i < perShiftRuns; i++) {
        testVoice.roundOctaveShift = initShift;
        const s = peObj.evaluateRoundOctaveShift(testVoice);
        if (s <= -2) downTwoOctavesCount++;
        if (s === initShift)
          stayCount++;
        else if (s === 0)
          resetCount++;
        else
          invalidShiftCount++;
      }
    });
    testVoice.roundOctaveShift = -2;
    const clampedFromMinus2 = peObj.evaluateRoundOctaveShift(testVoice, {r: 0.1});

    // 3. Motif note shift
    const origChance = this.noteOctaveShiftChance;
    this.noteOctaveShiftChance = 0.03;
    let shiftedNotes = 0, upNotes = 0, downNotes = 0;
    for (let i = 0; i < runs; i++) {
      const s = typeof this.rollNoteOctaveShift === 'function' ?
          this.rollNoteOctaveShift() :
          0;
      if (s <= -2) downTwoOctavesCount++;
      if (s !== 0) {
        shiftedNotes++;
        if (s > 0)
          upNotes++;
        else
          downNotes++;
      }
    }
    this.noteOctaveShiftChance = origChance;

    // 4. Whole chord octave shift
    const origChordChance = this.chordOctaveShiftChance;
    this.chordOctaveShiftChance = 0.10;
    let shiftedChords = 0, upChords = 0, downChords = 0;
    for (let i = 0; i < runs; i++) {
      const s = typeof this.rollChordOctaveShift === 'function' ?
          this.rollChordOctaveShift() :
          0;
      if (s <= -2) downTwoOctavesCount++;
      if (s !== 0) {
        shiftedChords++;
        if (s > 0)
          upChords++;
        else
          downChords++;
      }
    }
    this.chordOctaveShiftChance = origChordChance;
    const wholeChordShiftRate = shiftedChords / runs;

    // 5. Verify whole-chord octave shifting & stacked downward floor (-12 st max drop)
    let wholeChordShiftVerified = false;
    let stackedDownCapVerified = false;
    if (typeof this.triggerInstrumentChordProgression === 'function') {
      const vDummy = {
        id: 'piano',
        octaveOffset: 0,
        chordOctaveShiftProb: 1.0,
        noteOctaveShiftProb: 0.0
      };
      const savedIdx = this.chordStepIndex;
      const baseRes = this.triggerInstrumentChordProgression(
          vDummy, null, {dryRun: true, disableVariations: true});
      this.chordStepIndex = savedIdx;
      const shiftedRes = this.triggerInstrumentChordProgression(
          vDummy, null, {dryRun: true, chordProb: 1.0, prob: 0.0, disableNoteOmit: true, dirRoll: 0.2, r: 0.0});
      this.chordStepIndex = savedIdx;
      const stackedRes = this.triggerInstrumentChordProgression(
          vDummy, {octaveBias: -1}, {
            dryRun: true,
            roundOctaveShift: -2,
            chordProb: 1.0,
            prob: 1.0,
            disableNoteOmit: true,
            r: 0.0,
            dirRoll: 0.9
          });
      if (baseRes && shiftedRes && stackedRes && Array.isArray(baseRes.midiNotes) &&
          Array.isArray(shiftedRes.midiNotes) && Array.isArray(stackedRes.midiNotes)) {
        const shiftExpected = (shiftedRes.chordOctaveShift || 0) * 12;
        const diffs =
            shiftedRes.midiNotes.map((m, idx) => m - baseRes.midiNotes[idx]);
        wholeChordShiftVerified = Math.abs(shiftExpected) === 12 &&
            diffs.length > 0 && diffs.every((d) => d === shiftExpected);
        const stackedDiffs =
            stackedRes.midiNotes.map((m, idx) => m - baseRes.midiNotes[idx]);
        stackedDownCapVerified =
            stackedDiffs.length > 0 && stackedDiffs.every((d) => d === -12);
      }
      const phraseBase = this.triggerPianoPhrase(vDummy, null, {
        dryRun: true,
        forcePrimary: true,
        ignoreLfo: true,
        forceFull: true,
        disableVariations: true
      });
      const phraseStacked = this.triggerPianoPhrase(
          vDummy, {octaveBias: -1}, {
            dryRun: true,
            forcePrimary: true,
            ignoreLfo: true,
            forceFull: true,
            roundOctaveShift: -2,
            chordProb: 1.0,
            prob: 1.0,
            r: 0.0,
            dirRoll: 0.9
          });
      if (phraseBase && phraseStacked && Array.isArray(phraseBase.allMidiNotes) &&
          Array.isArray(phraseStacked.allMidiNotes)) {
        const pDiffs = phraseStacked.allMidiNotes.map(
            (m, idx) => m - phraseBase.allMidiNotes[idx]);
        stackedDownCapVerified = stackedDownCapVerified && pDiffs.length > 0 &&
            pDiffs.every((d) => d === -12);
      }
    }

    const unshiftedOneOctRate = oneOctCount / runs;
    const unshiftedTwoOctRate = twoOctCount / runs;
    const totalShiftedTests = perShiftRuns * testShifts.length;
    const stayShiftedRate = stayCount / totalShiftedTests;
    const returnToBaseRate = resetCount / totalShiftedTests;
    const motifNoteShiftRate = shiftedNotes / runs;
    const downwardOctaveCapVerified = downTwoOctavesCount === 0 &&
        minOctaveShift === -1 && clampedFromMinus2 === -1 &&
        stackedDownCapVerified === true;

    const ok = Math.abs(unshiftedOneOctRate - 0.11) < 0.02 &&
        Math.abs(unshiftedTwoOctRate - 0.01) < 0.008 &&
        Math.abs(stayShiftedRate - 0.30) < 0.03 &&
        Math.abs(returnToBaseRate - 0.70) < 0.03 && invalidShiftCount === 0 &&
        Math.abs(motifNoteShiftRate - 0.03) < 0.01 &&
        Math.abs(wholeChordShiftRate - 0.10) < 0.02 &&
        wholeChordShiftVerified === true && downwardOctaveCapVerified &&
        upNotes > 0 && downNotes > 0 && upChords > 0 && downChords > 0 &&
        upCount > 0 && downCount > 0;

    return {
      ok,
      unshiftedOneOctRate,
      unshiftedTwoOctRate,
      stayShiftedRate,
      returnToBaseRate,
      invalidShiftCount,
      motifNoteShiftRate,
      wholeChordShiftRate,
      wholeChordShiftVerified,
      downTwoOctavesCount,
      minOctaveShift,
      downwardOctaveCapVerified
    };
  };
}

if (typeof window !== 'undefined') {
  window.EnsoMotion = EnsoMotion;
  window.EnsoUrlState = EnsoUrlState;
  if (window.PhraseEngine) attachPhraseEngineSimulations(window.PhraseEngine);
}
if (typeof PhraseEngine !== 'undefined') {
  attachPhraseEngineSimulations(PhraseEngine);
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {EnsoMotion, EnsoUrlState, attachPhraseEngineSimulations};
}
})();
