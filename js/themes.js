/**
 * 横版无尽跑酷 — 多主题皮肤（v0.6）
 */
(function (global) {
  const SideRunner = global.SideRunner;
  const CONFIG = SideRunner.CONFIG;

  const THEME_IDS = ["dusk", "redmoon", "midnight"];

  const LEGACY_THEME_IDS = {
    shadow: "dusk",
    gothic: "redmoon",
    moonlight: "midnight",
  };

  const PALETTES = {
    dusk: {
      name: "黄昏",
      twilight: {
        skyTop: "#2d1b4e",
        skyBottom: "#4a3728",
        ground: "#3d3d56",
        groundLine: "#5c5c6e",
        mark: "#5a5a72",
        moon: "rgba(232, 224, 200, 0.45)",
        cloud: "rgba(60, 45, 80, 0.35)",
        castle: "#1e1528",
        tree: "#181220",
        nearDecor: "#2a2438",
        cat: "#121218",
        catOutline: "#5a5a6e",
        catEye: "#62e090",
        catBelly: "#2a2a34",
        catTail: "#0a0a10",
        eye: "#62e090",
        star: "rgba(200, 190, 220, 0)",
        hud: "#8b7aa8",
        glow: "rgba(139, 122, 168, 0.65)",
      },
      night: {
        skyTop: "#0a0a12",
        skyBottom: "#151525",
        ground: "#2a2a38",
        groundLine: "#4a4a5e",
        mark: "#3d3d50",
        moon: "rgba(232, 224, 200, 0.85)",
        cloud: "rgba(30, 28, 45, 0.5)",
        castle: "#12121a",
        tree: "#0c0a10",
        nearDecor: "#1a1824",
        cat: "#101014",
        catOutline: "#4a4a58",
        catEye: "#58d888",
        catBelly: "#242430",
        catTail: "#08080c",
        eye: "#58d888",
        star: "rgba(220, 210, 230, 0.7)",
        hud: "#6b5a7a",
        glow: "rgba(100, 85, 130, 0.7)",
      },
    },
    redmoon: {
      name: "红月",
      twilight: {
        skyTop: "#3a1528",
        skyBottom: "#4a2830",
        ground: "#453040",
        groundLine: "#6b4050",
        mark: "#5a3848",
        moon: "rgba(220, 180, 180, 0.4)",
        cloud: "rgba(80, 30, 50, 0.35)",
        castle: "#280818",
        tree: "#1a0810",
        nearDecor: "#321820",
        cat: "#100c0c",
        catOutline: "#8a5a68",
        catEye: "#6ee8a0",
        catBelly: "#2a2024",
        catTail: "#080606",
        eye: "#6ee8a0",
        star: "rgba(200, 150, 160, 0)",
        hud: "#a86a7a",
        glow: "rgba(180, 80, 100, 0.6)",
      },
      night: {
        skyTop: "#120608",
        skyBottom: "#1a0c10",
        ground: "#2a1820",
        groundLine: "#4a2830",
        mark: "#3a2028",
        moon: "rgba(240, 200, 200, 0.8)",
        cloud: "rgba(50, 20, 30, 0.5)",
        castle: "#0c0408",
        tree: "#080408",
        nearDecor: "#140810",
        cat: "#0e0a0a",
        catOutline: "#6a4048",
        catEye: "#5adc88",
        catBelly: "#221818",
        catTail: "#060404",
        eye: "#5adc88",
        star: "rgba(255, 180, 190, 0.65)",
        hud: "#8a4a5a",
        glow: "rgba(160, 50, 70, 0.75)",
      },
    },
    midnight: {
      name: "午夜",
      twilight: {
        skyTop: "#1a2848",
        skyBottom: "#2a3858",
        ground: "#344058",
        groundLine: "#506080",
        mark: "#4a5870",
        moon: "rgba(220, 235, 255, 0.55)",
        cloud: "rgba(80, 100, 140, 0.3)",
        castle: "#141c30",
        tree: "#101828",
        nearDecor: "#1c2838",
        cat: "#0c1018",
        catOutline: "#5a7098",
        catEye: "#70e8a8",
        catBelly: "#1c2430",
        catTail: "#060810",
        eye: "#70e8a8",
        star: "rgba(180, 200, 255, 0.2)",
        hud: "#7a9ac8",
        glow: "rgba(120, 160, 220, 0.55)",
      },
      night: {
        skyTop: "#060a14",
        skyBottom: "#0c1424",
        ground: "#1a2438",
        groundLine: "#304058",
        mark: "#283448",
        moon: "rgba(240, 248, 255, 0.9)",
        cloud: "rgba(40, 55, 90, 0.45)",
        castle: "#080c18",
        tree: "#060810",
        nearDecor: "#101820",
        cat: "#0a0e14",
        catOutline: "#485878",
        catEye: "#68e098",
        catBelly: "#181e28",
        catTail: "#040608",
        eye: "#68e098",
        star: "rgba(200, 220, 255, 0.85)",
        hud: "#5a7aa8",
        glow: "rgba(80, 120, 200, 0.65)",
      },
    },
  };

  function lerpColor(a, b, t) {
    const parse = (hex) => {
      if (!hex || hex.startsWith("rgba")) return null;
      const h = hex.replace("#", "");
      return [
        parseInt(h.slice(0, 2), 16),
        parseInt(h.slice(2, 4), 16),
        parseInt(h.slice(4, 6), 16),
      ];
    };
    const pa = parse(a);
    const pb = parse(b);
    if (!pa || !pb) return t >= 0.5 ? b : a;
    return `rgb(${Math.round(pa[0] + (pb[0] - pa[0]) * t)},${Math.round(pa[1] + (pb[1] - pa[1]) * t)},${Math.round(pa[2] + (pb[2] - pa[2]) * t)})`;
  }

  function lerpPalette(twilight, night, blend) {
    const out = {};
    for (const k of Object.keys(twilight)) {
      const a = twilight[k];
      const b = night[k];
      if (typeof a === "string" && a.startsWith("rgba")) {
        out[k] = blend >= 0.5 ? b : a;
      } else {
        out[k] = lerpColor(a, b, blend);
      }
    }
    return out;
  }

  let currentId = "dusk";

  const THEME_KEY = "sideRunnerTheme";
  const LEGACY_THEME_KEY = "shadowMeowTheme";

  function loadTheme() {
    try {
      let v = localStorage.getItem(THEME_KEY);
      if (!v) {
        v = localStorage.getItem(LEGACY_THEME_KEY);
        if (v) localStorage.setItem(THEME_KEY, v);
      }
      if (v) {
        const id = LEGACY_THEME_IDS[v] || v;
        if (PALETTES[id]) currentId = id;
      }
    } catch {
      /* ignore */
    }
  }

  function saveTheme() {
    try {
      localStorage.setItem(THEME_KEY, currentId);
    } catch {
      /* ignore */
    }
  }

  loadTheme();

  SideRunner.themes = {
    ids: THEME_IDS,
    getCurrentId() {
      return currentId;
    },
    getCurrentName() {
      return PALETTES[currentId].name;
    },
    setTheme(id) {
      if (!PALETTES[id]) return;
      currentId = id;
      saveTheme();
    },
    cycleTheme(dir) {
      const idx = THEME_IDS.indexOf(currentId);
      const next = (idx + dir + THEME_IDS.length) % THEME_IDS.length;
      SideRunner.themes.setTheme(THEME_IDS[next]);
    },
    getNightBlend(score) {
      if (score < CONFIG.nightScoreThreshold) return 0;
      return Math.min(
        1,
        (score - CONFIG.nightScoreThreshold) / CONFIG.nightScoreBlendRange
      );
    },
    getPlayTheme(score) {
      const skin = PALETTES[currentId];
      const blend = SideRunner.themes.getNightBlend(score);
      return lerpPalette(skin.twilight, skin.night, blend);
    },
    isDeepNight(score) {
      return SideRunner.themes.getNightBlend(score) >= 0.85;
    },
  };
})(window);
