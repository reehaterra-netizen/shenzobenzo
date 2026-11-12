/**
 * Reeha: AI Arena Massacre - Cyberpunk Top-Down Arcade Combat
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { 
  Shield, 
  Zap, 
  Crosshair, 
  Volume2, 
  VolumeX, 
  RotateCcw, 
  Flame, 
  Satellite, 
  HelpCircle, 
  Trophy, 
  Download, 
  ChevronRight,
  Radio,
  Sparkles
} from 'lucide-react';
import { GameEngine, WEAPON_CONFIGS } from './game/engine';
import { GameState, WeaponType } from './game/types';
import { soundEngine } from './game/audio';
import { downloadStandaloneHtmlFile } from './game/standaloneGenerator';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);

  // React state for HUD mirroring
  const [gameState, setGameState] = useState<GameState>('TITLE');
  const [health, setHealth] = useState(100);
  const [maxHealth, setMaxHealth] = useState(100);
  const [shield, setShield] = useState(50);
  const [maxShield, setMaxShield] = useState(50);
  const [stamina, setStamina] = useState(100);
  const [activeWeapon, setActiveWeapon] = useState<WeaponType>('SMG');
  const [currentAmmo, setCurrentAmmo] = useState(60);
  const [maxAmmo, setMaxAmmo] = useState(60);
  const [isReloading, setIsReloading] = useState(false);
  const [reloadProgress, setReloadProgress] = useState(0);
  const [isBerserk, setIsBerserk] = useState(false);
  const [berserkTimer, setBerserkTimer] = useState(0);
  const [orbitalStrikes, setOrbitalStrikes] = useState(1);
  const [wave, setWave] = useState(1);
  const [waveState, setWaveState] = useState<'SPAWNING' | 'FIGHTING' | 'INTERMISSION'>('INTERMISSION');
  const [enemyCount, setEnemyCount] = useState(0);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [comboTimer, setComboTimer] = useState(0);
  const [kills, setKills] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [showIntelModal, setShowIntelModal] = useState(false);
  const [highScore, setHighScore] = useState({ score: 0, kills: 0, maxCombo: 0, highestWave: 1 });

  // Boss info
  const [bossActive, setBossActive] = useState(false);
  const [bossName, setBossName] = useState('');
  const [bossHp, setBossHp] = useState(0);
  const [bossMaxHp, setBossMaxHp] = useState(1);
  const [bossShield, setBossShield] = useState(0);
  const [bossMaxShield, setBossMaxShield] = useState(1);

  // Virtual touch controls for mobile
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  // Initialize Canvas & Engine
  useEffect(() => {
    if (!canvasRef.current) return;
    const engine = new GameEngine(canvasRef.current);
    engineRef.current = engine;

    // Detect touch
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
      setIsTouchDevice(true);
    }

    // Connect Engine State Sync
    engine.onStateChange = (state) => {
      setGameState(state);
    };

    engine.onStatsUpdate = () => {
      setHealth(engine.player.health);
      setMaxHealth(engine.player.maxHealth);
      setShield(engine.player.shield);
      setMaxShield(engine.player.maxShield);
      setStamina(engine.player.stamina);
      setActiveWeapon(engine.player.activeWeapon);

      const wState = engine.player.weaponStates[engine.player.activeWeapon];
      setCurrentAmmo(wState.currentAmmo);
      setMaxAmmo(wState.maxAmmo);
      setIsReloading(wState.isReloading);
      setReloadProgress(wState.reloadProgress);

      setIsBerserk(engine.player.isBerserk);
      setBerserkTimer(engine.player.berserkTimer);
      setOrbitalStrikes(engine.player.orbitalStrikesAvailable);

      setWave(engine.wave);
      setWaveState(engine.waveState);
      setEnemyCount(engine.enemies.length);
      setScore(engine.stats.score);
      setCombo(engine.stats.currentCombo);
      setComboTimer(engine.stats.comboTimer);
      setKills(engine.stats.kills);
      setHighScore(engine.highScore);

      if (engine.bossActive && engine.currentBoss) {
        setBossActive(true);
        setBossName(engine.currentBoss.bossTitle || 'WAR MECH');
        setBossHp(Math.max(0, engine.currentBoss.health));
        setBossMaxHp(engine.currentBoss.maxHealth);
        setBossShield(engine.currentBoss.shield || 0);
        setBossMaxShield(engine.currentBoss.maxShield || 1);
      } else {
        setBossActive(false);
      }
    };

    engine.start();

    return () => {
      engine.destroy();
    };
  }, []);

  const handleStartGame = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.startNewGame();
    }
  }, []);

  const handleToggleMute = useCallback(() => {
    const muted = soundEngine.toggleMute();
    setIsMuted(muted);
  }, []);

  const handleWeaponSelect = useCallback((type: WeaponType) => {
    if (engineRef.current) {
      engineRef.current.switchWeapon(type);
    }
  }, []);

  const handleDash = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.triggerDash();
    }
  }, []);

  const handleOrbital = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.triggerOrbitalStrike();
    }
  }, []);

  // Combo Rank Formula
  const getComboRank = (c: number) => {
    if (c >= 30) return { rank: 'SSS', title: 'MASSACRE', color: 'text-rose-500' };
    if (c >= 20) return { rank: 'S', title: 'APOCALYPTIC', color: 'text-amber-400' };
    if (c >= 15) return { rank: 'A', title: 'RELENTLESS', color: 'text-emerald-400' };
    if (c >= 10) return { rank: 'B', title: 'VICIOUS', color: 'text-cyan-400' };
    if (c >= 5) return { rank: 'C', title: 'RUTHLESS', color: 'text-blue-400' };
    return { rank: 'D', title: 'COMBAT', color: 'text-slate-400' };
  };

  const comboInfo = getComboRank(combo);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black select-none font-sans text-slate-100">
      {/* Background Main Game Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full cursor-crosshair z-0"
      />

      {/* Cyber Scanline Overlay */}
      <div className="absolute inset-0 cyber-scanlines pointer-events-none z-10" />

      {/* HUD OVERLAY (Active during PLAYING) */}
      {gameState === 'PLAYING' && (
        <div className="absolute inset-0 pointer-events-none z-20 flex flex-col justify-between p-4 md:p-6 font-cyber">
          {/* Top Bar: Player Vital Signs (Left), Boss/Wave Tracker (Center), Score/Combo (Right) */}
          <div className="flex items-start justify-between gap-4">
            
            {/* Left: Reeha Vital Signs */}
            <div className="pointer-events-auto bg-slate-950/80 backdrop-blur-md border border-cyan-500/30 rounded-lg p-3 min-w-[220px] md:min-w-[260px] shadow-lg shadow-cyan-950/40">
              <div className="flex items-center justify-between text-xs tracking-wider text-slate-400 mb-1">
                <span className="font-bold flex items-center gap-1.5 text-cyan-400">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                  REEHA // CYBERNETIC MK-IV
                </span>
                <span className="font-mono-numbers text-slate-300">
                  KILLS: {kills}
                </span>
              </div>

              {/* Health Bar */}
              <div className="mb-2">
                <div className="flex justify-between text-xs font-semibold mb-0.5">
                  <span className="text-emerald-400 flex items-center gap-1">
                    <Crosshair className="w-3 h-3" /> HP
                  </span>
                  <span className="font-mono-numbers text-emerald-300">
                    {Math.round(health)} / {maxHealth}
                  </span>
                </div>
                <div className="h-2.5 w-full bg-slate-900 rounded overflow-hidden border border-emerald-500/20">
                  <div 
                    className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all duration-150"
                    style={{ width: `${Math.max(0, (health / maxHealth) * 100)}%` }}
                  />
                </div>
              </div>

              {/* Energy Shield Bar */}
              <div className="mb-2">
                <div className="flex justify-between text-xs font-semibold mb-0.5">
                  <span className="text-cyan-400 flex items-center gap-1">
                    <Shield className="w-3 h-3" /> SHIELD
                  </span>
                  <span className="font-mono-numbers text-cyan-300">
                    {Math.round(shield)} / {maxShield}
                  </span>
                </div>
                <div className="h-2 w-full bg-slate-900 rounded overflow-hidden border border-cyan-500/20">
                  <div 
                    className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400 transition-all duration-150"
                    style={{ width: `${Math.max(0, (shield / maxShield) * 100)}%` }}
                  />
                </div>
              </div>

              {/* Stamina / Dash Booster */}
              <div>
                <div className="flex justify-between text-xs font-semibold mb-0.5">
                  <span className="text-amber-400 flex items-center gap-1">
                    <Zap className="w-3 h-3" /> THRUSTER
                  </span>
                  <span className="font-mono-numbers text-amber-300">
                    {Math.round(stamina)}%
                  </span>
                </div>
                <div className="h-1.5 w-full bg-slate-900 rounded overflow-hidden border border-amber-500/20">
                  <div 
                    className="h-full bg-gradient-to-r from-amber-600 to-amber-400 transition-all duration-150"
                    style={{ width: `${Math.max(0, (stamina / 100) * 100)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Center: Wave Alert & Boss Bar */}
            <div className="flex flex-col items-center max-w-md w-full">
              {bossActive ? (
                /* Massive Boss Health Bar */
                <div className="w-full bg-slate-950/90 backdrop-blur-md border border-rose-600/50 rounded-lg p-3 shadow-2xl shadow-rose-950/60 animate-pulse-subtle">
                  <div className="flex justify-between items-center text-xs tracking-wider mb-1">
                    <span className="font-bold text-rose-500 flex items-center gap-1.5">
                      <Flame className="w-4 h-4 text-rose-500" />
                      {bossName}
                    </span>
                    <span className="font-mono-numbers text-rose-300">
                      {Math.round(bossHp)} / {bossMaxHp}
                    </span>
                  </div>
                  {/* Boss Shield if present */}
                  {bossMaxShield > 1 && (
                    <div className="h-1.5 w-full bg-slate-900 rounded overflow-hidden border border-cyan-500/30 mb-1">
                      <div 
                        className="h-full bg-cyan-400 transition-all duration-100"
                        style={{ width: `${Math.max(0, (bossShield / bossMaxShield) * 100)}%` }}
                      />
                    </div>
                  )}
                  {/* Boss Health */}
                  <div className="h-3 w-full bg-slate-900 rounded overflow-hidden border border-rose-500/40">
                    <div 
                      className="h-full bg-gradient-to-r from-rose-700 via-rose-500 to-red-400 transition-all duration-100"
                      style={{ width: `${Math.max(0, (bossHp / bossMaxHp) * 100)}%` }}
                    />
                  </div>
                </div>
              ) : (
                /* Standard Wave Display */
                <div className="bg-slate-950/80 backdrop-blur-md border border-slate-700/60 rounded-lg px-5 py-2 text-center shadow-lg shadow-black/60">
                  <div className="text-[10px] tracking-widest text-slate-400 uppercase font-semibold">
                    {waveState === 'INTERMISSION' ? 'WAVE CLEARED // PREPARING' : 'ARENA SECTOR'}
                  </div>
                  <div className="text-2xl font-black tracking-wider text-white">
                    WAVE {wave}
                  </div>
                  <div className="text-xs text-cyan-400 font-mono-numbers">
                    {waveState === 'INTERMISSION' ? 'STAND BY' : `${enemyCount} ROGUE UNITS REMAINING`}
                  </div>
                </div>
              )}

              {/* Berserk Overdrive Active Flare */}
              {isBerserk && (
                <div className="mt-2 flex items-center gap-2 px-3 py-1 bg-red-950/80 border border-red-500 rounded text-red-300 text-xs font-bold animate-pulse">
                  <Flame className="w-3.5 h-3.5 text-red-400" />
                  BERSERK OVERDRIVE: {berserkTimer.toFixed(1)}s
                </div>
              )}
            </div>

            {/* Right: Score, Combo Multiplier, Controls */}
            <div className="pointer-events-auto flex flex-col items-end gap-2">
              <div className="bg-slate-950/80 backdrop-blur-md border border-amber-500/30 rounded-lg p-3 min-w-[180px] text-right shadow-lg shadow-black/60">
                <div className="text-[10px] tracking-widest text-slate-400 uppercase font-bold">
                  SCORE
                </div>
                <div className="text-2xl font-black font-mono-numbers text-amber-400 tracking-tight">
                  {score.toLocaleString()}
                </div>

                {/* Combo Multiplier */}
                {combo > 0 && (
                  <div className="mt-1 pt-1 border-t border-slate-800">
                    <div className="flex justify-between items-center text-xs">
                      <span className={`font-black ${comboInfo.color}`}>
                        {comboInfo.rank} · {comboInfo.title}
                      </span>
                      <span className="font-mono-numbers text-amber-300 font-bold">
                        x{Math.min(10, 1 + Math.floor(combo / 5))} ({combo})
                      </span>
                    </div>
                    {/* Combo timer bar */}
                    <div className="h-1 w-full bg-slate-900 rounded overflow-hidden mt-1">
                      <div 
                        className="h-full bg-amber-400 transition-all duration-75"
                        style={{ width: `${Math.max(0, (comboTimer / 3.5) * 100)}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Utility buttons */}
              <div className="flex gap-2">
                <button
                  onClick={handleToggleMute}
                  className="p-2 rounded-lg bg-slate-900/80 border border-slate-700 hover:border-slate-500 text-slate-300 transition-colors"
                  title="Toggle Audio"
                >
                  {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
                </button>
                <button
                  onClick={() => setShowIntelModal(true)}
                  className="p-2 rounded-lg bg-slate-900/80 border border-slate-700 hover:border-slate-500 text-slate-300 transition-colors"
                  title="Weapon & Enemy Intel"
                >
                  <HelpCircle className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Bottom Bar: Weapon Selector Dock & Quick Triggers */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            
            {/* Weapon Selector Bar */}
            <div className="pointer-events-auto flex items-center gap-1.5 md:gap-2 p-1.5 bg-slate-950/85 backdrop-blur-md border border-slate-800 rounded-xl shadow-xl shadow-black/70">
              {(['SMG', 'SHOTGUN', 'BLADE', 'RAILGUN'] as WeaponType[]).map((type, idx) => {
                const config = WEAPON_CONFIGS[type];
                const isActive = activeWeapon === type;
                const state = engineRef.current?.player.weaponStates[type];
                const ammo = state ? state.currentAmmo : config.ammoMax;

                return (
                  <button
                    key={type}
                    onClick={() => handleWeaponSelect(type)}
                    className={`relative px-3 py-2 rounded-lg transition-all text-left flex flex-col min-w-[76px] md:min-w-[100px] border ${
                      isActive 
                        ? 'bg-slate-900 border-cyan-400 shadow-md shadow-cyan-950/50 scale-105' 
                        : 'bg-slate-950/50 border-slate-800 hover:border-slate-700 opacity-75 hover:opacity-100'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] text-slate-400 mb-0.5">
                      <span className="font-bold">[{idx + 1}]</span>
                      <span style={{ color: config.color }} className="font-bold">{config.shortName}</span>
                    </div>

                    <div className="text-xs font-mono-numbers font-extrabold flex items-center justify-between text-slate-200">
                      {type === 'BLADE' ? (
                        <span className="text-emerald-400 text-[11px]">NANO-MELEE</span>
                      ) : (
                        <span>{ammo} <span className="text-[10px] text-slate-500">/{config.ammoMax}</span></span>
                      )}
                    </div>

                    {/* Reload progress bar */}
                    {isActive && isReloading && (
                      <div className="absolute inset-x-0 bottom-0 h-1 bg-slate-800 rounded-b overflow-hidden">
                        <div 
                          className="h-full bg-amber-400 transition-all duration-75"
                          style={{ width: `${reloadProgress * 100}%` }}
                        />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Special Combat Action Triggers */}
            <div className="pointer-events-auto flex items-center gap-2">
              {/* Dash Action */}
              <button
                onClick={handleDash}
                className="px-4 py-2.5 rounded-lg bg-slate-900/90 border border-amber-500/40 hover:border-amber-400 text-amber-300 font-bold text-xs flex items-center gap-2 transition-all hover:scale-105 active:scale-95 shadow-lg"
              >
                <Zap className="w-4 h-4 text-amber-400" />
                <span>[SPACE] DASH</span>
              </button>

              {/* Orbital Strike Action */}
              <button
                onClick={handleOrbital}
                disabled={orbitalStrikes <= 0}
                className={`px-4 py-2.5 rounded-lg border font-bold text-xs flex items-center gap-2 transition-all shadow-lg ${
                  orbitalStrikes > 0
                    ? 'bg-gradient-to-r from-amber-600 to-amber-500 border-amber-300 text-black hover:scale-105 active:scale-95 animate-pulse'
                    : 'bg-slate-900/60 border-slate-800 text-slate-500 cursor-not-allowed'
                }`}
              >
                <Satellite className="w-4 h-4" />
                <span>[F] ORBITAL STRIKE ({orbitalStrikes})</span>
              </button>
            </div>
          </div>

          {/* Touch Joystick on-screen indicator for mobile touch devices */}
          {isTouchDevice && (
            <div className="pointer-events-none absolute bottom-24 left-6 text-slate-500 text-xs font-mono">
              TOUCH & DRAG TO MOVE & AIM
            </div>
          )}
        </div>
      )}

      {/* TITLE MENU MODAL */}
      {gameState === 'TITLE' && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="max-w-xl w-full bg-slate-950 border border-cyan-500/50 rounded-xl p-6 md:p-8 shadow-2xl shadow-cyan-950/50 text-center font-cyber">
            
            {/* Title Lockup */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-cyan-950/60 border border-cyan-500/30 text-cyan-400 text-xs font-bold tracking-widest mb-3">
              <Radio className="w-3.5 h-3.5 animate-pulse" />
              CYBERNETIC SECTOR 09 // HIGH DANGER
            </div>

            <h1 className="text-3xl md:text-5xl font-black tracking-tight text-white uppercase mb-2">
              Reeha: <span className="text-cyan-400">AI Arena</span> <span className="text-rose-500">Massacre</span>
            </h1>

            <p className="text-slate-400 text-sm md:text-base leading-relaxed mb-6 font-sans">
              Take command of cybernetic warrior Reeha. Purge hordes of rogue AI droids, bio-mechs, and colossal war titan bosses in a blood and oil-soaked arena.
            </p>

            {/* Quick Feature Grid */}
            <div className="grid grid-cols-2 gap-3 mb-6 text-left font-sans text-xs">
              <div className="p-3 bg-slate-900/70 border border-slate-800 rounded-lg">
                <div className="font-bold text-cyan-400 font-cyber mb-1">4-WEAPON ARSENAL</div>
                <div className="text-slate-400">Dual SMGs, Plasma Shotgun, Nanotech Cyber-Blade, and Railgun Piercer.</div>
              </div>
              <div className="p-3 bg-slate-900/70 border border-slate-800 rounded-lg">
                <div className="font-bold text-rose-400 font-cyber mb-1">EXECUTION & GORE</div>
                <div className="text-slate-400">Blade slashes sever droids, leaving permanent oil and blood decals on the arena floor!</div>
              </div>
              <div className="p-3 bg-slate-900/70 border border-slate-800 rounded-lg">
                <div className="font-bold text-amber-400 font-cyber mb-1">ORBITAL BEACON</div>
                <div className="text-slate-400">Summon devastating space satellite beams to obliterate entire waves.</div>
              </div>
              <div className="p-3 bg-slate-900/70 border border-slate-800 rounded-lg">
                <div className="font-bold text-emerald-400 font-cyber mb-1">NANO-REPAIR</div>
                <div className="text-slate-400">Execute low-health enemies with Cyber-Blade for instant +15 HP repair.</div>
              </div>
            </div>

            {/* High score record if available */}
            {highScore.score > 0 && (
              <div className="mb-6 p-2.5 bg-slate-900/50 border border-amber-500/20 rounded-lg flex items-center justify-around text-xs">
                <span className="text-amber-400 flex items-center gap-1 font-bold">
                  <Trophy className="w-3.5 h-3.5" /> PERSONAL BEST
                </span>
                <span className="font-mono-numbers text-slate-300">
                  {highScore.score.toLocaleString()} PTS
                </span>
                <span className="font-mono-numbers text-slate-400">
                  WAVE {highScore.highestWave}
                </span>
                <span className="font-mono-numbers text-slate-400">
                  {highScore.kills} KILLS
                </span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={handleStartGame}
                className="px-6 py-3.5 rounded-lg bg-cyan-400 hover:bg-cyan-300 text-black font-extrabold text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg shadow-cyan-500/20 hover:scale-102"
              >
                <span>INITIATE ARENA COMBAT</span>
                <ChevronRight className="w-4 h-4" />
              </button>

              <button
                onClick={downloadStandaloneHtmlFile}
                className="px-5 py-3 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all"
                title="Download single-file standalone HTML game"
              >
                <Download className="w-4 h-4 text-cyan-400" />
                <span>SAVE STANDALONE HTML</span>
              </button>
            </div>

            {/* Controls Footnote */}
            <div className="mt-5 text-[11px] text-slate-500">
              [WASD] Move · [Mouse] Aim & Fire · [Space] Dash · [1-4] Weapons · [F] Orbital Strike
            </div>
          </div>
        </div>
      )}

      {/* PAUSE MODAL */}
      {gameState === 'PAUSED' && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="max-w-md w-full bg-slate-950 border border-slate-800 rounded-xl p-6 text-center font-cyber">
            <h2 className="text-2xl font-black text-white uppercase mb-4 tracking-wider">
              COMBAT SIMULATION PAUSED
            </h2>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => engineRef.current?.setState('PLAYING')}
                className="w-full py-3 rounded-lg bg-cyan-400 hover:bg-cyan-300 text-black font-bold text-sm tracking-wider uppercase transition-colors"
              >
                RESUME COMBAT
              </button>
              <button
                onClick={handleStartGame}
                className="w-full py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 font-bold text-xs tracking-wider uppercase transition-colors"
              >
                RESTART MISSION
              </button>
              <button
                onClick={downloadStandaloneHtmlFile}
                className="w-full py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 font-bold text-xs tracking-wider uppercase flex items-center justify-center gap-2 transition-colors"
              >
                <Download className="w-4 h-4 text-cyan-400" />
                EXPORT STANDALONE HTML
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GAME OVER MODAL */}
      {gameState === 'GAME_OVER' && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-lg">
          <div className="max-w-md w-full bg-slate-950 border border-rose-600/50 rounded-xl p-6 md:p-8 text-center font-cyber shadow-2xl shadow-rose-950/60">
            
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-rose-950/80 border border-rose-500/30 text-rose-400 text-xs font-bold tracking-widest mb-3">
              CYBERNETIC LINK TERMINATED
            </div>

            <h2 className="text-3xl md:text-4xl font-black text-white uppercase mb-4 tracking-tight">
              MISSION <span className="text-rose-500">FAILED</span>
            </h2>

            {/* Performance Stats */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-4 mb-6 space-y-2.5 text-left font-sans text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Final Score:</span>
                <span className="font-mono-numbers text-amber-400 font-bold text-sm">
                  {score.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Sector Reached:</span>
                <span className="font-mono-numbers text-slate-200 font-bold">
                  Wave {wave}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Rogue Droids Slain:</span>
                <span className="font-mono-numbers text-slate-200 font-bold">
                  {kills} Units
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Highest Combo:</span>
                <span className="font-mono-numbers text-rose-400 font-bold">
                  {engineRef.current?.stats.maxCombo || 0}x
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Melee Executions:</span>
                <span className="font-mono-numbers text-emerald-400 font-bold">
                  {engineRef.current?.stats.executions || 0}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2.5">
              <button
                onClick={handleStartGame}
                className="w-full py-3.5 rounded-lg bg-rose-500 hover:bg-rose-400 text-black font-extrabold text-sm tracking-wider uppercase flex items-center justify-center gap-2 transition-all shadow-lg shadow-rose-950/50"
              >
                <RotateCcw className="w-4 h-4" />
                REDEPLOY REEHA (RETRY)
              </button>

              <button
                onClick={downloadStandaloneHtmlFile}
                className="w-full py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 font-bold text-xs tracking-wider uppercase flex items-center justify-center gap-2 transition-colors"
              >
                <Download className="w-4 h-4 text-cyan-400" />
                SAVE STANDALONE HTML
              </button>
            </div>
          </div>
        </div>
      )}

      {/* INTEL MODAL (Weapons, Enemies, Combat Tips) */}
      {showIntelModal && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="max-w-2xl w-full bg-slate-950 border border-slate-800 rounded-xl p-6 md:p-8 font-cyber max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div className="text-lg font-bold text-cyan-400 tracking-wider flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                TACTICAL DATABASE & COMBAT MANUAL
              </div>
              <button 
                onClick={() => setShowIntelModal(false)}
                className="text-slate-400 hover:text-white text-sm font-sans font-bold px-2 py-1 rounded bg-slate-900 border border-slate-700"
              >
                ✕ CLOSE
              </button>
            </div>

            {/* Arsenal Breakdown */}
            <div className="mb-6">
              <div className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                1. Cybernetic Weapon Loadout
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs font-sans">
                <div className="p-2.5 bg-slate-900/60 border border-cyan-500/30 rounded">
                  <div className="font-bold text-cyan-400 font-cyber">[1] Dual Vector SMGs</div>
                  <div className="text-slate-400 mt-1">High cyclic rate of fire with twin kinetic barrels. Perfect for melting swarms of fast light droids.</div>
                </div>
                <div className="p-2.5 bg-slate-900/60 border border-purple-500/30 rounded">
                  <div className="font-bold text-purple-400 font-cyber">[2] Heavy Plasma Shotgun</div>
                  <div className="text-slate-400 mt-1">Fires 8 high-density plasma pellets. Devastating kinetic pushback and point-blank destruction.</div>
                </div>
                <div className="p-2.5 bg-slate-900/60 border border-emerald-500/30 rounded">
                  <div className="font-bold text-emerald-400 font-cyber">[3] Nanotech Cyber-Blade</div>
                  <div className="text-slate-400 mt-1">Reflects hostile laser fire! Slices droids in half and executes low HP enemies for +15 HP Nano-Repair.</div>
                </div>
                <div className="p-2.5 bg-slate-900/60 border border-amber-500/30 rounded">
                  <div className="font-bold text-amber-400 font-cyber">[4] Hyper-Velocity Railgun</div>
                  <div className="text-slate-400 mt-1">Charged hypersonic beam piercing through infinite enemies in a line. Vaporizes targets instantly.</div>
                </div>
              </div>
            </div>

            {/* Enemy Unit Intel */}
            <div className="mb-6">
              <div className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                2. Rogue AI Threat Analysis
              </div>
              <div className="space-y-2 text-xs font-sans">
                <div className="p-2.5 bg-slate-900/40 border border-slate-800 rounded flex justify-between">
                  <div>
                    <span className="font-bold text-cyan-400 font-cyber">Fast Stalkers:</span> Fast quad-pedal hunters that leap onto Reeha. Weak but deadly in groups.
                  </div>
                </div>
                <div className="p-2.5 bg-slate-900/40 border border-slate-800 rounded flex justify-between">
                  <div>
                    <span className="font-bold text-blue-400 font-cyber">Shielded Enforcers:</span> Armored mechs with frontal energy barriers. Flank them or break shields with Railgun.
                  </div>
                </div>
                <div className="p-2.5 bg-slate-900/40 border border-slate-800 rounded flex justify-between">
                  <div>
                    <span className="font-bold text-orange-400 font-cyber">Explosive Drones:</span> Kamikaze hover-bombs. Shoot them before they reach you; their explosion damages nearby enemies!
                  </div>
                </div>
                <div className="p-2.5 bg-slate-900/40 border border-slate-800 rounded flex justify-between">
                  <div>
                    <span className="font-bold text-rose-400 font-cyber">Bio-Mechs & Boss Titans:</span> Massive corrupted cyber-beasts with homing missiles and bullet-hell shockwave patterns every 5 waves.
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowIntelModal(false)}
              className="w-full py-2.5 rounded bg-cyan-400 hover:bg-cyan-300 text-black font-bold text-xs uppercase tracking-wider transition-colors"
            >
              RETURN TO ARENA
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
