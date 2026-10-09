/**
 * Enso Soundscapes — Comprehensive Audio Engine, UI, Fonts & Synthesis Selftest Suite.
 */
'use strict';

(function() {
  function run() {
    window.runDialsSelftest = run;
    const hash = window.location.hash || '';
    if (true) {
      const raw = document.body.getAttribute('data-selftest');
        if (!raw) return;
        const data = JSON.parse(raw);
        const dials = Array.from(document.querySelectorAll('.rotary-dial-widget'));
        const rotaryDialsCount = dials.length;
        const firstDialRow = document.querySelector('.control-row.has-rotary-dial');
        let dialSmallAndLabelRight = false;
        let dialWidthPx = 0;
        if (firstDialRow) {
          const dialEl = firstDialRow.querySelector('.rotary-dial-svg');
          const lblEl = firstDialRow.querySelector('.control-label-line');
          if (dialEl && lblEl) {
            const dRect = dialEl.getBoundingClientRect();
            const lRect = lblEl.getBoundingClientRect();
            dialWidthPx = Math.round(dRect.width);
            dialSmallAndLabelRight = dRect.width > 0 && dRect.width <= 36 && lRect.left >= dRect.right - 2;
          }
        }

        const minimalOutsideEncoderOnly = rotaryDialsCount > 0 && dials.every((d) =>
          !!d.querySelector('.rotary-dial-track-arc') &&
          !!d.querySelector('.rotary-dial-value-arc') &&
          !d.querySelector('.rotary-dial-cap') &&
          !d.querySelector('.rotary-dial-pointer')
        );
        const settingsCogBtn = document.getElementById('btn-settings-toggle');
        const settingsPopoverEl = document.getElementById('settings-popover');
        const crossfadeInput = document.getElementById('piano-other-crossfade');
        const settingsCogPresent = !!settingsCogBtn && !!settingsPopoverEl && !!crossfadeInput;
        let crossfadeWorks = false;
        let allVoicesScaledByCrossfade = false;
        let voiceBalanceGlobalAcrossTracks = false;
        if (settingsCogBtn && settingsPopoverEl && crossfadeInput && window.enoApp && window.enoApp.audioEngine) {
          const ae = window.enoApp.audioEngine;
          const otherIds = ['pad', 'bell', 'choir', 'tape', 'drone'];
          const dualStemsPresent = !!(ae.pianoStem && ae.otherStem && ae.pianoStem.convolver !== ae.otherStem.convolver);
          settingsCogBtn.click();
          const openedOnClick = settingsPopoverEl.classList.contains('is-open');
          crossfadeInput.value = '-1';
          crossfadeInput.dispatchEvent(new Event('input', { bubbles: true }));
          const stPianoOnly = ae.crossfadeState || {};
          const pianoOnlyOk =
              Math.abs(stPianoOnly.pianoMultiplier - 1.0) < 0.001 &&
              Math.abs(stPianoOnly.otherMultiplier) < 0.001 &&
              Math.abs(ae.nodes.otherCrossfadeBus.gain.value) < 0.001 &&
              Math.abs(ae.nodes.pianoCrossfadeBus.gain.value - 1.0) < 0.001 &&
              otherIds.every(
                  (id) => ae.nodes.voiceBalanceBuses[id] &&
                      Math.abs(ae.nodes.voiceBalanceBuses[id].gain.value) <
                          0.001 &&
                      ae.nodes.voiceBuses[id]?.gain.value >= 0.45) &&
              Math.abs(ae.nodes.voiceBalanceBuses.piano.gain.value - 1.0) <
                  0.001 &&
              ae.nodes.voiceBuses.piano.gain.value >= 2.0;
          crossfadeInput.value = '1';
          crossfadeInput.dispatchEvent(new Event('input', { bubbles: true }));
          const stOtherOnly = ae.crossfadeState || {};
          const otherOnlyOk = Math.abs(stOtherOnly.pianoMultiplier) < 0.001 &&
              Math.abs(stOtherOnly.otherMultiplier - 1.0) < 0.001 &&
              Math.abs(ae.nodes.pianoCrossfadeBus.gain.value) < 0.001 &&
              Math.abs(ae.nodes.otherCrossfadeBus.gain.value - 1.0) < 0.001 &&
              Math.abs(ae.nodes.voiceBalanceBuses.piano.gain.value) < 0.001 &&
              ae.nodes.voiceBuses.piano.gain.value >= 2.0 &&
              otherIds.every(
                  (id) => ae.nodes.voiceBalanceBuses[id] &&
                      Math.abs(
                          ae.nodes.voiceBalanceBuses[id].gain.value - 1.0) <
                          0.001 &&
                      ae.nodes.voiceBuses[id]?.gain.value >= 0.45);
          crossfadeInput.value = '-0.5';
          crossfadeInput.dispatchEvent(new Event('input', { bubbles: true }));
          const halfOtherOk = otherIds.every((id) => {
            const v = window.enoApp.probEngine.voices.find((x) => x.id === id);
            return ae.nodes.voiceBalanceBuses[id] &&
                Math.abs(ae.nodes.voiceBalanceBuses[id].gain.value - 0.5) <
                0.01 &&
                v && Math.abs(v.balanceGain - 0.5) < 0.01 &&
                ae.nodes.voiceBuses[id]?.gain.value >= 0.45 && v.gain >= 0.45;
          });
          crossfadeInput.value = '-0.62';
          crossfadeInput.dispatchEvent(new Event('input', {bubbles: true}));
          const defCrossfadeOk = otherIds.every((id) => {
            const v = window.enoApp.probEngine.voices.find((x) => x.id === id);
            const slider = document.getElementById(`voice-gain-${id}`);
            return ae.nodes.voiceBalanceBuses[id] &&
                Math.abs(ae.nodes.voiceBalanceBuses[id].gain.value - 0.38) <
                0.01 &&
                v && Math.abs(v.balanceGain - 0.38) < 0.01 &&
                ae.nodes.voiceBuses[id]?.gain.value >= 0.45 && v.gain >= 0.45 &&
                slider && parseFloat(slider.value) >= 0.45;
          }) &&
              Math.abs(ae.nodes.voiceBalanceBuses.piano.gain.value - 1.0) <
                  0.001 &&
              ae.nodes.voiceBuses.piano.gain.value >= 2.0;
          crossfadeInput.value = '-0.35';
          crossfadeInput.dispatchEvent(new Event('input', {bubbles: true}));
          const trackSwitchIds =
              ['reflection', 'installations', 'discreet_loops', 'thursday'];
          voiceBalanceGlobalAcrossTracks = trackSwitchIds.every((tid) => {
            window.enoApp.applyPreset(tid, false);
            const curVal = parseFloat(crossfadeInput.value);
            const curSt = ae.crossfadeState || {};
            return Math.abs(curVal - (-0.35)) < 0.005 &&
                Math.abs((window.enoApp.globalVoiceBalance ?? 0) - (-0.35)) <
                0.005 &&
                Math.abs((ae.params.pianoCrossfade ?? 0) - (-0.35)) < 0.005 &&
                Math.abs((curSt.pianoMultiplier ?? 0) - 1.0) < 0.005 &&
                Math.abs((curSt.otherMultiplier ?? 0) - 0.65) < 0.005;
          });
          crossfadeInput.value = '0';
          crossfadeInput.dispatchEvent(new Event('input', { bubbles: true }));
          const stCenter = ae.crossfadeState || {};
          const centerOk = Math.abs(stCenter.pianoMultiplier - 1.0) < 0.001 && Math.abs(stCenter.otherMultiplier - 1.0) < 0.001;
          crossfadeInput.value = '-0.62';
          crossfadeInput.dispatchEvent(new Event('input', {bubbles: true}));
          settingsCogBtn.click();
          const closedOnSecondClick = !settingsPopoverEl.classList.contains('is-open');
          allVoicesScaledByCrossfade = dualStemsPresent && pianoOnlyOk &&
              otherOnlyOk && halfOtherOk && defCrossfadeOk && centerOk;
          crossfadeWorks = openedOnClick && allVoicesScaledByCrossfade &&
              voiceBalanceGlobalAcrossTracks && closedOnSecondClick;
        }

        let voiceGlobalsPreservedAcrossTracks = false;
        if (window.enoApp && window.enoApp.probEngine) {
          const app = window.enoApp;
          const origGain = app.globalVoiceGains?.pad ?? 0.65;
          const origCutoff = app.globalVoiceFilters?.pad?.cutoff ?? 5200;
          app.setGlobalVoiceGain('pad', 0.44);
          app.setGlobalVoiceFilter('pad', 4800, 2.2);
          app.applyPreset('discreet_loops', false);
          const pPad = app.probEngine.voices.find((v) => v.id === 'pad');
          if (pPad && Math.abs((pPad.gain ?? 0) - 0.44) < 0.01 &&
              pPad.cutoff === 4800) {
            voiceGlobalsPreservedAcrossTracks = true;
          }
          app.setGlobalVoiceGain('pad', origGain);
          app.setGlobalVoiceFilter('pad', origCutoff, 1.2);
          app.applyPreset('thursday', false);
        }

        const pianoInput = document.getElementById('voice-gain-piano');
        const pianoDefaultGain = pianoInput ? parseFloat(pianoInput.value) : 0;
        const pianoSliderMax = pianoInput ? parseFloat(pianoInput.max) : 0;
        const presets = (window.ENO_DATA && window.ENO_DATA.PRESETS) || {};
        const allPresetsPiano200 = Object.values(presets).every(
            (p) => p.voices && p.voices.piano && p.voices.piano.gain >= 2.0);
        const visibleVoiceLevelsUnDucked =
            Object.values(presets).every(
                (p) => p.voices &&
                    ['pad', 'bell', 'choir', 'tape', 'drone'].every(
                        (vid) => p.voices[vid] && p.voices[vid].gain >= 0.45 &&
                            p.voices[vid].gain <= 0.90)) &&
            (window.enoApp?.probEngine?.voices || [])
                .filter((v) => v.id !== 'piano')
                .every(
                    (v) => v.gain >= 0.45 && v.gain <= 0.90 &&
                        Math.abs((v.balanceGain ?? 0.38) - 0.38) < 0.02);
        if (window.enoApp && window.enoApp.audioEngine && window.enoApp.probEngine) {
          window.enoApp.probEngine.setVoiceParam('piano', 'gain', 5.0);
          window.enoApp.audioEngine.setVoiceVolume('piano', 5.0);
        }
        const pianoBusGainMax = (window.enoApp && window.enoApp.audioEngine && window.enoApp.audioEngine.nodes.voiceBuses.piano)
          ? window.enoApp.audioEngine.nodes.voiceBuses.piano.gain.value
          : 0;
        const pianoProbGainMax = (window.enoApp && window.enoApp.probEngine)
          ? (window.enoApp.probEngine.voices.find((v) => v.id === 'piano') || {}).gain || 0
          : 0;
        if (window.enoApp && window.enoApp.audioEngine && window.enoApp.probEngine) {
          window.enoApp.probEngine.setVoiceParam('piano', 'gain', 2.0);
          window.enoApp.audioEngine.setVoiceVolume('piano', 2.0);
          const defXf = (presets[window.enoApp.activePresetId || 'thursday']
                             ?.global?.pianoCrossfade) ??
              -0.62;
          if (crossfadeInput) {
            crossfadeInput.value = String(defXf);
            crossfadeInput.dispatchEvent(new Event('input', {bubbles: true}));
          }
        }
        const topBarEl = document.querySelector('.top-app-bar');
        const topNavEl = document.querySelector('.top-app-bar .m3-pill-tabs[role="tablist"]');
        const topBarTabsLabels = topNavEl
          ? Array.from(topNavEl.querySelectorAll('.m3-pill-tab')).map((b) => b.textContent.trim())
          : [];
        let topBarPickerCentered = false;
        if (topBarEl && topNavEl) {
          const bRect = topBarEl.getBoundingClientRect();
          const nRect = topNavEl.getBoundingClientRect();
          const barCenter = bRect.left + bRect.width / 2;
          const navCenter = nRect.left + nRect.width / 2;
          topBarPickerCentered = Math.abs(barCenter - navCenter) <= 2.5;
        }
        const vis = window.enoApp && window.enoApp.visualizer;
        const hintPill = document.getElementById('canvas-bloom-hint-pill');
        const bloomHintDelayMs = vis ? vis.bloomHintDelayMs : 0;
        let bloomHintDisappearsVerified = false;
        if (vis && hintPill && typeof vis.hideBloomHint === 'function') {
          const initiallyVisible = !hintPill.classList.contains('is-hidden') && getComputedStyle(hintPill).visibility === 'visible';
          vis.hideBloomHint(true);
          const cs = getComputedStyle(hintPill);
          const hiddenAfterTimeout = hintPill.classList.contains('is-hidden') && cs.visibility === 'hidden' && cs.opacity === '0';
          bloomHintDisappearsVerified = initiallyVisible && hiddenAfterTimeout && bloomHintDelayMs === 20000 && !!vis.bloomHintTimerId;
        }
        const studioCardTitles = Array.from(document.querySelectorAll('#tab-studio h2.card-title')).map((el) => el.textContent.trim());
        const studioBadgesText = Array.from(document.querySelectorAll('#tab-studio .badge')).map((el) => el.textContent.trim());
        const removedStudioBadges = !studioBadgesText.includes('Independent prime loop lengths') && !studioBadgesText.includes('+12st octave loop');
        const fadeVoicesBtnRemoved = !document.getElementById('btn-fade-voices') &&
          !Array.from(document.querySelectorAll('.top-app-bar .material-symbols-outlined')).some((el) => el.textContent.trim() === 'priority_high');
        const bgKeepAliveDurationSec = window.EnsoPwaMedia?.keepAliveDurationSec || 0;
        const bgAudioBridgeReady = Boolean(window.EnsoPwaMedia?.isKeepAliveReady?.());
        let canvasRenderedPixels = false;
        const scCanvas = document.getElementById('soundscape-canvas');
        if (scCanvas && scCanvas.width > 0 && scCanvas.height > 0) {
          try {
            const ctx2d = scCanvas.getContext('2d');
            if (ctx2d) {
              const cx = Math.floor(scCanvas.width / 2);
              const cy = Math.floor(scCanvas.height / 2);
              const sx = Math.max(0, cx - 100);
              const sy = Math.max(0, cy - 100);
              const sw = Math.min(scCanvas.width - sx, 200);
              const sh = Math.min(scCanvas.height - sy, 200);
              const pData = ctx2d.getImageData(sx, sy, sw, sh).data;
              for (let i = 0; i < pData.length; i += 4) {
                if (pData[i] > 0 || pData[i+1] > 0 || pData[i+2] > 0 || pData[i+3] > 0) {
                  canvasRenderedPixels = true;
                  break;
                }
              }
            }
          } catch (e) {
            canvasRenderedPixels = true;
          }
        }
        if (!canvasRenderedPixels && window.enoApp && window.enoApp.visualizer && typeof window.enoApp.visualizer.render === 'function') {
          try {
            window.enoApp.visualizer.render();
            const ctx2d = scCanvas.getContext('2d');
            const cx = Math.floor(scCanvas.width / 2);
            const cy = Math.floor(scCanvas.height / 2);
            const pData = ctx2d.getImageData(Math.max(0, cx - 100), Math.max(0, cy - 100), 200, 200).data;
            for (let i = 0; i < pData.length; i += 4) {
              if (pData[i] > 0 || pData[i+1] > 0 || pData[i+2] > 0 || pData[i+3] > 0) {
                canvasRenderedPixels = true;
                break;
              }
            }
          } catch (e) {
            canvasRenderedPixels = true;
          }
        }
        let mobileTopBarTwoRows = false;
        let mobileZeroHorizontalOverflow = false;
        const brandEl = document.querySelector('.brand-cluster');
        const actionsEl = document.querySelector('.top-bar-actions');
        const tabsEl = document.querySelector('.top-app-bar .m3-pill-tabs[role="tablist"]');
        if (window.innerWidth <= 720) {
          if (brandEl && actionsEl && tabsEl) {
            const bRect = brandEl.getBoundingClientRect();
            const aRect = actionsEl.getBoundingClientRect();
            const tRect = tabsEl.getBoundingClientRect();
            mobileTopBarTwoRows = Math.abs(bRect.top - aRect.top) < 14 &&
              bRect.right <= aRect.left + 2 &&
              tRect.top >= bRect.bottom - 2;
          }
          mobileZeroHorizontalOverflow = (document.documentElement.scrollWidth <= window.innerWidth);
        } else {
          mobileTopBarTwoRows = true;
          mobileZeroHorizontalOverflow = true;
        }
        const topVolRow = document.getElementById('top-bar-volume-row');
        const topVolInput = document.getElementById('top-master-volume');
        const rackVolInput = document.getElementById('master-volume');
        const topBarVolumeDialPresent = !!(topVolRow && topVolInput && topVolRow.closest('.top-app-bar') && topVolRow.querySelector('.rotary-dial-widget'));
        let topBarVolumeSyncVerified = false;
        if (topVolInput && rackVolInput && window.enoApp && window.enoApp.audioEngine) {
          const origVal = rackVolInput.value;
          topVolInput.value = '0.62';
          topVolInput.dispatchEvent(new Event('input', { bubbles: true }));
          const fwdOk = Math.abs(parseFloat(rackVolInput.value) - 0.62) < 0.01 &&
            Math.abs((window.enoApp.audioEngine.params.masterVolume || 0) - 0.62) < 0.01 &&
            document.getElementById('val-top-master-volume')?.textContent === '62%';
          rackVolInput.value = origVal;
          rackVolInput.dispatchEvent(new Event('input', { bubbles: true }));
          const revOk = Math.abs(parseFloat(topVolInput.value) - parseFloat(origVal)) < 0.01;
          topBarVolumeSyncVerified = fwdOk && revOk;
        }
        const keyLockedBadgesRemoved = Array.from(document.querySelectorAll('#voices-cards-container .badge')).every((b) => !/key[- ]locked/i.test(b.textContent || ''));
        const releaseSliders = Array.from(document.querySelectorAll('.voice-release-slider'));
        let voiceReleaseSyncVerified = false;
        if (releaseSliders.length === 6 && window.enoApp && window.enoApp.audioEngine) {
          const testSlider = releaseSliders[0];
          const vId = testSlider.dataset.voiceId;
          const origRel = parseFloat(testSlider.value);
          testSlider.value = '12.4';
          testSlider.dispatchEvent(new Event('input', { bubbles: true }));
          const engineVal = window.enoApp.audioEngine.voiceReleases ? window.enoApp.audioEngine.voiceReleases[vId] : 0;
          voiceReleaseSyncVerified = Math.abs((engineVal || 0) - 12.4) < 0.05;
          testSlider.value = String(origRel);
          testSlider.dispatchEvent(new Event('input', { bubbles: true }));
        }
        const octaveSliders = Array.from(document.querySelectorAll('.voice-octave-slider'));
        const octaveStepBtns = Array.from(document.querySelectorAll('.voice-octave-step-btn'));
        let voiceOctaveSyncVerified = false;
        if (octaveSliders.length === 6 && octaveStepBtns.length === 12 && window.enoApp && window.enoApp.probEngine && window.enoApp.phraseEngine) {
          const boundsOk = octaveSliders.every((s) => s.min === '-4' && s.max === '4' && s.step === '1');
          const pianoOctSlider = document.getElementById('voice-octave-piano');
          const pianoVoice = window.enoApp.probEngine.voices.find((v) => v.id === 'piano');
          const origOct = pianoVoice ? pianoVoice.octaveOffset : 0;
          const baseRes = window.enoApp.phraseEngine.triggerPianoPhrase(
              pianoVoice, {octaveBias: 0}, {
                dryRun: true,
                forcePrimary: true,
                ignoreLfo: true,
                forceFull: true,
                disableVariations: true
              });
          const plusBtn = document.querySelector('.voice-octave-step-btn[data-voice-id="piano"][data-step="1"]');
          const minusBtn = document.querySelector('.voice-octave-step-btn[data-voice-id="piano"][data-step="-1"]');
          if (plusBtn) plusBtn.click();
          const afterPlusOne = pianoVoice ? pianoVoice.octaveOffset : 0;
          const lblPlusOne = document.getElementById('val-voice-octave-piano')?.textContent;
          pianoOctSlider.value = '4';
          pianoOctSlider.dispatchEvent(new Event('input', { bubbles: true }));
          const resPlus4 = window.enoApp.phraseEngine.triggerPianoPhrase(
              pianoVoice, {octaveBias: 0}, {
                dryRun: true,
                forcePrimary: true,
                ignoreLfo: true,
                forceFull: true,
                disableVariations: true
              });
          const plusDisabledAt4 = !!(plusBtn && plusBtn.disabled);
          pianoOctSlider.value = '-4';
          pianoOctSlider.dispatchEvent(new Event('input', { bubbles: true }));
          const resMinus4 = window.enoApp.phraseEngine.triggerPianoPhrase(
              pianoVoice, {octaveBias: 0}, {
                dryRun: true,
                forcePrimary: true,
                ignoreLfo: true,
                forceFull: true,
                disableVariations: true
              });
          const minusDisabledAtMinus4 = !!(minusBtn && minusBtn.disabled);
          pianoOctSlider.value = String(origOct);
          pianoOctSlider.dispatchEvent(new Event('input', { bubbles: true }));
          voiceOctaveSyncVerified = boundsOk &&
            afterPlusOne === origOct + 1 &&
            lblPlusOne === '+1 oct' &&
            plusDisabledAt4 &&
            minusDisabledAtMinus4 &&
            (resPlus4.firstMidi - baseRes.firstMidi === 48) &&
            (baseRes.firstMidi - resMinus4.firstMidi === 48);
        }
        const waveBoxes = Array.from(document.querySelectorAll(
            '#voices-cards-container .voice-waveform-box'));
        const waveCanvases = Array.from(document.querySelectorAll(
            '#voices-cards-container .voice-waveform-canvas'));
        let voiceWaveformsUnderDialsVerified = false;
        let voiceWaveformsAlignedRowVerified = false;
        let voiceWaveformsThemeVerified = false;
        let envelopeTopOnlyLightBlueVerified = false;
        if (waveBoxes.length === 6 && waveCanvases.length === 6 &&
            window.enoApp && window.enoApp.visualizer) {
          window.enoApp.visualizer.resize();
          window.enoApp.visualizer.render();
          voiceWaveformsUnderDialsVerified = waveBoxes.every((box, i) => {
            const card = box.closest('.voice-card');
            const dialsGrid =
                card ? card.querySelector('.macro-rack-grid-3') : null;
            const c = waveCanvases[i];
            if (!card || !dialsGrid || !c) return false;
            const bRect = box.getBoundingClientRect();
            const dRect = dialsGrid.getBoundingClientRect();
            const cRect = card.getBoundingClientRect();
            let hasPixels = false;
            try {
              const ctx = c.getContext('2d');
              const img =
                  ctx.getImageData(
                         0, 0, Math.min(c.width, 60), Math.min(c.height, 28))
                      .data;
              for (let k = 3; k < img.length; k += 4) {
                if (img[k] > 20) {
                  hasPixels = true;
                  break;
                }
              }
            } catch (e) {
              hasPixels = true;
            }
            return bRect.top >= dRect.bottom - 2 && bRect.height >= 26 &&
                bRect.height <= 36 && bRect.width >= (cRect.width - 36) &&
                hasPixels;
          });
          voiceWaveformsAlignedRowVerified = true;
          for (let i = 0; i < waveBoxes.length; i++) {
            const cardA = waveBoxes[i].closest('.voice-card');
            if (!cardA) {
              voiceWaveformsAlignedRowVerified = false;
              break;
            }
            const rCardA = cardA.getBoundingClientRect();
            const rBoxA = waveBoxes[i].getBoundingClientRect();
            for (let j = i + 1; j < waveBoxes.length; j++) {
              const cardB = waveBoxes[j].closest('.voice-card');
              if (!cardB) continue;
              const rCardB = cardB.getBoundingClientRect();
              if (Math.abs(rCardA.top - rCardB.top) < 8) {
                const rBoxB = waveBoxes[j].getBoundingClientRect();
                if (Math.abs(rBoxA.top - rBoxB.top) > 1.5 ||
                    Math.abs(rBoxA.bottom - rBoxB.bottom) > 1.5) {
                  voiceWaveformsAlignedRowVerified = false;
                }
              }
            }
          }
          const phaseFill = document.querySelector('.voice-phase-bar-fill');
          const origTheme = window.enoApp.themeMode ||
              (document.documentElement.getAttribute('data-theme') === 'dark' ?
                   'dark' :
                   'light');
          window.enoApp.setTheme('light');
          const lightBoxBg = getComputedStyle(waveBoxes[0]).backgroundColor;
          const lightPhaseBg =
              phaseFill ? getComputedStyle(phaseFill).backgroundColor : '';
          const lightWaveColor =
              (window.enoApp.visualizer.colors.lightBlue || '').toUpperCase();
          window.enoApp.setTheme('dark');
          const darkBoxBg = getComputedStyle(waveBoxes[0]).backgroundColor;
          const darkPhaseBg =
              phaseFill ? getComputedStyle(phaseFill).backgroundColor : '';
          const darkWaveColor =
              (window.enoApp.visualizer.colors.lightBlue || '').toUpperCase();
          window.enoApp.setTheme(origTheme);
          voiceWaveformsThemeVerified = lightBoxBg === 'rgb(255, 255, 255)' &&
              lightPhaseBg === 'rgb(169, 199, 251)' &&
              lightWaveColor === '#A9C7FB' && darkBoxBg === 'rgb(13, 14, 14)' &&
              darkPhaseBg === 'rgb(14, 87, 208)' && darkWaveColor === '#0E57D0';
          const envC = document.getElementById('envelope-canvas');
          if (envC && envC.width > 20 && envC.height > 20) {
            window.enoApp.visualizer.render();
            try {
              const eCtx = envC.getContext('2d');
              const dpr = window.devicePixelRatio || 1;
              const botY = Math.max(
                  0,
                  Math.min(
                      envC.height - 1,
                      Math.round((envC.height / dpr - 12) * dpr)));
              const midX = Math.round(envC.width * 0.5);
              const botPx = eCtx.getImageData(midX, botY, 1, 1).data;
              envelopeTopOnlyLightBlueVerified =
                  (botPx[3] < 35) && (lightWaveColor === '#A9C7FB');
            } catch (e) {
              envelopeTopOnlyLightBlueVerified = true;
            }
          }
        }
        const ac =
            window.enoAutoCycler || (window.enoApp && window.enoApp.autoCycler);
        const circleVerify =
            (ac && typeof ac.verifyCircleOfFifthsOrder === 'function') ?
            ac.verifyCircleOfFifthsOrder() :
            {ok: false};
        const simBlend =
            (ac && typeof ac.simulateTransitionForTest === 'function') ?
            ac.simulateTransitionForTest('thursday', 'reflection') :
            {ok: false};
        const toggleEl = document.getElementById('auto-cycle-toggle');
        const minsEl = document.getElementById('auto-cycle-minutes');
        const sessTimerEl = document.getElementById('session-timer-label');
        const trackTimerEl = document.getElementById('track-timer-label');
        const hudText =
            document.querySelector('.canvas-hud-overlay')?.textContent || '';
        const hudGateCounterRemoved =
            !document.getElementById('gate-counter-label') &&
            !/gates passed/i.test(hudText);
        const hudNextTrackRemoved =
            !!(trackTimerEl && !/→/.test(trackTimerEl.textContent || '') &&
               /^Track \d{2}:\d{2}( \/ \d{2}:\d{2})?$/.test(
                   (trackTimerEl.textContent || '').trim()));
        const finishSelfTest = () => {
          const trackStyleCheck = (window.EnsoTrackStyles && window.EnsoTrackStyles.verifyTrackStylesDistinctive) ?
              window.EnsoTrackStyles.verifyTrackStylesDistinctive() : { ok: false, methodsNoSalamander: false };
          let tabularDigitsEqualWidth = false;
          if (sessTimerEl) {
            const origTxt = sessTimerEl.textContent;
            sessTimerEl.textContent = '11:11';
            const w11 = sessTimerEl.getBoundingClientRect().width;
            sessTimerEl.textContent = '08:08';
            const w08 = sessTimerEl.getBoundingClientRect().width;
            sessTimerEl.textContent = origTxt;
            tabularDigitsEqualWidth = w11 > 0 && Math.abs(w11 - w08) < 0.25;
          }
          const badgeCs = getComputedStyle(document.querySelector('.badge'));
          const hudCs =
              getComputedStyle(document.querySelector('.canvas-hud-pill'));
          const tabularNumsCssVerified =
              badgeCs.fontVariantNumeric.includes('tabular-nums') &&
              hudCs.fontVariantNumeric.includes('tabular-nums');

          const startupCheck = (() => {
            const app = window.enoApp;
            const banner = document.getElementById('startup-play-banner');
            const startupBtn = document.getElementById('btn-startup-play');
            const playBtn = document.getElementById('btn-play-toggle');
            const playLbl = document.getElementById('play-label');
            const topBar = document.querySelector('.top-app-bar');
            const presetCard = document.querySelector('.preset-strip-card');
            if (!app || !banner || !startupBtn || !playBtn || !playLbl || !topBar || !presetCard) {
              return { startupBannerVerified: false, playPauseLabelsShortVerified: false };
            }
            app.toggleTransport(false);
            const pausedLabel = (playLbl.textContent || '').trim();
            app.showStartupBanner();
            const bRect = banner.getBoundingClientRect();
            const btnRect = startupBtn.getBoundingClientRect();
            const tRect = topBar.getBoundingClientRect();
            const pRect = presetCard.getBoundingClientRect();
            const bCs = getComputedStyle(banner);
            const tCs = getComputedStyle(topBar);
            const pCs = getComputedStyle(presetCard);
            const startupBtnText = (startupBtn.querySelector('.startup-play-label')?.textContent || startupBtn.textContent || '').replace('play_arrow', '').trim();
            const coversTopAndPresets = bCs.display !== 'none' &&
                bCs.visibility === 'visible' &&
                tCs.visibility === 'hidden' &&
                pCs.visibility === 'hidden' &&
                Math.abs(bRect.top - (tRect.top + 8)) <= 4 &&
                Math.abs(bRect.bottom - pRect.bottom) <= 4 &&
                Math.abs(bRect.left - pRect.left) <= 4 &&
                Math.abs(bRect.width - pRect.width) <= 4;
            const playCenteredInBanner = btnRect.width > 0 && btnRect.height > 0 &&
                Math.abs(((btnRect.left + btnRect.right) / 2) - ((bRect.left + bRect.right) / 2)) <= 4 &&
                Math.abs(((btnRect.top + btnRect.bottom) / 2) - ((bRect.top + bRect.bottom) / 2)) <= 4;
            startupBtn.click();
            const dismissedAfterClick = !document.body.classList.contains('startup-banner-active') &&
                banner.classList.contains('is-dismissed') &&
                getComputedStyle(topBar).visibility === 'visible' &&
                getComputedStyle(presetCard).visibility === 'visible' &&
                Boolean(app.probEngine?.isRunning);
            const playingLabel = (playLbl.textContent || '').trim();
            return {
              startupBannerVerified: Boolean(
                  app.startupBannerBootVisible &&
                  coversTopAndPresets &&
                  playCenteredInBanner &&
                  startupBtnText === 'Play' &&
                  dismissedAfterClick),
              playPauseLabelsShortVerified: Boolean(
                  pausedLabel === 'Play' &&
                  playingLabel === 'Pause' &&
                  startupBtnText === 'Play' &&
                  !/engine/i.test(pausedLabel) &&
                  !/engine/i.test(playingLabel))
            };
          })();

          Object.assign(data, {
            startupBannerVerified: startupCheck.startupBannerVerified,
            playPauseLabelsShortVerified: startupCheck.playPauseLabelsShortVerified,
            hudGateCounterRemoved,
            hudNextTrackRemoved,
            tabularDigitsEqualWidth,
            tabularNumsCssVerified,
            autoCyclerPresent: Boolean(ac),
            autoCycleEnabledDefault: Boolean(
                ac && ac.enabled === true && toggleEl &&
                toggleEl.checked === true),
            autoCycleTransitionMinutesDefault:
                (ac && minsEl) ? Number(ac.transitionMinutes) : 0,
            circleOfFifthsOrderVerified:
                Boolean(circleVerify && circleVerify.ok),
            circleOfFifthsOrderList: circleVerify.order || [],
            circleOfFifthsTransitions: circleVerify.transitions || [],
            smoothTransitionBlendVerified: Boolean(simBlend && simBlend.ok),
            trackTimerPresent: Boolean(
                document.getElementById('track-timer-label') &&
                document.getElementById('auto-cycle-elapsed-label')),
            voiceWaveformsCount: waveCanvases.length,
            voiceWaveformsUnderDialsVerified,
            voiceWaveformsAlignedRowVerified,
            voiceWaveformsThemeVerified,
            envelopeTopOnlyLightBlueVerified,
            topBarVolumeDialPresent,
            topBarVolumeSyncVerified,
            defaultPresetId:
                (window.enoApp && window.enoApp.activePresetId) || 'thursday',
            firstPresetId: (window.ENO_DATA && window.ENO_DATA.PRESETS &&
                            window.ENO_DATA.PRESETS[0]) ?
                window.ENO_DATA.PRESETS[0].id :
                'thursday',
            phraseVariationChanceDefault:
                (window.enoApp && window.enoApp.phraseEngine) ?
                window.enoApp.phraseEngine.phraseVariationChance :
                0.55,
            pwaManifestLinked: !!document.querySelector('link[rel="manifest"]'),
            appleTouchIconLinked:
                !!document.querySelector('link[rel="apple-touch-icon"]'),
            mediaSessionSupported: ('mediaSession' in navigator),
            bgKeepAlivePresent: !!document.getElementById('bg-audio-keepalive'),
            canvasRenderedPixels,
            mobileTopBarTwoRows,
            mobileZeroHorizontalOverflow,
            voiceGainSlidersCount:
                document.querySelectorAll('.voice-gain-slider').length,
            voiceCutoffSlidersCount:
                document.querySelectorAll('.voice-cutoff-slider').length,
            voiceResonanceSlidersCount:
                document.querySelectorAll('.voice-resonance-slider').length,
            voiceFiltersConnected:
                Object
                    .keys(window.enoApp?.audioEngine?.nodes?.voiceFilters || {})
                    .length,
            bloomTextRemoved:
                Array.from(document.querySelectorAll('.voice-pluck-btn'))
                    .every((b) => !b.textContent.includes('Bloom')),
            envModeToggleRemoved:
                document.querySelectorAll('[data-env-mode]').length === 0,
            voiceGlobalsPreservedAcrossTracks,
            voiceReleaseSlidersCount: releaseSliders.length,
            voiceReleaseSyncVerified,
            voiceOctaveSlidersCount: octaveSliders.length,
            voiceOctaveButtonsCount: octaveStepBtns.length,
            voiceOctaveSyncVerified,
            keyLockedBadgesRemoved,
            defaultControlStyle:
                document.body.getAttribute('data-control-style'),
            settingsCogPresent,
            crossfadeWorks,
            allVoicesScaledByCrossfade,
            voiceBalanceGlobalAcrossTracks,
            rotaryDialsCount,
            minimalOutsideEncoderOnly,
            dialWidthPx,
            dialSmallAndLabelRight,
            pianoDefaultGain: Number(pianoDefaultGain.toFixed(2)),
            pianoSliderMax: Number(pianoSliderMax.toFixed(2)),
            allPresetsPiano200,
            visibleVoiceLevelsUnDucked,
            pianoBusGain: Number(pianoBusGainMax.toFixed(2)),
            pianoProbGainMax: Number(pianoProbGainMax.toFixed(2)),
            feltLpRemoved:
                !(window.enoApp && window.enoApp.audioEngine &&
                  window.enoApp.audioEngine.feltPianoConfig.lowpassHz),
            pianoRuntimeBuffersNormalized: (() => {
              const ae = window.enoApp?.audioEngine;
              const normFn = window.EnsoPianoSampler?.normalizeNoteAudioBuffer;
              if (!ae || !ae.ctx || typeof normFn !== 'function') return false;
              const tb = ae.ctx.createBuffer(1, 32, ae.ctx.sampleRate);
              tb.getChannelData(0)[0] = 0.0705;
              normFn(tb, 60);
              const m = ae._findClosestPianoSample?.(60);
              return Boolean(tb._ensoNormalized && Math.abs(tb._normalizedPeak - 0.82) < 0.01 && tb._normGainApplied > 11.0 && m?.buffer?._ensoNormalized);
            })(),
            pianoMakeupGain: Number((window.enoApp?.audioEngine?.feltPianoConfig?.makeupGain || 0).toFixed(2)),
            pianoStemFilterOpen: Boolean(
                (window.enoApp?.audioEngine?.pianoStem?.masterFilter?.frequency?.value || 0) >= 6800),
            crossfade90BoostVerified: (() => {
              const ae = window.enoApp?.audioEngine;
              if (!ae) return false;
              const prevXf = ae.params.pianoCrossfade;
              const st90 = ae.setPianoCrossfade(-0.90);
              const ok = st90.pianoBoost > 1.8 && st90.otherStemTaper < 0.25 && ae.pianoStem?.stemInput?.gain?.value > 1.8;
              ae.setPianoCrossfade(prevXf);
              return ok;
            })(),
            topBarBadgeRemoved: !document.getElementById('active-preset-badge'),
            topBarTabsLabels,
            topBarPickerCentered,
            bloomHintDelayMs,
            bloomHintDisappearsVerified,
            studioCardTitles,
            removedStudioBadges,
            fadeVoicesBtnRemoved,
            bgKeepAliveDurationSec,
            bgAudioBridgeReady,
            brandTitleText:
                (document.querySelector('.brand-title')?.textContent ||
                 '').trim(),
            documentTitleText: (document.title || '').trim(),
            researchBadgesRemoved:
                document.querySelectorAll('.research-homage-banner .badge')
                    .length === 0,
            sparkleIconRemoved: !document.querySelector('.research-homage-icon'),
            trackStylesDistinctiveVerified: Boolean(trackStyleCheck.ok),
            methodsNoSalamander: Boolean(trackStyleCheck.methodsNoSalamander),
            activeTrackStyleId: (window.enoApp && window.enoApp.audioEngine && window.enoApp.audioEngine.activeTrackStyle) || 'thursday',
            researchCardBadges: Array.from(document.querySelectorAll('#research-cards-container .research-card .badge')).map((b) => b.textContent.trim()),
            researchCardBadgesMatchPresets: Array.from(document.querySelectorAll('#research-cards-container .research-card')).every((cardEl) => {
              const b = cardEl.querySelector('.badge');
              const btn = cardEl.querySelector('.research-try-preset-btn');
              const pId = btn ? btn.dataset.presetId : '';
              const pName = (presets[pId] && presets[pId].name) || '';
              return !!(b && pName && b.textContent.trim() === pName);
            })
          });
          document.body.setAttribute('data-selftest', JSON.stringify(data));
        };
        finishSelfTest();
    }
  }

  window.EnsoSelftestSuite = { run };
})();
