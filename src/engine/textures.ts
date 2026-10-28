// Zero Sector — Procedural Texture Generator
import { GAME_WIDTH, GAME_HEIGHT } from './types';

const TEX_SIZE = 64;

export class TextureManager {
  private textures: ImageData[] = [];
  private spriteTextures: Map<string, ImageData> = new Map();
  
  constructor() {
    this.generateWallTextures();
    this.generateSpriteTextures();
  }
  
  private generateWallTextures(): void {
    // Texture 0: Metal panel (docking sector)
    this.textures.push(this.createMetalPanel());
    // Texture 1: Tech wall (security complex)
    this.textures.push(this.createTechWall());
    // Texture 2: Bio wall (laboratory)
    this.textures.push(this.createBioWall());
    // Texture 3: Door texture
    this.textures.push(this.createDoorTexture());
    // Texture 4: Exit texture
    this.textures.push(this.createExitTexture());
    // Texture 5: Dark metal
    this.textures.push(this.createDarkMetal());
  }
  
  private createMetalPanel(): ImageData {
    const data = new ImageData(TEX_SIZE, TEX_SIZE);
    for (let y = 0; y < TEX_SIZE; y++) {
      for (let x = 0; x < TEX_SIZE; x++) {
        const i = (y * TEX_SIZE + x) * 4;
        const panel = (x % 32 < 2 || y % 32 < 2) ? 1 : 0;
        const rivet = ((x % 32 === 4 || x % 32 === 28) && (y % 32 === 4 || y % 32 === 28)) ? 1 : 0;
        
        if (rivet) {
          data.data[i] = 180;
          data.data[i + 1] = 180;
          data.data[i + 2] = 200;
        } else if (panel) {
          data.data[i] = 60;
          data.data[i + 1] = 70;
          data.data[i + 2] = 80;
        } else {
          const noise = Math.random() * 20;
          data.data[i] = 100 + noise;
          data.data[i + 1] = 110 + noise;
          data.data[i + 2] = 130 + noise;
        }
        data.data[i + 3] = 255;
      }
    }
    return data;
  }
  
  private createTechWall(): ImageData {
    const data = new ImageData(TEX_SIZE, TEX_SIZE);
    for (let y = 0; y < TEX_SIZE; y++) {
      for (let x = 0; x < TEX_SIZE; x++) {
        const i = (y * TEX_SIZE + x) * 4;
        const stripe = (y % 16 < 2) ? 1 : 0;
        const light = (x > 20 && x < 44 && y > 20 && y < 44) ? 1 : 0;
        
        if (light && ((x + y) % 4 < 2)) {
          data.data[i] = 50;
          data.data[i + 1] = 200;
          data.data[i + 2] = 50;
        } else if (stripe) {
          data.data[i] = 40;
          data.data[i + 1] = 40;
          data.data[i + 2] = 50;
        } else {
          const noise = Math.random() * 15;
          data.data[i] = 70 + noise;
          data.data[i + 1] = 70 + noise;
          data.data[i + 2] = 90 + noise;
        }
        data.data[i + 3] = 255;
      }
    }
    return data;
  }
  
  private createBioWall(): ImageData {
    const data = new ImageData(TEX_SIZE, TEX_SIZE);
    for (let y = 0; y < TEX_SIZE; y++) {
      for (let x = 0; x < TEX_SIZE; x++) {
        const i = (y * TEX_SIZE + x) * 4;
        const vein = Math.sin(x * 0.3) * Math.cos(y * 0.3) > 0.5 ? 1 : 0;
        const noise = Math.random() * 10;
        
        if (vein) {
          data.data[i] = 80 + noise;
          data.data[i + 1] = 20;
          data.data[i + 2] = 40;
        } else {
          data.data[i] = 40 + noise;
          data.data[i + 1] = 50 + noise;
          data.data[i + 2] = 40 + noise;
        }
        data.data[i + 3] = 255;
      }
    }
    return data;
  }
  
  private createDoorTexture(): ImageData {
    const data = new ImageData(TEX_SIZE, TEX_SIZE);
    for (let y = 0; y < TEX_SIZE; y++) {
      for (let x = 0; x < TEX_SIZE; x++) {
        const i = (y * TEX_SIZE + x) * 4;
        const panel = (x % 16 < 1 || y % 32 < 1) ? 1 : 0;
        const light = (y > 28 && y < 36 && x > 28 && x < 36) ? 1 : 0;
        
        if (light) {
          data.data[i] = 255;
          data.data[i + 1] = 100;
          data.data[i + 2] = 0;
        } else if (panel) {
          data.data[i] = 30;
          data.data[i + 1] = 30;
          data.data[i + 2] = 40;
        } else {
          const noise = Math.random() * 10;
          data.data[i] = 80 + noise;
          data.data[i + 1] = 80 + noise;
          data.data[i + 2] = 100 + noise;
        }
        data.data[i + 3] = 255;
      }
    }
    return data;
  }
  
