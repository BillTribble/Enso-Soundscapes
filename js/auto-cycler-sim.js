/**
 * Enso Soundscapes — Auto-Cycler Modal Transition Simulator for Self-Tests.
 */
'use strict';

(function() {
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  function simulateTransitionForTest(
      fromPresetId = 'thursday', toPresetId = 'reflection') {
    const app = this.app || window.enoApp;
    if (!app) return {ok: false};
    const origPreset = app.activePresetId || 'thursday';
    this._internalApplyingPreset = true;
    app.applyPreset(fromPresetId, false);
    this._internalApplyingPreset = false;
    const started = this.startTransition(toPresetId, 20);
    this._applyBlendAtProgress(0.25);
    const cutoffAt25 = app.audioEngine?.params?.cutoff || 0;
    const pitchSample = app.phraseEngine ?
        this.selectBlendedSinglePitch(
            app.phraseEngine, app.probEngine?.voices?.[0], {octaveBias: 0},
            app.probEngine) :
        null;
    const sharedSet =
        new Set(this.getSharedPitchClasses(this.fromScaleId, this.toScaleId));
    const pitchInSharedModalPivots = pitchSample ?
        sharedSet.has(((pitchSample.midi % 12) + 12) % 12) :
        false;
    this._applyBlendAtProgress(0.55);
    const midpointSwitchedOk = this.midpointSwitched === true;
    this._completeTransition();
    const landedOnTarget = app.activePresetId === toPresetId;
    this._internalApplyingPreset = true;
    app.applyPreset(origPreset, false);
    this._internalApplyingPreset = false;
    this.trackElapsedSec = 0;
    this.syncUI();
    return {
      ok: Boolean(
          started && cutoffAt25 > 0 && pitchSample &&
          pitchInSharedModalPivots && midpointSwitchedOk && landedOnTarget),
      started,
      cutoffAt25,
      pitchSampleMidi: pitchSample ? pitchSample.midi : null,
      pitchInSharedModalPivots,
      midpointSwitchedOk,
      landedOnTarget
    };
  }

  if (typeof EnsoAutoCycler !== 'undefined') {
    EnsoAutoCycler.prototype.simulateTransitionForTest = simulateTransitionForTest;
  }
  if (typeof window !== 'undefined' && window.EnsoAutoCycler) {
    window.EnsoAutoCycler.prototype.simulateTransitionForTest = simulateTransitionForTest;
  }

  const EnsoPatchesBanner = {
    getAutoChangeMinutes(app) {
      const acMins = app?.autoCycler?.transitionMinutes;
      if (typeof acMins === 'number' && Number.isFinite(acMins) && acMins > 0) {
        return Math.round(acMins);
      }
      const slider = typeof document !== 'undefined' ?
          document.getElementById('auto-cycle-minutes') :
          null;
      const parsed = slider ? parseFloat(slider.value) : NaN;
      return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : 8;
    },

    formatBannerText(mins) {
      return `Change tracks here. Tracks will auto change every ${mins} minutes`;
    },

    updateText(app) {
      if (typeof document === 'undefined') return '';
      const mins = this.getAutoChangeMinutes(app || window.enoApp);
      const txt = this.formatBannerText(mins);
      const textEl = document.getElementById('patches-onboarding-text');
      if (textEl && textEl.textContent !== txt) {
        textEl.textContent = txt;
      }
      return txt;
    },

    syncBounds(app) {
      if (typeof document === 'undefined') return;
      const banner = document.getElementById('patches-onboarding-banner');
      const shell = document.getElementById('app-root');
      const patchesEl = document.getElementById('preset-buttons-container');
      if (!banner || !shell || !patchesEl) return;
      const shellRect = shell.getBoundingClientRect();
      const patchesRect = patchesEl.getBoundingClientRect();
      if (patchesRect.width <= 0 || patchesRect.height <= 0) return;
      const presetCard = document.querySelector('.preset-strip-card') || patchesEl;
      const cardRect = presetCard.getBoundingClientRect();
      const topPx = Math.round(patchesRect.bottom - shellRect.top + 10);
      const leftPx = Math.max(12, Math.round(patchesRect.left - shellRect.left));
      const maxWidthPx = Math.max(220, Math.round(cardRect.right - patchesRect.left - 12));
      banner.style.top = `${topPx}px`;
      banner.style.left = `${leftPx}px`;
      banner.style.maxWidth = `${maxWidthPx}px`;
      const targetPill =
          patchesEl.querySelector('.m3-pill-tab.active, .m3-pill-tab');
      if (targetPill) {
        const pillRect = targetPill.getBoundingClientRect();
        const bannerRect = banner.getBoundingClientRect();
        const pillCenter = (pillRect.left + pillRect.right) / 2;
        const maxLeft = bannerRect.width > 48 ? Math.round(bannerRect.width - 28) : 160;
        const pointerLeft =
            clamp(Math.round(pillCenter - (shellRect.left + leftPx) - 6), 20, maxLeft);
        banner.style.setProperty('--pointer-left', `${pointerLeft}px`);
      }
    },

    showOnFirstPlay(app) {
      if (!app || app.hasShownPatchesBanner || typeof document === 'undefined') {
        return false;
      }
      app.hasShownPatchesBanner = true;
      this.updateText(app);
      const banner = document.getElementById('patches-onboarding-banner');
      if (!banner) return false;
      banner.classList.add('is-visible');
      banner.setAttribute('aria-hidden', 'false');
      this.syncBounds(app);
      if (app._patchesBannerTimer) clearTimeout(app._patchesBannerTimer);
      app._patchesBannerTimer = setTimeout(() => {
        this.dismiss(app);
      }, 18000);
      return true;
    },

    dismiss(app) {
      const targetApp = app || (typeof window !== 'undefined' ? window.enoApp : null);
      if (targetApp && targetApp._patchesBannerTimer) {
        clearTimeout(targetApp._patchesBannerTimer);
        targetApp._patchesBannerTimer = null;
      }
      if (typeof document === 'undefined') return;
      const banner = document.getElementById('patches-onboarding-banner');
      if (banner) {
        banner.classList.remove('is-visible');
        banner.setAttribute('aria-hidden', 'true');
      }
    },

    resetForStartup(app) {
      this.dismiss(app);
      if (app) app.hasShownPatchesBanner = false;
    },

    bind(app) {
      if (typeof document === 'undefined') return;
      const closeBtn = document.getElementById('btn-dismiss-patches-banner');
      if (closeBtn && !closeBtn._patchesBound) {
        closeBtn._patchesBound = true;
        closeBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.dismiss(app);
        });
      }
      if (typeof window !== 'undefined' && !window._patchesResizeBound) {
        window._patchesResizeBound = true;
        window.addEventListener('resize', () => {
          const b = document.getElementById('patches-onboarding-banner');
          if (b && b.classList.contains('is-visible')) {
            this.syncBounds(app || window.enoApp);
          }
        });
      }
      this.updateText(app);
    },

    applyUrlFlags(app, q) {
      if (!q) return;
      if (q.includes('hideHint=1') || q.includes('paused=1') ||
          q.includes('settings=open') || q.includes('modal=') ||
          q.includes('scroll=') || q.includes('tab=probability') ||
          q.includes('tab=research') || q.includes('demo=userpatches')) {
        this.dismiss(app);
      } else if (q.includes('firstplay=1')) {
        app.hasShownPatchesBanner = false;
        this.showOnFirstPlay(app);
      }
    },

    verifyFromStartupState(app, hiddenBeforePlay) {
      const banner = document.getElementById('patches-onboarding-banner');
      const textEl = document.getElementById('patches-onboarding-text');
      const closeBtn = document.getElementById('btn-dismiss-patches-banner');
      const patchesEl = document.getElementById('preset-buttons-container');
      if (!app || !banner || !textEl || !closeBtn || !patchesEl) return false;
      this.syncBounds(app);
      const cs = getComputedStyle(banner);
      const bRect = banner.getBoundingClientRect();
      const pRect = patchesEl.getBoundingClientRect();
      const cRect = closeBtn.getBoundingClientRect();
      const shownAfterFirstPlay = banner.classList.contains('is-visible') &&
          cs.display !== 'none' && cs.visibility === 'visible' &&
          bRect.width > 120 && bRect.height >= 40;
      const pointsAtPatchesTab = bRect.top >= pRect.bottom - 2 &&
          (bRect.top - pRect.bottom) <= 22 &&
          Math.abs(bRect.left - pRect.left) <= 24;
      const defaultTextOk = textEl.textContent.trim() ===
          'Change tracks here. Tracks will auto change every 8 minutes';
      const closeTouchTargetOk = cRect.width >= 39.5 && cRect.height >= 39.5;
      let dynamicMinutesOk = false;
      if (app.autoCycler) {
        const origMins = app.autoCycler.transitionMinutes;
        app.autoCycler.setTransitionMinutes(12, false);
        dynamicMinutesOk = textEl.textContent.trim() ===
            'Change tracks here. Tracks will auto change every 12 minutes';
        app.autoCycler.setTransitionMinutes(origMins, false);
      }
      closeBtn.click();
      const dismissedOk = !banner.classList.contains('is-visible') &&
          getComputedStyle(banner).display === 'none';
      app.toggleTransport(false);
      app.toggleTransport(true);
      const onlyFirstTimeOk = !banner.classList.contains('is-visible') &&
          getComputedStyle(banner).display === 'none';
      return Boolean(
          hiddenBeforePlay && shownAfterFirstPlay && pointsAtPatchesTab &&
          defaultTextOk && closeTouchTargetOk && dynamicMinutesOk &&
          dismissedOk && onlyFirstTimeOk);
    }
  };

  if (typeof window !== 'undefined') {
    window.EnsoPatchesBanner = EnsoPatchesBanner;
    const AC = window.EnsoAutoCycler;
    if (AC && AC.prototype && !AC.prototype._patchesSyncWrapped) {
      const origSyncUI = AC.prototype.syncUI;
      AC.prototype._patchesSyncWrapped = true;
      AC.prototype.syncUI = function() {
        const res = origSyncUI.apply(this, arguments);
        EnsoPatchesBanner.updateText(this.app || window.enoApp);
        return res;
      };
    }
  }
})();

