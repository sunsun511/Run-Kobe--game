const test = require('node:test');
const assert = require('node:assert/strict');

const Logic = require('../src/gameLogic.js');

test('jump starts upward movement only when the runner is grounded', () => {
  const state = Logic.createInitialState();

  Logic.startJump(state);

  assert.equal(state.player.grounded, false);
  assert.equal(state.player.vy, Logic.CONSTANTS.JUMP_VELOCITY);

  state.player.vy = -3;
  Logic.startJump(state);

  assert.equal(state.player.vy, -3);
});

test('holding jump increases jump height for a short window', () => {
  const state = Logic.createInitialState();
  Logic.startJump(state);

  const before = state.player.vy;
  Logic.stepPlayer(state, { dt: 0.08, jumpHeld: true });

  assert.ok(state.player.vy < before, 'held jump should add upward lift');
  assert.ok(state.player.jumpHoldLeft < Logic.CONSTANTS.JUMP_HOLD_TIME);
});

test('duck changes the runner hitbox while grounded', () => {
  const state = Logic.createInitialState();

  Logic.setDucking(state, true);

  const standing = Logic.getPlayerHitbox({ ...state.player, ducking: false });
  const ducking = Logic.getPlayerHitbox(state.player);

  assert.equal(state.player.ducking, true);
  assert.ok(ducking.h < standing.h);
  assert.ok(ducking.y > standing.y);
});

test('standing runner hitbox covers the sprite body core', () => {
  const state = Logic.createInitialState();
  const hitbox = Logic.getPlayerHitbox(state.player);

  assert.ok(hitbox.w >= 58);
  assert.ok(hitbox.x <= state.player.x + 12);
  assert.ok(hitbox.h >= 88);
});

test('iced tea collides on the ground and helicopter misses a ducking runner', () => {
  const state = Logic.createInitialState();
  const tea = Logic.createObstacle('tea', state.player.x + 20);
  const helicopter = Logic.createObstacle('helicopter', state.player.x + 18);

  assert.equal(Logic.playerHitsObstacle(state, tea), true);
  assert.equal(Logic.playerHitsObstacle(state, helicopter), true);

  Logic.setDucking(state, true);

  assert.equal(Logic.playerHitsObstacle(state, helicopter), false);
});

test('helicopter lane leaves a readable ducking clearance', () => {
  const state = Logic.createInitialState();
  const helicopter = Logic.createObstacle('helicopter', state.player.x + 18);
  const standing = Logic.getPlayerHitbox({ ...state.player, ducking: false });

  Logic.setDucking(state, true);
  const ducking = Logic.getPlayerHitbox(state.player);
  const helicopterBottom = helicopter.y + helicopter.h;

  assert.ok(helicopterBottom > standing.y);
  assert.ok(ducking.y - helicopterBottom >= 28);
});

test('basketball invincibility lasts 2.4 seconds', () => {
  assert.equal(Logic.CONSTANTS.INVINCIBLE_TIME, 2.4);
});

test('basketball pickup grants invincibility for the configured duration', () => {
  const state = Logic.createInitialState();
  const ball = Logic.createPickup(state.player.x + 12);

  assert.equal(Logic.playerCollectsPickup(state, ball), true);

  Logic.collectPickup(state, ball);

  assert.equal(ball.collected, true);
  assert.equal(state.invincibleLeft, Logic.CONSTANTS.INVINCIBLE_TIME);

  Logic.tickInvincibility(state, Logic.CONSTANTS.INVINCIBLE_TIME + 0.5);

  assert.equal(state.invincibleLeft, 0);
});

test('collision ends the run unless invincible', () => {
  const state = Logic.createInitialState();
  const tea = Logic.createObstacle('tea', state.player.x + 20);

  Logic.resolveObstacleCollision(state, tea);

  assert.equal(state.gameOver, true);

  const protectedState = Logic.createInitialState();
  protectedState.invincibleLeft = 1.5;
  const protectedTea = Logic.createObstacle('tea', protectedState.player.x + 20);

  Logic.resolveObstacleCollision(protectedState, protectedTea);

  assert.equal(protectedState.gameOver, false);
  assert.equal(protectedTea.passed, true);
});

test('spawn conflict detects pickups too close to obstacles', () => {
  const obstacle = Logic.createObstacle('tea', 520);
  const overlappingPickup = Logic.createPickup(540);
  const safePickup = Logic.createPickup(760);

  assert.equal(Logic.hasSpawnConflict(overlappingPickup, [obstacle], 180), true);
  assert.equal(Logic.hasSpawnConflict(safePickup, [obstacle], 180), false);
});

test('obstacle gap range gets much denser and more varied over time', () => {
  const early = Logic.getObstacleGapRange(0);
  const late = Logic.getObstacleGapRange(75);

  assert.ok(late.min < early.min);
  assert.ok(late.max < early.max);
  assert.ok(late.min <= 220);
  assert.ok(late.max - late.min >= 300);
  assert.ok(late.max > late.min);
});

test('basketball pickup gap is much rarer than obstacle gap', () => {
  const pickup = Logic.getPickupGapRange(45);
  const obstacle = Logic.getObstacleGapRange(45);

  assert.ok(pickup.min >= 1700);
  assert.ok(pickup.max >= 2600);
  assert.ok(pickup.min > obstacle.max * 2);
});

test('late game obstacle cluster chance is high enough to feel irregular', () => {
  assert.ok(Logic.getObstacleClusterChance(0) <= 0.08);
  assert.ok(Logic.getObstacleClusterChance(90) >= 0.5);
});

test('pickup feedback starts bright and decays over time', () => {
  const feedback = Logic.createFeedbackState();

  Logic.triggerFeedback(feedback, 'pickup');

  assert.equal(feedback.pickupFlashLeft, Logic.CONSTANTS.PICKUP_FLASH_TIME);
  assert.equal(feedback.message, '篮球无敌');

  Logic.stepFeedback(feedback, Logic.CONSTANTS.PICKUP_FLASH_TIME + 0.1);

  assert.equal(feedback.pickupFlashLeft, 0);
  assert.equal(feedback.message, '');
});

test('hit feedback shakes briefly and then clears', () => {
  const feedback = Logic.createFeedbackState();

  Logic.triggerFeedback(feedback, 'hit');

  assert.equal(feedback.hitFlashLeft, Logic.CONSTANTS.HIT_FLASH_TIME);
  assert.ok(feedback.shakeLeft > 0);
  assert.equal(feedback.message, '撞到了');

  Logic.stepFeedback(feedback, Logic.CONSTANTS.HIT_FLASH_TIME + 0.1);

  assert.equal(feedback.hitFlashLeft, 0);
  assert.equal(feedback.shakeLeft, 0);
  assert.equal(feedback.message, '');
});

test('audio cues expose background and death sound settings', () => {
  const cues = Logic.createAudioCues();

  assert.equal(cues.background.src, 'assets/audio/see-you-again.mp3');
  assert.equal(cues.background.loop, true);
  assert.ok(cues.background.volume >= 0.6);
  assert.ok(cues.background.volume <= 0.8);
  assert.equal(cues.death.src, 'assets/audio/mamba-out-normal.mp3');
  assert.equal(cues.death.preload, true);
  assert.ok(cues.death.volume > 0.7);
});
