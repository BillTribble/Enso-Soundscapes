/**
 * Brian & Roger Eno Piano Phrase UI Synchronization & DOM Bindings.
 */
'use strict';

(function() {
  function attachUI(PE) {
    if (!PE || !PE.prototype) return;

    PE.prototype._highlightPhraseStep = function(stepIdx) {
      document.querySelectorAll('.phrase-step-pill').forEach((p) => p.classList.toggle('active', parseInt(p.dataset.stepIdx, 10) === stepIdx));
    };
  
    PE.prototype._highlightChordStep = function(chordIdx) {
      document.querySelectorAll('.chord-prog-pill').forEach((p) => p.classList.toggle('active', parseInt(p.dataset.chordIdx, 10) === chordIdx));
    };
  
    PE.prototype.syncUI = function() {
      const pat = this.TRACK_PATTERNS[this.activePresetId] || this.TRACK_PATTERNS.reflection;
  
      const scaleNotesBadge = document.getElementById('key-scale-notes-badge');
      if (scaleNotesBadge) {
        const pcs = this.getAllowedPitchClasses(this.scaleId);
        const noteNames = ['C','D♭','D','E♭','E','F','F#','G','A♭','A','B♭','B'];
        const names = pcs.map((pc) => noteNames[pc]);
        const txt = `Scale: ${names.join(' ')}`;
        if (typeof window !== 'undefined' && window.EnsoMotion) {
          window.EnsoMotion.setBadgeText(scaleNotesBadge, txt);
        } else {
          scaleNotesBadge.textContent = txt;
        }
      }
  
      document.querySelectorAll('#piano-phrase-type-tabs .m3-pill-tab').forEach((tab) => {
        const isSel = tab.dataset.phraseType === this.pianoPhraseType;
        tab.classList.toggle('active', isSel);
        tab.setAttribute('aria-selected', isSel ? 'true' : 'false');
      });
  
      const chordSelect = document.getElementById('select-chord-prog-voice');
      if (chordSelect) chordSelect.value = this.chordProgInstrument;
  
      const phraseTitle = document.getElementById('piano-phrase-title');
      const phrase = this.getActivePianoPhrase();
      if (phraseTitle && phrase) phraseTitle.textContent = phrase.name;
  
      const phraseMeta = document.getElementById('piano-phrase-meta');
      if (phraseMeta && phrase) {
        const n = phrase.primarySteps.length;
        const txt =
            `Phrase plays (${n}/${n} notes) · Cycle ${this.pianoCycleCount || 1}`;
        if (typeof window !== 'undefined' && window.EnsoMotion) {
          window.EnsoMotion.setBadgeText(phraseMeta, txt);
        } else {
          phraseMeta.textContent = txt;
        }
      }
  
      const stepsContainer = document.getElementById('phrase-steps-strip');
      if (stepsContainer && phrase) {
        stepsContainer.innerHTML = '';
        phrase.primarySteps.forEach((step, idx) => {
          const pill = document.createElement('button');
          pill.type = 'button';
          pill.className = `phrase-step-pill${idx === this.activeStepIndex ? ' active' : ''}`;
          pill.dataset.stepIdx = idx;
          pill.innerHTML = `<span>${idx + 1}. ${step.label}</span>`;
          pill.title = `Step ${idx + 1} (${step.label}) · Click to audition note/chord`;
          pill.addEventListener('click', () => {
            if (this.audioEngine) {
              const v = (this.probEngine && this.probEngine.voices) ? this.probEngine.voices.find((x) => x.id === 'piano') : null;
              const midis = (step.degrees || [0]).map((d, i) => this.degreeToMidi(d, (step.octaves ? step.octaves[i] : 0) + (v ? v.octaveOffset : 0), this.scaleId));
              const cScale = midis.length > 1 ? (1 / Math.pow(midis.length, 0.42)) : 1.0;
              midis.forEach((m, mIdx) => {
                setTimeout(() => this.audioEngine.triggerVoice('piano', m, 0.72 * cScale, 0, v ? v.gain : 2.0), mIdx * 35);
              });
              this._highlightPhraseStep(idx);
            }
          });
          stepsContainer.appendChild(pill);
        });
      }
  
      const chordLabel = document.getElementById('chord-prog-owner-label');
      const voiceNames = { piano: 'Felt Piano', pad: 'CS-80 Ribbon Pad', choir: 'Spectral Choir', tape: 'Revox Tape Loop', bell: 'DX7 Glass Bell', none: 'None' };
      if (chordLabel) {
        const ownerName = voiceNames[this.chordProgInstrument] || this.chordProgInstrument;
        chordLabel.textContent = `Chord progression owner: ${ownerName} (1 instrument max)`;
      }
  
      const chordsContainer = document.getElementById('chord-prog-strip');
      if (chordsContainer && pat.trackChords) {
        chordsContainer.innerHTML = '';
        pat.trackChords.forEach((chord, idx) => {
          const pill = document.createElement('button');
          pill.type = 'button';
          pill.className = `chord-prog-pill${idx === this.chordStepIndex ? ' active' : ''}`;
          pill.dataset.chordIdx = idx;
          pill.innerHTML = `<span>${chord.numeral} (${chord.name})</span>`;
          pill.title = `Chord ${idx + 1}: ${chord.name} · Degrees [${chord.degrees.map((d) => d + 1).join(', ')}]`;
          pill.addEventListener('click', () => {
            const vId = (this.chordProgInstrument && this.chordProgInstrument !== 'none') ? this.chordProgInstrument : 'pad';
            const v = (this.probEngine && this.probEngine.voices) ? this.probEngine.voices.find((x) => x.id === vId) : null;
            const midis = chord.degrees.map((d, i) => this.degreeToMidi(d, (chord.octaves[i] || 0) + (v ? v.octaveOffset : 0), this.scaleId));
            if (this.audioEngine) {
              midis.forEach((m, mIdx) => {
                setTimeout(() => this.audioEngine.triggerVoice(vId, m, 0.65, 0, v ? v.gain * 0.68 : 0.65), mIdx * 25);
              });
            }
            this._highlightChordStep(idx);
          });
          chordsContainer.appendChild(pill);
        });
      }
  
      if (typeof window !== 'undefined' && window.EnsoMotion &&
          window.EnsoMotion.syncVoiceHarmonyCards) {
        window.EnsoMotion.syncVoiceHarmonyCards(this, phrase);
      }
  
      const setSl = (id, lid, v, fmt) => {
        const el = document.getElementById(id), l = document.getElementById(lid);
        if (el && Math.abs(parseFloat(el.value) - v) > 0.001) el.value = v;
        if (l) l.textContent = fmt(v);
      };
      const pct = (v) => `${Math.round(v * 100)}%`, sec1 = (v) => `${v.toFixed(1)} s`;
      [[
        'phrase-variation-chance', 'val-phrase-variation-chance',
        this.phraseVariationChance, pct
      ],
       ['phrase-gate-prob', 'val-phrase-gate-prob', this.phraseGateProb, pct],
       ['phrase-loop-cycle', 'val-phrase-loop-cycle', this.phraseLoopCycle, sec1],
       [
         'phrase-skip-chance', 'val-phrase-skip-chance', this.phraseSkipChance,
         pct
       ],
       ['phrase-note-gate', 'val-phrase-note-gate', this.phraseNoteGate, pct],
       [
         'phrase-completion-gate', 'val-phrase-completion-gate',
         this.phraseCompletionGate, pct
       ],
       [
         'phrase-note-octave-shift', 'val-phrase-note-octave-shift',
         this.noteOctaveShiftChance, pct
       ],
       [
         'phrase-chord-octave-shift', 'val-phrase-chord-octave-shift',
         this.chordOctaveShiftChance, pct
       ],
       ['chord-prog-gate', 'val-chord-prog-gate', this.chordProgGate, pct],
       ['chord-prog-cycle', 'val-chord-prog-cycle', this.chordProgCycle, sec1]]
          .forEach(([a, b, c, d]) => setSl(a, b, c, d));
    };
  
    PE.prototype.bindUI = function() {
      const b = (id, lid, fmt, onChg) => {
        const el = document.getElementById(id), lbl = document.getElementById(lid);
        if (el) el.addEventListener('input', () => { const v = parseFloat(el.value); if (lbl) lbl.textContent = fmt(v); onChg(v); });
      };
      const pct = (v) => `${Math.round(v * 100)}%`, sec1 = (v) => `${v.toFixed(1)} s`;
      const syncProb = (inst, p) => {
        if (!this.probEngine || !inst || inst === 'none') return;
        this.probEngine.setVoiceParam(inst, 'prob', p);
        const sl = document.getElementById(`voice-prob-${inst}`), vl = document.getElementById(`val-voice-prob-${inst}`);
        if (sl) sl.value = p; if (vl) vl.textContent = pct(p);
      };
      const syncCyc = (inst, c) => {
        if (!this.probEngine || !inst || inst === 'none') return;
        this.probEngine.setVoiceParam(inst, 'cycle', c);
        const sl = document.getElementById(`voice-cycle-${inst}`), vl = document.getElementById(`val-voice-cycle-${inst}`);
        if (sl) sl.value = c; if (vl) vl.textContent = sec1(c);
        if (typeof this.probEngine.computeNonRepeatingHorizon === 'function') {
          const h = document.getElementById('horizon-badge'); if (h) h.textContent = this.probEngine.computeNonRepeatingHorizon();
        }
      };
      const syncVarFromSub = () => {
        this.phraseVariationChance = Math.min(1.0, this.phraseSkipChance + this.phraseNoteGate + this.phraseCompletionGate);
        const el = document.getElementById('phrase-variation-chance'), l = document.getElementById('val-phrase-variation-chance');
        if (el) el.value = this.phraseVariationChance; if (l) l.textContent = pct(this.phraseVariationChance);
      };
      b('phrase-variation-chance', 'val-phrase-variation-chance', pct, (v) => {
        this.phraseVariationChance = v;
        const sum = this.phraseSkipChance + this.phraseNoteGate + this.phraseCompletionGate;
        if (sum > 0.001) {
          const scale = v / sum;
          this.phraseSkipChance = Math.min(1, this.phraseSkipChance * scale);
          this.phraseNoteGate = Math.min(1, this.phraseNoteGate * scale);
          this.phraseCompletionGate = Math.min(1, this.phraseCompletionGate * scale);
        } else {
          this.phraseSkipChance = v / 3; this.phraseNoteGate = v / 3; this.phraseCompletionGate = v / 3;
        }
        this.syncUI();
      });
      b('phrase-gate-prob', 'val-phrase-gate-prob', pct, (v) => { this.phraseGateProb = v; syncProb('piano', v); });
      b('phrase-loop-cycle', 'val-phrase-loop-cycle', sec1, (v) => { this.phraseLoopCycle = v; syncCyc('piano', v); });
      b('phrase-skip-chance', 'val-phrase-skip-chance', pct, (v) => { this.phraseSkipChance = v; syncVarFromSub(); });
      b('phrase-note-gate', 'val-phrase-note-gate', pct, (v) => { this.phraseNoteGate = v; syncVarFromSub(); });
      b('phrase-completion-gate', 'val-phrase-completion-gate', pct, (v) => { this.phraseCompletionGate = v; syncVarFromSub(); });
      const bOct = (id, lid, paramKey) => {
        b(id, lid, pct, (v) => {
          this[paramKey] = v;
          ['piano', this.chordProgInstrument].forEach((inst) => {
            if (!inst || inst === 'none' || !this.probEngine) return;
            this.probEngine.setVoiceParam(
                inst,
                paramKey === 'chordOctaveShiftChance' ? 'chordOctaveShiftProb' :
                                                        'noteOctaveShiftProb',
                v);
            const prefix = paramKey === 'chordOctaveShiftChance' ?
                'voice-chord-octave-shift' :
                'voice-note-octave-shift';
            const sl = document.getElementById(`${prefix}-${inst}`),
                  vl = document.getElementById(`val-${prefix}-${inst}`);
            if (sl) {
              sl.value = v.toFixed(2);
              sl.dispatchEvent(new Event('change'));
            }
            if (vl) vl.textContent = pct(v);
          });
        });
      };
      bOct(
          'phrase-note-octave-shift', 'val-phrase-note-octave-shift',
          'noteOctaveShiftChance');
      bOct(
          'phrase-chord-octave-shift', 'val-phrase-chord-octave-shift',
          'chordOctaveShiftChance');
      b('chord-prog-gate', 'val-chord-prog-gate', pct, (v) => { this.chordProgGate = v; syncProb(this.chordProgInstrument, v); });
      b('chord-prog-cycle', 'val-chord-prog-cycle', sec1, (v) => { this.chordProgCycle = v; syncCyc(this.chordProgInstrument, v); });
    };

  }

  if (typeof window !== 'undefined') {
    window.EnsoPhraseUI = { attachUI };
    if (window.PhraseEngine) attachUI(window.PhraseEngine);
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { attachUI };
  }
})();
