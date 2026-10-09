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

  function generateSilentWavBlobUrl() {
    const sampleRate = 22050;
    const numChannels = 2;
    const bitsPerSample = 16;
    const numSamples = sampleRate; // 1 second
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

    // Subtle 1-bit dither / near-silent alternating sample to prevent OS playback engine sleep
    let offset = 44;
    for (let i = 0; i < numSamples; i++) {
      const sample = (i % 2 === 0) ? 1 : -1;
      view.setInt16(offset, sample, true); // Left
      view.setInt16(offset + 2, sample, true); // Right
      offset += 4;
    }

    const blob = new Blob([buffer], { type: 'audio/wav' });
    return URL.createObjectURL(blob);
  }

  function initServiceWorker() {
    if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
      navigator.serviceWorker.register('sw.js?v=20261008d', { updateViaCache: 'none' })
        .then((reg) => { if (reg && typeof reg.update === 'function') reg.update().catch(() => {}); })
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
    audio.src = generateSilentWavBlobUrl();
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
    const dt = Math.min(0.25, Math.max(0.001, (now - lastBgTickTime) / 1000));
    lastBgTickTime = now;

    if (document.hidden && window.enoApp && window.enoApp.audioEngine && window.enoApp.audioEngine.isRunning) {
      if (window.enoApp.probEngine) {
        window.enoApp.probEngine.tick(dt);
      }
      if (window.enoApp.audioEngine.ctx && window.enoApp.audioEngine.ctx.state === 'suspended') {
        window.enoApp.audioEngine.ctx.resume().catch(() => {});
      }
    }
  }

  function hookAudioEngine() {
    if (typeof window.AudioEngine === 'undefined') return;

    const originalInit = window.AudioEngine.prototype.init;
    window.AudioEngine.prototype.init = function() {
      originalInit.apply(this, arguments);
      if (this.ctx && this.nodes && !this.nodes.streamDest) {
        try {
          this.nodes.streamDest = this.ctx.createMediaStreamDestination();
          if (this.nodes.masterGain) {
            this.nodes.masterGain.connect(this.nodes.streamDest);
          }
        } catch (e) {}
      }
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
        if ('wakeLock' in navigator && !document.hidden) {
          navigator.wakeLock.request('screen').catch(() => {});
        }
        if ('mediaSession' in navigator) {
          navigator.mediaSession.playbackState = 'playing';
        }
      } else {
        if (bgKeepAliveAudio) {
          bgKeepAliveAudio.pause();
        }
        if ('mediaSession' in navigator) {
          navigator.mediaSession.playbackState = 'paused';
        }
      }
    };
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

    // Hook preset changes from DOM buttons or applyPreset
    const container = document.getElementById('preset-buttons-container');
    if (container) {
      container.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-preset-id]');
        if (btn && btn.dataset.presetId) {
          updateMediaSessionMetadata(btn.dataset.presetId);
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
    updateMediaSessionMetadata,
    handleBackgroundTick
  };
})();
