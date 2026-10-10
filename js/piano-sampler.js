/**
 * Enso Soundscapes — Multi-sampled Salamander Grand Piano v3 Engine
 * Handles sample zone mapping, asynchronous FLAC layer fetching,
 * mechanical release samples, and 3-stage Felt Piano acoustic routing.
 */
'use strict';

(function() {
const SALAMANDER_ZONES = [
  {midi: 21, prefix: 'A0'},  {midi: 24, prefix: 'C1'},
  {midi: 27, prefix: 'Ds1'}, {midi: 30, prefix: 'Fs1'},
  {midi: 33, prefix: 'A1'},  {midi: 36, prefix: 'C2'},
  {midi: 39, prefix: 'Ds2'}, {midi: 42, prefix: 'Fs2'},
  {midi: 45, prefix: 'A2'},  {midi: 48, prefix: 'C3'},
  {midi: 51, prefix: 'Ds3'}, {midi: 54, prefix: 'Fs3'},
  {midi: 57, prefix: 'A3'},  {midi: 60, prefix: 'C4'},
  {midi: 63, prefix: 'Ds4'}, {midi: 66, prefix: 'Fs4'},
  {midi: 69, prefix: 'A4'},  {midi: 72, prefix: 'C5'},
  {midi: 75, prefix: 'Ds5'}, {midi: 78, prefix: 'Fs5'},
  {midi: 81, prefix: 'A5'},  {midi: 84, prefix: 'C6'},
  {midi: 87, prefix: 'Ds6'}, {midi: 90, prefix: 'Fs6'},
  {midi: 93, prefix: 'A6'},  {midi: 96, prefix: 'C7'},
  {midi: 99, prefix: 'Ds7'}, {midi: 102, prefix: 'Fs7'},
  {midi: 105, prefix: 'A7'}, {midi: 108, prefix: 'C8'}
];

const MECH_FILES = {
  pedalD1: 'samples/piano/pedalD1.flac',
  pedalU1: 'samples/piano/pedalU1.flac',
  rel24: 'samples/piano/rel24.flac',
  rel40: 'samples/piano/rel40.flac',
  rel56: 'samples/piano/rel56.flac',
  harmV3C3: 'samples/piano/harmV3C3.flac',
  harmV3C4: 'samples/piano/harmV3C4.flac'
};

function normalizeNoteAudioBuffer(buffer, midi = 60) {
  if (!buffer || buffer._ensoNormalized) return buffer;
  const numCh = buffer.numberOfChannels || 1;
  let maxAbs = 0;
  for (let c = 0; c < numCh; c++) {
    const ch = buffer.getChannelData(c);
    for (let i = 0; i < ch.length; i++) {
      const a = Math.abs(ch[i]);
      if (a > maxAbs) maxAbs = a;
    }
  }
  if (maxAbs > 0.0001) {
    const targetPeak = midi <= 72 ? 0.82 : Math.max(0.68, 0.82 - ((midi - 72) / 36) * 0.14);
    const normGain = Math.min(28.0, Math.max(1.0, targetPeak / maxAbs));
    if (normGain > 1.01) {
      for (let c = 0; c < numCh; c++) {
        const ch = buffer.getChannelData(c);
        for (let i = 0; i < ch.length; i++) ch[i] *= normGain;
      }
    }
    buffer._rawPeak = maxAbs;
    buffer._normalizedPeak = maxAbs * normGain;
    buffer._normGainApplied = normGain;
  }
  buffer._ensoNormalized = true;
  return buffer;
}

async function fetchAndDecodeSample(ctx, url) {
  try {
    const resp = await fetch(url);
    if (!resp.ok) return null;
    return await ctx.decodeAudioData(await resp.arrayBuffer());
  } catch (e) {
    return null;
  }
}

async function setPianoLibrary(libId) {
  if (!this.ctx) this.init();
  this.activePianoLibrary = libId;
  if (libId === 'salamander') {
    this.pianoSamples = this.pianoLibraries.salamander;
    return this.loadPianoSamples();
  }
  const targetMap = this.pianoLibraries[libId] || new Map();
  this.pianoLibraries[libId] = targetMap;
  this.pianoSamples = targetMap;
  if (targetMap.size > 0) return true;
  try {
    const libs = await (await fetch('samples/libraries.json')).json();
    const spec = libs[libId];
    if (!spec || !spec.zones) return false;
    await Promise.all(spec.zones.map(async (z) => {
      if (z.close) {
        const [cBuf, dBuf] = await Promise.all([
          this._fetchAndDecodeSample(z.close),
          this._fetchAndDecodeSample(z.decca)
        ]);
        if (cBuf) {
          normalizeNoteAudioBuffer(cBuf, z.midi);
          if (dBuf) normalizeNoteAudioBuffer(dBuf, z.midi);
          targetMap.set(
              z.midi, {v1: cBuf, v3: dBuf || cBuf, v5: cBuf, decca: dBuf});
        }
      } else if (z.file) {
        const buf = await this._fetchAndDecodeSample(z.file);
        if (buf) {
          normalizeNoteAudioBuffer(buf, z.midi);
          targetMap.set(z.midi, {v1: buf, v3: buf, v5: buf});
        }
      }
    }));
    return true;
  } catch (e) {
    return false;
  }
}

function loadPianoSamples() {
  if (this._pianoLoadPromise) return this._pianoLoadPromise;
  if (!this.ctx) this.init();
  if (typeof window !== 'undefined' && window.location &&
      ((window.location.protocol === 'file:' && !window.__ENSO_ALLOW_FILE_SAMPLES__) ||
       window.location.hash.includes('selftest=1'))) {
    return Promise.resolve(true);
  }

  this._pianoLoadPromise = (async () => {
    const priorityZones =
        SALAMANDER_ZONES.filter(z => z.midi >= 36 && z.midi <= 84);
    const outerZones = SALAMANDER_ZONES.filter(z => z.midi < 36 || z.midi > 84);
    const loadZone = async (zone, layers) => {
      const entry = this.pianoLibraries.salamander.get(zone.midi) || {};
      await Promise.all(layers.map(async (layer) => {
        if (entry[layer]) return;
        const buf = await this._fetchAndDecodeSample(
            `samples/piano/${zone.prefix}${layer}.flac`);
        if (buf) entry[layer] = normalizeNoteAudioBuffer(buf, zone.midi);
      }));
      if (entry.v1 || entry.v3 || entry.v5)
        this.pianoLibraries.salamander.set(zone.midi, entry);
    };
    await Promise.all([
      ...priorityZones.map(z => loadZone(z, ['v1'])),
      ...Object.entries(MECH_FILES).map(async ([k, url]) => {
        const buf = await this._fetchAndDecodeSample(url);
        if (buf) this.pianoMechSamples[k] = buf;
      })
    ]);
    Promise.all(outerZones.map(z => loadZone(z, ['v1']))).catch(() => {});
    return true;
  })();
  return this._pianoLoadPromise;
}

function findClosestPianoSample(engine, midiNote) {
  if (engine.pianoSamples && engine.pianoSamples.size > 0) {
    let bestMidi = null;
    let bestDist = Infinity;
    for (const sampleMidi of engine.pianoSamples.keys()) {
      const dist = Math.abs(midiNote - sampleMidi);
      if (dist < bestDist) {
        bestDist = dist;
        bestMidi = sampleMidi;
      }
    }
    if (bestMidi !== null) {
      const layers = engine.pianoSamples.get(bestMidi);
      const preferred =
          (engine.feltPianoConfig && engine.feltPianoConfig.forceLayer) || 'v1';
      const chosenLayer = layers[preferred] ?
          preferred :
          (layers.v1 ? 'v1' : (layers.v3 ? 'v3' : 'v5'));
      const buffer = layers[chosenLayer] || layers.v1 || layers.v3 || layers.v5;
      if (buffer) {
        const playbackRate = Math.pow(2, (midiNote - bestMidi) / 12);
        return {
          buffer,
          deccaBuffer: layers.decca || null,
          bestMidi,
          chosenLayer,
          playbackRate
        };
      }
    }
  }
  // Immediate AudioBuffer fallback if triggered before HTTP FLAC fetch
  // completes or on file://
  const rate = engine.ctx.sampleRate;
  const dur = 4.0;
  const len = Math.floor(rate * dur);
  const buffer = engine.ctx.createBuffer(2, len, rate);
  const freq = 440 * Math.pow(2, (midiNote - 69) / 12);
  const L = buffer.getChannelData(0), R = buffer.getChannelData(1);
  for (let i = 0; i < len; i++) {
    const t = i / rate;
    const env = Math.exp(-t * 1.4) * (1 - Math.exp(-t * 120));
    const feltThump =
        Math.exp(-t * 48) * Math.sin(2 * Math.PI * 115 * t) * 0.18;
    const sig =
        (Math.sin(2 * Math.PI * freq * t) +
         0.32 * Math.sin(2 * Math.PI * freq * 2.0006 * t) * Math.exp(-t * 2.2) +
         0.12 * Math.sin(2 * Math.PI * freq * 3.0018 * t) *
             Math.exp(-t * 3.8)) *
            env +
        feltThump;
    L[i] = sig * 0.5;
    R[i] = sig * 0.5;
  }
  normalizeNoteAudioBuffer(buffer, midiNote);
  return {buffer, bestMidi: midiNote, chosenLayer: 'v1', playbackRate: 1.0};
}

function triggerPianoSample(engine, {
  midiNote,
  velocity,
  now,
  tReleaseEnd,
  baseGain,
  envGain,
  shimmerTarget,
  bufferSources,
  internalNodes
}) {
  const match = findClosestPianoSample(engine, midiNote);
  if (!match || !match.buffer) return false;

  const cfg = engine.feltPianoConfig || {
    bodyWarmthHz: 240,
    bodyWarmthGainDb: 3.2,
    highShelfHz: 1850,
    highShelfCutDb: -11.5,
    makeupGain: 1.55,
    mechReleaseGain: 0.022
  };

  const src = engine.ctx.createBufferSource();
  src.buffer = match.buffer;
  src.playbackRate.setValueAtTime(match.playbackRate, now);

  const bodyEq =
      engine._makeFilter('peaking', cfg.bodyWarmthHz, 0.85);
  bodyEq.gain.value = cfg.bodyWarmthGainDb;
  const silkShelf =
      engine._makeFilter('highshelf', cfg.highShelfHz, 0.7);
  silkShelf.gain.value = cfg.highShelfCutDb;
  const sampleMakeup = engine.ctx.createGain();
  const baseMakeup = (typeof cfg.makeupGain === 'number') ? cfg.makeupGain : 1.55;
  const shelfCut = Math.min(0, Number(cfg.highShelfCutDb) || -11.5);
  const shelfCompDb = Math.max(0, (-5.0 - shelfCut) * 0.36);
  const shelfCompLinear = Math.pow(10, Math.min(5.0, shelfCompDb) / 20);
  const regLift = midiNote >= 58 ? (1.0 + Math.min(0.28, (midiNote - 58) * 0.008)) : 1.0;
  sampleMakeup.gain.value = baseMakeup * shelfCompLinear * regLift;
  src.connect(bodyEq);
  bodyEq.connect(silkShelf);
  silkShelf.connect(sampleMakeup);
  sampleMakeup.connect(envGain);

  src.start(now);
  src.stop(tReleaseEnd + 0.15);
  bufferSources.push(src);
  internalNodes.push(bodyEq, silkShelf, sampleMakeup);

  if (match.deccaBuffer) {
    const dSrc = engine.ctx.createBufferSource(),
          dGain = engine.ctx.createGain();
    dSrc.buffer = match.deccaBuffer;
    dSrc.playbackRate.setValueAtTime(match.playbackRate, now);
    dGain.gain.value = 0.58;
    dSrc.connect(dGain);
    dGain.connect(bodyEq);
    dSrc.start(now);
    dSrc.stop(tReleaseEnd + 0.15);
    bufferSources.push(dSrc);
    internalNodes.push(dGain);
  }

  // Subtle close-mic mechanical key/damper felt texture
  const mechKey = midiNote < 48 ? 'rel24' : (midiNote < 68 ? 'rel40' : 'rel56');
  const mechBuf =
      engine.pianoMechSamples[mechKey] || engine.pianoMechSamples.pedalD1;
  if (mechBuf) {
    const mechSrc = engine.ctx.createBufferSource();
    mechSrc.buffer = mechBuf;
    const mechGain = engine.ctx.createGain();
    mechGain.gain.value = Math.min(0.032, (cfg.mechReleaseGain || 0.022) * velocity);
    const mechLp = engine._makeFilter('lowpass', 1100, 0.7);
    mechSrc.connect(mechLp);
    mechLp.connect(mechGain);
    mechGain.connect(envGain);
    mechSrc.start(now);
    mechSrc.stop(Math.min(now + 1.5, tReleaseEnd));
    bufferSources.push(mechSrc);
    internalNodes.push(mechGain, mechLp);
  }
  return true;
}

// Attach to AudioEngine prototype if available
const attachToAudioEngine = (AE) => {
  if (!AE || !AE.prototype) return;
  AE.prototype._fetchAndDecodeSample = function(url) {
    return fetchAndDecodeSample(this.ctx, url);
  };
  AE.prototype.setPianoLibrary = setPianoLibrary;
  AE.prototype.loadPianoSamples = loadPianoSamples;
  AE.prototype._findClosestPianoSample = function(midiNote, velocity) {
    return findClosestPianoSample(this, midiNote, velocity);
  };
  AE.prototype._triggerPianoSample = function(opts) {
    return triggerPianoSample(this, opts);
  };
};

if (typeof AudioEngine !== 'undefined') {
  attachToAudioEngine(AudioEngine);
}

window.EnsoPianoSampler = {
  SALAMANDER_ZONES,
  MECH_FILES,
  normalizeNoteAudioBuffer,
  fetchAndDecodeSample,
  setPianoLibrary,
  loadPianoSamples,
  findClosestPianoSample,
  triggerPianoSample,
  attachToAudioEngine
};
})();
