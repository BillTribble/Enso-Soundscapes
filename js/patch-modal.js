/**
 * Enso Soundscapes — New Patch Modal & Dialog Interactions.
 */
'use strict';

(function() {
  function openNewPatchModal() {
    const backdrop = document.getElementById('new-patch-modal-backdrop');
    const input = document.getElementById('new-patch-name-input');
    const clearBtn = document.getElementById('btn-clear-patch-name');
    const badge = document.getElementById('new-patch-context-badge');
    const PS = window.EnsoPatchStorage;
    const app = PS && PS.getApp ? PS.getApp() : window.enoApp;

    if (badge && app) {
      const scId = document.getElementById('select-scale')?.value || app.probEngine?.scaleId;
      const sc = (window.ENO_DATA?.SCALES || {})[scId];
      badge.textContent = sc ? (sc.keyLabel || sc.name) : 'Ambient Scale';
    }

    if (backdrop) {
      backdrop.classList.add('is-open');
      backdrop.setAttribute('aria-hidden', 'false');
    }
    if (input) {
      input.value = '';
      if (clearBtn) clearBtn.style.display = 'none';
      setTimeout(() => input.focus(), 60);
    }
  }

  function closeNewPatchModal() {
    const backdrop = document.getElementById('new-patch-modal-backdrop');
    if (backdrop) {
      backdrop.classList.remove('is-open');
      backdrop.setAttribute('aria-hidden', 'true');
    }
  }

  function bindModalAndActions() {
    const PS = window.EnsoPatchStorage || {};
    const saveBtn = document.getElementById('btn-save-patch');
    if (saveBtn && PS.saveCurrentPatch) {
      saveBtn.addEventListener('click', PS.saveCurrentPatch);
    }

    const newBtn = document.getElementById('btn-new-patch');
    if (newBtn) {
      newBtn.addEventListener('click', openNewPatchModal);
    }

    const resetBtn = document.getElementById('btn-reset-patch');
    if (resetBtn && PS.resetOrDeleteCurrentPatch) {
      resetBtn.addEventListener('click', PS.resetOrDeleteCurrentPatch);
    }

    const backdrop = document.getElementById('new-patch-modal-backdrop');
    if (backdrop) {
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) closeNewPatchModal();
      });
    }

    const closeBtn = document.getElementById('btn-close-patch-modal');
    if (closeBtn) closeBtn.addEventListener('click', closeNewPatchModal);

    const cancelBtn = document.getElementById('btn-cancel-patch-modal');
    if (cancelBtn) cancelBtn.addEventListener('click', closeNewPatchModal);

    const confirmBtn = document.getElementById('btn-confirm-new-patch');
    const input = document.getElementById('new-patch-name-input');
    if (confirmBtn && input && PS.createNewPatch) {
      confirmBtn.addEventListener('click', () => {
        const val = input.value.trim() || 'My Soundscape Patch';
        PS.createNewPatch(val);
      });
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          const val = input.value.trim() || 'My Soundscape Patch';
          PS.createNewPatch(val);
        }
      });
    }

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const bd = document.getElementById('new-patch-modal-backdrop');
        if (bd && bd.classList.contains('is-open')) {
          e.preventDefault();
          closeNewPatchModal();
        }
      }
    });

    const clearBtn = document.getElementById('btn-clear-patch-name');
    if (input && clearBtn) {
      input.addEventListener('input', () => {
        clearBtn.style.display = input.value ? 'inline-flex' : 'none';
      });
      clearBtn.addEventListener('mousedown', (e) => e.preventDefault());
      clearBtn.addEventListener('click', () => {
        input.value = '';
        clearBtn.style.display = 'none';
        input.focus();
      });
    }

    const markDirty = PS.markDirty || (() => {});
    document.querySelectorAll('.control-row input, .piano-phrases-card input, .xy-pad-surface').forEach((el) => {
      if (el.id === 'piano-other-crossfade') return;
      el.addEventListener('input', () => markDirty(true));
      el.addEventListener('change', () => markDirty(true));
    });
    const voicesCont = document.getElementById('voices-cards-container');
    if (voicesCont) {
      voicesCont.addEventListener('input', () => markDirty(true));
      voicesCont.addEventListener('change', () => markDirty(true));
    }
    document.getElementById('select-scale')?.addEventListener('change', () => markDirty(true));
    document.getElementById('select-circadian')?.addEventListener('change', () => markDirty(true));
  }

  window.EnsoPatchModal = {
    open: openNewPatchModal,
    close: closeNewPatchModal,
    init: bindModalAndActions
  };
})();
