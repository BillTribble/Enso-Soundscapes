/**
 * Aurora: Domain-Warped FBM WebGL Shader with Slow Ambient Harmonic Blooms
 * Reflects the musical vibe of each track and breathes slowly with note/chord/bloom events.
 */
'use strict';

const AURORA_PALETTES = {
  // Base palettes
  dawn:    [[0.95, 0.62, 0.60], [0.72, 0.62, 0.92], [1.00, 0.82, 0.58]],
  fog:     [[0.42, 0.84, 0.77], [0.48, 0.64, 0.90], [0.71, 0.84, 0.65]],
  drizzle: [[0.31, 0.50, 0.85], [0.35, 0.76, 0.85], [0.55, 0.48, 0.85]],
  golden:  [[0.96, 0.72, 0.38], [0.85, 0.47, 0.29], [0.79, 0.76, 0.42]],

  // Track-specific palettes reflecting each preset's harmonic & atmospheric vibe
  thursday:       [[0.96, 0.74, 0.38], [0.42, 0.84, 0.75], [0.98, 0.84, 0.52]], // Sunlit Atrium: warm afternoon gold & conservatory jade
  reflection:     [[0.31, 0.50, 0.85], [0.35, 0.76, 0.85], [0.55, 0.48, 0.85]], // Luminous Drift: cerulean sky, cyan glass & Lydian indigo (drizzle)
  installations:  [[0.95, 0.62, 0.60], [0.72, 0.62, 0.92], [1.00, 0.82, 0.58]], // Cathedral Glass: stained-glass rose, amethyst & candle gold (dawn)
  mixing_colours: [[0.42, 0.84, 0.77], [0.48, 0.64, 0.90], [0.71, 0.84, 0.65]], // Felt & Mist: Nordic sea-glass mist, fjord blue & celadon (fog)
  apollo_shimmer: [[0.96, 0.72, 0.38], [0.85, 0.47, 0.29], [0.64, 0.52, 0.90]], // Weightless Orbit: solar gold, lunar copper & deep orbital violet
  discreet_loops: [[0.48, 0.78, 0.52], [0.82, 0.68, 0.36], [0.34, 0.68, 0.62]]  // Moss & Reel: woodland moss, warm tape-oxide ochre & damp fern
};

const SCALE_TO_PALETTE = {
  thursday_g: 'thursday',
  reflection_eb: 'reflection',
  lux_a: 'installations',
  mixing_c: 'mixing_colours',
  airports_db: 'apollo_shimmer',
  onland_f: 'discreet_loops'
};

