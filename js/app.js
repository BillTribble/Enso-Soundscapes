/**
 * Brian Eno Aleatoric Soundscape & Deep Listening Studio — Main Application Controller
 * Binds AudioEngine, ProbabilityEngine, SoundscapeVisualizer, XY Performance Pad,
 * Global Envelope/Filter/Reverb/Delay Macros, Inline Clear Fields, and Theme Sync.
 */
'use strict';

(function() {
  class EnoSoundscapeApp {
    constructor() {
      this.audioEngine = new window.AudioEngine();
      this.visualizer = null;
      this.probEngine = new window.ProbabilityEngine(this.audioEngine, (event) => {
        this.handleProbabilityEvent(event);
      });
      this.phraseEngine = (typeof window.PhraseEngine === 'function')
        ? new window.PhraseEngine(this.audioEngine, this.probEngine)
        : null;
      if (this.phraseEngine) {
        this.probEngine.phraseEngine = this.phraseEngine;
        window.phraseEngine = this.phraseEngine;
      }

      window.audioEngine = this.audioEngine;
      window.probEngine = this.probEngine;

      this.activePresetId = 'thursday';
      this.globalVoiceBalance = -0.62;
      this.globalVoiceGains = { pad: 0.65, piano: 2.00, bell: 0.65, choir: 0.65, tape: 0.65, drone: 0.65 };
      this.globalVoiceFilters = { pad: {cutoff: 5200, resonance: 1.2}, piano: {cutoff: 12000, resonance: 0.8}, bell: {cutoff: 9500, resonance: 1.4}, choir: {cutoff: 6400, resonance: 1.2}, tape: {cutoff: 4200, resonance: 1.6}, drone: {cutoff: 1800, resonance: 1.8} };
      this.globalVoiceFx = { pad: {reverb: 0.70, delay: 0.35}, piano: {reverb: 0.35, delay: 0.12}, bell: {reverb: 0.75, delay: 0.40}, choir: {reverb: 0.80, delay: 0.25}, tape: {reverb: 0.55, delay: 0.65}, drone: {reverb: 0.60, delay: 0.15} };
      this.xyTarget = 'filter';
      this.logFilterText = '';
      this.researchFilterText = '';
      this.lastTickTime = performance.now();
      this.loopRafId = null;

      this.initThemeSync();
      this.initVisualizer();
      this.renderPresetsAndSelects();
      this.renderVoicesGrid();
      this.renderDegreeWeights();
      this.renderResearchCards();
      this.bindTabsAndCanvasModes();
      this.bindTransportAndTopActions();
      this.bindPhraseControls?.();
      this.bindGlobalMacroSliders();
      this.bindXYPerformancePad();
      this.bindInlineClearInputs();
      this.autoCycler = (typeof window.EnsoAutoCycler === 'function') ?
          new window.EnsoAutoCycler(this) :
          null;
      if (this.autoCycler) window.enoAutoCycler = this.autoCycler;
      if (this.audioEngine && typeof this.audioEngine.setTrackStyle === 'function') {
        this.audioEngine.setTrackStyle('thursday');
      }
      this.applyPreset('thursday', false);
      this.startSchedulerLoop();
    }

    initThemeSync() {
      const q = `${window.location.search || ''}&${(window.location.hash || '').replace(/^#/, '')}`;
      let initialMode = 'auto';
      try {
        const storedMode = localStorage.getItem('enso-theme-mode');
        if (storedMode === 'light' || storedMode === 'dark' || storedMode === 'auto') initialMode = storedMode;
      } catch (e) {}
      if (q.includes('theme=dark')) initialMode = 'dark';
      else if (q.includes('theme=light')) initialMode = 'light';
      else if (q.includes('theme=auto')) initialMode = 'auto';
      this._systemDarkOverride = null;
      this.setTheme(initialMode);
      if (window.matchMedia) {
        this._themeMq = window.matchMedia('(prefers-color-scheme: dark)');
        const onSystemThemeChange = () => { if (this.themeMode === 'auto') this.setTheme('auto'); };
        if (this._themeMq.addEventListener) this._themeMq.addEventListener('change', onSystemThemeChange);
        else if (this._themeMq.addListener) this._themeMq.addListener(onSystemThemeChange);
      }
      try {
        if (window.parent && window.parent !== window && window.parent.document && window.MutationObserver) {
          const obs = new MutationObserver(() => { if (this.themeMode === 'auto') this.setTheme('auto'); });
          obs.observe(window.parent.document.documentElement, {attributes: true, attributeFilter: ['data-theme', 'class']});
        }
      } catch (e) {}
      const btnTheme = document.getElementById('btn-theme-toggle');
      if (btnTheme) {
        btnTheme.addEventListener('click', () => {
          const order = ['auto', 'light', 'dark'];
          const next = order[(order.indexOf(this.themeMode || 'auto') + 1) % order.length];
          this.setTheme(next);
          try { localStorage.setItem('enso-theme-mode', next); } catch (e) {}
        });
      }
    }

    resolveIsDark(mode = this.themeMode, systemOverride = this._systemDarkOverride) {
      if (mode === 'dark') return true;
      if (mode === 'light') return false;
      if (typeof systemOverride === 'boolean') return systemOverride;
      try {
        if (window.parent && window.parent !== window && window.parent.document) {
          const pTheme = window.parent.document.documentElement.getAttribute('data-theme');
          if (pTheme) return pTheme.toLowerCase() === 'dark';
        }
      } catch (e) {}
      return !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }

    setTheme(theme) {
      const mode = (theme === 'dark' || theme === 'light' || theme === 'auto') ? theme : 'auto';
      this.themeMode = mode;
      const isDark = this.resolveIsDark(mode);
      const root = document.documentElement, icon = document.getElementById('theme-icon'), btn = document.getElementById('btn-theme-toggle');
      root.setAttribute('data-theme-mode', mode);
      if (isDark) root.setAttribute('data-theme', 'dark'); else root.removeAttribute('data-theme');
      const iconMap = { auto: 'brightness_auto', light: 'light_mode', dark: 'dark_mode' };
      if (icon) icon.textContent = iconMap[mode] || 'brightness_auto';
      if (btn) {
        const label = mode === 'auto' ? `Theme: Auto (${isDark ? 'Dark' : 'Light'} system) · Click to switch` : `Theme: ${mode === 'dark' ? 'Dark' : 'Light'} · Click to switch`;
        btn.title = label; btn.setAttribute('aria-label', label);
      }
      const metaTheme = document.querySelector('meta[name="theme-color"]');
      if (metaTheme) metaTheme.setAttribute('content', isDark ? '#0e141b' : '#f0f4f9');
      if (this.visualizer) this.visualizer.updateThemeColors();
      if (window.aurora) window.aurora.setDark(isDark);
    }

    initVisualizer() {
      if (!window.SoundscapeVisualizer) return;
      this.visualizer = new window.SoundscapeVisualizer({ canvas: '#soundscape-canvas', envelopeCanvas: '#envelope-canvas', audioEngine: this.audioEngine, probEngine: this.probEngine, mode: 'orbits' });
    }

    renderPresetsAndSelects() {
      const data = window.ENO_DATA || {};
      const presetContainer = document.getElementById('preset-buttons-container');
      if (presetContainer && data.PRESETS) {
        presetContainer.innerHTML = '';
        Object.values(data.PRESETS).forEach((preset) => {
          const btn = document.createElement('button'), isActive = preset.id === this.activePresetId;
          const isUser = preset.custom || !(data.CIRCLE_OF_FIFTHS_ORDER || []).includes(preset.id);
          btn.type = 'button';
          btn.className = `m3-pill-tab badge-${preset.badgeHue || 'blue'}${isActive ? ' active' : ''}${isUser ? ' user-patch-pill' : ''}`;
          btn.dataset.presetId = preset.id; btn.setAttribute('role', 'tab');
          btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
          btn.title = preset.summary || preset.name;
          if (isUser) {
            btn.innerHTML = `<span class="user-patch-label">${preset.name}</span><span class="user-patch-delete-btn" role="button" tabindex="0" data-delete-preset-id="${preset.id}" aria-label="Delete ${preset.name}" title="Delete ${preset.name}"><span class="material-symbols-outlined user-patch-delete-icon">close</span></span>`;
            const delBtn = btn.querySelector('.user-patch-delete-btn');
            if (delBtn) {
              const handleDel = (e) => { e.stopPropagation(); e.preventDefault(); window.EnsoPatchRandomizer?.promptDeleteUserPatch(preset.id); };
              delBtn.addEventListener('click', handleDel);
              delBtn.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') handleDel(e); });
            }
          } else {
            btn.innerHTML = `<span>${preset.name}</span>`;
          }
          btn.addEventListener('click', () => { window.EnsoPatchesBanner?.dismiss(this); this.applyPreset(preset.id, true); });
          presetContainer.appendChild(btn);
        });
      }
      this.syncStartupBannerBounds?.();

      const selectScale = document.getElementById('select-scale');
      if (selectScale && data.SCALES) {
        selectScale.innerHTML = '';
        Object.values(data.SCALES).forEach((sc) => {
          const opt = document.createElement('option');
          opt.value = sc.id; opt.textContent = sc.name;
          selectScale.appendChild(opt);
        });
        if (this.probEngine?.scaleId)
          selectScale.value = this.probEngine.scaleId;
        selectScale.onchange = () => {
          this.probEngine.setScale(selectScale.value, true);
          this.renderDegreeWeights();
          this.updateMatrixScaleBadge();
          window.aurora?.setTrackVibe?.(
              this.activePresetId, this.probEngine.scaleId,
              this.probEngine.circadianMode);
        };
      }

      const selectCircadian = document.getElementById('select-circadian');
      if (selectCircadian && data.CIRCADIAN_MODES) {
        selectCircadian.innerHTML = '';
        Object.values(data.CIRCADIAN_MODES).forEach((cm) => {
          const opt = document.createElement('option');
          opt.value = cm.id; opt.textContent = cm.name;
          selectCircadian.appendChild(opt);
        });
        if (this.probEngine?.circadianMode)
          selectCircadian.value = this.probEngine.circadianMode;
        selectCircadian.onchange = () => {
          this.probEngine.setCircadianMode(selectCircadian.value);
          this.audioEngine.setCircadianMultipliers(this.probEngine.getEffectiveCircadian());
          window.aurora?.setTrackVibe?.(
              this.activePresetId, this.probEngine.scaleId,
              this.probEngine.circadianMode);
        };
      }
    }

    renderVoicesGrid() { window.EnsoVoiceCards?.renderVoicesGrid(this); }
    syncVoiceGainSlidersFromCrossfade() { window.EnsoVoiceCards?.syncVoiceGainSlidersFromCrossfade(this); }
    syncVoiceFilterSliders() { window.EnsoVoiceCards?.syncVoiceFilterSliders(this); }

    setGlobalVoiceGain(vId, val) {
      if (!this.globalVoiceGains) this.globalVoiceGains = {};
      this.globalVoiceGains[vId] = val;
      window.saveGlobalVoiceSettings?.();
    }

    setGlobalVoiceFilter(vId, cutoff, resonance) {
      if (!this.globalVoiceFilters) this.globalVoiceFilters = {};
      if (!this.globalVoiceFilters[vId]) this.globalVoiceFilters[vId] = {};
      if (typeof cutoff === 'number') this.globalVoiceFilters[vId].cutoff = cutoff;
      if (typeof resonance === 'number') this.globalVoiceFilters[vId].resonance = resonance;
      window.saveGlobalVoiceSettings?.();
    }

    setGlobalVoiceFx(vId, reverb, delay) {
      if (!this.globalVoiceFx) this.globalVoiceFx = {};
      if (!this.globalVoiceFx[vId]) this.globalVoiceFx[vId] = {};
      if (typeof reverb === 'number') this.globalVoiceFx[vId].reverb = reverb;
      if (typeof delay === 'number') this.globalVoiceFx[vId].delay = delay;
      window.saveGlobalVoiceSettings?.();
    }

    renderDegreeWeights() {
      const container = document.getElementById('degree-weights-container');
      if (!container) return;
      const scales = (window.ENO_DATA && window.ENO_DATA.SCALES) || {};
      const scale = scales[this.probEngine.scaleId] || scales.reflection_eb;
      if (!scale) return;

      container.innerHTML = '';
      scale.degreeNames.forEach((degName, idx) => {
        const w = this.probEngine.degreeWeights[idx] ?? 0.5;
        const col = document.createElement('div');
        col.className = 'degree-column';
        col.innerHTML = `
          <span class="badge badge-blue">${degName}</span>
          <span id="val-deg-weight-${idx}" class="control-value">${Math.round(w * 100)}%</span>
          <input type="range" class="degree-weight-slider" data-degree-idx="${idx}" aria-label="${degName} probability weight" min="0" max="1" step="0.01" value="${w}">
        `;
        container.appendChild(col);
      });

      container.querySelectorAll('.degree-weight-slider').forEach((slider) => {
        slider.addEventListener('input', () => {
          const idx = parseInt(slider.dataset.degreeIdx, 10);
          const val = parseFloat(slider.value);
          this.probEngine.setDegreeWeight(idx, val);
          const lbl = document.getElementById(`val-deg-weight-${idx}`);
          if (lbl) lbl.textContent = `${Math.round(val * 100)}%`;
        });
      });
    }

    renderResearchCards() {
      const container = document.getElementById('research-cards-container');
      if (!container) return;
      const data = window.ENO_DATA || {}, cards = data.RESEARCH_CARDS || [], presets = data.PRESETS || {};
      const query = (this.researchFilterText || '').trim().toLowerCase();
      container.innerHTML = '';
      cards.forEach((card) => {
        const preset = card.presetId ? presets[card.presetId] : null;
        const badgeLabel = (preset && preset.name) || card.badge || card.era || 'Generative';
        const badgeHue = (preset && preset.badgeHue) || card.badgeHue || 'blue';
        const searchable = `${card.title} ${card.subtitle || ''} ${card.era || ''} ${badgeLabel} ${card.badge || ''} ${(card.bullets || []).map((b) => `${b.lead} ${b.body}`).join(' ')}`.toLowerCase();
        if (query && !searchable.includes(query)) return;
        const el = document.createElement('article');
        el.className = 'research-card';
        const bulletsHtml = (card.bullets || []).map((b) => `<li><strong>${b.lead}:</strong> ${b.body}</li>`).join('');
        el.innerHTML = `<div class="card-header-row"><div class="card-title-cluster"><h3 class="card-title">${card.title}</h3></div><div class="badge-row"><span class="badge badge-${badgeHue}">${badgeLabel}</span>${card.presetId ? `<button type="button" class="btn-tonal research-try-preset-btn" data-preset-id="${card.presetId}">Load preset</button>` : ''}</div></div><ul class="research-bullet-list">${bulletsHtml}</ul>`;
        container.appendChild(el);
      });
      container.querySelectorAll('.research-try-preset-btn').forEach((btn) => {
        btn.addEventListener('click', () => { this.applyPreset(btn.dataset.presetId, true); this.switchTab('studio'); });
      });
    }

    bindTabsAndCanvasModes() {
      document.querySelectorAll('.m3-pill-tab[data-tab]').forEach((tab) => {
        tab.addEventListener('click', () => {
          this.switchTab(tab.dataset.tab);
        });
      });

      const checkHashTab = () => {
        const h = window.location.hash || '';
        const m = h.match(/tab=([a-z0-9_-]+)/i);
        if (m && m[1]) this.switchTab(m[1]);
      };
      checkHashTab();
      window.addEventListener('hashchange', checkHashTab);

      [
        ['data-canvas-mode', (m) => this.visualizer && this.visualizer.setMode(m)],
        ['data-filter-type', (f) => this.audioEngine.setFilterType(f)]
      ].forEach(([attr, fn]) => {
        document.querySelectorAll(`.m3-pill-tab[${attr}]`).forEach((btn) => {
          btn.addEventListener('click', () => {
            const val = btn.getAttribute(attr);
            document.querySelectorAll(`.m3-pill-tab[${attr}]`).forEach((b) => b.classList.toggle('active', b === btn));
            fn(val);
          });
        });
      });
    }

    switchTab(tabName) {
      document.querySelectorAll('.m3-pill-tab[data-tab]').forEach((tab) => {
        const isActive = tab.dataset.tab === tabName;
        tab.classList.toggle('active', isActive);
        tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
      });
      document.querySelectorAll('.tab-panel').forEach((panel) => {
        panel.classList.toggle('active', panel.id === `tab-${tabName}`);
      });
      const studioActions = document.getElementById('studio-top-actions');
      if (studioActions) {
        const isStudio = tabName === 'studio';
        studioActions.querySelectorAll(':scope > :not(#btn-theme-toggle):not(.settings-popover-anchor)').forEach((el) => {
          el.style.visibility = isStudio ? 'visible' : 'hidden';
          el.style.pointerEvents = isStudio ? '' : 'none';
        });
      }
      if (tabName === 'studio' && this.visualizer) {
        this.visualizer.resize();
      }
    }

    bindTransportAndTopActions() {
      const onClick = (id, fn) => { const el = document.getElementById(id); if (el) el.addEventListener('click', fn); };
      this.startupBannerBootVisible = document.body.classList.contains('startup-banner-active') && !!document.getElementById('startup-play-banner');
      onClick('btn-play-toggle', () => this.toggleTransport());
      onClick('btn-startup-play', (e) => { e.stopPropagation(); this.toggleTransport(true); });
      onClick('startup-play-banner', () => this.toggleTransport(true));
      onClick('btn-bloom-chord', () => this.triggerAmbientCluster());
      onClick('btn-master-filter-power', () => {
        this.setMasterFilterEnabled(!this.audioEngine.params.masterFilterEnabled);
        window.enoPatchStorage?.markDirty?.(true);
      });
      onClick('btn-deep-listening', () => {
        const shell = document.getElementById('app-root');
        if (!shell) return;
        const active = shell.classList.toggle('deep-listening-active');
        if (this.visualizer) { this.visualizer.setMode(active ? 'deep' : 'orbits'); setTimeout(() => this.visualizer.resize(), 50); }
        document.querySelectorAll('.m3-pill-tab[data-canvas-mode]').forEach((b) => b.classList.toggle('active', b.dataset.canvasMode === (active ? 'deep' : 'orbits')));
      });
      this.syncStartupBannerBounds(); window.EnsoPatchesBanner?.bind(this);
      window.addEventListener('resize', () => this.syncStartupBannerBounds());
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { this.syncStartupBannerBounds(); window.EnsoPatchesBanner?.syncBounds(this); });
    }

    setMasterFilterEnabled(enabled) {
      const on = Boolean(enabled);
      this.audioEngine.setMasterFilterEnabled(on);
      const btn = document.getElementById('btn-master-filter-power'), card = document.getElementById('master-filter-card');
      if (btn) {
        btn.classList.toggle('active', on);
        btn.setAttribute('aria-pressed', on ? 'true' : 'false');
        const label = on ? 'Master filter: On · Click to turn off' : 'Master filter: Off · Click to turn on';
        btn.title = label; btn.setAttribute('aria-label', label);
      }
      if (card) card.classList.toggle('is-filter-bypassed', !on);
      if (this.visualizer) this.visualizer.render();
    }

    showStartupBanner() {
      const banner = document.getElementById('startup-play-banner');
      document.body.classList.add('startup-banner-active');
      if (banner) { banner.classList.remove('is-dismissed'); banner.setAttribute('aria-hidden', 'false'); }
      this.syncStartupBannerBounds(); window.EnsoPatchesBanner?.resetForStartup(this);
    }

    dismissStartupBanner() {
      this.hasStartedOnce = true;
      const banner = document.getElementById('startup-play-banner');
      document.body.classList.remove('startup-banner-active');
      if (banner) { banner.classList.add('is-dismissed'); banner.setAttribute('aria-hidden', 'true'); }
    }

    syncStartupBannerBounds() {
      const banner = document.getElementById('startup-play-banner'), shell = document.getElementById('app-root');
      const topBar = document.querySelector('.top-app-bar'), presetCard = document.querySelector('.preset-strip-card');
      if (!banner || !shell || !topBar || !presetCard) return;
      const shellRect = shell.getBoundingClientRect(), topRect = topBar.getBoundingClientRect(), presetRect = presetCard.getBoundingClientRect();
      if (presetRect.width <= 0 || presetRect.bottom <= topRect.top) return;
      const topOffset = Math.max(8, Math.round(topRect.top - shellRect.top + 8)), bottomEdge = Math.round(presetRect.bottom - shellRect.top);
      banner.style.top = `${topOffset}px`;
      banner.style.left = `${Math.round(presetRect.left - shellRect.left)}px`;
      banner.style.right = 'auto';
      banner.style.width = `${Math.round(presetRect.width)}px`;
      banner.style.height = `${Math.max(96, bottomEdge - topOffset)}px`;
    }

    toggleTransport(forceState) {
      const next = typeof forceState === 'boolean' ? forceState : !this.probEngine.isRunning;
      this.audioEngine.setRunning(next);
      if (next) { this.dismissStartupBanner(); window.EnsoPatchesBanner?.showOnFirstPlay(this); this.probEngine.start(); this.triggerAmbientCluster(); } else { this.probEngine.stop(); }
      const btn = document.getElementById('btn-play-toggle'), icon = document.getElementById('play-icon'), lbl = document.getElementById('play-label');
      if (btn) { btn.classList.toggle('is-playing', next); btn.setAttribute('aria-pressed', next ? 'true' : 'false'); }
      if (icon) icon.textContent = next ? 'pause' : 'play_arrow';
      if (lbl) lbl.textContent = next ? 'Pause' : 'Play';
    }

    triggerAmbientCluster() {
      this.audioEngine.init();
      this.audioEngine.resume();
      ['drone', 'pad', 'piano', 'bell'].forEach((vId, idx) => setTimeout(() => this.probEngine.triggerVoiceManual(vId), idx * 140));
    }

    bindPhraseControls() {
      if (!this.phraseEngine) return;
      document.querySelectorAll('#piano-phrase-type-tabs [data-phrase-type]').forEach((btn) => {
        btn.addEventListener('click', () => this.phraseEngine.setPianoPhraseType(btn.dataset.phraseType));
      });
      const chordSelect = document.getElementById('select-chord-prog-voice');
      if (chordSelect) chordSelect.addEventListener('change', () => this.phraseEngine.setChordProgInstrument(chordSelect.value));
      const auditionBtn = document.getElementById('btn-audition-phrase');
      if (auditionBtn) {
        auditionBtn.addEventListener('click', () => {
          this.audioEngine.init();
          this.audioEngine.resume();
          this.phraseEngine.triggerPianoPhrase(null, null, { syncImmediate: true });
        });
      }
      if (typeof this.phraseEngine.bindUI === 'function') this.phraseEngine.bindUI();
    }

    bindGlobalMacroSliders() {
      const bindSlider = (id, labelId, formatFn, onChangeFn) => {
        const el = document.getElementById(id);
        const lbl = document.getElementById(labelId);
        if (!el) return;
        el.addEventListener('input', () => {
          const val = parseFloat(el.value);
          if (lbl) lbl.textContent = formatFn(val);
          onChangeFn(val);
          this.syncXYPuckFromParams();
        });
      };
      const pct = (v) => `${Math.round(v * 100)}%`;
      const sec2 = (v) => `${v.toFixed(2)} s`;
      [
        ['global-attack', 'val-global-attack', sec2, (v) => this.audioEngine.setGlobalAttack(v)],
        ['global-release', 'val-global-release', sec2, (v) => this.audioEngine.setGlobalRelease(v)],
        ['global-sustain', 'val-global-sustain', sec2, (v) => this.audioEngine.setGlobalSustain(v)],
        ['master-volume', 'val-master-volume', pct, (v) => this.audioEngine.setMasterVolume(v)],
        ['filter-cutoff', 'val-filter-cutoff', (v) => `${Math.round(v)} Hz`, (v) => this.audioEngine.setFilterCutoff(v)],
        ['filter-resonance', 'val-filter-resonance', (v) => v.toFixed(2), (v) => this.audioEngine.setFilterResonance(v)],
        ['filter-drift', 'val-filter-drift', pct, (v) => this.audioEngine.setFilterDrift(v)],
        ['reverb-mix', 'val-reverb-mix', pct, (v) => this.audioEngine.setReverbMix(v)],
        ['reverb-shimmer', 'val-reverb-shimmer', pct, (v) => this.audioEngine.setReverbShimmer(v)],
        ['reverb-decay', 'val-reverb-decay', (v) => `${v.toFixed(1)} s`, (v) => this.audioEngine.setReverbDecay(v)],
        ['reverb-damping', 'val-reverb-damping', (v) => `${Math.round(v)} Hz`, (v) => this.audioEngine.setReverbDamping(v)],
        ['delay-mix', 'val-delay-mix', pct, (v) => this.audioEngine.setDelayMix(v)],
        ['delay-time', 'val-delay-time', sec2, (v) => this.audioEngine.setDelayTime(v)],
        ['delay-feedback', 'val-delay-feedback', pct, (v) => this.audioEngine.setDelayFeedback(v)],
        ['delay-wow', 'val-delay-wow', pct, (v) => this.audioEngine.setDelayWow(v)],
        ['global-voice-count', 'val-voice-count', (v) => `${Math.round(v)} / 6`, (v) => { this.probEngine.setActiveVoiceCount(v); this.renderVoicesGrid(); this.updateHorizonBadge(); }],
        ['global-rotation-speed', 'val-rotation-speed', (v) => `${v.toFixed(2)}×`, (v) => { this.probEngine.setRotationSpeed(v); this.updateHorizonBadge(); }],
        ['global-probability', 'val-global-probability', pct, (v) => { this.probEngine.setGlobalProbability(v, true); this.renderVoicesGrid(); }],
        ['prob-density-bias', 'val-density-bias', (v) => `${v >= 0 ? '+' : ''}${Math.round(v * 100)}%`, (v) => this.probEngine.setDensityBias(v)],
        ['prob-time-stretch', 'val-time-stretch', (v) => `${v.toFixed(2)}×`, (v) => { this.probEngine.setTimeStretch(v); this.updateHorizonBadge(); }],
        ['prob-mutation-rate', 'val-mutation-rate', pct, (v) => this.probEngine.setMutationRate(v)]
      ].forEach(([id, lid, fmt, fn]) => bindSlider(id, lid, fmt, fn));
    }

    bindXYPerformancePad() {
      const pad = document.getElementById('xy-pad');
      const selectTarget = document.getElementById('select-xy-target');
      if (selectTarget) {
        selectTarget.addEventListener('change', () => {
          this.xyTarget = selectTarget.value;
          this.syncXYPuckFromParams();
        });
      }
      if (!pad) return;
      let dragging = false;
      const updateFromPointer = (e) => {
        const rect = pad.getBoundingClientRect();
        const normX = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        const normY = Math.max(0, Math.min(1, 1.0 - (e.clientY - rect.top) / rect.height));
        if (this.xyTarget === 'filter') {
          this.setSliderAndDispatch('filter-cutoff', Math.round(40 * Math.pow(18000 / 40, normX)));
          this.setSliderAndDispatch('filter-resonance', Number((0.1 + normY * 17.9).toFixed(2)));
        } else if (this.xyTarget === 'envelope') {
          this.setSliderAndDispatch('global-attack', Number((0.05 + normX * 11.95).toFixed(2)));
          this.setSliderAndDispatch('global-release', Number((0.20 + normY * 19.80).toFixed(2)));
        } else if (this.xyTarget === 'space') {
          this.setSliderAndDispatch('reverb-shimmer', Number(normX.toFixed(2)));
          this.setSliderAndDispatch('delay-feedback', Number((normY * 0.92).toFixed(2)));
        }
        this.syncXYPuckFromParams();
      };
      pad.addEventListener('pointerdown', (e) => {
        dragging = true;
        pad.setPointerCapture?.(e.pointerId);
        updateFromPointer(e);
      });
      pad.addEventListener('pointermove', (e) => { if (dragging) updateFromPointer(e); });
      const endDrag = () => { dragging = false; };
      pad.addEventListener('pointerup', endDrag);
      pad.addEventListener('pointercancel', endDrag);
    }

    syncXYPuckFromParams() {
      const puck = document.getElementById('xy-puck');
      if (!puck) return;
      const p = this.audioEngine.params;
      let normX = 0.5, normY = 0.5;
      if (this.xyTarget === 'filter') {
        normX = Math.log(Math.max(40, p.cutoff) / 40) / Math.log(18000 / 40);
        normY = (p.resonance - 0.1) / 17.9;
      } else if (this.xyTarget === 'envelope') {
        normX = (p.attack - 0.05) / 11.95;
        normY = (p.release - 0.20) / 19.80;
      } else if (this.xyTarget === 'space') {
        normX = p.reverbShimmer;
        normY = p.delayFeedback / 0.92;
      }
      puck.style.left = `${Math.max(0.04, Math.min(0.96, normX)) * 100}%`;
      puck.style.top = `${(1.0 - Math.max(0.04, Math.min(0.96, normY))) * 100}%`;
    }

    setSliderAndDispatch(id, value) {
      const el = document.getElementById(id);
      if (el) {
        el.value = value;
        el.dispatchEvent(new Event('input', {bubbles: true}));
      }
    }

    bindInlineClearInputs() {
      const bindClearable = (inputId, clearBtnId, onUpdate) => {
        const input = document.getElementById(inputId),
              btn = document.getElementById(clearBtnId);
        if (!input || !btn) return;
        const syncVisibility = () => { btn.style.display = input.value.length > 0 ? 'inline-flex' : 'none'; };
        input.addEventListener('input', () => { syncVisibility(); onUpdate(input.value); });
        btn.addEventListener('mousedown', (e) => e.preventDefault());
        btn.addEventListener('click', () => {
          input.value = '';
          syncVisibility();
          onUpdate('');
          input.focus();
        });
        syncVisibility();
      };
      bindClearable('filter-log-input', 'btn-clear-log-filter', (val) => { this.logFilterText = val; this.renderEventLog(); });
      bindClearable('search-research-input', 'btn-clear-research', (val) => { this.researchFilterText = val; this.renderResearchCards(); });
    }

    applyPreset(presetId, triggerPreview = false) {
      const preset = ((window.ENO_DATA && window.ENO_DATA.PRESETS) || {})[presetId];
      if (!preset) return;
      if (this.audioEngine?.setTrackStyle) this.audioEngine.setTrackStyle(presetId);
      this.activePresetId = presetId;
      document.querySelectorAll('#preset-buttons-container [data-preset-id]').forEach((btn) => {
        const isSelected = btn.dataset.presetId === presetId;
        btn.classList.toggle('active', isSelected); btn.setAttribute('aria-selected', isSelected ? 'true' : 'false');
      });
      if (preset.scale) {
        this.probEngine.setScale(preset.scale, true);
        const selScale = document.getElementById('select-scale'); if (selScale) selScale.value = preset.scale;
      }
      if (preset.circadian) {
        this.probEngine.setCircadianMode(preset.circadian);
        const selCirc = document.getElementById('select-circadian'); if (selCirc) selCirc.value = preset.circadian;
      }
      const g = preset.global || {};
      const sliderMap = { attack: 'global-attack', release: 'global-release', sustain: 'global-sustain', masterVolume: 'master-volume', cutoff: 'filter-cutoff', resonance: 'filter-resonance', filterDrift: 'filter-drift', reverbMix: 'reverb-mix', reverbShimmer: 'reverb-shimmer', reverbDecay: 'reverb-decay', reverbDamping: 'reverb-damping', delayMix: 'delay-mix', delayTime: 'delay-time', delayFeedback: 'delay-feedback', delayWow: 'delay-wow' };
      Object.entries(sliderMap).forEach(([k, id]) => { if (g[k] !== undefined) this.setSliderAndDispatch(id, g[k]); });
      if (g.envelopeMode) this.audioEngine.setEnvelopeMode(g.envelopeMode);
      if (g.filterType) {
        this.audioEngine.setFilterType(g.filterType);
        document.querySelectorAll('.m3-pill-tab[data-filter-type]').forEach((b) => b.classList.toggle('active', b.dataset.filterType === g.filterType));
      }
      this.setMasterFilterEnabled(Boolean(g.masterFilterEnabled));
      const pr = preset.probability || {};
      if (Array.isArray(pr.voiceOrder)) this.probEngine.voiceOrder = [...pr.voiceOrder];
      if (preset.voices) {
        Object.entries(preset.voices).forEach(([vId, vCfg]) => {
          ['prob', 'cycle', 'gain', 'release', 'octave', 'octaveShiftProb', 'noteOctaveShiftProb', 'chordOctaveShiftProb', 'muted']
              .forEach((k) => { if (vCfg[k] !== undefined) this.probEngine.setVoiceParam(vId, k, vCfg[k]); });
          if (vCfg.octave === undefined) {
            const vObj = this.probEngine.voices.find((v) => v.id === vId);
            if (vObj) this.probEngine.setVoiceParam(vId, 'octave', vCfg.octaveOffset ?? vObj.defaultOctave ?? 0);
          }
          if (vCfg.release !== undefined) this.audioEngine.setVoiceRelease(vId, vCfg.release);
        });
      }
      if (this.globalVoiceGains) {
        Object.entries(this.globalVoiceGains).forEach(([vId, val]) => { this.probEngine.setVoiceParam(vId, 'gain', val); this.audioEngine.setVoiceVolume(vId, val); });
      }
      if (this.globalVoiceFilters) {
        Object.entries(this.globalVoiceFilters).forEach(([vId, flt]) => {
          if (typeof flt.cutoff === 'number') { this.probEngine.setVoiceParam(vId, 'cutoff', flt.cutoff); this.audioEngine.setVoiceFilterCutoff(vId, flt.cutoff); }
          if (typeof flt.resonance === 'number') { this.probEngine.setVoiceParam(vId, 'resonance', flt.resonance); this.audioEngine.setVoiceFilterResonance(vId, flt.resonance); }
        });
      }
      if (this.globalVoiceFx) {
        Object.entries(this.globalVoiceFx).forEach(([vId, fx]) => {
          if (typeof fx.reverb === 'number') { this.probEngine.setVoiceParam(vId, 'reverb', fx.reverb); this.audioEngine.setVoiceReverbSend?.(vId, fx.reverb); }
          if (typeof fx.delay === 'number') { this.probEngine.setVoiceParam(vId, 'delay', fx.delay); this.audioEngine.setVoiceDelaySend?.(vId, fx.delay); }
        });
      }
      if (pr.activeVoiceCount !== undefined) {
        this.probEngine.setActiveVoiceCount(pr.activeVoiceCount, pr.voiceOrder);
        const vcEl = document.getElementById('global-voice-count'), vcLbl = document.getElementById('val-voice-count');
        if (vcEl) vcEl.value = pr.activeVoiceCount;
        if (vcLbl) vcLbl.textContent = `${pr.activeVoiceCount} / 6`;
      }
      if (pr.timeStretch !== undefined) this.setSliderAndDispatch('prob-time-stretch', pr.timeStretch);
      if (pr.rotationSpeed !== undefined) this.setSliderAndDispatch('global-rotation-speed', pr.rotationSpeed);
      if (pr.globalProb !== undefined) {
        this.probEngine.globalProbability = pr.globalProb;
        const gpEl = document.getElementById('global-probability'), gpLbl = document.getElementById('val-global-probability');
        if (gpEl) gpEl.value = pr.globalProb;
        if (gpLbl) gpLbl.textContent = `${Math.round(pr.globalProb * 100)}%`;
      }
      if (pr.densityBias !== undefined) this.setSliderAndDispatch('prob-density-bias', pr.densityBias);
      if (pr.mutationRate !== undefined) this.setSliderAndDispatch('prob-mutation-rate', pr.mutationRate);
      if (Array.isArray(pr.degreeWeights)) pr.degreeWeights.forEach((w, idx) => this.probEngine.setDegreeWeight(idx, w));
      if (this.phraseEngine) {
        this.phraseEngine.setPreset(presetId);
        if (preset.phraseParams) {
          Object.assign(this.phraseEngine, preset.phraseParams);
          this.phraseEngine.syncUI();
        }
      }
      const xfEl = document.getElementById('piano-other-crossfade');
      const xf = typeof this.globalVoiceBalance === 'number' ?
          this.globalVoiceBalance :
          (xfEl && xfEl.value !== '' ?
               parseFloat(xfEl.value) :
               (this.audioEngine.params.pianoCrossfade ?? -0.62));
      this.globalVoiceBalance = xf;
      const xfSt = this.audioEngine.setPianoCrossfade ?
          this.audioEngine.setPianoCrossfade(xf) :
          {pianoMultiplier: 1, otherMultiplier: 1};
      if (this.probEngine.applyCrossfadeToVoices)
        this.probEngine.applyCrossfadeToVoices(
            xfSt.pianoMultiplier, xfSt.otherMultiplier);
      this.renderVoicesGrid();
      this.setSliderAndDispatch('piano-other-crossfade', xf);
      this.syncVoiceGainSlidersFromCrossfade();
      this.syncVoiceFilterSliders();
      this.renderDegreeWeights();
      this.updateMatrixScaleBadge();
      this.updateHorizonBadge();
      this.syncXYPuckFromParams();
      if (window.aurora) {
        window.aurora.setTrackVibe ?
            window.aurora.setTrackVibe(
                presetId, preset.scale, preset.circadian) :
            window.aurora.setPalette(preset.auroraPalette || presetId);
        if (triggerPreview) window.aurora.pulse(0.65);
      }
      this.autoCycler?.onManualPresetChange?.(presetId);
      window.EnsoPwaMedia?.updateMediaSessionMetadata?.(presetId);
      if (triggerPreview && this.probEngine.isRunning) this.triggerAmbientCluster();
    }

    updateHorizonBadge() {
      const badge = document.getElementById('horizon-badge');
      if (badge && this.probEngine) {
        const txt = this.probEngine.computeNonRepeatingHorizon();
        if (typeof window !== 'undefined' && window.EnsoMotion) {
          window.EnsoMotion.setBadgeText(badge, txt);
        } else {
          badge.textContent = txt;
        }
      }
    }

    updateMatrixScaleBadge() {
      const badge = document.getElementById('matrix-scale-badge'), sc = ((window.ENO_DATA && window.ENO_DATA.SCALES) || {})[this.probEngine.scaleId];
      if (badge && sc) {
        if (typeof window !== 'undefined' && window.EnsoMotion) {
          window.EnsoMotion.setBadgeText(badge, sc.name);
        } else {
          badge.textContent = sc.name;
        }
      }
    }

    handleProbabilityEvent(event) {
      if (typeof document !== 'undefined' && document.hidden) return;
      if (this.visualizer && event) this.visualizer.addRipple({ type: event.outcome, voiceId: event.voiceId, note: event.noteName, midi: event.midi });
      if (event?.outcome === 'BLOOM') {
        window.aurora?.pulse(0.85, { voiceId: event.voiceId, x: event.normX, y: event.normY !== undefined ? (1 - event.normY) : undefined });
      } else if (event?.outcome === 'PASS') {
        window.aurora?.pulse(0.55, {voiceId: event.voiceId});
      }
      const noteBadge = document.getElementById(`voice-note-${event.voiceId}`);
      if (noteBadge) {
        const txt = event.outcome === 'REST' ? 'Rest' : `${event.noteName}`;
        if (window.EnsoMotion) window.EnsoMotion.setBadgeText(noteBadge, txt);
        else noteBadge.textContent = txt;
      }
      const motifEl = document.getElementById('motif-memory-display');
      if (motifEl) {
        const scales = (window.ENO_DATA && window.ENO_DATA.SCALES) || {}, sc = scales[this.probEngine.scaleId] || scales.reflection_eb;
        const names = this.probEngine.noteHistory.slice(0, 5).map((idx) => (sc && sc.degreeNames[idx] ? sc.degreeNames[idx] : `Deg ${idx + 1}`));
        motifEl.textContent = names.length ? names.join(' → ') : '—';
      }
      this.renderEventLog();
    }

    renderEventLog() {
      const container = document.getElementById('event-log-container');
      if (!container) return;
      const filter = (this.logFilterText || '').trim().toLowerCase();
      const events = this.probEngine.eventLog.filter((ev) => {
        if (!filter) return true;
        return `${ev.voiceName} ${ev.noteName} ${ev.outcome}`.toLowerCase().includes(filter);
      }).slice(0, 18);

      container.innerHTML = '';
      if (events.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'event-log-item';
        empty.innerHTML = '<span>Start the generative engine or click Bloom to log probability gate rolls.</span>';
        container.appendChild(empty);
        return;
      }

      events.forEach((ev) => {
        const row = document.createElement('div');
        row.className = 'event-log-item';
        const outcomeHue = ev.outcome === 'REST' ? 'yellow' : (ev.outcome === 'BLOOM' ? 'purple' : 'green');
        row.innerHTML = `<div class="badge-row"><span class="badge badge-${ev.badgeHue || 'blue'}">${ev.voiceName}</span><span class="badge badge-${outcomeHue}">${ev.outcome}</span><strong>${ev.noteName || '—'}</strong></div><span class="control-value">Roll ${Math.round((ev.roll || 0) * 100)}% ≤ Gate ${Math.round((ev.effectiveProb || 0) * 100)}%</span>`;
        container.appendChild(row);
      });
    }

    startSchedulerLoop() {
      document.addEventListener('visibilitychange', () => {
        this.lastTickTime = performance.now();
        if (!document.hidden) this.renderEventLog();
      });
      const step = (now) => {
        const dt = Math.min(0.25, Math.max(0.001, (now - this.lastTickTime) / 1000));
        this.lastTickTime = now;
        if (!document.hidden) {
          this.probEngine.tick(dt);
          this.autoCycler?.tick?.(dt);
          this.probEngine.voices.forEach((v) => {
            const bar = document.getElementById(`voice-phase-${v.id}`);
            if (bar) bar.style.width = `${Math.round(v.phase * 100)}%`;
          });
          const timerLbl = document.getElementById('session-timer-label');
          if (timerLbl) {
            const sec = Math.floor(this.probEngine.stats.listenedSeconds);
            timerLbl.textContent = `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;
          }
        }
        this.loopRafId = requestAnimationFrame(step);
      };
      this.loopRafId = requestAnimationFrame(step);
      this.applyUrlState();
    }

    applyUrlState() {
      if (typeof window !== 'undefined' && window.EnsoUrlState) {
        window.EnsoUrlState.applyUrlState(this);
      }
    }
  }

  const initApp = () => { if (!window.enoApp && typeof document !== 'undefined') window.enoApp = new EnoSoundscapeApp(); };
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initApp);
    else initApp();
  }
})();
