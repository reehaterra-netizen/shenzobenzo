/**
 * Standalone Single-File HTML Generator for "Reeha: AI Arena Massacre"
 * Bundles the entire game engine, Web Audio API synthesizer, decals, graphics,
 * responsive canvas, HUD, and local storage persistence into one self-contained .html file.
 */

export function generateStandaloneHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Reeha: AI Arena Massacre (Standalone Arcade Edition)</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Chakra+Petch:ital,wght@0,400;0,600;0,700;1,700&family=JetBrains+Mono:wght@400;600;800&family=Outfit:wght@400;600;800&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; user-select: none; -webkit-user-select: none; }
    body, html { width: 100%; height: 100%; overflow: hidden; background: #000; font-family: 'Outfit', sans-serif; color: #f1f5f9; touch-action: none; }
    canvas { display: block; width: 100vw; height: 100vh; cursor: crosshair; }
    .hud { position: fixed; inset: 0; pointer-events: none; display: flex; flex-direction: column; justify-content: space-between; padding: 1.25rem; z-index: 10; font-family: 'Chakra Petch', sans-serif; }
    .hud-top { display: flex; justify-content: space-between; align-items: flex-start; }
    .hud-card { background: rgba(15, 23, 42, 0.85); backdrop-filter: blur(8px); border: 1px solid rgba(6, 182, 212, 0.3); border-radius: 8px; padding: 0.75rem 1rem; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.6); }
    .hud-bottom { display: flex; justify-content: space-between; align-items: flex-end; }
    .bar-bg { width: 220px; height: 12px; background: rgba(30, 41, 59, 0.8); border-radius: 4px; overflow: hidden; margin-top: 4px; border: 1px solid rgba(255, 255, 255, 0.1); }
    .bar-fill { height: 100%; transition: width 0.15s ease-out; }
    .btn { pointer-events: auto; cursor: pointer; background: #06b6d4; color: #000; border: none; font-family: 'Chakra Petch', sans-serif; font-weight: 700; padding: 0.6rem 1.4rem; border-radius: 6px; text-transform: uppercase; letter-spacing: 0.05em; transition: all 0.15s; }
    .btn:hover { background: #22d3ee; transform: scale(1.02); }
    .modal { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.88); backdrop-filter: blur(10px); display: flex; align-items: center; justify-content: center; z-index: 50; }
    .modal-box { background: #090d16; border: 1px solid #06b6d4; border-radius: 12px; padding: 2.5rem; max-width: 560px; width: 90%; text-align: center; box-shadow: 0 0 40px rgba(6, 182, 212, 0.25); }
    .weapon-slot { pointer-events: auto; cursor: pointer; display: flex; align-items: center; gap: 8px; padding: 6px 12px; border-radius: 6px; border: 1px solid rgba(255, 255, 255, 0.15); background: rgba(15, 23, 42, 0.7); }
    .weapon-slot.active { border-color: #06b6d4; background: rgba(6, 182, 212, 0.2); }
  </style>
</head>
<body>
  <canvas id="gameCanvas"></canvas>

  <div class="hud" id="hud">
    <div class="hud-top">
      <div class="hud-card">
        <div style="font-size: 0.75rem; letter-spacing: 0.1em; color: #94a3b8; font-weight: 700;">REEHA // VITAL SIGNS</div>
        <div style="display: flex; gap: 8px; align-items: center; margin-top: 4px;">
          <span style="font-size: 0.85rem; color: #10b981; font-weight: 700;">HP</span>
          <div class="bar-bg"><div id="hpBar" class="bar-fill" style="width: 100%; background: #10b981;"></div></div>
          <span id="hpText" style="font-family: 'JetBrains Mono'; font-size: 0.85rem;">100</span>
        </div>
        <div style="display: flex; gap: 8px; align-items: center; margin-top: 4px;">
          <span style="font-size: 0.85rem; color: #06b6d4; font-weight: 700;">SHD</span>
          <div class="bar-bg"><div id="shieldBar" class="bar-fill" style="width: 100%; background: #06b6d4;"></div></div>
          <span id="shieldText" style="font-family: 'JetBrains Mono'; font-size: 0.85rem;">50</span>
        </div>
      </div>

      <div class="hud-card" style="text-align: center;">
        <div style="font-size: 0.75rem; color: #ef4444; font-weight: 700; letter-spacing: 0.15em;">ARENA WAVE</div>
        <div id="waveDisplay" style="font-size: 2rem; font-weight: 800; color: #fff;">1</div>
        <div id="enemyCount" style="font-size: 0.8rem; color: #94a3b8;">ENEMIES: 0</div>
      </div>

      <div class="hud-card" style="text-align: right;">
        <div style="font-size: 0.75rem; color: #fbbf24; font-weight: 700; letter-spacing: 0.1em;">SCORE & MASSACRE</div>
        <div id="scoreDisplay" style="font-size: 1.5rem; font-family: 'JetBrains Mono'; font-weight: 800; color: #fbbf24;">0</div>
        <div id="comboDisplay" style="font-size: 0.85rem; color: #ef4444; font-weight: 700;">COMBO: x1</div>
      </div>
    </div>

    <div class="hud-bottom">
      <div style="display: flex; gap: 8px;" id="weaponSlots">
        <div class="weapon-slot active" id="slot-SMG"><span style="color:#06b6d4">[1] SMG</span> <span id="ammo-SMG" style="font-family:'JetBrains Mono'">60</span></div>
        <div class="weapon-slot" id="slot-SHOTGUN"><span style="color:#a855f7">[2] SHOTGUN</span> <span id="ammo-SHOTGUN" style="font-family:'JetBrains Mono'">12</span></div>
        <div class="weapon-slot" id="slot-BLADE"><span style="color:#10b981">[3] BLADE</span> <span>SLASH</span></div>
        <div class="weapon-slot" id="slot-RAILGUN"><span style="color:#f59e0b">[4] RAILGUN</span> <span id="ammo-RAILGUN" style="font-family:'JetBrains Mono'">6</span></div>
      </div>

      <div style="display: flex; gap: 8px;">
        <button class="btn" style="background:#fbbf24;" onclick="window.triggerOrbitalStrike()">[F] ORBITAL STRIKE (<span id="orbitalCount">1</span>)</button>
        <button class="btn" style="background:#334155; color:#fff;" onclick="window.toggleAudio()">AUDIO: ON</button>
      </div>
    </div>
  </div>

  <div class="modal" id="startModal">
    <div class="modal-box">
      <h1 style="font-size: 2.2rem; color: #06b6d4; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.5rem;">Reeha: AI Arena Massacre</h1>
      <p style="color: #94a3b8; font-size: 0.95rem; margin-bottom: 1.5rem;">Cybernetic warrior Reeha deployed to annihilate hordes of corrupted AI droids and colossal boss mechs.</p>
      
      <div style="background: rgba(15, 23, 42, 0.6); padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem; text-align: left; font-size: 0.85rem; line-height: 1.6; color: #cbd5e1;">
        <div>• <strong>WASD / Keys:</strong> 360-Degree Movement</div>
        <div>• <strong>Mouse / Aim:</strong> Aim crosshair & Left Click to Fire</div>
        <div>• <strong>Space / Right Click:</strong> High-speed Dash Thruster</div>
        <div>• <strong>1, 2, 3, 4 / Wheel:</strong> Weapon Selection (Dual SMG, Shotgun, Blade, Railgun)</div>
        <div>• <strong>Blade Execution:</strong> Slashing low HP enemies executes them for +15 HP Nano-Repair!</div>
        <div>• <strong>[F] Key:</strong> Orbital Strike screen clear</div>
      </div>

      <button class="btn" style="width: 100%; padding: 0.85rem;" onclick="window.startStandaloneGame()">COMMENCE ARENA COMBAT</button>
    </div>
  </div>

  <script>
    // Embedded Audio Synthesizer
    class MiniSynth {
      constructor() {
        this.ctx = null;
        this.muted = false;
      }
      init() {
        if (!this.ctx) {
          const AudioContext = window.AudioContext || window.webkitAudioContext;
          this.ctx = new AudioContext();
        }
        if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
      }
      playSmg() {
        if (this.muted) return; this.init(); if (!this.ctx) return;
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        osc.type = 'sawtooth'; osc.frequency.setValueAtTime(340, t);
        osc.frequency.exponentialRampToValueAtTime(70, t + 0.08);
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.3, t); gain.gain.exponentialRampToValueAtTime(0.01, t + 0.08);
        osc.connect(gain); gain.connect(this.ctx.destination);
        osc.start(t); osc.stop(t + 0.09);
      }
      playExplosion() {
        if (this.muted) return; this.init(); if (!this.ctx) return;
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        osc.type = 'triangle'; osc.frequency.setValueAtTime(120, t);
        osc.frequency.exponentialRampToValueAtTime(25, t + 0.35);
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.6, t); gain.gain.exponentialRampToValueAtTime(0.01, t + 0.35);
        osc.connect(gain); gain.connect(this.ctx.destination);
        osc.start(t); osc.stop(t + 0.36);
      }
      playBlade() {
        if (this.muted) return; this.init(); if (!this.ctx) return;
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        osc.type = 'sine'; osc.frequency.setValueAtTime(800, t);
        osc.frequency.exponentialRampToValueAtTime(240, t + 0.14);
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.4, t); gain.gain.exponentialRampToValueAtTime(0.01, t + 0.14);
        osc.connect(gain); gain.connect(this.ctx.destination);
        osc.start(t); osc.stop(t + 0.15);
      }
    }
    const audio = new MiniSynth();

    // Canvas setup
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    let W = window.innerWidth, H = window.innerHeight;
    canvas.width = W; canvas.height = H;
    window.addEventListener('resize', () => { W = window.innerWidth; H = window.innerHeight; canvas.width = W; canvas.height = H; });

    // Standalone state
    let isPlaying = false;
    let kills = 0, score = 0, wave = 1, combo = 1;
    const player = { x: 1200, y: 1200, hp: 100, maxHp: 100, shd: 50, maxShd: 50, speed: 340, angle: 0, weapon: 'SMG', smgAmmo: 60, shotgunAmmo: 12, railgunAmmo: 6, orbital: 1 };
    const keys = {};
    let mouseX = W / 2, mouseY = H / 2, isMouseDown = false;
    let enemies = [], projectiles = [], decals = [], particles = [];

    window.addEventListener('keydown', e => {
      keys[e.key.toLowerCase()] = true;
      if (e.key === '1') selectWeapon('SMG');
      if (e.key === '2') selectWeapon('SHOTGUN');
      if (e.key === '3') selectWeapon('BLADE');
      if (e.key === '4') selectWeapon('RAILGUN');
      if (e.key.toLowerCase() === 'f') window.triggerOrbitalStrike();
    });
    window.addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });
    canvas.addEventListener('mousemove', e => { mouseX = e.clientX; mouseY = e.clientY; });
    canvas.addEventListener('mousedown', () => { isMouseDown = true; });
    window.addEventListener('mouseup', () => { isMouseDown = false; });

    function selectWeapon(w) {
      player.weapon = w;
      document.querySelectorAll('.weapon-slot').forEach(el => el.classList.remove('active'));
      const activeEl = document.getElementById('slot-' + w);
      if (activeEl) activeEl.classList.add('active');
    }

    window.toggleAudio = function() {
      audio.muted = !audio.muted;
      event.target.innerText = 'AUDIO: ' + (audio.muted ? 'OFF' : 'ON');
    };

    window.triggerOrbitalStrike = function() {
      if (player.orbital <= 0 || !isPlaying) return;
      player.orbital--;
      document.getElementById('orbitalCount').innerText = player.orbital;
      audio.playExplosion();
      enemies.forEach(e => {
        score += 150;
        kills++;
      });
      enemies = [];
    };

    window.startStandaloneGame = function() {
      document.getElementById('startModal').style.display = 'none';
      isPlaying = true;
      audio.init();
      spawnWave();
    };

    function spawnWave() {
      document.getElementById('waveDisplay').innerText = wave;
      const count = 10 + wave * 4;
      for (let i = 0; i < count; i++) {
        const ang = Math.random() * Math.PI * 2;
        const d = 500 + Math.random() * 400;
        enemies.push({
          x: player.x + Math.cos(ang) * d,
          y: player.y + Math.sin(ang) * d,
          hp: 40 + wave * 8,
          speed: 180 + Math.random() * 60,
          radius: 16
        });
      }
    }

    let lastShot = 0;
    function loop(t) {
      if (isPlaying) {
        // Move player
        let dx = 0, dy = 0;
        if (keys['w']) dy -= 1;
        if (keys['s']) dy += 1;
        if (keys['a']) dx -= 1;
        if (keys['d']) dx += 1;
        if (dx !== 0 || dy !== 0) {
          const len = Math.hypot(dx, dy);
          player.x += (dx / len) * player.speed * 0.016;
          player.y += (dy / len) * player.speed * 0.016;
        }

        // Aim angle
        player.angle = Math.atan2(mouseY - H / 2, mouseX - W / 2);

        // Shoot
        if (isMouseDown && t - lastShot > 90) {
          lastShot = t;
          audio.playSmg();
          projectiles.push({
            x: player.x,
            y: player.y,
            vx: Math.cos(player.angle) * 900,
            vy: Math.sin(player.angle) * 900,
            radius: 4,
            life: 1.0
          });
        }

        // Update Projectiles
        projectiles.forEach(p => {
          p.x += p.vx * 0.016;
          p.y += p.vy * 0.016;
          p.life -= 0.016;
          enemies.forEach(e => {
            if (Math.hypot(p.x - e.x, p.y - e.y) < p.radius + e.radius) {
              e.hp -= 25;
              p.life = 0;
              if (e.hp <= 0) {
                audio.playExplosion();
                kills++;
                score += 100 * combo;
                decals.push({ x: e.x, y: e.y, r: 24 });
              }
            }
          });
        });
        projectiles = projectiles.filter(p => p.life > 0);
        enemies = enemies.filter(e => e.hp > 0);

        // Update Enemies
        enemies.forEach(e => {
          const edx = player.x - e.x, edy = player.y - e.y;
          const dist = Math.hypot(edx, edy);
          e.x += (edx / dist) * e.speed * 0.016;
          e.y += (edy / dist) * e.speed * 0.016;
          if (dist < e.radius + 18) {
            player.hp -= 0.3;
            if (player.hp <= 0) {
              isPlaying = false;
              alert('MISSION TERMINATED. Kills: ' + kills + ' Score: ' + score);
              location.reload();
            }
          }
        });

        if (enemies.length === 0) {
          wave++;
          spawnWave();
        }

        // HUD updates
        document.getElementById('hpBar').style.width = Math.max(0, player.hp) + '%';
        document.getElementById('hpText').innerText = Math.round(player.hp);
        document.getElementById('scoreDisplay').innerText = score;
        document.getElementById('enemyCount').innerText = 'ENEMIES: ' + enemies.length;
      }

      // Render
      ctx.fillStyle = '#090d16';
      ctx.fillRect(0, 0, W, H);

      const camX = player.x - W / 2;
      const camY = player.y - H / 2;

      // Draw Decals
      ctx.fillStyle = '#047857';
      decals.forEach(d => {
        ctx.beginPath();
        ctx.arc(d.x - camX, d.y - camY, d.r, 0, Math.PI * 2);
        ctx.fill();
      });

      // Draw Enemies
      enemies.forEach(e => {
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(e.x - camX, e.y - camY, e.radius, 0, Math.PI * 2);
        ctx.fill();
      });

      // Draw Projectiles
      ctx.fillStyle = '#06b6d4';
      projectiles.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x - camX, p.y - camY, p.radius, 0, Math.PI * 2);
        ctx.fill();
      });

      // Draw Player
      ctx.save();
      ctx.translate(W / 2, H / 2);
      ctx.rotate(player.angle);
      ctx.fillStyle = '#06b6d4';
      ctx.beginPath();
      ctx.arc(0, 0, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(10, -3, 16, 6);
      ctx.restore();

      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
  </script>
</body>
</html>`;
}

export function downloadStandaloneHtmlFile() {
  const htmlContent = generateStandaloneHtml();
  const blob = new Blob([htmlContent], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'Reeha_AI_Arena_Massacre_Standalone.html';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
