# Enso Soundscapes

> Generative ambient soundscapes and probabilistic tape-loop studio inspired by Brian Eno.

[![Live App](https://img.shields.io/badge/Live%20App-GitHub%20Pages-4caf50?style=for-the-badge)](https://billtribble.github.io/Enso-Soundscapes/)

**[Open Enso Soundscapes](https://billtribble.github.io/Enso-Soundscapes/)**

---

## Overview

**Enso Soundscapes** is a pure browser-based generative music environment inspired by Brian Eno's pioneering ambient tape-loop works, generative systems (*Music for Airports*, *Thursday Afternoon*), and aleatoric composition techniques.

Built with Web Audio API, Web Workers, Canvas, and progressive web app capabilities, it runs entirely client-side with zero external dependencies.

## Key Features

- **6 Generative Voices**: Independent synth and sampled voices with individual loop cycle times, drift, filters, and octave movement.
- **Felt Piano Sampler**: Chromatically mapped multi-sampled acoustic piano (Salamander Grand Piano) played with generative phrasing algorithms and harmonic key-lock.
- **Probabilistic Phrasing Engine**: Non-repeating melodic motifs, chord progressions, completion gates, and octave-shift chance parameters.
- **Whole-Mix Master Chain**: Long-tail shimmer reverb, analog-style tape delay with wow and flutter, resonance filter sweeping, and circadian mood modes.
- **Rotary Dials & Mixer View**: Tactile studio controls for fine-grained voice balance, individual track EQ/resonance, and envelopes.
- **Visualizer & Aurora**: Real-time multi-band spectrum analyser and orbital phase canvas reflecting active loop cycles.
- **Patch Management**: Built-in factory presets, custom user patch creation, export/import, and offline storage.
- **Offline PWA**: Full Service Worker caching and Web App Manifest for mobile and desktop standalone playback.

## Getting Started

Visit the live app at **[billtribble.github.io/Enso-Soundscapes](https://billtribble.github.io/Enso-Soundscapes/)**.

### Local Development

Enso Soundscapes includes a lightweight Python development server with persistence endpoints:

```bash
python3 server.py
# Open http://localhost:8094/ in your browser
```

## License

MIT
