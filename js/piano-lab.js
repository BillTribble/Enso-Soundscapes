/**
 * Felt Piano & Sample Library Audition Lab Controller
 * Allows interactive A/B comparison of Salamander Grand Piano v3 (Felt EQ vs Raw Grand vs Synth)
 * and real-time tweaking of the 3-stage Wool-Felt EQ & mechanical key release noise.
 */
'use strict';

(function() {
  const AUDITION_NOTES = [
    { midi: 36, label: 'C2', zone: 'Zone C2' },
    { midi: 43, label: 'G2', zone: 'Zone F#2' },
    { midi: 48, label: 'C3', zone: 'Zone C3' },
    { midi: 51, label: 'Eb3', zone: 'Zone D#3' },
    { midi: 55, label: 'G3', zone: 'Zone F#3' },
    { midi: 58, label: 'Bb3', zone: 'Zone A3' },
    { midi: 60, label: 'C4', zone: 'Zone C4' },
    { midi: 62, label: 'D4', zone: 'Zone D#4' },
    { midi: 63, label: 'Eb4', zone: 'Zone D#4' },
    { midi: 67, label: 'G4', zone: 'Zone F#4' },
    { midi: 70, label: 'Bb4', zone: 'Zone A4' },
    { midi: 72, label: 'C5', zone: 'Zone C5' },
    { midi: 74, label: 'D5', zone: 'Zone D#5' },
    { midi: 79, label: 'G5', zone: 'Zone F#5' }
  ];

  const engine = new window.AudioEngine();
  engine.params.attack = 0.14;
  engine.params.release = 6.5;
  engine.params.sustain = 0.6;
  engine.params.reverbMix = 0.42;
  engine.params.reverbShimmer = 0.12;
  engine.params.delayMix = 0.22;
  engine.params.cutoff = 6500;

  let currentMode = 'felt'; // 'felt' | 'raw' | 'synth'
  let currentVelocity = 0.32;
  let phraseTimer = null;
  let savedSamples = null;

  function applyEngineMode(mode) {
    currentMode = mode;
    const badge = document.getElementById('eq-state-badge');
    if (mode === 'felt') {
      if (savedSamples && engine.pianoSamples.size === 0) engine.pianoSamples = savedSamples;
      engine.feltPianoConfig.bodyWarmthGainDb = parseFloat(document.getElementById('felt-body-gain').value);
      engine.feltPianoConfig.highShelfCutDb = parseFloat(document.getElementById('felt-shelf-cut').value);
      engine.feltPianoConfig.mechReleaseGain = parseFloat(document.getElementById('felt-mech-gain').value);
      if (badge) { badge.textContent = 'Salamander v1 ppp + Felt EQ'; badge.className = 'badge badge-teal'; }
    } else if (mode === 'raw') {
      if (savedSamples && engine.pianoSamples.size === 0) engine.pianoSamples = savedSamples;
      engine.feltPianoConfig.bodyWarmthGainDb = 0.0;
      engine.feltPianoConfig.highShelfCutDb = 0.0;
      engine.feltPianoConfig.mechReleaseGain = 0.02;
      if (badge) { badge.textContent = 'Raw Unfiltered Concert Grand'; badge.className = 'badge badge-blue'; }
    } else if (mode === 'synth') {
      if (engine.pianoSamples.size > 0) savedSamples = new Map(engine.pianoSamples);
      engine.pianoSamples = new Map();
      if (badge) { badge.textContent = 'Legacy Oscillator Synth'; badge.className = 'badge badge-orange'; }
    }
  }

  function strikeNote(midi, label, btnEl) {
    engine.init();
    engine.resume();
    applyEngineMode(currentMode);
    if (currentMode === 'synth') {
      // Trigger legacy sine+triangle synth
      const now = engine.ctx.currentTime;
      const freq = 440 * Math.pow(2, (midi - 69) / 12);
      const osc = engine.ctx.createOscillator();
      const g = engine.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);
      g.gain.setValueAtTime(0.001, now);
      g.gain.linearRampToValueAtTime(0.28, now + 0.05);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 3.5);
      osc.connect(g);
      g.connect(engine.nodes.voiceSum);
      osc.start(now);
      osc.stop(now + 3.6);
    } else {
      engine.triggerVoice('piano', midi, currentVelocity, (Math.random() - 0.5) * 0.35, 0.88);
    }
    const lastBadge = document.getElementById('last-played-badge');
    const activeLayer = engine.feltPianoConfig.forceLayer || 'v1';
    const layerName = activeLayer === 'v1' ? 'v1 ppp' : (activeLayer === 'v3' ? 'v3 pp' : 'v5 mp');
    if (lastBadge) lastBadge.textContent = `${label} (${layerName} · ${currentMode.toUpperCase()})`;
    if (btnEl) {
      btnEl.classList.add('active-strike');
      setTimeout(() => btnEl.classList.remove('active-strike'), 380);
    }
  }

  function initUI() {
    const strip = document.getElementById('keyboard-strip');
    AUDITION_NOTES.forEach((n, idx) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'piano-key-btn';
      btn.dataset.midi = n.midi;
      btn.innerHTML = `<span class="key-zone">${n.zone}</span><span class="key-note">${n.label}</span><span class="key-zone">${idx < 9 ? 'Key ' + (idx + 1) : 'Click'}</span>`;
      btn.addEventListener('click', () => strikeNote(n.midi, n.label, btn));
      strip.appendChild(btn);
    });

    // Preload samples on first load
    engine.init();
    engine.loadPianoSamples().then(() => {
      savedSamples = engine.pianoSamples;
      const statusBadge = document.getElementById('sample-status-badge');
      if (statusBadge) {
        const cnt = engine.pianoSamples.size || 30;
        statusBadge.textContent = `Salamander C5 Ready (${cnt} zones · 97 FLACs)`;
      }
    });

    // Installed Piano Library tabs
    const libNames = {
      salamander: 'Salamander C5 Grand',
      intimate_c3: 'Intimate C3 (Close + Decca)',
      upright_kw: 'Kawai Upright KW',
      steinway_splendid: 'Steinway Grand PP'
    };
    document.querySelectorAll('#library-tabs .m3-pill-tab').forEach((tab) => {
      tab.addEventListener('click', async () => {
        document.querySelectorAll('#library-tabs .m3-pill-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const libId = tab.dataset.lib;
        const statusBadge = document.getElementById('sample-status-badge');
        if (statusBadge) statusBadge.textContent = `Loading ${libNames[libId]}...`;
        await engine.setPianoLibrary(libId);
        savedSamples = engine.pianoSamples;
        if (statusBadge) statusBadge.textContent = `${libNames[libId]} Ready (${engine.pianoSamples.size} zones)`;
        const studioLink = document.querySelector('a[href^="/#preset=mixing_colours"]');
        if (studioLink) studioLink.href = `/#preset=mixing_colours&lib=${libId}`;
      });
    });

    // Engine mode tabs
    document.querySelectorAll('#engine-mode-tabs .m3-pill-tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('#engine-mode-tabs .m3-pill-tab').forEach(t => {
          t.classList.remove('active');
          t.setAttribute('aria-selected', 'false');
        });
        tab.classList.add('active');
        tab.setAttribute('aria-selected', 'true');
        applyEngineMode(tab.dataset.mode);
      });
    });

    // Velocity tabs (default locked to v1 ppp)
    document.querySelectorAll('#velocity-tabs .m3-pill-tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('#velocity-tabs .m3-pill-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        currentVelocity = parseFloat(tab.dataset.vel);
        engine.feltPianoConfig.forceLayer = tab.dataset.layer || 'v1';
      });
    });

    // Chord button
    document.getElementById('btn-play-chord').addEventListener('click', () => {
      [48, 55, 60, 62, 63, 67].forEach((midi, i) => {
        setTimeout(() => {
          const btn = document.querySelector(`.piano-key-btn[data-midi="${midi}"]`);
          strikeNote(midi, `MIDI ${midi}`, btn);
        }, i * 110);
      });
    });

    // Auto phrase
    const btnPhrase = document.getElementById('btn-auto-phrase');
    btnPhrase.addEventListener('click', () => {
      if (phraseTimer) {
        clearInterval(phraseTimer);
        phraseTimer = null;
        document.getElementById('phrase-icon').textContent = 'play_arrow';
        document.getElementById('phrase-label').textContent = 'Auto-play Mixing Colours phrase';
        return;
      }
      document.getElementById('phrase-icon').textContent = 'stop';
      document.getElementById('phrase-label').textContent = 'Stop phrase';
      const seq = [60, 67, 63, 62, 55, 60, 70, 67, 63, 51, 58, 60];
      let step = 0;
      const tick = () => {
        const midi = seq[step % seq.length];
        const noteObj = AUDITION_NOTES.find(a => a.midi === midi) || { midi, label: `M${midi}` };
        const btn = document.querySelector(`.piano-key-btn[data-midi="${midi}"]`);
        strikeNote(midi, noteObj.label, btn);
        step++;
      };
      tick();
      phraseTimer = setInterval(tick, 1850);
    });

    // Sliders
    const bindSlider = (id, valId, fmt, fn) => {
      const el = document.getElementById(id);
      const vEl = document.getElementById(valId);
      if (!el) return;
      el.addEventListener('input', () => {
        const v = parseFloat(el.value);
        if (vEl) vEl.textContent = fmt(v);
        fn(v);
      });
    };

    bindSlider('felt-body-gain', 'val-body-gain', v => `${v >= 0 ? '+' : ''}${v.toFixed(1)} dB`, v => { engine.feltPianoConfig.bodyWarmthGainDb = v; });
    bindSlider('felt-shelf-cut', 'val-shelf-cut', v => `${v.toFixed(1)} dB`, v => { engine.feltPianoConfig.highShelfCutDb = v; });
    bindSlider('felt-mech-gain', 'val-mech-gain', v => `${(v * 100).toFixed(1)}%`, v => { engine.feltPianoConfig.mechReleaseGain = v; });
    bindSlider('lab-delay', 'val-lab-delay', v => `${Math.round(v * 100)}%`, v => engine.setDelayMix(v));
    bindSlider('lab-release', 'val-lab-release', v => `${v.toFixed(1)} s`, v => engine.setGlobalRelease(v));
    bindSlider('lab-reverb', 'val-lab-reverb', v => `${Math.round(v * 100)}%`, v => engine.setReverbMix(v));
    bindSlider('lab-shimmer', 'val-lab-shimmer', v => `${Math.round(v * 100)}%`, v => engine.setReverbShimmer(v));

    // Theme toggle
    document.getElementById('btn-theme-toggle').addEventListener('click', () => {
      const root = document.documentElement;
      const isDark = root.getAttribute('data-theme') === 'dark';
      if (isDark) {
        root.removeAttribute('data-theme');
        document.getElementById('theme-icon').textContent = 'dark_mode';
      } else {
        root.setAttribute('data-theme', 'dark');
        document.getElementById('theme-icon').textContent = 'light_mode';
      }
    });

    // Keyboard shortcuts 1-9
    window.addEventListener('keydown', (e) => {
      const idx = parseInt(e.key, 10) - 1;
      if (idx >= 0 && idx < 9 && AUDITION_NOTES[idx]) {
        const n = AUDITION_NOTES[idx];
        const btn = document.querySelector(`.piano-key-btn[data-midi="${n.midi}"]`);
        strikeNote(n.midi, n.label, btn);
      }
    });

    if (window.initCustomSliders) window.initCustomSliders();
  }

  document.addEventListener('DOMContentLoaded', initUI);
})();
