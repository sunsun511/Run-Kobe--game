(function initGameLogic(global) {
  const CONSTANTS = {
    GROUND_Y: 286,
    PLAYER_X: 96,
    PLAYER_W: 60,
    PLAYER_STAND_H: 92,
    PLAYER_DUCK_H: 52,
    PLAYER_DUCK_OFFSET: 40,
    JUMP_VELOCITY: -720,
    JUMP_HOLD_TIME: 0.16,
    JUMP_HOLD_ACCEL: -2600,
    GRAVITY: 1800,
    INVINCIBLE_TIME: 2.4,
    BASE_SPEED: 285,
    MAX_SPEED: 680,
    SPEED_GAIN: 8,
    PICKUP_FLASH_TIME: 0.72,
    HIT_FLASH_TIME: 0.42,
    SHAKE_TIME: 0.32,
    MESSAGE_TIME: 0.95,
  };

  function createInitialState() {
    return {
      time: 0,
      score: 0,
      speed: CONSTANTS.BASE_SPEED,
      invincibleLeft: 0,
      gameOver: false,
      player: {
        x: CONSTANTS.PLAYER_X,
        y: CONSTANTS.GROUND_Y - CONSTANTS.PLAYER_STAND_H,
        w: CONSTANTS.PLAYER_W,
        vy: 0,
        grounded: true,
        ducking: false,
        jumpHoldLeft: 0,
      },
    };
  }

  function startJump(state) {
    if (!state.player.grounded) return false;

    state.player.ducking = false;
    state.player.grounded = false;
    state.player.vy = CONSTANTS.JUMP_VELOCITY;
    state.player.jumpHoldLeft = CONSTANTS.JUMP_HOLD_TIME;
    return true;
  }

  function setDucking(state, ducking) {
    state.player.ducking = Boolean(ducking && state.player.grounded);
  }

  function stepPlayer(state, options) {
    const dt = Math.max(0, options.dt || 0);
    const jumpHeld = Boolean(options.jumpHeld);

    if (!state.player.grounded) {
      if (jumpHeld && state.player.jumpHoldLeft > 0 && state.player.vy < 0) {
        const liftTime = Math.min(dt, state.player.jumpHoldLeft);
        state.player.vy += CONSTANTS.JUMP_HOLD_ACCEL * liftTime;
        state.player.jumpHoldLeft -= liftTime;
      } else {
        state.player.jumpHoldLeft = 0;
      }

      state.player.vy += CONSTANTS.GRAVITY * dt;
      state.player.y += state.player.vy * dt;

      const floorY = CONSTANTS.GROUND_Y - CONSTANTS.PLAYER_STAND_H;
      if (state.player.y >= floorY) {
        state.player.y = floorY;
        state.player.vy = 0;
        state.player.grounded = true;
        state.player.jumpHoldLeft = 0;
      }
    }
  }

  function tickInvincibility(state, dt) {
    state.invincibleLeft = Math.max(0, state.invincibleLeft - Math.max(0, dt || 0));
  }

  function getPlayerHitbox(player) {
    if (player.ducking) {
      return {
        x: player.x + 3,
        y: CONSTANTS.GROUND_Y - CONSTANTS.PLAYER_DUCK_H,
        w: player.w + 8,
        h: CONSTANTS.PLAYER_DUCK_H,
      };
    }

    return {
      x: player.x + 10,
      y: player.y,
      w: player.w,
      h: CONSTANTS.PLAYER_STAND_H,
    };
  }

  function createObstacle(type, x) {
    if (type === 'tea') {
      return {
        type,
        x,
        y: CONSTANTS.GROUND_Y - 78,
        w: 44,
        h: 78,
        passed: false,
      };
    }

    if (type === 'helicopter') {
      return {
        type,
        x,
        y: CONSTANTS.GROUND_Y - 150,
        w: 132,
        h: 66,
        passed: false,
      };
    }

    throw new Error(`Unknown obstacle type: ${type}`);
  }

  function createPickup(x) {
    return {
      type: 'basketball',
      x,
      y: CONSTANTS.GROUND_Y - 96,
      w: 38,
      h: 38,
      collected: false,
    };
  }

  function intersects(a, b) {
    return a.x < b.x + b.w &&
      a.x + a.w > b.x &&
      a.y < b.y + b.h &&
      a.y + a.h > b.y;
  }

  function centerX(item) {
    return item.x + item.w / 2;
  }

  function hasSpawnConflict(candidate, items, minGap) {
    return items.some((item) => {
      const inactive = item.passed || item.collected;
      return !inactive && Math.abs(centerX(candidate) - centerX(item)) < minGap;
    });
  }

  function getObstacleGapRange(elapsedSeconds) {
    const difficulty = Math.min(1, Math.max(0, elapsedSeconds / 75));
    return {
      min: Math.round(450 - difficulty * 240),
      max: Math.round(880 - difficulty * 340),
    };
  }

  function getPickupGapRange(elapsedSeconds) {
    const difficulty = Math.min(1, Math.max(0, elapsedSeconds / 90));
    return {
      min: Math.round(2100 - difficulty * 300),
      max: Math.round(3300 - difficulty * 420),
    };
  }

  function getObstacleClusterChance(elapsedSeconds) {
    const difficulty = Math.min(1, Math.max(0, elapsedSeconds / 90));
    return 0.06 + difficulty * 0.52;
  }

  function createFeedbackState() {
    return {
      pickupFlashLeft: 0,
      hitFlashLeft: 0,
      shakeLeft: 0,
      messageLeft: 0,
      message: '',
    };
  }

  function createAudioCues() {
    return {
      background: {
        src: 'assets/audio/see-you-again.mp4',
        loop: true,
        volume: 0.28,
      },
      death: {
        src: 'assets/audio/mamba-out-normal.mp3',
        preload: true,
        volume: 0.95,
      },
    };
  }

  function triggerFeedback(feedback, type) {
    if (type === 'pickup') {
      feedback.pickupFlashLeft = CONSTANTS.PICKUP_FLASH_TIME;
      feedback.messageLeft = CONSTANTS.PICKUP_FLASH_TIME;
      feedback.message = '篮球无敌';
      return;
    }

    if (type === 'hit') {
      feedback.hitFlashLeft = CONSTANTS.HIT_FLASH_TIME;
      feedback.shakeLeft = CONSTANTS.SHAKE_TIME;
      feedback.messageLeft = CONSTANTS.HIT_FLASH_TIME;
      feedback.message = '撞到了';
      return;
    }

    throw new Error(`Unknown feedback type: ${type}`);
  }

  function stepFeedback(feedback, dt) {
    const elapsed = Math.max(0, dt || 0);
    feedback.pickupFlashLeft = Math.max(0, feedback.pickupFlashLeft - elapsed);
    feedback.hitFlashLeft = Math.max(0, feedback.hitFlashLeft - elapsed);
    feedback.shakeLeft = Math.max(0, feedback.shakeLeft - elapsed);
    feedback.messageLeft = Math.max(0, feedback.messageLeft - elapsed);

    if (feedback.messageLeft === 0) {
      feedback.message = '';
    }
  }

  function playerHitsObstacle(state, obstacle) {
    if (obstacle.passed) return false;
    return intersects(getPlayerHitbox(state.player), obstacle);
  }

  function playerCollectsPickup(state, pickup) {
    if (pickup.collected) return false;
    return intersects(getPlayerHitbox(state.player), pickup);
  }

  function collectPickup(state, pickup) {
    if (!playerCollectsPickup(state, pickup)) return false;
    pickup.collected = true;
    state.invincibleLeft = CONSTANTS.INVINCIBLE_TIME;
    return true;
  }

  function resolveObstacleCollision(state, obstacle) {
    if (!playerHitsObstacle(state, obstacle)) return false;

    if (state.invincibleLeft > 0) {
      obstacle.passed = true;
      return false;
    }

    state.gameOver = true;
    return true;
  }

  function advanceScore(state, dt) {
    state.time += Math.max(0, dt || 0);
    state.speed = Math.min(
      CONSTANTS.MAX_SPEED,
      CONSTANTS.BASE_SPEED + state.time * CONSTANTS.SPEED_GAIN,
    );
    state.score += state.speed * Math.max(0, dt || 0) * 0.1;
  }

  const api = {
    CONSTANTS,
    createInitialState,
    startJump,
    setDucking,
    stepPlayer,
    tickInvincibility,
    getPlayerHitbox,
    createObstacle,
    createPickup,
    intersects,
    hasSpawnConflict,
    getObstacleGapRange,
    getPickupGapRange,
    getObstacleClusterChance,
    createFeedbackState,
    createAudioCues,
    triggerFeedback,
    stepFeedback,
    playerHitsObstacle,
    playerCollectsPickup,
    collectPickup,
    resolveObstacleCollision,
    advanceScore,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  global.KobeRunnerLogic = api;
})(typeof globalThis !== 'undefined' ? globalThis : window);
