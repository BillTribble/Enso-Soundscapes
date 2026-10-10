#!/usr/bin/env python3
"""Measure Enso Soundscapes audio mix levels, ducking, and headroom.

Uses Headless Google Chrome over the Chrome DevTools Protocol (CDP) to drive
an OfflineAudioContext in the real web application.
Loads and decodes genuine 48kHz 24-bit Salamander Grand Piano v3 FLAC samples
and renders isolated active RMS/peak levels for all 6 instruments across all 6
track profiles, and performs 3-pass ducking & compressor reduction tests.
"""

import asyncio
import json
import math
import os
import re
import subprocess
import sys
import tempfile
import time
import websockets

WORKSPACE_DIR = os.path.dirname(os.path.abspath(__file__))
INDEX_HTML = os.path.join(WORKSPACE_DIR, 'index.html')


async def run_measurement():
  with tempfile.TemporaryDirectory() as td:
    proc = subprocess.Popen([
        '/usr/bin/google-chrome',
        '--headless',
        '--disable-gpu',
        '--no-sandbox',
        f'--user-data-dir={td}',
        '--allow-file-access-from-files',
        '--remote-debugging-port=0',
        '--noerrdialogs',
        '--no-first-run',
        '--ozone-platform=headless',
        '--ozone-override-screen-size=800,600',
        '--use-angle=swiftshader-webgl',
        f'file://{INDEX_HTML}#measure=1'
    ], stderr=subprocess.PIPE, stdout=subprocess.DEVNULL, text=True)

    ws_url = None
    deadline = time.time() + 15
    while time.time() < deadline:
      line = proc.stderr.readline()
      m = re.search(r'ws://127\.0\.0\.1:\d+/devtools/browser/[a-zA-Z0-9-]+', line)
      if m:
        ws_url = m.group(0)
        break

    if not ws_url:
      proc.terminate()
      raise RuntimeError('Failed to obtain DevTools WebSocket URL from Chrome')

    async with websockets.connect(ws_url) as ws:
      await ws.send(json.dumps({'id': 1, 'method': 'Target.getTargets'}))
      targets = json.loads(await ws.recv())
      page_target = [t for t in targets['result']['targetInfos'] if t['type'] == 'page'][0]
      await ws.send(json.dumps({'id': 2, 'method': 'Target.attachToTarget', 'params': {'targetId': page_target['targetId'], 'flatten': True}}))
      att_resp = json.loads(await ws.recv())
      session_id = att_resp['params']['sessionId']

      js_code = '''
      (async () => {
          window.__ENSO_ALLOW_FILE_SAMPLES__ = true;
          for (let i = 0; i < 60; i++) {
              if (typeof AudioEngine !== 'undefined' && window.enoApp) break;
              await new Promise(r => setTimeout(r, 50));
          }

          // Preload Salamander piano library into memory
          const dummyEngine = new AudioEngine();
          dummyEngine.init(new OfflineAudioContext(2, 44100, 44100));
          await dummyEngine.loadPianoSamples();
          const sharedSamples = dummyEngine.pianoLibraries.salamander;

          function seededPrng(seed = 42) {
              let s = seed;
              return function() {
                  s = (s * 1664525 + 1013904223) % 4294967296;
                  return s / 4294967296;
              };
          }

          async function renderVoice(trackId, voiceId, midi, vel = 0.70) {
              Math.random = seededPrng(42);
              const sampleRate = 44100;
              const dur = 4.0;
              const ctx = new OfflineAudioContext(2, Math.floor(sampleRate * dur), sampleRate);
              const engine = new AudioEngine();
              engine.pianoSamples = sharedSamples;
              engine.pianoLibraries = { salamander: sharedSamples };
              engine.pianoSamplesLoaded = true;
              engine.init(ctx);
              engine.setTrackStyle(trackId);
              
              const gain = (engine.baseVoiceGains && engine.baseVoiceGains[voiceId]) || (voiceId === 'piano' ? 2.0 : 0.65);
              engine.triggerVoice(voiceId, midi, vel, 0, gain, 3.0);

              const renderedBuffer = await ctx.startRendering();
              const cL = renderedBuffer.getChannelData(0);
              const cR = renderedBuffer.getChannelData(1);
              const rLen = cL.length;

              let peak = 0;
              let sumSq = 0;
              let activeCount = 0;
              const actThresh = 0.001;

              for (let i = 0; i < rLen; i++) {
                  const l = cL[i], r = cR[i];
                  const mag = Math.max(Math.abs(l), Math.abs(r));
                  if (mag > peak) peak = mag;
                  const pwr = (l * l + r * r) * 0.5;
                  if (mag >= actThresh) {
                      sumSq += pwr;
                      activeCount++;
                  }
              }

              const activeRms = activeCount > 0 ? Math.sqrt(sumSq / activeCount) : 0;
              const rmsDb = activeRms > 0 ? 20 * Math.log10(activeRms) : -100;
              const peakDb = peak > 0 ? 20 * Math.log10(peak) : -100;

              return {
                  peakDb: Number(peakDb.toFixed(2)),
                  rmsDb: Number(rmsDb.toFixed(2))
              };
          }

          const tracks = ['thursday', 'reflection', 'installations', 'apollo_shimmer', 'mixing_colours', 'discreet_loops'];
          const notes = { pad: 55, piano: 60, bell: 74, choir: 67, tape: 62, drone: 43 };
          const allResults = {};
          for (const t of tracks) {
              allResults[t] = {};
              for (const [v, m] of Object.entries(notes)) {
                  allResults[t][v] = await renderVoice(t, v, m);
              }
          }

          // Ducking test on Thursday:
          // Pass 1: synths only triggered at t=0
          // Pass 2: piano only triggered at t=1.2
          // Pass 3: synths at t=0 + piano at t=1.2
          async function renderPass(includeSynths, includePiano) {
              Math.random = seededPrng(42);
              const sampleRate = 44100;
              const dur = 4.5;
              const ctx = new OfflineAudioContext(2, Math.floor(sampleRate * dur), sampleRate);
              const engine = new AudioEngine();
              engine.pianoSamples = sharedSamples;
              engine.pianoLibraries = { salamander: sharedSamples };
              engine.pianoSamplesLoaded = true;
              engine.init(ctx);
              engine.setTrackStyle('thursday');

              if (includeSynths) {
                  const sNotes = { pad: 55, bell: 74, choir: 67, tape: 62, drone: 43 };
                  for (const [v, m] of Object.entries(sNotes)) {
                      const g = (engine.baseVoiceGains && engine.baseVoiceGains[v]) || 0.65;
                      engine.triggerVoice(v, m, 0.60, 0, g, 4.0, 0.0);
                  }
              }

              if (includePiano) {
                  const pg = (engine.baseVoiceGains && engine.baseVoiceGains.piano) || 2.0;
                  engine.triggerVoice('piano', 60, 0.70, 0, pg, 3.0, 1.2);
              }

              const renderedBuffer = await ctx.startRendering();
              return {
                  L: renderedBuffer.getChannelData(0),
                  R: renderedBuffer.getChannelData(1),
                  compressorReduction: engine.nodes.compressor ? engine.nodes.compressor.reduction : 0
              };
          }

          const synthPass = await renderPass(true, false);
          const pianoPass = await renderPass(false, true);
          const combinedPass = await renderPass(true, true);

          const sampleRate = 44100;
          const startIdx = Math.floor(1.2 * sampleRate);
          const endIdx = Math.floor(3.2 * sampleRate);
          const numSamples = endIdx - startIdx;

          let synthSumSq = 0;
          let diffSumSq = 0;
          let combPeak = 0;
          let clippedSamples = 0;

          for (let i = startIdx; i < endIdx; i++) {
              const sL = synthPass.L[i], sR = synthPass.R[i];
              synthSumSq += (sL * sL + sR * sR) * 0.5;

              const cL = combinedPass.L[i], cR = combinedPass.R[i];
              const pL = pianoPass.L[i], pR = pianoPass.R[i];
              const diffL = cL - pL;
              const diffR = cR - pR;
              diffSumSq += (diffL * diffL + diffR * diffR) * 0.5;
          }

          for (let i = 0; i < combinedPass.L.length; i++) {
              const cL = combinedPass.L[i], cR = combinedPass.R[i];
              const mag = Math.max(Math.abs(cL), Math.abs(cR));
              if (mag > combPeak) combPeak = mag;
              if (mag >= 1.0) clippedSamples++;
          }

          const synthRms = Math.sqrt(synthSumSq / numSamples);
          const diffRms = Math.sqrt(diffSumSq / numSamples);
          const synthRmsDb = 20 * Math.log10(synthRms);
          const diffRmsDb = 20 * Math.log10(diffRms);
          const duckingDb = synthRmsDb - diffRmsDb;
          const combPeakDb = 20 * Math.log10(combPeak);

          // Verify uniform preset voice gains & track style voice trims
          const dummyAE = new AudioEngine();
          const baseGains = dummyAE.baseVoiceGains || {};
          const trackStyleVoiceTrims = {};
          if (window.EnsoTrackStyles && window.EnsoTrackStyles.TRACK_STYLE_PROFILES) {
              for (const [k, prof] of Object.entries(window.EnsoTrackStyles.TRACK_STYLE_PROFILES)) {
                  trackStyleVoiceTrims[k] = prof.voiceTrim;
              }
          }
          const presetVoiceGains = {};
          if (window.ENO_DATA && window.ENO_DATA.PRESETS) {
              for (const [k, p] of Object.entries(window.ENO_DATA.PRESETS)) {
                  presetVoiceGains[k] = {};
                  if (p.voices) {
                      for (const [v, cfg] of Object.entries(p.voices)) {
                          presetVoiceGains[k][v] = cfg.gain;
                      }
                  }
              }
          }

          return {
              tracks: allResults,
              ducking: {
                  synth_only_rms_db: Number(synthRmsDb.toFixed(3)),
                  synth_in_mix_rms_db: Number(diffRmsDb.toFixed(3)),
                  ducking_db: Number(duckingDb.toFixed(4)),
                  compressor_reduction_db: combinedPass.compressorReduction || 0,
                  combined_peak_linear: Number(combPeak.toFixed(4)),
                  combined_peak_db: Number(combPeakDb.toFixed(2)),
                  clipped_samples: clippedSamples
              },
              baseGains,
              trackStyleVoiceTrims,
              presetVoiceGains
          };
      })()
      '''
      await ws.send(json.dumps({
          'id': 3,
          'sessionId': session_id,
          'method': 'Runtime.evaluate',
          'params': {
              'expression': js_code,
              'awaitPromise': True,
              'returnByValue': True
          }
      }))
      while True:
        msg = json.loads(await ws.recv())
        if msg.get('id') == 3:
          result = msg['result']['result']['value']
          break

    proc.terminate()
    try:
      proc.wait(timeout=5)
    except:
      proc.kill()

    return result


