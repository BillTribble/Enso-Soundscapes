/**
 * Interactive Button & Segmented Pill Style Explorer for GM3 & Modern UI Libraries.
 * Zero inline style mutations; all state switches via semantic CSS classes.
 */
(function () {
  'use strict';

  const FILTER_CURVE_SVGS = {
    lowpass: '<svg class="curve-svg" viewBox="0 0 16 10" aria-hidden="true"><path d="M1 2.5 H7 C10 2.5 11.5 8.5 15 8.5"/></svg>',
    bandpass: '<svg class="curve-svg" viewBox="0 0 16 10" aria-hidden="true"><path d="M1 8.5 C4.5 8.5 5.5 2 8 2 C10.5 2 11.5 8.5 15 8.5"/></svg>',
    highpass: '<svg class="curve-svg" viewBox="0 0 16 10" aria-hidden="true"><path d="M1 8.5 C4.5 8.5 6 2.5 9 2.5 H15"/></svg>',
    notch: '<svg class="curve-svg" viewBox="0 0 16 10" aria-hidden="true"><path d="M1 2.5 H5.5 L8 8.5 L10.5 2.5 H15"/></svg>',
  };

  const ENV_CURVE_SVGS = {
    override: '<svg class="curve-svg" viewBox="0 0 16 10" aria-hidden="true"><path d="M1 8.5 L5 2 H9.5 L15 8.5"/></svg>',
    scale: '<svg class="curve-svg" viewBox="0 0 16 10" aria-hidden="true"><path d="M1 8.5 L4 4.5 H7.5 L11 8.5 M6 8.5 L9.5 2 H12.5 L15 8.5"/></svg>',
  };

  const STYLE_CATALOG = [
    {
      id: 'style-gm3-connected-dsp',
      number: '01',
      name: 'GM3 Expressive connected group + DSP curve & active dot fallback',
      badge: 'Selected studio style',
      badgeTone: 'badge-blue',
      origin: 'Gmail GM3 rule: Sky Blue (--md-sys-color-blue-tonal / --md-sys-color-primary-container) reserved for tab-buttons & connected mode selectors (Cyan reserved for .btn-tonal) · shows inline 14px SVG curve or automatic 5.5px dot (•) when active',
      showCurve: true,
      tokens: ['Sky blue tab-button', 'SVG curve or • dot fallback', '--md-sys-color-blue-tonal', '--md-sys-color-primary'],
      cssSnippet: `/* Gmail GM3 Rule: Cyan reserved for .btn-tonal; Sky Blue reserved for tab-buttons */
.btn-tonal {
  background-color: var(--md-sys-color-secondary-container); /* Cyan #C1E7FF */
  color: var(--md-sys-color-on-secondary-container);
}
.gm3-connected-dsp { display: inline-flex; gap: 2px; }
.gm3-connected-dsp .m3-pill-tab {
  height: 26px; padding: 0 10px; gap: 5px; border-radius: 4px; border: none;
  background-color: var(--md-sys-color-surface-container);
  color: var(--md-sys-color-on-surface-variant);
}
.gm3-connected-dsp .m3-pill-tab:first-child {
  border-top-left-radius: 9999px; border-bottom-left-radius: 9999px; padding-left: 12px;
}
.gm3-connected-dsp .m3-pill-tab:last-child {
  border-top-right-radius: 9999px; border-bottom-right-radius: 9999px; padding-right: 12px;
}
.gm3-connected-dsp .m3-pill-tab.active {
  border-radius: 9999px; padding: 0 12px;
  background-color: var(--md-sys-color-blue-tonal); /* Sky Blue #DBEAFE */
  color: var(--md-sys-color-primary);
  font-weight: 600;
}
/* Automatically sub in a 5.5px leading dot when active if button has no icon/SVG */
.gm3-connected-dsp .m3-pill-tab.active:not(:has(svg, .material-symbols-outlined))::before {
  content: ''; width: 5.5px; height: 5.5px; border-radius: 9999px;
  background-color: currentColor; flex-shrink: 0;
}`,
    },
    {
      id: 'style-tonal-stadium',
      number: '02',
      name: 'Compact tonal stadium pill',
      badge: 'Recommended',
      badgeTone: 'badge-blue',
      origin: 'GM3 tonal surface + primary-container fill · 26px height · full stadium radius · zero borders',
      tokens: ['--md-sys-color-primary-container', '--md-sys-color-surface-container-high', '9999px radius'],
      cssSnippet: `.pill-btn {
  height: 26px; padding: 0 10px; border-radius: 9999px; border: none;
  font: 500 12px/1 'Inter', sans-serif;
  background-color: var(--md-sys-color-surface-container-high);
  color: var(--md-sys-color-on-surface-variant);
}
.pill-btn.active {
  background-color: var(--md-sys-color-primary-container);
  color: var(--md-sys-color-on-primary-container);
  font-weight: 600;
}`,
    },
    {
      id: 'style-tonal-squircle',
      number: '03',
      name: 'Compact tonal rounded chip (8px)',
      badge: 'Light blue / grey',
      badgeTone: 'badge-blue',
      origin: 'GM3 filter-chip 8px corner shape without perimeter outlines · light blue active / cool grey rest',
      tokens: ['--md-sys-color-primary-container', '--md-sys-color-surface-container-high', '8px radius'],
      cssSnippet: `.pill-btn {
  height: 26px; padding: 0 10px; border-radius: 8px; border: none;
  font: 500 12px/1 'Inter', sans-serif;
  background-color: var(--md-sys-color-surface-container-high);
  color: var(--md-sys-color-on-surface-variant);
}
.pill-btn.active {
  background-color: var(--md-sys-color-primary-container);
  color: var(--md-sys-color-on-primary-container);
  font-weight: 600;
}`,
    },
    {
      id: 'style-gm3-secondary-check',
      number: '04',
      name: 'GM3 secondary sky-blue + checkmark',
      badge: 'Official GM3 chip',
      badgeTone: 'badge-teal',
      origin: 'Material Web md-filter-chip (elevated/flat borderless spec) · secondary-container sky blue + 14px check icon',
      showCheck: true,
      tokens: ['--md-sys-color-secondary-container', '--md-sys-color-on-secondary-container', '14px check'],
      cssSnippet: `.pill-btn {
  height: 26px; padding: 0 10px; gap: 4px; border-radius: 8px; border: none;
  background-color: var(--md-sys-color-surface-container-high);
  color: var(--md-sys-color-on-surface-variant);
}
.pill-btn.active {
  background-color: var(--md-sys-color-secondary-container);
  color: var(--md-sys-color-on-secondary-container);
  font-weight: 600;
}`,
    },
    {
      id: 'style-dsp-curve',
      number: '05',
      name: 'DSP filter curve + light-blue tonal pill (8px)',
      badge: 'Audio studio native',
      badgeTone: 'badge-purple',
      origin: 'FabFilter Pro-Q / Logic EQ inspired · inline 14px SVG frequency response curve + 8px rounded pills',
      showCurve: true,
      tokens: ['Inline SVG curve', '--md-sys-color-primary-container', '--md-sys-color-surface-container-high'],
      cssSnippet: `.pill-btn {
  height: 26px; padding: 0 10px; gap: 5px; border-radius: 8px; border: none;
  background-color: var(--md-sys-color-surface-container-high);
  color: var(--md-sys-color-on-surface-variant);
}
.pill-btn.active {
  background-color: var(--md-sys-color-primary-container);
  color: var(--md-sys-color-on-primary-container);
  font-weight: 600;
}`,
    },
    {
      id: 'style-micro-led',
      number: '06',
      name: 'Micro synth LED pill (blue-tonal + dot)',
      badge: 'Hardware rack',
      badgeTone: 'badge-green',
      origin: 'Ableton Live / hardware synth rack button · 5px status LED transitions from muted grey to primary blue',
      tokens: ['--md-sys-color-blue-tonal', '--md-sys-color-primary LED', '6px radius'],
      cssSnippet: `.pill-btn {
  height: 24px; padding: 0 9px; gap: 5px; border-radius: 6px;
  background-color: var(--md-sys-color-surface-container-high);
  color: var(--md-sys-color-on-surface-variant);
}
.pill-btn.active {
  background-color: var(--md-sys-color-blue-tonal);
  color: var(--md-sys-color-on-blue-tonal);
  font-weight: 600;
}`,
    },
    {
      id: 'style-gm3-connected',
      number: '07',
      name: 'GM3 Expressive connected button group (text-only)',
      badge: 'M3 Expressive',
      badgeTone: 'badge-teal',
      origin: 'Material 3 Expressive connected segments · 2px gap, 4px inner corners, active segment morphs to full 999px pill',
      tokens: ['Morphing border-radius', '--md-sys-color-primary-container', '2px gap'],
      cssSnippet: `.style-gm3-connected { display: inline-flex; gap: 2px; }
.style-gm3-connected .pill-btn {
  border-radius: 4px;
  background-color: var(--md-sys-color-surface-container-high);
}
.style-gm3-connected .pill-btn.active {
  border-radius: 9999px;
  background-color: var(--md-sys-color-primary-container);
  color: var(--md-sys-color-on-primary-container);
}`,
    },
    {
      id: 'style-recessed-blue-track',
      number: '08',
      name: 'Recessed grey track + light-blue pill',
      badge: 'Linear / Radix',
      badgeTone: 'badge-blue',
      origin: 'Single unified grey track container (surface-container-high) with floating light-blue active pill',
      tokens: ['Unified grey track', '--md-sys-color-primary-container', 'Zero borders'],
      cssSnippet: `.style-recessed-blue-track {
  background-color: var(--md-sys-color-surface-container-high);
  padding: 3px; border-radius: 9999px; gap: 2px;
}
.style-recessed-blue-track .pill-btn.active {
  background-color: var(--md-sys-color-primary-container);
  color: var(--md-sys-color-on-primary-container);
}`,
    },
    {
      id: 'style-recessed-surface-track',
      number: '09',
      name: 'Recessed grey track + white surface pill',
      badge: 'Apple HIG / Shadcn',
      badgeTone: 'badge-purple',
      origin: 'macOS / Shadcn Tabs segmented track · grey recessed trough with crisp white active segment & primary blue label',
      tokens: ['--md-sys-color-surface-container-high', '--md-sys-color-surface-container-lowest', '--md-sys-color-primary'],
      cssSnippet: `.style-recessed-surface-track {
  background-color: var(--md-sys-color-surface-container-high);
  padding: 3px; border-radius: 10px; gap: 2px;
}
.style-recessed-surface-track .pill-btn.active {
  background-color: var(--md-sys-color-surface-container-lowest);
  color: var(--md-sys-color-primary);
}`,
    },
    {
      id: 'style-solid-primary',
      number: '10',
      name: 'High-contrast solid blue / grey unfilled',
      badge: 'Vercel Geist',
      badgeTone: 'badge-orange',
      origin: 'High-emphasis solid primary blue active fill (#0E57D0) paired with soft grey unfilled inactive pills',
      tokens: ['--md-sys-color-primary', '--md-sys-color-on-primary', '--md-sys-color-surface-container-high'],
      cssSnippet: `.pill-btn {
  height: 26px; padding: 0 10px; border-radius: 9999px;
  background-color: var(--md-sys-color-surface-container-high);
  color: var(--md-sys-color-on-surface-variant);
}
.pill-btn.active {
  background-color: var(--md-sys-color-primary);
  color: var(--md-sys-color-on-primary);
}`,
    },
    {
      id: 'style-legacy-baseline',
      number: '11',
      name: 'Previous baseline (32px outlined grey dot)',
      badge: 'Old baseline',
      badgeTone: 'badge-yellow',
      origin: 'Shown for side-by-side comparison: 32px height, 1px outline-variant border, grey active fill, radial black dot',
      tokens: ['32px height', '1px solid outline', 'surface-container-highest'],
      cssSnippet: `/* Previous baseline for comparison */
.m3-pill-tab {
  height: 32px; border-radius: 12px;
  border: 1px solid var(--md-sys-color-outline-variant);
}`,
    },
  ];

  const state = {
    selectedStyleId: 'style-gm3-connected-dsp',
    sizeClass: 'size-compact',
    paletteClass: 'palette-bright-sky',
    filterType: 'lowpass',
    envMode: 'override',
    surfaceBackdrop: 'card', // 'card' (white) or 'nested' (grey)
  };

  function getPaletteMod(styleObj) {
    if (styleObj.id === 'style-gm3-connected-dsp' || styleObj.id === 'style-gm3-connected') {
      return ` ${state.paletteClass}`;
    }
    return '';
  }

  function buildFilterButtonsHtml(styleObj, activeFilter, sizeClass) {
    const filters = [
      { id: 'lowpass', label: 'Lowpass' },
      { id: 'bandpass', label: 'Bandpass' },
      { id: 'highpass', label: 'Highpass' },
      { id: 'notch', label: 'Notch' },
    ];
    const items = filters
      .map((f) => {
        const isActive = f.id === activeFilter;
        const checkHtml = styleObj.showCheck
          ? '<span class="material-symbols-outlined check-glyph" aria-hidden="true">check</span>'
          : '';
        const curveHtml = styleObj.showCurve ? FILTER_CURVE_SVGS[f.id] || '' : '';
        return `<button type="button" class="pill-btn${isActive ? ' active' : ''}" data-action="set-filter" data-filter="${f.id}" aria-pressed="${isActive}">${checkHtml}${curveHtml}<span>${f.label}</span></button>`;
      })
      .join('');
    return `<div class="pill-group ${styleObj.id} ${sizeClass}${getPaletteMod(styleObj)}" role="group" aria-label="Master filter type">${items}</div>`;
  }

  function buildEnvButtonsHtml(styleObj, activeEnv, sizeClass) {
    const modes = [
      { id: 'override', label: 'Override all' },
      { id: 'scale', label: 'Scale ratios' },
    ];
    const items = modes
      .map((m) => {
        const isActive = m.id === activeEnv;
        const checkHtml = styleObj.showCheck
          ? '<span class="material-symbols-outlined check-glyph" aria-hidden="true">check</span>'
          : '';
        const curveHtml = styleObj.id === 'style-dsp-curve' ? ENV_CURVE_SVGS[m.id] || '' : '';
        return `<button type="button" class="pill-btn${isActive ? ' active' : ''}" data-action="set-env" data-env="${m.id}" aria-pressed="${isActive}">${checkHtml}${curveHtml}<span>${m.label}</span></button>`;
      })
      .join('');
    return `<div class="pill-group ${styleObj.id} ${sizeClass}${getPaletteMod(styleObj)}" role="group" aria-label="Global envelope mode">${items}</div>`;
  }

  function renderAll() {
    const activeStyle =
      STYLE_CATALOG.find((s) => s.id === state.selectedStyleId) || STYLE_CATALOG[0];

    document.body.setAttribute('data-gm3-palette', state.paletteClass);
    document.querySelectorAll('.explorer-toolbar-row .pill-group').forEach((grp) => {
      grp.className = `pill-group style-gm3-connected-dsp size-compact ${state.paletteClass}`;
    });

    // 1. Update Live Context Preview at Top
    const liveFilterMount = document.getElementById('live-context-filter-mount');
    if (liveFilterMount) {
      liveFilterMount.innerHTML = buildFilterButtonsHtml(
        activeStyle,
        state.filterType,
        state.sizeClass
      );
    }
    const liveEnvMount = document.getElementById('live-context-env-mount');
    if (liveEnvMount) {
      liveEnvMount.innerHTML = buildEnvButtonsHtml(
        activeStyle,
        state.envMode,
        state.sizeClass
      );
    }

    const activeStyleTitle = document.getElementById('active-style-badge');
    if (activeStyleTitle) {
      activeStyleTitle.textContent = activeStyle.name;
    }

    const openInStudioLink = document.getElementById('btn-apply-to-studio');
    if (openInStudioLink) {
      openInStudioLink.setAttribute(
        'href',
        `index.html?buttonStyle=${encodeURIComponent(activeStyle.id)}&buttonSize=${encodeURIComponent(state.sizeClass)}&buttonColor=${encodeURIComponent(state.paletteClass)}`
      );
    }

    // 2. Update Backdrop Surface Toggle on Context Boxes
    document.querySelectorAll('.context-preview-box').forEach((box) => {
      box.classList.toggle('on-white-surface', state.surfaceBackdrop === 'card');
    });

    // 3. Render the 11 Style Cards Gallery
    const galleryEl = document.getElementById('styles-gallery-container');
    if (galleryEl) {
      galleryEl.innerHTML = STYLE_CATALOG.map((styleObj) => {
        const isSelected = styleObj.id === state.selectedStyleId;
        const tokenPills = styleObj.tokens
          .map((t) => `<span class="badge">${t}</span>`)
          .join('');
        return `
          <article class="style-option-card${isSelected ? ' is-selected-style' : ''}" data-style-card="${styleObj.id}">
            <div class="style-card-top">
              <div class="style-title-row">
                <div class="style-title-cluster">
                  <h3 class="style-name">${styleObj.name}</h3>
                  <span class="badge ${styleObj.badgeTone}">${styleObj.badge}</span>
                </div>
                <button type="button" class="btn-tonal" data-action="select-style" data-style-id="${styleObj.id}">
                  <span class="material-symbols-outlined">${isSelected ? 'check_circle' : 'visibility'}</span>
                  <span>${isSelected ? 'Active in preview' : 'Preview in header'}</span>
                </button>
              </div>
              <p class="style-origin-meta">${styleObj.origin}</p>
            </div>

            <div class="specimen-stage">
              <div class="specimen-row">
                <span class="specimen-row-label">4-way filter (with icon)</span>
                ${buildFilterButtonsHtml(styleObj, state.filterType, state.sizeClass)}
              </div>
              <div class="inset-divider"></div>
              <div class="specimen-row">
                <span class="specimen-row-label">2-way toggle (no icon → •)</span>
                ${buildEnvButtonsHtml(styleObj, state.envMode, state.sizeClass)}
              </div>
            </div>

            <div class="style-card-footer">
              <div class="badge-row">${tokenPills}</div>
              <a class="btn-text" href="index.html?buttonStyle=${encodeURIComponent(styleObj.id)}&buttonSize=${encodeURIComponent(state.sizeClass)}&buttonColor=${encodeURIComponent(state.paletteClass)}">
                <span>Try in Eno Studio</span>
                <span class="material-symbols-outlined">arrow_forward</span>
              </a>
            </div>
          </article>
        `;
      }).join('');
    }

    // 4. Update CSS Snippet Box
    const cssCodeEl = document.getElementById('selected-css-code');
    if (cssCodeEl) {
      cssCodeEl.textContent = activeStyle.cssSnippet;
    }
    const cssTitleEl = document.getElementById('selected-css-title');
    if (cssTitleEl) {
      cssTitleEl.textContent = `Token CSS recipe — ${activeStyle.name}`;
    }

    // 5. Sync Toolbar Pill States
    document.querySelectorAll('[data-size-option]').forEach((btn) => {
      const active = btn.getAttribute('data-size-option') === state.sizeClass;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-pressed', String(active));
    });
    document.querySelectorAll('[data-palette-option]').forEach((btn) => {
      const active = btn.getAttribute('data-palette-option') === state.paletteClass;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-pressed', String(active));
    });
    document.querySelectorAll('[data-backdrop-option]').forEach((btn) => {
      const active = btn.getAttribute('data-backdrop-option') === state.surfaceBackdrop;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-pressed', String(active));
    });
  }

  function initEvents() {
    document.addEventListener('click', (e) => {
      const filterBtn = e.target.closest('[data-action="set-filter"]');
      if (filterBtn) {
        e.stopPropagation();
        state.filterType = filterBtn.getAttribute('data-filter') || 'lowpass';
        const parentCard = filterBtn.closest('[data-style-card]');
        if (parentCard) {
          state.selectedStyleId = parentCard.getAttribute('data-style-card');
        }
        renderAll();
        return;
      }

      const envBtn = e.target.closest('[data-action="set-env"]');
      if (envBtn) {
        e.stopPropagation();
        state.envMode = envBtn.getAttribute('data-env') || 'override';
        const parentCard = envBtn.closest('[data-style-card]');
        if (parentCard) {
          state.selectedStyleId = parentCard.getAttribute('data-style-card');
        }
        renderAll();
        return;
      }

      const selectStyleBtn = e.target.closest('[data-action="select-style"]');
      if (selectStyleBtn) {
        e.stopPropagation();
        state.selectedStyleId = selectStyleBtn.getAttribute('data-style-id');
        renderAll();
        return;
      }

      const sizeBtn = e.target.closest('[data-size-option]');
      if (sizeBtn) {
        state.sizeClass = sizeBtn.getAttribute('data-size-option');
        renderAll();
        return;
      }

      const paletteBtn = e.target.closest('[data-palette-option]');
      if (paletteBtn) {
        state.paletteClass = paletteBtn.getAttribute('data-palette-option');
        renderAll();
        return;
      }

      const backdropBtn = e.target.closest('[data-backdrop-option]');
      if (backdropBtn) {
        state.surfaceBackdrop = backdropBtn.getAttribute('data-backdrop-option');
        renderAll();
        return;
      }

      const copyBtn = e.target.closest('#btn-copy-css');
      if (copyBtn) {
        const activeStyle =
          STYLE_CATALOG.find((s) => s.id === state.selectedStyleId) || STYLE_CATALOG[0];
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(activeStyle.cssSnippet);
        }
        const labelSpan = copyBtn.querySelector('.copy-label');
        if (labelSpan) {
          labelSpan.textContent = 'Copied CSS';
          setTimeout(() => {
            labelSpan.textContent = 'Copy CSS tokens';
          }, 1600);
        }
        return;
      }

      const styleCard = e.target.closest('[data-style-card]');
      if (styleCard && !e.target.closest('a')) {
        state.selectedStyleId = styleCard.getAttribute('data-style-card');
        renderAll();
      }
    });

    const themeBtn = document.getElementById('btn-theme-toggle');
    if (themeBtn) {
      themeBtn.addEventListener('click', () => {
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        if (isDark) {
          document.documentElement.removeAttribute('data-theme');
        } else {
          document.documentElement.setAttribute('data-theme', 'dark');
        }
        const icon = document.getElementById('theme-icon');
        if (icon) {
          icon.textContent = isDark ? 'dark_mode' : 'light_mode';
        }
      });
    }
  }

  function applyHashParams() {
    const hash = window.location.hash.replace(/^#/, '');
    const params = new URLSearchParams(hash);
    if (params.get('theme') === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
      const icon = document.getElementById('theme-icon');
      if (icon) icon.textContent = 'light_mode';
    }
    if (params.get('style')) {
      state.selectedStyleId = params.get('style');
    }
    if (params.get('size')) {
      state.sizeClass = params.get('size');
    }
    renderAll();

    if (params.get('selftest') === '1') {
      const cards = document.querySelectorAll('.style-option-card');
      const firstCard = cards[0];
      const cs = firstCard ? window.getComputedStyle(firstCard) : null;
      const activeBtn = document.querySelector('.style-gm3-connected-dsp .pill-btn.active');
      const btnCs = activeBtn ? window.getComputedStyle(activeBtn) : null;
      const payload = {
        ok: cards.length === 11 && Boolean(activeBtn),
        stylesCount: cards.length,
        selectedStyle: state.selectedStyleId,
        cardBorderWidth: cs ? cs.borderTopWidth : null,
        cardBoxShadow: cs ? cs.boxShadow : null,
        activeBtnHeight: btnCs ? btnCs.height : null,
        activeBtnBg: btnCs ? btnCs.backgroundColor : null,
      };
      document.body.setAttribute('data-selftest', JSON.stringify(payload));
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    renderAll();
    initEvents();
    applyHashParams();
  });
})();
