/**
 * Eno Soundscape Studio — Minimal Outside-Encoder Rotary Dials Controller
 * Renders 30x30px 270-degree SVG outside-encoder rotary dials (Ableton Live style:
 * open center, no inner cap or pointer line, label + readout stacked horizontally to the right)
 * as the default control style across all Studio & Instrument controls.
 */
(function () {
  'use strict';

  const DEG_START = -135;
  const DEG_SPAN = 270;
  const CX = 28;
  const CY = 28;
  const R = 21;

  function polarToCartesian(cx, cy, r, angleDeg) {
    const rad = ((angleDeg - 90) * Math.PI) / 180.0;
    return {
      x: cx + r * Math.cos(rad),
      y: cy + r * Math.sin(rad)
    };
  }

  function describeArc(cx, cy, r, startAngle, endAngle) {
    const span = Math.max(0.8, endAngle - startAngle);
    const actualEnd = startAngle + span;
    const start = polarToCartesian(cx, cy, r, startAngle);
    const end = polarToCartesian(cx, cy, r, actualEnd);
    const largeArcFlag = span <= 180 ? '0' : '1';
    return ['M', start.x.toFixed(2), start.y.toFixed(2), 'A', r, r, 0, largeArcFlag, 1, end.x.toFixed(2), end.y.toFixed(2)].join(' ');
  }

  function getNorm(input) {
    const min = parseFloat(input.min || '0');
    const max = parseFloat(input.max || '100');
    const val = parseFloat(input.value || '0');
    if (max <= min) return 0;
    return Math.max(0, Math.min(1, (val - min) / (max - min)));
  }

  function buildDialSvgMarkup(pct) {
    const bgArc = describeArc(CX, CY, R, DEG_START, DEG_START + DEG_SPAN);
    const angle = DEG_START + pct * DEG_SPAN;
    const valArc = describeArc(CX, CY, R, DEG_START, angle);
    return `
      <svg class="rotary-dial-svg" viewBox="0 0 56 56" aria-hidden="true">
        <path class="rotary-dial-track-arc" d="${bgArc}" />
        <path class="rotary-dial-value-arc" d="${valArc}" />
      </svg>
    `;
  }

  function attachDialToControlRow(row) {
    const input = row.querySelector('input[type="range"]');
    if (!input) return;

    row.classList.add('has-rotary-dial');
    let dial = row.querySelector('.rotary-dial-widget');
    if (!dial) {
      if (!input.dataset.defaultValue) {
        input.dataset.defaultValue = input.value;
      }

      dial = document.createElement('div');
      dial.className = 'rotary-dial-widget';
      dial.title = 'Drag vertically to adjust · Double-click to reset';
      dial.innerHTML = buildDialSvgMarkup(getNorm(input));

      const valArcEl = dial.querySelector('.rotary-dial-value-arc');

      const syncVisual = () => {
        const pct = getNorm(input);
        const angle = DEG_START + pct * DEG_SPAN;
        const arcPath = describeArc(CX, CY, R, DEG_START, angle);
        valArcEl.setAttribute('d', arcPath);
      };

      input.addEventListener('input', syncVisual);
      input.addEventListener('change', syncVisual);
      dial._syncVisual = syncVisual;
      syncVisual();

      let dragging = false;
      let startY = 0;
      let startX = 0;
      let startPct = 0;

      const setFromPct = (nextPct) => {
        const clamped = Math.max(0, Math.min(1, nextPct));
        const min = parseFloat(input.min || '0');
        const max = parseFloat(input.max || '100');
        const step = parseFloat(input.step || '1') || 1;
        const raw = min + clamped * (max - min);
        const stepped = Math.round((raw - min) / step) * step + min;
        const decimals = (String(step).split('.')[1] || '').length;
        input.value = Math.max(min, Math.min(max, stepped)).toFixed(decimals);
        input.dispatchEvent(new Event('input', { bubbles: true }));
      };

      dial.addEventListener('pointerdown', (e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        dragging = true;
        startY = e.clientY;
        startX = e.clientX;
        startPct = getNorm(input);
        dial.classList.add('is-dragging');
        if (dial.setPointerCapture) {
          try { dial.setPointerCapture(e.pointerId); } catch (_) {}
        }
      });

      dial.addEventListener('pointermove', (e) => {
        if (!dragging) return;
        const dy = startY - e.clientY;
        const dx = e.clientX - startX;
        const delta = (dy + dx * 0.35) / 130;
        setFromPct(startPct + delta);
      });

      const endDrag = (e) => {
        if (!dragging) return;
        dragging = false;
        dial.classList.remove('is-dragging');
        if (dial.releasePointerCapture && e && e.pointerId !== undefined) {
          try { dial.releasePointerCapture(e.pointerId); } catch (_) {}
        }
      };

      dial.addEventListener('pointerup', endDrag);
      dial.addEventListener('pointercancel', endDrag);

      dial.addEventListener('dblclick', (e) => {
        e.preventDefault();
        if (input.dataset.defaultValue !== undefined) {
          input.value = input.dataset.defaultValue;
          input.dispatchEvent(new Event('input', { bubbles: true }));
        }
      });

      dial.addEventListener('wheel', (e) => {
        e.preventDefault();
        const dir = e.deltaY < 0 ? 1 : -1;
        setFromPct(getNorm(input) + dir * 0.04);
      }, { passive: false });

      row.appendChild(dial);
    } else if (dial._syncVisual) {
      dial._syncVisual();
    }
  }

  window.syncStudioControls = function () {
    if (typeof window.initCustomSliders === 'function') {
      window.initCustomSliders();
    }
    document.querySelectorAll('.control-row').forEach((row) => {
      attachDialToControlRow(row);
    });
  };

  function initSettingsCrossfadePopover() {
    const btnToggle = document.getElementById('btn-settings-toggle');
    const btnClose = document.getElementById('btn-close-settings');
    const btnReset = document.getElementById('btn-reset-crossfade');
    const popover = document.getElementById('settings-popover');
    const slider = document.getElementById('piano-other-crossfade');
    const statusLbl = document.getElementById('val-piano-crossfade');
    const pianoPctLbl = document.getElementById('val-xfade-piano');
    const otherPctLbl = document.getElementById('val-xfade-other');

    const setOpen = (open) => {
      if (!popover || !btnToggle) return;
      popover.classList.toggle('is-open', open);
      popover.setAttribute('aria-hidden', open ? 'false' : 'true');
      btnToggle.classList.toggle('is-active', open);
      btnToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    };

    if (btnToggle && popover) {
      btnToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        setOpen(!popover.classList.contains('is-open'));
      });
    }
    if (btnClose) {
      btnClose.addEventListener('click', () => setOpen(false));
    }
    document.addEventListener('click', (e) => {
      if (popover && popover.classList.contains('is-open')) {
        const anchor = popover.closest('.settings-popover-anchor');
        if (anchor && !anchor.contains(e.target)) setOpen(false);
      }
    });
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && popover && popover.classList.contains('is-open')) {
        setOpen(false);
      }
    });

    const syncCrossfade = (val) => {
      const xf = Math.max(-1, Math.min(1, parseFloat(val) || 0));
      if (window.enoApp) {
        window.enoApp.globalVoiceBalance = xf;
      }
      if (window.ENO_DATA && window.ENO_DATA.PRESETS) {
        Object.values(window.ENO_DATA.PRESETS).forEach((p) => {
          if (p && p.global) p.global.pianoCrossfade = xf;
        });
      }
      let state = { pianoMultiplier: xf <= 0 ? 1.0 : Math.max(0, 1.0 - xf), otherMultiplier: xf >= 0 ? 1.0 : Math.max(0, 1.0 + xf) };
      if (window.enoApp && window.enoApp.audioEngine && typeof window.enoApp.audioEngine.setPianoCrossfade === 'function') {
        state = window.enoApp.audioEngine.setPianoCrossfade(xf) || state;
      }
      if (window.enoApp && window.enoApp.probEngine && typeof window.enoApp.probEngine.applyCrossfadeToVoices === 'function') {
        window.enoApp.probEngine.applyCrossfadeToVoices(state.pianoMultiplier, state.otherMultiplier);
      }
      if (pianoPctLbl) pianoPctLbl.textContent = `${Math.round(state.pianoMultiplier * 100)}%`;
      if (otherPctLbl) otherPctLbl.textContent = `${Math.round(state.otherMultiplier * 100)}%`;
      if (statusLbl) {
        if (Math.abs(xf) < 0.03) statusLbl.textContent = 'Balanced';
        else if (xf <= -0.98) statusLbl.textContent = 'Piano only';
        else if (xf >= 0.98) statusLbl.textContent = 'Other sounds only';
        else if (xf < 0) statusLbl.textContent = `Piano +${Math.round(Math.abs(xf) * 100)}%`;
        else statusLbl.textContent = `Other +${Math.round(xf * 100)}%`;
      }
      if (slider) {
        if (Math.abs((parseFloat(slider.value) || 0) - xf) > 0.001) {
          slider.value = String(xf);
        }
        const pct = ((xf + 1) / 2) * 100;
        slider.style.setProperty('--pct', `${pct.toFixed(2)}%`);
      }
    };
    window.syncCrossfadeUI = syncCrossfade;

    if (slider) {
      slider.addEventListener('input', () => {
        syncCrossfade(slider.value);
        window.enoPatchStorage?.markDirty?.(true);
      });
      slider.addEventListener('change', () => {
        syncCrossfade(slider.value);
        window.enoPatchStorage?.markDirty?.(true);
        if (window.enoPatchStorage &&
            typeof window.enoPatchStorage.saveGlobalVoiceBalance ===
                'function') {
          window.enoPatchStorage.saveGlobalVoiceBalance(
              parseFloat(slider.value) || 0);
        }
      });
      slider.addEventListener('dblclick', () => {
        slider.value = '0';
        slider.dispatchEvent(new Event('input', { bubbles: true }));
        slider.dispatchEvent(new Event('change', {bubbles: true}));
      });
      const initXf = (window.enoApp && typeof window.enoApp.globalVoiceBalance === 'number')
        ? window.enoApp.globalVoiceBalance
        : (parseFloat(slider.value) || 0);
      slider.value = String(initXf);
      syncCrossfade(initXf);
    }
    if (btnReset && slider) {
      btnReset.addEventListener('click', () => {
        slider.value = '0';
        slider.dispatchEvent(new Event('input', { bubbles: true }));
        slider.dispatchEvent(new Event('change', {bubbles: true}));
      });
    }

    const q = `${window.location.search || ''}&${(window.location.hash || '').replace(/^#/, '')}`;
    if (q.includes('settings=open')) {
      setOpen(true);
    }
    window.setSettingsPopoverOpen = setOpen;
  }

  function initTopBarVolumeDial() {
    const topInput = document.getElementById('top-master-volume');
    const topLbl = document.getElementById('val-top-master-volume');
    const rackInput = document.getElementById('master-volume');
    const rackLbl = document.getElementById('val-master-volume');
    if (!topInput) return;

    let syncing = false;
    const updateControlVisual = (inputEl, lblEl, val) => {
      if (!inputEl) return;
      const clamped = Math.max(0, Math.min(1, val));
      inputEl.value = clamped.toFixed(2);
      if (lblEl) lblEl.textContent = `${Math.round(clamped * 100)}%`;
      inputEl.style.setProperty('--pct', `${(clamped * 100).toFixed(2)}%`);
      const dial = inputEl.closest('.control-row')?.querySelector('.rotary-dial-widget');
      if (dial && typeof dial._syncVisual === 'function') {
        dial._syncVisual();
      }
    };

    topInput.addEventListener('input', () => {
      if (syncing) return;
      syncing = true;
      const val = Math.max(0, Math.min(1, parseFloat(topInput.value) || 0));
      updateControlVisual(topInput, topLbl, val);
      updateControlVisual(rackInput, rackLbl, val);
      if (window.enoApp && window.enoApp.audioEngine && typeof window.enoApp.audioEngine.setMasterVolume === 'function') {
        window.enoApp.audioEngine.setMasterVolume(val);
      }
      syncing = false;
    });

    if (rackInput) {
      rackInput.addEventListener('input', () => {
        if (syncing) return;
        syncing = true;
        const val = Math.max(0, Math.min(1, parseFloat(rackInput.value) || 0));
        updateControlVisual(topInput, topLbl, val);
        syncing = false;
      });
      const initVal = parseFloat(rackInput.value);
      if (!Number.isNaN(initVal)) {
        updateControlVisual(topInput, topLbl, initVal);
      }
    }
  }

  function initMinimalDialsController() {
    document.body.setAttribute('data-control-style', 'dials');
    document.body.removeAttribute('data-dial-variation');
    window.syncStudioControls();
    initTopBarVolumeDial();
    initSettingsCrossfadePopover();

    const hash = window.location.hash || '';
    if (hash.includes('selftest=1')) {
      setTimeout(() => {
        window.runDialsSelftest?.();
      }, 15);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMinimalDialsController);
  } else {
    initMinimalDialsController();
  }
})();