def main():
  print('Running Enso Soundscapes Audio Mix & Ducking Measurement...')
  t0 = time.time()
  data = asyncio.run(run_measurement())
  elapsed = time.time() - t0
  print(f'Audio measurement completed in {elapsed:.2f}s.\n')

  # 1. Print Raw JSON
  print('=== RAW MEASUREMENT DATA (JSON) ===')
  print(json.dumps(data, indent=2))
  print('====================================\n')

  # 2. Markdown Table for Tracks & Voices
  tracks = ['thursday', 'reflection', 'installations', 'apollo_shimmer', 'mixing_colours', 'discreet_loops']
  voices = ['pad', 'piano', 'bell', 'choir', 'tape', 'drone']

  print('### Isolated Voice Levels (RMS & Peak in dBFS)')
  print('| Track Profile | Pad (RMS / Peak) | Piano (RMS / Peak) | Bell (RMS / Peak) | Choir (RMS / Peak) | Tape (RMS / Peak) | Drone (RMS / Peak) |')
  print('| :--- | :--- | :--- | :--- | :--- | :--- | :--- |')
  for t in tracks:
    row = [t]
    for v in voices:
      v_data = data['tracks'][t][v]
      row.append(f"{v_data['rmsDb']:.2f} / {v_data['peakDb']:.2f}")
    print('| ' + ' | '.join(row) + ' |')
  print()

  # 3. Ducking & Headroom Table
  d = data['ducking']
  print('### Master Bus Ducking, Compressor Reduction & Headroom')
  print('| Metric | Measured Value | Target Criterion | Status |')
  print('| :--- | :--- | :--- | :--- |')

  ducking_ok = abs(d['ducking_db']) < 0.2
  comp_ok = abs(d['compressor_reduction_db']) < 0.1
  peak_ok = d['combined_peak_linear'] < 0.95
  clip_ok = d['clipped_samples'] == 0

  print(f"| Synth-Only RMS | `{d['synth_only_rms_db']:.3f} dBFS` | Reference | OK |")
  print(f"| Synth in Mix (Diff) RMS | `{d['synth_in_mix_rms_db']:.3f} dBFS` | Near Reference | OK |")
  print(f"| Master Ducking (`ducking_db`) | `{d['ducking_db']:+.4f} dB` | `abs(ducking_db) < 0.2 dB` | {'PASS' if ducking_ok else 'FAIL'} |")
  print(f"| Compressor Reduction | `{d['compressor_reduction_db']:.4f} dB` | `abs(red) < 0.1 dB` (0.00 dB) | {'PASS' if comp_ok else 'FAIL'} |")
  print(f"| Combined Peak (Linear) | `{d['combined_peak_linear']:.4f}` | `< 0.95` (Peak Headroom > 0.45 dB) | {'PASS' if peak_ok else 'FAIL'} |")
  print(f"| Combined Peak (dBFS) | `{d['combined_peak_db']:.2f} dBFS` | `< -0.45 dBFS` | {'PASS' if peak_ok else 'FAIL'} |")
  print(f"| Clipped Samples | `{d['clipped_samples']}` | `0` (Zero clipping) | {'PASS' if clip_ok else 'FAIL'} |")
  print()

  # 4. Assertions
  assert ducking_ok, f"Ducking assertion failed: {d['ducking_db']} dB"
  assert comp_ok, f"Compressor reduction assertion failed: {d['compressor_reduction_db']} dB"
  assert peak_ok, f"Peak linear assertion failed: {d['combined_peak_linear']}"
  assert clip_ok, f"Clipped samples assertion failed: {d['clipped_samples']}"

  # Assert track style voice trims are all 1.0 (calibrated via engine synthesis, no per-track trim overrides)
  for t, trims in data.get('trackStyleVoiceTrims', {}).items():
    for v, val in trims.items():
      assert abs(val - 1.0) < 1e-4, f"Track style {t} voiceTrim.{v} is {val}, expected 1.0"

  # Assert preset voice gains are uniform across all presets (0.65 synths, 2.0 piano)
  for p_name, p_gains in data.get('presetVoiceGains', {}).items():
    for v, val in p_gains.items():
      expected_gain = 2.0 if v == 'piano' else 0.65
      assert abs(val - expected_gain) < 1e-4, f"Preset {p_name} voice {v} gain is {val}, expected {expected_gain}"

  # Assert uniform gains & levels across all tracks
  for t in tracks:
    piano_rms = data['tracks'][t]['piano']['rmsDb']
    assert -20.4 <= piano_rms <= -19.6, f"Piano RMS out of range on {t}: {piano_rms}"
    synth_rmss = []
    for v in ['pad', 'bell', 'choir', 'tape', 'drone']:
      v_rms = data['tracks'][t][v]['rmsDb']
      assert -22.9 <= v_rms <= -22.1, f"{v} RMS out of range on {t}: {v_rms}"
      synth_rmss.append(v_rms)
    synth_mean = sum(synth_rmss) / len(synth_rmss)
    piano_emphasis = piano_rms - synth_mean
    assert 2.0 <= piano_emphasis <= 3.0, f"Piano emphasis out of range on {t}: {piano_emphasis}"

  print('ALL AUDIO MIX MEASUREMENTS AND DUCKING ASSERTIONS PASSED (ALL_AUDIO_MEASUREMENTS_PASSED)')


if __name__ == '__main__':
  main()