  private createExitTexture(): ImageData {
    const data = new ImageData(TEX_SIZE, TEX_SIZE);
    for (let y = 0; y < TEX_SIZE; y++) {
      for (let x = 0; x < TEX_SIZE; x++) {
        const i = (y * TEX_SIZE + x) * 4;
        const arrow = (x > 20 && x < 44 && y > 16 && y < 48 && 
                      ((y > 16 && y < 24 && x > 28 && x < 36) ||
                       (y > 24 && y < 32 && x > 24 && x < 40) ||
                       (y > 32 && y < 40 && x > 20 && x < 44)));
        
        if (arrow) {
          data.data[i] = 0;
          data.data[i + 1] = 255;
          data.data[i + 2] = 100;
        } else {
          const pulse = Math.sin((x + y) * 0.2) * 20;
          data.data[i] = 20 + pulse;
          data.data[i + 1] = 60 + pulse;
          data.data[i + 2] = 40 + pulse;
        }
        data.data[i + 3] = 255;
      }
    }
    return data;
  }
  
  private createDarkMetal(): ImageData {
    const data = new ImageData(TEX_SIZE, TEX_SIZE);
    for (let y = 0; y < TEX_SIZE; y++) {
      for (let x = 0; x < TEX_SIZE; x++) {
        const i = (y * TEX_SIZE + x) * 4;
        const scratch = Math.random() < 0.02 ? 40 : 0;
        const noise = Math.random() * 15;
        data.data[i] = 50 + noise + scratch;
        data.data[i + 1] = 50 + noise + scratch;
        data.data[i + 2] = 60 + noise + scratch;
        data.data[i + 3] = 255;
      }
    }
    return data;
  }
  
  private generateSpriteTextures(): void {
    // Enemy sprites
    this.spriteTextures.set('drone', this.createDroneSprite());
    this.spriteTextures.set('guard', this.createGuardSprite());
    this.spriteTextures.set('mutant', this.createMutantSprite());
    this.spriteTextures.set('turret', this.createTurretSprite());
    
    // Item sprites
    this.spriteTextures.set('health', this.createHealthSprite());
    this.spriteTextures.set('armor', this.createArmorSprite());
    this.spriteTextures.set('ammo', this.createAmmoSprite());
    this.spriteTextures.set('key', this.createKeySprite());
  }
  
  private createDroneSprite(): ImageData {
    const data = new ImageData(32, 32);
    for (let y = 0; y < 32; y++) {
      for (let x = 0; x < 32; x++) {
        const i = (y * 32 + x) * 4;
        const cx = x - 16, cy = y - 16;
        const dist = Math.sqrt(cx * cx + cy * cy);
        
        if (dist < 12) {
          data.data[i] = 200;
          data.data[i + 1] = 50;
          data.data[i + 2] = 50;
          data.data[i + 3] = 255;
        } else if (dist < 14) {
          data.data[i] = 100;
          data.data[i + 1] = 20;
          data.data[i + 2] = 20;
          data.data[i + 3] = 255;
        }
      }
    }
    return data;
  }
  
  private createGuardSprite(): ImageData {
    const data = new ImageData(32, 48);
    for (let y = 0; y < 48; y++) {
      for (let x = 0; x < 32; x++) {
        const i = (y * 32 + x) * 4;
        // Body
        if (x > 10 && x < 22 && y > 16 && y < 40) {
          data.data[i] = 60;
          data.data[i + 1] = 80;
          data.data[i + 2] = 60;
          data.data[i + 3] = 255;
        }
        // Head
        if (x > 12 && x < 20 && y > 6 && y < 16) {
          data.data[i] = 180;
          data.data[i + 1] = 150;
          data.data[i + 2] = 120;
          data.data[i + 3] = 255;
        }
        // Visor
        if (x > 13 && x < 19 && y > 9 && y < 13) {
          data.data[i] = 0;
          data.data[i + 1] = 200;
          data.data[i + 2] = 255;
          data.data[i + 3] = 255;
        }
      }
    }
    return data;
  }
  
