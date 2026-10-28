// Zero Sector — Main Game Engine
import {
  GAME_WIDTH, GAME_HEIGHT, FOV, HALF_FOV, NUM_RAYS, MAX_DEPTH,
  MOVE_SPEED, ROT_SPEED, MOUSE_SENSITIVITY,
  Player, Enemy, EnemyType, EnemyState, Door, Item,
  LevelData, RayHit, Vector2, InventoryItem
} from './types';
import { TextureManager } from './textures';
import { LEVELS } from '../data/levels';
import { CHARACTERS } from '../data/characters';
import { WEAPONS } from '../data/weapons';
import { audioSystem } from '../audio/audio';

export type GameScreen = 'menu' | 'playing' | 'paused' | 'gameover' | 'levelcomplete' | 'charselect' | 'victory';

interface SpriteRender {
  x: number;
  y: number;
  distance: number;
  texture: ImageData;
  width: number;
  height: number;
  type: 'enemy' | 'item';
  id: number;
  health?: number;
  maxHealth?: number;
}

interface Projectile {
  x: number;
  y: number;
  angle: number;
  speed: number;
  damage: number;
  color: string;
  life: number;
  maxLife: number;
}

export class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private buffer: ImageData;
  private zBuffer: Float32Array;
  private textures: TextureManager;
  
  // Game state
  public screen: GameScreen = 'menu';
  private level: number = 0;
  private player: Player;
  private enemies: Enemy[] = [];
  private items: Item[] = [];
  private doors: Door[] = [];
  private projectiles: Projectile[] = [];
  private levelData: LevelData;
  private map: number[][] = [];
  
  // Input
  private keys: Set<string> = new Set();
  private mouseMovement: number = 0;
  private mouseLocked: boolean = false;
  private shooting: boolean = false;
  private lastFireTime: number = 0;
  
  // Timing
  private lastTime: number = 0;
  private deltaTime: number = 0;
  private fps: number = 60;
  private frameCount: number = 0;
  private fpsTimer: number = 0;
  
  // UI
  private message: string = '';
  private messageTimer: number = 0;
  private enemiesRemaining: number = 0;
  private weaponAnimTimer: number = 0;
  private damageFlash: number = 0;
  private pickupFlash: number = 0;
  
  // Ammo
  private ammo: Record<string, number> = {
    energy: 999,
    plasma: 30,
    ion: 10,
    shells: 20,
  };
  
  // Available characters
  private availableCharacters: number[] = [0, 1, 2, 3, 4];
  private selectedCharacter: number = 0;
  private completedLevels: number[] = [];
  private campaignStarted: boolean = false;
  
  // Callbacks
  private onStateChange: (() => void) | null = null;
  
  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false })!;
    this.ctx.imageSmoothingEnabled = false;
    
    this.canvas.width = GAME_WIDTH;
    this.canvas.height = GAME_HEIGHT;
    
    this.buffer = this.ctx.createImageData(GAME_WIDTH, GAME_HEIGHT);
    this.zBuffer = new Float32Array(GAME_WIDTH);
    this.textures = new TextureManager();
    
    this.player = this.createDefaultPlayer();
    this.levelData = LEVELS[0];
    this.map = this.levelData.map.map(row => [...row]);
    
    this.setupInput();
  }
  
  private createDefaultPlayer(): Player {
    return {
      x: 2.5,
      y: 2.5,
      angle: 0,
      health: 100,
      maxHealth: 100,
      armor: 0,
      maxArmor: 100,
      speed: 1.0,
      weapon: 0,
      inventory: [],
      characterIndex: 0,
    };
  }
  
  setStateChangeCallback(cb: () => void): void {
    this.onStateChange = cb;
  }
  
  private notifyStateChange(): void {
    if (this.onStateChange) this.onStateChange();
  }
  
  // === PUBLIC API ===
  
  getState() {
    return {
      screen: this.screen,
      level: this.level,
      player: this.player,
      enemies: this.enemies,
      enemiesRemaining: this.enemiesRemaining,
      message: this.message,
      fps: this.fps,
      ammo: this.ammo,
      availableCharacters: this.availableCharacters,
      selectedCharacter: this.selectedCharacter,
      completedLevels: this.completedLevels,
      campaignStarted: this.campaignStarted,
    };
  }
  
  startGame(characterIndex: number): void {
    this.selectedCharacter = characterIndex;
    this.level = 0;
    this.completedLevels = [];
    this.availableCharacters = [0, 1, 2, 3, 4];
    this.campaignStarted = true;
    this.player.armor = 0;
    this.initLevel(0, characterIndex);
    this.screen = 'playing';
    this.notifyStateChange();
  }
  
  continueGame(characterIndex: number): void {
    this.selectedCharacter = characterIndex;
    const prevHealth = this.player.health;
    const prevArmor = this.player.armor;
    this.initLevel(this.level, characterIndex);
    // Preserve health/armor from previous character if continuing
    if (prevHealth > 0) {
      this.player.health = prevHealth;
      this.player.armor = prevArmor;
    }
    this.screen = 'playing';
    this.notifyStateChange();
  }
  
  resumeGame(): void {
    this.screen = 'playing';
    this.notifyStateChange();
  }
  
  pauseGame(): void {
    this.screen = 'paused';
    this.notifyStateChange();
  }
  
  nextLevel(): void {
    if (!this.completedLevels.includes(this.level)) {
      this.completedLevels.push(this.level);
    }
    this.level++;
    if (this.level >= LEVELS.length) {
      this.screen = 'victory';
      this.message = 'CAMPAIGN COMPLETE!';
    } else {
      this.initLevel(this.level, this.selectedCharacter);
      this.screen = 'playing';
    }
    this.notifyStateChange();
  }
  
  returnToMenu(): void {
    this.screen = 'menu';
    this.notifyStateChange();
  }
  
  showCharSelect(): void {
    this.screen = 'charselect';
    this.notifyStateChange();
  }
  
  getCharacters() {
    return CHARACTERS;
  }
  
  getAvailableCharacters() {
    return this.availableCharacters;
  }
  
  getWeapons() {
    return WEAPONS;
  }
  
  switchWeapon(index: number): void {
    if (index >= 0 && index < WEAPONS.length) {
      this.player.weapon = index;
    }
  }
  
  saveGame(): void {
    try {
      const save = {
        version: 1,
        level: this.level,
        characterIndex: this.selectedCharacter,
        health: this.player.health,
        armor: this.player.armor,
        ammo: this.ammo,
        completedLevels: this.completedLevels,
        availableCharacters: this.availableCharacters,
        timestamp: Date.now(),
      };
      localStorage.setItem('zero-sector-save', JSON.stringify(save));
      this.showMessage('GAME SAVED');
    } catch (e) {
      this.showMessage('SAVE FAILED');
    }
  }
  
  loadGame(): boolean {
    try {
      const data = localStorage.getItem('zero-sector-save');
      if (!data) return false;
      const save = JSON.parse(data);
      if (save.version !== 1) return false;
      
      this.level = save.level;
      this.selectedCharacter = save.characterIndex;
      this.player.health = save.health;
      this.player.armor = save.armor;
      this.ammo = save.ammo;
      this.completedLevels = save.completedLevels || [];
      this.availableCharacters = save.availableCharacters || [0, 1, 2, 3, 4];
      
      this.initLevel(this.level, this.selectedCharacter);
      this.screen = 'playing';
      this.notifyStateChange();
      return true;
    } catch (e) {
      return false;
    }
  }
  
  hasSave(): boolean {
    return localStorage.getItem('zero-sector-save') !== null;
  }
  
  // === INITIALIZATION ===
  
  private initLevel(levelIndex: number, characterIndex: number): void {
    this.levelData = LEVELS[levelIndex];
    this.map = this.levelData.map.map(row => [...row]);
    
    const char = CHARACTERS[characterIndex];
    this.player = {
      x: this.levelData.playerStart.x,
      y: this.levelData.playerStart.y,
      angle: this.levelData.playerAngle,
      health: char.health,
      maxHealth: char.health,
      armor: this.player.armor || 0,
      maxArmor: 100,
      speed: char.speed,
      weapon: 0,
      inventory: [],
      characterIndex: characterIndex,
    };
    
    // Reset ammo for new level (keep from previous)
    if (levelIndex === 0) {
      this.ammo = { energy: 999, plasma: 30, ion: 10, shells: 20 };
    }
    
    // Spawn enemies
    this.enemies = this.levelData.enemies.map((spawn, i) => this.createEnemy(spawn, i));
    this.enemiesRemaining = this.enemies.length;
    
    // Spawn items
    this.items = this.levelData.items.map((spawn, i) => ({
      id: i,
      x: spawn.x,
      y: spawn.y,
      type: spawn.type,
      quantity: spawn.quantity,
      collected: false,
    }));
    
    // Spawn doors
    this.doors = this.levelData.doors.map(spawn => ({
      x: spawn.x,
      y: spawn.y,
      open: 0,
      opening: false,
      closing: false,
      locked: spawn.locked,
      keyRequired: spawn.keyRequired,
    }));
    
    this.projectiles = [];
    this.showMessage(this.levelData.name.toUpperCase());
  }
  
  private createEnemy(spawn: { x: number; y: number; type: EnemyType }, id: number): Enemy {
    const stats = this.getEnemyStats(spawn.type);
    return {
      id,
      x: spawn.x,
      y: spawn.y,
      type: spawn.type,
      health: stats.health,
      maxHealth: stats.health,
      speed: stats.speed,
      damage: stats.damage,
      state: EnemyState.IDLE,
      angle: Math.random() * Math.PI * 2,
      alertTimer: 0,
      attackTimer: 0,
      targetX: spawn.x,
      targetY: spawn.y,
      path: [],
      pathIndex: 0,
      visible: false,
      distance: 0,
      screenX: 0,
      spriteFrame: 0,
      animTimer: 0,
    };
  }
  
  private getEnemyStats(type: EnemyType): { health: number; speed: number; damage: number } {
    switch (type) {
      case EnemyType.DRONE: return { health: 30, speed: 2.0, damage: 8 };
      case EnemyType.GUARD: return { health: 60, speed: 1.5, damage: 15 };
      case EnemyType.MUTANT: return { health: 80, speed: 1.8, damage: 20 };
      case EnemyType.TURRET: return { health: 50, speed: 0, damage: 12 };
      case EnemyType.BOSS: return { health: 200, speed: 1.0, damage: 30 };
      default: return { health: 30, speed: 1.0, damage: 10 };
    }
  }
  
  // === INPUT ===
  
  private setupInput(): void {
    window.addEventListener('keydown', (e) => {
      this.keys.add(e.code);
      
      if (e.code === 'Escape') {
        if (this.screen === 'playing') this.pauseGame();
        else if (this.screen === 'paused') this.resumeGame();
      }
      if (e.code === 'Digit1') this.switchWeapon(0);
      if (e.code === 'Digit2') this.switchWeapon(1);
      if (e.code === 'Digit3') this.switchWeapon(2);
      if (e.code === 'Digit4') this.switchWeapon(3);
      if (e.code === 'Digit5') this.switchWeapon(4);
      if (e.code === 'KeyF') this.switchWeapon((this.player.weapon + 1) % WEAPONS.length);
      if (e.code === 'KeyQ') this.switchWeapon((this.player.weapon - 1 + WEAPONS.length) % WEAPONS.length);
    });
    
    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
    });
    
    this.canvas.addEventListener('mousedown', (e) => {
      if (e.button === 0) {
        this.shooting = true;
        audioSystem.init();
        audioSystem.resume();
        if (!this.mouseLocked && this.screen === 'playing') {
          this.canvas.requestPointerLock();
        }
      }
    });
    
    this.canvas.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.shooting = false;
    });
    
    document.addEventListener('pointerlockchange', () => {
      this.mouseLocked = document.pointerLockElement === this.canvas;
    });
    
    document.addEventListener('mousemove', (e) => {
      if (this.mouseLocked) {
        this.mouseMovement += e.movementX;
      }
    });
  }
  
  // === GAME LOOP ===
  
  update(timestamp: number): void {
    if (this.lastTime === 0) {
      this.lastTime = timestamp;
      return;
    }
    
    this.deltaTime = Math.min((timestamp - this.lastTime) / 1000, 0.05);
    this.lastTime = timestamp;
    
    // FPS counter
    this.frameCount++;
    this.fpsTimer += this.deltaTime;
    if (this.fpsTimer >= 1) {
      this.fps = this.frameCount;
      this.frameCount = 0;
      this.fpsTimer = 0;
    }
    
    if (this.screen === 'playing') {
      this.updatePlayer();
      this.updateEnemies();
      this.updateDoors();
      this.updateProjectiles();
      this.checkItemPickups();
      this.checkExit();
      this.updateTimers();
    }
    
    // Only render when canvas is visible (playing or paused)
    if (this.screen === 'playing' || this.screen === 'paused') {
      try {
        this.render();
      } catch (e) {
        // Silently handle render errors
      }
    }
  }
  
  private updatePlayer(): void {
    const dt = this.deltaTime;
    const speed = MOVE_SPEED * this.player.speed * dt;
    const rotSpeed = ROT_SPEED * dt;
    
    // Mouse rotation
    if (this.mouseMovement !== 0) {
      this.player.angle += this.mouseMovement * MOUSE_SENSITIVITY;
      this.mouseMovement = 0;
    }
    
    // Keyboard rotation
    if (this.keys.has('ArrowLeft') || this.keys.has('KeyA') && !this.keys.has('KeyW')) {
      this.player.angle -= rotSpeed;
    }
    if (this.keys.has('ArrowRight') || this.keys.has('KeyD') && !this.keys.has('KeyW')) {
      this.player.angle += rotSpeed;
    }
    
    // Movement
    let moveX = 0, moveY = 0;
    
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) {
      moveX += Math.cos(this.player.angle) * speed;
      moveY += Math.sin(this.player.angle) * speed;
    }
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) {
      moveX -= Math.cos(this.player.angle) * speed;
      moveY -= Math.sin(this.player.angle) * speed;
    }
    if (this.keys.has('KeyA')) {
      moveX += Math.cos(this.player.angle - Math.PI / 2) * speed * 0.7;
      moveY += Math.sin(this.player.angle - Math.PI / 2) * speed * 0.7;
    }
    if (this.keys.has('KeyD')) {
      moveX += Math.cos(this.player.angle + Math.PI / 2) * speed * 0.7;
      moveY += Math.sin(this.player.angle + Math.PI / 2) * speed * 0.7;
    }
    
    // Collision detection with sliding
    const newX = this.player.x + moveX;
    const newY = this.player.y + moveY;
    const margin = 0.2;
    
    if (this.isWalkable(newX + margin, this.player.y) && this.isWalkable(newX - margin, this.player.y)) {
      this.player.x = newX;
    }
    if (this.isWalkable(this.player.x, newY + margin) && this.isWalkable(this.player.x, newY - margin)) {
      this.player.y = newY;
    }
    
    // Shooting
    if (this.shooting) {
      const weapon = WEAPONS[this.player.weapon];
      const fireInterval = 1 / weapon.fireRate;
      const now = performance.now() / 1000;
      
      if (now - this.lastFireTime >= fireInterval) {
        if (this.ammo[weapon.ammoType] >= weapon.ammoPerShot || weapon.ammoPerShot === 0) {
          this.fire();
          this.lastFireTime = now;
          this.ammo[weapon.ammoType] -= weapon.ammoPerShot;
          this.weaponAnimTimer = 0.15;
          audioSystem.playShoot(weapon.sound);
        }
      }
    }
  }
  
  private isWalkable(x: number, y: number): boolean {
    const mapX = Math.floor(x);
    const mapY = Math.floor(y);
    
    if (mapX < 0 || mapX >= this.levelData.width || mapY < 0 || mapY >= this.levelData.height) {
      return false;
    }
    
    const tile = this.map[mapY][mapX];
    if (tile === 0) return true;
    
    // Check doors
    for (const door of this.doors) {
      if (door.x === mapX && door.y === mapY && door.open > 0.8) {
        return true;
      }
    }
    
    return false;
  }
  
  private fire(): void {
    const weapon = WEAPONS[this.player.weapon];
    
    // Create projectile visual
    const spread = (Math.random() - 0.5) * weapon.spread;
    const angle = this.player.angle + spread;
    
    this.projectiles.push({
      x: this.player.x,
      y: this.player.y,
      angle: angle,
      speed: 15,
      damage: weapon.damage,
      color: weapon.color,
      life: 0.5,
      maxLife: 0.5,
    });
    
    // Hitscan check
    const hit = this.castRay(this.player.x, this.player.y, angle);
    
    // Check enemy hits
    let closestEnemy: Enemy | null = null;
    let closestDist = weapon.range;
    
    for (const enemy of this.enemies) {
      if (enemy.state === EnemyState.DEFEATED) continue;
      
      const dx = enemy.x - this.player.x;
      const dy = enemy.y - this.player.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist > weapon.range) continue;
      
      // Check if enemy is in line of fire
      const enemyAngle = Math.atan2(dy, dx);
      let angleDiff = enemyAngle - angle;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      
      const angularSize = Math.atan2(0.4, dist);
      
      if (Math.abs(angleDiff) < angularSize && dist < closestDist) {
        // Check line of sight
        if (this.hasLineOfSight(this.player.x, this.player.y, enemy.x, enemy.y)) {
          closestDist = dist;
          closestEnemy = enemy;
        }
      }
    }
    
    if (closestEnemy) {
      closestEnemy.health -= weapon.damage;
      closestEnemy.state = EnemyState.ALERT;
      closestEnemy.alertTimer = 5;
      
      if (closestEnemy.health <= 0) {
        closestEnemy.state = EnemyState.DEFEATED;
        this.enemiesRemaining--;
        this.showMessage('ENEMY ELIMINATED');
        audioSystem.playEnemyDeath();
      } else {
        audioSystem.playHit();
      }
    }
    
    // Check door interaction
    if (hit && hit.distance < 1.5) {
      for (const door of this.doors) {
        if (door.x === hit.tileX && door.y === hit.tileY) {
          if (!door.locked) {
            door.opening = true;
          } else {
            this.showMessage('DOOR IS LOCKED');
          }
        }
      }
    }
  }
  
  private hasLineOfSight(x1: number, y1: number, x2: number, y2: number): boolean {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const steps = Math.ceil(dist * 4);
    
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      const x = x1 + dx * t;
      const y = y1 + dy * t;
      if (!this.isWalkable(x, y)) return false;
    }
    return true;
  }
  
  // === ENEMY AI ===
  
  private updateEnemies(): void {
    const dt = this.deltaTime;
    
    for (const enemy of this.enemies) {
      if (enemy.state === EnemyState.DEFEATED) continue;
      
      enemy.animTimer += dt;
      if (enemy.animTimer > 0.3) {
        enemy.animTimer = 0;
        enemy.spriteFrame = (enemy.spriteFrame + 1) % 4;
      }
      
      const dx = this.player.x - enemy.x;
      const dy = this.player.y - enemy.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const angleToPlayer = Math.atan2(dy, dx);
      
      // State machine
      switch (enemy.state) {
        case EnemyState.IDLE:
          if (dist < 8 && this.hasLineOfSight(enemy.x, enemy.y, this.player.x, this.player.y)) {
            enemy.state = EnemyState.ALERT;
            enemy.alertTimer = 1;
          }
          break;
          
        case EnemyState.ALERT:
          enemy.alertTimer -= dt;
          enemy.angle = angleToPlayer;
          if (enemy.alertTimer <= 0) {
            enemy.state = EnemyState.CHASE;
          }
          break;
          
        case EnemyState.CHASE:
          enemy.angle = angleToPlayer;
          
          if (dist < 2) {
            enemy.state = EnemyState.ATTACK;
            enemy.attackTimer = 0;
          } else if (dist > 12 || !this.hasLineOfSight(enemy.x, enemy.y, this.player.x, this.player.y)) {
            enemy.state = EnemyState.SEARCH;
            enemy.alertTimer = 5;
          } else {
            // Move toward player
            const moveSpeed = enemy.speed * dt;
            const newX = enemy.x + Math.cos(angleToPlayer) * moveSpeed;
            const newY = enemy.y + Math.sin(angleToPlayer) * moveSpeed;
            
            if (this.isWalkable(newX, enemy.y)) enemy.x = newX;
            if (this.isWalkable(enemy.x, newY)) enemy.y = newY;
          }
          break;
          
        case EnemyState.ATTACK:
          enemy.angle = angleToPlayer;
          enemy.attackTimer += dt;
          
          if (enemy.attackTimer >= 1.0) {
            enemy.attackTimer = 0;
            // Attack player
            if (dist < 3 && this.hasLineOfSight(enemy.x, enemy.y, this.player.x, this.player.y)) {
              this.damagePlayer(enemy.damage);
            }
          }
          
          if (dist > 3) {
            enemy.state = EnemyState.CHASE;
          }
          break;
          
        case EnemyState.SEARCH:
          enemy.alertTimer -= dt;
          // Wander
          const wanderAngle = enemy.angle + (Math.random() - 0.5) * 0.5;
          const wanderSpeed = enemy.speed * 0.5 * dt;
          const wx = enemy.x + Math.cos(wanderAngle) * wanderSpeed;
          const wy = enemy.y + Math.sin(wanderAngle) * wanderSpeed;
          if (this.isWalkable(wx, wy)) {
            enemy.x = wx;
            enemy.y = wy;
          } else {
            enemy.angle += Math.PI / 2;
          }
          
          if (dist < 8 && this.hasLineOfSight(enemy.x, enemy.y, this.player.x, this.player.y)) {
            enemy.state = EnemyState.CHASE;
          } else if (enemy.alertTimer <= 0) {
            enemy.state = EnemyState.IDLE;
          }
          break;
          
        case EnemyState.STUNNED:
          enemy.alertTimer -= dt;
          if (enemy.alertTimer <= 0) {
            enemy.state = EnemyState.CHASE;
          }
          break;
      }
      
      // Turret specific behavior
      if (enemy.type === EnemyType.TURRET) {
        if (dist < 10 && this.hasLineOfSight(enemy.x, enemy.y, this.player.x, this.player.y)) {
          enemy.angle = angleToPlayer;
          enemy.attackTimer += dt;
          if (enemy.attackTimer >= 1.5) {
            enemy.attackTimer = 0;
            this.damagePlayer(enemy.damage);
          }
          enemy.state = EnemyState.ATTACK;
        }
      }
    }
  }
  
  private damagePlayer(damage: number): void {
    let actualDamage = damage;
    if (this.player.armor > 0) {
      const armorAbsorb = Math.min(this.player.armor, damage * 0.5);
      this.player.armor -= armorAbsorb;
      actualDamage -= armorAbsorb;
    }
    this.player.health -= actualDamage;
    this.damageFlash = 0.3;
    audioSystem.playPlayerDamage();
    
    if (this.player.health <= 0) {
      this.player.health = 0;
      this.handlePlayerDeath();
    }
  }
  
  private handlePlayerDeath(): void {
    // Remove character from available
    const idx = this.availableCharacters.indexOf(this.selectedCharacter);
    if (idx >= 0) this.availableCharacters.splice(idx, 1);
    
    if (this.availableCharacters.length === 0) {
      this.screen = 'gameover';
      this.showMessage('ALL OPERATIVES LOST');
    } else {
      this.screen = 'charselect';
      this.showMessage('OPERATIVE DOWN — SELECT REPLACEMENT');
    }
    this.notifyStateChange();
  }
  
  // === DOORS ===
  
  private updateDoors(): void {
    const dt = this.deltaTime;
    
    for (const door of this.doors) {
      if (door.opening && door.open < 1) {
        door.open = Math.min(1, door.open + dt * 2);
        if (door.open >= 1) door.opening = false;
      }
      if (door.closing && door.open > 0) {
        door.open = Math.max(0, door.open - dt * 2);
        if (door.open <= 0) door.closing = false;
      }
      
      // Auto-close after player passes
      if (door.open >= 1 && !door.opening) {
        const dx = this.player.x - (door.x + 0.5);
        const dy = this.player.y - (door.y + 0.5);
        if (Math.sqrt(dx * dx + dy * dy) > 2) {
          door.closing = true;
        }
      }
    }
  }
  
  // === PROJECTILES ===
  
  private updateProjectiles(): void {
    const dt = this.deltaTime;
    
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.x += Math.cos(p.angle) * p.speed * dt;
      p.y += Math.sin(p.angle) * p.speed * dt;
      p.life -= dt;
      
      if (p.life <= 0 || !this.isWalkable(p.x, p.y)) {
        this.projectiles.splice(i, 1);
      }
    }
  }
  
  // === ITEMS ===
  
  private checkItemPickups(): void {
    for (const item of this.items) {
      if (item.collected) continue;
      
      const dx = this.player.x - item.x;
      const dy = this.player.y - item.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist < 0.7) {
        this.collectItem(item);
      }
    }
  }
  
  private collectItem(item: Item): void {
    item.collected = true;
    this.pickupFlash = 0.2;
    audioSystem.playPickup();
    
    switch (item.type) {
      case 'health':
        this.player.health = Math.min(this.player.maxHealth, this.player.health + item.quantity);
        this.showMessage(`+${item.quantity} HEALTH`);
        break;
      case 'armor':
        this.player.armor = Math.min(this.player.maxArmor, this.player.armor + item.quantity);
        this.showMessage(`+${item.quantity} ARMOR`);
        break;
      case 'ammo':
        this.ammo.plasma = Math.min(100, this.ammo.plasma + item.quantity);
        this.ammo.ion = Math.min(30, this.ammo.ion + Math.floor(item.quantity / 3));
        this.ammo.shells = Math.min(50, this.ammo.shells + Math.floor(item.quantity / 2));
        this.showMessage(`AMMO ACQUIRED`);
        break;
      case 'key':
        this.showMessage(`KEY CARD ACQUIRED`);
        break;
    }
  }
  
  // === EXIT CHECK ===
  
  private checkExit(): void {
    const exit = this.levelData.exit;
    const dx = this.player.x - exit.x;
    const dy = this.player.y - exit.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    if (dist < 1.0 && this.enemiesRemaining <= 0) {
      this.screen = 'levelcomplete';
      this.showMessage('SECTOR CLEARED');
      audioSystem.playLevelComplete();
      this.notifyStateChange();
    } else if (dist < 1.0 && this.enemiesRemaining > 0) {
      this.showMessage(`${this.enemiesRemaining} HOSTILES REMAINING`);
    }
  }
  
  // === TIMERS ===
  
  private updateTimers(): void {
    if (this.messageTimer > 0) {
      this.messageTimer -= this.deltaTime;
      if (this.messageTimer <= 0) this.message = '';
    }
    if (this.damageFlash > 0) this.damageFlash -= this.deltaTime;
    if (this.pickupFlash > 0) this.pickupFlash -= this.deltaTime;
    if (this.weaponAnimTimer > 0) this.weaponAnimTimer -= this.deltaTime;
  }
  
  private showMessage(msg: string): void {
    this.message = msg;
    this.messageTimer = 3;
  }
  
  // === RAYCASTING ===
  
  private castRay(originX: number, originY: number, angle: number): RayHit | null {
    const sin = Math.sin(angle);
    const cos = Math.cos(angle);
    
    // DDA algorithm
    let mapX = Math.floor(originX);
    let mapY = Math.floor(originY);
    
    const deltaDistX = Math.abs(1 / cos) || 1e10;
    const deltaDistY = Math.abs(1 / sin) || 1e10;
    
    let stepX: number, stepY: number;
    let sideDistX: number, sideDistY: number;
    
    if (cos < 0) {
      stepX = -1;
      sideDistX = (originX - mapX) * deltaDistX;
    } else {
      stepX = 1;
      sideDistX = (mapX + 1 - originX) * deltaDistX;
    }
    
    if (sin < 0) {
      stepY = -1;
      sideDistY = (originY - mapY) * deltaDistY;
    } else {
      stepY = 1;
      sideDistY = (mapY + 1 - originY) * deltaDistY;
    }
    
    let side = 0;
    let hit = false;
    
    for (let i = 0; i < 64; i++) {
      if (sideDistX < sideDistY) {
        sideDistX += deltaDistX;
        mapX += stepX;
        side = 0;
      } else {
        sideDistY += deltaDistY;
        mapY += stepY;
        side = 1;
      }
      
      if (mapX < 0 || mapX >= this.levelData.width || mapY < 0 || mapY >= this.levelData.height) break;
      
      if (this.map[mapY][mapX] > 0) {
        // Check if it's a door
        const isDoor = this.doors.some(d => d.x === mapX && d.y === mapY);
        if (isDoor) {
          const door = this.doors.find(d => d.x === mapX && d.y === mapY)!;
          if (door.open < 0.9) {
            hit = true;
            break;
          }
        } else {
          hit = true;
          break;
        }
      }
    }
    
    if (!hit) return null;
    
    let perpDist: number;
    let wallX: number;
    
    if (side === 0) {
      perpDist = (mapX - originX + (1 - stepX) / 2) / cos;
      wallX = originY + perpDist * sin;
    } else {
      perpDist = (mapY - originY + (1 - stepY) / 2) / sin;
      wallX = originX + perpDist * cos;
    }
    wallX -= Math.floor(wallX);
    
    return {
      distance: perpDist,
      wallX: wallX,
      side: side,
      tileX: mapX,
      tileY: mapY,
      texture: this.map[mapY][mapX],
    };
  }
  
  // === RENDERING ===
  
  private render(): void {
    const data = this.buffer.data;
    const theme = this.levelData.theme;
    
    // Clear buffer with floor and ceiling
    for (let y = 0; y < GAME_HEIGHT; y++) {
      for (let x = 0; x < GAME_WIDTH; x++) {
        const i = (y * GAME_WIDTH + x) * 4;
        if (y < GAME_HEIGHT / 2) {
          // Ceiling
          const c = this.parseColor(theme.ceilingColor);
          const shade = 1 - (GAME_HEIGHT / 2 - y) / GAME_HEIGHT * 0.5;
          data[i] = c.r * shade;
          data[i + 1] = c.g * shade;
          data[i + 2] = c.b * shade;
        } else {
          // Floor
          const c = this.parseColor(theme.floorColor);
          const shade = 1 - (y - GAME_HEIGHT / 2) / GAME_HEIGHT * 0.3;
          data[i] = c.r * shade;
          data[i + 1] = c.g * shade;
          data[i + 2] = c.b * shade;
        }
        data[i + 3] = 255;
      }
    }
    
    // Cast rays and render walls
    for (let x = 0; x < NUM_RAYS; x++) {
      const rayAngle = this.player.angle - HALF_FOV + (x / NUM_RAYS) * FOV;
      const hit = this.castRay(this.player.x, this.player.y, rayAngle);
      
      if (hit) {
        // Fish-eye correction
        const correctedDist = hit.distance * Math.cos(rayAngle - this.player.angle);
        this.zBuffer[x] = correctedDist;
        
        const wallHeight = Math.min(GAME_HEIGHT * 2, GAME_HEIGHT / correctedDist);
        const drawStart = Math.max(0, Math.floor((GAME_HEIGHT - wallHeight) / 2));
        const drawEnd = Math.min(GAME_HEIGHT - 1, Math.floor((GAME_HEIGHT + wallHeight) / 2));
        
        // Get texture
        const texIndex = Math.min(hit.texture, this.textures.getTextureCount() - 1);
        const texture = this.textures.getTexture(texIndex);
        
        const texX = Math.floor(hit.wallX * 64) % 64;
        
        // Distance shading
        const shade = Math.max(0.1, 1 - correctedDist * theme.fogDensity) * theme.ambientLight;
        const sideShade = hit.side === 1 ? 0.7 : 1.0;
        
        for (let y = drawStart; y <= drawEnd; y++) {
          const texY = Math.floor(((y - (GAME_HEIGHT - wallHeight) / 2) / wallHeight) * 64) % 64;
          const ti = (texY * 64 + texX) * 4;
          
          const pi = (y * GAME_WIDTH + x) * 4;
          data[pi] = texture.data[ti] * shade * sideShade;
          data[pi + 1] = texture.data[ti + 1] * shade * sideShade;
          data[pi + 2] = texture.data[ti + 2] * shade * sideShade;
          data[pi + 3] = 255;
        }
      } else {
        this.zBuffer[x] = MAX_DEPTH;
      }
    }
    
    // Render sprites (enemies and items)
    const sprites = this.collectSprites();
    sprites.sort((a, b) => b.distance - a.distance);
    
    for (const sprite of sprites) {
      this.renderSprite(sprite, data);
    }
    
    // Render projectiles
    this.renderProjectiles(data);
    
    // Put buffer to canvas
    this.ctx.putImageData(this.buffer, 0, 0);
    
    // Damage flash
    if (this.damageFlash > 0) {
      this.ctx.fillStyle = `rgba(255, 0, 0, ${this.damageFlash})`;
      this.ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    }
    
    // Pickup flash
    if (this.pickupFlash > 0) {
      this.ctx.fillStyle = `rgba(0, 255, 100, ${this.pickupFlash * 0.5})`;
      this.ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    }
    
    // Weapon view
    this.renderWeaponView();
    
    // Crosshair
    this.ctx.strokeStyle = '#00ff00';
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.moveTo(GAME_WIDTH / 2 - 4, GAME_HEIGHT / 2);
    this.ctx.lineTo(GAME_WIDTH / 2 + 4, GAME_HEIGHT / 2);
    this.ctx.moveTo(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 4);
    this.ctx.lineTo(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 4);
    this.ctx.stroke();
  }
  
  private collectSprites(): SpriteRender[] {
    const sprites: SpriteRender[] = [];
    
    // Enemies
    for (const enemy of this.enemies) {
      if (enemy.state === EnemyState.DEFEATED) continue;
      
      const dx = enemy.x - this.player.x;
      const dy = enemy.y - this.player.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist > MAX_DEPTH) continue;
      
      const angle = Math.atan2(dy, dx) - this.player.angle;
      let normAngle = angle;
      while (normAngle > Math.PI) normAngle -= Math.PI * 2;
      while (normAngle < -Math.PI) normAngle += Math.PI * 2;
      
      if (Math.abs(normAngle) > HALF_FOV + 0.3) continue;
      
      const spriteName = enemy.type.toString();
      const tex = this.textures.getSprite(spriteName);
      if (!tex) continue;
      
      sprites.push({
        x: enemy.x,
        y: enemy.y,
        distance: dist,
        texture: tex,
        width: tex.width,
        height: tex.height,
        type: 'enemy',
        id: enemy.id,
        health: enemy.health,
        maxHealth: enemy.maxHealth,
      });
    }
    
    // Items
    for (const item of this.items) {
      if (item.collected) continue;
      
      const dx = item.x - this.player.x;
      const dy = item.y - this.player.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist > MAX_DEPTH) continue;
      
      const angle = Math.atan2(dy, dx) - this.player.angle;
      let normAngle = angle;
      while (normAngle > Math.PI) normAngle -= Math.PI * 2;
      while (normAngle < -Math.PI) normAngle += Math.PI * 2;
      
      if (Math.abs(normAngle) > HALF_FOV + 0.3) continue;
      
      const tex = this.textures.getSprite(item.type);
      if (!tex) continue;
      
      sprites.push({
        x: item.x,
        y: item.y,
        distance: dist,
        texture: tex,
        width: tex.width,
        height: tex.height,
        type: 'item',
        id: item.id,
      });
    }
    
    return sprites;
  }
  
  private renderSprite(sprite: SpriteRender, data: Uint8ClampedArray): void {
    const dx = sprite.x - this.player.x;
    const dy = sprite.y - this.player.y;
    const angle = Math.atan2(dy, dx) - this.player.angle;
    
    let normAngle = angle;
    while (normAngle > Math.PI) normAngle -= Math.PI * 2;
    while (normAngle < -Math.PI) normAngle += Math.PI * 2;
    
    const screenX = Math.floor((0.5 + normAngle / FOV) * GAME_WIDTH);
    const spriteHeight = Math.floor(GAME_HEIGHT / sprite.distance);
    const spriteWidth = Math.floor(spriteHeight * (sprite.width / sprite.height));
    
    const drawStartY = Math.floor((GAME_HEIGHT - spriteHeight) / 2);
    const drawStartX = Math.floor(screenX - spriteWidth / 2);
    
    const shade = Math.max(0.2, 1 - sprite.distance * this.levelData.theme.fogDensity);
    
    const tex = sprite.texture;
    const tw = tex.width;
    const th = tex.height;
    
    for (let sx = 0; sx < spriteWidth; sx++) {
      const screenCol = drawStartX + sx;
      if (screenCol < 0 || screenCol >= GAME_WIDTH) continue;
      if (sprite.distance >= this.zBuffer[screenCol]) continue;
      
      const texX = Math.floor((sx / spriteWidth) * tw);
      
      for (let sy = 0; sy < spriteHeight; sy++) {
        const screenRow = drawStartY + sy;
        if (screenRow < 0 || screenRow >= GAME_HEIGHT) continue;
        
        const texY = Math.floor((sy / spriteHeight) * th);
        const ti = (texY * tw + texX) * 4;
        
        if (tex.data[ti + 3] < 128) continue;
        
        const pi = (screenRow * GAME_WIDTH + screenCol) * 4;
        data[pi] = tex.data[ti] * shade;
        data[pi + 1] = tex.data[ti + 1] * shade;
        data[pi + 2] = tex.data[ti + 2] * shade;
        data[pi + 3] = 255;
      }
    }
  }
  
  private renderProjectiles(data: Uint8ClampedArray): void {
    for (const proj of this.projectiles) {
      const dx = proj.x - this.player.x;
      const dy = proj.y - this.player.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx) - this.player.angle;
      
      let normAngle = angle;
      while (normAngle > Math.PI) normAngle -= Math.PI * 2;
      while (normAngle < -Math.PI) normAngle += Math.PI * 2;
      
      if (Math.abs(normAngle) > HALF_FOV) continue;
      
      const screenX = Math.floor((0.5 + normAngle / FOV) * GAME_WIDTH);
      const size = Math.max(1, Math.floor(4 / dist));
      
      const color = this.parseColor(proj.color);
      
      for (let sy = -size; sy <= size; sy++) {
        for (let sx = -size; sx <= size; sx++) {
          const px = screenX + sx;
          const py = Math.floor(GAME_HEIGHT / 2) + sy;
          if (px < 0 || px >= GAME_WIDTH || py < 0 || py >= GAME_HEIGHT) continue;
          if (dist >= this.zBuffer[px]) continue;
          
          const pi = (py * GAME_WIDTH + px) * 4;
          data[pi] = color.r;
          data[pi + 1] = color.g;
          data[pi + 2] = color.b;
          data[pi + 3] = 255;
        }
      }
    }
  }
  
  private renderWeaponView(): void {
    const weapon = WEAPONS[this.player.weapon];
    const bobY = this.weaponAnimTimer > 0 ? -5 : 0;
    const baseY = GAME_HEIGHT - 40 + bobY;
    const baseX = GAME_WIDTH / 2;
    
    this.ctx.fillStyle = '#333';
    this.ctx.fillRect(baseX - 8, baseY, 16, 30);
    this.ctx.fillStyle = weapon.color;
    this.ctx.fillRect(baseX - 3, baseY - 10, 6, 15);
    
    // Muzzle flash
    if (this.weaponAnimTimer > 0.1) {
      this.ctx.fillStyle = weapon.color;
      this.ctx.globalAlpha = this.weaponAnimTimer * 5;
      this.ctx.beginPath();
      this.ctx.arc(baseX, baseY - 15, 8, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.globalAlpha = 1;
    }
  }
  
  // === RADAR ===
  
  renderRadar(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
    const scale = size / 24;
    
    // Background
    ctx.fillStyle = '#001100';
    ctx.fillRect(x, y, size, size);
    ctx.strokeStyle = '#004400';
    ctx.strokeRect(x, y, size, size);
    
    // Grid
    ctx.strokeStyle = '#002200';
    ctx.lineWidth = 0.5;
    for (let i = 0; i < 24; i += 4) {
      ctx.beginPath();
      ctx.moveTo(x + i * scale, y);
      ctx.lineTo(x + i * scale, y + size);
      ctx.moveTo(x, y + i * scale);
      ctx.lineTo(x + size, y + i * scale);
      ctx.stroke();
    }
    
    // Walls
    ctx.fillStyle = '#003300';
    for (let my = 0; my < this.levelData.height; my++) {
      for (let mx = 0; mx < this.levelData.width; mx++) {
        if (this.map[my][mx] > 0) {
          ctx.fillRect(x + mx * scale, y + my * scale, scale, scale);
        }
      }
    }
    
    // Enemies
    for (const enemy of this.enemies) {
      if (enemy.state === EnemyState.DEFEATED) continue;
      ctx.fillStyle = '#ff0000';
      ctx.fillRect(x + enemy.x * scale - 1, y + enemy.y * scale - 1, 3, 3);
    }
    
    // Items
    for (const item of this.items) {
      if (item.collected) continue;
      ctx.fillStyle = '#ffff00';
      ctx.fillRect(x + item.x * scale - 1, y + item.y * scale - 1, 2, 2);
    }
    
    // Exit
    const exit = this.levelData.exit;
    ctx.fillStyle = '#00ff00';
    ctx.fillRect(x + exit.x * scale - 2, y + exit.y * scale - 2, 4, 4);
    
    // Player
    ctx.fillStyle = '#00ffff';
    const px = x + this.player.x * scale;
    const py = y + this.player.y * scale;
    ctx.beginPath();
    ctx.arc(px, py, 2, 0, Math.PI * 2);
    ctx.fill();
    
    // Direction indicator
    ctx.strokeStyle = '#00ffff';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px + Math.cos(this.player.angle) * 6, py + Math.sin(this.player.angle) * 6);
    ctx.stroke();
  }
  
  // === UTILITIES ===
  
  private parseColor(hex: string): { r: number; g: number; b: number } {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return { r, g, b };
  }
  
  getBuffer(): ImageData {
    return this.buffer;
  }
  
  getLevelName(): string {
    return this.levelData.name;
  }
  
  getLevelIndex(): number {
    return this.level;
  }
}
