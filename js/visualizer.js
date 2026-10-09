/**
 * Brian Eno Generative Soundscape - Canvas Visualizer
 * Synchronized Orbits / Deep Listening generative fields and real-time ADSR macro canvas.
 */
'use strict';

(function() {
  const VOICE_IDS = ['pad', 'piano', 'bell', 'choir', 'tape', 'drone'];

  class SoundscapeVisualizer {
    constructor(options = {}) {
      const q = (sel, fb) => typeof sel === 'string' ? document.querySelector(sel) : (sel || document.querySelector(fb));
      this.primaryCanvas = q(options.canvas, '#soundscape-canvas');
      this.envelopeCanvas = q(options.envelopeCanvas, '#envelope-canvas');
      this.audioEngine = options.audioEngine || window.audioEngine || null;
      this.probEngine = options.probEngine || window.probEngine || null;
      this.mode = options.mode || 'orbits';
      this.primaryCtx = this.primaryCanvas?.getContext('2d') || null;
      this.envelopeCtx = this.envelopeCanvas?.getContext('2d') || null;
      this.ripples = [];
      this.running = false;
      this.rafId = null;

      this.updateThemeColors();
      this.setupInteractivity();
      this.setupModeControls();
      this.resize = this.resize.bind(this);
      this.animate = this.animate.bind(this);

      window.addEventListener('resize', this.resize);
      if (window.ResizeObserver) {
        this.resizeObserver = new ResizeObserver(() => this.resize());
        if (this.primaryCanvas?.parentElement) this.resizeObserver.observe(this.primaryCanvas.parentElement);
        if (this.envelopeCanvas?.parentElement) this.resizeObserver.observe(this.envelopeCanvas.parentElement);
      }
      this.resize();
      this.start();
      this.bloomHintDelayMs = 20000;
      this.bloomHintTimerId = setTimeout(() => {
        this.hideBloomHint(false);
      }, this.bloomHintDelayMs);
      if ((window.location.hash || '').includes('hideHint=1')) {
        this.hideBloomHint(true);
      }
    }

    hideBloomHint(immediate = false) {
      const pill = document.getElementById('canvas-bloom-hint-pill')
        || document.getElementById('canvas-status-text')?.closest('.canvas-hud-pill');
      if (pill) {
        if (immediate) pill.style.transition = 'none';
        pill.classList.add('is-hidden');
        pill.setAttribute('aria-hidden', 'true');
      }
    }

    updateThemeColors() {
      const s = getComputedStyle(document.documentElement);
      const get = (p, d) => s.getPropertyValue(p).trim() || d;
      this.colors = {
        primary: get('--md-sys-color-primary', '#0E57D0'),
        lightBlue: get('--md-sys-color-inverse-primary', '#A9C7FB'),
        lightBlueFill: get('--md-sys-color-primary-container', '#D3E3FD'),
        onPrimary: get('--md-sys-color-on-primary', '#FFFFFF'),
        surface: get('--md-sys-color-surface', '#131314'),
        onSurface: get('--md-sys-color-on-surface', '#E3E3E3'),
        onSurfaceVar: get('--md-sys-color-on-surface-variant', '#8E918F'),
        outline: get('--md-sys-color-outline', '#747775'),
        outlineVariant:
            get('--md-sys-color-outline-variant', 'rgba(128, 128, 128, 0.22)'),
        surfaceHighest:
            get('--md-sys-color-surface-container-highest', '#353637'),
        surfaceContainer: get('--md-sys-color-surface-container', '#202021'),
        voices: {
          pad: get('--md-sys-color-on-blue-tonal', '#60A5FA'),
          piano: get('--md-sys-color-on-teal-tonal', '#2DD4BF'),
          bell: get('--md-sys-color-on-purple-tonal', '#C084FC'),
          choir: get('--md-sys-color-on-green-tonal', '#4ADE80'),
          tape: get('--md-sys-color-on-orange-tonal', '#FB923C'),
          drone: get('--md-sys-color-on-yellow-tonal', '#FACC15')
        }
      };
    }

    getVoiceColor(voiceId) {
      return this.colors.voices[voiceId] || this.colors.primary;
    }

    setMode(mode) {
      if (mode === 'orbits' || mode === 'deep') this.mode = mode;
    }

    setupModeControls() {
      document.querySelectorAll('[data-visual-mode]').forEach(btn => {
        btn.addEventListener('click', () => {
          this.setMode(btn.dataset.visualMode);
          document.querySelectorAll('[data-visual-mode]').forEach(b => b.classList.toggle('active', b === btn));
        });
      });
    }

    setupInteractivity() {
      if (!this.primaryCanvas) return;
      let isDragging = false, lastTrigger = 0;
      const handlePointer = (e) => {
        const now = performance.now();
        if (now - lastTrigger < 60) return;
        lastTrigger = now;
        const rect = this.primaryCanvas.getBoundingClientRect();
        const normX = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        const normY = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
        const probEng = this.probEngine || window.probEngine;
        if (probEng?.triggerCanvasBloom) probEng.triggerCanvasBloom(normX, normY);
        const scaleNotes = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'G', 'Ab', 'Bb'];
        const note = `${scaleNotes[Math.floor(normX * 12) % scaleNotes.length]}${3 + Math.floor((1 - normY) * 3)}`;
        const vId = VOICE_IDS[Math.floor(normY * VOICE_IDS.length)] || 'pad';
        this.addRipple({ type: 'BLOOM', x: e.clientX - rect.left, y: e.clientY - rect.top, note, voiceId: vId });
      };

      this.primaryCanvas.addEventListener('pointerdown', (e) => {
        isDragging = true;
        this.primaryCanvas.setPointerCapture?.(e.pointerId);
        handlePointer(e);
      });
      this.primaryCanvas.addEventListener('pointermove', (e) => { if (isDragging) handlePointer(e); });
      const stopDrag = () => { isDragging = false; };
      this.primaryCanvas.addEventListener('pointerup', stopDrag);
      this.primaryCanvas.addEventListener('pointercancel', stopDrag);
    }

    addRipple(event = {}) {
      const type = (event.type || 'PASS').toUpperCase();
      const voiceId = event.voiceId || 'pad';
      const vIndex = Math.max(0, VOICE_IDS.indexOf(voiceId));
      const note = event.note || (event.midi && window.ENO_DATA?.midiToNoteName ? window.ENO_DATA.midiToNoteName(event.midi) : '');
      const audio = this.audioEngine || window.audioEngine;
      const isPiano = voiceId === 'piano';
      const attack = isPiano ? 0 : Math.max(0.4, audio?.params?.attack ?? 4.0);
      const release = Math.max(0.8, audio?.params?.release ?? 8.0);
      const duration = (type === 'REST' ? 1.4 : Math.min(16.0, attack * 0.4 + release * 0.8)) * 1000;

      let x = event.x, y = event.y;
      if (x === undefined || y === undefined) {
        const rect = this.primaryCanvas ? this.primaryCanvas.getBoundingClientRect() : { width: 600, height: 400 };
        const cx = rect.width / 2, cy = rect.height / 2;
        const radius = Math.min(cx, cy) * (0.22 + (vIndex / 5) * 0.64);
        const probEng = this.probEngine || window.probEngine;
        const phase = event.phase ?? probEng?.voices?.[voiceId]?.phase ?? 0;
        const angle = phase * Math.PI * 2 - Math.PI / 2;
        x = cx + Math.cos(angle) * radius;
        y = cy + Math.sin(angle) * radius;
      }

      this.ripples.push({
        x, y, type, voiceId, note,
        color: this.getVoiceColor(voiceId),
        birth: performance.now(),
        duration,
        maxR: type === 'REST' ? 26 : 75 + Math.random() * 50,
        attackRatio: isPiano ? 0.02 : Math.min(0.45, attack / (attack + release))
      });
    }

    resize() {
      const dpr = window.devicePixelRatio || 1;
      this.updateThemeColors();
      const waveCanvases =
          Array.from(document.querySelectorAll('.voice-waveform-canvas'));
      [this.primaryCanvas, this.envelopeCanvas, ...waveCanvases].forEach(
          canvas => {
            if (!canvas) return;
            const rect = canvas.getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0) return;
            canvas.width = Math.round(rect.width * dpr);
            canvas.height = Math.round(rect.height * dpr);
            const ctx = canvas.getContext('2d');
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
          });
      this.render();
    }

    start() {
      if (this.running) return;
      this.running = true;
      this.rafId = requestAnimationFrame(this.animate);
    }

    stop() {
      this.running = false;
      if (this.rafId) cancelAnimationFrame(this.rafId);
    }

    render(now = performance.now()) {
      const rect = this.primaryCanvas?.getBoundingClientRect();
      if (rect && rect.width > 0 && rect.height > 0) this.renderPrimary(rect.width, rect.height, now);
      const envRect = this.envelopeCanvas?.getBoundingClientRect();
      if (envRect && envRect.width > 0 && envRect.height > 0) this.renderEnvelope(envRect.width, envRect.height, now);
      this.renderVoiceWaveforms(now);
    }

    animate(now) {
      if (!this.running) return;
      this.render(now);
      this.rafId = requestAnimationFrame(this.animate);
    }

    renderPrimary(w, h, now) {
      const ctx = this.primaryCtx;
      if (!ctx) return;
      ctx.clearRect(0, 0, w, h);
      if (this.mode === 'orbits') this.drawOrbits(ctx, w, h, now);
      else this.drawDeepListening(ctx, w, h, now);
      this.drawRipples(ctx, now);
      this.drawSpectrumAndFilter(ctx, w, h);
    }

    getVoiceState(id) {
      const probEng = this.probEngine || window.probEngine;
      if (!probEng) return {};
      if (probEng.voiceMap && probEng.voiceMap[id]) return probEng.voiceMap[id];
      if (Array.isArray(probEng.voices)) return probEng.voices.find(v => v.id === id) || {};
      return (probEng.voices && probEng.voices[id]) || {};
    }

    drawOrbits(ctx, w, h, now) {
      const cx = w / 2, cy = Math.max(24, h / 2 - 14);
      const minR = Math.max(8, Math.min(cx, cy) * 0.22), maxR = Math.max(minR + 12, Math.min(cx, cy) * 0.86);

      VOICE_IDS.forEach((id, idx) => {
        const radius = Math.max(4, minR + (idx / 5) * (maxR - minR));
        const color = this.getVoiceColor(id);
        const voiceState = this.getVoiceState(id);
        const phase = voiceState.phase ?? ((now * 0.00008 * (idx + 1)) % 1);
        const prob = Math.max(0.15, voiceState.prob ?? 0.6);
        const isMuted = voiceState.muted ?? false;

        ctx.save();
        ctx.beginPath(); ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        if (isMuted) ctx.setLineDash([3, 6]);
        ctx.strokeStyle = isMuted ? 'rgba(128,128,128,0.18)' : this.colors.outlineVariant;
        ctx.lineWidth = 1; ctx.stroke();
        ctx.setLineDash([]);

        if (!isMuted) {
          const angle = phase * Math.PI * 2 - Math.PI / 2;
          const nx = cx + Math.cos(angle) * radius, ny = cy + Math.sin(angle) * radius;
          const nodeRadius = Math.max(2, 3.5 + prob * 5.0);

          ctx.beginPath(); ctx.arc(cx, cy, radius, angle - 0.35, angle);
          ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.globalAlpha = 0.28; ctx.stroke();

          ctx.beginPath(); ctx.arc(nx, ny, nodeRadius + 3, 0, Math.PI * 2);
          ctx.fillStyle = color; ctx.globalAlpha = 0.22; ctx.fill();

          ctx.beginPath(); ctx.arc(nx, ny, nodeRadius, 0, Math.PI * 2);
          ctx.fillStyle = color; ctx.globalAlpha = 1.0; ctx.fill();
        }
        ctx.restore();
      });
    }

    drawDeepListening(ctx, w, h, now) {
      const t = now * 0.0003;
      ctx.save();
      const driftPoints = [
        { x: w * 0.28 + Math.sin(t * 0.7) * (w * 0.15), y: h * 0.32 + Math.cos(t * 0.9) * (h * 0.12), color: this.getVoiceColor('pad') },
        { x: w * 0.72 + Math.cos(t * 0.8) * (w * 0.16), y: h * 0.45 + Math.sin(t * 0.6) * (h * 0.14), color: this.getVoiceColor('bell') },
        { x: w * 0.50 + Math.sin(t * 1.1) * (w * 0.18), y: h * 0.68 + Math.cos(t * 0.5) * (h * 0.10), color: this.getVoiceColor('drone') }
      ];

      driftPoints.forEach(p => {
        const rad = Math.max(10, Math.min(w, h) * 0.55);
        const grad = ctx.createRadialGradient(p.x, p.y, 4, p.x, p.y, rad);
        grad.addColorStop(0, p.color); grad.addColorStop(1, 'transparent');
        ctx.globalAlpha = 0.12; ctx.fillStyle = grad;
        ctx.beginPath(); ctx.arc(p.x, p.y, rad, 0, Math.PI * 2); ctx.fill();
      });

      const nodes = VOICE_IDS.map((id, i) => {
        const state = this.getVoiceState(id);
        const p = state.phase ?? ((now * 0.00007 * (i + 1)) % 1);
        const ang = p * Math.PI * 2 + i * 1.04;
        const dist = Math.min(w, h) * (0.2 + (i % 3) * 0.12);
        return { id, x: w / 2 + Math.cos(ang) * dist, y: h / 2 - 16 + Math.sin(ang) * dist, color: this.getVoiceColor(id), prob: state.prob ?? 0.6 };
      });

      ctx.lineWidth = 0.8; ctx.strokeStyle = this.colors.outlineVariant;
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dist = Math.hypot(nodes[i].x - nodes[j].x, nodes[i].y - nodes[j].y);
          if (dist < Math.min(w, h) * 0.42) {
            ctx.globalAlpha = (1 - dist / (Math.min(w, h) * 0.42)) * 0.18;
            ctx.beginPath(); ctx.moveTo(nodes[i].x, nodes[i].y); ctx.lineTo(nodes[j].x, nodes[j].y); ctx.stroke();
          }
        }
      }

      nodes.forEach(n => {
        ctx.globalAlpha = 0.85; ctx.fillStyle = n.color;
        ctx.beginPath(); ctx.arc(n.x, n.y, Math.max(2, 3 + n.prob * 4), 0, Math.PI * 2); ctx.fill();
      });
      ctx.restore();
    }

    drawRipples(ctx, now) {
      this.ripples = this.ripples.filter(r => (now - r.birth) < r.duration);
      ctx.save();
      for (const r of this.ripples) {
        const elapsed = Math.max(120, now - r.birth);
        const progress = Math.min(1.0, Math.max(0.05, elapsed / Math.max(100, r.duration)));
        const radius = Math.max(3, progress * Math.max(20, r.maxR));
        const alpha = progress < r.attackRatio ? (progress / Math.max(0.01, r.attackRatio)) : Math.max(0, 1 - (progress - r.attackRatio) / Math.max(0.01, 1 - r.attackRatio));

        if (r.type === 'REST') {
          ctx.beginPath(); ctx.arc(r.x, r.y, 8 + progress * 16, 0, Math.PI * 2);
          ctx.setLineDash([4, 4]); ctx.strokeStyle = this.colors.onSurfaceVar; ctx.lineWidth = 1;
          ctx.globalAlpha = alpha * 0.45; ctx.stroke(); ctx.setLineDash([]);
        } else {
          ctx.beginPath(); ctx.arc(r.x, r.y, radius, 0, Math.PI * 2);
          ctx.strokeStyle = r.color; ctx.lineWidth = 1.8 * (1 - progress * 0.6);
          ctx.globalAlpha = alpha * 0.8; ctx.stroke();

          const grad = ctx.createRadialGradient(r.x, r.y, 0, r.x, r.y, radius);
          grad.addColorStop(0, r.color); grad.addColorStop(1, 'transparent');
          ctx.fillStyle = grad; ctx.globalAlpha = alpha * 0.22; ctx.fill();

          if (r.note && progress < 0.75) {
            ctx.font = '500 11px Inter, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillStyle = this.colors.onSurface; ctx.globalAlpha = alpha * 0.95;
            ctx.fillText(r.note, r.x, r.y - radius - 8);
          }
        }
      }
      ctx.restore();
    }

    drawSpectrumAndFilter(ctx, w, h) {
      const audio = this.audioEngine || window.audioEngine;
      const overlayH = Math.min(65, h * 0.20), topY = h - overlayH;
      ctx.save();
      ctx.fillStyle = this.colors.surface; ctx.globalAlpha = 0.45;
      ctx.fillRect(0, topY, w, overlayH); ctx.globalAlpha = 1.0;
      ctx.strokeStyle = this.colors.outlineVariant; ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.moveTo(0, topY); ctx.lineTo(w, topY); ctx.stroke();

      const spec = audio && typeof audio.getSpectrumData === 'function' ? audio.getSpectrumData() : null;
      if (spec && spec.length > 0) {
        ctx.fillStyle = this.colors.primary; ctx.globalAlpha = 0.22;
        const bins = Math.min(w / 4, spec.length), barW = w / bins;
        for (let i = 0; i < bins; i++) {
          const val = spec[Math.floor(i * (spec.length / bins))] / 255;
          ctx.fillRect(i * barW, h - val * (overlayH - 12), barW - 1, val * (overlayH - 12));
        }
        ctx.globalAlpha = 1.0;
      }

      const cutoff = audio?.params?.cutoff ?? 2000, resonance = audio?.params?.resonance ?? 1.4;
      const minF = 40, maxF = 18000, steps = 80;
      ctx.beginPath(); ctx.strokeStyle = this.colors.primary; ctx.lineWidth = 1.6;

      let cutoffX = 0;
      for (let i = 0; i <= steps; i++) {
        const norm = i / steps, freq = minF * Math.pow(maxF / minF, norm), x = norm * w;
        const ratio = freq / Math.max(10, cutoff);
        const mag = 1 / Math.sqrt(Math.pow(1 - ratio * ratio, 2) + Math.pow(ratio / Math.max(0.1, resonance), 2));
        const db = 20 * Math.log10(Math.max(0.001, mag));
        const y = h - (Math.max(0, Math.min(1, (db + 36) / 48)) * (overlayH - 14) + 6);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        if (Math.abs(freq - cutoff) < (cutoff * 0.08) && !cutoffX) cutoffX = x;
      }
      ctx.stroke();

      if (cutoffX > 0) {
        ctx.strokeStyle = this.colors.primary; ctx.lineWidth = 1; ctx.setLineDash([2, 2]);
        ctx.beginPath(); ctx.moveTo(cutoffX, topY + 4); ctx.lineTo(cutoffX, h); ctx.stroke(); ctx.setLineDash([]);
        ctx.font = '500 10px Inter, sans-serif'; ctx.fillStyle = this.colors.onSurface;
        ctx.textAlign = cutoffX > w - 100 ? 'right' : 'left';
        ctx.fillText(`Filter ${Math.round(cutoff)}Hz (Q: ${resonance.toFixed(1)})`, cutoffX + (cutoffX > w - 100 ? -6 : 6), topY + 12);
      }
      ctx.restore();
    }

    renderEnvelope(w, h, now) {
      const ctx = this.envelopeCtx;
      if (!ctx) return;
      const audio = this.audioEngine || window.audioEngine;
      const attack = audio?.params?.attack ?? 4.8;
      const sustain = Math.max(0, Math.min(1, audio?.params?.sustain ?? 0.7));
      const release = audio?.params?.release ?? 8.5;
      const padX = 14, padY = 12, innerW = w - padX * 2, innerH = h - padY * 2;
      ctx.clearRect(0, 0, w, h);

      const totalT = attack + 2.5 + release;
      const aW = Math.max(16, (attack / totalT) * innerW), sW = Math.max(20, (2.5 / totalT) * innerW), rW = Math.max(16, innerW - aW - sW);
      const p0 = { x: padX, y: h - padY }, p1 = { x: padX + aW, y: padY };
      const p2 = { x: padX + aW + sW, y: h - padY - (sustain * innerH) }, p3 = { x: padX + aW + sW + rW, y: h - padY };

      ctx.save();
      ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y); ctx.lineTo(p1.x + 8, p2.y); ctx.lineTo(p2.x, p2.y); ctx.lineTo(p3.x, p3.y); ctx.closePath();
      const grad = ctx.createLinearGradient(0, padY, 0, h - padY);
      grad.addColorStop(0, this.colors.lightBlue);
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.globalAlpha = 0.16;
      ctx.fill();

      // Top-only light blue envelope contour line (no bottom border)
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.lineTo(p1.x + 8, p2.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.lineTo(p3.x, p3.y);
      ctx.strokeStyle = this.colors.lightBlue;
      ctx.lineWidth = 2.0;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.globalAlpha = 0.95;
      ctx.stroke();

      const recentRipples = this.ripples.filter(r => (now - r.birth) < r.duration && r.type !== 'REST');
      recentRipples.forEach(r => {
        const prog = (now - r.birth) / r.duration;
        let px = p0.x, py = p0.y;
        if (r.voiceId === 'piano') {
          if (prog < 0.35) {
            px = p1.x + (p2.x - p1.x) * (prog / 0.35); py = p2.y;
          } else {
            const t = (prog - 0.35) / 0.65; px = p2.x + (p3.x - p2.x) * t; py = p2.y + (p3.y - p2.y) * t;
          }
        } else if (prog < 0.35) {
          const t = prog / 0.35; px = p0.x + (p1.x - p0.x) * t; py = p0.y + (p1.y - p0.y) * t;
        } else if (prog < 0.65) {
          px = p1.x + (p2.x - p1.x) * ((prog - 0.35) / 0.30); py = p2.y;
        } else {
          const t = (prog - 0.65) / 0.35; px = p2.x + (p3.x - p2.x) * t; py = p2.y + (p3.y - p2.y) * t;
        }
        ctx.beginPath(); ctx.arc(px, py, 3.5, 0, Math.PI * 2); ctx.fillStyle = r.color; ctx.globalAlpha = 0.9; ctx.fill();
      });

      ctx.font = '500 10px Inter, sans-serif'; ctx.fillStyle = this.colors.onSurfaceVar;
      ctx.textAlign = 'left'; ctx.fillText(`A: ${attack.toFixed(1)}s`, p0.x, padY + 10);
      ctx.textAlign = 'center'; ctx.fillText(`S: ${Math.round(sustain * 100)}%`, p1.x + sW / 2, padY + 10);
      ctx.textAlign = 'right'; ctx.fillText(`R: ${release.toFixed(1)}s`, p3.x, padY + 10);
      ctx.restore();
    }

    renderVoiceWaveforms(now = performance.now()) {
      const audio = this.audioEngine || window.audioEngine;
      const probEng = this.probEngine || window.probEngine;
      const dpr = window.devicePixelRatio || 1;
      const waveColor = this.colors.lightBlue || '#A9C7FB';

      VOICE_IDS.forEach((id, idx) => {
        const canvas = document.getElementById(`voice-wave-${id}`);
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const w = rect.width, h = rect.height;
        if (w <= 0 || h <= 0) return;

        const targetW = Math.round(w * dpr), targetH = Math.round(h * dpr);
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        if (canvas.width !== targetW || canvas.height !== targetH) {
          canvas.width = targetW;
          canvas.height = targetH;
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        }

        ctx.clearRect(0, 0, w, h);
        const cy = h / 2;
        const maxAmpPx = Math.max(4, (h / 2) - 4);
        const voiceState = this.getVoiceState(id);
        const isMuted = Boolean(voiceState.muted);

        // Subtle center reference line
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(0, cy);
        ctx.lineTo(w, cy);
        ctx.strokeStyle = this.colors.outlineVariant;
        ctx.lineWidth = 0.75;
        ctx.globalAlpha = 0.32;
        ctx.stroke();

        if (isMuted) {
          ctx.beginPath();
          ctx.moveTo(4, cy);
          ctx.lineTo(w - 4, cy);
          ctx.strokeStyle = waveColor;
          ctx.lineWidth = 1.4;
          ctx.globalAlpha = 0.45;
          ctx.stroke();
          ctx.restore();
          return;
        }

        // Compute active note / ripple envelope for this voice
        let envAmp = 0;
        let noteFreq = 220 * Math.pow(2, (idx - 2) * 0.25);
        if (audio?.activeNotes) {
          const ctxNow = audio.ctx ? audio.ctx.currentTime : 0;
          for (const note of audio.activeNotes.values()) {
            if (note.voiceId !== id) continue;
            if (typeof note.freq === 'number') noteFreq = note.freq;
            const gVal = note.envGain?.gain?.value ?? 0;
            const totalDur =
                Math.max(0.4, (note.stopTime || 4) - (note.startTime || 0));
            const elapsed = Math.max(0, ctxNow - (note.startTime || 0));
            const synthEnv = elapsed > 0.25 ?
                Math.max(0.15, 1 - (elapsed / totalDur)) :
                0.76;
            envAmp = Math.max(
                envAmp, gVal > 0.02 ? Math.min(1, gVal * 1.4) : synthEnv);
          }
        }
        for (const r of this.ripples) {
          if (r.voiceId !== id || r.type === 'REST') continue;
          const prog = (now - r.birth) / Math.max(100, r.duration);
          if (prog >= 0 && prog < 1) {
            const rAmp = prog < r.attackRatio ?
                Math.max(0.35, prog / Math.max(0.01, r.attackRatio)) :
                Math.max(
                    0,
                    1 -
                        (prog - r.attackRatio) /
                            Math.max(0.01, 1 - r.attackRatio));
            envAmp = Math.max(envAmp, rAmp * 0.85);
          }
        }

        // 1. Check live Web Audio per-voice AnalyserNode time-domain samples
        const analyser = audio?.nodes?.voiceAnalysers?.[id];
        let usedAnalyser = false;
        if (analyser) {
          if (!this._waveBuf || this._waveBuf.length !== analyser.fftSize) {
            this._waveBuf = new Float32Array(analyser.fftSize);
          }
          if (typeof analyser.getFloatTimeDomainData === 'function') {
            analyser.getFloatTimeDomainData(this._waveBuf);
          } else {
            const byteBuf = new Uint8Array(analyser.fftSize);
            analyser.getByteTimeDomainData(byteBuf);
            for (let i = 0; i < byteBuf.length; i++)
              this._waveBuf[i] = (byteBuf[i] - 128) / 128;
          }
          let peak = 0;
          for (let i = 0; i < this._waveBuf.length; i++) {
            const a = Math.abs(this._waveBuf[i]);
            if (a > peak) peak = a;
          }
          if (peak > 0.00025) {
            usedAnalyser = true;
            const refPeak = id === 'piano' ? 0.32 : 0.035;
            const sigEnv = Math.min(0.92, Math.pow(peak / refPeak, 0.42));
            const targetEnv = Math.min(0.92, Math.max(sigEnv, envAmp * 0.82));
            const invPeak = 1 / peak;
            let zeroCross = 0;
            const searchLim =
                Math.min(512, Math.floor(this._waveBuf.length * 0.35));
            for (let i = 1; i < searchLim; i++) {
              if (this._waveBuf[i - 1] <= 0 && this._waveBuf[i] > 0) {
                zeroCross = i;
                break;
              }
            }
            const span = Math.min(768, this._waveBuf.length - zeroCross - 1);
            const drawPts = 96;
            ctx.beginPath();
            for (let i = 0; i <= drawPts; i++) {
              const norm = i / drawPts;
              const x = 4 + norm * (w - 8);
              const bufIdx = zeroCross + Math.floor(norm * span);
              const win = 0.25 + 0.75 * Math.sin(norm * Math.PI);
              const sample =
                  Math.max(
                      -1, Math.min(1, (this._waveBuf[bufIdx] || 0) * invPeak)) *
                  targetEnv * win;
              const y = cy - sample * maxAmpPx;
              if (i === 0)
                ctx.moveTo(x, y);
              else
                ctx.lineTo(x, y);
            }
            ctx.strokeStyle = waveColor;
            ctx.lineWidth = 1.75;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.globalAlpha = 0.95;
            ctx.stroke();
          }
        }

        // 2. Active-note / ripple harmonic waveform synthesis (when
        // AudioContext is suspended or between analyser frames)
        if (!usedAnalyser) {
          if (envAmp < 0.08 && probEng?.isRunning) {
            const phase = voiceState.phase ?? 0;
            envAmp = 0.18 + 0.14 * Math.sin(phase * Math.PI);
          }

          const gainScale = Math.min(
              1.15,
              Math.max(
                  0.45,
                  (voiceState.gain ?? 0.6) / (id === 'piano' ? 2.0 : 0.16)));
          const effAmp = Math.min(0.88, envAmp * gainScale);
          const cycles = Math.max(2.2, Math.min(6.5, (noteFreq / 110) * 1.8));
          const phaseShift = now * 0.0035 * (1 + idx * 0.15);
          const steps = 64;

          ctx.beginPath();
          for (let i = 0; i <= steps; i++) {
            const norm = i / steps;
            const x = 4 + norm * (w - 8);
            const windowEnv = Math.sin(norm * Math.PI);
            const theta = norm * Math.PI * 2 * cycles + phaseShift;
            let sample = 0;
            if (id === 'pad') {
              sample = 0.55 * Math.sin(theta) +
                  0.28 * Math.sin(theta * 2.01 + 0.4) +
                  0.22 * Math.sin(theta * 0.5);
            } else if (id === 'piano') {
              const decayWin = Math.pow(1 - norm * 0.55, 1.3);
              sample = (0.62 * Math.sin(theta) + 0.26 * Math.sin(theta * 2) +
                        0.12 * Math.sin(theta * 3)) *
                  decayWin;
            } else if (id === 'bell') {
              sample = Math.sin(theta + 1.35 * Math.sin(theta * 2.76));
            } else if (id === 'choir') {
              sample = 0.52 * Math.sin(theta) +
                  0.30 * Math.sin(theta * 2 - 0.3) +
                  0.18 * Math.sin(theta * 3 + 0.5);
            } else if (id === 'tape') {
              const flutter =
                  0.25 * Math.sin(norm * Math.PI * 4 + phaseShift * 0.6);
              sample = 0.64 * Math.sin(theta + flutter) +
                  0.28 * Math.sin(theta * 2 + flutter);
            } else {
              sample = 0.56 * Math.sin(theta) + 0.30 * Math.sin(theta * 1.5) +
                  0.18 * Math.sin(theta * 2);
            }
            const y = cy - sample * effAmp * windowEnv * maxAmpPx;
            if (i === 0)
              ctx.moveTo(x, y);
            else
              ctx.lineTo(x, y);
          }
          ctx.strokeStyle = waveColor;
          ctx.lineWidth = 1.75;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.globalAlpha = 0.95;
          ctx.stroke();
        }
        ctx.restore();
      });
    }

    destroy() {
      this.stop();
      window.removeEventListener('resize', this.resize);
      if (this.resizeObserver) this.resizeObserver.disconnect();
    }
  }

  window.SoundscapeVisualizer = SoundscapeVisualizer;
})();
