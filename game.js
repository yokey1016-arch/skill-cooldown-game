/*
 * 我的技能没有冷却 - 纯前端竖屏守城小游戏
 * 所有配置集中在本文件，后续扩展第 3 关 Boss 时优先扩展 LEVELS、MONSTERS 和 battle 状态。
 */
(() => {
  'use strict';

  const ASSETS = {
    hero: 'assets/sprites/hero.png',
    heroFallback: 'assets/sprites/demon.png',
    // hero.png 当前检测为不透明白底素材；运行时先使用透明 demon.png 占位，保留正式路径方便后续替换。
    activeHero: 'assets/sprites/demon.png',
    sprites: {
      slime: 'assets/sprites/slime.png',
      // lava-slime.png 当前橙红火焰占比过高，怪物本体禁用火焰，临时复用透明 slime 图。
      'lava-slime': 'assets/sprites/slime.png',
      goblin: 'assets/sprites/goblin.png',
      demon: 'assets/sprites/demon.png',
    },
    fx: {
      bullet: 'assets/fx/bullet.png',
      coin: 'assets/fx/coin-drop.png',
      meteor: 'assets/fx/meteor.png',
      explosion: 'assets/fx/explosion.png',
    },
  };

  const SAVE_KEY = 'skillCooldownGameSaveV1';
  const DEFAULT_SAVE = {
    gold: 0,
    highestLevel: 1,
    weaponLevel: 1,
    speedLevel: 1,
    cooldownLevel: 1,
    firstClear1: false,
    firstClear2: false,
  };

  const LEVELS = {
    1: {
      id: 1,
      title: '第 1 关：新手怪潮',
      shortName: '新手怪潮',
      reward: 80,
      firstReward: 50,
      wallHp: 100,
      spawnInterval: 1150,
      description: '怪物较慢，适合教学。击杀 5 个怪物触发一次本局强化。',
      buffKills: [5],
      waves: [
        ...Array(10).fill('slime'),
        ...Array(2).fill('lava-slime'),
      ],
    },
    2: {
      id: 2,
      title: '第 2 关：高速突袭',
      shortName: '高速突袭',
      reward: 120,
      firstReward: 80,
      wallHp: 100,
      spawnInterval: 760,
      description: '怪物更多，速度更快。击杀 5 个和 10 个怪物各触发一次本局强化。',
      buffKills: [5, 10],
      waves: [
        ...Array(8).fill('slime'),
        ...Array(8).fill('goblin'),
        ...Array(2).fill('demon'),
      ],
    },
  };

  const MONSTERS = {
    slime: { name: '普通史莱姆', hp: 24, speed: 30, damage: 6, gold: 6, className: 'slime' },
    'lava-slime': { name: '厚皮史莱姆', hp: 38, speed: 26, damage: 8, gold: 11, className: 'lava-slime' },
    goblin: { name: '哥布林', hp: 26, speed: 48, damage: 7, gold: 8, className: 'goblin' },
    demon: { name: '恶魔精英', hp: 95, speed: 24, damage: 18, gold: 22, className: 'demon' },
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
    { id: 'repair', name: '城墙修复', desc: '立即恢复城墙 20 点血量', apply: () => { battle.wallHp = Math.min(battle.maxWallHp, battle.wallHp + 20); updateBattleHud(); } },
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
    homeCooldown: document.getElementById('homeCooldown'),
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
    battleField: document.getElementById('battleField'),
    entityLayer: document.getElementById('entityLayer'),
    hero: document.getElementById('hero'),
    battleLevelName: document.getElementById('battleLevelName'),
    wallHpText: document.getElementById('wallHpText'),
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
    lastTime: 0,
  };

  function loadSave() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      return raw ? { ...DEFAULT_SAVE, ...JSON.parse(raw) } : { ...DEFAULT_SAVE };
    } catch (err) {
      console.warn('读取存档失败，已使用默认存档。', err);
      return { ...DEFAULT_SAVE };
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

  function power() {
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

  function setViewportHeight() {
    document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);
  }

  function showPage(name) {
    Object.values(dom.pages).forEach(page => page.classList.remove('active'));
    dom.pages[name].classList.add('active');
    if (name !== 'battle') stopBattle(false);
    if (name === 'home') updateHome();
    if (name === 'levels') renderLevels();
  }

  function showToast(message) {
    dom.toast.textContent = message;
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => { dom.toast.textContent = ''; }, 1800);
  }

  function openModal(which) {
    dom.modalLayer.classList.add('active');
    dom.modalLayer.setAttribute('aria-hidden', 'false');
    [dom.upgradeModal, dom.buffModal, dom.resultModal].forEach(modal => modal.classList.remove('active'));
    which.classList.add('active');
  }

  function closeModal() {
    dom.modalLayer.classList.remove('active');
    dom.modalLayer.setAttribute('aria-hidden', 'true');
    [dom.upgradeModal, dom.buffModal, dom.resultModal].forEach(modal => modal.classList.remove('active'));
  }

  function updateHome() {
    dom.homeGold.textContent = save.gold;
    dom.homePower.textContent = power();
    dom.homeWeapon.textContent = `Lv.${save.weaponLevel}`;
    dom.homeCooldown.textContent = `${SKILL_COOLDOWNS[save.cooldownLevel] / 1000} 秒`;
  }

  function renderLevels() {
    dom.levelList.innerHTML = '';
    Object.values(LEVELS).forEach(level => {
      const cleared = save[`firstClear${level.id}`];
      const card = document.createElement('article');
      card.className = 'level-card';
      card.innerHTML = `
        <h3>${level.title}</h3>
        <p>奖励金币 ${level.reward}，首次通关额外金币 ${level.firstReward}</p>
        <p>${level.description}</p>
        <div class="level-footer">
          <span class="badge">${cleared ? '已通关' : '可挑战'}</span>
          <button class="btn btn-secondary" data-level-id="${level.id}">挑战</button>
        </div>`;
      dom.levelList.appendChild(card);
    });
  }

  function renderUpgrades() {
    dom.upgradeList.innerHTML = '';
    Object.entries(UPGRADES).forEach(([id, item]) => {
      const level = save[item.saveKey];
      const maxed = level >= item.max;
      const cost = item.costs[level];
      const el = document.createElement('div');
      el.className = 'upgrade-item';
      el.innerHTML = `
        <h3>${item.label} Lv.${level}${maxed ? '（已满级）' : ` → Lv.${level + 1}`}</h3>
        <p>${item.desc}</p>
        <div class="upgrade-meta">
          <strong>${maxed ? '最高等级' : `消耗 ${cost} 金币`}</strong>
          <button class="btn btn-secondary" data-upgrade="${id}" ${maxed ? 'disabled' : ''}>${maxed ? '已满级' : '升级'}</button>
        </div>`;
      dom.upgradeList.appendChild(el);
    });
  }

  function startBattle(levelId) {
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
      spawnQueue: shuffle([...level.waves]),
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
      lastTime: performance.now(),
    });
    dom.entityLayer.innerHTML = '';
    showPage('battle');
    resizeBattle();
    battle.heroX = battle.width / 2;
    battle.targetHeroX = battle.heroX;
    battle.heroY = battle.height * 0.84;
    updateHero(true);
    updateBattleHud();
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
    updateBattleHud();
    checkBattleEnd();
  }

  function spawnMonster() {
    const type = battle.spawnQueue.shift();
    const cfg = MONSTERS[type];
    const laneIndex = Math.floor(Math.random() * laneRatios.length);
    const x = battle.width * laneRatios[laneIndex];
    const y = battle.height * 0.08;
    const el = document.createElement('div');
    el.className = `monster ${cfg.className}`;
    el.innerHTML = `<img src="${ASSETS.sprites[type]}" alt="${cfg.name}" draggable="false"><span class="hpbar"><i style="width:100%"></i></span>`;
    dom.entityLayer.appendChild(el);
    battle.monsters.push({
      id: uid++, type, cfg, laneIndex, x, y,
      hp: cfg.hp, maxHp: cfg.hp, attackTimer: 0, el,
    });
    battle.spawned += 1;
    battle.spawnTimer = battle.level.spawnInterval;
    position(el, x, y);
  }

  function updateMonsters(dt) {
    const wallY = battle.height * 0.78;
    for (const monster of [...battle.monsters]) {
      if (monster.y < wallY) {
        monster.y += monster.cfg.speed * dt;
      } else {
        monster.attackTimer -= dt * 1000;
        if (monster.attackTimer <= 0) {
          battle.wallHp = Math.max(0, battle.wallHp - monster.cfg.damage);
          showFloat(monster.x, monster.y - 20, `城墙-${monster.cfg.damage}`, 'big');
          monster.attackTimer = 1000;
        }
      }
      const hp = monster.el.querySelector('.hpbar i');
      if (hp) hp.style.width = `${Math.max(0, monster.hp / monster.maxHp * 100)}%`;
      position(monster.el, monster.x, monster.y);
    }
  }

  function shootBullet() {
    const target = selectTarget();
    if (!target) return;
    const el = document.createElement('img');
    el.className = 'bullet';
    el.src = ASSETS.fx.bullet;
    el.alt = '子弹';
    dom.entityLayer.appendChild(el);
    const bullet = {
      id: uid++, x: battle.heroX, y: battle.heroY - 48, targetId: target.id,
      speed: 380, damage: baseDamage(), pierceLeft: battle.runBuffs.pierce, hitIds: new Set(), el,
    };
    battle.bullets.push(bullet);
    position(el, bullet.x, bullet.y);
  }

  function selectTarget() {
    if (!battle.monsters.length) return null;
    return [...battle.monsters].sort((a, b) => {
      const ax = Math.abs(a.x - battle.heroX);
      const bx = Math.abs(b.x - battle.heroX);
      const ay = battle.height - a.y;
      const by = battle.height - b.y;
      return (ax * 1.3 + ay * 0.55) - (bx * 1.3 + by * 0.55);
    })[0];
  }

  function updateBullets(dt) {
    for (const bullet of [...battle.bullets]) {
      const target = battle.monsters.find(m => m.id === bullet.targetId) || selectTarget();
      if (target) bullet.targetId = target.id;
      const tx = target ? target.x : bullet.x;
      const ty = target ? target.y : -40;
      const dx = tx - bullet.x;
      const dy = ty - bullet.y;
      const len = Math.hypot(dx, dy) || 1;
      bullet.x += (dx / len) * bullet.speed * dt;
      bullet.y += (dy / len) * bullet.speed * dt;
      position(bullet.el, bullet.x, bullet.y);

      const hit = battle.monsters.find(m => !bullet.hitIds.has(m.id) && distance(m, bullet) < 34);
      if (hit) {
        bullet.hitIds.add(hit.id);
        damageMonster(hit, bullet.damage, false);
        if (battle.runBuffs.blast) explodeAt(hit.x, hit.y, 46, bullet.damage * 0.45, false);
        if (bullet.pierceLeft > 0) {
          bullet.pierceLeft -= 1;
          bullet.targetId = 0;
        } else {
          removeBullet(bullet);
        }
      } else if (bullet.y < -50 || bullet.x < -40 || bullet.x > battle.width + 40) {
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
    for (let i = 0; i < 5; i += 1) {
      const endX = clamp(cluster.x + (Math.random() - 0.5) * 120, 34, battle.width - 34);
      const endY = clamp(cluster.y + (Math.random() - 0.5) * 110, 92, battle.height * 0.76);
      const el = document.createElement('img');
      el.className = 'meteor';
      el.src = ASSETS.fx.meteor;
      el.alt = '火雨术陨石';
      dom.entityLayer.appendChild(el);
      battle.effects.push({ type: 'meteor', el, x: endX - 80, y: -70 - i * 28, endX, endY, t: 0, duration: 0.42 + i * 0.06, damage: 45 * battle.runBuffs.skillDamageMul });
    }
  }

  function densePoint() {
    if (!battle.monsters.length) return { x: battle.width / 2, y: battle.height * 0.35 };
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
          explodeAt(fx.endX, fx.endY, 92, fx.damage, true);
        }
      }
    }
  }

  function explodeAt(x, y, radius, damage, big) {
    const el = document.createElement('img');
    el.className = 'explosion';
    el.src = ASSETS.fx.explosion;
    el.alt = '爆炸';
    dom.entityLayer.appendChild(el);
    position(el, x, y);
    setTimeout(() => el.remove(), 460);
    battle.monsters.filter(m => distance(m, { x, y }) <= radius).forEach(m => damageMonster(m, damage, big));
  }

  function damageMonster(monster, damage, big) {
    if (!battle.monsters.includes(monster)) return;
    const finalDamage = Math.ceil(damage);
    monster.hp -= finalDamage;
    showFloat(monster.x, monster.y - 26, `-${finalDamage}`, big ? 'big' : '');
    if (monster.hp <= 0) killMonster(monster);
  }

  function killMonster(monster) {
    battle.monsters = battle.monsters.filter(item => item !== monster);
    monster.el.remove();
    battle.killed += 1;
    const gold = Math.ceil(monster.cfg.gold * battle.runBuffs.goldMul);
    battle.earnedGold += gold;
    showCoin(monster.x, monster.y, gold);
    if (battle.pendingBuffKills[0] && battle.killed >= battle.pendingBuffKills[0]) {
      battle.pendingBuffKills.shift();
      openBuffChoice();
    }
  }

  function openBuffChoice() {
    battle.paused = true;
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
    const firstKey = `firstClear${level.id}`;
    battle.active = false;
    cancelAnimationFrame(rafId);
    if (win) {
      const firstBonus = save[firstKey] ? 0 : level.firstReward;
      const total = level.reward + firstBonus + battle.earnedGold;
      save.gold += total;
      save[firstKey] = true;
      save.highestLevel = Math.max(save.highestLevel, Math.min(2, level.id + 1));
      writeSave();
      showResult(true, total, firstBonus);
    } else {
      showResult(false, 0, 0);
    }
    resetRunBuffs();
  }

  function showResult(win, gold, firstBonus) {
    dom.resultTitle.textContent = win ? '通关成功' : '城墙被攻破';
    dom.resultDesc.textContent = win
      ? `获得金币 ${gold}${firstBonus ? `（含首次通关额外 ${firstBonus}）` : ''}。`
      : '怪物突破了防线，升级装备后再来挑战吧。';
    dom.resultStats.textContent = win ? `当前战斗力：${power()}` : `当前战斗力：${power()} · 本局击杀：${battle.killed}`;
    dom.resultActions.innerHTML = '';
    const homeBtn = actionButton('返回首页', () => { closeModal(); showPage('home'); });
    dom.resultActions.appendChild(homeBtn);
    if (win) {
      const nextId = battle.levelId + 1;
      dom.resultActions.appendChild(actionButton(nextId <= 2 ? '下一关' : '再战一次', () => {
        closeModal();
        startBattle(nextId <= 2 ? nextId : battle.levelId);
      }));
    } else {
      dom.resultActions.appendChild(actionButton('装备升级', () => { closeModal(); showPage('home'); openUpgrade(); }));
    }
    openModal(dom.resultModal);
  }

  function checkBattleEnd() {
    if (battle.wallHp <= 0) finishBattle(false);
    const allSpawned = battle.spawnQueue.length === 0 && battle.spawned >= battle.level.waves.length;
    if (allSpawned && battle.monsters.length === 0 && battle.active) finishBattle(true);
  }

  function updateBattleHud() {
    if (!battle.level) return;
    const remaining = battle.spawnQueue.length + battle.monsters.length;
    dom.battleLevelName.textContent = battle.level.shortName;
    dom.wallHpText.textContent = `${Math.ceil(battle.wallHp)}/${battle.maxWallHp}`;
    dom.remainingText.textContent = remaining;
    dom.battleGoldText.textContent = battle.earnedGold;
  }

  function updateSkillButton() {
    if (battle.skillTimer > 0) {
      dom.fireSkillBtn.classList.add('cooling');
      dom.fireSkillBtn.classList.remove('ready');
      dom.skillCdText.classList.remove('ready');
      dom.skillCdText.textContent = Math.ceil(battle.skillTimer / 1000);
    } else {
      dom.fireSkillBtn.classList.remove('cooling');
      dom.fireSkillBtn.classList.add('ready');
      dom.skillCdText.classList.add('ready');
      dom.skillCdText.textContent = '就绪';
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
    renderUpgrades();
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
    coin.src = ASSETS.fx.coin;
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
    document.getElementById('levelBackBtn').addEventListener('click', () => showPage('home'));
    document.getElementById('battleHomeBtn').addEventListener('click', () => {
      if (confirm('确定返回首页？本局强化和进度会清空。')) showPage('home');
    });
    document.getElementById('resetBtn').addEventListener('click', () => {
      if (confirm('确定重置存档？金币、通关和装备等级都会清空。')) {
        save = { ...DEFAULT_SAVE };
        writeSave();
        updateHome();
        showToast('存档已重置');
      }
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
      const cost = item.costs[current];
      if (save.gold < cost) {
        showToast('金币不足，请先挑战关卡');
        return;
      }
      save.gold -= cost;
      save[item.saveKey] += 1;
      writeSave();
      updateHome();
      renderUpgrades();
      showToast('升级成功');
    });
    document.querySelectorAll('[data-close-modal]').forEach(btn => btn.addEventListener('click', closeModal));
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

  function boot() {
    setViewportHeight();
    resetRunBuffs();
    bindEvents();
    updateHome();
    renderLevels();
  }

  boot();
})();
