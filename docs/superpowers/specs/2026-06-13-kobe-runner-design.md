# Kobe Runner Design

## Goal

Build a first playable single-page runner game inspired by the simple "open and play" format of the reference link.

## Core Loop

The player controls a Kobe-inspired runner with two actions: jump and duck. Ground obstacles are iced tea bottles and must be jumped over. Air obstacles are helicopters and must be ducked under. Basketball pickups appear during play and grant a short invincibility window.

## MVP Scope

- One `index.html` playable directly in a browser.
- Keyboard controls: Space/Up to jump, Down to duck.
- Touch controls: on-screen jump and duck buttons.
- Score, high score, start/restart, pause on blur.
- Obstacles: iced tea bottle and helicopter.
- Pickup: basketball grants about three seconds of invincibility.
- No external assets or official logos; visuals are original CSS/Canvas-style game art.

## Out Of Scope For First Playable

- Deployment to a public URL.
- Audio, generated image assets, leaderboards, and multiplayer.
- Exact likeness, official team branding, or copyrighted logos.

## Acceptance Criteria

- Opening `index.html` shows the game immediately with a start button.
- The runner can jump and duck.
- Colliding with an obstacle ends the run unless invincible.
- Collecting a basketball starts invincibility and allows surviving collisions.
- The game gets faster over time and tracks high score locally.
