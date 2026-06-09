# 我的技能没有冷却

副标题：**守住城墙，打穿怪潮**

这是一个纯前端、竖屏手机端策略守城小游戏。玩家在底部城墙区域左右移动，自动发射子弹攻击从顶部三条路线涌来的怪物，并使用火雨术清理密集怪潮。

## 当前功能

- 首页：显示金币、战斗力、武器等级、火雨术 CD，并提供开始挑战、装备升级、关卡选择、重置存档。
- 关卡选择：包含「新手怪潮」和「高速突袭」两个关卡。
- 战斗系统：怪物从顶部传送门出现，沿左 / 中 / 右三路向城墙推进。
- 玩家控制：支持手机滑动、电脑鼠标拖动、键盘左右方向键。
- 自动攻击：玩家自动向上发射子弹，优先攻击更接近玩家横坐标且更靠近城墙的怪物。
- 火雨术：点击技能按钮后生成多个陨石，命中后播放爆炸效果并造成范围伤害。
- 本局强化：击杀指定数量怪物后暂停战斗，随机三选一强化。
- 永久升级：金币可升级武器、攻速、火雨术冷却，并保存到 localStorage。
- 通关 / 失败弹窗：通关发放金币，失败提示升级装备后再挑战。
- 移动端适配：按 390 × 844 竖屏设计，兼容 375px、390px、430px 宽度。

## 文件结构

```text
skill-cooldown-game/
├── index.html
├── style.css
├── game.js
├── README.md
└── assets/
    ├── ui/
    │   ├── home-bg.png
    │   ├── battle-bg-clean.png
    │   ├── level-select-bg.png
    │   ├── upgrade-panel-bg.png
    │   ├── result-panel-bg.png
    │   └── skill-button-fire.png
    ├── sprites/
    │   ├── hero.png
    │   ├── slime.png
    │   ├── lava-slime.png
    │   ├── goblin.png
    │   └── demon.png
    ├── fx/
    │   ├── portal.png
    │   ├── meteor.png
    │   ├── explosion.png
    │   ├── bullet.png
    │   └── coin-drop.png
    └── reference/
        ├── home.png
        ├── battle-effect.png
        ├── level-select.png
        ├── upgrade.png
        └── result-popup.png
```

> 如果 `assets/sprites/hero.png` 暂时不存在，游戏会自动使用 `assets/sprites/demon.png` 作为玩家角色占位。代码中仍保留正式 hero 路径，后续补充 `hero.png` 后会自动使用正式角色图。

## 本地打开方式

无需安装 npm、Node、Vite 或任何依赖。

方式一：直接双击打开：

```text
index.html
```

方式二：如果浏览器对本地文件限制较严格，可以使用任意静态文件服务器，例如 Python：

```bash
python3 -m http.server 8000
```

然后访问：

```text
http://localhost:8000/
```

## GitHub Pages 部署方式

1. 新建一个 GitHub 仓库。
2. 上传本项目全部文件，确保 `index.html` 位于仓库根目录。
3. 进入仓库 Settings。
4. 打开 Pages。
5. Source 选择 `Deploy from a branch`。
6. Branch 选择 `main`，目录选择 `/root`。
7. 保存后等待 GitHub Pages 生成链接。

## 手机访问方式

- 将 GitHub Pages 链接发送到手机。
- 使用微信内置浏览器、Safari 或 Chrome 打开。
- 建议竖屏游玩。
- 页面已禁止横向滚动，并为底部技能区预留安全距离。

## 操作方式

- 手机：在战斗区左右滑动移动角色。
- 电脑：按住鼠标拖动角色横向移动。
- 键盘：使用 `ArrowLeft` / `ArrowRight` 移动。
- 技能：点击底部火雨术按钮释放；按钮显示冷却倒计时，完成后高亮。
- 装备：在首页点击「装备升级」，消耗金币永久提升属性。

## 素材说明

项目只使用本地 PNG 素材，不依赖外部 CDN、远程 API 或第三方运行时。

正式战斗背景使用：

```text
assets/ui/battle-bg-clean.png
```

`assets/reference/` 中的图片仅作为视觉参考，不会作为动态战斗背景使用，避免与代码生成的怪物、角色、金币和数字重复。

## 后续扩展方向

- 增加第 3 关 Boss 战。
- 增加 Boss 技能，例如横扫、召唤、护盾。
- 增加更多永久装备，例如城墙护甲、金币加成、暴击率。
- 增加更多本局强化，例如连锁闪电、冰冻、毒雾。
- 增加音效和背景音乐开关。
- 增加更完整的新手引导。
Updated Pages deployment.
