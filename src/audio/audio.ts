// Zero Sector — Audio System (Web Audio API)

export class AudioSystem {
  private ctx: AudioContext | null = null;
  private enabled: boolean = true;
  private volume: number = 0.3;
  
  init(): void {
    try {
      this.ctx = new AudioContext();
    } catch (e) {
      this.enabled = false;
    }
  }
  
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }
  
  setVolume(vol: number): void {
    this.volume = Math.max(0, Math.min(1, vol));
  }
  
  private playTone(freq: number, duration: number, type: OscillatorType = 'square', vol: number = 1): void {
    if (!this.ctx || !this.enabled) return;
    
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.value = vol * this.volume;
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      
      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {
      // Silently fail
    }
  }
  
  private playNoise(duration: number, vol: number = 1): void {
    if (!this.ctx || !this.enabled) return;
    
    try {
      const bufferSize = this.ctx.sampleRate * duration;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
      }
      
      const source = this.ctx.createBufferSource();
      const gain = this.ctx.createGain();
      
      source.buffer = buffer;
      gain.gain.value = vol * this.volume;
      
      source.connect(gain);
      gain.connect(this.ctx.destination);
      
      source.start();
    } catch (e) {
      // Silently fail
    }
  }
  
  // Sound effects
  playShoot(weaponType: string): void {
    switch (weaponType) {
      case 'pulse':
        this.playTone(880, 0.1, 'square', 0.5);
        this.playTone(440, 0.05, 'sawtooth', 0.3);
        break;
      case 'plasma':
        this.playTone(220, 0.15, 'sawtooth', 0.6);
        this.playNoise(0.08, 0.3);
        break;
      case 'ion':
        this.playTone(110, 0.3, 'sawtooth', 0.8);
        this.playTone(330, 0.2, 'square', 0.4);
        break;
      case 'scatter':
        this.playNoise(0.15, 0.7);
        this.playTone(150, 0.1, 'square', 0.4);
        break;
      case 'blade':
        this.playTone(660, 0.08, 'triangle', 0.5);
        this.playTone(990, 0.05, 'sine', 0.3);
        break;
    }
  }
  
  playHit(): void {
    this.playNoise(0.1, 0.4);
    this.playTone(200, 0.1, 'square', 0.3);
  }
  
  playEnemyDeath(): void {
    this.playTone(400, 0.1, 'square', 0.4);
    this.playTone(200, 0.2, 'sawtooth', 0.3);
    this.playNoise(0.15, 0.3);
  }
  
  playPlayerDamage(): void {
    this.playNoise(0.2, 0.5);
    this.playTone(100, 0.15, 'square', 0.4);
  }
  
  playPickup(): void {
    this.playTone(523, 0.08, 'sine', 0.4);
    this.playTone(659, 0.08, 'sine', 0.3);
    setTimeout(() => this.playTone(784, 0.1, 'sine', 0.3), 80);
  }
  
  playDoor(): void {
    this.playTone(80, 0.3, 'sawtooth', 0.3);
    this.playNoise(0.2, 0.2);
  }
  
  playMenuSelect(): void {
    this.playTone(440, 0.05, 'square', 0.2);
  }
  
  playMenuConfirm(): void {
    this.playTone(523, 0.08, 'square', 0.3);
    setTimeout(() => this.playTone(784, 0.1, 'square', 0.3), 100);
  }
  
  playAlert(): void {
    this.playTone(800, 0.1, 'square', 0.3);
    setTimeout(() => this.playTone(600, 0.1, 'square', 0.3), 150);
  }
  
  playLevelComplete(): void {
    const notes = [523, 659, 784, 1047];
    notes.forEach((freq, i) => {
      setTimeout(() => this.playTone(freq, 0.2, 'square', 0.3), i * 150);
    });
  }
  
  resume(): void {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }
}

// Singleton
export const audioSystem = new AudioSystem();
