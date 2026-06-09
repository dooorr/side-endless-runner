/**
 * 横版无尽跑酷 — 成就系统
 */
(function (global) {
  const SideRunner = global.SideRunner;
  const CONFIG = SideRunner.CONFIG;

  const STORAGE_KEY = "sideRunnerAchievements";

  const ACHIEVEMENTS = [
    {
      id: "first_score",
      name: "初次登场",
      desc: "首次获得分数",
      icon: "★",
    },
    {
      id: "score_100",
      name: "百里挑一",
      desc: "单局得分达到 100",
      icon: "◆",
    },
    {
      id: "score_500",
      name: "夜行高手",
      desc: "单局得分达到 500",
      icon: "◆◆",
    },
    {
      id: "score_1000",
      name: "暗影主宰",
      desc: "单局得分达到 1000",
      icon: "◆◆◆",
    },
    {
      id: "combo_5",
      name: "连击新手",
      desc: "单局连击达到 5",
      icon: "✦",
    },
    {
      id: "combo_10",
      name: "连击大师",
      desc: "单局连击达到 10",
      icon: "✦✦",
    },
    {
      id: "magic_first",
      name: "魔法守护",
      desc: "首次使用魔法护盾",
      icon: "◇",
    },
    {
      id: "dash_10",
      name: "冲刺专家",
      desc: "单局冲刺 10 次",
      icon: "➤",
    },
    {
      id: "survive_60",
      name: "生存达人",
      desc: "单局存活 60 秒",
      icon: "⧖",
    },
    {
      id: "top5_first",
      name: "榜上有名",
      desc: "首次进入本地 Top 5",
      icon: "♛",
    },
  ];

  function loadUnlocked() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  function saveUnlocked(list) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch {
      /* ignore */
    }
  }

  let unlockedSet = new Set(loadUnlocked());

  function isUnlocked(id) {
    return unlockedSet.has(id);
  }

  function unlock(id) {
    if (isUnlocked(id)) return false;
    unlockedSet.add(id);
    saveUnlocked(Array.from(unlockedSet));
    return true;
  }

  function getAll() {
    return ACHIEVEMENTS;
  }

  function getUnlockedList() {
    return ACHIEVEMENTS.filter((a) => unlockedSet.has(a.id));
  }

  function getNewlyUnlockedThisRun() {
    return ACHIEVEMENTS.filter((a) => unlockedSet.has(a.id) && a._justUnlocked);
  }

  function clearJustUnlockedFlag() {
    ACHIEVEMENTS.forEach((a) => delete a._justUnlocked);
  }

  /**
   * 根据本局数据检查并解锁成就
   * 返回本次新解锁的成就列表
   */
  function checkAndUnlock(runStats, finalScore, onTop5, game) {
    const newly = [];

    const check = (id, condition) => {
      if (isUnlocked(id)) return;
      if (condition) {
        if (unlock(id)) {
          const ach = ACHIEVEMENTS.find((a) => a.id === id);
          if (ach) {
            ach._justUnlocked = true;
            newly.push(ach);
          }
        }
      }
    };

    // 分数类
    check("first_score", finalScore > 0);
    check("score_100", finalScore >= 100);
    check("score_500", finalScore >= 500);
    check("score_1000", finalScore >= 1000);

    // 连击
    const maxCombo = runStats ? runStats.maxCombo || 0 : 0;
    check("combo_5", maxCombo >= 5);
    check("combo_10", maxCombo >= 10);

    // 魔法护盾
    const magicUsed = runStats ? (runStats.magic || 0) > 0 : false;
    check("magic_first", magicUsed);

    // 冲刺
    const dashCount = runStats ? runStats.dashCount || 0 : 0;
    check("dash_10", dashCount >= 10);

    // 生存时间
    const seconds = runStats ? runStats.playSeconds || 0 : 0;
    check("survive_60", seconds >= 60);

    // 首次上榜
    check("top5_first", onTop5);

    return newly;
  }

  SideRunner.achievements = {
    getAll,
    getUnlockedList,
    isUnlocked,
    unlock,
    checkAndUnlock,
    clearJustUnlockedFlag,
    getNewlyUnlockedThisRun,
  };
})(window);
