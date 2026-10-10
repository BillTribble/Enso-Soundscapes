/**
 * Enso Soundscapes — Voice Cards Controller
 * Renders the 6 aleatoric prime-loop voice cards, rotary controls,
 * per-instrument resonant filters, and live meter/parameter synchronization.
 */
'use strict';

(function() {
function fmtCutoff(hz) {
  const val = Number(hz) || 0;
  return val >= 1000 ? `${(val / 1000).toFixed(1)} kHz` :
                       `${Math.round(val)} Hz`;
}

function renderVoicesGrid(app) {
  const container = document.getElementById('voices-cards-container');
  if (!container || !app || !app.probEngine) return;
  container.innerHTML = '';

  app.probEngine.voices.forEach((voice) => {
    const card = document.createElement('div');
    const isPiano = voice.id === 'piano';
    const isChord =
        voice.id === (app.phraseEngine && app.phraseEngine.chordProgInstrument);
    const harmVisible = isPiano || isChord;
    card.className = `voice-card${voice.muted ? ' is-muted' : ''}${
        harmVisible ? ' has-note-octave-shift' : ''}`;
    card.id = `voice-card-${voice.id}`;

    const harmIcon = isPiano ?
        (app.activePresetId === 'discreet_loops' ?
             'voicemail' :
             (app.phraseEngine?.pianoPhraseType === 'chord_progression' ?
                  'library_music' :
                  app.phraseEngine?.pianoPhraseType === 'longer_pattern' ?
                  'piano' :
                  'queue_music')) :
        'library_music';
    const harmHue = isPiano ? 'badge-teal' : 'badge-purple';
    const harmTitle = isPiano ?
        (app.phraseEngine?.pianoPhraseType === 'chord_progression' ?
             'Chord prog' :
             app.phraseEngine?.pianoPhraseType === 'longer_pattern' ?
             'Longer pattern' :
             'Short motif') :
        'Chord progression harmonic follower';

    const octVal = Math.max(
        -4,
        Math.min(
            4, Math.round(voice.octaveOffset ?? voice.defaultOctave ?? 0)));
    const octDef =
        Math.max(-4, Math.min(4, Math.round(voice.defaultOctave ?? 0)));
    const octText = `${octVal > 0 ? '+' : ''}${octVal} oct`;
    const octShiftVal =
        voice.octaveShiftProb ?? voice.defaultOctaveShiftProb ?? 0.10;
    const noteOctShiftVal = voice.noteOctaveShiftProb ??
        voice.defaultNoteOctaveShiftProb ??
        (app.phraseEngine?.noteOctaveShiftChance ?? 0.03);
    const chordOctShiftVal = voice.chordOctaveShiftProb ??
        voice.defaultChordOctaveShiftProb ??
        (app.phraseEngine?.chordOctaveShiftChance ?? 0.10);

    const cutoffVal =
        (app.globalVoiceFilters && app.globalVoiceFilters[voice.id]?.cutoff) ??
        (voice.cutoff ?? voice.defaultCutoff ?? 8000);
    const resVal = (app.globalVoiceFilters &&
                    app.globalVoiceFilters[voice.id]?.resonance) ??
        (voice.resonance ?? voice.defaultResonance ?? 1.0);
    const reverbVal =
        (app.globalVoiceFx && app.globalVoiceFx[voice.id]?.reverb) ??
        (voice.reverb ?? voice.defaultReverb ?? (voice.id === 'piano' ? 0.35 : 0.65));
    const delayVal =
        (app.globalVoiceFx && app.globalVoiceFx[voice.id]?.delay) ??
        (voice.delay ?? voice.defaultDelay ?? (voice.id === 'piano' ? 0.12 : 0.35));

    card.innerHTML = `
        <div class="card-header-row">
          <div class="card-title-cluster">
            <span class="badge badge-${voice.badgeHue || 'blue'}">${
        voice.name}</span>
            <span id="voice-note-${voice.id}" class="badge">${
        voice.lastNote}</span>
            <span id="voice-harmony-badge-${
        voice.id}" class="badge badge-icon-only ${harmHue}" title="${
        harmTitle}" aria-label="${harmTitle}"${
        harmVisible ?
            '' :
            ' style="display: none;"'}><span class="material-symbols-outlined">${
        harmIcon}</span></span>
          </div>
          <div class="badge-row">
            <button type="button" class="icon-btn voice-pluck-btn" data-voice-id="${
        voice.id}" aria-label="Trigger ${
        voice.name} immediately" title="Trigger ${
        voice
            .name} immediately"><span class="material-symbols-outlined">play_circle</span></button>
            <button type="button" class="icon-btn voice-mute-btn${
        voice.muted ? ' active' :
                      ''}" data-voice-id="${voice.id}" aria-label="Mute ${
        voice
            .name}" title="Mute or unmute voice"><span class="material-symbols-outlined">${
        voice.muted ? 'volume_off' : 'volume_up'}</span></button>
          </div>
        </div>
        <div class="voice-phase-bar-track" title="Asynchronous prime loop phase"><div id="voice-phase-${
        voice.id}" class="voice-phase-bar-fill"></div></div>
        <div class="macro-rack-grid-3">
          <div class="control-row">
            <div class="control-label-line"><label for="voice-gain-${
        voice.id}">Volume</label><span id="val-voice-gain-${
        voice.id}" class="control-value">${
        Math.round((voice.gain ?? 0.75) * 100)}%</span></div>
            <input type="range" id="voice-gain-${
        voice.id}" class="voice-gain-slider" data-voice-id="${
        voice.id}" min="0" max="${
        voice.id === 'piano' ?
            '5.0' :
            '1.5'}" step="0.01" value="${voice.gain ?? 0.75}">
          </div>
          <div class="control-row">
            <div class="control-label-line"><label for="voice-prob-${
        voice.id}">Gate probability</label><span id="val-voice-prob-${
        voice.id}" class="control-value">${
        Math.round(voice.prob * 100)}%</span></div>
            <input type="range" id="voice-prob-${
        voice.id}" class="voice-prob-slider" data-voice-id="${
        voice.id}" min="0" max="1" step="0.01" value="${voice.prob}">
          </div>
          <div class="control-row">
            <div class="control-label-line"><label for="voice-cutoff-${
        voice.id}">Filter cutoff</label><span id="val-voice-cutoff-${
        voice.id}" class="control-value">${fmtCutoff(cutoffVal)}</span></div>
            <input type="range" id="voice-cutoff-${
        voice.id}" class="voice-cutoff-slider" data-voice-id="${
        voice.id}" data-default-value="${
        voice.defaultCutoff ??
        8000}" min="80" max="16000" step="10" value="${Math.round(cutoffVal)}">
          </div>
          <div class="control-row">
            <div class="control-label-line"><label for="voice-resonance-${
        voice.id}">Resonance</label><span id="val-voice-resonance-${
        voice.id}" class="control-value">Q ${resVal.toFixed(1)}</span></div>
            <input type="range" id="voice-resonance-${
        voice.id}" class="voice-resonance-slider" data-voice-id="${
        voice.id}" data-default-value="${
        voice.defaultResonance ??
        1.0}" min="0.1" max="14.0" step="0.1" value="${resVal.toFixed(1)}">
          </div>
          <div class="control-row">
            <div class="control-label-line"><label for="voice-cycle-${
        voice.id}">Prime loop cycle</label><span id="val-voice-cycle-${
        voice.id}" class="control-value">${
        voice.cycle.toFixed(1)} s</span></div>
            <input type="range" id="voice-cycle-${
        voice.id}" class="voice-cycle-slider" data-voice-id="${
        voice.id}" min="3.1" max="47.3" step="0.2" value="${voice.cycle}">
          </div>
          <div class="control-row">
            <div class="control-label-line"><label for="voice-release-${
        voice.id}">Release</label><span id="val-voice-release-${
        voice.id}" class="control-value">${
        (voice.release ?? 7.0).toFixed(1)} s</span></div>
            <input type="range" id="voice-release-${
        voice.id}" class="voice-release-slider" data-voice-id="${
        voice.id}" min="0.2" max="20.0" step="0.1" value="${
        voice.release ?? 7.0}">
          </div>
          <div class="control-row voice-octave-row">
            <div class="control-label-line"><label for="voice-octave-${
        voice.id}">Octave</label><span id="val-voice-octave-${
        voice.id}" class="control-value">${octText}</span></div>
            <div class="voice-octave-stepper" role="group" aria-label="${
        voice.name} octave step">
              <button type="button" class="voice-octave-step-btn" data-voice-id="${
        voice.id}" data-step="-1" aria-label="Decrease ${
        voice.name} octave" title="Octave -1"${
        octVal <= -4 ? ' disabled' : ''}>−</button>
              <button type="button" class="voice-octave-step-btn" data-voice-id="${
        voice.id}" data-step="1" aria-label="Increase ${
        voice.name} octave" title="Octave +1"${
        octVal >= 4 ? ' disabled' : ''}>+</button>
            </div>
            <input type="range" id="voice-octave-${
        voice.id}" class="voice-octave-slider" data-voice-id="${
        voice.id}" data-default-value="${
        octDef}" min="-4" max="4" step="1" value="${octVal}">
          </div>
          <div class="control-row">
            <div class="control-label-line"><label for="voice-octave-shift-${
        voice.id}">Octave shift</label><span id="val-voice-octave-shift-${
        voice.id}" class="control-value">${
        Math.round(octShiftVal * 100)}%</span></div>
            <input type="range" id="voice-octave-shift-${
        voice.id}" class="voice-octave-shift-slider" data-voice-id="${
        voice
            .id}" data-default-value="0.10" min="0" max="1" step="0.01" value="${
        octShiftVal.toFixed(2)}">
          </div>
          <div class="control-row voice-note-octave-shift-row" id="row-voice-note-octave-shift-${
        voice.id}"${harmVisible ? '' : ' style="display: none;"'}>
            <div class="control-label-line"><label for="voice-note-octave-shift-${
        voice
            .id}">Note octave shift</label><span id="val-voice-note-octave-shift-${
        voice.id}" class="control-value">${
        Math.round(noteOctShiftVal * 100)}%</span></div>
            <input type="range" id="voice-note-octave-shift-${
        voice.id}" class="voice-note-octave-shift-slider" data-voice-id="${
        voice
            .id}" data-default-value="0.03" min="0" max="1" step="0.01" value="${
        noteOctShiftVal.toFixed(2)}">
          </div>
          <div class="control-row voice-chord-octave-shift-row" id="row-voice-chord-octave-shift-${
        voice.id}"${harmVisible ? '' : ' style="display: none;"'}>
            <div class="control-label-line"><label for="voice-chord-octave-shift-${
        voice
            .id}">Whole chord octave shift</label><span id="val-voice-chord-octave-shift-${
        voice.id}" class="control-value">${
        Math.round(chordOctShiftVal * 100)}%</span></div>
            <input type="range" id="voice-chord-octave-shift-${
        voice.id}" class="voice-chord-octave-shift-slider" data-voice-id="${
        voice
            .id}" data-default-value="0.10" min="0" max="1" step="0.01" value="${
        chordOctShiftVal.toFixed(2)}">
          </div>
        </div>
        <div class="voice-waveform-box" title="${voice.name} live waveform">
          <canvas id="voice-wave-${
        voice.id}" class="voice-waveform-canvas" data-voice-id="${
        voice.id}" aria-label="${voice.name} live waveform"></canvas>
        </div>
      `;
    container.appendChild(card);
    app.audioEngine.setVoiceVolume(
        voice.id, voice.baseGain ?? voice.gain ?? 0.75);
    app.audioEngine.setVoiceRelease(voice.id, voice.release ?? 7.0);
    app.audioEngine.setVoiceFilterCutoff(voice.id, cutoffVal);
    app.audioEngine.setVoiceFilterResonance(voice.id, resVal);
    app.audioEngine.setVoiceReverbSend?.(voice.id, reverbVal);
    app.audioEngine.setVoiceDelaySend?.(voice.id, delayVal);
  });

  ['gain', 'prob', 'cutoff', 'resonance', 'cycle', 'release',
   'octave', 'octave-shift', 'note-octave-shift', 'chord-octave-shift']
      .forEach((param) => {
        container.querySelectorAll(`.voice-${param}-slider`).forEach((slider) => {
          slider.addEventListener('input', () => {
            const vId = slider.dataset.voiceId, val = parseFloat(slider.value);
            if (param === 'gain') {
              app.probEngine.setVoiceParam(vId, 'gain', val);
              app.audioEngine.setVoiceVolume(vId, val);
              if (typeof app.setGlobalVoiceGain === 'function') {
                app.setGlobalVoiceGain(vId, val);
              }
            } else if (param === 'cutoff') {
              app.probEngine.setVoiceParam(vId, 'cutoff', val);
              app.audioEngine.setVoiceFilterCutoff(vId, val);
              if (typeof app.setGlobalVoiceFilter === 'function') {
                app.setGlobalVoiceFilter(vId, val, undefined);
              }
            } else if (param === 'resonance') {
              app.probEngine.setVoiceParam(vId, 'resonance', val);
              app.audioEngine.setVoiceFilterResonance(vId, val);
              if (typeof app.setGlobalVoiceFilter === 'function') {
                app.setGlobalVoiceFilter(vId, undefined, val);
              }
            } else if (param === 'octave-shift') {
              app.probEngine.setVoiceParam(vId, 'octaveShiftProb', val);
            } else if (param === 'note-octave-shift') {
              app.probEngine.setVoiceParam(vId, 'noteOctaveShiftProb', val);
              if (app.phraseEngine &&
                  (vId === 'piano' ||
                   vId === app.phraseEngine.chordProgInstrument)) {
                app.phraseEngine.noteOctaveShiftChance = val;
                const topSl =
                          document.getElementById('phrase-note-octave-shift'),
                      topLbl = document.getElementById(
                          'val-phrase-note-octave-shift');
                if (topSl) {
                  topSl.value = val.toFixed(2);
                  topSl.dispatchEvent(new Event('change'));
                }
                if (topLbl) topLbl.textContent = `${Math.round(val * 100)}%`;
              }
            } else if (param === 'chord-octave-shift') {
              app.probEngine.setVoiceParam(vId, 'chordOctaveShiftProb', val);
              if (app.phraseEngine &&
                  (vId === 'piano' ||
                   vId === app.phraseEngine.chordProgInstrument)) {
                app.phraseEngine.chordOctaveShiftChance = val;
                const topSl =
                          document.getElementById('phrase-chord-octave-shift'),
                      topLbl = document.getElementById(
                          'val-phrase-chord-octave-shift');
                if (topSl) {
                  topSl.value = val.toFixed(2);
                  topSl.dispatchEvent(new Event('change'));
                }
                if (topLbl) topLbl.textContent = `${Math.round(val * 100)}%`;
              }
            } else {
              app.probEngine.setVoiceParam(vId, param, val);
              if (param === 'release')
                app.audioEngine.setVoiceRelease(vId, val);
              if (app.phraseEngine && (param === 'prob' || param === 'cycle')) {
                if (vId === 'piano')
                  app.phraseEngine[param === 'prob' ? 'phraseGateProb' : 'phraseLoopCycle'] =
                      val;
                if (vId === app.phraseEngine.chordProgInstrument)
                  app.phraseEngine[param === 'prob' ? 'chordProgGate' : 'chordProgCycle'] =
                      val;
                app.phraseEngine.syncUI?.();
              }
            }
            const lbl = document.getElementById(`val-voice-${param}-${vId}`);
            if (param === 'octave') {
              const oct = Math.max(-4, Math.min(4, Math.round(val)));
              if (lbl) lbl.textContent = `${oct > 0 ? '+' : ''}${oct} oct`;
              container
                  .querySelectorAll(
                      `.voice-octave-step-btn[data-voice-id="${vId}"]`)
                  .forEach((b) => {
                    b.disabled =
                        (parseInt(b.dataset.step, 10) < 0 && oct <= -4) ||
                        (parseInt(b.dataset.step, 10) > 0 && oct >= 4);
                  });
            } else if (param === 'cutoff') {
              if (lbl) lbl.textContent = fmtCutoff(val);
            } else if (param === 'resonance') {
              if (lbl) lbl.textContent = `Q ${val.toFixed(1)}`;
            } else if (lbl) {
              lbl.textContent = (param === 'cycle' || param === 'release') ?
                  `${val.toFixed(1)} s` :
                  `${Math.round(val * 100)}%`;
            }
            if (param === 'cycle') app.updateHorizonBadge();
          });
        });
      });

  container.querySelectorAll('.voice-octave-step-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const vId = btn.dataset.voiceId,
            step = parseInt(btn.dataset.step, 10) || 0;
      const slider = document.getElementById(`voice-octave-${vId}`);
      if (!slider) return;
      const next = Math.max(
          -4, Math.min(4, Math.round(parseFloat(slider.value) || 0) + step));
      slider.value = String(next);
      slider.dispatchEvent(new Event('input', {bubbles: true}));
    });
  });

  container.querySelectorAll('.voice-pluck-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      app.audioEngine.init();
      app.audioEngine.resume();
      app.probEngine.triggerVoiceManual(btn.dataset.voiceId);
    });
  });

  container.querySelectorAll('.voice-mute-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const vId = btn.dataset.voiceId,
            voice = app.probEngine.voices.find((v) => v.id === vId);
      if (!voice) return;
      const nextMuted = !voice.muted;
      app.probEngine.setVoiceParam(vId, 'muted', nextMuted);
      btn.classList.toggle('active', nextMuted);
      const icon = btn.querySelector('.material-symbols-outlined');
      if (icon) icon.textContent = nextMuted ? 'volume_off' : 'volume_up';
      document.getElementById(`voice-card-${vId}`)
          ?.classList.toggle('is-muted', nextMuted);
    });
  });

  if (window.syncStudioControls) window.syncStudioControls();
  if (app.visualizer && typeof app.visualizer.resize === 'function') {
    app.visualizer.resize();
  }
}

