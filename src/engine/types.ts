// Zero Sector — Core Type Definitions

export const GAME_WIDTH = 320;
export const GAME_HEIGHT = 224;
export const TILE_SIZE = 64;
export const FOV = Math.PI / 3; // 60 degrees
export const HALF_FOV = FOV / 2;
export const NUM_RAYS = 320;
export const MAX_DEPTH = 20;
export const MOVE_SPEED = 3.0;
export const ROT_SPEED = 2.5;
export const MOUSE_SENSITIVITY = 0.003;

export interface Vector2 {
  x: number;
  y: number;
}

export interface Player {
  x: number;
  y: number;
  angle: number;
  health: number;
  maxHealth: number;
  armor: number;
  maxArmor: number;
  speed: number;
  weapon: number;
  inventory: InventoryItem[];
  characterIndex: number;
}

export interface InventoryItem {
  id: string;
  name: string;
  type: 'weapon' | 'health' | 'armor' | 'ammo' | 'key';
  quantity: number;
  maxQuantity: number;
}

export interface Enemy {
  id: number;
  x: number;
  y: number;
  type: EnemyType;
  health: number;
  maxHealth: number;
  speed: number;
  damage: number;
  state: EnemyState;
  angle: number;
  alertTimer: number;
  attackTimer: number;
  targetX: number;
  targetY: number;
  path: Vector2[];
  pathIndex: number;
  visible: boolean;
  distance: number;
  screenX: number;
  spriteFrame: number;
  animTimer: number;
}

export enum EnemyType {
  DRONE = 'drone',
  GUARD = 'guard',
  MUTANT = 'mutant',
  TURRET = 'turret',
  BOSS = 'boss'
}

export enum EnemyState {
  IDLE = 'idle',
  PATROL = 'patrol',
  ALERT = 'alert',
  CHASE = 'chase',
  ATTACK = 'attack',
  SEARCH = 'search',
  STUNNED = 'stunned',
  DEFEATED = 'defeated'
}

export interface Weapon {
  id: string;
  name: string;
  damage: number;
  fireRate: number; // shots per second
  range: number;
  ammoType: string;
  ammoPerShot: number;
  spread: number;
  color: string;
  sound: string;
}

export interface Character {
  id: string;
  name: string;
  specialty: string;
  health: number;
  speed: number;
  startInventory: string[];
  ability: string;
  color: string;
}

export interface MapTile {
  type: number; // 0 = empty, 1+ = wall type
  texture: number;
}

export interface Door {
  x: number;
  y: number;
  open: number; // 0 = closed, 1 = open
  opening: boolean;
  closing: boolean;
  locked: boolean;
  keyRequired: string | null;
}

export interface Item {
  id: number;
  x: number;
  y: number;
  type: string;
  quantity: number;
  collected: boolean;
}

export interface LevelData {
  name: string;
  width: number;
  height: number;
  map: number[][];
  playerStart: Vector2;
  playerAngle: number;
  enemies: EnemySpawn[];
  items: ItemSpawn[];
  doors: DoorSpawn[];
  exit: Vector2;
  theme: LevelTheme;
}

export interface EnemySpawn {
  x: number;
  y: number;
  type: EnemyType;
}

export interface ItemSpawn {
  x: number;
  y: number;
  type: string;
  quantity: number;
}

export interface DoorSpawn {
  x: number;
  y: number;
  locked: boolean;
  keyRequired: string | null;
}

export interface LevelTheme {
  floorColor: string;
  ceilingColor: string;
  wallColors: string[];
  fogColor: string;
  fogDensity: number;
  ambientLight: number;
}

export interface GameState {
  screen: 'menu' | 'playing' | 'paused' | 'gameover' | 'levelcomplete';
  level: number;
  player: Player;
  enemies: Enemy[];
  items: Item[];
  doors: Door[];
  levelData: LevelData;
  enemiesRemaining: number;
  message: string;
  messageTimer: number;
  time: number;
}

export interface RayHit {
  distance: number;
  wallX: number;
  side: number; // 0 = vertical, 1 = horizontal
  tileX: number;
  tileY: number;
  texture: number;
}

export interface SaveData {
  version: number;
  level: number;
  characterIndex: number;
  health: number;
  armor: number;
  inventory: InventoryItem[];
  completedLevels: number[];
  availableCharacters: number[];
  timestamp: number;
}
