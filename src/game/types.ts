export type GameState = 'TITLE' | 'PLAYING' | 'PAUSED' | 'GAME_OVER' | 'VICTORY';

export type WeaponType = 'SMG' | 'SHOTGUN' | 'BLADE' | 'RAILGUN';

export interface WeaponConfig {
  id: WeaponType;
  name: string;
  shortName: string;
  damage: number;
  fireRate: number; // shots per second or interval
  ammoMax: number;
  reloadTime: number; // in seconds
  spread: number; // radians
  pellets: number;
  projectileSpeed: number;
  range: number;
  knockback: number;
  piercing: boolean;
  color: string;
  accentColor: string;
  description: string;
}

export interface WeaponState {
  currentAmmo: number;
  maxAmmo: number;
  lastShotTime: number;
  isReloading: boolean;
  reloadProgress: number; // 0 to 1
}

export type EnemyType = 'STALKER' | 'ENFORCER' | 'EXPLOSIVE_DRONE' | 'BIO_MECH' | 'BOSS_OVERSEER' | 'BOSS_BEHEMOTH';

export interface Enemy {
  id: string;
  type: EnemyType;
  x: number;
  y: number;
  radius: number;
  angle: number;
  speed: number;
  health: number;
  maxHealth: number;
  shield?: number;
  maxShield?: number;
  damage: number;
  scoreValue: number;
  color: string;
  isBoss: boolean;
  bossTitle?: string;
  lastAttackTime: number;
  attackCooldown: number;
  stateTimer: number;
  flashTimer: number; // flash white/red on damage
  vx: number;
  vy: number;
  // Special AI behaviors
  phase?: number;
  isCharging?: boolean;
  chargeTarget?: { x: number; y: number };
  fuseTimer?: number; // for explosive drones
  isBeeping?: boolean;
}

export interface Projectile {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  damage: number;
  isPlayer: boolean;
  color: string;
  trailColor: string;
  piercing: boolean;
  hitEnemies: Set<string>;
  lifespan: number;
  maxLifespan: number;
  type: 'BULLET' | 'PLASMA' | 'RAILGUN_BEAM' | 'ENEMY_LASER' | 'HOMING_MISSILE' | 'SHOCKWAVE' | 'BLADE_SLASH';
  // Homing or special properties
  targetId?: string;
  angle?: number;
  pierceCount?: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  alpha: number;
  decay: number;
  type: 'SPARK' | 'BLOOD' | 'OIL' | 'SMOKE' | 'ENERGY' | 'DEBRIS' | 'SEVERED_LIMB';
  rotation?: number;
  vRot?: number;
  sizeW?: number;
  sizeH?: number;
}

export interface Decal {
  x: number;
  y: number;
  type: 'BLOOD_SPLAT' | 'OIL_SPLAT' | 'SCORCH' | 'LIMB' | 'CRATER';
  radius: number;
  color: string;
  angle: number;
  points?: { x: number; y: number; r: number }[];
}

export type PowerUpType = 'BERSERK' | 'ORBITAL' | 'NANO_REPAIR' | 'AMMO_CACHE';

export interface PowerUp {
  id: string;
  type: PowerUpType;
  x: number;
  y: number;
  radius: number;
  duration?: number;
  color: string;
  icon: string;
  label: string;
  bobOffset: number;
}

export interface FloatingText {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
  size: number;
  alpha: number;
  vy: number;
  isCrit?: boolean;
}

export interface HitMarker {
  angle: number;
  intensity: number;
  time: number;
  isCrit: boolean;
}

export interface PlayerStats {
  kills: number;
  totalDamageDealt: number;
  score: number;
  currentCombo: number;
  maxCombo: number;
  comboTimer: number; // seconds remaining before combo drops
  wave: number;
  executions: number;
  bossesDefeated: number;
}

export interface HighScoreRecord {
  score: number;
  kills: number;
  maxCombo: number;
  highestWave: number;
  date: string;
}
