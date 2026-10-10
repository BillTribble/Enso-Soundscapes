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
})();
