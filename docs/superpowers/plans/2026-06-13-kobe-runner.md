# Kobe Runner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a first playable Kobe-inspired runner game as a single local web page.

**Architecture:** Use plain HTML, CSS, and JavaScript so the game opens without a build step. Keep deterministic game rules in `src/gameLogic.js` so Node tests can cover collision, pickups, and invincibility. Keep rendering and input orchestration in `src/game.js`.

**Tech Stack:** Vanilla HTML/CSS/JS, Node built-in test runner.

---

### Task 1: Core Rules

**Files:**
- Create: `tests/gameLogic.test.js`
- Create: `src/gameLogic.js`

- [ ] Write failing tests for jump, duck, obstacle collision, basketball pickup, and invincibility timing.
- [ ] Run `node --test tests/gameLogic.test.js` and confirm the tests fail because `src/gameLogic.js` is missing.
- [ ] Implement the minimal pure game rules in `src/gameLogic.js`.
- [ ] Run `node --test tests/gameLogic.test.js` and confirm the tests pass.

### Task 2: Playable Web Page

**Files:**
- Create: `index.html`
- Create: `styles.css`
- Create: `src/game.js`

- [ ] Build the game screen, score UI, start/restart state, and touch controls.
- [ ] Wire keyboard and pointer input to jump and duck.
- [ ] Render runner, iced tea, helicopter, basketball pickup, invincibility effects, and game-over feedback.
- [ ] Persist high score in `localStorage`.

### Task 3: Verification

**Files:**
- Use: `index.html`
- Use: `tests/gameLogic.test.js`

- [ ] Run Node tests.
- [ ] Start a local static server and verify the page loads.
- [ ] Run a browser smoke test that starts the game and confirms the canvas/UI renders without JavaScript errors.
