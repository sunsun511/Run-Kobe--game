# Kobe Runner Visual Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve game visuals and feedback while preserving the existing runner gameplay.

**Architecture:** Keep deterministic feedback timers in `src/gameLogic.js` so they can be tested. Keep rendering changes in `src/game.js`, using the existing Canvas drawing structure. Keep layout polish in `styles.css`.

**Tech Stack:** Vanilla HTML/CSS/JS, Canvas 2D, Node built-in test runner.

---

### Task 1: Feedback State

**Files:**
- Modify: `tests/gameLogic.test.js`
- Modify: `src/gameLogic.js`

- [ ] Add tests for pickup and hit feedback timers.
- [ ] Implement `createFeedbackState`, `triggerFeedback`, and `stepFeedback`.
- [ ] Verify tests pass with `node --test tests/gameLogic.test.js`.

### Task 2: Canvas Visual Upgrade

**Files:**
- Modify: `src/game.js`
- Modify: `styles.css`

- [ ] Use feedback state for pickup flash and hit shake.
- [ ] Improve runner drawing with clearer jersey, shoes, face, and motion pose.
- [ ] Improve iced tea, helicopter, basketball, shield, and background drawing.
- [ ] Add floating feedback text and stronger game-over state.

### Task 3: Verification

**Files:**
- Use: `tests/gameLogic.test.js`
- Use: `index.html`

- [ ] Run rule tests and JavaScript syntax checks.
- [ ] Run browser smoke test.
- [ ] Capture updated screenshot to `output/playwright/kobe-runner-smoke.png`.
