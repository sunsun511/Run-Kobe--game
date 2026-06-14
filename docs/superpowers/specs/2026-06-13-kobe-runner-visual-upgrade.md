# Kobe Runner Visual Upgrade Design

## Goal

Improve the first playable game's readability and moment-to-moment feedback without changing the core rules.

## Scope

- Make the player read more clearly as a 24-number basketball runner.
- Make iced tea, helicopter, and basketball pickups more visually distinct.
- Add pickup feedback: gold flash, floating text, shield, and burst particles.
- Add collision feedback: brief screen shake, red flash, and stronger game-over state.
- Add more court-like background depth while keeping the playfield clean.
- Keep the game as a single static web page with no external assets.

## Non-Goals

- No official logos, real photos, or exact likeness.
- No new gameplay systems.
- No audio in this pass.

## Acceptance Criteria

- Starting, jumping, ducking, scoring, and game-over behavior remain unchanged.
- When a basketball is collected, the game displays a visible gold invincibility moment.
- When the player collides without invincibility, the stage shows an immediate hit flash/shake before the game-over overlay.
- Obstacles remain visually readable at speed.
- Existing automated game-rule tests still pass.
