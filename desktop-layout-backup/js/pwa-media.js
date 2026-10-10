/**
 * Enso Soundscapes — PWA, Background Audio Keepalive, and Media Session Integration
 */
'use strict';

window.EnsoPwaMedia = (function() {
  let mediaSessionConfigured = false;
  let bgWorkerActive = false;
  let bgKeepAliveAudio = null;
  let bgWorker = null;
  let lastBgTickTime = performance.now();
  let lastPositionUpdateTime = 0;
  const bgKeepAliveDurationSec = 30;

  let bgTimerSeq = 0;
  const bgTimers = new Map();

  function setBgTimeout(fn, delayMs) {
    const id = ++bgTimerSeq;
    const dueAt = performance.now() + Math.max(0, delayMs || 0);
    const nativeId = setTimeout(() => {
      bgTimers.delete(id);
      try { fn(); } catch (e) {}
    }, delayMs);
    bgTimers.set(id, { dueAt, fn, nativeId });
    return id;
  }

  function clearBgTimeout(id) {
    if (!id) return;
    const item = bgTimers.get(id);
    if (item) {
      clearTimeout(item.nativeId);
      bgTimers.delete(id);
    }
  }

  function flushBgTimers(now) {
    if (!bgTimers.size) return;
    const due = [];
    bgTimers.forEach((item, id) => {
      if (now >= item.dueAt) {
        due.push({ id, fn: item.fn, nativeId: item.nativeId });
      }
    });
    for (const d of due) {
      clearTimeout(d.nativeId);
      bgTimers.delete(d.id);
      try { d.fn(); } catch (e) {}
    }
  }

  function generateSilentWavBlobUrl() {
    const sampleRate = 8000;
    const durationSec = bgKeepAliveDurationSec;
    const numChannels = 2;
    const bitsPerSample = 16;
    const numSamples = sampleRate * durationSec;
    const blockAlign = (numChannels * bitsPerSample) / 8;
    const byteRate = sampleRate * blockAlign;
    const dataSize = numSamples * blockAlign;
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);

    function writeString(offset, str) {
      for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i));
      }
    }

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitsPerSample, true);
    writeString(36, 'data');
    view.setUint32(40, dataSize, true);

    // Continuous sub-audible 18 Hz warm pilot wave + dither to defeat Android silence detector
    let offset = 44;
    const twoPi18 = 2 * Math.PI * 18;
    for (let i = 0; i < numSamples; i++) {
      const sample = Math.round(Math.sin((twoPi18 * i) / sampleRate) * 28) + ((i % 2 === 0) ? 2 : -2);
      view.setInt16(offset, sample, true);     // Left
      view.setInt16(offset + 2, sample, true); // Right
      offset += 4;
    }

    const blob = new Blob([buffer], { type: 'audio/wav' });
    return URL.createObjectURL(blob);
  }

  function initServiceWorker() {
    if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
      navigator.serviceWorker
          .register('sw.js?v=20261009n', {updateViaCache: 'none'})
          .then((reg) => {
            if (reg && typeof reg.update === 'function')
              reg.update().catch(() => {});
          })
          .catch(() => {});
    }
    if ('caches' in window) {
      caches.keys()
          .then((keys) => keys.forEach((k) => {
            if (k !== 'enso-soundscapes-v20') caches.delete(k);
          }))
          .catch(() => {});
    }
  }

  function initBackgroundKeepAlive() {
    if (document.getElementById('bg-audio-keepalive')) {
      bgKeepAliveAudio = document.getElementById('bg-audio-keepalive');
      return;
    }
    const audio = document.createElement('audio');
    audio.id = 'bg-audio-keepalive';
    audio.setAttribute('playsinline', '');
    audio.setAttribute('loop', '');
    audio.setAttribute('preload', 'auto');
    audio.style.display = 'none';
    audio.volume = 0.08;
    audio.muted = false;
    audio.loop = true;
    audio.src = generateSilentWavBlobUrl();
    audio.addEventListener('timeupdate', () => {
      if (document.hidden) handleBackgroundTick();
    });
    audio.addEventListener('pause', () => {
      if (window.enoApp?.audioEngine?.isRunning) {
        audio.play().catch(() => {});
      }
    });
    document.body.appendChild(audio);
    bgKeepAliveAudio = audio;
  }

  function initBackgroundWorker() {
    try {
      const workerCode = `
        setInterval(function() {
          postMessage('tick');
        }, 80);
      `;
      const blob = new Blob([workerCode], { type: 'application/javascript' });
      bgWorker = new Worker(URL.createObjectURL(blob));
      bgWorker.onmessage = function() {
        handleBackgroundTick();
      };
      bgWorkerActive = true;
    } catch (e) {
      bgWorkerActive = false;
    }

    // Backup window timer in case Web Workers are constrained
    setInterval(function() {
      if (document.hidden) {
        handleBackgroundTick();
      }
    }, 100);
    bgWorkerActive = true;
  }

  function handleBackgroundTick() {
    const now = performance.now();
    if (now - lastBgTickTime < 15) return;
    const dt = Math.min(0.25, Math.max(0.001, (now - lastBgTickTime) / 1000));
    lastBgTickTime = now;

    flushBgTimers(now);

    if (document.hidden && window.enoApp && window.enoApp.audioEngine && window.enoApp.audioEngine.isRunning) {
      if (window.enoApp.probEngine) {
        window.enoApp.probEngine.tick(dt);
      }
      if (window.enoApp.autoCycler && typeof window.enoApp.autoCycler.tick === 'function') {
        window.enoApp.autoCycler.tick(dt);
      }
      if (window.enoApp.audioEngine.ctx && window.enoApp.audioEngine.ctx.state === 'suspended') {
        window.enoApp.audioEngine.ctx.resume().catch(() => {});
      }
      if (now - lastPositionUpdateTime > 1000) {
        lastPositionUpdateTime = now;
        updateMediaSessionPosition();
      }
    }
  }

  let bgStreamAudio = null;

  function initStreamAudio(stream) {
    if (!stream) return;
    if (!bgStreamAudio) {
      bgStreamAudio = document.getElementById('bg-stream-audio');
    }
    if (!bgStreamAudio) {
      const audio = document.createElement('audio');
      audio.id = 'bg-stream-audio';
      audio.setAttribute('playsinline', '');
      audio.setAttribute('preload', 'auto');
      audio.style.display = 'none';
      audio.volume = 0.002;
      audio.muted = false;
      document.body.appendChild(audio);
      bgStreamAudio = audio;
    }
    if (bgStreamAudio.srcObject !== stream) {
      bgStreamAudio.srcObject = stream;
    }
  }

  function setupEngineNodes(engine) {
    if (!engine || !engine.ctx || !engine.nodes) return;
    try {
      if (!engine.nodes.streamDest && typeof engine.ctx.createMediaStreamDestination === 'function') {
        engine.nodes.streamDest = engine.ctx.createMediaStreamDestination();
        if (engine.nodes.masterGain) {
          engine.nodes.masterGain.connect(engine.nodes.streamDest);
        }
      }
      if (engine.nodes.streamDest && engine.nodes.streamDest.stream) {
        initStreamAudio(engine.nodes.streamDest.stream);
      }
      if (!engine.nodes.keepAliveOsc) {
        engine.nodes.keepAliveOsc = engine.ctx.createOscillator();
        engine.nodes.keepAliveOsc.frequency.value = 18;
        engine.nodes.keepAliveGain = engine.ctx.createGain();
        engine.nodes.keepAliveGain.gain.value = 0.0001;
        engine.nodes.keepAliveOsc.connect(engine.nodes.keepAliveGain);
        engine.nodes.keepAliveGain.connect(engine.ctx.destination);
        if (engine.nodes.streamDest) {
          engine.nodes.keepAliveGain.connect(engine.nodes.streamDest);
        }
        engine.nodes.keepAliveOsc.start();
      }
      if (!engine.nodes.bgClockNode && typeof engine.ctx.createScriptProcessor === 'function') {
        engine.nodes.bgClockNode = engine.ctx.createScriptProcessor(4096, 1, 1);
        if (engine.nodes.keepAliveGain) {
          engine.nodes.keepAliveGain.connect(engine.nodes.bgClockNode);
        }
        engine.nodes.bgClockSink = engine.ctx.createGain();
        engine.nodes.bgClockSink.gain.value = 0;
        engine.nodes.bgClockNode.connect(engine.nodes.bgClockSink);
        engine.nodes.bgClockSink.connect(engine.ctx.destination);
        engine.nodes.bgClockNode.onaudioprocess = function() {
          if (document.hidden) {
            handleBackgroundTick();
          }
        };
      }
      if (!engine._hasStateChangeListener) {
        engine._hasStateChangeListener = true;
        engine.ctx.addEventListener('statechange', () => {
          if (engine.isRunning && engine.ctx.state === 'suspended') {
            engine.ctx.resume().catch(() => {});
          }
        });
      }
    } catch (e) {}
  }

  function hookAudioEngine() {
    if (typeof window.AudioEngine === 'undefined') return;

    const originalInit = window.AudioEngine.prototype.init;
    window.AudioEngine.prototype.init = function() {
      originalInit.apply(this, arguments);
      setupEngineNodes(this);
    };

    const originalSetRunning = window.AudioEngine.prototype.setRunning;
    window.AudioEngine.prototype.setRunning = function(bool) {
      originalSetRunning.apply(this, arguments);
      if (this.isRunning) {
        if (this.ctx && this.ctx.state === 'suspended') {
          this.ctx.resume().catch(() => {});
        }
        if (bgKeepAliveAudio) {
          bgKeepAliveAudio.play().catch(() => {});
        }
        if (bgStreamAudio && bgStreamAudio.paused) {
          bgStreamAudio.play().catch(() => {});
        }
        if ('wakeLock' in navigator && !document.hidden) {
          navigator.wakeLock.request('screen').catch(() => {});
        }
        if ('mediaSession' in navigator) {
          navigator.mediaSession.playbackState = 'playing';
          updateMediaSessionMetadata();
          updateMediaSessionPosition();
        }
      } else {
        if (bgKeepAliveAudio) {
          bgKeepAliveAudio.pause();
        }
        if (bgStreamAudio) {
          bgStreamAudio.pause();
        }
        if ('mediaSession' in navigator) {
          navigator.mediaSession.playbackState = 'paused';
        }
      }
    };

    if (window.enoApp && window.enoApp.audioEngine) {
      setupEngineNodes(window.enoApp.audioEngine);
    }

    // Document-level user gesture listener to wake up audio on first touch
    ['pointerdown', 'touchstart', 'click', 'keydown'].forEach((evtName) => {
      document.addEventListener(evtName, () => {
        if (window.enoApp?.audioEngine?.isRunning) {
          if (bgKeepAliveAudio && bgKeepAliveAudio.paused) {
            bgKeepAliveAudio.play().catch(() => {});
          }
          if (bgStreamAudio && bgStreamAudio.paused) {
            bgStreamAudio.play().catch(() => {});
          }
          const ctx = window.enoApp.audioEngine.ctx;
          if (ctx && ctx.state === 'suspended') {
            ctx.resume().catch(() => {});
          }
        }
      }, { passive: true });
    });
  }

  function updateMediaSessionPosition() {
    if (!('mediaSession' in navigator) || typeof navigator.mediaSession.setPositionState !== 'function') return;
    try {
      const transMin = (window.enoApp?.autoCycler?.transitionMinutes) || 8;
      const dur = Math.max(60, transMin * 60);
      const pos = Math.min(dur - 0.1, Math.max(0, window.enoApp?.autoCycler?.trackElapsedSec || 0));
      navigator.mediaSession.setPositionState({
        duration: dur,
        playbackRate: 1.0,
        position: pos
      });
    } catch (e) {}
  }

  function updateMediaSessionMetadata(presetId) {
    if (!('mediaSession' in navigator)) return;
    const presets = (window.ENO_DATA && window.ENO_DATA.PRESETS) || {};
    const scales = (window.ENO_DATA && window.ENO_DATA.SCALES) || {};
    const pId = presetId || (window.enoApp ? window.enoApp.activePresetId : 'thursday');
    const preset = presets[pId] || presets.thursday || presets.reflection || { name: 'Sunlit Atrium', scale: 'thursday_g' };
    const scale = scales[preset.scale] || { keyLabel: 'G Mixolydian' };
    const keyLabel = scale.keyLabel || preset.keyLabel || 'Modal Ambient';

    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: preset.name,
        artist: 'Enso Soundscapes · ' + keyLabel,
        album: 'Enso Soundscapes',
        artwork: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' }
        ]
      });
    } catch (e) {}
  }

  function initMediaSessionHandlers() {
    if (!('mediaSession' in navigator)) return;

    function getPresetList() {
      const presets = (window.ENO_DATA && window.ENO_DATA.PRESETS) || {};
      return Object.values(presets);
    }

    function cyclePreset(step) {
      const list = getPresetList();
      if (!list.length || !window.enoApp) return;
      const curId = window.enoApp.activePresetId;
      const curIdx = list.findIndex((p) => p.id === curId);
      const nextIdx = (curIdx + step + list.length) % list.length;
      const nextPreset = list[nextIdx];
      if (nextPreset && typeof window.enoApp.applyPreset === 'function') {
        window.enoApp.applyPreset(nextPreset.id, true);
        updateMediaSessionMetadata(nextPreset.id);
        updateMediaSessionPosition();
      }
    }

    const actionMap = {
      play: function() {
        if (window.enoApp && window.enoApp.audioEngine && !window.enoApp.audioEngine.isRunning) {
          const btn = document.getElementById('btn-play-toggle');
          if (btn) btn.click();
        }
      },
      pause: function() {
        if (window.enoApp && window.enoApp.audioEngine && window.enoApp.audioEngine.isRunning) {
          const btn = document.getElementById('btn-play-toggle');
          if (btn) btn.click();
        }
      },
      stop: function() {
        if (window.enoApp && window.enoApp.audioEngine && window.enoApp.audioEngine.isRunning) {
          const btn = document.getElementById('btn-play-toggle');
          if (btn) btn.click();
        }
      },
      previoustrack: function() {
        cyclePreset(-1);
      },
      nexttrack: function() {
        cyclePreset(1);
      }
    };

    Object.keys(actionMap).forEach((act) => {
      try {
        navigator.mediaSession.setActionHandler(act, actionMap[act]);
      } catch (e) {}
    });

    mediaSessionConfigured = true;
    updateMediaSessionMetadata();
    updateMediaSessionPosition();
  }

  function initListeners() {
    document.addEventListener('visibilitychange', () => {
      lastBgTickTime = performance.now();
      if (!document.hidden && window.enoApp && window.enoApp.audioEngine && window.enoApp.audioEngine.isRunning) {
        if (window.enoApp.audioEngine.ctx && window.enoApp.audioEngine.ctx.state === 'suspended') {
          window.enoApp.audioEngine.ctx.resume().catch(() => {});
        }
        if (bgKeepAliveAudio && bgKeepAliveAudio.paused) {
          bgKeepAliveAudio.play().catch(() => {});
        }
      }
    });

    const container = document.getElementById('preset-buttons-container');
    if (container) {
      container.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-preset-id]');
        if (btn && btn.dataset.presetId) {
          updateMediaSessionMetadata(btn.dataset.presetId);
          updateMediaSessionPosition();
        }
      });
    }
  }

  function init() {
    initServiceWorker();
    initBackgroundKeepAlive();
    initBackgroundWorker();
    hookAudioEngine();
    initMediaSessionHandlers();
    initListeners();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  return {
    get mediaSessionConfigured() { return mediaSessionConfigured; },
    get bgWorkerActive() { return bgWorkerActive; },
    get keepAliveDurationSec() { return bgKeepAliveDurationSec; },
    isKeepAliveReady: function() {
      return Boolean(bgKeepAliveAudio && (!bgKeepAliveAudio.error || bgKeepAliveAudio.src));
    },
    setBgTimeout,
    clearBgTimeout,
    updateMediaSessionMetadata,
    updateMediaSessionPosition,
    handleBackgroundTick
  };
})();
