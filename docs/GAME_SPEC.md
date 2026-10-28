# Zero Sector — Game Specification

## Overview
Retro-FPS set on a space station complex. Player controls one of 5 squad members
through 40 levels across multiple themed zones.

## Core Mechanics
- Raycasting pseudo-3D rendering (DDA algorithm)
- Textured walls, floor/ceiling casting
- Billboard sprites for enemies and items
- Z-buffer for proper occlusion
- Wall collision with slide
- Door animations
- Level completion via clearing all enemies + reaching exit

## Characters (5)
Each has unique stats: health, speed, starting inventory, special ability.
Death = character unavailable until new campaign.

## Weapons
- Pulse Pistol (default, unlimited energy)
- Plasma Rifle (medium damage, medium fire rate)
- Ion Cannon (high damage, slow fire rate)
- Scatter Gun (close range, spread)
- Arc Blade (melee, instant)

## Enemy AI (Finite State Machine)
States: Idle → Patrol → Alert → Chase → Attack → Search → Stunned → Defeated
- Line-of-sight detection
- Pathfinding (BFS)
- Different enemy types with unique behaviors

## HUD
- Health bar, armor bar
- Radar with minimap
- Inventory (5 slots)
- Enemy counter
- Character portrait
- Floor indicator
- System messages

## Levels
- Loaded from JSON definitions
- Support walls, doors, elevators, exits, items, enemies, terminals
- 3 initial levels: Docking Sector, Security Complex, Bio Laboratory

## Saves
- localStorage with versioned format
- Stores: level, character, health, inventory, progress
