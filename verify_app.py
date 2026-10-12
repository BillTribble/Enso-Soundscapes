#!/usr/bin/env python3
"""End-to-end verification and screenshot suite for Brian Eno Aleatoric Soundscape Studio."""

from concurrent.futures import ThreadPoolExecutor
import glob
import html
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import time
import urllib.request

APP_DIR = os.path.dirname(os.path.abspath(__file__))
ARTIFACT_DIR = os.environ.get(
    'ARTIFACT_DIR',
    '/usr/local/google/home/tribble/.gemini/jetski/brain/ed99bfaa-cf62-4c45-bd95-a3ce78cfcab8',
)
SERVER_URL = 'http://bat.c.googlers.com:8094'
LOCAL_URL = 'http://127.0.0.1:8094'
FILE_URL = f'file://{APP_DIR}/index.html'
CHROME_BIN = '/usr/bin/google-chrome'


def check_http_server():
  """Verify two-pass HTTP 200 readiness gate and all served static + Salamander FLAC sample assets."""
  try:
    with urllib.request.urlopen(f'{LOCAL_URL}/api/selftest-release', timeout=2) as r:
      pass
  except Exception:
    pass
  assets = [
      '/',
      '/manifest.webmanifest',
      '/sw.js',
      '/icons/icon.svg',
      '/icons/icon-192.png',
      '/icons/icon-512.png',
      '/icons/apple-touch-icon.png',
      '/css/tokens.css',
      '/css/styles.css',
      '/css/mixer-dials.css',
      '/css/patch-storage.css',
      '/css/phrases.css',
      '/js/presets.js',
      '/js/audio-engine.js',
      '/js/piano-sampler.js',
      '/js/phrase-engine.js',
      '/js/probability-engine.js',
      '/js/visualizer.js',
      '/js/voice-cards.js',
      '/js/app.js',
      '/js/pwa-media.js',
      '/js/patch-randomizer.js',
      '/js/patch-storage.js',
      '/js/mixer-dials.js',
      '/js/selftest-runner.js',
      '/saved-patches.json',
      '/api/patches',
      '/fonts/GoogleSymbols.ttf',
      '/fonts/InterVariable.woff2',
      '/fonts/GoogleSansCode.ttf',
      '/samples/piano/manifest.json',
      '/samples/piano/C4v1.flac',
      '/samples/piano/C5v1.flac',
      '/samples/piano/C6v1.flac',
      '/samples/piano/A3v1.flac',
      '/samples/piano/Ds4v1.flac',
      '/samples/piano/Fs4v1.flac',
      '/samples/piano/pedalD1.flac',
      '/samples/piano/rel40.flac',
  ]
  for attempt in (1, 2):
    with urllib.request.urlopen(f'{SERVER_URL}/', timeout=5) as resp:
      body = resp.read().decode('utf-8', errors='replace')
      assert resp.status == 200, f'Pass {attempt} HTTP status {resp.status}'
      assert 'id="app-root"' in body, 'Missing id="app-root" shell marker'
      assert 'Failed to connect to the backend' not in body
    if attempt == 1:
      time.sleep(0.5)

  for path in assets[1:]:
    with urllib.request.urlopen(f'{SERVER_URL}{path}', timeout=5) as resp:
      data = resp.read()
      assert resp.status == 200, f'Asset {path} failed with {resp.status}'
      assert len(data) > 100, f'Asset {path} unexpectedly empty'
      if path.endswith('.flac'):
        assert data[:4] == b'fLaC', f'Invalid FLAC header for {path}'

  flac_files = sorted(glob.glob(os.path.join(APP_DIR, 'samples/piano/*.flac')))
  assert len(flac_files) >= 35, f'Expected >=35 Salamander FLAC files, found {len(flac_files)}'
  for fp in flac_files:
    with open(fp, 'rb') as f:
      hdr = f.read(4)
      assert hdr == b'fLaC', f'Corrupt FLAC file {fp}'

  # Strict 800 line ceiling check across all source files
  all_src_files = []
  for ext in ('*.html', '*.py', 'css/*.css', 'js/*.js'):
    all_src_files.extend(glob.glob(os.path.join(APP_DIR, ext)))
  for sf in all_src_files:
    with open(sf, 'r', encoding='utf-8', errors='replace') as f:
      line_count = sum(1 for _ in f)
      assert line_count < 800, f'File {sf} exceeds 800-line ceiling ({line_count} lines)'

  # Verify desktop-layout-backup preserves the pre-change desktop layout
  backup_dir = os.path.join(APP_DIR, 'desktop-layout-backup')
  for rel_path in ('index.html', 'css/styles.css', 'css/mixer-dials.css', 'css/phrases.css', 'css/patch-storage.css', 'css/slider-styles.css', 'js/app.js'):
    bp = os.path.join(backup_dir, rel_path)
    assert os.path.exists(bp) and os.path.getsize(bp) > 100, f'Missing desktop backup file: {bp}'

  print(f'1. Live HTTP server, line ceilings (<800), desktop-layout-backup, & {len(flac_files)} FLAC samples verified (200 OK).')


