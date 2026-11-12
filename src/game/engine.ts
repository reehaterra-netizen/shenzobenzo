import { 
  GameState, 
  WeaponType, 
  WeaponConfig, 
  WeaponState, 
  Enemy, 
  EnemyType, 
  Projectile, 
  Particle, 
  PowerUp, 
  PowerUpType, 
  FloatingText, 
  HitMarker, 
  PlayerStats, 
  HighScoreRecord 
} from './types';
import { soundEngine } from './audio';
import { DecalManager } from './decals';

// Weapon balance configurations
export const WEAPON_CONFIGS: Record<WeaponType, WeaponConfig> = {
  SMG: {
    id: 'SMG',
    name: 'Dual Vector SMGs',
    shortName: 'SMG',
    damage: 18,
    fireRate: 14, // 14 rounds/sec
    ammoMax: 60,
    reloadTime: 1.2,
    spread: 0.12,
    pellets: 1,
    projectileSpeed: 950,
    range: 750,
    knockback: 12,
    piercing: false,
    color: '#06b6d4',
    accentColor: '#22d3ee',
    description: 'Rapid-fire dual kinetic lead spray for crowd suppression'
  },
  SHOTGUN: {
    id: 'SHOTGUN',
    name: 'Heavy Plasma Shotgun',
    shortName: 'SHOTGUN',
    damage: 26,
    fireRate: 1.8,
    ammoMax: 12,
    reloadTime: 1.8,
    spread: 0.38,
    pellets: 8,
    projectileSpeed: 750,
    range: 520,
    knockback: 65,
    piercing: false,
    color: '#a855f7',
    accentColor: '#c084fc',
    description: 'High-density plasma pellets with catastrophic close-range impact'
  },
  BLADE: {
    id: 'BLADE',
    name: 'Nanotech Cyber-Blade',
    shortName: 'BLADE',
    damage: 90,
    fireRate: 2.6,
    ammoMax: 100, // Energy gauge
    reloadTime: 0.8,
    spread: 0,
    pellets: 1,
    projectileSpeed: 0,
    range: 125,
    knockback: 70,
    piercing: true,
    color: '#10b981',
    accentColor: '#34d399',
    description: 'Reflects lasers, severs chassis, executes low HP for Nano-Repair (+15 HP)'
  },
  RAILGUN: {
    id: 'RAILGUN',
    name: 'Hyper-Velocity Railgun',
    shortName: 'RAILGUN',
    damage: 240,
    fireRate: 1.1,
    ammoMax: 6,
    reloadTime: 2.2,
    spread: 0.01,
    pellets: 1,
    projectileSpeed: 2400,
    range: 1200,
    knockback: 90,
    piercing: true,
    color: '#f59e0b',
    accentColor: '#fbbf24',
    description: 'Charged hypersonic beam punching through entire lines of enemies'
  }
};

export class GameEngine {
  // Canvases
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private decalManager: DecalManager;

  // Viewport & Arena
  public arenaWidth: number = 2400;
  public arenaHeight: number = 2400;
  public cameraX: number = 0;
  public cameraY: number = 0;
  public screenWidth: number = 1200;
  public screenHeight: number = 800;

  // Game Loop
  private lastTime: number = 0;
  private animFrameId: number | null = null;
  public state: GameState = 'TITLE';

  // Player Entity (Reeha)
  public player = {
    x: 1200,
    y: 1200,
    radius: 20,
    angle: 0,
    vx: 0,
    vy: 0,
    speed: 340,
    health: 100,
    maxHealth: 100,
    shield: 50,
    maxShield: 50,
    shieldRegenTimer: 0,
    stamina: 100,
    maxStamina: 100,
    isDashing: false,
    dashDuration: 0.22,
    dashTimer: 0,
    dashCooldown: 0.85,
    dashCooldownTimer: 0,
    dashVx: 0,
    dashVy: 0,
    invulnerableTimer: 0,
    activeWeapon: 'SMG' as WeaponType,
    weaponStates: {
      SMG: { currentAmmo: 60, maxAmmo: 60, lastShotTime: 0, isReloading: false, reloadProgress: 0 },
      SHOTGUN: { currentAmmo: 12, maxAmmo: 12, lastShotTime: 0, isReloading: false, reloadProgress: 0 },
      BLADE: { currentAmmo: 100, maxAmmo: 100, lastShotTime: 0, isReloading: false, reloadProgress: 0 },
      RAILGUN: { currentAmmo: 6, maxAmmo: 6, lastShotTime: 0, isReloading: false, reloadProgress: 0 }
    } as Record<WeaponType, WeaponState>,
    // Dual SMG alternating barrel
    smgBarrelToggle: false,
    // Blade swing animation
    bladeSwingTimer: 0,
    bladeSwingAngle: 0,
    // Berserk Overdrive
    isBerserk: false,
    berserkTimer: 0,
    berserkDuration: 10.0,
    // Orbital strike ready
    orbitalStrikesAvailable: 1
  };

  // Systems
  public enemies: Enemy[] = [];
  public projectiles: Projectile[] = [];
  public particles: Particle[] = [];
  public powerUps: PowerUp[] = [];
  public floatingTexts: FloatingText[] = [];
  public hitMarkers: HitMarker[] = [];

  // Wave & Spawning
  public wave: number = 1;
  public waveState: 'SPAWNING' | 'FIGHTING' | 'INTERMISSION' = 'INTERMISSION';
  public waveIntermissionTimer: number = 3.0;
  public enemiesToSpawn: number = 10;
  public enemiesSpawned: number = 0;
  public spawnTimer: number = 0;
  public spawnInterval: number = 1.0;
  public bossActive: boolean = false;
  public currentBoss: Enemy | null = null;

  // Stats & Scoring
  public stats: PlayerStats = {
    kills: 0,
    totalDamageDealt: 0,
    score: 0,
    currentCombo: 0,
    maxCombo: 0,
    comboTimer: 0,
    wave: 1,
    executions: 0,
    bossesDefeated: 0
  };
  public highScore: HighScoreRecord = {
    score: 0,
    kills: 0,
    maxCombo: 0,
    highestWave: 1,
    date: ''
  };

  // Screen Shake & Visual FX
  public trauma: number = 0; // 0 to 1
  public orbitalStrikeAnimTimer: number = 0;
  public redFlashTimer: number = 0;

  // Input State
  public keys: Record<string, boolean> = {};
  public mouseX: number = 0;
  public mouseY: number = 0;
  public isMouseDown: boolean = false;
  public virtualJoystick = { active: false, startX: 0, startY: 0, currentX: 0, currentY: 0, dx: 0, dy: 0 };
  public virtualAimJoystick = { active: false, startX: 0, startY: 0, currentX: 0, currentY: 0, dx: 0, dy: 0, isFiring: false };