function syncVoiceGainSlidersFromCrossfade(app) {
  if (!app || !app.probEngine) return;
  app.probEngine.voices.forEach((v) => {
    const eff = v.gain ?? 0.75;
    const sl = document.getElementById(`voice-gain-${v.id}`);
    const lbl = document.getElementById(`val-voice-gain-${v.id}`);
    if (sl) {
      sl.value = eff.toFixed(2);
      sl.style.setProperty(
          '--pct',
          `${
              Math.min(100, (eff / (parseFloat(sl.max || '1.5') || 1.5)) * 100)
                  .toFixed(2)}%`);
      sl.closest('.control-row')
          ?.querySelector('.rotary-dial-widget')
          ?._syncVisual?.();
    }
    if (lbl) lbl.textContent = `${Math.round(eff * 100)}%`;
  });
}

function syncVoiceFilterSliders(app) {
  if (!app || !app.probEngine) return;
  app.probEngine.voices.forEach((v) => {
    const gFilt = app.globalVoiceFilters?.[v.id] || {};
    const cutoff = gFilt.cutoff ?? v.cutoff ?? v.defaultCutoff ?? 8000;
    const resonance =
        gFilt.resonance ?? v.resonance ?? v.defaultResonance ?? 1.0;

    const slCut = document.getElementById(`voice-cutoff-${v.id}`);
    const lblCut = document.getElementById(`val-voice-cutoff-${v.id}`);
    if (slCut) {
      slCut.value = Math.round(cutoff);
      const min = parseFloat(slCut.min || '80'),
            max = parseFloat(slCut.max || '16000');
      slCut.style.setProperty(
          '--pct',
          `${
              Math.max(0, Math.min(100, ((cutoff - min) / (max - min)) * 100))
                  .toFixed(2)}%`);
      slCut.closest('.control-row')
          ?.querySelector('.rotary-dial-widget')
          ?._syncVisual?.();
    }
    if (lblCut) lblCut.textContent = fmtCutoff(cutoff);

    const slRes = document.getElementById(`voice-resonance-${v.id}`);
    const lblRes = document.getElementById(`val-voice-resonance-${v.id}`);
    if (slRes) {
      slRes.value = resonance.toFixed(1);
      const min = parseFloat(slRes.min || '0.1'),
            max = parseFloat(slRes.max || '14.0');
      slRes.style.setProperty(
          '--pct',
          `${
              Math.max(
                      0, Math.min(100, ((resonance - min) / (max - min)) * 100))
                  .toFixed(2)}%`);
      slRes.closest('.control-row')
          ?.querySelector('.rotary-dial-widget')
          ?._syncVisual?.();
    }
    if (lblRes) lblRes.textContent = `Q ${resonance.toFixed(1)}`;
  });
}

window.EnsoVoiceCards = {
  fmtCutoff,
  renderVoicesGrid,
  syncVoiceGainSlidersFromCrossfade,
  syncVoiceFilterSliders
};
})();