  private createMutantSprite(): ImageData {
    const data = new ImageData(40, 48);
    for (let y = 0; y < 48; y++) {
      for (let x = 0; x < 40; x++) {
        const i = (y * 40 + x) * 4;
        const cx = x - 20, cy = y - 24;
        const dist = Math.sqrt(cx * cx + cy * cy);
        
        if (dist < 18) {
          const pulse = Math.sin(dist * 0.5) * 30;
          data.data[i] = 100 + pulse;
          data.data[i + 1] = 20;
          data.data[i + 2] = 80 + pulse;
          data.data[i + 3] = 255;
        }
        // Eyes
        if ((x === 15 || x === 25) && y === 20) {
          data.data[i] = 255;
          data.data[i + 1] = 255;
          data.data[i + 2] = 0;
          data.data[i + 3] = 255;
        }
      }
    }
    return data;
  }
  
  private createTurretSprite(): ImageData {
    const data = new ImageData(32, 32);
    for (let y = 0; y < 32; y++) {
      for (let x = 0; x < 32; x++) {
        const i = (y * 32 + x) * 4;
        // Base
        if (y > 20 && x > 8 && x < 24) {
          data.data[i] = 80;
          data.data[i + 1] = 80;
          data.data[i + 2] = 90;
          data.data[i + 3] = 255;
        }
        // Barrel
        if (y > 10 && y < 22 && x > 14 && x < 18) {
          data.data[i] = 60;
          data.data[i + 1] = 60;
          data.data[i + 2] = 70;
          data.data[i + 3] = 255;
        }
        // Light
        if (x > 14 && x < 18 && y > 8 && y < 12) {
          data.data[i] = 255;
          data.data[i + 1] = 0;
          data.data[i + 2] = 0;
          data.data[i + 3] = 255;
        }
      }
    }
    return data;
  }
  
  private createHealthSprite(): ImageData {
    const data = new ImageData(24, 24);
    for (let y = 0; y < 24; y++) {
      for (let x = 0; x < 24; x++) {
        const i = (y * 24 + x) * 4;
        // Cross
        const isCross = (x > 9 && x < 15) || (y > 9 && y < 15);
        if (isCross && x > 4 && x < 20 && y > 4 && y < 20) {
          data.data[i] = 255;
          data.data[i + 1] = 50;
          data.data[i + 2] = 50;
          data.data[i + 3] = 255;
        }
      }
    }
    return data;
  }
  
  private createArmorSprite(): ImageData {
    const data = new ImageData(24, 24);
    for (let y = 0; y < 24; y++) {
      for (let x = 0; x < 24; x++) {
        const i = (y * 24 + x) * 4;
        const cx = x - 12, cy = y - 12;
        const dist = Math.sqrt(cx * cx + cy * cy);
        if (dist < 10 && dist > 6) {
          data.data[i] = 50;
          data.data[i + 1] = 100;
          data.data[i + 2] = 255;
          data.data[i + 3] = 255;
        }
      }
    }
    return data;
  }
  
  private createAmmoSprite(): ImageData {
    const data = new ImageData(24, 24);
    for (let y = 0; y < 24; y++) {
      for (let x = 0; x < 24; x++) {
        const i = (y * 24 + x) * 4;
        if (x > 8 && x < 16 && y > 4 && y < 20) {
          data.data[i] = 255;
          data.data[i + 1] = 200;
          data.data[i + 2] = 0;
          data.data[i + 3] = 255;
        }
      }
    }
    return data;
  }
  
  private createKeySprite(): ImageData {
    const data = new ImageData(24, 24);
    for (let y = 0; y < 24; y++) {
      for (let x = 0; x < 24; x++) {
        const i = (y * 24 + x) * 4;
        // Key head
        const cx = x - 8, cy = y - 8;
        if (Math.sqrt(cx * cx + cy * cy) < 5 && Math.sqrt(cx * cx + cy * cy) > 2) {
          data.data[i] = 255;
          data.data[i + 1] = 215;
          data.data[i + 2] = 0;
          data.data[i + 3] = 255;
        }
        // Key shaft
        if (x > 12 && x < 20 && y > 7 && y < 10) {
          data.data[i] = 255;
          data.data[i + 1] = 215;
          data.data[i + 2] = 0;
          data.data[i + 3] = 255;
        }
      }
    }
    return data;
  }
  
  getTexture(index: number): ImageData {
    return this.textures[index % this.textures.length];
  }
  
  getSprite(name: string): ImageData | undefined {
    return this.spriteTextures.get(name);
  }
  
  getTextureCount(): number {
    return this.textures.length;
  }
}
