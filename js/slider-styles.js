/**
 * GM3 & Modern Audio Slider Style Explorer + Universal Range Input Enhancer.
 */
(function () {
  'use strict';

  const SLIDER_CATALOG = [
    {
      id: 'slider-style-tonal-fill-bar',
      name: 'Contained tonal fill bar (no protruding thumb)',
      badge: 'Studio & BillSkill default',
      badgeTone: 'badge-blue',
      origin: 'Self-contained 18px rounded trough filled with light-blue primary-container and a crisp 3px primary leading-edge cursor inside the bar',
      tokens: ['Zero protruding knob', '18px tonal trough', '3px edge indicator', '--md-sys-color-primary-container'],
      cssSnippet: 'input[type="range"] { -webkit-appearance: none; appearance: none; width: 100%; height: 18px; border-radius: 8px; overflow: hidden; background: linear-gradient(to right, var(--md-sys-color-primary-container) 0%, var(--md-sys-color-primary-container) var(--pct, 50%), var(--md-sys-color-surface-container-highest) var(--pct, 50%), var(--md-sys-color-surface-container-highest) 100%); }\ninput[type="range"]::-webkit-slider-thumb { -webkit-appearance: none; width: 3px; height: 18px; border-radius: 2px; background: var(--md-sys-color-primary); border: none; }',
    },
    {
      id: 'slider-style-gm3-handle-bar',
      name: 'GM3 Expressive vertical handle bar + split track',
      badge: 'M3 Expressive split',
      badgeTone: 'badge-teal',
      origin: 'Official Material 3 Expressive slider · 4px × 22px vertical pill handle with a 6px breathing gap separating active and inactive track segments',
      tokens: ['M3 Expressive spec', '4px vertical handle', '6px split track gap', '--md-sys-color-primary'],
      cssSnippet: 'input[type="range"] { -webkit-appearance: none; appearance: none; width: 100%; height: 6px; border-radius: 9999px; background: linear-gradient(to right, var(--md-sys-color-primary) 0%, var(--md-sys-color-primary) calc(var(--pct) - 6px), transparent calc(var(--pct) - 6px), transparent calc(var(--pct) + 6px), var(--md-sys-color-surface-container-highest) calc(var(--pct) + 6px), var(--md-sys-color-surface-container-highest) 100%); }\ninput[type="range"]::-webkit-slider-thumb { -webkit-appearance: none; width: 4px; height: 22px; border-radius: 9999px; background: var(--md-sys-color-primary); }',
    },
    {
      id: 'slider-style-gm3-thick-track',
      name: 'GM3 Expressive thick pill track (14px) + vertical handle',
      badge: 'M3 Expressive thick',
      badgeTone: 'badge-teal',
      origin: 'Android 15/16 & Pixel volume/parameter bar · plush 14px light-blue active fill (--md-sys-color-primary-container) split by a 4px primary bar handle',
      tokens: ['14px plush track', '--md-sys-color-primary-container', 'Split handle cutout'],
      cssSnippet: `/* GM3 Expressive Thick Pill Track + Vertical Handle */
input[type="range"] {
  -webkit-appearance: none; height: 14px; border-radius: 8px;
  background: linear-gradient(to right,
    var(--md-sys-color-primary-container) 0%,
    var(--md-sys-color-primary-container) calc(var(--pct) - 6px),
    transparent calc(var(--pct) - 6px),
    transparent calc(var(--pct) + 6px),
    var(--md-sys-color-surface-container-highest) calc(var(--pct) + 6px),
    var(--md-sys-color-surface-container-highest) 100%);
}
input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none; width: 4px; height: 22px;
  border-radius: 9999px; background: var(--md-sys-color-primary);
}`,
    },
    {
      id: 'slider-style-tonal-pill-thumb',
      name: 'Soft tonal light-blue track + compact stadium pill thumb',
      badge: 'Matches button pills',
      badgeTone: 'badge-blue',
      origin: 'Pairs directly with your compact tonal buttons · soft light-blue active track (primary-container), soft grey rest track, 18×10px stadium pill thumb',
      tokens: ['--md-sys-color-primary-container', '18×10px stadium thumb', 'Zero track outline'],
      cssSnippet: `/* Soft Tonal Light-Blue Track + Stadium Pill Thumb */
input[type="range"] {
  -webkit-appearance: none; height: 8px; border-radius: 9999px;
  background: linear-gradient(to right,
    var(--md-sys-color-primary-container) 0%,
    var(--md-sys-color-primary-container) var(--pct),
    var(--md-sys-color-surface-container-highest) var(--pct),
    var(--md-sys-color-surface-container-highest) 100%);
}
input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none; width: 18px; height: 10px;
  border-radius: 9999px; background: var(--md-sys-color-primary);
}`,
    },
    {
      id: 'slider-style-inline-meter-bar',
      name: 'Single-row inline label & value meter bar',
      badge: 'Compact 1-row DSP',
      badgeTone: 'badge-green',
      origin: 'FabFilter / Teenage Engineering single-row parameter bar · embeds the parameter label and readout directly inside a 30px draggable tonal bar',
      tokens: ['50% less vertical height', 'Label + value inside bar', '--md-sys-color-primary-container'],
      cssSnippet: `/* Single-Row Inline Label & Value Tonal Meter Bar */
.control-row { position: relative; height: 30px; border-radius: 8px; overflow: hidden; }
.control-label-line {
  position: absolute; inset: 0; padding: 0 12px; z-index: 2; pointer-events: none;
}
input[type="range"] {
  -webkit-appearance: none; position: absolute; inset: 0; height: 100%;
  background: linear-gradient(to right,
    var(--md-sys-color-primary-container) 0%,
    var(--md-sys-color-primary-container) var(--pct),
    var(--md-sys-color-surface-container-high) var(--pct),
    var(--md-sys-color-surface-container-high) 100%);
}`,
    },
    {
      id: 'slider-style-aistudio-slim',
      name: 'AI Studio clean slim track + tonal halo thumb',
      badge: 'Google AI Studio',
      badgeTone: 'badge-blue',
      origin: 'Refined Material Web md-slider · removes the native browser grey border outline, using a flat 6px two-tone track and 16px halo thumb',
      tokens: ['6px borderless track', '16px halo thumb', '--md-sys-color-primary'],
      cssSnippet: `/* AI Studio Clean Slim Track + Halo Thumb */
input[type="range"] {
  -webkit-appearance: none; height: 6px; border-radius: 9999px;
  background: linear-gradient(to right,
    var(--md-sys-color-primary) 0%, var(--md-sys-color-primary) var(--pct),
    var(--md-sys-color-surface-container-highest) var(--pct),
    var(--md-sys-color-surface-container-highest) 100%);
}
input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none; width: 16px; height: 16px; border-radius: 9999px;
  background: var(--md-sys-color-primary);
  border: 2px solid var(--md-sys-color-surface-container-lowest);
}`,
    },
    {
      id: 'slider-style-precision-ring',
      name: 'Precision hairline track + hollow ring thumb',
      badge: 'Minimalist synth',
      badgeTone: 'badge-teal',
      origin: 'Teenage Engineering / minimalist instrument style · 4px hairline track with a 16px white-centered primary ring thumb',
      tokens: ['4px hairline track', '3.5px ring thumb', '--md-sys-color-surface-container-lowest'],
      cssSnippet: `/* Precision Hairline + Hollow Ring Thumb */
input[type="range"] {
  -webkit-appearance: none; height: 4px; border-radius: 9999px;
}
input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none; width: 16px; height: 16px; border-radius: 9999px;
  background: var(--md-sys-color-surface-container-lowest);
  border: 3.5px solid var(--md-sys-color-primary);
}`,
    },
    {
      id: 'slider-style-studio-fader-cap',
      name: 'Studio hardware fader cap + center calibration line',
      badge: 'Hardware console',
      badgeTone: 'badge-purple',
      origin: 'Roland Juno / Logic console fader · soft tonal track with a 22×14px rectangular cap and 2px primary center line',
      tokens: ['22×14px fader cap', 'Center calibration line', '--md-sys-color-primary-container'],
      cssSnippet: `/* Studio Hardware Fader Cap */
input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none; width: 22px; height: 14px; border-radius: 4px;
  border: 1.5px solid var(--md-sys-color-primary);
  background: linear-gradient(to right,
    var(--md-sys-color-surface-container-lowest) 42%,
    var(--md-sys-color-primary) 42%, var(--md-sys-color-primary) 58%,
    var(--md-sys-color-surface-container-lowest) 58%);
}`,
    },
    {
      id: 'slider-style-gm3-stepped-ticks',
      name: 'GM3 discrete stepped track + tick dots',
      badge: 'Discrete ticks',
      badgeTone: 'badge-green',
      origin: 'Material 3 discrete slider with 20% interval tick dots embedded along the track and a 6px vertical pill handle',
      tokens: ['20% tick marks', '6px pill handle', '--md-sys-color-primary-container'],
      cssSnippet: `/* GM3 Discrete Stepped Track + Tick Dots */
input[type="range"] {
  -webkit-appearance: none; height: 8px; border-radius: 9999px;
  background-image:
    radial-gradient(circle, var(--md-sys-color-on-surface-variant) 1.5px, transparent 2px),
    linear-gradient(to right,
      var(--md-sys-color-primary-container) var(--pct),
      var(--md-sys-color-surface-container-highest) var(--pct));
  background-size: 20% 100%, 100% 100%;
}`,
    },
    {
      id: 'slider-style-legacy-native',
      name: 'Previous baseline (native browser range input)',
      badge: 'Old baseline',
      badgeTone: 'badge-yellow',
      origin: 'Shown for comparison: default OS <input type="range"> with grey perimeter track border and large round browser thumb',
      tokens: ['Browser default appearance', 'OS track border', 'Round thumb'],
      cssSnippet: `/* Previous baseline (native browser input[type="range"]) */
input[type="range"] {
  accent-color: var(--md-sys-color-primary);
}`,
    },
  ];

  const state = {
    selectedStyleId: 'slider-style-tonal-fill-bar',
    sizeClass: 'slider-size-std',
    demoSurface: 'white', // 'white' or 'tonal'
    filterType: 'lowpass',
    envMode: 'override',
    cutoff: 2800,
    resonance: 1.4,
    drift: 25,
    shimmer: 48,
    attack: 2.4,
    release: 6.8,
    sustain: 1.8,
    level: 80,
  };

  /**
   * Computes percentage (0%..100%) for any <input type="range"> and sets --pct
   * on both the input and its closest .control-row container.
   */
  function syncSliderPct(input) {
    if (!input) return;
    const min = parseFloat(input.min || '0');
    const max = parseFloat(input.max || '100');
    const val = parseFloat(input.value || '0');
    const pct = max > min ? Math.max(0, Math.min(100, ((val - min) / (max - min)) * 100)) : 50;
    const pctStr = `${pct.toFixed(1)}%`;
    input.style.setProperty('--pct', pctStr);
    const row = input.closest('.control-row');
    if (row) {
      row.style.setProperty('--pct', pctStr);
    }
  }

  function syncAllSlidersInRoot(root = document) {
    root.querySelectorAll('input[type="range"]').forEach(syncSliderPct);
  }
  window.initCustomSliders = () => syncAllSlidersInRoot(document);

  function formatCutoff(hz) {
    return `${Math.round(hz)} Hz`;
  }

  function formatResonance(q) {
    return Number(q).toFixed(2);
  }

  /**
   * Renders the 10 Slider Style Option Cards on the left column.
   */
  function renderOptionCards() {
    const container = document.getElementById('slider-options-container');
    if (!container) return;

    container.innerHTML = SLIDER_CATALOG.map((styleObj) => {
      const isSelected = styleObj.id === state.selectedStyleId;
      const tokenBadges = styleObj.tokens
        .map((t) => `<span class="badge">${t}</span>`)
        .join('');

      return `
        <article class="slider-option-card ${styleObj.id} ${state.sizeClass}${isSelected ? ' is-selected-style' : ''}" data-slider-card="${styleObj.id}">
          <div class="option-card-header">
            <div class="option-title-cluster">
              <h3 class="option-name">${styleObj.name}</h3>
              <span class="badge ${styleObj.badgeTone}">${styleObj.badge}</span>
            </div>
            <button type="button" class="btn-tonal" data-action="select-slider-style" data-style-id="${styleObj.id}">
              <span class="material-symbols-outlined">${isSelected ? 'check_circle' : 'visibility'}</span>
              <span>${isSelected ? 'Active in demo' : 'Preview in demo'}</span>
            </button>
          </div>

          <p class="option-origin-meta">${styleObj.origin}</p>

          <!-- 2-up Specimen Stage matching Bill's screenshot (Filter cutoff + Resonance Q) -->
          <div class="option-specimen-box">
            <div class="control-row">
              <div class="control-label-line">
                <span>Filter cutoff</span>
                <span class="control-value" data-card-readout="cutoff">${formatCutoff(state.cutoff)}</span>
              </div>
              <input type="range" data-card-slider="cutoff" min="40" max="18000" step="10" value="${state.cutoff}" aria-label="Filter cutoff (${styleObj.name})">
            </div>
            <div class="control-row">
              <div class="control-label-line">
                <span>Resonance (Q)</span>
                <span class="control-value" data-card-readout="resonance">${formatResonance(state.resonance)}</span>
              </div>
              <input type="range" data-card-slider="resonance" min="0.1" max="18.0" step="0.05" value="${state.resonance}" aria-label="Resonance Q (${styleObj.name})">
            </div>
          </div>

          <div class="option-card-footer">
            <div class="badge-row">${tokenBadges}</div>
            <a class="btn-text" href="index.html?sliderStyle=${encodeURIComponent(styleObj.id)}&amp;sliderSize=${encodeURIComponent(state.sizeClass)}">
              <span>Try in Eno Studio</span>
              <span class="material-symbols-outlined">arrow_forward</span>
            </a>
          </div>
        </article>
      `;
    }).join('');

    syncAllSlidersInRoot(container);
  }

  /**
   * Updates the sticky right-hand demo panel classes, badges, readouts, and canvases.
   */
  function syncDemoPanelUI() {
    const activeStyle =
      SLIDER_CATALOG.find((s) => s.id === state.selectedStyleId) || SLIDER_CATALOG[0];

    const demoPanel = document.getElementById('demo-right-panel');
    if (demoPanel) {
      demoPanel.className = `demo-right-panel slider-scope ${activeStyle.id} ${state.sizeClass}`;
    }

    const badge = document.getElementById('active-slider-badge');
    if (badge) {
      badge.textContent = activeStyle.name;
    }

    const applyLink = document.getElementById('btn-apply-slider-studio');
    if (applyLink) {
      applyLink.setAttribute(
        'href',
        `index.html?sliderStyle=${encodeURIComponent(activeStyle.id)}&sliderSize=${encodeURIComponent(state.sizeClass)}`
      );
    }

    // Surface backdrop toggle
    document.querySelectorAll('.demo-surface-box').forEach((box) => {
      box.classList.toggle('on-white-surface', state.demoSurface === 'white');
    });

    // Toolbar buttons state
    document.querySelectorAll('[data-slider-size]').forEach((btn) => {
      const active = btn.getAttribute('data-slider-size') === state.sizeClass;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-pressed', String(active));
    });
    document.querySelectorAll('[data-demo-surface]').forEach((btn) => {
      const active = btn.getAttribute('data-demo-surface') === state.demoSurface;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-pressed', String(active));
    });

    // Update CSS Snippet
    const cssTitle = document.getElementById('selected-slider-css-title');
    if (cssTitle) {
      cssTitle.textContent = `Token CSS — ${activeStyle.name}`;
    }
    const cssCode = document.getElementById('selected-slider-css-code');
    if (cssCode) {
      cssCode.textContent = activeStyle.cssSnippet;
    }

    syncParameterValuesAcrossAllControls();
    drawFilterResponseCanvas();
    drawEnvelopeCanvas();
  }

  /**
   * Synchronizes cutoff, resonance, and envelope values across both the right demo
   * panel and all 10 option cards on the left without re-rendering DOM during drag.
   */
  function syncParameterValuesAcrossAllControls() {
    // 1. Update right-hand demo sliders & labels
    const setDemoControl = (id, labelId, val, text) => {
      const input = document.getElementById(id);
      const lbl = document.getElementById(labelId);
      if (input && document.activeElement !== input) {
        input.value = val;
      }
      if (input) syncSliderPct(input);
      if (lbl) lbl.textContent = text;
    };

    setDemoControl('demo-cutoff', 'val-demo-cutoff', state.cutoff, formatCutoff(state.cutoff));
    setDemoControl('demo-resonance', 'val-demo-resonance', state.resonance, formatResonance(state.resonance));
    setDemoControl('demo-drift', 'val-demo-drift', state.drift, `${Math.round(state.drift)}%`);
    setDemoControl('demo-shimmer', 'val-demo-shimmer', state.shimmer, `${Math.round(state.shimmer)}%`);
    setDemoControl('demo-attack', 'val-demo-attack', state.attack, `${Number(state.attack).toFixed(2)} s`);
    setDemoControl('demo-release', 'val-demo-release', state.release, `${Number(state.release).toFixed(2)} s`);
    setDemoControl('demo-sustain', 'val-demo-sustain', state.sustain, `${Number(state.sustain).toFixed(2)} s`);
    setDemoControl('demo-level', 'val-demo-level', state.level, `${Math.round(state.level)}%`);

    // 2. Update all 10 left-hand option card specimen sliders & readouts
    document.querySelectorAll('[data-card-slider="cutoff"]').forEach((input) => {
      if (document.activeElement !== input) input.value = state.cutoff;
      syncSliderPct(input);
    });
    document.querySelectorAll('[data-card-readout="cutoff"]').forEach((el) => {
      el.textContent = formatCutoff(state.cutoff);
    });
    document.querySelectorAll('[data-card-slider="resonance"]').forEach((input) => {
      if (document.activeElement !== input) input.value = state.resonance;
      syncSliderPct(input);
    });
    document.querySelectorAll('[data-card-readout="resonance"]').forEach((el) => {
      el.textContent = formatResonance(state.resonance);
    });

    // 3. Sync XY Pad Puck
    const puck = document.getElementById('demo-xy-puck');
    if (puck) {
      const normX = Math.log(Math.max(40, state.cutoff) / 40) / Math.log(18000 / 40);
      const normY = (state.resonance - 0.1) / 17.9;
      puck.style.left = `${Math.max(0.06, Math.min(0.94, normX)) * 100}%`;
      puck.style.top = `${(1.0 - Math.max(0.06, Math.min(0.94, normY))) * 100}%`;
    }
  }

  function drawFilterResponseCanvas() {
    const canvas = document.getElementById('demo-filter-canvas');
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const w = Math.max(240, rect.width || 360);
    const h = Math.max(64, rect.height || 84);
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    }
    const ctx = canvas.getContext('2d');
    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    const cs = getComputedStyle(document.documentElement);
    const primary = cs.getPropertyValue('--md-sys-color-primary').trim() || '#0E57D0';
    const primaryContainer = cs.getPropertyValue('--md-sys-color-primary-container').trim() || '#D3E3FD';
    const gridColor = cs.getPropertyValue('--md-sys-color-outline-variant').trim() || '#C4C7C5';

    ctx.strokeStyle = gridColor;
    ctx.globalAlpha = 0.4;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, h * 0.55);
    ctx.lineTo(w, h * 0.55);
    ctx.stroke();
    ctx.globalAlpha = 1;

    const cutoffNorm = Math.log(Math.max(40, state.cutoff) / 40) / Math.log(18000 / 40);
    const resNorm = (state.resonance - 0.1) / 17.9;
    const cx = 18 + cutoffNorm * (w - 36);
    const peakBoost = resNorm * (h * 0.38);

    ctx.beginPath();
    for (let x = 0; x <= w; x += 2) {
      const nx = (x - 18) / Math.max(1, w - 36);
      const dist = nx - cutoffNorm;
      let y = h * 0.55;
      const bell = Math.exp(-(dist * dist) / 0.008) * peakBoost;
      if (state.filterType === 'lowpass') {
        y = h * 0.55 + (dist > 0 ? Math.min(h * 0.42, dist * dist * h * 2.2) : 0) - bell;
      } else if (state.filterType === 'highpass') {
        y = h * 0.55 + (dist < 0 ? Math.min(h * 0.42, dist * dist * h * 2.2) : 0) - bell;
      } else if (state.filterType === 'bandpass') {
        y = h * 0.86 - Math.exp(-(dist * dist) / 0.032) * (h * 0.36 + peakBoost * 0.6);
      } else if (state.filterType === 'notch') {
        y = h * 0.48 + Math.exp(-(dist * dist) / 0.006) * (h * 0.36);
      }
      y = Math.max(8, Math.min(h - 6, y));
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = primary;
    ctx.lineWidth = 2.25;
    ctx.stroke();
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fillStyle = primaryContainer;
    ctx.globalAlpha = 0.55;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = primary;
    ctx.beginPath();
    ctx.arc(cx, Math.max(10, h * 0.55 - peakBoost), 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawEnvelopeCanvas() {
    const canvas = document.getElementById('demo-envelope-canvas');
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const w = Math.max(240, rect.width || 360);
    const h = Math.max(64, rect.height || 84);
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    }
    const ctx = canvas.getContext('2d');
    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    const cs = getComputedStyle(document.documentElement);
    const primary = cs.getPropertyValue('--md-sys-color-primary').trim() || '#0E57D0';
    const primaryContainer = cs.getPropertyValue('--md-sys-color-primary-container').trim() || '#D3E3FD';
    const total = Math.max(1, state.attack + state.sustain + state.release);
    const padX = 14;
    const availW = w - padX * 2;
    const x1 = padX + (state.attack / total) * availW;
    const x2 = x1 + (state.sustain / total) * availW;
    const x3 = padX + availW;
    const peakY = h - 10 - (state.level / 100) * (h - 24);
    const baseY = h - 10;

    ctx.beginPath();
    ctx.moveTo(padX, baseY);
    ctx.quadraticCurveTo(padX + (x1 - padX) * 0.35, peakY, x1, peakY);
    ctx.lineTo(x2, peakY);
    ctx.quadraticCurveTo(x2 + (x3 - x2) * 0.35, baseY, x3, baseY);
    ctx.strokeStyle = primary;
    ctx.lineWidth = 2.25;
    ctx.stroke();
    ctx.lineTo(x3, h);
    ctx.lineTo(padX, h);
    ctx.closePath();
    ctx.fillStyle = primaryContainer;
    ctx.globalAlpha = 0.55;
    ctx.fill();
    ctx.restore();
  }

  function updateCardSelectionClasses() {
    document.querySelectorAll('[data-slider-card]').forEach((card) => {
      const styleId = card.getAttribute('data-slider-card');
      const isSelected = styleId === state.selectedStyleId;
      card.className = `slider-option-card ${styleId} ${state.sizeClass}${isSelected ? ' is-selected-style' : ''}`;
      const btn = card.querySelector('[data-action="select-slider-style"]');
      if (btn) {
        const icon = btn.querySelector('.material-symbols-outlined');
        const txt = btn.querySelector('span:last-child');
        if (icon) icon.textContent = isSelected ? 'check_circle' : 'visibility';
        if (txt) txt.textContent = isSelected ? 'Active in demo' : 'Preview in demo';
      }
      const studioLink = card.querySelector('a.btn-text');
      if (studioLink) {
        studioLink.setAttribute(
          'href',
          `index.html?sliderStyle=${encodeURIComponent(styleId)}&sliderSize=${encodeURIComponent(state.sizeClass)}`
        );
      }
    });
  }

  function initExplorerPage() {
    renderOptionCards();
    syncDemoPanelUI();

    // Live input listener for both left option card sliders and right demo sliders
    document.addEventListener('input', (e) => {
      const target = e.target;
      if (!(target instanceof HTMLInputElement) || target.type !== 'range') return;
      syncSliderPct(target);

      const cardSlider = target.getAttribute('data-card-slider');
      if (cardSlider) {
        const parentCard = target.closest('[data-slider-card]');
        if (parentCard) {
          state.selectedStyleId = parentCard.getAttribute('data-slider-card');
          updateCardSelectionClasses();
        }
        if (cardSlider === 'cutoff') state.cutoff = parseFloat(target.value);
        if (cardSlider === 'resonance') state.resonance = parseFloat(target.value);
        syncDemoPanelUI();
        return;
      }

      const demoParam = target.getAttribute('data-param');
      if (demoParam && demoParam in state) {
        state[demoParam] = parseFloat(target.value);
        syncDemoPanelUI();
      }
    });

    // Click handlers for style cards, size pills, surface pills, filter/env pills, copy CSS
    document.addEventListener('click', (e) => {
      const sizeBtn = e.target.closest('[data-slider-size]');
      if (sizeBtn) {
        state.sizeClass = sizeBtn.getAttribute('data-slider-size');
        updateCardSelectionClasses();
        syncDemoPanelUI();
        return;
      }

      const surfBtn = e.target.closest('[data-demo-surface]');
      if (surfBtn) {
        state.demoSurface = surfBtn.getAttribute('data-demo-surface');
        syncDemoPanelUI();
        return;
      }

      const filterBtn = e.target.closest('[data-demo-filter]');
      if (filterBtn) {
        state.filterType = filterBtn.getAttribute('data-demo-filter');
        document.querySelectorAll('[data-demo-filter]').forEach((b) => {
          b.classList.toggle('active', b === filterBtn);
        });
        drawFilterResponseCanvas();
        return;
      }

      const envBtn = e.target.closest('[data-demo-env]');
      if (envBtn) {
        state.envMode = envBtn.getAttribute('data-demo-env');
        document.querySelectorAll('[data-demo-env]').forEach((b) => {
          b.classList.toggle('active', b === envBtn);
        });
        drawEnvelopeCanvas();
        return;
      }

      const copyBtn = e.target.closest('#btn-copy-slider-css');
      if (copyBtn) {
        const activeStyle =
          SLIDER_CATALOG.find((s) => s.id === state.selectedStyleId) || SLIDER_CATALOG[0];
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(activeStyle.cssSnippet);
        }
        const lbl = copyBtn.querySelector('.copy-label');
        if (lbl) {
          lbl.textContent = 'Copied CSS';
          setTimeout(() => {
            lbl.textContent = 'Copy CSS tokens';
          }, 1600);
        }
        return;
      }

      const selectBtn = e.target.closest('[data-action="select-slider-style"]');
      if (selectBtn) {
        e.stopPropagation();
        state.selectedStyleId = selectBtn.getAttribute('data-style-id');
        updateCardSelectionClasses();
        syncDemoPanelUI();
        return;
      }

      const card = e.target.closest('[data-slider-card]');
      if (card && !e.target.closest('a') && !e.target.closest('input')) {
        state.selectedStyleId = card.getAttribute('data-slider-card');
        updateCardSelectionClasses();
        syncDemoPanelUI();
      }
    });

    // Interactive XY Pad in Right Demo Panel
    const xyPad = document.getElementById('demo-xy-pad');
    if (xyPad) {
      let dragging = false;
      const updateFromXY = (e) => {
        const rect = xyPad.getBoundingClientRect();
        const nx = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        const ny = Math.max(0, Math.min(1, 1.0 - (e.clientY - rect.top) / rect.height));
        state.cutoff = Math.round(40 * Math.pow(18000 / 40, nx));
        state.resonance = Number((0.1 + ny * 17.9).toFixed(2));
        syncDemoPanelUI();
      };
      xyPad.addEventListener('pointerdown', (e) => {
        dragging = true;
        xyPad.setPointerCapture?.(e.pointerId);
        updateFromXY(e);
      });
      xyPad.addEventListener('pointermove', (e) => {
        if (dragging) updateFromXY(e);
      });
      xyPad.addEventListener('pointerup', () => {
        dragging = false;
      });
    }

    // Theme toggle (auto | light | dark)
    let themeMode = localStorage.getItem('enso-theme-mode') || 'auto';
    const applyExplorerTheme = (mode) => {
      themeMode = (mode === 'light' || mode === 'dark' || mode === 'auto') ?
          mode :
          'auto';
      const sysDark =
          !!(window.matchMedia &&
             window.matchMedia('(prefers-color-scheme: dark)').matches);
      const isDark = themeMode === 'dark' || (themeMode === 'auto' && sysDark);
      document.documentElement.setAttribute('data-theme-mode', themeMode);
      if (isDark)
        document.documentElement.setAttribute('data-theme', 'dark');
      else
        document.documentElement.removeAttribute('data-theme');
      const icon = document.getElementById('theme-icon');
      if (icon)
        icon.textContent = {
          auto: 'brightness_auto',
          light: 'light_mode',
          dark: 'dark_mode'
        }[themeMode];
      drawFilterResponseCanvas();
      drawEnvelopeCanvas();
    };
    const themeBtn = document.getElementById('btn-theme-toggle');
    if (themeBtn) {
      themeBtn.addEventListener('click', () => {
        const order = ['auto', 'light', 'dark'];
        applyExplorerTheme(order[(order.indexOf(themeMode) + 1) % 3]);
        try {
          localStorage.setItem('enso-theme-mode', themeMode);
        } catch (e) {
        }
      });
    }
    if (window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: dark)')
          .addEventListener?.('change', () => {
            if (themeMode === 'auto') applyExplorerTheme('auto');
          });
    }

    window.addEventListener('resize', () => {
      drawFilterResponseCanvas();
      drawEnvelopeCanvas();
    });

    // Hash / Query URL state & selftest
    const rawParams = `${window.location.search.replace(/^\?/, '')}&${window.location.hash.replace(/^#/, '')}`;
    const params = new URLSearchParams(rawParams);
    applyExplorerTheme(params.get('theme') || themeMode);
    if (params.get('style')) {
      state.selectedStyleId = params.get('style');
    }
    if (params.get('size')) {
      state.sizeClass = params.get('size');
    }
    updateCardSelectionClasses();
    syncDemoPanelUI();

    if (params.get('selftest') === '1') {
      const cards = document.querySelectorAll('.slider-option-card');
      const demoPanel = document.getElementById('demo-right-panel');
      const demoCs = demoPanel ? getComputedStyle(demoPanel) : null;
      const firstCard = cards[0];
      const cardCs = firstCard ? getComputedStyle(firstCard) : null;
      document.body.setAttribute(
        'data-selftest',
        JSON.stringify({
          ok: cards.length === 10 && Boolean(demoPanel),
          optionsCount: cards.length,
          selectedStyle: state.selectedStyleId,
          demoStickyPosition: demoCs ? demoCs.position : null,
          cardBorderWidth: cardCs ? cardCs.borderTopWidth : null,
          cardBoxShadow: cardCs ? cardCs.boxShadow : null,
        })
      );
    }
  }

  /**
   * When loaded inside index.html or button-styles.html, automatically syncs --pct
   * on all range sliders and applies ?sliderStyle=... (defaulting to Contained tonal fill bar).
   */
  function initStudioSliderUpgrade() {
    const q = `${window.location.search || ''}&${(window.location.hash || '').replace(/^#/, '')}`;
    const styleMatch = q.match(/sliderStyle=([a-z0-9_-]+)/i);
    const sizeMatch = q.match(/sliderSize=([a-z0-9_-]+)/i);
    const styleClass = styleMatch && styleMatch[1] ? styleMatch[1] : 'slider-style-tonal-fill-bar';
    const sizeClass = sizeMatch && sizeMatch[1] ? sizeMatch[1] : 'slider-size-std';

    Array.from(document.body.classList).forEach((cls) => {
      if (cls.startsWith('slider-style-') || cls.startsWith('slider-size-')) {
        document.body.classList.remove(cls);
      }
    });
    document.body.classList.add('slider-scope', styleClass, sizeClass);
    syncAllSlidersInRoot(document);

    document.addEventListener('input', (e) => {
      if (e.target instanceof HTMLInputElement && e.target.type === 'range') {
        syncSliderPct(e.target);
      }
    });

    // Observe dynamically rendered sliders (like 6 voices grid and degree weights)
    const observer = new MutationObserver(() => {
      syncAllSlidersInRoot(document);
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('slider-options-container')) {
      initExplorerPage();
    } else {
      initStudioSliderUpgrade();
    }
  });
})();