  // Callbacks for UI sync
  public onStatsUpdate?: () => void;
  public onStateChange?: (state: GameState) => void;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.decalManager = new DecalManager(this.arenaWidth, this.arenaHeight);
    this.loadHighScore();
    this.handleResize();
    this.setupListeners();
  }

  private loadHighScore() {
    try {
      const data = localStorage.getItem('reeha_high_score');
      if (data) {
        this.highScore = JSON.parse(data);
      }
    } catch {
      // LocalStorage fallback
    }
  }

  private saveHighScore() {
    if (this.stats.score > this.highScore.score) {
      this.highScore = {
        score: this.stats.score,
        kills: this.stats.kills,
        maxCombo: Math.max(this.stats.maxCombo, this.highScore.maxCombo),
        highestWave: Math.max(this.wave, this.highScore.highestWave),
        date: new Date().toLocaleDateString()
      };
      try {
        localStorage.setItem('reeha_high_score', JSON.stringify(this.highScore));
      } catch {
        // Fallback
      }
    }
  }

  public handleResize() {
    this.screenWidth = window.innerWidth;
    this.screenHeight = window.innerHeight;
    this.canvas.width = this.screenWidth;
    this.canvas.height = this.screenHeight;
  }

  private setupListeners() {
    window.addEventListener('resize', () => this.handleResize());

    // Keyboard
    window.addEventListener('keydown', (e) => {
      this.keys[e.key.toLowerCase()] = true;
      this.keys[e.code] = true;

      if (e.key === '1') this.switchWeapon('SMG');
      if (e.key === '2') this.switchWeapon('SHOTGUN');
      if (e.key === '3') this.switchWeapon('BLADE');
      if (e.key === '4') this.switchWeapon('RAILGUN');
      if (e.key.toLowerCase() === 'r') this.reloadWeapon();
      if (e.key.toLowerCase() === 'f') this.triggerOrbitalStrike();
      if (e.code === 'Space') {
        e.preventDefault();
        this.triggerDash();
      }
      if (e.key === 'Escape' || e.key.toLowerCase() === 'p') {
        if (this.state === 'PLAYING') this.setState('PAUSED');
        else if (this.state === 'PAUSED') this.setState('PLAYING');
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.key.toLowerCase()] = false;
      this.keys[e.code] = false;
    });

    // Mouse
    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mouseX = e.clientX - rect.left;
      this.mouseY = e.clientY - rect.top;
    });

    this.canvas.addEventListener('mousedown', (e) => {
      if (e.button === 0) {
        this.isMouseDown = true;
      } else if (e.button === 2) {
        e.preventDefault();
        this.triggerDash();
      }
    });

    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) {
        this.isMouseDown = false;
      }
    });

    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    // Mouse wheel weapon switch
    this.canvas.addEventListener('wheel', (e) => {
      const weapons: WeaponType[] = ['SMG', 'SHOTGUN', 'BLADE', 'RAILGUN'];
      const currentIdx = weapons.indexOf(this.player.activeWeapon);
      if (e.deltaY > 0) {
        const next = weapons[(currentIdx + 1) % weapons.length];
        this.switchWeapon(next);
      } else {
        const prev = weapons[(currentIdx - 1 + weapons.length) % weapons.length];
        this.switchWeapon(prev);
      }
    }, { passive: true });
  }

  public setState(newState: GameState) {
    this.state = newState;
    if (this.onStateChange) this.onStateChange(newState);
    if (newState === 'PLAYING') {
      soundEngine.startAmbientMusic();
    } else {
      soundEngine.stopAmbientMusic();
    }
  }

  public startNewGame() {
    this.player.x = this.arenaWidth / 2;
    this.player.y = this.arenaHeight / 2;
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.health = 100;
    this.player.shield = 50;
    this.player.stamina = 100;
    this.player.isBerserk = false;
    this.player.berserkTimer = 0;
    this.player.orbitalStrikesAvailable = 1;
    this.player.activeWeapon = 'SMG';

    // Reset weapons
    Object.keys(this.player.weaponStates).forEach((w) => {
      const weaponKey = w as WeaponType;
      this.player.weaponStates[weaponKey].currentAmmo = WEAPON_CONFIGS[weaponKey].ammoMax;
      this.player.weaponStates[weaponKey].isReloading = false;
      this.player.weaponStates[weaponKey].reloadProgress = 0;
    });

    this.enemies = [];
    this.projectiles = [];
    this.particles = [];
    this.powerUps = [];
    this.floatingTexts = [];
    this.hitMarkers = [];
    this.decalManager.clear();

    this.wave = 1;
    this.waveState = 'INTERMISSION';
    this.waveIntermissionTimer = 2.0;
    this.bossActive = false;
    this.currentBoss = null;

    this.stats = {
      kills: 0,
      totalDamageDealt: 0,
      score: 0,
      currentCombo: 0,
      maxCombo: 0,
      comboTimer: 0,
      wave: 1,
      executions: 0,
      bossesDefeated: 0
    };

    this.setState('PLAYING');
    this.addFloatingText(this.player.x, this.player.y - 40, 'COMBAT MATRIX INITIALIZED', '#06b6d4', 22);
  }

  public switchWeapon(type: WeaponType) {
    if (this.player.activeWeapon === type) return;
    this.player.activeWeapon = type;
    soundEngine.playWeaponSwitch();
    this.addFloatingText(this.player.x, this.player.y - 30, WEAPON_CONFIGS[type].shortName, WEAPON_CONFIGS[type].color, 16);
  }

  public reloadWeapon() {
    const active = this.player.activeWeapon;
    if (active === 'BLADE') return; // blade has no reload
    const state = this.player.weaponStates[active];
    const config = WEAPON_CONFIGS[active];
    if (state.isReloading || state.currentAmmo >= config.ammoMax) return;

    state.isReloading = true;
    state.reloadProgress = 0;
    soundEngine.playWeaponSwitch();
  }

  public triggerDash() {
    if (this.player.dashCooldownTimer > 0 || this.player.stamina < 30 || this.player.isDashing) {
      return;
    }

    // Determine dash direction from movement keys or angle
    let dx = 0;
    let dy = 0;
    if (this.keys['w'] || this.keys['arrowup']) dy -= 1;
    if (this.keys['s'] || this.keys['arrowdown']) dy += 1;
    if (this.keys['a'] || this.keys['arrowleft']) dx -= 1;
    if (this.keys['d'] || this.keys['arrowright']) dx += 1;

    if (this.virtualJoystick.active && (this.virtualJoystick.dx !== 0 || this.virtualJoystick.dy !== 0)) {
      dx = this.virtualJoystick.dx;
      dy = this.virtualJoystick.dy;
    }

    if (dx === 0 && dy === 0) {
      dx = Math.cos(this.player.angle);
      dy = Math.sin(this.player.angle);
    } else {
      const len = Math.hypot(dx, dy);
      dx /= len;
      dy /= len;
    }

    const dashSpeed = 900;
    this.player.dashVx = dx * dashSpeed;
    this.player.dashVy = dy * dashSpeed;
    this.player.isDashing = true;
    this.player.dashTimer = this.player.dashDuration;
    this.player.dashCooldownTimer = this.player.dashCooldown;
    this.player.invulnerableTimer = this.player.dashDuration + 0.1;
    this.player.stamina -= 30;

    soundEngine.playDash();

    // Booster thruster particle burst
    for (let i = 0; i < 14; i++) {
      this.particles.push({
        x: this.player.x - dx * 15,
        y: this.player.y - dy * 15,
        vx: -dx * (200 + Math.random() * 200) + (Math.random() - 0.5) * 100,
        vy: -dy * (200 + Math.random() * 200) + (Math.random() - 0.5) * 100,
        radius: 3 + Math.random() * 4,
        color: this.player.isBerserk ? '#ef4444' : '#06b6d4',
        alpha: 1,
        decay: 3.5,
        type: 'ENERGY'
      });
    }
  }

  public triggerOrbitalStrike() {
    if (this.player.orbitalStrikesAvailable <= 0) return;
    this.player.orbitalStrikesAvailable--;
    this.orbitalStrikeAnimTimer = 1.2;
    this.trauma = Math.min(1.0, this.trauma + 0.8);

    soundEngine.playOrbitalStrike();
    this.addFloatingText(this.player.x, this.player.y - 60, 'ORBITAL STRIKE AUTHORIZED', '#fbbf24', 28, true);

    // Destroy/deal massive damage to all non-boss enemies
    setTimeout(() => {
      this.decalManager.addScorch(this.player.x, this.player.y, 250);
      
      this.enemies.forEach((enemy) => {
        const damage = enemy.isBoss ? 450 : 9999;
        this.damageEnemy(enemy, damage, 0, 0, true);
      });

      // Explosion particle shockwave
      for (let i = 0; i < 120; i++) {
        const angle = (i / 120) * Math.PI * 2;
        const spd = 300 + Math.random() * 500;
        this.particles.push({
          x: this.player.x,
          y: this.player.y,
          vx: Math.cos(angle) * spd,
          vy: Math.sin(angle) * spd,
          radius: 4 + Math.random() * 6,
          color: Math.random() > 0.5 ? '#fbbf24' : '#ffffff',
          alpha: 1,
          decay: 1.8,
          type: 'ENERGY'
        });
      }
    }, 600);
  }

  public activateBerserk() {
    this.player.isBerserk = true;
    this.player.berserkTimer = this.player.berserkDuration;
    this.trauma = Math.min(1.0, this.trauma + 0.6);
    soundEngine.playBerserk();
    this.addFloatingText(this.player.x, this.player.y - 50, 'BERSERK OVERDRIVE ACTIVATED', '#ef4444', 26, true);

    // Instant ammo reload for all
    Object.keys(this.player.weaponStates).forEach((w) => {
      const weaponKey = w as WeaponType;
      this.player.weaponStates[weaponKey].currentAmmo = WEAPON_CONFIGS[weaponKey].ammoMax;
      this.player.weaponStates[weaponKey].isReloading = false;
    });
  }

  // Combat Execution Move (triggered when low HP enemy is slashed with Cyber-Blade)
  private executeEnemy(enemy: Enemy) {
    this.stats.executions++;
    // Nano-repair recovery
    const healAmount = 18;
    this.player.health = Math.min(this.player.maxHealth, this.player.health + healAmount);
    soundEngine.playNanoRepair();
    this.addFloatingText(this.player.x, this.player.y - 45, `NANO-REPAIR +${healAmount} HP`, '#10b981', 20, true);
    this.addFloatingText(enemy.x, enemy.y - 20, 'EXECUTION!', '#ef4444', 22, true);

    // Sever enemy into distinct pieces
    const cutAngle = this.player.angle;
    this.decalManager.addSplatter(enemy.x, enemy.y, '#991b1b', 40, cutAngle, 16);
    this.decalManager.addSplatter(enemy.x, enemy.y, '#0f172a', 32, cutAngle, 10);
    this.decalManager.addSeveredLimb(enemy.x - 12, enemy.y, cutAngle + 0.3, 'CHASSIS', enemy.color);
    this.decalManager.addSeveredLimb(enemy.x + 12, enemy.y, cutAngle - 0.3, 'HEAD', enemy.color);
  }

  // Shoot weapon
  private shoot() {
    const activeWeapon = this.player.activeWeapon;
    const config = WEAPON_CONFIGS[activeWeapon];
    const state = this.player.weaponStates[activeWeapon];
    const now = performance.now() / 1000;

    // Berserk fire rate buff (2.5x)
    const effectiveFireRate = this.player.isBerserk ? config.fireRate * 2.5 : config.fireRate;
    const cooldown = 1 / effectiveFireRate;

    if (now - state.lastShotTime < cooldown) return;
    if (state.isReloading) return;

    if (activeWeapon !== 'BLADE' && state.currentAmmo <= 0) {
      this.reloadWeapon();
      return;
    }

    state.lastShotTime = now;
    if (!this.player.isBerserk && activeWeapon !== 'BLADE') {
      state.currentAmmo--;
    }

    // Aim angle towards crosshair
    const aimWorldX = this.mouseX + this.cameraX;
    const aimWorldY = this.mouseY + this.cameraY;
    let baseAngle = Math.atan2(aimWorldY - this.player.y, aimWorldX - this.player.x);

    if (this.virtualAimJoystick.active && (this.virtualAimJoystick.dx !== 0 || this.virtualAimJoystick.dy !== 0)) {
      baseAngle = Math.atan2(this.virtualAimJoystick.dy, this.virtualAimJoystick.dx);
    }

    this.player.angle = baseAngle;

    // Weapon specific behaviors
    if (activeWeapon === 'SMG') {
      this.player.smgBarrelToggle = !this.player.smgBarrelToggle;
      const barrelOffset = this.player.smgBarrelToggle ? 9 : -9;
      const perpAngle = baseAngle + Math.PI / 2;
      const spawnX = this.player.x + Math.cos(baseAngle) * 22 + Math.cos(perpAngle) * barrelOffset;
      const spawnY = this.player.y + Math.sin(baseAngle) * 22 + Math.sin(perpAngle) * barrelOffset;

      const spread = (Math.random() - 0.5) * config.spread;
      const finalAngle = baseAngle + spread;

      this.projectiles.push({
        id: `proj_${Math.random()}`,
        x: spawnX,
        y: spawnY,
        vx: Math.cos(finalAngle) * config.projectileSpeed,
        vy: Math.sin(finalAngle) * config.projectileSpeed,
        radius: 3.5,
        damage: config.damage * (this.player.isBerserk ? 1.5 : 1.0),
        isPlayer: true,
        color: config.color,
        trailColor: config.accentColor,
        piercing: false,
        hitEnemies: new Set(),
        lifespan: config.range / config.projectileSpeed,
        maxLifespan: config.range / config.projectileSpeed,
        type: 'BULLET'
      });

      soundEngine.playSmg(this.player.smgBarrelToggle ? 1.05 : 0.95);
      this.trauma = Math.min(1.0, this.trauma + 0.05);

    } else if (activeWeapon === 'SHOTGUN') {
      soundEngine.playPlasmaShotgun();
      this.trauma = Math.min(1.0, this.trauma + 0.25);

      // Gun recoil push
      this.player.vx -= Math.cos(baseAngle) * 120;
      this.player.vy -= Math.sin(baseAngle) * 120;

      for (let i = 0; i < config.pellets; i++) {
        const spread = (Math.random() - 0.5) * config.spread;
        const finalAngle = baseAngle + spread;
        const speed = config.projectileSpeed * (0.85 + Math.random() * 0.3);

        this.projectiles.push({
          id: `proj_${Math.random()}`,
          x: this.player.x + Math.cos(baseAngle) * 24,
          y: this.player.y + Math.sin(baseAngle) * 24,
          vx: Math.cos(finalAngle) * speed,
          vy: Math.sin(finalAngle) * speed,
          radius: 5.5,
          damage: config.damage * (this.player.isBerserk ? 1.5 : 1.0),
          isPlayer: true,
          color: config.color,
          trailColor: config.accentColor,
          piercing: false,
          hitEnemies: new Set(),
          lifespan: config.range / speed,
          maxLifespan: config.range / speed,
          type: 'PLASMA'
        });
      }

    } else if (activeWeapon === 'BLADE') {
      soundEngine.playBladeSlash();
      this.player.bladeSwingTimer = 0.25;
      this.player.bladeSwingAngle = baseAngle;
      this.trauma = Math.min(1.0, this.trauma + 0.08);

      // Dash forward slightly on swing
      this.player.vx += Math.cos(baseAngle) * 160;
      this.player.vy += Math.sin(baseAngle) * 160;

      // Check arc collision against enemies
      const slashRange = config.range;
      const slashArc = Math.PI * 0.75; // 135 degrees

      let hitAny = false;
      this.enemies.forEach((enemy) => {
        const dist = Math.hypot(enemy.x - this.player.x, enemy.y - this.player.y);
        if (dist <= slashRange + enemy.radius) {
          const enemyAngle = Math.atan2(enemy.y - this.player.y, enemy.x - this.player.x);
          let angleDiff = enemyAngle - baseAngle;
          while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
          while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

          if (Math.abs(angleDiff) <= slashArc / 2) {
            hitAny = true;
            const isExecution = enemy.health <= enemy.maxHealth * 0.35 && !enemy.isBoss;
            const damage = isExecution ? enemy.health : config.damage * (this.player.isBerserk ? 2.0 : 1.0);

            if (isExecution) {
              this.executeEnemy(enemy);
            }

            this.damageEnemy(enemy, damage, Math.cos(baseAngle), Math.sin(baseAngle), true);
            soundEngine.playBladeHit();
          }
        }
      });

      // Deflect/destroy hostile projectiles in front
      this.projectiles = this.projectiles.filter((p) => {
        if (p.isPlayer) return true;
        const dist = Math.hypot(p.x - this.player.x, p.y - this.player.y);
        if (dist <= slashRange) {
          // Deflected! Convert to player projectile
          p.isPlayer = true;
          p.vx = -p.vx * 1.5;
          p.vy = -p.vy * 1.5;
          p.color = '#10b981';
          p.trailColor = '#34d399';
          p.damage *= 2;
          return true;
        }
        return true;
      });

      // If berserk, launch an energy slash shockwave projectile forward
      if (this.player.isBerserk || hitAny) {
        this.projectiles.push({
          id: `slash_${Math.random()}`,
          x: this.player.x + Math.cos(baseAngle) * 30,
          y: this.player.y + Math.sin(baseAngle) * 30,
          vx: Math.cos(baseAngle) * 600,
          vy: Math.sin(baseAngle) * 600,
          radius: 28,
          damage: 60,
          isPlayer: true,
          color: '#10b981',
          trailColor: '#34d399',
          piercing: true,
          hitEnemies: new Set(),
          lifespan: 0.35,
          maxLifespan: 0.35,
          type: 'BLADE_SLASH'
        });
      }

    } else if (activeWeapon === 'RAILGUN') {
      soundEngine.playRailgun();
      this.trauma = Math.min(1.0, this.trauma + 0.45);

      // Heavy recoil
      this.player.vx -= Math.cos(baseAngle) * 200;
      this.player.vy -= Math.sin(baseAngle) * 200;

      // Railgun penetrates everything in a straight line
      const beamLength = config.range;
      const beamEndX = this.player.x + Math.cos(baseAngle) * beamLength;
      const beamEndY = this.player.y + Math.sin(baseAngle) * beamLength;

      // Scorch decal along beam path
      this.decalManager.addScorch(this.player.x, this.player.y, 8, true, baseAngle, beamLength);

      // Collision with all enemies along line segment
      this.enemies.forEach((enemy) => {
        const distToLine = this.distToSegment(
          { x: enemy.x, y: enemy.y },
          { x: this.player.x, y: this.player.y },
          { x: beamEndX, y: beamEndY }
        );

        if (distToLine <= enemy.radius + 14) {
          const isCrit = Math.random() < 0.4;
          const damage = config.damage * (isCrit ? 1.75 : 1.0) * (this.player.isBerserk ? 1.5 : 1.0);
          this.damageEnemy(enemy, damage, Math.cos(baseAngle), Math.sin(baseAngle), isCrit);

          // Disintegration particles
          for (let p = 0; p < 18; p++) {
            this.particles.push({
              x: enemy.x,
              y: enemy.y,
              vx: (Math.random() - 0.5) * 300,
              vy: (Math.random() - 0.5) * 300,
              radius: 2 + Math.random() * 4,
              color: '#f59e0b',
              alpha: 1,
              decay: 2.5,
              type: 'ENERGY'
            });
          }
        }
      });

      // Railgun visual beam projectile
      this.projectiles.push({
        id: `rail_${Math.random()}`,
        x: this.player.x,
        y: this.player.y,
        vx: Math.cos(baseAngle),
        vy: Math.sin(baseAngle),
        radius: 12,
        damage: 0, // already dealt
        isPlayer: true,
        color: config.color,
        trailColor: config.accentColor,
        piercing: true,
        hitEnemies: new Set(),
        lifespan: 0.18,
        maxLifespan: 0.18,
        type: 'RAILGUN_BEAM',
        angle: baseAngle
      });
    }
  }

  // Distance from point to line segment
  private distToSegment(p: { x: number; y: number }, v: { x: number; y: number }, w: { x: number; y: number }): number {
    const l2 = (v.x - w.x) ** 2 + (v.y - w.y) ** 2;
    if (l2 === 0) return Math.hypot(p.x - v.x, p.y - v.y);
    let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(p.x - (v.x + t * (w.x - v.x)), p.y - (v.y + t * (w.y - v.y)));
  }

  // Damage Enemy & trigger gore/splatter
  public damageEnemy(enemy: Enemy, damage: number, dirX: number = 0, dirY: number = 0, isCrit: boolean = false) {
    if (enemy.health <= 0) return;

    // Check Shielded Enforcer front shield
    if (enemy.shield && enemy.shield > 0) {
      // Calculate hit angle relative to enemy facing angle
      const hitAngle = Math.atan2(this.player.y - enemy.y, this.player.x - enemy.x);
      let diff = hitAngle - enemy.angle;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;

      // Front arc (~120 degrees)
      if (Math.abs(diff) < Math.PI * 0.35) {
        enemy.shield -= damage;
        this.addFloatingText(enemy.x, enemy.y - 20, 'BLOCKED', '#06b6d4', 14);
        soundEngine.playHitMarker(false);
        if (enemy.shield <= 0) {
          this.addFloatingText(enemy.x, enemy.y - 30, 'SHIELD BROKEN!', '#ef4444', 16, true);
          soundEngine.playExplosion(0.8);
        }
        return;
      }
    }

    enemy.health -= damage;
    enemy.flashTimer = 0.12;
    this.stats.totalDamageDealt += damage;

    // Knockback
    enemy.vx += dirX * 120;
    enemy.vy += dirY * 120;

    // Hit marker
    const markerAngle = Math.atan2(enemy.y - this.player.y, enemy.x - this.player.x);
    this.hitMarkers.push({
      angle: markerAngle,
      intensity: 1.0,
      time: performance.now(),
      isCrit
    });
    soundEngine.playHitMarker(isCrit);

    // Floating text
    this.addFloatingText(
      enemy.x + (Math.random() - 0.5) * 20,
      enemy.y - 15,
      isCrit ? `CRIT ${Math.round(damage)}!` : `${Math.round(damage)}`,
      isCrit ? '#ef4444' : '#ffffff',
      isCrit ? 19 : 14,
      isCrit
    );

    // Blood / synthetic oil splatter
    const bloodColor = enemy.type === 'BIO_MECH' ? '#dc2626' : (enemy.type === 'STALKER' ? '#10b981' : '#0f172a');
    this.decalManager.addSplatter(enemy.x, enemy.y, bloodColor, 18, Math.atan2(dirY, dirX), 6);

    // Sparks
    for (let i = 0; i < 6; i++) {
      this.particles.push({
        x: enemy.x,
        y: enemy.y,
        vx: dirX * 100 + (Math.random() - 0.5) * 200,
        vy: dirY * 100 + (Math.random() - 0.5) * 200,
        radius: 1.5 + Math.random() * 2,
        color: '#facc15',
        alpha: 1,
        decay: 3.0,
        type: 'SPARK'
      });
    }

    // Death Check
    if (enemy.health <= 0) {
      this.killEnemy(enemy, dirX, dirY);
    }
  }

  // Kill Enemy & trigger explosion, gore, decals, drops
  private killEnemy(enemy: Enemy, dirX: number = 0, dirY: number = 0) {
    this.stats.kills++;
    this.stats.currentCombo++;
    this.stats.comboTimer = 3.5;
    if (this.stats.currentCombo > this.stats.maxCombo) {
      this.stats.maxCombo = this.stats.currentCombo;
    }

    // Combo multiplier bonus
    const multiplier = Math.min(10, 1 + Math.floor(this.stats.currentCombo / 5));
    const earnedScore = enemy.scoreValue * multiplier;
    this.stats.score += earnedScore;

    soundEngine.playEnemyKill(enemy.isBoss);

    // Arena Floor Decal bake
    const oilColor = enemy.type === 'BIO_MECH' ? '#991b1b' : (enemy.type === 'STALKER' ? '#047857' : '#020617');
    this.decalManager.addSplatter(enemy.x, enemy.y, oilColor, enemy.radius * 1.5, Math.atan2(dirY, dirX), 14);
    this.decalManager.addScorch(enemy.x, enemy.y, enemy.radius * 1.2);

    // Severed limbs & debris onto floor
    this.decalManager.addSeveredLimb(
      enemy.x + (Math.random() - 0.5) * 20,
      enemy.y + (Math.random() - 0.5) * 20,
      Math.random() * Math.PI * 2,
      Math.random() > 0.5 ? 'ARM' : 'LEG',
      enemy.color
    );

    // Explosive Drone Detonation
    if (enemy.type === 'EXPLOSIVE_DRONE') {
      soundEngine.playExplosion(1.5);
      this.trauma = Math.min(1.0, this.trauma + 0.4);
      // Explode and damage nearby enemies too!
      this.enemies.forEach((other) => {
        if (other.id !== enemy.id) {
          const dist = Math.hypot(other.x - enemy.x, other.y - enemy.y);
          if (dist < 180) {
            this.damageEnemy(other, 120, (other.x - enemy.x) / dist, (other.y - enemy.y) / dist);
          }
        }
      });
      // Damage player if close
      const playerDist = Math.hypot(this.player.x - enemy.x, this.player.y - enemy.y);
      if (playerDist < 160) {
        this.damagePlayer(40);
      }
    }

    // Bio-Mech parasite spawn
    if (enemy.type === 'BIO_MECH') {
      for (let s = 0; s < 2; s++) {
        this.enemies.push({
          id: `parasite_${Math.random()}`,
          type: 'STALKER',
          x: enemy.x + (s === 0 ? 25 : -25),
          y: enemy.y + (s === 0 ? 25 : -25),
          radius: 12,
          angle: 0,
          speed: 260,
          health: 30,
          maxHealth: 30,
          damage: 12,
          scoreValue: 40,
          color: '#10b981',
          isBoss: false,
          lastAttackTime: 0,
          attackCooldown: 0.8,
          stateTimer: 0,
          flashTimer: 0,
          vx: (Math.random() - 0.5) * 100,
          vy: (Math.random() - 0.5) * 100
        });
      }
    }

    // Boss defeat handling
    if (enemy.isBoss) {
      this.bossActive = false;
      this.currentBoss = null;
      this.stats.bossesDefeated++;
      this.trauma = 1.0;
      this.addFloatingText(enemy.x, enemy.y - 60, `${enemy.bossTitle} DESTROYED`, '#f59e0b', 32, true);

      // Huge drop cache
      this.spawnPowerUp(enemy.x - 40, enemy.y, 'BERSERK');
      this.spawnPowerUp(enemy.x + 40, enemy.y, 'ORBITAL');
      this.spawnPowerUp(enemy.x, enemy.y + 40, 'NANO_REPAIR');
    } else {
      // Chance for power-up drop
      const roll = Math.random();
      if (roll < 0.08) {
        const types: PowerUpType[] = ['BERSERK', 'ORBITAL', 'NANO_REPAIR', 'AMMO_CACHE'];
        const chosen = types[Math.floor(Math.random() * types.length)];
        this.spawnPowerUp(enemy.x, enemy.y, chosen);
      }
    }

    // Disintegration / debris particles
    for (let i = 0; i < 24; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 100 + Math.random() * 250;
      this.particles.push({
        x: enemy.x,
        y: enemy.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 2 + Math.random() * 4,
        color: Math.random() > 0.4 ? enemy.color : '#334155',
        alpha: 1,
        decay: 2.0,
        type: 'DEBRIS'
      });
    }

    // Remove from enemy list
    this.enemies = this.enemies.filter((e) => e.id !== enemy.id);
  }

  // Damage Player
  public damagePlayer(amount: number) {
    if (this.player.invulnerableTimer > 0 || this.state !== 'PLAYING') return;

    soundEngine.playPlayerHurt();
    this.trauma = Math.min(1.0, this.trauma + 0.5);
    this.redFlashTimer = 0.25;

    // Shield absorbs first
    if (this.player.shield > 0) {
      const absorbed = Math.min(this.player.shield, amount);
      this.player.shield -= absorbed;
      amount -= absorbed;
      this.addFloatingText(this.player.x, this.player.y - 25, `-${Math.round(absorbed)} SHIELD`, '#06b6d4', 16);
    }

    if (amount > 0) {
      this.player.health -= amount;
      this.addFloatingText(this.player.x, this.player.y - 20, `-${Math.round(amount)} HP`, '#ef4444', 18, true);
    }

    this.player.invulnerableTimer = 0.4;
    this.player.shieldRegenTimer = 4.0; // reset shield regen delay

    if (this.player.health <= 0) {
      this.player.health = 0;
      this.handleGameOver();
    }
  }

  private handleGameOver() {
    this.saveHighScore();
    this.setState('GAME_OVER');
    soundEngine.playExplosion(2.0);
  }

  private spawnPowerUp(x: number, y: number, type: PowerUpType) {
    let color = '#06b6d4';
    let icon = '⚡';
    let label = 'AMMO';

    if (type === 'BERSERK') {
      color = '#ef4444';
      icon = '☠';
      label = 'BERSERK OVERDRIVE';
    } else if (type === 'ORBITAL') {
      color = '#fbbf24';
      icon = '🛰';
      label = 'ORBITAL STRIKE';
    } else if (type === 'NANO_REPAIR') {
      color = '#10b981';
      icon = '💉';
      label = 'NANO-REPAIR CORE';
    } else if (type === 'AMMO_CACHE') {
      color = '#06b6d4';
      icon = '📦';
      label = 'FULL AMMO CACHE';
    }

    this.powerUps.push({
      id: `pwr_${Math.random()}`,
      type,
      x,
      y,
      radius: 18,
      color,
      icon,
      label,
      bobOffset: Math.random() * Math.PI * 2
    });
  }

  // Floating text utility
  public addFloatingText(x: number, y: number, text: string, color: string, size: number = 16, isCrit: boolean = false) {
    this.floatingTexts.push({
      id: `ft_${Math.random()}`,
      x,
      y,
      text,
      color,
      size,
      alpha: 1.0,
      vy: -45,
      isCrit
    });
  }

  // Wave Spawner System
  private updateWave(dt: number) {
    if (this.waveState === 'INTERMISSION') {
      this.waveIntermissionTimer -= dt;
      if (this.waveIntermissionTimer <= 0) {
        this.startNextWave();
      }
      return;
    }

    if (this.waveState === 'SPAWNING') {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0 && this.enemiesSpawned < this.enemiesToSpawn) {
        this.spawnRandomEnemy();
        this.enemiesSpawned++;
        this.spawnTimer = this.spawnInterval;

        if (this.enemiesSpawned >= this.enemiesToSpawn) {
          this.waveState = 'FIGHTING';
        }
      }
    }

    // Check if wave cleared
    if (this.waveState === 'FIGHTING' && this.enemies.length === 0 && !this.bossActive) {
      this.waveState = 'INTERMISSION';
      this.waveIntermissionTimer = 4.0;
      this.wave++;
      this.stats.wave = this.wave;
      this.saveHighScore();

      soundEngine.playNanoRepair();
      this.addFloatingText(this.player.x, this.player.y - 60, `WAVE ${this.wave - 1} CLEARED!`, '#10b981', 28, true);

      // Reward orbital strike every 3 waves
      if (this.wave % 3 === 0) {
        this.player.orbitalStrikesAvailable++;
        this.addFloatingText(this.player.x, this.player.y - 90, '+1 ORBITAL STRIKE GRANTED', '#fbbf24', 20);
      }
    }
  }

  private startNextWave() {
    this.waveState = 'SPAWNING';
    this.spawnTimer = 0;
    this.enemiesSpawned = 0;

    const isBossWave = this.wave % 5 === 0;

    if (isBossWave) {
      this.enemiesToSpawn = 6 + this.wave * 2;
      this.spawnInterval = 2.5;
      this.spawnBoss();
    } else {
      this.enemiesToSpawn = 10 + this.wave * 4;
      this.spawnInterval = Math.max(0.35, 1.2 - this.wave * 0.08);
    }

    this.addFloatingText(this.player.x, this.player.y - 50, `WAVE ${this.wave} INCOMING`, '#ef4444', 26, true);
  }

  private spawnBoss() {
    this.bossActive = true;
    const isBehemoth = this.wave % 10 === 0;
    const spawnAngle = Math.random() * Math.PI * 2;
    const dist = 700;
    const bx = this.player.x + Math.cos(spawnAngle) * dist;
    const by = this.player.y + Math.sin(spawnAngle) * dist;

    if (isBehemoth) {
      const boss: Enemy = {
        id: `boss_${Math.random()}`,
        type: 'BOSS_BEHEMOTH',
        x: bx,
        y: by,
        radius: 65,
        angle: 0,
        speed: 130,
        health: 2800 + this.wave * 400,
        maxHealth: 2800 + this.wave * 400,
        shield: 600,
        maxShield: 600,
        damage: 45,
        scoreValue: 5000,
        color: '#dc2626',
        isBoss: true,
        bossTitle: 'CHIMERA BEHEMOTH - TITAN MECH',
        lastAttackTime: 0,
        attackCooldown: 2.2,
        stateTimer: 0,
        flashTimer: 0,
        vx: 0,
        vy: 0,
        phase: 1
      };
      this.enemies.push(boss);
      this.currentBoss = boss;
    } else {
      const boss: Enemy = {
        id: `boss_${Math.random()}`,
        type: 'BOSS_OVERSEER',
        x: bx,
        y: by,
        radius: 55,
        angle: 0,
        speed: 150,
        health: 1800 + this.wave * 300,
        maxHealth: 1800 + this.wave * 300,
        shield: 400,
        maxShield: 400,
        damage: 35,
        scoreValue: 3500,
        color: '#a855f7',
        isBoss: true,
        bossTitle: 'NEXUS OVERSEER - MK VII',
        lastAttackTime: 0,
        attackCooldown: 1.8,
        stateTimer: 0,
        flashTimer: 0,
        vx: 0,
        vy: 0,
        phase: 1
      };
      this.enemies.push(boss);
      this.currentBoss = boss;
    }

    soundEngine.playShockwave();
    this.trauma = 0.9;
  }

  private spawnRandomEnemy() {
    // Spawn off-camera but within arena
    const angle = Math.random() * Math.PI * 2;
    const dist = 600 + Math.random() * 300;
    let ex = this.player.x + Math.cos(angle) * dist;
    let ey = this.player.y + Math.sin(angle) * dist;

    ex = Math.max(80, Math.min(this.arenaWidth - 80, ex));
    ey = Math.max(80, Math.min(this.arenaHeight - 80, ey));

    // Enemy type weighting based on wave
    const roll = Math.random();
    let type: EnemyType = 'STALKER';

    if (this.wave >= 2 && roll < 0.28) {
      type = 'EXPLOSIVE_DRONE';
    } else if (this.wave >= 3 && roll < 0.55) {
      type = 'ENFORCER';
    } else if (this.wave >= 4 && roll < 0.75) {
      type = 'BIO_MECH';
    }

    if (type === 'STALKER') {
      this.enemies.push({
        id: `stalker_${Math.random()}`,
        type: 'STALKER',
        x: ex,
        y: ey,
        radius: 16,
        angle: 0,
        speed: 240 + this.wave * 8,
        health: 45 + this.wave * 6,
        maxHealth: 45 + this.wave * 6,
        damage: 16,
        scoreValue: 60,
        color: '#06b6d4',
        isBoss: false,
        lastAttackTime: 0,
        attackCooldown: 0.6,
        stateTimer: 0,
        flashTimer: 0,
        vx: 0,
        vy: 0
      });
    } else if (type === 'EXPLOSIVE_DRONE') {
      this.enemies.push({
        id: `drone_${Math.random()}`,
        type: 'EXPLOSIVE_DRONE',
        x: ex,
        y: ey,
        radius: 18,
        angle: 0,
        speed: 290,
        health: 35 + this.wave * 4,
        maxHealth: 35 + this.wave * 4,
        damage: 45,
        scoreValue: 90,
        color: '#f97316',
        isBoss: false,
        lastAttackTime: 0,
        attackCooldown: 1.0,
        stateTimer: 0,
        flashTimer: 0,
        vx: 0,
        vy: 0,
        fuseTimer: 2.0,
        isBeeping: false
      });
    } else if (type === 'ENFORCER') {
      this.enemies.push({
        id: `enforcer_${Math.random()}`,
        type: 'ENFORCER',
        x: ex,
        y: ey,
        radius: 24,
        angle: 0,
        speed: 160,
        health: 120 + this.wave * 15,
        maxHealth: 120 + this.wave * 15,
        shield: 100,
        maxShield: 100,
        damage: 22,
        scoreValue: 140,
        color: '#3b82f6',
        isBoss: false,
        lastAttackTime: 0,
        attackCooldown: 1.8,
        stateTimer: 0,
        flashTimer: 0,
        vx: 0,
        vy: 0
      });
    } else if (type === 'BIO_MECH') {
      this.enemies.push({
        id: `biomech_${Math.random()}`,
        type: 'BIO_MECH',
        x: ex,
        y: ey,
        radius: 28,
        angle: 0,
        speed: 140,
        health: 200 + this.wave * 25,
        maxHealth: 200 + this.wave * 25,
        damage: 28,
        scoreValue: 220,
        color: '#e11d48',
        isBoss: false,
        lastAttackTime: 0,
        attackCooldown: 2.4,
        stateTimer: 0,
        flashTimer: 0,
        vx: 0,
        vy: 0
      });
    }
  }

  // Update Game Loop
  public update(dt: number) {
    if (this.state !== 'PLAYING') return;

    // Berserk timer
    if (this.player.isBerserk) {
      this.player.berserkTimer -= dt;
      if (this.player.berserkTimer <= 0) {
        this.player.isBerserk = false;
        this.addFloatingText(this.player.x, this.player.y - 40, 'BERSERK EXPIRED', '#94a3b8', 16);
      }
    }

    // Shield passive regeneration
    if (this.player.shieldRegenTimer > 0) {
      this.player.shieldRegenTimer -= dt;
    } else if (this.player.shield < this.player.maxShield) {
      this.player.shield = Math.min(this.player.maxShield, this.player.shield + 12 * dt);
    }

    // Stamina regeneration
    if (this.player.stamina < this.player.maxStamina) {
      this.player.stamina = Math.min(this.player.maxStamina, this.player.stamina + 35 * dt);
    }

    // Dash Timers
    if (this.player.isDashing) {
      this.player.dashTimer -= dt;
      if (this.player.dashTimer <= 0) {
        this.player.isDashing = false;
      }
    }
    if (this.player.dashCooldownTimer > 0) {
      this.player.dashCooldownTimer -= dt;
    }
    if (this.player.invulnerableTimer > 0) {
      this.player.invulnerableTimer -= dt;
    }

    // Reload timers
    Object.keys(this.player.weaponStates).forEach((w) => {
      const weaponKey = w as WeaponType;
      const state = this.player.weaponStates[weaponKey];
      const config = WEAPON_CONFIGS[weaponKey];
      if (state.isReloading) {
        state.reloadProgress += dt / config.reloadTime;
        if (state.reloadProgress >= 1) {
          state.isReloading = false;
          state.reloadProgress = 0;
          state.currentAmmo = config.ammoMax;
        }
      }
    });

    // Combo timer decay
    if (this.stats.comboTimer > 0) {
      this.stats.comboTimer -= dt;
      if (this.stats.comboTimer <= 0) {
        this.stats.currentCombo = 0;
      }
    }

    // Screen Shake decay
    this.trauma = Math.max(0, this.trauma - 1.2 * dt);
    if (this.redFlashTimer > 0) this.redFlashTimer -= dt;
    if (this.orbitalStrikeAnimTimer > 0) this.orbitalStrikeAnimTimer -= dt;

    // Player Movement
    let mx = 0;
    let my = 0;
    if (this.keys['w'] || this.keys['arrowup']) my -= 1;
    if (this.keys['s'] || this.keys['arrowdown']) my += 1;
    if (this.keys['a'] || this.keys['arrowleft']) mx -= 1;
    if (this.keys['d'] || this.keys['arrowright']) mx += 1;

    if (this.virtualJoystick.active && (this.virtualJoystick.dx !== 0 || this.virtualJoystick.dy !== 0)) {
      mx = this.virtualJoystick.dx;
      my = this.virtualJoystick.dy;
    }

    if (mx !== 0 || my !== 0) {
      const len = Math.hypot(mx, my);
      const curSpeed = this.player.isBerserk ? this.player.speed * 1.5 : this.player.speed;
      this.player.vx += (mx / len) * curSpeed * 10 * dt;
      this.player.vy += (my / len) * curSpeed * 10 * dt;
    }

    // Dash overriding velocity
    if (this.player.isDashing) {
      this.player.vx = this.player.dashVx;
      this.player.vy = this.player.dashVy;
    } else {
      // Friction
      this.player.vx *= Math.pow(0.001, dt);
      this.player.vy *= Math.pow(0.001, dt);
    }

    this.player.x += this.player.vx * dt;
    this.player.y += this.player.vy * dt;

    // Arena Clamping
    this.player.x = Math.max(this.player.radius + 30, Math.min(this.arenaWidth - this.player.radius - 30, this.player.x));
    this.player.y = Math.max(this.player.radius + 30, Math.min(this.arenaHeight - this.player.radius - 30, this.player.y));

    // Player Aim Angle Update
    if (!this.virtualAimJoystick.active) {
      const aimWorldX = this.mouseX + this.cameraX;
      const aimWorldY = this.mouseY + this.cameraY;
      this.player.angle = Math.atan2(aimWorldY - this.player.y, aimWorldX - this.player.x);
    } else if (this.virtualAimJoystick.dx !== 0 || this.virtualAimJoystick.dy !== 0) {
      this.player.angle = Math.atan2(this.virtualAimJoystick.dy, this.virtualAimJoystick.dx);
    }

    // Weapon Auto-firing while mouse held or touch firing
    if (this.isMouseDown || (this.virtualAimJoystick.active && this.virtualAimJoystick.isFiring)) {
      this.shoot();
    }

    // Blade swing animation decay
    if (this.player.bladeSwingTimer > 0) {
      this.player.bladeSwingTimer -= dt;
    }

    // Update Projectiles
    this.projectiles.forEach((p) => {
      p.lifespan -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      // Projectile vs Enemy collision (Player projectiles)
      if (p.isPlayer && p.type !== 'RAILGUN_BEAM') {
        this.enemies.forEach((enemy) => {
          if (p.hitEnemies.has(enemy.id)) return;
          const dist = Math.hypot(p.x - enemy.x, p.y - enemy.y);
          if (dist <= p.radius + enemy.radius) {
            p.hitEnemies.add(enemy.id);
            const isCrit = Math.random() < 0.25;
            this.damageEnemy(enemy, p.damage * (isCrit ? 1.6 : 1.0), p.vx / 100, p.vy / 100, isCrit);

            if (!p.piercing) {
              p.lifespan = 0; // destroy projectile
            }
          }
        });
      }

      // Projectile vs Player collision (Hostile projectiles)
      if (!p.isPlayer) {
        const dist = Math.hypot(p.x - this.player.x, p.y - this.player.y);
        if (dist <= p.radius + this.player.radius) {
          p.lifespan = 0;
          this.damagePlayer(p.damage);
        }
      }
    });

    this.projectiles = this.projectiles.filter((p) => p.lifespan > 0);

    // Update Enemies
    this.enemies.forEach((enemy) => {
      if (enemy.flashTimer > 0) enemy.flashTimer -= dt;

      // AI Navigation towards player
      const dx = this.player.x - enemy.x;
      const dy = this.player.y - enemy.y;
      const dist = Math.hypot(dx, dy);
      enemy.angle = Math.atan2(dy, dx);

      // Unique behaviors per enemy type
      if (enemy.type === 'STALKER') {
        // Fast swarm & leap
        const spd = enemy.speed;
        enemy.vx += (dx / dist) * spd * 6 * dt;
        enemy.vy += (dy / dist) * spd * 6 * dt;

        // Melee hit
        if (dist <= enemy.radius + this.player.radius) {
          const now = performance.now() / 1000;
          if (now - enemy.lastAttackTime > enemy.attackCooldown) {
            enemy.lastAttackTime = now;
            this.damagePlayer(enemy.damage);
          }
        }
      } else if (enemy.type === 'EXPLOSIVE_DRONE') {
        // Beeper drone that accelerates and explodes
        const spd = dist < 220 ? enemy.speed * 1.5 : enemy.speed;
        enemy.vx += (dx / dist) * spd * 8 * dt;
        enemy.vy += (dy / dist) * spd * 8 * dt;

        if (dist < 120) {
          if (!enemy.isBeeping) {
            enemy.isBeeping = true;
            soundEngine.playHitMarker(true);
          }
          if (enemy.fuseTimer !== undefined) {
            enemy.fuseTimer -= dt;
            if (enemy.fuseTimer <= 0) {
              this.killEnemy(enemy, dx / dist, dy / dist);
            }
          }
        }
      } else if (enemy.type === 'ENFORCER') {
        // Keeps distance, faces player with shield, shoots laser volleys
        const idealDist = 280;
        if (dist > idealDist + 40) {
          enemy.vx += (dx / dist) * enemy.speed * 5 * dt;
          enemy.vy += (dy / dist) * enemy.speed * 5 * dt;
        } else if (dist < idealDist - 40) {
          enemy.vx -= (dx / dist) * enemy.speed * 4 * dt;
          enemy.vy -= (dy / dist) * enemy.speed * 4 * dt;
        }

        const now = performance.now() / 1000;
        if (now - enemy.lastAttackTime > enemy.attackCooldown) {
          enemy.lastAttackTime = now;
          // Fire twin red laser bolts
          for (let s = -1; s <= 1; s += 2) {
            const spreadAngle = enemy.angle + s * 0.1;
            this.projectiles.push({
              id: `elaser_${Math.random()}`,
              x: enemy.x + Math.cos(enemy.angle) * 26,
              y: enemy.y + Math.sin(enemy.angle) * 26,
              vx: Math.cos(spreadAngle) * 550,
              vy: Math.sin(spreadAngle) * 550,
              radius: 4,
              damage: enemy.damage,
              isPlayer: false,
              color: '#ef4444',
              trailColor: '#f87171',
              piercing: false,
              hitEnemies: new Set(),
              lifespan: 1.8,
              maxLifespan: 1.8,
              type: 'ENEMY_LASER'
            });
          }
          soundEngine.playSmg(0.7);
        }
      } else if (enemy.type === 'BIO_MECH') {
        // Slow tanky mech firing homing plasma
        enemy.vx += (dx / dist) * enemy.speed * 3 * dt;
        enemy.vy += (dy / dist) * enemy.speed * 3 * dt;

        const now = performance.now() / 1000;
        if (now - enemy.lastAttackTime > enemy.attackCooldown) {
          enemy.lastAttackTime = now;
          // Launch homing missile
          this.projectiles.push({
            id: `missile_${Math.random()}`,
            x: enemy.x + Math.cos(enemy.angle) * 32,
            y: enemy.y + Math.sin(enemy.angle) * 32,
            vx: Math.cos(enemy.angle) * 350,
            vy: Math.sin(enemy.angle) * 350,
            radius: 7,
            damage: enemy.damage,
            isPlayer: false,
            color: '#ec4899',
            trailColor: '#f472b6',
            piercing: false,
            hitEnemies: new Set(),
            lifespan: 3.5,
            maxLifespan: 3.5,
            type: 'HOMING_MISSILE'
          });
          soundEngine.playPlasmaShotgun();
        }
      } else if (enemy.type === 'BOSS_OVERSEER') {
        // Spiral bullet hell + ground shockwave
        enemy.stateTimer += dt;
        enemy.vx += (dx / dist) * enemy.speed * 2 * dt;
        enemy.vy += (dy / dist) * enemy.speed * 2 * dt;

        const now = performance.now() / 1000;
        if (now - enemy.lastAttackTime > enemy.attackCooldown) {
          enemy.lastAttackTime = now;
          // Spiral 12-way bullet spray
          soundEngine.playSmg(0.6);
          const bullets = 14;
          for (let b = 0; b < bullets; b++) {
            const bAngle = (b / bullets) * Math.PI * 2 + enemy.stateTimer * 2;
            this.projectiles.push({
              id: `boss_b_${Math.random()}`,
              x: enemy.x,
              y: enemy.y,
              vx: Math.cos(bAngle) * 380,
              vy: Math.sin(bAngle) * 380,
              radius: 6,
              damage: 22,
              isPlayer: false,
              color: '#c084fc',
              trailColor: '#e879f9',
              piercing: false,
              hitEnemies: new Set(),
              lifespan: 2.5,
              maxLifespan: 2.5,
              type: 'PLASMA'
            });
          }

          // Periodic shockwave
          if (Math.random() < 0.4) {
            soundEngine.playShockwave();
            this.trauma = Math.min(1.0, this.trauma + 0.35);
            // Spawn shockwave ring
            this.projectiles.push({
              id: `shock_${Math.random()}`,
              x: enemy.x,
              y: enemy.y,
              vx: 0,
              vy: 0,
              radius: 40,
              damage: 35,
              isPlayer: false,
              color: '#a855f7',
              trailColor: '#d8b4fe',
              piercing: true,
              hitEnemies: new Set(),
              lifespan: 1.2,
              maxLifespan: 1.2,
              type: 'SHOCKWAVE'
            });
          }
        }
      } else if (enemy.type === 'BOSS_BEHEMOTH') {
        // Titan Mech
        enemy.stateTimer += dt;
        enemy.vx += (dx / dist) * enemy.speed * 3 * dt;
        enemy.vy += (dy / dist) * enemy.speed * 3 * dt;

        const now = performance.now() / 1000;
        if (now - enemy.lastAttackTime > enemy.attackCooldown) {
          enemy.lastAttackTime = now;
          soundEngine.playRailgun();
          this.trauma = Math.min(1.0, this.trauma + 0.4);

          // 3-way heavy laser sweep
          for (let l = -1; l <= 1; l++) {
            const lAngle = enemy.angle + l * 0.25;
            this.projectiles.push({
              id: `behemoth_l_${Math.random()}`,
              x: enemy.x + Math.cos(enemy.angle) * 50,
              y: enemy.y + Math.sin(enemy.angle) * 50,
              vx: Math.cos(lAngle) * 620,
              vy: Math.sin(lAngle) * 620,
              radius: 8,
              damage: 32,
              isPlayer: false,
              color: '#ef4444',
              trailColor: '#fb7185',
              piercing: false,
              hitEnemies: new Set(),
              lifespan: 2.2,
              maxLifespan: 2.2,
              type: 'PLASMA'
            });
          }
        }
      }

      // Physics friction and motion
      enemy.vx *= Math.pow(0.01, dt);
      enemy.vy *= Math.pow(0.01, dt);
      enemy.x += enemy.vx * dt;
      enemy.y += enemy.vy * dt;

      // Enemy push separation
      this.enemies.forEach((other) => {
        if (other.id === enemy.id) return;
        const sepDist = Math.hypot(other.x - enemy.x, other.y - enemy.y);
        const minDist = enemy.radius + other.radius;
        if (sepDist < minDist && sepDist > 0) {
          const push = (minDist - sepDist) / 2;
          const nx = (enemy.x - other.x) / sepDist;
          const ny = (enemy.y - other.y) / sepDist;
          enemy.x += nx * push;
          enemy.y += ny * push;
          other.x -= nx * push;
          other.y -= ny * push;
        }
      });
    });

    // Update Particles
    this.particles.forEach((p) => {
      p.alpha -= p.decay * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= Math.pow(0.05, dt);
      p.vy *= Math.pow(0.05, dt);
    });
    this.particles = this.particles.filter((p) => p.alpha > 0);

    // Update PowerUps & Collection
    this.powerUps.forEach((pwr) => {
      pwr.bobOffset += dt * 3;
      const dist = Math.hypot(pwr.x - this.player.x, pwr.y - this.player.y);
      if (dist <= pwr.radius + this.player.radius) {
        // Collect Power-up
        if (pwr.type === 'BERSERK') {
          this.activateBerserk();
        } else if (pwr.type === 'ORBITAL') {
          this.player.orbitalStrikesAvailable++;
          soundEngine.playWeaponSwitch();
          this.addFloatingText(this.player.x, this.player.y - 40, '+1 ORBITAL STRIKE READY', '#fbbf24', 20, true);
        } else if (pwr.type === 'NANO_REPAIR') {
          this.player.health = Math.min(this.player.maxHealth, this.player.health + 40);
          soundEngine.playNanoRepair();
          this.addFloatingText(this.player.x, this.player.y - 40, 'NANO-REPAIR +40 HP', '#10b981', 22, true);
        } else if (pwr.type === 'AMMO_CACHE') {
          Object.keys(this.player.weaponStates).forEach((w) => {
            const weaponKey = w as WeaponType;
            this.player.weaponStates[weaponKey].currentAmmo = WEAPON_CONFIGS[weaponKey].ammoMax;
            this.player.weaponStates[weaponKey].isReloading = false;
          });
          soundEngine.playWeaponSwitch();
          this.addFloatingText(this.player.x, this.player.y - 40, 'AMMO REFILLED', '#06b6d4', 20);
        }
      }
    });
    this.powerUps = this.powerUps.filter((pwr) => {
      const dist = Math.hypot(pwr.x - this.player.x, pwr.y - this.player.y);
      return dist > pwr.radius + this.player.radius;
    });

    // Update Floating Text
    this.floatingTexts.forEach((ft) => {
      ft.alpha -= 0.85 * dt;
      ft.y += ft.vy * dt;
    });
    this.floatingTexts = this.floatingTexts.filter((ft) => ft.alpha > 0);

    // Update Hit Markers
    const now = performance.now();
    this.hitMarkers = this.hitMarkers.filter((m) => now - m.time < 180);

    // Update Waves
    this.updateWave(dt);

    // Camera follow with look-ahead
    const targetCamX = this.player.x - this.screenWidth / 2 + Math.cos(this.player.angle) * 80;
    const targetCamY = this.player.y - this.screenHeight / 2 + Math.sin(this.player.angle) * 80;
    this.cameraX += (targetCamX - this.cameraX) * 8 * dt;
    this.cameraY += (targetCamY - this.cameraY) * 8 * dt;

    if (this.onStatsUpdate) this.onStatsUpdate();
  }

  // Render Frame
  public render() {
    this.ctx.clearRect(0, 0, this.screenWidth, this.screenHeight);

    // Apply Screen Shake
    let shakeOffsetX = 0;
    let shakeOffsetY = 0;
    let shakeRot = 0;
    if (this.trauma > 0) {
      const shakeMag = Math.pow(this.trauma, 2) * 24;
      shakeOffsetX = (Math.random() - 0.5) * shakeMag;
      shakeOffsetY = (Math.random() - 0.5) * shakeMag;
      shakeRot = (Math.random() - 0.5) * 0.03 * this.trauma;
    }

    this.ctx.save();
    this.ctx.translate(this.screenWidth / 2 + shakeOffsetX, this.screenHeight / 2 + shakeOffsetY);
    this.ctx.rotate(shakeRot);
    this.ctx.translate(-this.screenWidth / 2, -this.screenHeight / 2);

    // Render Arena Floor Grid
    this.renderArenaFloor();

    // Render Permanent Decal Splatters from buffer canvas
    this.decalManager.render(this.ctx, this.cameraX, this.cameraY);

    // Render Arena Hazard Borders & Obstacles
    this.renderArenaBoundaries();

    // Render Power-Ups
    this.renderPowerUps();

    // Render Enemies
    this.renderEnemies();

    // Render Player (Reeha)
    this.renderPlayer();

    // Render Projectiles & Beams
    this.renderProjectiles();

    // Render Particles
    this.renderParticles();

    // Render In-world Floating Text
    this.renderFloatingText();

    this.ctx.restore();

    // Render Over-the-Top Screen Tints (Berserk / Damage / Orbital)
    this.renderScreenTints();

    // Render Custom Cyber Crosshair & Directional Hit Markers
    this.renderCrosshairAndHitMarkers();
  }

  private renderArenaFloor() {
    const gridSpacing = 80;
    const startX = Math.floor(this.cameraX / gridSpacing) * gridSpacing;
    const startY = Math.floor(this.cameraY / gridSpacing) * gridSpacing;

    this.ctx.save();
    this.ctx.fillStyle = '#080a0f';
    this.ctx.fillRect(0, 0, this.screenWidth, this.screenHeight);

    // Arena tile grid
    this.ctx.strokeStyle = '#111827';
    this.ctx.lineWidth = 1;

    for (let x = startX; x < startX + this.screenWidth + gridSpacing; x += gridSpacing) {
      const screenX = x - this.cameraX;
      this.ctx.beginPath();
      this.ctx.moveTo(screenX, 0);
      this.ctx.lineTo(screenX, this.screenHeight);
      this.ctx.stroke();
    }

    for (let y = startY; y < startY + this.screenHeight + gridSpacing; y += gridSpacing) {
      const screenY = y - this.cameraY;
      this.ctx.beginPath();
      this.ctx.moveTo(0, screenY);
      this.ctx.lineTo(this.screenWidth, screenY);
      this.ctx.stroke();
    }

    // Concentric Arena Danger Circles in center
    const centerScreenX = this.arenaWidth / 2 - this.cameraX;
    const centerScreenY = this.arenaHeight / 2 - this.cameraY;

    this.ctx.strokeStyle = 'rgba(6, 182, 212, 0.08)';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.arc(centerScreenX, centerScreenY, 400, 0, Math.PI * 2);
    this.ctx.stroke();
    this.ctx.beginPath();
    this.ctx.arc(centerScreenX, centerScreenY, 800, 0, Math.PI * 2);
    this.ctx.stroke();

    this.ctx.restore();
  }

  private renderArenaBoundaries() {
    const minX = 0 - this.cameraX;
    const minY = 0 - this.cameraY;
    const maxX = this.arenaWidth - this.cameraX;
    const maxY = this.arenaHeight - this.cameraY;

    this.ctx.save();
    // Glowing laser perimeter fence
    this.ctx.strokeStyle = '#ef4444';
    this.ctx.lineWidth = 6;
    this.ctx.shadowColor = '#ef4444';
    this.ctx.shadowBlur = 14;

    this.ctx.strokeRect(minX, minY, this.arenaWidth, this.arenaHeight);

    // Corner hazard diagonal stripes
    this.ctx.shadowBlur = 0;
    this.ctx.strokeStyle = '#f59e0b';
    this.ctx.lineWidth = 3;
    const cornerSize = 120;
    // Top-left
    this.ctx.strokeRect(minX, minY, cornerSize, cornerSize);
    // Top-right
    this.ctx.strokeRect(maxX - cornerSize, minY, cornerSize, cornerSize);
    // Bottom-left
    this.ctx.strokeRect(minX, maxY - cornerSize, cornerSize, cornerSize);
    // Bottom-right
    this.ctx.strokeRect(maxX - cornerSize, maxY - cornerSize, cornerSize, cornerSize);

    this.ctx.restore();
  }

  private renderPlayer() {
    const px = this.player.x - this.cameraX;
    const py = this.player.y - this.cameraY;

    this.ctx.save();
    this.ctx.translate(px, py);
    this.ctx.rotate(this.player.angle);

    // Invulnerability flashing
    if (this.player.invulnerableTimer > 0 && Math.floor(performance.now() / 60) % 2 === 0) {
      this.ctx.globalAlpha = 0.4;
    }

    // Energy Shield Bubble if shield > 0
    if (this.player.shield > 0) {
      this.ctx.save();
      this.ctx.strokeStyle = 'rgba(6, 182, 212, 0.4)';
      this.ctx.lineWidth = 2.5;
      this.ctx.shadowColor = '#06b6d4';
      this.ctx.shadowBlur = 10;
      this.ctx.beginPath();
      this.ctx.arc(0, 0, this.player.radius + 8, 0, Math.PI * 2);
      this.ctx.stroke();
      this.ctx.restore();
    }

    // Berserk Flaming Aura
    if (this.player.isBerserk) {
      this.ctx.save();
      this.ctx.strokeStyle = 'rgba(239, 68, 68, 0.8)';
      this.ctx.lineWidth = 3;
      this.ctx.shadowColor = '#ef4444';
      this.ctx.shadowBlur = 18;
      this.ctx.beginPath();
      this.ctx.arc(0, 0, this.player.radius + 12 + Math.sin(performance.now() / 80) * 4, 0, Math.PI * 2);
      this.ctx.stroke();
      this.ctx.restore();
    }

    // Cyber-warrior Reeha Torso / Trenchcoat
    // Coat wings
    this.ctx.fillStyle = '#090d16';
    this.ctx.beginPath();
    this.ctx.moveTo(-16, -14);
    this.ctx.lineTo(-24, -18);
    this.ctx.lineTo(-20, 0);
    this.ctx.lineTo(-24, 18);
    this.ctx.lineTo(-16, 14);
    this.ctx.closePath();
    this.ctx.fill();

    // Armored chassis
    this.ctx.fillStyle = '#1e293b';
    this.ctx.strokeStyle = this.player.isBerserk ? '#ef4444' : '#06b6d4';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.arc(0, 0, this.player.radius, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.stroke();

    // Cybernetic spine glowing track
    this.ctx.fillStyle = this.player.isBerserk ? '#f87171' : '#38bdf8';
    this.ctx.fillRect(-14, -3, 14, 6);

    // Shoulders
    this.ctx.fillStyle = '#334155';
    this.ctx.beginPath();
    this.ctx.arc(4, -14, 6, 0, Math.PI * 2);
    this.ctx.arc(4, 14, 6, 0, Math.PI * 2);
    this.ctx.fill();

    // Helmet / Visor
    this.ctx.fillStyle = '#0f172a';
    this.ctx.beginPath();
    this.ctx.arc(6, 0, 9, 0, Math.PI * 2);
    this.ctx.fill();

    // Neon visor line
    this.ctx.fillStyle = this.player.isBerserk ? '#ef4444' : '#00f2fe';
    this.ctx.shadowColor = this.ctx.fillStyle;
    this.ctx.shadowBlur = 8;
    this.ctx.fillRect(8, -5, 4, 10);
    this.ctx.shadowBlur = 0;

    // Active Weapon Graphic
    const activeWeapon = this.player.activeWeapon;
    if (activeWeapon === 'SMG') {
      // Dual SMGs in hands
      this.ctx.fillStyle = '#475569';
      this.ctx.fillRect(10, -13, 16, 5);
      this.ctx.fillRect(10, 8, 16, 5);
      // Barrels
      this.ctx.fillStyle = '#06b6d4';
      this.ctx.fillRect(26, -12, 4, 3);
      this.ctx.fillRect(26, 9, 4, 3);
    } else if (activeWeapon === 'SHOTGUN') {
      // Heavy Shotgun centered
      this.ctx.fillStyle = '#475569';
      this.ctx.fillRect(8, -6, 26, 12);
      this.ctx.fillStyle = '#a855f7';
      this.ctx.fillRect(26, -4, 12, 8);
    } else if (activeWeapon === 'BLADE') {
      // Glowing Neon Katana Blade
      this.ctx.save();
      if (this.player.bladeSwingTimer > 0) {
        this.ctx.rotate((1 - this.player.bladeSwingTimer / 0.25) * Math.PI - Math.PI / 2);
      }
      this.ctx.strokeStyle = '#10b981';
      this.ctx.lineWidth = 4;
      this.ctx.shadowColor = '#10b981';
      this.ctx.shadowBlur = 12;
      this.ctx.beginPath();
      this.ctx.moveTo(10, 8);
      this.ctx.lineTo(44, 16);
      this.ctx.stroke();
      this.ctx.restore();
    } else if (activeWeapon === 'RAILGUN') {
      // Massive Railgun Cannon
      this.ctx.fillStyle = '#1e293b';
      this.ctx.fillRect(4, -7, 36, 14);
      this.ctx.fillStyle = '#f59e0b';
      this.ctx.shadowColor = '#f59e0b';
      this.ctx.shadowBlur = 10;
      this.ctx.fillRect(14, -3, 28, 6);
      this.ctx.shadowBlur = 0;
    }

    this.ctx.restore();
  }

  private renderEnemies() {
    this.enemies.forEach((enemy) => {
      const ex = enemy.x - this.cameraX;
      const ey = enemy.y - this.cameraY;

      // Off-screen culling
      if (ex < -100 || ex > this.screenWidth + 100 || ey < -100 || ey > this.screenHeight + 100) {
        return;
      }

      this.ctx.save();
      this.ctx.translate(ex, ey);
      this.ctx.rotate(enemy.angle);

      // Damage Flash (white/red)
      if (enemy.flashTimer > 0) {
        this.ctx.fillStyle = '#ffffff';
      } else {
        this.ctx.fillStyle = enemy.color;
      }

      // Draw Enemy body by type
      if (enemy.type === 'STALKER') {
        // Fast Arachnid Droid
        this.ctx.beginPath();
        this.ctx.ellipse(0, 0, enemy.radius, enemy.radius * 0.7, 0, 0, Math.PI * 2);
        this.ctx.fill();

        // 6 arachnid legs
        this.ctx.strokeStyle = '#0891b2';
        this.ctx.lineWidth = 2;
        for (let i = -1; i <= 1; i++) {
          const legPhase = Math.sin(performance.now() / 60 + i) * 8;
          this.ctx.beginPath();
          this.ctx.moveTo(-4, i * 8);
          this.ctx.lineTo(-18, i * 14 + legPhase);
          this.ctx.stroke();
        }

        // Red sensor eyes
        this.ctx.fillStyle = '#ef4444';
        this.ctx.beginPath();
        this.ctx.arc(8, -4, 2, 0, Math.PI * 2);
        this.ctx.arc(8, 4, 2, 0, Math.PI * 2);
        this.ctx.fill();

      } else if (enemy.type === 'EXPLOSIVE_DRONE') {
        // Floating Bomb Sphere
        const pulse = Math.sin(performance.now() / 60) * 3;
        this.ctx.beginPath();
        this.ctx.arc(0, 0, enemy.radius + (enemy.isBeeping ? pulse : 0), 0, Math.PI * 2);
        this.ctx.fill();

        // Warning siren light
        this.ctx.fillStyle = enemy.isBeeping ? '#ffffff' : '#ef4444';
        this.ctx.beginPath();
        this.ctx.arc(0, 0, 7, 0, Math.PI * 2);
        this.ctx.fill();

        // Hazard propellers
        this.ctx.strokeStyle = '#475569';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(-enemy.radius - 4, -enemy.radius - 4, (enemy.radius + 4) * 2, (enemy.radius + 4) * 2);

      } else if (enemy.type === 'ENFORCER') {
        // Heavy Bipedal Mech
        this.ctx.beginPath();
        this.ctx.arc(0, 0, enemy.radius, 0, Math.PI * 2);
        this.ctx.fill();

        // Front Energy Shield Arc if active
        if (enemy.shield && enemy.shield > 0) {
          this.ctx.save();
          this.ctx.strokeStyle = '#38bdf8';
          this.ctx.lineWidth = 5;
          this.ctx.shadowColor = '#0284c7';
          this.ctx.shadowBlur = 12;
          this.ctx.beginPath();
          this.ctx.arc(0, 0, enemy.radius + 10, -Math.PI * 0.45, Math.PI * 0.45);
          this.ctx.stroke();
          this.ctx.restore();
        }

        // Heavy twin blasters
        this.ctx.fillStyle = '#1e293b';
        this.ctx.fillRect(8, -14, 16, 6);
        this.ctx.fillRect(8, 8, 16, 6);

      } else if (enemy.type === 'BIO_MECH') {
        // Corrupted Flesh-Metal Chimera
        this.ctx.beginPath();
        this.ctx.ellipse(0, 0, enemy.radius, enemy.radius * 0.8, 0, 0, Math.PI * 2);
        this.ctx.fill();

        // Corrupted bio veins
        this.ctx.strokeStyle = '#fda4af';
        this.ctx.lineWidth = 1.5;
        this.ctx.beginPath();
        this.ctx.moveTo(-12, -8);
        this.ctx.lineTo(8, 6);
        this.ctx.stroke();

        // Heavy plasma cannon
        this.ctx.fillStyle = '#831843';
        this.ctx.fillRect(6, -6, 24, 12);

      } else if (enemy.type === 'BOSS_OVERSEER') {
        // Giant Rotating Spherical Core
        const spin = performance.now() / 300;
        this.ctx.beginPath();
        this.ctx.arc(0, 0, enemy.radius, 0, Math.PI * 2);
        this.ctx.fill();

        // Rotating Shield Plates
        this.ctx.strokeStyle = '#c084fc';
        this.ctx.lineWidth = 6;
        for (let p = 0; p < 4; p++) {
          const arcStart = (p / 4) * Math.PI * 2 + spin;
          this.ctx.beginPath();
          this.ctx.arc(0, 0, enemy.radius + 14, arcStart, arcStart + Math.PI * 0.35);
          this.ctx.stroke();
        }

        // Glowing red war eye
        this.ctx.fillStyle = '#ef4444';
        this.ctx.shadowColor = '#ef4444';
        this.ctx.shadowBlur = 16;
        this.ctx.beginPath();
        this.ctx.arc(10, 0, 16, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.shadowBlur = 0;

      } else if (enemy.type === 'BOSS_BEHEMOTH') {
        // Titan Mech
        this.ctx.fillRect(-enemy.radius, -enemy.radius * 0.8, enemy.radius * 2, enemy.radius * 1.6);
        // Heavy cannons
        this.ctx.fillStyle = '#0f172a';
        this.ctx.fillRect(20, -enemy.radius * 0.7, 45, 18);
        this.ctx.fillRect(20, enemy.radius * 0.7 - 18, 45, 18);
      }

      this.ctx.restore();

      // Enemy Health Bar (if damaged or boss)
      if (enemy.health < enemy.maxHealth || enemy.isBoss) {
        this.renderEnemyHealthBar(enemy, ex, ey);
      }
    });
  }

  private renderEnemyHealthBar(enemy: Enemy, ex: number, ey: number) {
    const barW = enemy.isBoss ? 160 : 36;
    const barH = enemy.isBoss ? 8 : 4;
    const barY = ey - enemy.radius - (enemy.isBoss ? 24 : 12);

    this.ctx.save();
    // Background
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.ctx.fillRect(ex - barW / 2, barY, barW, barH);

    // Health
    const hpRatio = Math.max(0, enemy.health / enemy.maxHealth);
    this.ctx.fillStyle = enemy.isBoss ? '#ef4444' : '#10b981';
    this.ctx.fillRect(ex - barW / 2, barY, barW * hpRatio, barH);

    // Shield portion if applicable
    if (enemy.shield && enemy.maxShield && enemy.shield > 0) {
      const shieldRatio = Math.max(0, enemy.shield / enemy.maxShield);
      this.ctx.fillStyle = '#06b6d4';
      this.ctx.fillRect(ex - barW / 2, barY - 3, barW * shieldRatio, 2);
    }

    if (enemy.isBoss && enemy.bossTitle) {
      this.ctx.fillStyle = '#f87171';
      this.ctx.font = 'bold 12px "Chakra Petch", sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(enemy.bossTitle, ex, barY - 8);
    }

    this.ctx.restore();
  }

  private renderProjectiles() {
    this.projectiles.forEach((p) => {
      const px = p.x - this.cameraX;
      const py = p.y - this.cameraY;

      this.ctx.save();
      this.ctx.shadowColor = p.color;
      this.ctx.shadowBlur = 8;
      this.ctx.fillStyle = p.color;

      if (p.type === 'RAILGUN_BEAM') {
        // Hypersonic ionization beam
        this.ctx.strokeStyle = p.color;
        this.ctx.lineWidth = 14 * (p.lifespan / p.maxLifespan);
        this.ctx.shadowBlur = 24;
        this.ctx.beginPath();
        this.ctx.moveTo(px, py);
        this.ctx.lineTo(px + Math.cos(p.angle || 0) * 1200, py + Math.sin(p.angle || 0) * 1200);
        this.ctx.stroke();

        // White core
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 4 * (p.lifespan / p.maxLifespan);
        this.ctx.beginPath();
        this.ctx.moveTo(px, py);
        this.ctx.lineTo(px + Math.cos(p.angle || 0) * 1200, py + Math.sin(p.angle || 0) * 1200);
        this.ctx.stroke();

      } else if (p.type === 'BLADE_SLASH') {
        // Energy crescent wave
        this.ctx.strokeStyle = p.color;
        this.ctx.lineWidth = 5;
        this.ctx.beginPath();
        this.ctx.arc(px, py, p.radius, -Math.PI * 0.4, Math.PI * 0.4);
        this.ctx.stroke();

      } else if (p.type === 'SHOCKWAVE') {
        // Expanding ring
        const radius = p.radius + (1 - p.lifespan / p.maxLifespan) * 220;
        this.ctx.strokeStyle = p.color;
        this.ctx.lineWidth = 4 * (p.lifespan / p.maxLifespan);
        this.ctx.beginPath();
        this.ctx.arc(px, py, radius, 0, Math.PI * 2);
        this.ctx.stroke();

      } else {
        // Bullet / Plasma ball
        this.ctx.beginPath();
        this.ctx.arc(px, py, p.radius, 0, Math.PI * 2);
        this.ctx.fill();

        // Trail tail
        this.ctx.strokeStyle = p.trailColor;
        this.ctx.lineWidth = p.radius * 1.2;
        this.ctx.beginPath();
        this.ctx.moveTo(px, py);
        this.ctx.lineTo(px - p.vx * 0.03, py - p.vy * 0.03);
        this.ctx.stroke();
      }

      this.ctx.restore();
    });
  }

  private renderPowerUps() {
    this.powerUps.forEach((pwr) => {
      const px = pwr.x - this.cameraX;
      const py = pwr.y - this.cameraY + Math.sin(pwr.bobOffset) * 6;

      this.ctx.save();
      this.ctx.shadowColor = pwr.color;
      this.ctx.shadowBlur = 14;

      // Glow beacon ring
      this.ctx.strokeStyle = pwr.color;
      this.ctx.lineWidth = 2.5;
      this.ctx.beginPath();
      this.ctx.arc(px, py, pwr.radius, 0, Math.PI * 2);
      this.ctx.stroke();

      // Icon & label
      this.ctx.fillStyle = pwr.color;
      this.ctx.font = '16px "Chakra Petch", sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(pwr.icon, px, py);

      this.ctx.font = 'bold 10px "Chakra Petch", sans-serif';
      this.ctx.fillText(pwr.label, px, py - pwr.radius - 8);

      this.ctx.restore();
    });
  }

  private renderParticles() {
    this.particles.forEach((p) => {
      const px = p.x - this.cameraX;
      const py = p.y - this.cameraY;

      this.ctx.save();
      this.ctx.globalAlpha = Math.max(0, Math.min(1, p.alpha));
      this.ctx.fillStyle = p.color;

      if (p.type === 'ENERGY') {
        this.ctx.shadowColor = p.color;
        this.ctx.shadowBlur = 8;
      }

      this.ctx.beginPath();
      this.ctx.arc(px, py, p.radius, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    });
  }

  private renderFloatingText() {
    this.floatingTexts.forEach((ft) => {
      const fx = ft.x - this.cameraX;
      const fy = ft.y - this.cameraY;

      this.ctx.save();
      this.ctx.globalAlpha = ft.alpha;
      this.ctx.fillStyle = ft.color;
      this.ctx.font = ft.isCrit ? `bold ${ft.size}px "Chakra Petch", sans-serif` : `${ft.size}px "JetBrains Mono", monospace`;
      this.ctx.textAlign = 'center';
      this.ctx.shadowColor = ft.isCrit ? '#ef4444' : '#000000';
      this.ctx.shadowBlur = ft.isCrit ? 10 : 4;
      this.ctx.fillText(ft.text, fx, fy);
      this.ctx.restore();
    });
  }

  private renderScreenTints() {
    // Berserk Red Screen Tint & Vignette
    if (this.player.isBerserk) {
      this.ctx.save();
      const grad = this.ctx.createRadialGradient(
        this.screenWidth / 2, this.screenHeight / 2, this.screenWidth * 0.2,
        this.screenWidth / 2, this.screenHeight / 2, this.screenWidth * 0.7
      );
      grad.addColorStop(0, 'rgba(239, 68, 68, 0.05)');
      grad.addColorStop(1, 'rgba(185, 28, 28, 0.45)');
      this.ctx.fillStyle = grad;
      this.ctx.fillRect(0, 0, this.screenWidth, this.screenHeight);
      this.ctx.restore();
    }

    // Player Hurt Red Flash
    if (this.redFlashTimer > 0) {
      this.ctx.save();
      this.ctx.fillStyle = `rgba(220, 38, 38, ${this.redFlashTimer * 1.5})`;
      this.ctx.fillRect(0, 0, this.screenWidth, this.screenHeight);
      this.ctx.restore();
    }

    // Orbital Strike Blinding Whiteout Beam
    if (this.orbitalStrikeAnimTimer > 0) {
      this.ctx.save();
      this.ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(0.85, this.orbitalStrikeAnimTimer)})`;
      this.ctx.fillRect(0, 0, this.screenWidth, this.screenHeight);
      this.ctx.restore();
    }
  }

  private renderCrosshairAndHitMarkers() {
    const cx = this.mouseX;
    const cy = this.mouseY;

    this.ctx.save();

    // Crosshair rings
    const isReady = this.player.weaponStates[this.player.activeWeapon].currentAmmo > 0;
    this.ctx.strokeStyle = isReady ? '#06b6d4' : '#ef4444';
    this.ctx.lineWidth = 1.5;

    // Center dot
    this.ctx.fillStyle = isReady ? '#22d3ee' : '#f87171';
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, 2, 0, Math.PI * 2);
    this.ctx.fill();

    // Crosshair brackets
    const gap = 8;
    const len = 12;
    this.ctx.beginPath();
    // Top
    this.ctx.moveTo(cx, cy - gap);
    this.ctx.lineTo(cx, cy - gap - len);
    // Bottom
    this.ctx.moveTo(cx, cy + gap);
    this.ctx.lineTo(cx, cy + gap + len);
    // Left
    this.ctx.moveTo(cx - gap, cy);
    this.ctx.lineTo(cx - gap - len, cy);
    // Right
    this.ctx.moveTo(cx + gap, cy);
    this.ctx.lineTo(cx + gap + len, cy);
    this.ctx.stroke();

    // Directional Hit Markers around crosshair
    this.hitMarkers.forEach((marker) => {
      const radius = 24;
      const x = cx + Math.cos(marker.angle) * radius;
      const y = cy + Math.sin(marker.angle) * radius;

      this.ctx.save();
      this.ctx.translate(x, y);
      this.ctx.rotate(marker.angle);
      this.ctx.strokeStyle = marker.isCrit ? '#ef4444' : '#f8fafc';
      this.ctx.lineWidth = marker.isCrit ? 3.5 : 2.5;

      // Diagonal tick mark
      this.ctx.beginPath();
      this.ctx.moveTo(-4, -4);
      this.ctx.lineTo(4, 4);
      this.ctx.stroke();
      this.ctx.restore();
    });

    this.ctx.restore();
  }

  // Master Game Loop
  public loop(timestamp: number) {
    if (!this.lastTime) this.lastTime = timestamp;
    const dt = Math.min(0.1, (timestamp - this.lastTime) / 1000);
    this.lastTime = timestamp;

    this.update(dt);
    this.render();

    this.animFrameId = requestAnimationFrame((t) => this.loop(t));
  }

  public start() {
    if (this.animFrameId !== null) cancelAnimationFrame(this.animFrameId);
    this.lastTime = 0;
    this.animFrameId = requestAnimationFrame((t) => this.loop(t));
  }

  public destroy() {
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    soundEngine.stopAmbientMusic();
  }
}
