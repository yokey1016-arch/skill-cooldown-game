/*
 * 我的技能没有冷却 - 纯前端竖屏守城小游戏
 * 所有配置集中在本文件，后续扩展更多关卡或 Boss 时优先扩展 LEVELS、MONSTERS 和 battle 状态。
 */
(() => {
  'use strict';

  const DEBUG_HOTSPOTS = false;

  const ASSETS = {
    skillButton: 'assets/ui/skill-button-fire.png',
    hero: 'assets/sprites/hero.png',
    heroFallback: 'assets/sprites/demon.png',
    // hero.png 当前检测为不透明白底素材；运行时先使用透明 demon.png 占位，保留正式路径方便后续替换。
    activeHero: 'assets/sprites/demon.png',
    slime: 'assets/sprites/slime.png',
    lavaSlime: 'assets/sprites/lava-slime.png',
    goblin: 'assets/sprites/goblin.png',
    demon: 'assets/sprites/demon.png',
    fallbackMonster: 'assets/sprites/slime.png',
    meteor: 'assets/fx/meteor.png',
    explosion: 'assets/fx/explosion.png',
    bullet: 'assets/fx/bullet.png',
    coin: 'assets/fx/coin-drop.png',
  };

  const SAVE_KEY = 'skillCooldownGameSaveV1';
  const defaultSave = {
    gold: 0,
    highestLevel: 0,
    weaponLevel: 1,
    speedLevel: 1,
    cooldownLevel: 1,
    firstClears: {},
  };

  function makeWave(type, count, lanes = [0, 1, 2]) {
    return Array.from({ length: count }, (_, index) => ({ type, lane: lanes[index % lanes.length] }));
  }

  const LEVELS = {
    1: {
      id: 1, title: '第 1 关：新手怪潮', shortName: '新手怪潮', reward: 80, firstReward: 50, wallHp: 100,
      spawnInterval: 1150, description: '怪物较慢，适合教学。击杀 5 个怪物触发一次本局强化。', buffKills: [5],
      waves: [...makeWave('slime', 10), ...makeWave('lava-slime', 2, [1])],
    },
    2: {
      id: 2, title: '第 2 关：高速突袭', shortName: '高速突袭', reward: 120, firstReward: 80, wallHp: 100,
      spawnInterval: 760, description: '怪物更多，速度更快。击杀 5 个和 10 个怪物各触发一次本局强化。', buffKills: [5, 10],
      waves: [...makeWave('slime', 8), ...makeWave('goblin', 8, [0, 2]), ...makeWave('demon', 2, [1])],
    },
    3: {
      id: 3, title: '第 3 关：三路压境', shortName: '三路压境', reward: 160, firstReward: 100, wallHp: 100,
      spawnInterval: 850, description: '三条路线同时出现怪物，考验左右滑动和自动攻击目标选择。', buffKills: [6, 14],
      waves: [...makeWave('slime', 12), ...makeWave('goblin', 6, [0, 2]), ...makeWave('lava-slime', 3, [1])],
    },
    4: {
      id: 4, title: '第 4 关：熔岩暴动', shortName: '熔岩暴动', reward: 200, firstReward: 120, wallHp: 100,
      spawnInterval: 800, description: '熔岩怪数量增加，血量更高，需要合理释放火雨术。', buffKills: [6, 15], hpMul: 1.06,
      waves: [...makeWave('slime', 10), ...makeWave('lava-slime', 10), ...makeWave('goblin', 4, [0, 2])],
    },
    5: {
      id: 5, title: '第 5 关：恶魔先锋', shortName: '恶魔先锋', reward: 260, firstReward: 160, wallHp: 110,
      spawnInterval: 780, description: '恶魔精英怪开始压线，需要装备升级和技能配合。', buffKills: [6, 14, 22],
      waves: [...makeWave('slime', 8), ...makeWave('goblin', 8, [0, 2]), ...makeWave('lava-slime', 5), ...makeWave('demon', 4, [1, 0, 2])],
    },
    6: {
      id: 6, title: '第 6 关：传送门失控', shortName: '传送门失控', reward: 320, firstReward: 200, wallHp: 110,
      spawnInterval: 650, description: '顶部三个传送门快速出怪，怪物生成节奏更密集。', buffKills: [8, 18, 28], speedMul: 1.06,
      waves: [...makeWave('slime', 12), ...makeWave('goblin', 12), ...makeWave('lava-slime', 6), ...makeWave('demon', 3, [1])],
    },
    7: {
      id: 7, title: '第 7 关：黑潮围城', shortName: '黑潮围城', reward: 420, firstReward: 260, wallHp: 120,
      spawnInterval: 600, description: '大量怪物连续压线，考验火雨术 CD 和本局强化选择。', buffKills: [8, 20, 34], hpMul: 1.10, speedMul: 1.10,
      waves: [...makeWave('slime', 16), ...makeWave('goblin', 14), ...makeWave('lava-slime', 8), ...makeWave('demon', 5, [1, 0, 2])],
    },
    8: {
      id: 8, title: '第 8 关：暗黑领主', shortName: '暗黑领主', reward: 600, firstReward: 400, wallHp: 130,
      spawnInterval: 650, description: 'Boss 关。前半段清理怪潮，后半段暗黑领主出现。', buffKills: [8, 18], ordered: true,
      waves: [...makeWave('slime', 8), ...makeWave('goblin', 8, [0, 2]), ...makeWave('lava-slime', 6), ...makeWave('demon', 3, [1]), { type: 'boss', lane: 1 }, ...makeWave('slime', 4), ...makeWave('goblin', 4, [0, 2])],
    },
  };

  const MONSTERS = {
    slime: { name: '普通史莱姆', hp: 24, speed: 30, damage: 6, gold: 6, className: 'slime', assetKey: 'slime' },
    'lava-slime': { name: '熔岩史莱姆', hp: 38, speed: 26, damage: 8, gold: 11, className: 'lava-slime', assetKey: 'lavaSlime' },
    goblin: { name: '哥布林', hp: 26, speed: 48, damage: 7, gold: 8, className: 'goblin', assetKey: 'goblin' },
    demon: { name: '恶魔精英', hp: 95, speed: 24, damage: 18, gold: 22, className: 'demon', assetKey: 'demon' },
    boss: { name: '暗黑领主', hp: 440, speed: 16, damage: 30, gold: 80, className: 'boss', assetKey: 'demon', isBoss: true },
  };

  const UPGRADES = {
    weapon: {
      label: '武器升级',
      saveKey: 'weaponLevel',
      max: 4,
      costs: { 1: 50, 2: 100, 3: 180 },
      desc: '提升普通攻击伤害。',
    },
    speed: {
      label: '攻速升级',
      saveKey: 'speedLevel',
      max: 3,
      costs: { 1: 60, 2: 120 },
      desc: '降低自动射击间隔。',
    },
    cooldown: {
      label: '冷却升级',
      saveKey: 'cooldownLevel',
      max: 3,
      costs: { 1: 70, 2: 140 },
      desc: '缩短火雨术冷却时间。',
    },
  };

  const SKILL_COOLDOWNS = { 1: 8000, 2: 6500, 3: 5000 };
  const BUFF_POOL = [
    { id: 'power', name: '火力增强', desc: '本局攻击力 +30%', apply: () => { battle.runBuffs.damageMul *= 1.3; } },
    { id: 'haste', name: '极速施法', desc: '本局攻击速度 +25%', apply: () => { battle.runBuffs.speedMul *= 1.25; } },
    { id: 'cooldown', name: '冷却压缩', desc: '本局火雨术 CD -20%', apply: () => { battle.runBuffs.skillCdMul *= 0.8; } },
    { id: 'pierce', name: '穿透魔弹', desc: '本局子弹穿透 +1', apply: () => { battle.runBuffs.pierce += 1; } },
    { id: 'blast', name: '爆裂魔弹', desc: '本局普攻命中产生小范围爆炸', apply: () => { battle.runBuffs.blast = true; } },
    { id: 'greed', name: '金币贪婪', desc: '本局怪物金币 +50%', apply: () => { battle.runBuffs.goldMul *= 1.5; } },
    { id: 'meteor', name: '火雨强化', desc: '本局火雨术伤害 +40%', apply: () => { battle.runBuffs.skillDamageMul *= 1.4; } },
    { id: 'repair', name: '城墙修复', desc: '立即恢复城墙 20 点血量', apply: () => { battle.wallHp = Math.min(battle.maxWallHp, battle.wallHp + 20); renderBattleHud(); } },
  ];

  const dom = {
    pages: {
      home: document.getElementById('homePage'),
      levels: document.getElementById('levelPage'),
      battle: document.getElementById('battlePage'),
    },
    homeGold: document.getElementById('homeGold'),
    homePower: document.getElementById('homePower'),
    homeWeapon: document.getElementById('homeWeapon'),
    homeSpeed: document.getElementById('homeSpeed'),
    homeCooldown: document.getElementById('homeCooldown'),
    homeHighest: document.getElementById('homeHighest'),
    toast: document.getElementById('toast'),
    levelList: document.getElementById('levelList'),
    modalLayer: document.getElementById('modalLayer'),
    upgradeModal: document.getElementById('upgradeModal'),
    upgradeList: document.getElementById('upgradeList'),
    buffModal: document.getElementById('buffModal'),
    buffOptions: document.getElementById('buffOptions'),
    resultModal: document.getElementById('resultModal'),
    resultTitle: document.getElementById('resultTitle'),
    resultDesc: document.getElementById('resultDesc'),
    resultStats: document.getElementById('resultStats'),
    resultActions: document.getElementById('resultActions'),
    infoModal: document.getElementById('infoModal'),
    infoTitle: document.getElementById('infoTitle'),
    infoSubtitle: document.getElementById('infoSubtitle'),
    infoContent: document.getElementById('infoContent'),
    infoActions: document.getElementById('infoActions'),
    battleField: document.getElementById('battleField'),
    entityLayer: document.getElementById('entityLayer'),
    hero: document.getElementById('hero'),
    battleLevelName: document.getElementById('battleLevelName'),
    wallHpText: document.getElementById('wallHpText'),
    bossBar: document.getElementById('bossBar'),
    bossName: document.getElementById('bossName'),
    bossHpFill: document.getElementById('bossHpFill'),
    remainingText: document.getElementById('remainingText'),
    battleGoldText: document.getElementById('battleGoldText'),
    fireSkillBtn: document.getElementById('fireSkillBtn'),
    skillCdText: document.getElementById('skillCdText'),
  };

  let save = loadSave();
  let rafId = 0;
  let uid = 1;
  let activePointerId = null;
  const laneRatios = [0.25, 0.5, 0.75];

  const battle = {
    active: false,
    paused: false,
    level: null,
    levelId: 1,
    width: 0,
    height: 0,
    heroX: 0,
    heroY: 0,
    targetHeroX: 0,
    monsters: [],
    bullets: [],
    effects: [],
    spawnQueue: [],
    spawnTimer: 0,
    attackTimer: 0,
    skillTimer: 0,
    skillCooldown: 0,
    wallHp: 100,
    maxWallHp: 100,
    killed: 0,
    spawned: 0,
    earnedGold: 0,
    runBuffs: null,
    pendingBuffKills: [],
    totalMonsters: 0,
    boss: null,
    bossBuffGiven: false,
    lastTime: 0,
  };

  function loadSave() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      const loadedSave = raw ? JSON.parse(raw) : {};
      const migratedFirstClears = { ...(loadedSave.firstClears || {}) };
      for (let id = 1; id <= 8; id += 1) {
        if (loadedSave[`firstClear${id}`] !== undefined) migratedFirstClears[String(id)] = Boolean(loadedSave[`firstClear${id}`]);
      }
      return {
        ...defaultSave,
        ...loadedSave,
        highestLevel: Number(loadedSave.highestLevel || defaultSave.highestLevel),
        firstClears: { ...defaultSave.firstClears, ...migratedFirstClears },
      };
    } catch (err) {
      console.warn('读取存档失败，已使用默认存档。', err);
      return { ...defaultSave, firstClears: { ...defaultSave.firstClears } };
    }
  }

  function writeSave() {
    localStorage.setItem(SAVE_KEY, JSON.stringify(save));
  }

  function resetRunBuffs() {
    battle.runBuffs = {
      damageMul: 1,
      speedMul: 1,
      skillCdMul: 1,
      pierce: 0,
      blast: false,
      goldMul: 1,
      skillDamageMul: 1,
    };
  }

  function getPower() {
    return 100 + save.weaponLevel * 80 + save.speedLevel * 60 + save.cooldownLevel * 70;
  }

  function baseDamage() {
    return (12 + (save.weaponLevel - 1) * 7) * battle.runBuffs.damageMul;
  }

  function attackInterval() {
    const base = Math.max(360, 700 - (save.speedLevel - 1) * 95);
    return base / battle.runBuffs.speedMul;
  }

  function currentSkillCooldown() {
    return SKILL_COOLDOWNS[save.cooldownLevel] * battle.runBuffs.skillCdMul;
  }


  function isLevelUnlocked(levelId) {
    return levelId <= Math.max(2, (save.highestLevel || 0) + 1);
  }

  function firstClearKey(levelId) {
    return String(levelId);
  }

  function isFirstCleared(levelId) {
    return Boolean(save.firstClears[firstClearKey(levelId)]);
  }

  function levelMultiplier(levelId) {
    return 1 + (levelId - 1) * 0.12;
  }

  function expandLevelQueue(level) {
    const queue = level.waves.map(entry => (typeof entry === 'string' ? { type: entry } : { ...entry }));
    return level.ordered ? queue : shuffle(queue);
  }

  function setViewportHeight() {
    document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);
  }

  function showPage(name) {
    Object.values(dom.pages).forEach(page => page.classList.remove('active'));
    dom.pages[name].classList.add('active');
    if (name !== 'battle') stopBattle(false);
    if (name === 'home') renderHome();
    if (name === 'levels') renderLevelSelect();
  }

  function showToast(message) {
    dom.toast.textContent = message;
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => { dom.toast.textContent = ''; }, 1800);
  }

  function allModals() {
    return [dom.upgradeModal, dom.buffModal, dom.resultModal, dom.infoModal];
  }

  function openModal(which) {
    allModals().forEach(modal => modal.classList.remove('active'));
    dom.modalLayer.classList.add('active');
    dom.modalLayer.setAttribute('aria-hidden', 'false');
    which.classList.add('active');
  }

  function closeModal() {
    dom.modalLayer.classList.remove('active');
    dom.modalLayer.setAttribute('aria-hidden', 'true');
    allModals().forEach(modal => modal.classList.remove('active'));
    resetResultModal();
    resetInfoModal();
  }

  function updateHome() {
    dom.homeGold.textContent = save.gold;
    dom.homePower.textContent = getPower();
    dom.homeWeapon.textContent = `武器 Lv.${save.weaponLevel}`;
    dom.homeSpeed.textContent = `攻速 Lv.${save.speedLevel}`;
    dom.homeCooldown.textContent = `冷却 ${SKILL_COOLDOWNS[save.cooldownLevel] / 1000} 秒`;
    dom.homeHighest.textContent = save.highestLevel > 0 ? `最高 第 ${save.highestLevel} 关` : '最高 未通关';
  }


  const renderHome = updateHome;
  const renderLevelSelect = renderLevels;
  const renderUpgradeModal = renderUpgrades;
  const renderBattleHud = updateBattleHud;

  function renderLevels() {
    dom.levelList.innerHTML = '';
    Object.values(LEVELS).forEach(level => {
      const cleared = isFirstCleared(level.id);
      const unlocked = isLevelUnlocked(level.id);
      const card = document.createElement('article');
      card.className = `level-card ${unlocked ? '' : 'locked'}`;
      card.innerHTML = `
        <h3>第 ${level.id} 关：${level.shortName}</h3>
        <p>奖励金币 ${level.reward}，首次通关额外金币 ${level.firstReward}</p>
        <p>${level.description}</p>
        <div class="level-footer">
          <span class="badge">${cleared ? '已通关' : (unlocked ? '可挑战' : '未解锁')}</span>
          <button class="btn btn-secondary" data-level-id="${level.id}">${unlocked ? '挑战' : '未解锁'}</button>
        </div>`;
      dom.levelList.appendChild(card);
    });
  }

  function renderUpgrades() {
    const icons = { weapon: '⚔️', speed: '⚡', cooldown: '🔥' };
    const nextHints = {
      weapon: '下一级：攻击力提升',
      speed: '下一级：攻击间隔缩短',
      cooldown: '下一级：火雨术冷却缩短',
    };
    dom.upgradeList.innerHTML = '';
    Object.entries(UPGRADES).forEach(([id, item]) => {
      const level = save[item.saveKey];
      const maxed = level >= item.max;
      const cost = item.costs[level];
      const affordable = maxed || save.gold >= cost;
      const card = document.createElement('button');
      card.className = `upgrade-card ${maxed ? 'is-maxed' : ''}`;
      card.dataset.upgrade = id;
      card.disabled = maxed || !affordable;
      card.innerHTML = `
        <div class="upgrade-icon">${icons[id]}</div>
        <div class="upgrade-info">
          <strong>${item.label} Lv.${level}</strong>
          <span>${item.desc}</span>
          <em>${maxed ? '已达到最高等级' : nextHints[id]}</em>
        </div>
        <div class="upgrade-cost ${affordable ? '' : 'is-poor'}">${maxed ? '已满级' : `金币 ${cost}`}</div>`;
      dom.upgradeList.appendChild(card);
    });
  }

  function startBattle(levelId) {
    if (!isLevelUnlocked(levelId)) {
      showToast('请先通关上一关');
      alert('请先通关上一关');
      return;
    }
    closeModal();
    resetRunBuffs();
    const level = LEVELS[levelId];
    Object.assign(battle, {
      active: true,
      paused: false,
      level,
      levelId,
      monsters: [],
      bullets: [],
      effects: [],
      spawnQueue: expandLevelQueue(level),
      spawnTimer: 250,
      attackTimer: 250,
      skillTimer: 0,
      skillCooldown: currentSkillCooldown(),
      wallHp: level.wallHp,
      maxWallHp: level.wallHp,
      killed: 0,
      spawned: 0,
      earnedGold: 0,
      pendingBuffKills: [...level.buffKills],
      totalMonsters: level.waves.length,
      boss: null,
      bossBuffGiven: false,
      lastTime: performance.now(),
    });
    dom.entityLayer.innerHTML = '';
    showPage('battle');
    resizeBattle();
    battle.heroX = battle.width / 2;
    battle.targetHeroX = battle.heroX;
    battle.heroY = battle.height * 0.84;
    updateHero(true);
    renderBattleHud();
    updateSkillButton();
    cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(loop);
  }

  function stopBattle(clearBuffs = true) {
    if (!battle.active && !battle.paused) return;
    battle.active = false;
    battle.paused = false;
    cancelAnimationFrame(rafId);
    dom.entityLayer.innerHTML = '';
    battle.monsters = [];
    battle.bullets = [];
    battle.effects = [];
    battle.boss = null;
    updateBossBar();
    if (clearBuffs) resetRunBuffs();
  }

  function resizeBattle() {
    const rect = dom.battleField.getBoundingClientRect();
    battle.width = rect.width;
    battle.height = rect.height;
    battle.heroY = battle.height * 0.84;
    battle.targetHeroX = clamp(battle.targetHeroX || battle.width / 2, 36, battle.width - 36);
    battle.heroX = clamp(battle.heroX || battle.width / 2, 36, battle.width - 36);
    updateHero(true);
  }

  function loop(now) {
    if (!battle.active) return;
    const dt = Math.min(0.045, (now - battle.lastTime) / 1000 || 0);
    battle.lastTime = now;
    if (!battle.paused) updateBattle(dt);
    rafId = requestAnimationFrame(loop);
  }

  function updateBattle(dt) {
    battle.heroX += (battle.targetHeroX - battle.heroX) * Math.min(1, dt * 14);
    updateHero();
    battle.spawnTimer -= dt * 1000;
    if (battle.spawnQueue.length && battle.spawnTimer <= 0) spawnMonster();

    battle.attackTimer -= dt * 1000;
    if (battle.attackTimer <= 0) {
      shootBullet();
      battle.attackTimer = attackInterval();
    }

    if (battle.skillTimer > 0) {
      battle.skillTimer = Math.max(0, battle.skillTimer - dt * 1000);
      updateSkillButton();
    }

    updateMonsters(dt);
    updateBullets(dt);
    updateEffects(dt);
    updateBossBehavior(dt);
    renderBattleHud();
    checkBattleEnd();
  }

  function monsterAsset(cfg) {
    return ASSETS[cfg.assetKey] || ASSETS.fallbackMonster;
  }

  function bindMonsterImageFallback(sprite, wrapper) {
    sprite.dataset.fallbackStep = '0';
    sprite.addEventListener('error', () => {
      if (sprite.dataset.fallbackStep === '0') {
        sprite.dataset.fallbackStep = '1';
        sprite.src = ASSETS.fallbackMonster;
        return;
      }
      wrapper.classList.add('fallback-monster');
      sprite.hidden = true;
    });
  }

  function spawnMonster(forced = null) {
    const entry = forced || battle.spawnQueue.shift();
    const type = typeof entry === 'string' ? entry : entry.type;
    const cfg = MONSTERS[type];
    const laneIndex = typeof entry?.lane === 'number' ? entry.lane : Math.floor(Math.random() * laneRatios.length);
    const x = battle.width * laneRatios[laneIndex];
    const y = battle.height * (cfg.isBoss ? 0.11 : 0.13);
    const el = document.createElement('div');
    el.className = `monster ${cfg.className}`;
    el.innerHTML = `<div class="monster-body"><img class="monster-sprite" src="${monsterAsset(cfg)}" alt="${cfg.name}" draggable="false"></div><span class="monster-hp hpbar"><i style="width:100%"></i></span>`;
    const sprite = el.querySelector('.monster-sprite');
    bindMonsterImageFallback(sprite, el);
    dom.entityLayer.appendChild(el);
    const monster = createMonsterState(type, cfg, laneIndex, x, y, el);
    battle.monsters.push(monster);
    if (cfg.isBoss) onBossSpawn(monster);
    if (forced) battle.totalMonsters += 1;
    else battle.spawned += 1;
    battle.spawnTimer = battle.level.spawnInterval;
    position(el, x, y);
  }

  function createMonsterState(type, cfg, laneIndex, x, y, el) {
    const level = battle.levelId;
    const hpMul = (cfg.isBoss ? 1 : levelMultiplier(level)) * (battle.level.hpMul || 1);
    const speedMul = (cfg.isBoss ? 1 : (1 + (level - 1) * 0.04)) * (battle.level.speedMul || 1);
    const damageMul = cfg.isBoss ? 1 : (1 + (level - 1) * 0.08);
    const maxHp = Math.ceil(cfg.hp * hpMul);
    return {
      id: uid++, type, cfg, laneIndex, x, y, el,
      hp: maxHp, maxHp,
      speed: cfg.speed * speedMul,
      damage: Math.ceil(cfg.damage * damageMul),
      attackTimer: 0,
      summonTimer: 3500,
      enraged: false,
    };
  }

  function onBossSpawn(monster) {
    battle.boss = monster;
    monster.hp = monster.maxHp = Math.ceil(MONSTERS.demon.hp * 4.7);
    dom.battleField.classList.add('shake');
    setTimeout(() => dom.battleField.classList.remove('shake'), 520);
    showToast('暗黑领主降临！');
    updateBossBar();
    if (!battle.bossBuffGiven) {
      battle.bossBuffGiven = true;
      openBuffChoice('暗黑领主出现，选择一项强化迎战！');
    }
  }

  function updateMonsters(dt) {
    const wallY = battle.height * 0.78;
    for (const monster of [...battle.monsters]) {
      if (monster.y < wallY) {
        monster.y += monster.speed * dt;
      } else {
        monster.attackTimer -= dt * 1000;
        if (monster.attackTimer <= 0) {
          battle.wallHp = Math.max(0, battle.wallHp - monster.damage);
          showFloat(monster.x, monster.y - 20, `城墙-${monster.damage}`, 'big');
          monster.attackTimer = 1000;
        }
      }
      const hp = monster.el.querySelector('.hpbar i');
      if (hp) hp.style.width = `${Math.max(0, monster.hp / monster.maxHp * 100)}%`;
      position(monster.el, monster.x, monster.y);
    }
    updateBossBar();
  }

  function shootBullet() {
    const shotX = battle.heroX + 10;
    const shotY = battle.heroY - 48;
    const el = document.createElement('div');
    el.className = 'bullet magic-bullet';
    el.innerHTML = '<span class="bullet-trail"></span><span class="bullet-core"></span>';
    dom.entityLayer.appendChild(el);
    const bullet = {
      id: uid++,
      startX: shotX,
      startY: shotY,
      x: shotX,
      y: shotY,
      speed: 520,
      damage: baseDamage(),
      pierceLeft: battle.runBuffs.pierce,
      lane: getPlayerLane(),
      hitIds: new Set(),
      el,
    };
    battle.bullets.push(bullet);
    position(el, bullet.x, bullet.y);
  }

  function getPlayerLane() {
    return laneRatios.reduce((best, ratio, index) => {
      const distanceToLane = Math.abs(battle.heroX - battle.width * ratio);
      return distanceToLane < best.distance ? { index, distance: distanceToLane } : best;
    }, { index: 1, distance: Infinity }).index;
  }

  function updateBullets(dt) {
    const hitRadiusX = 34;
    const hitRadiusY = 36;
    for (const bullet of [...battle.bullets]) {
      bullet.y -= bullet.speed * dt;
      bullet.el.style.transform = 'translate(-50%, -50%)';
      position(bullet.el, bullet.x, bullet.y);

      const hit = battle.monsters.find(m => !bullet.hitIds.has(m.id)
        && Math.abs(m.x - bullet.x) < hitRadiusX
        && Math.abs(m.y - bullet.y) < hitRadiusY);
      if (hit) {
        bullet.hitIds.add(hit.id);
        showHitSpark(hit.x, hit.y - 4, false);
        damageMonster(hit, bullet.damage, false);
        if (battle.runBuffs.blast) explodeAt(hit.x, hit.y, 46, bullet.damage * 0.45, false);
        if (bullet.pierceLeft > 0) {
          bullet.pierceLeft -= 1;
        } else {
          removeBullet(bullet);
        }
      } else if (bullet.y < -50) {
        removeBullet(bullet);
      }
    }
  }

  function castFireRain() {
    if (!battle.active || battle.paused || battle.skillTimer > 0) return;
    const cluster = densePoint();
    battle.skillTimer = battle.skillCooldown = currentSkillCooldown();
    updateSkillButton();
    dom.battleField.classList.add('shake');
    setTimeout(() => dom.battleField.classList.remove('shake'), 520);
    const count = 5 + Math.floor(Math.random() * 4);
    for (let i = 0; i < count; i += 1) {
      const endX = clamp(cluster.x + (Math.random() - 0.5) * 130, 34, battle.width - 34);
      const endY = clamp(cluster.y + (Math.random() - 0.5) * 120, 92, battle.height * 0.76);
      const el = document.createElement('img');
      el.className = 'meteor';
      el.src = ASSETS.meteor;
      el.alt = '火雨术陨石';
      dom.entityLayer.appendChild(el);
      battle.effects.push({ type: 'meteor', el, x: clamp(endX - 90 + Math.random() * 80, -30, battle.width + 30), y: -90 - i * 34, endX, endY, t: 0, duration: 0.34 + i * 0.055, damage: 45 * battle.runBuffs.skillDamageMul });
    }
  }

  function densePoint() {
    if (!battle.monsters.length) return { x: battle.width * laneRatios[Math.floor(Math.random() * laneRatios.length)], y: battle.height * (0.26 + Math.random() * 0.24) };
    return [...battle.monsters].sort((a, b) => nearbyCount(b) - nearbyCount(a))[0];
  }

  function nearbyCount(monster) {
    return battle.monsters.filter(other => distance(monster, other) < 110).length;
  }

  function updateEffects(dt) {
    for (const fx of [...battle.effects]) {
      fx.t += dt;
      if (fx.type === 'meteor') {
        const p = Math.min(1, fx.t / fx.duration);
        const x = fx.x + (fx.endX - fx.x) * p;
        const y = fx.y + (fx.endY - fx.y) * p;
        position(fx.el, x, y);
        if (p >= 1) {
          fx.el.remove();
          battle.effects = battle.effects.filter(item => item !== fx);
          dom.battleField.classList.add('shake');
          setTimeout(() => dom.battleField.classList.remove('shake'), 180);
          explodeAt(fx.endX, fx.endY, 92, fx.damage, true);
        }
      }
    }
  }

  function explodeAt(x, y, radius, damage, big) {
    const el = document.createElement('img');
    el.className = 'explosion';
    el.src = ASSETS.explosion;
    el.alt = '爆炸';
    dom.entityLayer.appendChild(el);
    position(el, x, y);
    setTimeout(() => el.remove(), 460);
    if (big) showHitSpark(x, y, true);
    battle.monsters.filter(m => distance(m, { x, y }) <= radius).forEach(m => damageMonster(m, damage, big));
  }

  function showHitSpark(x, y, big) {
    const spark = document.createElement('span');
    spark.className = `hit-spark ${big ? 'big' : ''}`;
    dom.entityLayer.appendChild(spark);
    position(spark, x, y);
    setTimeout(() => spark.remove(), big ? 360 : 220);
  }

  function damageMonster(monster, damage, big) {
    if (!battle.monsters.includes(monster) || monster.dead) return;
    const finalDamage = Math.ceil(damage);
    monster.hp -= finalDamage;
    monster.el.classList.add('is-hit');
    clearTimeout(monster.hitTimer);
    monster.hitTimer = setTimeout(() => monster.el.classList.remove('is-hit'), 120);
    showFloat(monster.x + (Math.random() - 0.5) * 22, monster.y - 26 - Math.random() * 14, `-${finalDamage}`, big ? 'big' : '');
    if (monster.cfg.isBoss) updateBossBar();
    if (monster.hp <= 0) killMonster(monster);
  }

  function killMonster(monster) {
    if (monster.dead) return;
    monster.dead = true;
    battle.monsters = battle.monsters.filter(item => item !== monster);
    monster.el.classList.remove('is-hit');
    monster.el.classList.add('is-dead');
    battle.killed += 1;
    if (monster.cfg.isBoss) {
      battle.boss = null;
      updateBossBar();
    }
    const gold = Math.ceil(monster.cfg.gold * battle.runBuffs.goldMul);
    battle.earnedGold += gold;
    showCoin(monster.x, monster.y, gold);
    setTimeout(() => monster.el.remove(), 280);
    if (battle.pendingBuffKills[0] && battle.killed >= battle.pendingBuffKills[0]) {
      battle.pendingBuffKills.shift();
      openBuffChoice();
    }
  }

  function openBuffChoice(title = '选择本局强化') {
    battle.paused = true;
    document.getElementById('buffTitle').textContent = title;
    dom.buffOptions.innerHTML = '';
    sample(BUFF_POOL, 3).forEach(buff => {
      const card = document.createElement('button');
      card.className = 'buff-card';
      card.innerHTML = `<h3>${buff.name}</h3><p>${buff.desc}</p>`;
      card.addEventListener('click', () => {
        buff.apply();
        closeModal();
        battle.paused = false;
        battle.lastTime = performance.now();
      }, { once: true });
      dom.buffOptions.appendChild(card);
    });
    openModal(dom.buffModal);
  }

  function finishBattle(win) {
    const level = battle.level;
    const firstKey = firstClearKey(level.id);
    battle.active = false;
    cancelAnimationFrame(rafId);
    if (win) {
      const firstBonus = save.firstClears[firstKey] ? 0 : level.firstReward;
      const total = level.reward + firstBonus + battle.earnedGold;
      save.gold += total;
      save.firstClears[firstKey] = true;
      save.highestLevel = Math.max(save.highestLevel || 0, level.id);
      writeSave();
      showResult(true, total, firstBonus);
    } else {
      showResult(false, 0, 0);
    }
    resetRunBuffs();
  }

  function showResult(win, gold, firstBonus) {
    resetResultModal();
    dom.resultTitle.textContent = win ? '通关成功' : '城墙被攻破';
    if (win) {
      dom.resultDesc.innerHTML = `<strong>总获得金币：${gold}</strong><span>基础通关奖励：${battle.level.reward}</span><span>本局击杀金币：${battle.earnedGold}</span>${firstBonus ? `<span>首次通关奖励：${firstBonus}</span>` : ''}`;
      dom.resultStats.textContent = `当前战斗力：${getPower()}`;
    } else {
      dom.resultDesc.textContent = '怪物突破了防线，升级装备后再来挑战吧';
      dom.resultStats.textContent = `当前战斗力：${getPower()} · 本局击杀：${battle.killed}`;
    }
    const homeBtn = actionButton('返回首页', () => { closeModal(); resetResultModal(); showPage('home'); });
    dom.resultActions.appendChild(homeBtn);
    if (win) {
      const nextId = battle.levelId + 1;
      dom.resultActions.appendChild(actionButton(nextId <= 8 ? '下一关' : '已通关当前版本', () => {
        closeModal();
        resetResultModal();
        if (nextId <= 8) startBattle(nextId);
        else showPage('home');
      }));
    } else {
      dom.resultActions.appendChild(actionButton('装备升级', () => { closeModal(); resetResultModal(); showPage('home'); openUpgrade(); }));
    }
    openModal(dom.resultModal);
  }

  function resetResultModal() {
    dom.resultTitle.textContent = '';
    dom.resultDesc.textContent = '';
    dom.resultStats.textContent = '';
    dom.resultActions.replaceChildren();
  }


  function resetInfoModal() {
    dom.infoTitle.textContent = '';
    dom.infoSubtitle.textContent = '';
    dom.infoContent.replaceChildren();
    dom.infoActions.replaceChildren();
  }

  function addInfoAction(text, onClick, extraClass = 'btn-secondary') {
    const btn = document.createElement('button');
    btn.className = `btn ${extraClass}`;
    btn.textContent = text;
    btn.addEventListener('click', onClick);
    dom.infoActions.appendChild(btn);
    return btn;
  }

  function openInfoModal(title, subtitle, contentHtml, actions = []) {
    resetInfoModal();
    openModal(dom.infoModal);
    dom.infoTitle.textContent = title;
    dom.infoSubtitle.textContent = subtitle;
    dom.infoContent.innerHTML = contentHtml;
    actions.forEach(action => addInfoAction(action.text, action.onClick, action.className || 'btn-secondary'));
    if (!actions.length) addInfoAction('关闭', closeModal);
  }

  function openSkillModal() {
    openInfoModal('技能系统', '升级技能可以增强火雨术效果。当前版本先开放火雨术。', `
      <article class="info-card">
        <div class="info-card-row"><div class="info-icon">🔥</div><div><strong>火雨术</strong><span>当前等级：Lv.${save.cooldownLevel}</span></div><em class="info-tag">已解锁</em></div>
        <p>当前 CD：${SKILL_COOLDOWNS[save.cooldownLevel] / 1000} 秒</p>
        <p>当前伤害倍率：${battle.runBuffs?.skillDamageMul || 1}x</p>
        <p>召唤陨石攻击怪物密集区域，造成范围伤害。</p>
      </article>`, [
        { text: '了解技能', onClick: () => showToast('火雨术会优先攻击怪物密集区域') },
        { text: '关闭', onClick: closeModal },
      ]);
  }

  function openTalentModal() {
    openInfoModal('天赋系统', '天赋将在后续版本开放，当前可预览成长方向。', `
      ${talentCard('🎯', '战斗专注', '普攻伤害提升')}
      ${talentCard('🔮', '魔力回流', '火雨术击杀后减少冷却')}
      ${talentCard('🛡️', '城墙守护', '开局增加城墙血量')}
    `, [{ text: '关闭', onClick: closeModal }]);
    dom.infoContent.querySelectorAll('.info-card').forEach(card => card.addEventListener('click', () => showToast('该天赋将在后续版本开放')));
  }

  function talentCard(icon, name, desc) {
    return `<button class="info-card clickable"><div class="info-card-row"><div class="info-icon">${icon}</div><div><strong>${name}</strong><span>效果预览：${desc}</span></div><em class="info-tag">未开放</em></div></button>`;
  }

  function openShopModal() {
    openInfoModal('神秘商店', '商店功能将在后续版本开放。', `
      ${shopCard('💎', '魔法水晶', '未来用于技能突破')}
      ${shopCard('🧰', '城墙修复包', '战斗中恢复城墙')}
      ${shopCard('🪙', '金币礼包', '未来活动奖励')}
    `, [{ text: '关闭', onClick: closeModal }]);
    dom.infoContent.querySelectorAll('.info-card').forEach(card => card.addEventListener('click', () => showToast('商店功能暂未开放')));
  }

  function shopCard(icon, name, usage) {
    return `<button class="info-card clickable"><div class="info-card-row"><div class="info-icon">${icon}</div><div><strong>${name}</strong><span>用途：${usage}</span></div><em class="info-tag">未开放</em></div></button>`;
  }

  function openGuideModal() {
    openInfoModal('玩法说明', '', `
      <ol class="guide-list">
        <li>怪物会从顶部传送门出现，并沿三条路线向下进攻。</li>
        <li>玩家在底部左右滑动，自动发射魔法弹攻击怪物。</li>
        <li>点击火雨术可以释放范围攻击。</li>
        <li>击杀一定数量怪物后，可以选择本局强化。</li>
        <li>本局强化只在当前战斗有效。</li>
        <li>通关获得金币。</li>
        <li>金币可以用于永久升级装备。</li>
        <li>城墙血量归零则失败。</li>
      </ol>`, [{ text: '我知道了', onClick: closeModal }]);
  }

  function openStatusModal() {
    const highest = save.highestLevel || 0;
    openInfoModal('当前状态', '这里展示当前本地存档数据。', `
      <div class="status-grid">
        <div>金币<strong>${save.gold}</strong></div>
        <div>战斗力<strong>${getPower()}</strong></div>
        <div>武器等级<strong>Lv.${save.weaponLevel}</strong></div>
        <div>攻速等级<strong>Lv.${save.speedLevel}</strong></div>
        <div>冷却等级<strong>Lv.${save.cooldownLevel}</strong></div>
        <div>最高通关<strong>${highest ? `第 ${highest} 关` : '未通关'}</strong></div>
      </div>`, [
        { text: '重置存档', className: 'btn-danger', onClick: resetSaveFromModal },
        { text: '关闭', onClick: closeModal },
      ]);
  }

  function resetSaveFromModal() {
    if (confirm('确定要清空所有存档吗？金币、装备等级和通关记录都会重置。')) {
      localStorage.removeItem(SAVE_KEY);
      save = { ...defaultSave, firstClears: { ...defaultSave.firstClears } };
      writeSave();
      renderHome();
      closeModal();
      showToast('存档已重置');
    }
  }

  function checkBattleEnd() {
    if (battle.wallHp <= 0) finishBattle(false);
    const allSpawned = battle.spawnQueue.length === 0 && battle.spawned >= battle.level.waves.length;
    if (allSpawned && battle.monsters.length === 0 && battle.active) finishBattle(true);
  }

  function updateBattleHud() {
    if (!battle.level) return;
    const remaining = Math.max(0, battle.totalMonsters - battle.killed);
    dom.battleLevelName.textContent = battle.level.shortName;
    dom.wallHpText.textContent = `${Math.ceil(battle.wallHp)}/${battle.maxWallHp}`;
    dom.remainingText.textContent = remaining;
    dom.battleGoldText.textContent = battle.earnedGold;
  }


  function updateBossBar() {
    const boss = battle.boss && !battle.boss.dead ? battle.boss : null;
    dom.bossBar.classList.toggle('active', Boolean(boss));
    if (!boss) {
      dom.bossBar.classList.remove('enraged');
      return;
    }
    const ratio = Math.max(0, boss.hp / boss.maxHp);
    dom.bossName.textContent = boss.enraged ? '暗黑领主 · 狂暴' : '暗黑领主';
    dom.bossHpFill.style.width = `${ratio * 100}%`;
    dom.bossBar.classList.toggle('enraged', boss.enraged);
  }

  function updateBossBehavior(dt) {
    const boss = battle.boss;
    if (!boss || boss.dead) return;
    if (!boss.enraged && boss.hp <= boss.maxHp * 0.5) {
      boss.enraged = true;
      boss.speed *= 1.15;
      boss.el.classList.add('enraged');
      showToast('暗黑领主进入狂暴阶段！');
      updateBossBar();
    }
    if (boss.enraged) {
      boss.summonTimer -= dt * 1000;
      if (boss.summonTimer <= 0) {
        spawnMonster({ type: Math.random() > 0.5 ? 'goblin' : 'slime', lane: Math.random() > 0.5 ? 0 : 2 });
        spawnMonster({ type: 'slime', lane: 1 });
        boss.summonTimer = 4200;
      }
    }
  }

  function updateSkillButton() {
    if (battle.skillTimer > 0) {
      dom.fireSkillBtn.classList.add('cooling');
      dom.fireSkillBtn.classList.remove('ready');
      dom.skillCdText.classList.remove('ready');
      dom.skillCdText.textContent = `${(battle.skillTimer / 1000).toFixed(1)}s`;
    } else {
      dom.fireSkillBtn.classList.remove('cooling');
      dom.fireSkillBtn.classList.add('ready');
      dom.skillCdText.classList.add('ready');
      dom.skillCdText.textContent = '点击释放';
    }
  }

  function updateHero(force = false) {
    if (!force && !battle.active) return;
    position(dom.hero, battle.heroX, battle.heroY);
  }

  function setHeroTarget(clientX) {
    const rect = dom.battleField.getBoundingClientRect();
    battle.targetHeroX = clamp(clientX - rect.left, 38, battle.width - 38);
  }

  function openUpgrade() {
    renderUpgradeModal();
    openModal(dom.upgradeModal);
  }

  function actionButton(text, fn) {
    const btn = document.createElement('button');
    btn.className = 'btn btn-secondary';
    btn.textContent = text;
    btn.addEventListener('click', fn);
    return btn;
  }

  function showCoin(x, y, gold) {
    const coin = document.createElement('img');
    coin.className = 'coin';
    coin.src = ASSETS.coin;
    coin.alt = '金币掉落';
    dom.entityLayer.appendChild(coin);
    position(coin, x, y);
    setTimeout(() => coin.remove(), 820);
    showFloat(x, y - 22, `+${gold}`, 'gold');
  }

  function showFloat(x, y, text, type) {
    const el = document.createElement('span');
    el.className = `float-text ${type || ''}`;
    el.textContent = text;
    dom.entityLayer.appendChild(el);
    position(el, x, y);
    setTimeout(() => el.remove(), 720);
  }

  function removeBullet(bullet) {
    battle.bullets = battle.bullets.filter(item => item !== bullet);
    bullet.el.remove();
  }

  function position(el, x, y) {
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
  }

  function distance(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function sample(arr, count) {
    return shuffle([...arr]).slice(0, count);
  }

  function bindEvents() {
    document.getElementById('startBtn').addEventListener('click', () => startBattle(1));
    document.getElementById('upgradeBtn').addEventListener('click', openUpgrade);
    document.getElementById('levelSelectBtn').addEventListener('click', () => showPage('levels'));
    document.getElementById('statusBtn').addEventListener('click', openStatusModal);
    document.getElementById('guideBtn').addEventListener('click', openGuideModal);
    document.getElementById('navEquipmentBtn').addEventListener('click', openUpgrade);
    document.getElementById('navSkillBtn').addEventListener('click', openSkillModal);
    document.getElementById('navTalentBtn').addEventListener('click', openTalentModal);
    document.getElementById('levelBackBtn').addEventListener('click', () => showPage('home'));
    document.getElementById('battleHomeBtn').addEventListener('click', () => {
      if (confirm('确定返回首页？本局强化和进度会清空。')) showPage('home');
    });
    dom.levelList.addEventListener('click', event => {
      const btn = event.target.closest('[data-level-id]');
      if (btn) startBattle(Number(btn.dataset.levelId));
    });
    dom.upgradeList.addEventListener('click', event => {
      const btn = event.target.closest('[data-upgrade]');
      if (!btn) return;
      const item = UPGRADES[btn.dataset.upgrade];
      const current = save[item.saveKey];
      if (current >= item.max) {
        renderUpgradeModal();
        return;
      }
      const cost = item.costs[current];
      if (save.gold < cost) {
        showToast('金币不足，请先挑战关卡');
        renderUpgradeModal();
        return;
      }
      save.gold -= cost;
      save[item.saveKey] += 1;
      writeSave();
      renderHome();
      renderUpgradeModal();
      showToast('升级成功');
    });
    document.querySelectorAll('[data-close-modal]').forEach(btn => btn.addEventListener('click', closeModal));
    dom.modalLayer.addEventListener('click', event => {
      if (event.target === dom.modalLayer && !dom.buffModal.classList.contains('active')) closeModal();
    });
    dom.fireSkillBtn.addEventListener('click', castFireRain);

    dom.hero.src = ASSETS.activeHero;
    dom.hero.addEventListener('error', () => {
      if (!dom.hero.src.endsWith('demon.png')) dom.hero.src = ASSETS.heroFallback;
    });

    // Pointer Events 覆盖现代手机 touch 与电脑 mouse；下面额外保留 touch/mouse fallback，兼容旧浏览器。
    dom.battleField.addEventListener('pointerdown', event => {
      if (!battle.active || battle.paused) return;
      activePointerId = event.pointerId;
      dom.battleField.setPointerCapture(activePointerId);
      setHeroTarget(event.clientX);
    });
    dom.battleField.addEventListener('pointermove', event => {
      if (event.pointerId === activePointerId && battle.active && !battle.paused) setHeroTarget(event.clientX);
    });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(type => {
      dom.battleField.addEventListener(type, event => {
        if (event.pointerId === activePointerId) activePointerId = null;
      });
    });
    dom.battleField.addEventListener('touchstart', event => {
      if (!window.PointerEvent && battle.active && !battle.paused && event.touches[0]) setHeroTarget(event.touches[0].clientX);
    }, { passive: true });
    dom.battleField.addEventListener('touchmove', event => {
      event.preventDefault();
      if (!window.PointerEvent && battle.active && !battle.paused && event.touches[0]) setHeroTarget(event.touches[0].clientX);
    }, { passive: false });
    dom.battleField.addEventListener('touchend', () => { activePointerId = null; }, { passive: true });
    let mouseDragging = false;
    dom.battleField.addEventListener('mousedown', event => {
      if (!window.PointerEvent && battle.active && !battle.paused) { mouseDragging = true; setHeroTarget(event.clientX); }
    });
    window.addEventListener('mousemove', event => {
      if (!window.PointerEvent && mouseDragging && battle.active && !battle.paused) setHeroTarget(event.clientX);
    });
    window.addEventListener('mouseup', () => { mouseDragging = false; });
    window.addEventListener('keydown', event => {
      if (!battle.active || battle.paused) return;
      if (event.key === 'ArrowLeft') battle.targetHeroX = clamp(battle.targetHeroX - 28, 38, battle.width - 38);
      if (event.key === 'ArrowRight') battle.targetHeroX = clamp(battle.targetHeroX + 28, 38, battle.width - 38);
    });
    window.addEventListener('resize', () => { setViewportHeight(); resizeBattle(); });
  }

  function initAssetCssVars() {
    const root = document.documentElement;
    root.style.setProperty('--skill-icon-url', `url("${ASSETS.meteor}")`);
    const probe = new Image();
    probe.onerror = () => root.style.setProperty('--skill-icon-url', `url("${ASSETS.explosion}")`);
    probe.src = ASSETS.meteor;
  }

  function applyHotspotDebug() {
    document.querySelectorAll('.hotspot').forEach(btn => btn.classList.toggle('debug', DEBUG_HOTSPOTS));
  }

  function boot() {
    setViewportHeight();
    initAssetCssVars();
    applyHotspotDebug();
    resetRunBuffs();
    bindEvents();
    renderHome();
    renderLevelSelect();
  }

  boot();
})();