function createAurora(canvas, { palette = 'thursday', dark = true, scale = 0.5 } = {}) {
  if (!canvas) return null;

  let gl = null;
  try {
    gl = canvas.getContext('webgl', { antialias: false, premultipliedAlpha: false }) ||
         canvas.getContext('experimental-webgl', { antialias: false, premultipliedAlpha: false });
  } catch (e) {}

  const vs = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
  const fs = `precision highp float;
  uniform vec2 R;
  uniform float T, K, D;
  uniform vec3 C0, C1, C2;
  uniform vec4 B0, B1, B2, B3;

  float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
  float n(vec2 p){
    vec2 i=floor(p),f=fract(p);
    f=f*f*(3.-2.*f);
    return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);
  }
  float fbm(vec2 p){
    float v=0.,a=.5;
    mat2 m=mat2(1.6,1.2,-1.2,1.6);
    for(int i=0;i<5;i++){v+=a*n(p);p=m*p;a*=.5;}
    return v;
  }
  float bloomWave(vec2 p, vec2 warp, vec4 b, float aspect){
    if(b.w <= 0.001) return 0.0;
    vec2 center = vec2((b.x - 0.5) * aspect, b.y - 0.5);
    vec2 dVec = (p - center) + (warp - 0.5) * 0.14;
    float dist = length(dVec);
    float rad = 0.06 + b.z * 0.68;
    float ring = exp(-pow((dist - rad) / (0.11 + b.z * 0.08), 2.0));
    float core = exp(-dist * dist / (0.04 + b.z * 0.22));
    return (ring * 0.65 + core * 0.55) * b.w;
  }
  void main(){
    vec2 uv=gl_FragCoord.xy/R;
    float aspect=R.x/max(1.,R.y);
    vec2 p=(gl_FragCoord.xy-.5*R)/R.y;
    float t=T*.04;
    vec2 q=vec2(fbm(p*1.4+vec2(0.,t)),fbm(p*1.4+vec2(5.2,-t*.8)));
    vec2 r=vec2(fbm(p*1.2+3.5*q+vec2(1.7,9.2)+t*1.3),fbm(p*1.2+3.5*q+vec2(8.3,2.8)-t));
    float f=fbm(p*1.1+(3.+K*.32)*r);
    float band=smoothstep(.22,.85,f)*(.55+.45*sin(p.x*2.2+r.y*4.+T*.15));
    float midCurtain=pow(clamp(1.-abs(uv.y-.62-.18*(r.x-.5))*1.7,0.,1.),1.8);
    float topCanopy=smoothstep(.35,.98,uv.y+.16*(q.y-.5))*(.62+.38*sin(p.x*1.8+q.x*3.+T*.12));
    float curtain=max(midCurtain,topCanopy*.78);

    float bHalo = bloomWave(p, r, B0, aspect)
                + bloomWave(p, r, B1, aspect)
                + bloomWave(p, r, B2, aspect)
                + bloomWave(p, r, B3, aspect);
    bHalo = clamp(bHalo, 0., 1.35);

    vec3 col=mix(C0,C1,clamp(q.x*1.3,0.,1.));
    col=mix(col,C2,clamp(r.y*r.y*1.6 + bHalo*.28,0.,1.));

    float glow=(band*.9 + curtain*(.58 + K*.22) + bHalo*.48)*(.84 + K*.55);
    vec3 dark=vec3(.035,.04,.06)+col*clamp(glow*.68,0.,.56)+col*clamp(K*.05 + bHalo*.08,0.,.12);
    vec3 lightBase=mix(vec3(.94,.95,.97),col*.88+.16,.38);
    vec3 light=mix(lightBase,col*.84+.20,clamp(glow*.80,0.,.86));
    vec3 o=mix(light,dark,D);
    o+=(h(gl_FragCoord.xy+T)-.5)/255.;
    gl_FragColor=vec4(o,1.);
  }`;

  let pr = null;
  const U = {};
  if (gl) {
    try {
      const sh = (t, s) => {
        const x = gl.createShader(t);
        gl.shaderSource(x, s);
        gl.compileShader(x);
        if (!gl.getShaderParameter(x, gl.COMPILE_STATUS)) throw gl.getShaderInfoLog(x);
        return x;
      };
      pr = gl.createProgram();
      gl.attachShader(pr, sh(gl.VERTEX_SHADER, vs));
      gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, fs));
      gl.linkProgram(pr);
      gl.useProgram(pr);
      gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      const loc = gl.getAttribLocation(pr, 'p');
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      ['R', 'T', 'K', 'D', 'C0', 'C1', 'C2', 'B0', 'B1', 'B2', 'B3'].forEach((k) => {
        U[k] = gl.getUniformLocation(pr, k);
      });
    } catch (err) {
      gl = null;
    }
  }

  const ctx2d = gl ? null : canvas.getContext('2d');
  const size = () => {
    canvas.width = Math.max(1, Math.floor(window.innerWidth * scale));
    canvas.height = Math.max(1, Math.floor(window.innerHeight * scale));
    if (gl) gl.viewport(0, 0, canvas.width, canvas.height);
  };
  window.addEventListener('resize', size);
  size();

  const resolve = (p) => {
    if (typeof p === 'string') {
      const base = AURORA_PALETTES[p] || AURORA_PALETTES[SCALE_TO_PALETTE[p]] || AURORA_PALETTES.thursday;
      return base.map((c) => c.slice());
    }
    if (Array.isArray(p) && p.length === 3) return p.map((c) => c.slice());
    return AURORA_PALETTES.thursday.map((c) => c.slice());
  };

  let activePaletteKey = typeof palette === 'string' ? palette : 'thursday';
  let target = resolve(palette);
  let cur = resolve(palette);
  let darkT = dark ? 1 : 0;
  let darkV = darkT;
  let kickV = 0;
  let kickS = 0;
  let raf = 0;
  let bloomIdx = 0;
  // 4 slow ambient bloom slots: { x, y, birth, duration, peak, env, progress }
  const blooms = [
    { x: 0.5, y: 0.5, birth: -99999, duration: 6500, peak: 0, env: 0, progress: 1 },
    { x: 0.5, y: 0.5, birth: -99999, duration: 6500, peak: 0, env: 0, progress: 1 },
    { x: 0.5, y: 0.5, birth: -99999, duration: 6500, peak: 0, env: 0, progress: 1 },
    { x: 0.5, y: 0.5, birth: -99999, duration: 6500, peak: 0, env: 0, progress: 1 }
  ];

  const t0 = performance.now();
  let lastNow = t0;

  function frame(now) {
    const dt = Math.min(0.1, Math.max(0.001, (now - lastNow) / 1000));
    lastNow = now;
    const elapsedSec = (now - t0) / 1000;

    // Slow, breathing ambient swell (attack ~1.4s, release ~5.2s) instead of sharp kick flash
    kickV *= Math.exp(-dt / 4.8);
    const tau = kickV > kickS ? 1.35 : 3.8;
    kickS += (kickV - kickS) * (1 - Math.exp(-dt / tau));

    // Update each expanding circular harmonic bloom (like the circle bloom effect)
    for (let i = 0; i < 4; i++) {
      const b = blooms[i];
      const age = now - b.birth;
      if (age >= 0 && age < b.duration) {
        const prog = age / b.duration;
        b.progress = prog;
        const attackRatio = 0.22;
        const rawEnv = prog < attackRatio
          ? Math.sin((prog / attackRatio) * (Math.PI * 0.5))
          : 0.5 * (1 + Math.cos(((prog - attackRatio) / (1 - attackRatio)) * Math.PI));
        b.env = rawEnv * b.peak;
      } else {
        b.env = 0;
        b.progress = 1;
      }
    }

    // Smooth light/dark crossfade & ~1.2s palette glide
    darkV += (darkT - darkV) * (1 - Math.exp(-dt * 3.2));
    const glide = 1 - Math.exp(-dt * 1.6);
    cur = cur.map((c, i) => c.map((v, j) => v + (target[i][j] - v) * glide));

    if (gl && pr) {
      gl.useProgram(pr);
      gl.uniform2f(U.R, canvas.width, canvas.height);
      gl.uniform1f(U.T, elapsedSec);
      gl.uniform1f(U.K, kickS);
      gl.uniform1f(U.D, darkV);
      cur.forEach((v, i) => gl.uniform3fv(U['C' + i], v));
      for (let i = 0; i < 4; i++) {
        const b = blooms[i];
        gl.uniform4f(U['B' + i], b.x, b.y, b.progress, b.env);
      }
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    } else if (ctx2d) {
      const w = canvas.width, h = canvas.height;
      const isD = darkV > 0.5;
      const tint = (c, dMul, lMix) => isD
        ? [Math.round(c[0] * 255 * dMul), Math.round(c[1] * 255 * dMul), Math.round(c[2] * 255 * dMul)]
        : [Math.round((c[0] * lMix + (1 - lMix) * 0.94) * 255), Math.round((c[1] * lMix + (1 - lMix) * 0.95) * 255), Math.round((c[2] * lMix + (1 - lMix) * 0.97) * 255)];
      const t0c = tint(cur[0], 0.24, 0.58), t1c = tint(cur[1], 0.22, 0.52), t2c = tint(cur[2], 0.18, 0.45);
      const bgGrad = ctx2d.createLinearGradient(0, 0, w, h);
      bgGrad.addColorStop(0, `rgb(${t0c[0]},${t0c[1]},${t0c[2]})`);
      bgGrad.addColorStop(0.5, `rgb(${t1c[0]},${t1c[1]},${t1c[2]})`);
      bgGrad.addColorStop(1, `rgb(${t2c[0]},${t2c[1]},${t2c[2]})`);
      ctx2d.fillStyle = bgGrad;
      ctx2d.fillRect(0, 0, w, h);
      const rgb = (c, a) => `rgba(${Math.round(c[0] * 255)},${Math.round(c[1] * 255)},${Math.round(c[2] * 255)},${a.toFixed(3)})`;
      for (let i = 0; i < 3; i++) {
        const cx = w * (0.20 + 0.30 * i + 0.14 * Math.sin(elapsedSec * 0.12 + i * 2.1));
        const cy = h * (0.22 + 0.22 * i + 0.12 * Math.cos(elapsedSec * 0.09 + i * 1.7));
        const rad = Math.max(w, h) * (0.62 + kickS * 0.20);
        const g = ctx2d.createRadialGradient(cx, cy, 4, cx, cy, rad);
        const alpha = (isD ? 0.26 : 0.48) * (0.88 + kickS * 0.28);
        g.addColorStop(0, rgb(cur[i], alpha));
        g.addColorStop(1, rgb(cur[i], 0));
        ctx2d.fillStyle = g;
        ctx2d.fillRect(0, 0, w, h);
      }
    }
    raf = requestAnimationFrame(frame);
  }

  raf = requestAnimationFrame(frame);

  function applyCircadianTint(cols, mode) {
    let m = mode;
    if (m === 'auto') {
      const hr = new Date().getHours();
      m = (hr >= 6 && hr < 12) ? 'morning' : (hr >= 12 && hr < 18) ? 'afternoon' : (hr >= 18 && hr < 23) ? 'evening' : 'night';
    }
    return cols.map(([r, g, b]) => {
      if (m === 'morning') return [Math.min(1, r * 0.98 + 0.03), Math.min(1, g * 1.03), Math.min(1, b * 1.05)];
      if (m === 'evening') return [Math.min(1, r * 1.04), Math.max(0, g * 0.95), Math.min(1, b * 1.06)];
      if (m === 'night') return [Math.max(0, r * 0.88), Math.max(0, g * 0.92), Math.min(1, b * 1.08)];
      return [r, g, b];
    });
  }

  return {
    pulse(v = 0.8, opts = {}) {
      const strength = Math.max(0.08, Math.min(1.0, Number(v) || 0.6));
      const now = performance.now();
      const isBoot = (now - t0) < 400;
      kickV = Math.min(1.0, Math.max(kickV, kickS + strength * 0.52));
      if (isBoot) kickS = Math.max(kickS, kickV * 0.75);
      const slot = blooms[bloomIdx % 4];
      bloomIdx = (bloomIdx + 1) % 4;
      const angle = (bloomIdx * 1.618 + now * 0.00015) * Math.PI * 2;
      slot.x = (opts && typeof opts.x === 'number') ? opts.x : (0.5 + Math.cos(angle) * 0.24);
      slot.y = (opts && typeof opts.y === 'number') ? opts.y : (0.52 + Math.sin(angle) * 0.20);
      slot.duration = (opts && typeof opts.durationMs === 'number') ? opts.durationMs : (5800 + Math.random() * 2200);
      slot.birth = isBoot ? (now - slot.duration * 0.22) : now;
      slot.peak = strength * 0.85;
      slot.progress = isBoot ? 0.22 : 0;
    },
    setPalette(p) {
      if (typeof p === 'string') activePaletteKey = p;
      target = resolve(p);
      if ((performance.now() - t0) < 400) cur = target.map((c) => c.slice());
    },
    setTrackVibe(presetId, scaleId, circadianMode) {
      const key = AURORA_PALETTES[presetId] ? presetId : (SCALE_TO_PALETTE[scaleId] || 'thursday');
      activePaletteKey = key;
      target = applyCircadianTint(resolve(key), circadianMode);
      if ((performance.now() - t0) < 400) cur = target.map((c) => c.slice());
    },
    setDark(d) {
      darkT = d ? 1 : 0;
      if ((performance.now() - t0) < 400) darkV = darkT;
    },
    getState() {
      return { palette: activePaletteKey, dark: darkT === 1, K: kickS, kickV };
    },
    stop() {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', size);
    }
  };
}

if (typeof window !== 'undefined') {
  window.AURORA_PALETTES = AURORA_PALETTES;
  window.createAurora = createAurora;

  const initAurora = () => {
    const el = document.getElementById('aurora');
    if (!el || (window.aurora && typeof window.aurora.setDark === 'function')) return;
    const root = document.documentElement;
    const mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : { matches: false };
    const isDark = root.getAttribute('data-theme') === 'dark' || (!root.hasAttribute('data-theme') && mq.matches);
    const aurora = createAurora(el, { palette: 'thursday', dark: isDark });
    window.aurora = aurora;
    if (mq.addEventListener) {
      mq.addEventListener('change', (e) => {
        if (aurora && !root.hasAttribute('data-theme')) aurora.setDark(e.matches);
      });
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAurora);
  } else {
    initAurora();
  }
}
