# Zero Sector — Architecture

## System Overview

```
┌─────────────────────────────────────────────┐
│                 React UI                     │
│  (Menu, HUD, Character Select, Pause)       │
├─────────────────────────────────────────────┤
│              Game Engine (Game)              │
├──────────┬──────────┬──────────┬────────────┤
│ Raycaster│  Physics │   AI     │   Audio    │
│ (DDA)    │(Collision│ (FSM)   │ (WebAudio) │
│          │ + Slide) │ + BFS   │            │
├──────────┴──────────┴──────────┴────────────┤
│              Data Layer                      │
│  (Levels JSON, Characters, Weapons)         │
├─────────────────────────────────────────────┤
│           Texture Manager                    │
│     (Procedural Canvas Generation)          │
└─────────────────────────────────────────────┘
```

## Core Classes

### Game (`src/engine/game.ts`)
Main game controller. Manages game loop, state transitions, and coordinates all subsystems.

### TextureManager (`src/engine/textures.ts`)
Generates procedural pixel-art textures for walls and sprites at startup.

### AudioSystem (`src/audio/audio.ts`)
Procedural sound effects using Web Audio API oscillators and noise buffers.

## Data Flow

1. React creates Game instance with canvas reference
2. Game runs requestAnimationFrame loop
3. Each frame: input → update → render → React state sync
4. React reads game state for HUD updates (throttled)
5. Canvas renders at 320×224 logical resolution, CSS-scaled

## Rendering Pipeline

1. Clear buffer with floor/ceiling gradient
2. Cast 320 rays (DDA algorithm)
3. Apply fish-eye correction
4. Texture-map walls with distance shading
5. Collect and sort sprites by distance
6. Render sprites with z-buffer occlusion
7. Render projectile effects
8. Put buffer to canvas
9. Overlay weapon view and crosshair

## State Machine

```
menu → charselect → playing ↔ paused
                     ↓
              levelcomplete → playing (next level)
                     ↓
                  gameover → menu
```

## Save Format

Versioned JSON in localStorage:
```json
{
  "version": 1,
  "level": 0,
  "characterIndex": 0,
  "health": 100,
  "armor": 0,
  "ammo": { "energy": 999, "plasma": 30, "ion": 10, "shells": 20 },
  "completedLevels": [],
  "availableCharacters": [0,1,2,3,4],
  "timestamp": 1234567890
}
```
