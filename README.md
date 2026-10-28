# Zero Sector

A retro-FPS game inspired by **Zero Tolerance (1994, Sega Mega Drive)**.

Built with TypeScript, React, and HTML5 Canvas 2D. Features a custom raycasting engine — no 3D libraries used.

![Zero Sector](https://img.shields.io/badge/engine-raycasting-green) ![TypeScript](https://img.shields.io/badge/lang-TypeScript-blue)

## Features

- **Custom Raycasting Engine** — DDA algorithm with textured walls, floor/ceiling, z-buffer
- **5 Playable Characters** — Each with unique stats and abilities
- **5 Weapon Types** — Pulse Pistol, Plasma Rifle, Ion Cannon, Scatter Gun, Arc Blade
- **Enemy AI** — Finite state machine with 7 states, line-of-sight detection
- **3 Themed Levels** — Docking Sector, Security Complex, Bio Laboratory
- **Retro HUD** — Radar, health/armor bars, weapon info, enemy counter
- **Procedural Audio** — All sounds generated via Web Audio API
- **Save System** — localStorage with versioned format
- **Pixel-perfect Rendering** — 320×224 logical resolution, scaled to any screen

## Quick Start

```bash
npm install
npm run dev
```

Open `http://localhost:3000` in your browser.

## Controls

| Action | Key |
|--------|-----|
| Move | W/A/S/D or Arrow Keys |
| Look | Mouse |
| Fire | Left Click |
| Weapon 1-5 | Number Keys 1-5 |
| Cycle Weapon | F / Q |
| Pause | Escape |

## Architecture

```
src/
├── engine/       # Game engine (raycasting, physics, AI)
├── data/         # Level, character, weapon definitions
├── audio/        # Procedural sound system
├── App.tsx       # React UI (menus, HUD)
└── main.tsx      # Entry point
```

See `docs/` for detailed documentation:
- `GAME_SPEC.md` — Full game specification
- `ARCHITECTURE.md` — System architecture
- `ROADMAP.md` — Development plan
- `PROGRESS.md` — Current status

## Technologies

- **TypeScript** — Strict typing throughout
- **Vite** — Fast build tool
- **React** — UI shell (menus, HUD)
- **Canvas 2D** — Game rendering
- **Web Audio API** — Procedural sounds
- **Tailwind CSS** — UI styling

## Development

```bash
npm run dev        # Start dev server
npm run build      # Production build
npm run typecheck  # TypeScript check
```

## License

MIT
