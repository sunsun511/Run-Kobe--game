(function initGame() {
  const Logic = window.KobeRunnerLogic;
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  const overlay = document.getElementById('overlay');
  const overlayTitle = document.getElementById('overlayTitle');
  const overlayText = document.getElementById('overlayText');
  const startButton = document.getElementById('startButton');
  const restartButton = document.getElementById('restartButton');
  const audioButton = document.getElementById('audioButton');
  const jumpButton = document.getElementById('jumpButton');
  const duckButton = document.getElementById('duckButton');
  const bgMusic = document.getElementById('bgMusic');
  const deathSound = document.getElementById('deathSound');
  const scoreValue = document.getElementById('scoreValue');
  const highScoreValue = document.getElementById('highScoreValue');
  const invincibleLabel = document.getElementById('invincibleLabel');
  const invincibleFill = document.getElementById('invincibleFill');

  const WIDTH = 900;
  const HEIGHT = 360;
  const STORAGE_KEY = 'kobe-runner-hi-score';
  const AUDIO_STORAGE_KEY = 'kobe-runner-audio-enabled';
  const audioCues = Logic.createAudioCues();
  const sprites = {
    playerRun: loadSprite('assets/images/player-run.png'),
    playerJump: loadSprite('assets/images/player-jump.png'),
    playerDuck: loadSprite('assets/images/player-duck.png'),
    iceTea: loadSprite('assets/images/ice-tea.png'),
  };

  let state = Logic.createInitialState();
  let obstacles = [];
  let pickups = [];
  let particles = [];
  let feedback = Logic.createFeedbackState();
  let running = false;
  let started = false;
  let jumpHeld = false;
  let duckHeld = false;
  let lastFrame = 0;
  let obstacleDistance = 240;
  let pickupDistance = 680;
  let groundShift = 0;
  let highScore = readHighScore();
  let audioEnabled = readAudioEnabled();

  function readHighScore() {
    const saved = Number(window.localStorage.getItem(STORAGE_KEY));
    return Number.isFinite(saved) ? saved : 0;
  }

  function readAudioEnabled() {
    return window.localStorage.getItem(AUDIO_STORAGE_KEY) !== 'off';
  }

  function prepareAudio() {
    if (bgMusic) {
      bgMusic.src = audioCues.background.src;
      bgMusic.loop = audioCues.background.loop;
      bgMusic.volume = audioCues.background.volume;
      bgMusic.load();
    }

    if (deathSound) {
      deathSound.src = audioCues.death.src;
      deathSound.preload = audioCues.death.preload ? 'auto' : 'metadata';
      deathSound.volume = audioCues.death.volume;
      deathSound.load();
    }
    updateAudioButton();
  }

  function updateAudioButton() {
    if (!audioButton) return;

    audioButton.textContent = audioEnabled ? 'BGM ON' : 'BGM OFF';
    audioButton.setAttribute('aria-pressed', String(audioEnabled));
  }

  function setAudioEnabled(enabled) {
    audioEnabled = Boolean(enabled);
    window.localStorage.setItem(AUDIO_STORAGE_KEY, audioEnabled ? 'on' : 'off');
    updateAudioButton();

    if (!audioEnabled) {
      pauseBackgroundMusic();
      stopDeathSound();
      return;
    }

    if (running) {
      playBackgroundMusic();
    }
  }

  function resetBackgroundMusic() {
    if (!bgMusic) return;

    bgMusic.pause();
    bgMusic.currentTime = 0;
  }

  function pauseBackgroundMusic() {
    if (!bgMusic) return;

    bgMusic.pause();
  }

  function playBackgroundMusic() {
    if (!bgMusic || !audioEnabled) return;

    bgMusic.volume = audioCues.background.volume;
    const playPromise = bgMusic.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(() => {});
    }
  }

  function stopDeathSound() {
    if (!deathSound) return;

    deathSound.pause();
    deathSound.currentTime = 0;
  }

  function playDeathSound() {
    if (!deathSound || !audioEnabled) return;

    deathSound.pause();
    deathSound.currentTime = 0;
    deathSound.volume = audioCues.death.volume;
    const playPromise = deathSound.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(() => {});
    }
  }

  function saveHighScore() {
    if (state.score > highScore) {
      highScore = Math.floor(state.score);
      window.localStorage.setItem(STORAGE_KEY, String(highScore));
    }
  }

  function formatScore(value) {
    return String(Math.max(0, Math.floor(value))).padStart(5, '0');
  }

  function randomBetween(min, max) {
    return min + Math.random() * (max - min);
  }

  function loadSprite(src) {
    const image = new Image();
    const sprite = { image, ready: false };
    image.onload = () => {
      sprite.ready = true;
    };
    image.src = src;
    return sprite;
  }

  function nextObstacleDistance() {
    const range = Logic.getObstacleGapRange(state.time);
    const clusterChance = Logic.getObstacleClusterChance(state.time);

    if (Math.random() < clusterChance) {
      return randomBetween(range.min, Math.min(range.max, range.min + 95));
    }

    return randomBetween(range.min, range.max);
  }

  function nextPickupDistance() {
    const range = Logic.getPickupGapRange(state.time);
    return randomBetween(range.min, range.max);
  }

  function resetGame() {
    state = Logic.createInitialState();
    obstacles = [];
    pickups = [];
    particles = [];
    feedback = Logic.createFeedbackState();
    obstacleDistance = 260;
    pickupDistance = nextPickupDistance();
    groundShift = 0;
    jumpHeld = false;
    duckHeld = false;
    started = false;
    running = false;
    resetBackgroundMusic();
    stopDeathSound();
    updateHud();
    showOverlay('科比快跑', '跳过冰红茶，蹲下躲直升机，捡篮球获得几秒无敌。', '开始');
    draw();
  }

  function startGame() {
    if (state.gameOver || !started) {
      state = Logic.createInitialState();
      obstacles = [];
      pickups = [];
      particles = [];
      feedback = Logic.createFeedbackState();
      obstacleDistance = 260;
      pickupDistance = nextPickupDistance();
      resetBackgroundMusic();
    }

    started = true;
    running = true;
    lastFrame = performance.now();
    hideOverlay();
    stopDeathSound();
    playBackgroundMusic();
  }

  function endGame() {
    running = false;
    started = true;
    pauseBackgroundMusic();
    playDeathSound();
    saveHighScore();
    updateHud();
    showOverlay('跑完了', `得分 ${formatScore(state.score)}。再来一把，把节奏压住。`, '重新开始');
  }

  function showOverlay(title, text, buttonText) {
    overlayTitle.textContent = title;
    overlayText.textContent = text;
    startButton.textContent = buttonText;
    overlay.classList.remove('hidden');
  }

  function hideOverlay() {
    overlay.classList.add('hidden');
  }

  function spawnObstacle() {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const type = Math.random() < 0.55 ? 'tea' : 'helicopter';
      const obstacle = Logic.createObstacle(type, WIDTH + randomBetween(28, 190));
      obstacle.scored = false;

      if (!Logic.hasSpawnConflict(obstacle, pickups, 230)) {
        obstacles.push(obstacle);
        return true;
      }
    }

    return false;
  }

  function spawnPickup() {
    if (pickups.some((pickup) => !pickup.collected)) return false;

    for (let attempt = 0; attempt < 6; attempt += 1) {
      const pickup = Logic.createPickup(WIDTH + randomBetween(90, 430));
      if (!Logic.hasSpawnConflict(pickup, obstacles, 250)) {
        pickups.push(pickup);
        return true;
      }
    }

    return false;
  }

  function addBurst(x, y, color) {
    for (let i = 0; i < 14; i += 1) {
      particles.push({
        x,
        y,
        vx: randomBetween(-130, 130),
        vy: randomBetween(-160, 40),
        life: randomBetween(.35, .7),
        color,
      });
    }
  }

  function update(dt) {
    const safeDt = Math.min(dt, .033);
    Logic.stepFeedback(feedback, safeDt);

    if (!running || state.gameOver) return;

    Logic.setDucking(state, duckHeld);
    Logic.stepPlayer(state, { dt: safeDt, jumpHeld });
    Logic.tickInvincibility(state, safeDt);
    Logic.advanceScore(state, safeDt);

    groundShift = (groundShift + state.speed * safeDt) % 48;
    obstacleDistance -= state.speed * safeDt;
    pickupDistance -= state.speed * safeDt;

    if (obstacleDistance <= 0) {
      obstacleDistance = spawnObstacle() ? nextObstacleDistance() : 100;
    }

    if (pickupDistance <= 0) {
      pickupDistance = spawnPickup() ? nextPickupDistance() : 280;
    }

    obstacles.forEach((obstacle) => {
      obstacle.x -= state.speed * safeDt;

      if (!obstacle.scored && obstacle.x + obstacle.w < state.player.x) {
        obstacle.scored = true;
        state.score += 24;
      }

      const stopped = Logic.resolveObstacleCollision(state, obstacle);
      if (obstacle.passed && !obstacle.burst) {
        obstacle.burst = true;
        addBurst(obstacle.x + obstacle.w / 2, obstacle.y + obstacle.h / 2, '#f1c232');
      }
      if (stopped) {
        Logic.triggerFeedback(feedback, 'hit');
        addBurst(obstacle.x + obstacle.w / 2, obstacle.y + obstacle.h / 2, '#cf2e2e');
        endGame();
      }
    });

    pickups.forEach((pickup) => {
      pickup.x -= state.speed * safeDt;
      if (Logic.collectPickup(state, pickup)) {
        state.score += 80;
        Logic.triggerFeedback(feedback, 'pickup');
        addBurst(pickup.x + pickup.w / 2, pickup.y + pickup.h / 2, '#d76a21');
      }
    });

    particles.forEach((particle) => {
      particle.life -= safeDt;
      particle.x += particle.vx * safeDt;
      particle.y += particle.vy * safeDt;
      particle.vy += 320 * safeDt;
    });

    obstacles = obstacles.filter((obstacle) => obstacle.x > -160 && !obstacle.passed);
    pickups = pickups.filter((pickup) => pickup.x > -90 && !pickup.collected);
    particles = particles.filter((particle) => particle.life > 0);

    updateHud();
  }

  function updateHud() {
    scoreValue.textContent = formatScore(state.score);
    highScoreValue.textContent = formatScore(highScore);

    const ratio = Math.min(1, state.invincibleLeft / Logic.CONSTANTS.INVINCIBLE_TIME);
    invincibleFill.style.width = `${Math.round(ratio * 100)}%`;
    invincibleLabel.textContent = ratio > 0
      ? `篮球无敌：${state.invincibleLeft.toFixed(1)} 秒`
      : '篮球无敌：未激活';
  }

  function drawBackground() {
    ctx.fillStyle = '#fffdf5';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    const horizon = Logic.CONSTANTS.GROUND_Y - 122;
    ctx.fillStyle = '#f6ecff';
    ctx.fillRect(0, 0, WIDTH, horizon);

    ctx.fillStyle = '#2d1758';
    ctx.fillRect(0, horizon - 18, WIDTH, 18);
    ctx.fillStyle = '#f1c232';
    for (let x = 26; x < WIDTH; x += 68) {
      ctx.fillRect(x, horizon - 12, 28, 5);
    }

    ctx.fillStyle = 'rgba(85, 44, 145, .16)';
    for (let x = -groundShift * .35; x < WIDTH; x += 120) {
      ctx.beginPath();
      ctx.arc(x + 20, 108, 38, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = 'rgba(85, 44, 145, .08)';
    for (let x = -groundShift; x < WIDTH; x += 48) {
      ctx.fillRect(x, 0, 3, Logic.CONSTANTS.GROUND_Y - 2);
    }

    ctx.strokeStyle = 'rgba(85, 44, 145, .18)';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(WIDTH - 120, Logic.CONSTANTS.GROUND_Y + 52, 92, Math.PI, Math.PI * 1.5);
    ctx.stroke();

    ctx.fillStyle = '#151515';
    ctx.fillRect(0, Logic.CONSTANTS.GROUND_Y, WIDTH, 8);
    ctx.fillStyle = '#f1c232';
    ctx.fillRect(0, Logic.CONSTANTS.GROUND_Y + 8, WIDTH, 7);
    ctx.fillStyle = '#1f1f1f';
    ctx.fillRect(0, Logic.CONSTANTS.GROUND_Y + 15, WIDTH, HEIGHT - Logic.CONSTANTS.GROUND_Y - 15);

    ctx.fillStyle = 'rgba(255, 255, 255, .18)';
    for (let x = -groundShift * 1.4; x < WIDTH; x += 80) {
      ctx.fillRect(x, Logic.CONSTANTS.GROUND_Y + 46, 36, 5);
    }

    ctx.fillStyle = '#552c91';
    ctx.font = '900 26px Arial';
    ctx.fillText('科比快跑', 22, 42);
    ctx.fillStyle = '#333';
    ctx.font = '900 15px Arial';
    ctx.fillText('冰红茶要跳，直升机要蹲，篮球给无敌', 24, 70);

    ctx.fillStyle = 'rgba(241, 194, 50, .9)';
    ctx.font = '900 18px Arial';
    ctx.fillText('24', WIDTH - 74, 42);
  }

  function drawRunner() {
    const p = state.player;
    const ducking = p.ducking;
    const invincible = state.invincibleLeft > 0;
    const baseX = p.x;
    const baseY = Logic.CONSTANTS.GROUND_Y;
    const bodyY = ducking ? baseY - 58 : p.y + 34;
    const headY = ducking ? baseY - 78 : p.y;

    if (invincible) {
      ctx.save();
      const pulse = .72 + Math.sin(performance.now() / 85) * .18;
      ctx.strokeStyle = `rgba(241, 194, 50, ${pulse})`;
      ctx.fillStyle = 'rgba(241, 194, 50, .1)';
      ctx.lineWidth = 6;
      ctx.setLineDash([12, 8]);
      ctx.beginPath();
      ctx.ellipse(baseX + 35, baseY - 58, 58, 76, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.globalAlpha = .38;
      for (let i = 0; i < 4; i += 1) {
        ctx.fillStyle = '#f1c232';
        ctx.fillRect(baseX - 52 - i * 30, baseY - 56 + i * 12, 22, 6);
      }
      ctx.restore();
    }

    if (drawRunnerSprite(p, ducking)) return;

    ctx.fillStyle = 'rgba(0, 0, 0, .24)';
    ctx.beginPath();
    ctx.ellipse(baseX + 38, baseY + 5, ducking ? 46 : 38, 9, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#8b5b38';
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(baseX + 31, headY + 17, ducking ? 15 : 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#111';
    ctx.fillRect(baseX + 15, headY + 5, ducking ? 31 : 36, 6);

    ctx.strokeStyle = '#111';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(baseX + 31, headY + 23, 7, .2, Math.PI - .2);
    ctx.stroke();

    ctx.fillStyle = '#552c91';
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 4;
    roundRect(baseX + 12, bodyY, ducking ? 64 : 45, ducking ? 32 : 52, 8, true, true);

    ctx.fillStyle = '#f1c232';
    ctx.fillRect(baseX + 13, bodyY + 4, 7, ducking ? 25 : 44);
    ctx.fillRect(baseX + (ducking ? 68 : 49), bodyY + 4, 7, ducking ? 25 : 44);

    ctx.fillStyle = '#fff';
    ctx.font = ducking ? '900 18px Arial' : '900 22px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('24', baseX + (ducking ? 44 : 35), bodyY + (ducking ? 24 : 34));
    ctx.fillStyle = '#f1c232';
    ctx.font = '900 8px Arial';
    ctx.fillText('MAMBA', baseX + (ducking ? 44 : 35), bodyY + (ducking ? 11 : 15));
    ctx.textAlign = 'start';

    ctx.strokeStyle = '#111';
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    if (ducking) {
      ctx.moveTo(baseX + 28, bodyY + 29);
      ctx.lineTo(baseX + 12, bodyY + 49);
      ctx.moveTo(baseX + 62, bodyY + 29);
      ctx.lineTo(baseX + 82, bodyY + 48);
    } else {
      ctx.moveTo(baseX + 23, bodyY + 50);
      ctx.lineTo(baseX + 8, bodyY + 78);
      ctx.moveTo(baseX + 49, bodyY + 50);
      ctx.lineTo(baseX + 70, bodyY + 75);
    }
    ctx.stroke();

    ctx.strokeStyle = '#8b5b38';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(baseX + 54, bodyY + 12);
    ctx.lineTo(baseX + 82, bodyY - 10);
    ctx.stroke();

    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(baseX + 67, bodyY);
    ctx.lineTo(baseX + 78, bodyY - 8);
    ctx.stroke();

    ctx.fillStyle = '#f1c232';
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 3;
    roundRect(baseX + (ducking ? 5 : 2), bodyY + (ducking ? 45 : 73), 28, 12, 8, true, true);
    roundRect(baseX + (ducking ? 72 : 61), bodyY + (ducking ? 44 : 70), 30, 12, 8, true, true);
  }

  function drawRunnerSprite(player, ducking) {
    const selected = getRunnerSprite(player, ducking);
    if (!selected) return false;

    const sprite = selected.image;
    const baseX = player.x;
    const baseY = Logic.CONSTANTS.GROUND_Y;
    const grounded = player.grounded;
    const bob = grounded && !ducking ? Math.sin(performance.now() / 80) * 2 : 0;
    const drawW = ducking ? 124 : 124;
    const drawH = ducking ? 78 : 124;
    const drawX = ducking ? baseX - 28 : baseX - 28;
    const drawY = ducking ? baseY - 80 : player.y - 31 + bob;

    ctx.fillStyle = 'rgba(0, 0, 0, .24)';
    ctx.beginPath();
    ctx.ellipse(baseX + 38, baseY + 5, ducking ? 48 : 42, 9, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    if (ducking && selected !== sprites.playerDuck) {
      ctx.translate(drawX + drawW / 2, drawY + drawH / 2);
      ctx.rotate(-0.07);
      ctx.drawImage(sprite, -drawW / 2, -drawH / 2, drawW, drawH);
    } else {
      ctx.drawImage(sprite, drawX, drawY, drawW, drawH);
    }
    ctx.restore();
    return true;
  }

  function getRunnerSprite(player, ducking) {
    if (ducking && sprites.playerDuck.ready) return sprites.playerDuck;
    if (!player.grounded && sprites.playerJump.ready) return sprites.playerJump;
    if (sprites.playerRun.ready) return sprites.playerRun;
    return null;
  }

  function drawTea(obstacle) {
    if (drawTeaSprite(obstacle)) return;

    ctx.save();
    ctx.translate(obstacle.x + obstacle.w / 2, obstacle.y + obstacle.h / 2);
    ctx.rotate(-0.08);
    ctx.translate(-obstacle.w / 2, -obstacle.h / 2);

    ctx.fillStyle = '#111';
    roundRect(11, -15, 22, 16, 4, true, false);
    ctx.fillStyle = 'rgba(207, 46, 46, .18)';
    ctx.beginPath();
    ctx.arc(obstacle.w / 2, obstacle.h / 2, 45, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f4d35e';
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 5;
    roundRect(0, 0, obstacle.w, obstacle.h, 11, true, true);
    ctx.fillStyle = '#e65a24';
    ctx.fillRect(3, 18, obstacle.w - 6, 23);
    ctx.fillStyle = '#c51f27';
    ctx.fillRect(3, 40, obstacle.w - 6, obstacle.h - 45);
    ctx.fillStyle = '#fff';
    ctx.font = '900 13px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('冰', obstacle.w / 2, 38);
    ctx.fillText('红茶', obstacle.w / 2, 54);
    ctx.fillStyle = '#111';
    ctx.font = '900 10px Arial';
    ctx.fillText('危险', obstacle.w / 2, 69);
    ctx.textAlign = 'start';
    ctx.restore();
  }

  function drawTeaSprite(obstacle) {
    if (!sprites.iceTea.ready) return false;

    const sprite = sprites.iceTea.image;
    const drawW = 70;
    const drawH = 94;
    const drawX = obstacle.x + obstacle.w / 2 - drawW / 2;
    const drawY = Logic.CONSTANTS.GROUND_Y - drawH + 2;

    ctx.save();
    ctx.translate(drawX + drawW / 2, drawY + drawH / 2);
    ctx.rotate(-0.06);
    ctx.fillStyle = 'rgba(207, 46, 46, .16)';
    ctx.beginPath();
    ctx.arc(0, 0, 48, 0, Math.PI * 2);
    ctx.fill();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(sprite, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();
    return true;
  }

  function drawHelicopter(obstacle) {
    const x = obstacle.x;
    const y = obstacle.y;
    const rotorWobble = Math.sin(performance.now() / 42) * 6;
    const bodyY = y + 18;
    const clearanceY = y + obstacle.h - 8;

    ctx.save();
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x + 12 + rotorWobble, y + 7);
    ctx.lineTo(x + 112 + rotorWobble, y + 7);
    ctx.moveTo(x + 34 - rotorWobble, y + 2);
    ctx.lineTo(x + 92 - rotorWobble, y + 12);
    ctx.stroke();

    ctx.fillStyle = '#f1c232';
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x + 62, y + 8, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = '#111';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(x + 82, bodyY + 12);
    ctx.lineTo(x + 124, bodyY + 5);
    ctx.stroke();

    ctx.fillStyle = '#111';
    ctx.fillRect(x + 120, bodyY - 3, 8, 20);

    ctx.fillStyle = '#2a2a2a';
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 4;
    roundRect(x + 15, bodyY, 80, 27, 16, true, true);

    ctx.fillStyle = '#79c7ff';
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 3;
    roundRect(x + 27, bodyY + 7, 27, 11, 6, true, true);

    ctx.fillStyle = '#f1c232';
    ctx.font = '900 10px Arial';
    ctx.fillText('DUCK', x + 57, bodyY + 19);

    ctx.strokeStyle = '#111';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x + 24, bodyY + 33);
    ctx.lineTo(x + 86, bodyY + 33);
    ctx.moveTo(x + 35, bodyY + 27);
    ctx.lineTo(x + 27, bodyY + 33);
    ctx.moveTo(x + 75, bodyY + 27);
    ctx.lineTo(x + 83, bodyY + 33);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(207, 46, 46, .55)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x + 5, clearanceY);
    ctx.lineTo(x + 118, clearanceY);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(207, 46, 46, .24)';
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 8]);
    ctx.beginPath();
    ctx.moveTo(x + 10, clearanceY + 7);
    ctx.lineTo(x + 108, clearanceY + 7);
    ctx.stroke();
    ctx.restore();
  }

  function drawPickup(pickup) {
    const cx = pickup.x + pickup.w / 2;
    const cy = pickup.y + pickup.h / 2;
    const pulse = 1 + Math.sin(performance.now() / 120) * .08;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(pulse, pulse);
    ctx.fillStyle = 'rgba(241, 194, 50, .35)';
    ctx.beginPath();
    ctx.arc(0, 0, 29, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#d76a21';
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(0, 0, pickup.w / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = '#5a210c';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, -18);
    ctx.lineTo(0, 18);
    ctx.moveTo(-18, 0);
    ctx.lineTo(18, 0);
    ctx.arc(0, 0, 12, -Math.PI / 2, Math.PI / 2);
    ctx.arc(0, 0, 12, Math.PI / 2, Math.PI * 1.5);
    ctx.stroke();

    ctx.fillStyle = '#fff';
    ctx.font = '900 10px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('无敌', 0, 4);
    ctx.textAlign = 'start';
    ctx.restore();
  }

  function drawParticles() {
    particles.forEach((particle) => {
      ctx.globalAlpha = Math.max(0, particle.life);
      ctx.fillStyle = particle.color;
      ctx.fillRect(particle.x, particle.y, 7, 7);
    });
    ctx.globalAlpha = 1;
  }

  function drawFeedbackOverlay() {
    if (feedback.pickupFlashLeft > 0) {
      const alpha = feedback.pickupFlashLeft / Logic.CONSTANTS.PICKUP_FLASH_TIME;
      ctx.fillStyle = `rgba(241, 194, 50, ${alpha * .18})`;
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
    }

    if (feedback.hitFlashLeft > 0) {
      const alpha = feedback.hitFlashLeft / Logic.CONSTANTS.HIT_FLASH_TIME;
      ctx.fillStyle = `rgba(207, 46, 46, ${alpha * .22})`;
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
    }

    if (feedback.message) {
      const pickup = feedback.message === '篮球无敌';
      const total = pickup ? Logic.CONSTANTS.PICKUP_FLASH_TIME : Logic.CONSTANTS.HIT_FLASH_TIME;
      const left = pickup ? feedback.pickupFlashLeft : feedback.hitFlashLeft;
      const alpha = Math.max(0, Math.min(1, left / total));
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(WIDTH / 2, 112 - (1 - alpha) * 18);
      ctx.rotate(pickup ? -0.05 : 0.04);
      ctx.fillStyle = pickup ? '#f1c232' : '#cf2e2e';
      ctx.strokeStyle = '#111';
      ctx.lineWidth = 5;
      ctx.font = '900 34px Arial';
      ctx.textAlign = 'center';
      ctx.strokeText(feedback.message, 0, 0);
      ctx.fillText(feedback.message, 0, 0);
      ctx.restore();
      ctx.textAlign = 'start';
      ctx.globalAlpha = 1;
    }
  }

  function draw() {
    ctx.save();
    if (feedback.shakeLeft > 0) {
      const shake = feedback.shakeLeft / Logic.CONSTANTS.SHAKE_TIME;
      ctx.translate((Math.random() - .5) * 16 * shake, (Math.random() - .5) * 10 * shake);
    }
    drawBackground();
    pickups.forEach(drawPickup);
    obstacles.forEach((obstacle) => {
      if (obstacle.type === 'tea') drawTea(obstacle);
      else drawHelicopter(obstacle);
    });
    drawRunner();
    drawParticles();
    drawFeedbackOverlay();
    ctx.restore();
  }

  function roundRect(x, y, w, h, r, fill, stroke) {
    const radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.arcTo(x, y, x + w, y, radius);
    ctx.closePath();
    if (fill) ctx.fill();
    if (stroke) ctx.stroke();
  }

  function frame(now) {
    const dt = lastFrame ? (now - lastFrame) / 1000 : 0;
    lastFrame = now;
    update(dt);
    draw();
    requestAnimationFrame(frame);
  }

  function triggerJump() {
    if (!running) startGame();
    jumpHeld = true;
    Logic.startJump(state);
  }

  function releaseJump() {
    jumpHeld = false;
  }

  function triggerDuck() {
    if (!running) startGame();
    duckHeld = true;
    Logic.setDucking(state, true);
  }

  function releaseDuck() {
    duckHeld = false;
    Logic.setDucking(state, false);
  }

  function bindHoldButton(button, onStart, onEnd) {
    button.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      button.setPointerCapture(event.pointerId);
      onStart();
    });
    button.addEventListener('pointerup', (event) => {
      event.preventDefault();
      onEnd();
    });
    button.addEventListener('pointercancel', onEnd);
    button.addEventListener('pointerleave', onEnd);
  }

  window.addEventListener('keydown', (event) => {
    if (event.code === 'Space' || event.code === 'ArrowUp' || event.code === 'KeyW') {
      event.preventDefault();
      if (!jumpHeld) triggerJump();
    }

    if (event.code === 'ArrowDown' || event.code === 'KeyS') {
      event.preventDefault();
      triggerDuck();
    }
  });

  window.addEventListener('keyup', (event) => {
    if (event.code === 'Space' || event.code === 'ArrowUp' || event.code === 'KeyW') {
      releaseJump();
    }

    if (event.code === 'ArrowDown' || event.code === 'KeyS') {
      releaseDuck();
    }
  });

  window.addEventListener('blur', () => {
    jumpHeld = false;
    duckHeld = false;
  });

  startButton.addEventListener('click', startGame);
  audioButton.addEventListener('click', () => {
    setAudioEnabled(!audioEnabled);
  });
  restartButton.addEventListener('click', () => {
    resetGame();
    startGame();
  });
  bindHoldButton(jumpButton, triggerJump, releaseJump);
  bindHoldButton(duckButton, triggerDuck, releaseDuck);

  highScoreValue.textContent = formatScore(highScore);
  prepareAudio();
  resetGame();
  requestAnimationFrame(frame);
})();
