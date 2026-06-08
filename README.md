# 横版无尽跑酷

Chrome 小恐龙式横版无尽跑酷：哥特夜里小黑猫躲避墓碑、栅栏与蝙蝠。

**在线试玩：** [dooorr.github.io/side-endless-runner](https://dooorr.github.io/side-endless-runner/)（GitHub Pages）

<!-- 录制 15–30s 试玩 GIF 后替换下方占位 -->
<!-- ![Demo](docs/demo.gif) -->

## 运行

1. 用浏览器打开 `index.html`，或
2. 在 VS Code 安装 Live Server 后右键「Open with Live Server」

点击画布可获取焦点，避免按键无效。

## 操作

| 操作 | 按键 |
|------|------|
| 跳跃 / 二段跳 | 空格 / 鼠标左键（空中可再跳一次） |
| 冲刺 | **Shift**（前移 + 无敌穿障，约 2s 冷却；画布左下有冷却条） |
| 下蹲（躲蝙蝠） | **C** / 按住鼠标右键 |
| 切换皮肤 | 开始界面 **1** 黄昏 **2** 红月 **3** 午夜，**T** 轮换 |
| 重开 | R / 点击画面（Game Over 后） |

未开始时按跳跃键即可出发。

**跳跃辅助**：提前约 0.1s 按跳会在落地后自动起跳（Jump Buffer）；刚离地瞬间仍可跳一次（Coyote Time）。

## 文件结构

| 文件 | 职责 |
|------|------|
| `index.html` | 页面、脚本加载顺序 |
| `style.css` | 页面样式 |
| `js/config.js` | CONFIG、State、localStorage 键名 |
| `js/difficulty.js` | 阶梯速度、障碍生成节奏 |
| `js/input.js` | 键鼠、失焦重置、C/右键蹲 |
| `js/player.js` | 玩家物理、跳跃缓冲、土狼时间 |
| `js/platforms.js` | 高低平台生成与脚底查询 |
| `js/obstacles.js` | 障碍生成、移动、碰撞 |
| `js/effects.js` | 震动、跳跃尾迹、碰撞闪光 |
| `js/audio.js` | Web Audio 音效与 BGM |
| `js/themes.js` | 多主题配色 |
| `js/leaderboard.js` | 本地 Top5 |
| `js/collectibles.js` | 收集物与诅咒 |
| `js/cat-sprites.js` | 黑猫像素矩阵（48×48，4 帧跑、摆尾、眨眼） |
| `js/bat-sprites.js` | 蝙蝠像素矩阵（4 帧扇翅） |
| `js/render.js` | 绘制与 HUD |
| `js/ui.js` | 画布外开始/结束说明面板 |
| `js/main.js` | 主循环、游戏状态 |
| `README.md` | 说明与 Unity 对照 |

## 高低地形（v0.7 / v0.7.1）

- 滚动平台段：`NORMAL`（y=170）、`HIGH`（y=130）、`PIT`（无地面，掉坑坠落即死）
- **v0.7.1**：高台须**跳上去**（不再自动抬升）；高台/坑概率降低；从高台边缘落下带弧线位移
- 障碍 / 收集物 / 蝙蝠高度随所在平台 `y` 对齐
- 绘制阶梯断层与坑洞（露出背景）

## 道具与障碍美术（Q 版像素，纯代码绘制）

- 收集物矩阵在 `js/collectibles.js`（`SideRunner.collectibleSprites`）
- 地面障碍矩阵在 `js/obstacles.js`（`SideRunner.obstacleSprites`）
- 蝙蝠在 `js/bat-sprites.js`，黑猫在 `js/cat-sprites.js`（均由 Canvas `fillRect` 绘制，**无 PNG 素材**）
- 远景（月亮、云、城堡、枯树）在 `js/render.js` 程序化绘制
- 音效与 BGM 在 `js/audio.js` 由 Web Audio 合成（无音频文件）
- 三套皮肤（黄昏 / 红月 / 午夜）通过 `THEME_MOD` 微调配色，生成与碰撞仍绑定 `platformY`

## 角色美术（v0.65）

- 圆脸侧视黑猫、**绿色眼睛**（眨眼时眯眼）
- **4 帧跑动** + 跳跃 / 下蹲姿势
- **长尾巴** 三档左右摆动（与 `animFrame` 同步）

## 界面

- **画布内**：开始/结束仅保留标题与「按空格或左键开始」；游戏中 HUD 含分数与冲刺状态
- **画布下**：`#start-panel` 完整操作说明；`#gameover-panel` 得分与 Top5 提示
- **页脚**：历史最高分与 Top5 列表

## v0.5 变更

- **二段跳**：空中可再跳一次（落地重置）
- **冲刺**：`Shift` 前移约 26px + 约 0.38s 无敌（冷却 2s）；残影与光效
- **收集物**：金币 +15、猫爪 +50、魔法 +25 并刷新二段跳+护盾
- **诅咒陷阱**：伪装收集物，扣分并短时加速障碍
- **难度**：分数越高诅咒出现率越高

## v0.6 变更

- **本地 Top5**：`sideRunnerTop5` 排行榜，页脚与画布下结束面板展示
- **三主题皮肤**：黄昏（默认）/ 红月 / 午夜 — 开始界面按 `1` `2` `3` 或 `T` 轮换

## v0.4 变更

- **Web Audio 音效**（无外部文件）：跳跃短音、碰撞/死亡低音+噪声
- **轻哥特 BGM**：A 小调氛围单音循环，开始游戏后淡入，结束/重开停止
- **跳跃尾迹**：起跳时身后紫色像素残影
- **碰撞闪光**：撞障瞬间径向闪光
- 首次按键/点击解锁音频（浏览器策略）

音量可在 `js/config.js` 调整：`audioMasterVolume`、`audioSfxVolume`、`audioBgmVolume`。

## v0.3 变更

- **三层视差**：远景（月亮/云/星星）、中景（城堡+枯树）、近景（灌木/树桩，与地面同速）
- **深夜渐变**：300 分起约 50 分内配色从暮光过渡到深夜（非瞬间切换）
- **猫眨眼**：站立跑动时随机眨眼
- **像素障碍**：墓碑、尖刺、栅栏改为像素格绘制
- **UI 发光**：页面标题/画布外框光晕；画布内开始/结束半透明面板
- **开始/结束界面**：标题「横版无尽跑酷」、操作提示、Game Over 得分/纪录/重开提示

## v0.2 变更

- **跳跃手感**：起跳 `-500`、重力 `1900`、下落加速倍率 `1.45`、最大下落速度封顶
- **阶梯速度**：每 100 分 +0.55 速度（上限 14），替代线性 `speedPerScore`
- **障碍节奏**：前 30 秒热身（生成更疏）；分数越高间隔越短、最小间距越小
- **组合障碍**：墓碑/尖刺后概率追加蝙蝠（分数档越高越容易）
- **新障碍**：地面尖刺（三角形）
- **分数 HUD**：每得 1 分放大闪烁一下；热身阶段显示「热身」

## v0.1 变更

- 项目定名 **横版无尽跑酷**
- 下蹲改为 **C 键**（移除 ↓）
- 失焦 / 鼠标离开画布重置输入
- Jump Buffer + Coyote Time
- 死亡瞬间屏幕震动（约 0.4s）
- 代码拆分为 `js/` 多模块

## CONFIG 数值表（Unity 复刻用）

| 字段 | 值 | 说明 |
|------|-----|------|
| `canvasWidth` × `canvasHeight` | 1280 × 400 | 逻辑分辨率（`viewScale` 1.85） |
| `groundY` | 340 | 地面线 Y |
| `gravity` | 3515 | px/s² |
| `jumpVelocity` | -925 | 起跳瞬时速度 |
| `fallGravityMult` | 1.45 | 下落重力倍率 |
| `maxFallSpeed` | 1702 | 最大下落速度 |
| `speedTierInterval` | 100 | 每 N 分一档速度 |
| `speedPerTier` | 0.55 | 每档增加速度 |
| `warmUpSeconds` | 30 | 热身阶段时长 |
| `jumpBufferDuration` | 0.12 | 跳跃缓冲（秒） |
| `coyoteTimeDuration` | 0.08 | 土狼时间（秒） |
| `deathShakeDuration` | 0.4 | 死亡震动时长 |
| `deathShakeIntensity` | 15 | 震动幅度（像素） |
| `playerX` | 93 | 猫固定 X |
| `standWidth` × `standHeight` | 81 × 81 | 站立 |
| `duckWidth` × `duckHeight` | 96 × 41 | 下蹲 |
| `batDrawHeight` | 72 | 蝙蝠贴图高（略小于猫） |
| `baseSpeed` / `maxSpeed` | 11 / 26 | 滚动速度 |
| `nightScoreThreshold` | 300 | 深夜配色 |

速度公式：`speed = min(maxSpeed, baseSpeed + floor(score/100) * 0.55)`

**localStorage**：`sideRunnerHighScore`（最高分）、`sideRunnerTop5`、`sideRunnerTheme`；自动迁移旧键名 `nightCatHighScore` / `shadowMeowTop5` / `shadowMeowTheme`。

## 测试清单

### A. 更名与操作

- [ ] 标题为「横版无尽跑酷」；说明为 C / 右键蹲，无 ↓

### B. 失焦重置

- [ ] 按住 C 或右键蹲，Alt+Tab 切走后切回 → 不再假蹲
- [ ] 右键蹲时鼠标移出 canvas → 蹲姿取消（若仍按住 C 则保持蹲）

### C. 跳跃缓冲

- [ ] 落地前约 0.1s 按空格 → 落地立即再跳
- [ ] 刚离地瞬间按跳 → 仍能起跳（土狼时间）

### D. 死亡震动

- [ ] 撞障后画面抖动约 0.4s
- [ ] R 重开后无偏移

### E. C 键下蹲

- [ ] ↓ 无效；C 可过蝙蝠；右键蹲仍有效

### F. 回归

- [ ] 分数、加速、最高分、障碍回收正常

## 玩家状态机（Unity 参考）

```
IdleRun → Jump → Fall → IdleRun
IdleRun → Duck（C/右键）→ IdleRun
任意 → Dead（碰撞 + 震动）→ IdleRun（重开）
```

- 空中障碍：仅 `ducking && onGround` 时忽略碰撞

## Roadmap（后续版本）

| 版本 | 内容 |
|------|------|
| v0.2 | ~~已完成~~ 跳跃手感、阶梯速度、障碍组合、分数动画 |
| v0.3 | ~~已完成~~ 三层视差、猫眨眼、像素障碍、UI 发光、开始/结束界面 |
| v0.4 | ~~已完成~~ Web Audio、尾迹、碰撞闪光 |
| v0.5 | ~~已完成~~ 二段跳、冲刺、收集物、诅咒 |
| v0.6 | ~~已完成~~ Top5、多主题皮肤 |
| Unity | 按 `js/` 模块与 CONFIG 迁到 2D Rigidbody + BoxCollider2D |

## Unity 迁移建议

1. `PlayerController`：复刻 `jumpBuffer`、`coyoteTime`、蹲姿碰撞盒
2. `ObstacleSpawner`：与 `js/obstacles.js` 生成规则一致
3. 相机震动：对应 `js/effects.js` 的 `triggerDeathShake`