def _run_chrome_dom_dump(window_size):
  with tempfile.TemporaryDirectory() as temp_dir:
    cmd = [
        CHROME_BIN,
        '--headless',
        '--disable-gpu',
        '--no-sandbox',
        f'--user-data-dir={temp_dir}',
        '--autoplay-policy=no-user-gesture-required',
        '--enable-logging=stderr',
        f'--window-size={window_size}',
        '--virtual-time-budget=25',
        '--dump-dom',
        f'{FILE_URL}#selftest=1',
    ]
    return subprocess.run(
        cmd, capture_output=True, text=True, timeout=20, check=False
    )


def run_browser_selftest():
  """Execute headless Chrome DOM + Web Audio + Salamander Felt Piano + Dials/Faders self-test."""
  proc = _run_chrome_dom_dump('1440,940')
  assert proc.returncode == 0, f'Chrome exited {proc.returncode}: {proc.stderr}'

  for line in proc.stderr.splitlines():
    if 'Uncaught' in line or ('CONSOLE' in line and 'ERROR' in line and 'frame-ancestors' not in line):
      raise AssertionError(f'Browser console error detected: {line}')

  match = re.search(r'data-selftest="([^"]+)"', proc.stdout)
  assert match, 'Missing data-selftest attribute on <body>'
  payload = json.loads(html.unescape(match.group(1)))

  assert payload.get('ok') is True, f'Self-test failed: {payload}'
  assert abs(payload['attack'] - 4.5) < 0.01, f'Unexpected attack: {payload}'
  assert abs(payload['release'] - 11.2) < 0.01, f'Unexpected release: {payload}'
  assert payload['cutoff'] == 1650, f'Unexpected cutoff: {payload}'
  assert abs(payload['resonance'] - 5.8) < 0.01, f'Unexpected resonance: {payload}'
  assert abs(payload['reverbMix'] - 0.76) < 0.01, f'Unexpected reverbMix: {payload}'
  assert abs(payload['shimmer'] - 0.72) < 0.01, f'Unexpected shimmer: {payload}'
  assert abs(payload['delayMix'] - 0.49) < 0.01, f'Unexpected delayMix: {payload}'
  assert payload['activeNotes'] >= 4, f'Expected >=4 active voices: {payload}'
  assert payload['eventsLogged'] >= 6, f'Expected >=6 gate events: {payload}'
  assert payload['voicesCount'] == 6, f'Expected 6 prime-cycle voices: {payload}'
  assert payload.get('voiceGainSlidersCount') == 6, f'Expected 6 instrument volume controls: {payload}'
  assert (
      payload.get('voiceCutoffSlidersCount') == 6
  ), f'Expected 6 per-voice cutoff controls: {payload}'
  assert (
      payload.get('voiceResonanceSlidersCount') == 6
  ), f'Expected 6 per-voice resonance controls: {payload}'
  assert (
      payload.get('voiceReverbSlidersCount') == 0
  ), f'Expected 0 per-voice reverb controls: {payload}'
  assert (
      payload.get('voiceDelaySlidersCount') == 0
  ), f'Expected 0 per-voice delay controls: {payload}'
  assert (
      payload.get('masterReverbAndDelayShared') is True
  ), f'Expected shared master reverb and delay: {payload}'
  assert (
      payload.get('audioLatencyHint') == 'playback'
  ), f'Expected playback latency hint: {payload}'
  assert (
      payload.get('noScriptProcessorNode') is True
  ), f'Expected no ScriptProcessorNode: {payload}'
  assert (
      payload.get('carrierOscHz') == 1.0
  ), f'Expected 1.0 Hz carrier oscillator: {payload}'
  assert (
      payload.get('voiceFiltersConnected') == 6
  ), f'Expected 6 per-voice resonant filters connected: {payload}'
  assert (
      payload.get('pianoReverbCleanVerified') is True
  ), f'Expected clean piano reverb/delay verified: {payload}'
  assert (
      payload.get('bloomTextRemoved') is True
  ), f'Expected "Bloom" text removed from voice pluck button: {payload}'
  assert (
      payload.get('envModeToggleRemoved') is True
  ), f'Expected data-env-mode toggle removed: {payload}'
  assert (
      payload.get('voiceGlobalsPreservedAcrossTracks') is True
  ), f'Expected voice gains and filters preserved across tracks: {payload}'
  assert payload.get('voiceReleaseSlidersCount') == 6, f'Expected 6 per-voice release controls: {payload}'
  assert payload.get('voiceReleaseSyncVerified') is True, f'Expected per-voice release sync verified: {payload}'
  assert payload.get('voiceOctaveSlidersCount') == 6, f'Expected 6 per-voice octave controls: {payload}'
  assert payload.get('voiceOctaveButtonsCount') == 12, f'Expected 12 per-voice octave stepper buttons: {payload}'
  assert payload.get('voiceOctaveSyncVerified') is True, f'Expected per-voice octave (-4..+4) sync verified: {payload}'
  assert payload.get('keyLockedBadgesRemoved') is True, f'Expected key-locked badges removed: {payload}'
  assert payload.get('defaultControlStyle') == 'dials', f'Expected default control style to be dials: {payload}'
  assert payload.get('settingsCogPresent') is True, f'Expected Settings cog and crossfade popover present: {payload}'
  assert payload.get('crossfadeWorks') is True, f'Expected Piano vs. All other sounds crossfade to work: {payload}'
  assert (
      payload.get('voiceBalanceGlobalAcrossTracks') is True
  ), f'Expected Voice balance to be global across all tracks: {payload}'
  assert payload.get('rotaryDialsCount', 0) >= 34, f'Expected >=34 rotary dial widgets: {payload}'
  assert payload.get('minimalOutsideEncoderOnly') is True, f'Expected minimal outside-encoder-only dials: {payload}'
  assert payload.get('dialSmallAndLabelRight') is True, f'Expected >=40px dials with label to right: {payload}'
  assert payload.get('dialWidthPx', 0) >= 40, f'Expected dialWidthPx >= 40: {payload}'
  assert payload.get('allDialsMin40Px') is True, f'Expected allDialsMin40Px=True: {payload}'
  assert payload.get('toggleSwitchTapTargetMin40') is True, f'Expected toggleSwitchTapTargetMin40=True: {payload}'
  assert payload.get('toggleSwitchVisualHeightPreserved') is True, f'Expected toggleSwitchVisualHeightPreserved=True (24px): {payload}'
  assert payload.get('minTouchTargetsVerified') is True, f'Expected all interactive elements >= 40x40px on desktop, found: {payload.get("smallTouchTargets")}'
  assert abs(payload.get('pianoDefaultGain', 0) - 2.00) < 0.02, f'Expected 200% (2.00) default piano gain: {payload}'
  assert abs(payload.get('pianoSliderMax', 0) - 5.00) < 0.02, f'Expected 500% (5.00) max piano slider: {payload}'
  assert payload.get('allPresetsPiano200') is True, f'Expected all presets to default piano to 200%: {payload}'
  assert (
      payload.get('visibleVoiceLevelsUnDucked') is True
  ), f'Expected un-ducked visible voice levels: {payload}'
  assert abs(payload.get('pianoBusGain', 0) - 5.00) < 0.02, f'Unexpected pianoBusGain at 500%: {payload}'
  assert abs(payload.get('pianoProbGainMax', 0) - 5.00) < 0.02, f'Unexpected pianoProbGainMax at 500%: {payload}'
  assert payload.get('feltLpRemoved') is True, f'Expected lowpass removed from Felt Piano: {payload}'
  assert 'Salamander Grand Piano v3' in payload.get('feltPianoLibrary', ''), f'Missing Salamander Felt Piano config: {payload}'
  assert payload.get('feltPianoHighShelfDb') == -11.5, f'Unexpected Felt Piano EQ shelf: {payload}'
  assert payload.get('pianoSamplesLoaded') is True, f'Expected pianoSamplesLoaded=True: {payload}'
  assert payload.get('pianoSampleCount', 0) >= 15, f'Expected >=15 piano samples: {payload}'
  assert payload.get('sampledPianoTriggered') is True, f'Expected sampledPianoTriggered=True: {payload}'
  assert payload.get('pianoAttackExempt') is True, f'Expected pianoAttackExempt=True: {payload}'
  assert payload.get('pianoRuntimeBuffersNormalized') is True, f'Expected pianoRuntimeBuffersNormalized=True: {payload}'
  assert abs(payload.get('pianoMakeupGain', 0) - 1.55) < 0.02, f'Expected pianoMakeupGain==1.55: {payload}'
  assert payload.get('pianoStemFilterOpen') is True, f'Expected pianoStemFilterOpen=True: {payload}'
  assert payload.get('crossfade90BoostVerified') is True, f'Expected crossfade90BoostVerified=True: {payload}'
  assert payload['pillTabRadius'] in ('4px', '12px', '9999px'), f'Expected pill radius: {payload}'
  assert payload['cardBorderWidth'] == '0px', f'Expected 0px card border: {payload}'
  assert payload['cardBoxShadow'] == 'none', f'Expected none card box-shadow: {payload}'
  assert payload.get('phraseEnginePresent') is True, f'Expected phraseEnginePresent: {payload}'
  assert payload.get('phraseGateControlsPresent') is True, f'Expected all 8 phrase & chord gate controls present: {payload}'
  assert payload.get('defaultOutcomeIsPhrasePlays') is True, f'Expected defaultOutcomeIsPhrasePlays: {payload}'
  assert payload.get('chanceSimulationVerified') is True, f'Expected phrase chance simulation verified: {payload}'
  assert payload.get('startOnlyDiceMinTwoVerified') is True, f'Expected start-only dice min 2+ notes verified: {payload}'
  assert payload.get('uniquePhraseSignatures') == 6, f'Expected 6 unique phrase signatures: {payload}'
  assert payload.get('phraseTypesCount') == 3, f'Expected 3 phrase types: {payload}'
  assert payload.get('maxChordInstrumentsPerTrack') == 1, f'Expected 1 max chord instrument: {payload}'
  assert payload.get('hasPianoAndNonPianoChords') is True, f'Expected piano and non-piano chord owners: {payload}'
  assert payload.get('mutualExclusionHolds') is True, f'Expected mutual exclusion between piano and other chords: {payload}'
  assert payload.get('outOfKeyNotesCount') == 0, f'Expected 0 out-of-key notes: {payload}'
  assert payload.get('sunlitAtriumLfoVerified') is True, f'Expected Sunlit Atrium 3m LFO verified: {payload}'
  assert payload.get('octaveShiftSimulationVerified') is True, f'Expected octaveShiftSimulationVerified=True: {payload}'
  assert payload.get('downwardOctaveCapVerified') is True, f'Expected downwardOctaveCapVerified=True (never go down 2 octaves): {payload}'
  assert payload.get('topBarBadgeRemoved') is True, f'Expected top-bar album badge removed: {payload}'
  assert payload.get('topBarTabsLabels') == ['Studio', 'Scale', 'Methods'], f'Expected top-bar tabs [Studio, Scale, Methods]: {payload}'
  assert payload.get('topBarPickerCentered') is True, f'Expected top-bar picker centered horizontally: {payload}'
  assert payload.get('topBarScrollBgVerified') is True, f'Expected top-bar scroll background verified: {payload}'
  assert payload.get('bloomHintDelayMs') == 20000, f'Expected 20000ms (20s) bloom hint timeout: {payload}'
  assert payload.get('bloomHintDisappearsVerified') is True, f'Expected bloom hint pill to disappear after timeout: {payload}'
  assert payload.get('studioCardTitles') == [
      'Loop orbits & spectrum field',
      'Piano phrases & harmonic key lock',
      'Voices',
      'Whole-mix envelope',
      'Master filter',
      'Reverb & tape delay',
  ], f'Unexpected Studio card titles: {payload}'
  assert payload.get('removedStudioBadges') is True, f'Expected Independent prime loop lengths and +12st octave loop badges removed: {payload}'
  assert payload.get('fadeVoicesBtnRemoved') is True, f'Expected #btn-fade-voices and priority_high removed: {payload}'
  assert payload.get('bgKeepAliveDurationSec', 0) >= 25, f'Expected bgKeepAliveDurationSec >= 25: {payload}'
  assert payload.get('bgAudioBridgeReady') is True, f'Expected bgAudioBridgeReady=True: {payload}'
  assert payload.get('bgSingleOutputNoResample') is True, f'Expected bgSingleOutputNoResample=True: {payload}'
  assert payload.get('brandTitleText') == 'Enso Soundscapes', f'Expected brandTitleText=="Enso Soundscapes": {payload}'
  assert payload.get('documentTitleText') == 'Enso Soundscapes', f'Expected documentTitleText=="Enso Soundscapes": {payload}'
  assert payload.get('researchBadgesRemoved') is True, f'Expected research homage badges removed: {payload}'
  assert payload.get('researchCardBadgesMatchPresets') is True, f'Expected research card badges to match preset names: {payload}'
  assert payload.get('researchCardBadges') == ['Luminous Drift', 'Sunlit Atrium', 'Cathedral Glass', 'Weightless Orbit', 'Felt & Mist', 'Moss & Reel'], f'Unexpected research card badges: {payload}'
  assert payload.get('sparkleIconRemoved') is True, f'Expected sparkle icon removed: {payload}'
  assert 'Aleatoric' not in payload.get('brandTitleText', ''), f'Expected Aleatoric removed from brand-title: {payload}'
  assert 'Aleatoric' not in payload.get('documentTitleText', ''), f'Expected Aleatoric removed from document.title: {payload}'
  assert payload.get('defaultPresetId') == 'thursday', f'Expected defaultPresetId=="thursday": {payload}'
  assert payload.get('firstPresetId') == 'thursday', f'Expected firstPresetId=="thursday": {payload}'
  assert abs(payload.get('phraseVariationChanceDefault', 0) - 0.55) < 0.01, f'Expected phraseVariationChanceDefault==0.55: {payload}'
  assert payload.get('pwaManifestLinked') is True, f'Expected pwaManifestLinked=True: {payload}'
  assert payload.get('appleTouchIconLinked') is True, f'Expected appleTouchIconLinked=True: {payload}'
  assert payload.get('bgKeepAlivePresent') is True, f'Expected bgKeepAlivePresent=True: {payload}'
  assert payload.get('canvasRenderedPixels') is True, f'Expected canvasRenderedPixels=True: {payload}'
  assert payload.get('mobileTopBarTwoRows') is True, f'Expected mobileTopBarTwoRows=True: {payload}'
  assert payload.get('mobileZeroHorizontalOverflow') is True, f'Expected mobileZeroHorizontalOverflow=True: {payload}'
  assert payload.get('patchSaveBtnPresent') is True, f'Expected patchSaveBtnPresent=True: {payload}'
  assert payload.get('newPatchBtnPresent') is True, f'Expected newPatchBtnPresent=True: {payload}'
  assert payload.get('newPatchBtnIcon') == 'shuffle', f'Expected newPatchBtnIcon=="shuffle": {payload}'
  assert payload.get('patchStorageRoundtripVerified') is True, f'Expected patchStorageRoundtripVerified=True: {payload}'
  assert payload.get('voiceBalanceSavedOnSavePatchVerified') is True, f'Expected voiceBalanceSavedOnSavePatchVerified=True: {payload}'
  assert payload.get('customPatchCreationVerified') is True, f'Expected customPatchCreationVerified=True: {payload}'
  assert payload.get('patchRandomizerVerified') is True, f'Expected patchRandomizerVerified=True: {payload}'
  assert payload.get('topBarVolumeDialPresent') is True, f'Expected topBarVolumeDialPresent=True: {payload}'
  assert payload.get('topBarVolumeSyncVerified') is True, f'Expected topBarVolumeSyncVerified=True: {payload}'
  assert (
      payload.get('voiceWaveformsCount') == 6
  ), f'Expected 6 per-voice waveform canvases: {payload}'
  assert (
      payload.get('voiceWaveformsUnderDialsVerified') is True
  ), f'Expected voiceWaveformsUnderDialsVerified=True: {payload}'
  assert (
      payload.get('voiceWaveformsAlignedRowVerified') is True
  ), f'Expected voiceWaveformsAlignedRowVerified=True: {payload}'
  assert (
      payload.get('voiceWaveformsThemeVerified') is True
  ), f'Expected voiceWaveformsThemeVerified=True: {payload}'
  assert (
      payload.get('envelopeTopOnlyLightBlueVerified') is True
  ), f'Expected envelopeTopOnlyLightBlueVerified=True: {payload}'
  assert (
      payload.get('autoThemeModeVerified') is True
  ), f'Expected autoThemeModeVerified=True: {payload}'
  assert (
      payload.get('defaultThemeMode') == 'auto'
  ), f'Expected defaultThemeMode=="auto": {payload}'
  assert (
      payload.get('hudGateCounterRemoved') is True
  ), f'Expected hudGateCounterRemoved=True: {payload}'
  assert (
      payload.get('hudNextTrackRemoved') is True
  ), f'Expected hudNextTrackRemoved=True: {payload}'
  assert (
      payload.get('tabularNumsCssVerified') is True
  ), f'Expected tabularNumsCssVerified=True: {payload}'
  assert (
      payload.get('tabularDigitsEqualWidth') is True
  ), f'Expected tabularDigitsEqualWidth=True (11:11 == 08:08 width): {payload}'
  assert (
      payload.get('startupBannerVerified') is True
  ), f'Expected startupBannerVerified=True on desktop: {payload}'
  assert (
      payload.get('playPauseLabelsShortVerified') is True
  ), f'Expected playPauseLabelsShortVerified=True (Play / Pause without engine): {payload}'
  assert payload.get('masterFilterDefaultOff') is True, f'Expected masterFilterDefaultOff=True on desktop: {payload}'
  assert payload.get('masterFilterPowerBtnVerified') is True, f'Expected masterFilterPowerBtnVerified=True on desktop: {payload}'
  # Second self-test pass at 375x812 mobile viewport to verify real mobile geometry
  proc_m = _run_chrome_dom_dump('375,812')
  assert proc_m.returncode == 0, f'Mobile Chrome exited {proc_m.returncode}'
  match_m = re.search(r'data-selftest="([^"]+)"', proc_m.stdout)
  assert match_m, 'Missing data-selftest on mobile pass'
  payload_m = json.loads(html.unescape(match_m.group(1)))
  assert payload_m.get('mobileTopBarTwoRows') is True, f'Expected mobileTopBarTwoRows=True at 375px: {payload_m}'
  assert payload_m.get('mobileZeroHorizontalOverflow') is True, f'Expected mobileZeroHorizontalOverflow=True at 375px: {payload_m}'
  assert payload_m.get('canvasRenderedPixels') is True, f'Expected canvasRenderedPixels=True at 375px: {payload_m}'
  assert payload_m.get('patchSaveBtnPresent') is True, f'Expected patchSaveBtnPresent=True at 375px: {payload_m}'
  assert payload_m.get('newPatchBtnPresent') is True, f'Expected newPatchBtnPresent=True at 375px: {payload_m}'
  assert payload_m.get('startupBannerVerified') is True, f'Expected startupBannerVerified=True at 375px mobile: {payload_m}'
  assert payload_m.get('playPauseLabelsShortVerified') is True, f'Expected playPauseLabelsShortVerified=True at 375px mobile: {payload_m}'
  assert payload_m.get('masterFilterDefaultOff') is True, f'Expected masterFilterDefaultOff=True at 375px mobile: {payload_m}'
  assert payload_m.get('masterFilterPowerBtnVerified') is True, f'Expected masterFilterPowerBtnVerified=True at 375px mobile: {payload_m}'
  assert payload_m.get('dialWidthPx', 0) >= 40, f'Expected mobile dialWidthPx >= 40: {payload_m}'
  assert payload_m.get('allDialsMin40Px') is True, f'Expected mobile allDialsMin40Px=True: {payload_m}'
  assert payload_m.get('toggleSwitchTapTargetMin40') is True, f'Expected mobile toggleSwitchTapTargetMin40=True: {payload_m}'
  assert payload_m.get('toggleSwitchVisualHeightPreserved') is True, f'Expected mobile toggleSwitchVisualHeightPreserved=True (24px): {payload_m}'
  assert payload_m.get('minTouchTargetsVerified') is True, f'Expected all interactive elements >= 40x40px on mobile, found: {payload_m.get("smallTouchTargets")}'
  print(f'2. Browser self-test assertions passed (1440px desktop + 375px mobile): {json.dumps(payload)}')


