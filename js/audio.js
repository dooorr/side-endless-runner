/**
 * 横版无尽跑酷 — Web Audio 合成音效与轻哥特氛围 BGM
 */
(function (global) {
  const SideRunner = global.SideRunner;
  const CONFIG = SideRunner.CONFIG;

  let audioCtx = null;
  let masterGain = null;
  let bgmGain = null;
  let sfxGain = null;
  let unlocked = false;
  let bgmTimer = null;
  let bgmStep = 0;
  let bgmPlaying = false;

  const BGM_NOTES = [220, 261.63, 329.63, 392, 440, 523.25];

  function ensureContext() {
    if (!audioCtx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return false;
      audioCtx = new Ctx();
      masterGain = audioCtx.createGain();
      masterGain.gain.value = CONFIG.audioMasterVolume;
      masterGain.connect(audioCtx.destination);

      sfxGain = audioCtx.createGain();
      sfxGain.gain.value = CONFIG.audioSfxVolume;
      sfxGain.connect(masterGain);

      bgmGain = audioCtx.createGain();
      bgmGain.gain.value = 0;
      bgmGain.connect(masterGain);
    }
    return true;
  }

  SideRunner.audio = {
    unlock() {
      if (!ensureContext()) return;
      if (unlocked) return;
      audioCtx.resume().then(() => {
        unlocked = true;
      });
      unlocked = true;
    },

    playJump(isDouble) {
      if (!unlocked || !audioCtx) return;
      const t = audioCtx.currentTime;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      const f0 = isDouble ? 360 : 320;
      const f1 = isDouble ? 480 : 520;
      osc.frequency.setValueAtTime(f0, t);
      osc.frequency.exponentialRampToValueAtTime(f1, t + 0.07);
      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
      osc.connect(gain);
      gain.connect(sfxGain);
      osc.start(t);
      osc.stop(t + 0.11);
    },

    playDeath() {
      if (!unlocked || !audioCtx) return;
      const t = audioCtx.currentTime;

      const osc = audioCtx.createOscillator();
      const g1 = audioCtx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(180, t);
      osc.frequency.exponentialRampToValueAtTime(55, t + 0.35);
      g1.gain.setValueAtTime(0.15, t);
      g1.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
      osc.connect(g1);
      g1.connect(sfxGain);
      osc.start(t);
      osc.stop(t + 0.42);

      const bufferSize = audioCtx.sampleRate * 0.12;
      const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
      }
      const noise = audioCtx.createBufferSource();
      noise.buffer = buffer;
      const g2 = audioCtx.createGain();
      g2.gain.setValueAtTime(0.08, t);
      g2.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
      noise.connect(g2);
      g2.connect(sfxGain);
      noise.start(t);
      noise.stop(t + 0.13);
    },

    playBgmStep() {
      if (!unlocked || !audioCtx || !bgmPlaying) return;
      const t = audioCtx.currentTime;
      const freq = BGM_NOTES[bgmStep % BGM_NOTES.length];
      bgmStep++;

      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "triangle";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.045, t + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 1.8);
      osc.connect(gain);
      gain.connect(bgmGain);
      osc.start(t);
      osc.stop(t + 1.85);
    },

    startBgm() {
      if (!ensureContext()) return;
      SideRunner.audio.unlock();
      if (bgmPlaying) return;
      bgmPlaying = true;
      if (bgmGain && audioCtx) {
        bgmGain.gain.cancelScheduledValues(audioCtx.currentTime);
        bgmGain.gain.setValueAtTime(0, audioCtx.currentTime);
        bgmGain.gain.linearRampToValueAtTime(
          CONFIG.audioBgmVolume,
          audioCtx.currentTime + 0.8
        );
      }
      SideRunner.audio.playBgmStep();
      bgmTimer = setInterval(() => {
        SideRunner.audio.playBgmStep();
      }, CONFIG.bgmStepIntervalMs);
    },

    playDash() {
      if (!unlocked || !audioCtx) return;
      const t = audioCtx.currentTime;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(200, t);
      osc.frequency.exponentialRampToValueAtTime(90, t + 0.15);
      gain.gain.setValueAtTime(0.08, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
      osc.connect(gain);
      gain.connect(sfxGain);
      osc.start(t);
      osc.stop(t + 0.17);
    },

    playCollect(subtype) {
      if (!unlocked || !audioCtx) return;
      const t = audioCtx.currentTime;
      const freq = subtype === "paw" ? 660 : subtype === "magic" ? 880 : 520;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.1, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
      osc.connect(gain);
      gain.connect(sfxGain);
      osc.start(t);
      osc.stop(t + 0.13);
    },

    playCurse() {
      if (!unlocked || !audioCtx) return;
      const t = audioCtx.currentTime;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "square";
      osc.frequency.setValueAtTime(120, t);
      osc.frequency.exponentialRampToValueAtTime(60, t + 0.2);
      gain.gain.setValueAtTime(0.06, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
      osc.connect(gain);
      gain.connect(sfxGain);
      osc.start(t);
      osc.stop(t + 0.24);
    },

    stopBgm() {
      bgmPlaying = false;
      if (bgmTimer) {
        clearInterval(bgmTimer);
        bgmTimer = null;
      }
      if (bgmGain && audioCtx) {
        bgmGain.gain.cancelScheduledValues(audioCtx.currentTime);
        bgmGain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.5);
      }
    },
  };
})(window);
