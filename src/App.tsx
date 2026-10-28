// Zero Sector — Main Application Component
import { useEffect, useRef, useState, useCallback } from 'react';
import { Game } from './engine/game';
import type { GameScreen } from './engine/game';
import { CHARACTERS } from './data/characters';
import { WEAPONS } from './data/weapons';

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const radarRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<Game | null>(null);
  const animFrameRef = useRef<number>(0);
  const screenRef = useRef<GameScreen>('menu');
  
  const [screen, setScreen] = useState<GameScreen>('menu');
  const [health, setHealth] = useState(100);
  const [maxHealth, setMaxHealth] = useState(100);
  const [armor, setArmor] = useState(0);
  const [weapon, setWeapon] = useState(0);
  const [enemiesLeft, setEnemiesLeft] = useState(0);
  const [message, setMessage] = useState('');
  const [fps, setFps] = useState(60);
  const [level, setLevel] = useState(0);
  const [ammo, setAmmo] = useState<Record<string, number>>({});
  const [selectedChar, setSelectedChar] = useState(0);
  const [availableChars, setAvailableChars] = useState<number[]>([0, 1, 2, 3, 4]);
  const [hasSave, setHasSave] = useState(false);
  const [campaignStarted, setCampaignStarted] = useState(false);
  const [initialized, setInitialized] = useState(false);
  
  const updateUI = useCallback(() => {
    if (!gameRef.current) return;
    const state = gameRef.current.getState();
    screenRef.current = state.screen;
    setScreen(state.screen);
    setHealth(state.player.health);
    setMaxHealth(state.player.maxHealth);
    setArmor(state.player.armor);
    setWeapon(state.player.weapon);
    setEnemiesLeft(state.enemiesRemaining);
    setMessage(state.message);
    setFps(state.fps);
    setLevel(state.level);
    setAmmo({ ...state.ammo });
    setSelectedChar(state.selectedCharacter);
    setAvailableChars([...state.availableCharacters]);
    setHasSave(gameRef.current.hasSave());
    setCampaignStarted(state.campaignStarted);
  }, []);
  
  // Initialize game once
  useEffect(() => {
    if (!canvasRef.current || gameRef.current) return;
    
    try {
      const canvas = canvasRef.current;
      const game = new Game(canvas);
      gameRef.current = game;
      game.setStateChangeCallback(updateUI);
      setHasSave(game.hasSave());
      setInitialized(true);
      console.log('Game initialized successfully');
    } catch (e) {
      console.error('Failed to initialize game:', e);
    }
  }, [updateUI]);
  
  // Game loop
  useEffect(() => {
    if (!initialized || !gameRef.current) return;
    
    const game = gameRef.current;
    let lastUIUpdate = 0;
    
    const gameLoop = (timestamp: number) => {
      try {
        game.update(timestamp);
      } catch (e) {
        console.error('Game loop error:', e);
      }
      
      // Update UI at ~10fps
      if (timestamp - lastUIUpdate > 100) {
        updateUI();
        lastUIUpdate = timestamp;
      }
      
      // Render radar
      if (radarRef.current && screenRef.current === 'playing') {
        const rctx = radarRef.current.getContext('2d');
        if (rctx) {
          rctx.clearRect(0, 0, 120, 120);
          game.renderRadar(rctx, 0, 0, 120);
        }
      }
      
      animFrameRef.current = requestAnimationFrame(gameLoop);
    };
    
    animFrameRef.current = requestAnimationFrame(gameLoop);
    
    return () => {
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [initialized, updateUI]);
  
  const startGame = (charIndex: number) => {
    gameRef.current?.startGame(charIndex);
  };
  
  const continueWithChar = (charIndex: number) => {
    gameRef.current?.continueGame(charIndex);
  };
  
  const loadGame = () => {
    gameRef.current?.loadGame();
  };
  
  const nextLevel = () => {
    gameRef.current?.nextLevel();
  };
  
  const resumeGame = () => {
    gameRef.current?.resumeGame();
  };
  
  const saveGame = () => {
    gameRef.current?.saveGame();
  };
  
  const returnToMenu = () => {
    gameRef.current?.returnToMenu();
    setCampaignStarted(false);
  };
  
  const switchWeapon = (idx: number) => {
    gameRef.current?.switchWeapon(idx);
  };
  
  const currentWeapon = WEAPONS[weapon];
  const currentChar = CHARACTERS[selectedChar];
  const showGameUI = screen === 'playing' || screen === 'paused';
  
  return (
    <div className="w-screen h-screen bg-black flex items-center justify-center overflow-hidden select-none relative"
         style={{ fontFamily: '"Courier New", monospace' }}>
      
      {/* Game Canvas — ALWAYS visible, renders behind menus */}
      <div className="flex items-center justify-center" style={{ opacity: showGameUI ? 1 : 0, pointerEvents: showGameUI ? 'auto' : 'none' }}>
        {/* Left panel */}
        <div className="hidden md:flex flex-col items-center gap-2 p-2 w-32"
             style={{ background: '#050505', borderRight: '1px solid #002200', minHeight: '448px' }}>
          <div className="w-16 h-16 rounded-full border-2 flex items-center justify-center text-2xl"
               style={{ borderColor: currentChar?.color, color: currentChar?.color }}>
            {currentChar?.name[0] || '?'}
          </div>
          <div className="text-xs text-center" style={{ color: currentChar?.color }}>
            {currentChar?.name}
          </div>
          <div className="w-full mt-2">
            <div className="text-xs mb-1" style={{ color: '#666' }}>HEALTH</div>
            <div className="w-full h-3 bg-gray-900 border border-gray-700">
              <div className="h-full transition-all" 
                   style={{ 
                     width: `${maxHealth > 0 ? (health / maxHealth) * 100 : 0}%`,
                     backgroundColor: health > 60 ? '#00ff44' : health > 30 ? '#ffaa00' : '#ff0000'
                   }} />
            </div>
            <div className="text-xs mt-2 mb-1" style={{ color: '#666' }}>ARMOR</div>
            <div className="w-full h-3 bg-gray-900 border border-gray-700">
              <div className="h-full bg-blue-500 transition-all" 
                   style={{ width: `${armor}%` }} />
            </div>
          </div>
        </div>
        
        {/* Canvas + HUD */}
        <div className="flex flex-col">
          <div className="flex items-center justify-between px-4 py-2"
               style={{ background: '#0a0a0a', borderBottom: '1px solid #003300' }}>
            <div className="flex items-center gap-4">
              <div className="text-xs" style={{ color: '#00ff88' }}>
                <span className="opacity-60">LVL</span> {level + 1}
              </div>
              <div className="text-xs" style={{ color: '#00aaff' }}>
                {gameRef.current?.getLevelName()}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-xs" style={{ color: '#ff4444' }}>
                HOSTILES: {enemiesLeft}
              </div>
              <div className="text-xs" style={{ color: '#666' }}>
                FPS: {fps}
              </div>
            </div>
          </div>
          
          <div className="relative">
            <canvas 
              ref={canvasRef}
              className="border-2 cursor-crosshair block"
              style={{ 
                borderColor: '#003300',
                imageRendering: 'pixelated',
                width: '640px',
                height: '448px',
              }}
            />
            {message && screen === 'playing' && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-1 text-xs font-bold whitespace-nowrap"
                   style={{ background: 'rgba(0,0,0,0.8)', color: '#00ff88', border: '1px solid #004400' }}>
                {message}
              </div>
            )}
          </div>
          
          <div className="flex items-center justify-between px-4 py-2"
               style={{ background: '#0a0a0a', borderTop: '1px solid #003300' }}>
            <div className="flex gap-2">
              {WEAPONS.map((w, idx) => (
                <button
                  key={w.id}
                  onClick={() => switchWeapon(idx)}
                  className={`px-2 py-1 text-xs border transition-colors cursor-pointer ${
                    idx === weapon ? 'opacity-100' : 'opacity-40'
                  }`}
                  style={{ borderColor: idx === weapon ? w.color : '#333', color: w.color }}
                >
                  {idx + 1}
                </button>
              ))}
            </div>
            <div className="hidden sm:flex gap-4 text-xs" style={{ color: '#666' }}>
              <span>PULSE:{ammo.energy || 0}</span>
              <span>PLASMA:{ammo.plasma || 0}</span>
              <span>ION:{ammo.ion || 0}</span>
              <span>SHELLS:{ammo.shells || 0}</span>
            </div>
          </div>
        </div>
        
        {/* Right panel - Radar */}
        <div className="hidden md:flex flex-col items-center gap-2 p-2 w-32"
             style={{ background: '#050505', borderLeft: '1px solid #002200', minHeight: '448px' }}>
          <div className="text-xs mb-1" style={{ color: '#004400' }}>TACTICAL MAP</div>
          <canvas 
            ref={radarRef}
            width={120}
            height={120}
            className="border"
            style={{ borderColor: '#003300', imageRendering: 'pixelated' }}
          />
          <div className="w-full mt-2">
            <div className="text-xs mb-1" style={{ color: '#666' }}>WEAPON</div>
            <div className="text-xs font-bold" style={{ color: currentWeapon?.color }}>
              {currentWeapon?.name}
            </div>
            <div className="text-xs mt-1" style={{ color: '#888' }}>
              {currentWeapon?.ammoPerShot === 0 ? '∞' : `${ammo[currentWeapon?.ammoType] || 0}`}
            </div>
          </div>
        </div>
      </div>
      
      {/* Menu overlays — positioned on top of canvas */}
      {screen === 'menu' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black z-10">
          <div className="flex flex-col items-center gap-6">
            <h1 className="text-4xl font-bold tracking-widest" style={{ color: '#00ff88', textShadow: '0 0 10px #00ff88' }}>
              ZERO SECTOR
            </h1>
            <p className="text-sm" style={{ color: '#00aa66' }}>RETRO TACTICAL FPS</p>
            <div className="flex flex-col gap-3 mt-8">
              <button 
                onClick={() => gameRef.current?.showCharSelect()}
                className="px-8 py-3 border-2 text-sm tracking-wider hover:bg-green-900/30 transition-colors cursor-pointer"
                style={{ borderColor: '#00ff88', color: '#00ff88' }}
              >
                NEW CAMPAIGN
              </button>
              {hasSave && (
                <button 
                  onClick={loadGame}
                  className="px-8 py-3 border-2 text-sm tracking-wider hover:bg-blue-900/30 transition-colors cursor-pointer"
                  style={{ borderColor: '#00aaff', color: '#00aaff' }}
                >
                  LOAD GAME
                </button>
              )}
            </div>
            <div className="mt-12 text-xs text-center" style={{ color: '#005533' }}>
              <p>WASD — Move | Mouse — Look | Click — Fire</p>
              <p>1-5 — Weapons | F/Q — Cycle | ESC — Pause</p>
            </div>
          </div>
        </div>
      )}
      
      {screen === 'charselect' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black z-10">
          <div className="flex flex-col items-center gap-4">
            <h2 className="text-xl font-bold" style={{ color: '#00ff88' }}>SELECT OPERATIVE</h2>
            <div className="grid grid-cols-1 gap-3 max-w-md w-full px-4">
              {CHARACTERS.map((char, idx) => {
                const available = availableChars.includes(idx);
                return (
                  <button
                    key={char.id}
                    disabled={!available}
                    onClick={() => {
                      if (!campaignStarted) {
                        startGame(idx);
                      } else {
                        continueWithChar(idx);
                      }
                    }}
                    className={`p-3 border text-left transition-colors ${
                      available ? 'hover:bg-green-900/30 cursor-pointer' : 'opacity-30 cursor-not-allowed'
                    }`}
                    style={{ borderColor: available ? char.color : '#333', color: available ? char.color : '#555' }}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-bold">{char.name}</span>
                      <span className="text-xs">{char.specialty}</span>
                    </div>
                    <div className="text-xs mt-1 opacity-70">
                      HP: {char.health} | SPD: {char.speed.toFixed(1)} | {char.ability}
                    </div>
                  </button>
                );
              })}
            </div>
            {campaignStarted && (
              <button onClick={returnToMenu} className="mt-4 text-sm cursor-pointer" style={{ color: '#ff4444' }}>
                ABANDON MISSION
              </button>
            )}
          </div>
        </div>
      )}
      
      {screen === 'paused' && (
        <div className="absolute inset-0 flex items-center justify-center z-20" style={{ background: 'rgba(0,0,0,0.85)' }}>
          <div className="flex flex-col items-center gap-4">
            <h2 className="text-2xl font-bold" style={{ color: '#00ff88' }}>PAUSED</h2>
            <div className="flex flex-col gap-3">
              <button onClick={resumeGame}
                className="px-8 py-3 border-2 text-sm tracking-wider hover:bg-green-900/30 cursor-pointer"
                style={{ borderColor: '#00ff88', color: '#00ff88' }}>
                RESUME
              </button>
              <button onClick={saveGame}
                className="px-8 py-3 border-2 text-sm tracking-wider hover:bg-blue-900/30 cursor-pointer"
                style={{ borderColor: '#00aaff', color: '#00aaff' }}>
                SAVE GAME
              </button>
              <button onClick={returnToMenu}
                className="px-8 py-3 border-2 text-sm tracking-wider hover:bg-red-900/30 cursor-pointer"
                style={{ borderColor: '#ff4444', color: '#ff4444' }}>
                QUIT TO MENU
              </button>
            </div>
          </div>
        </div>
      )}
      
      {screen === 'levelcomplete' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black z-10">
          <div className="flex flex-col items-center gap-4">
            <h2 className="text-2xl font-bold" style={{ color: '#00ff88' }}>SECTOR CLEARED</h2>
            <p className="text-sm" style={{ color: '#00aa66' }}>
              {gameRef.current?.getLevelName()} — COMPLETE
            </p>
            <div className="text-sm mt-2" style={{ color: '#888' }}>
              Health: {health}/{maxHealth} | Armor: {armor}
            </div>
            <button onClick={nextLevel}
              className="mt-4 px-8 py-3 border-2 text-sm tracking-wider hover:bg-green-900/30 cursor-pointer"
              style={{ borderColor: '#00ff88', color: '#00ff88' }}>
              {level + 1 >= 3 ? 'COMPLETE MISSION' : 'NEXT SECTOR'}
            </button>
          </div>
        </div>
      )}
      
      {screen === 'gameover' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black z-10">
          <div className="flex flex-col items-center gap-4">
            <h2 className="text-2xl font-bold" style={{ color: '#ff4444' }}>MISSION FAILED</h2>
            <p className="text-sm" style={{ color: '#aa4444' }}>
              All operatives have been lost.
            </p>
            <button onClick={returnToMenu}
              className="mt-4 px-8 py-3 border-2 text-sm tracking-wider hover:bg-red-900/30 cursor-pointer"
              style={{ borderColor: '#ff4444', color: '#ff4444' }}>
              RETURN TO BASE
            </button>
          </div>
        </div>
      )}
      
      {screen === 'victory' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black z-10">
          <div className="flex flex-col items-center gap-4">
            <h2 className="text-3xl font-bold" style={{ color: '#00ff88', textShadow: '0 0 10px #00ff88' }}>
              CAMPAIGN COMPLETE
            </h2>
            <p className="text-sm" style={{ color: '#00aa66' }}>
              All sectors have been cleared. The station is secure.
            </p>
            <div className="text-xs mt-2" style={{ color: '#666' }}>
              Operatives survived: {availableChars.length}/5
            </div>
            <button onClick={returnToMenu}
              className="mt-4 px-8 py-3 border-2 text-sm tracking-wider hover:bg-green-900/30 cursor-pointer"
              style={{ borderColor: '#00ff88', color: '#00ff88' }}>
              RETURN TO BASE
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