def capture_one_screenshot(spec):
  """Capture a single headless Chrome screenshot."""
  if len(spec) == 4:
    filename, fragment, w, h = spec
  else:
    filename, fragment = spec
    w, h = 1440, 1480
  out_path = os.path.join(ARTIFACT_DIR, filename)
  with tempfile.TemporaryDirectory() as td:
    cmd = [
        CHROME_BIN,
        '--headless',
        '--disable-gpu',
        '--no-sandbox',
        f'--user-data-dir={td}',
        '--hide-scrollbars',
        '--virtual-time-budget=25',
        '--autoplay-policy=no-user-gesture-required',
        f'--window-size={w},{h}',
        f'--screenshot={out_path}',
        f'{FILE_URL}#{fragment}',
    ]
    subprocess.run(cmd, capture_output=True, text=True, timeout=20, check=True)
  assert os.path.exists(out_path) and os.path.getsize(out_path) > 5000, f'Missing {out_path}'
  return out_path


def capture_screenshots():
  """Capture light and dark mode screenshots across all views with default minimal outside-encoder rotary dials."""
  os.makedirs(ARTIFACT_DIR, exist_ok=True)
  specs = [
      ('enso_startup_banner_desktop_light.png', 'bloom=1&startup=1', 1440, 940),
      ('enso_startup_banner_desktop_dark.png', 'bloom=1&theme=dark&startup=1', 1440, 940),
      ('enso_startup_banner_mobile_light.png', 'bloom=1&startup=1', 375, 812),
      ('enso_startup_banner_mobile_dark.png', 'bloom=1&theme=dark&startup=1', 375, 812),
      ('enso_playing_pause_btn_desktop.png', 'bloom=1', 1440, 940),
      ('enso_paused_play_btn_desktop.png', 'bloom=1&paused=1', 1440, 940),
      ('eno_studio_light.png', 'bloom=1', 1440, 1480),
      ('eno_studio_after_20s_light.png', 'bloom=1&hideHint=1', 1440, 1480),
      ('eno_probability_light.png', 'bloom=1&tab=probability', 1440, 1480),
      ('eno_research_light.png', 'bloom=1&tab=research', 1440, 1480),
      ('eno_studio_dark.png', 'bloom=1&theme=dark', 1440, 1480),
      ('enso_soundscapes_studio.png', 'bloom=1', 1440, 940),
      ('enso_settings_crossfade.png', 'bloom=1&settings=open', 1440, 940),
      ('enso_settings_crossfade_dark.png', 'bloom=1&theme=dark&settings=open', 1440, 940),
      ('enso_soundscapes_methods.png', 'bloom=1&tab=research', 1440, 940),
      ('enso_new_patch_modal.png', 'bloom=1&modal=newpatch', 1440, 940),
      ('enso_randomized_user_patches.png', 'bloom=1&demo=userpatches', 1440, 940),
      ('enso_delete_patch_dialog.png', 'bloom=1&modal=deletepatch', 1440, 940),
      ('enso_voices_octave_light.png', 'bloom=1&scroll=voices', 1440, 1080),
      ('enso_voices_octave_dark.png', 'bloom=1&theme=dark&scroll=voices', 1440, 1080),
      ('enso_voices_octave_mobile.png', 'bloom=1&scroll=voices', 375, 920),
      ('enso_mobile_top.png', 'bloom=1', 375, 812),
      ('enso_mobile_cards.png', 'bloom=1&scroll=cards', 375, 812),
      ('enso_settings_mobile.png', 'bloom=1&settings=open', 375, 812),
  ]
  with ThreadPoolExecutor(max_workers=6) as pool:
    paths = list(pool.map(capture_one_screenshot, specs))
  print(f'3. Captured {len(paths)} live screenshots in {ARTIFACT_DIR}.')


def main():
  check_http_server()
  run_browser_selftest()
  capture_screenshots()
  print('ALL VERIFICATION CHECKS PASSED (ALL_VERIFICATION_CHECKS_PASSED)')


if __name__ == '__main__':
  sys.exit(main())
