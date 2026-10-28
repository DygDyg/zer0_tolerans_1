# Zero Sector — Project Instructions

## Purpose
Retro-FPS game inspired by Zero Tolerance (1994, Sega Mega Drive).
Raycasting engine, pixel art aesthetics, 5 playable characters, 40-level campaign.

## Technologies
- TypeScript (strict)
- Vite + React (UI shell)
- HTML5 Canvas 2D (game rendering)
- Web Audio API (procedural sounds)
- localStorage (saves)

## Architecture
- `src/engine/` — Core game engine (raycasting, physics, AI)
- `src/data/` — Level data, weapons, characters (JSON-like)
- `src/ui/` — React components for menus and HUD
- `src/audio/` — Sound system
- `src/App.tsx` — Main entry, state machine

## Key Constraints
- No 3D libraries (Three.js, Babylon, etc.)
- Logical resolution: 320×224
- `imageSmoothingEnabled = false`
- Frame-independent simulation
- All levels loaded from data definitions

## Commands
```bash
npm run dev      # Development server
npm run build    # Production build
npm run typecheck # TypeScript check
```

## Documents
- `docs/GAME_SPEC.md` — Full game specification
- `docs/ARCHITECTURE.md` — System architecture
- `docs/ROADMAP.md` — Development plan
- `docs/PROGRESS.md` — Current status
