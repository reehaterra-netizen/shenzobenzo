/**
 * Decal & Permanent Arena Floor Splatter System
 * Bakes blood splatters, synthetic black/cyan/crimson oil pools, severed droid limbs,
 * and scorch marks permanently onto the arena floor canvas.
 */

export class DecalManager {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.canvas = document.createElement('canvas');
    this.canvas.width = width;
    this.canvas.height = height;
    this.ctx = this.canvas.getContext('2d')!;
    this.clear();
  }

  public clear() {
    this.ctx.clearRect(0, 0, this.width, this.height);
  }

  public resize(width: number, height: number) {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = this.width;
    tempCanvas.height = this.height;
    const tempCtx = tempCanvas.getContext('2d');
    if (tempCtx) {
      tempCtx.drawImage(this.canvas, 0, 0);
    }

    this.width = width;
    this.height = height;
    this.canvas.width = width;
    this.canvas.height = height;
    this.ctx = this.canvas.getContext('2d')!;

    // Restore existing decals
    if (tempCtx) {
      this.ctx.drawImage(tempCanvas, 0, 0);
    }
  }

  // Add blood or oil splatter with directional droplets
  public addSplatter(
    x: number,
    y: number,
    color: string,
    radius: number = 24,
    direction?: number,
    droplets: number = 8
  ) {
    this.ctx.save();
    this.ctx.fillStyle = color;
    this.ctx.globalAlpha = 0.85;

    // Main pool
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius * (0.6 + Math.random() * 0.4), 0, Math.PI * 2);
    this.ctx.fill();

    // Jagged edges of pool
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2 + Math.random() * 0.5;
      const dist = radius * (0.5 + Math.random() * 0.6);
      const subRadius = radius * (0.2 + Math.random() * 0.35);
      this.ctx.beginPath();
      this.ctx.arc(x + Math.cos(angle) * dist, y + Math.sin(angle) * dist, subRadius, 0, Math.PI * 2);
      this.ctx.fill();
    }

    // Directional or radial droplet spray
    for (let i = 0; i < droplets; i++) {
      const sprayAngle = direction !== undefined 
        ? direction + (Math.random() - 0.5) * 1.4 
        : Math.random() * Math.PI * 2;
      const sprayDist = radius * 0.8 + Math.random() * (radius * 2.5);
      const dropRadius = 1.5 + Math.random() * (radius * 0.2);

      const dropX = x + Math.cos(sprayAngle) * sprayDist;
      const dropY = y + Math.sin(sprayAngle) * sprayDist;

      this.ctx.beginPath();
      // Elliptical droplet pointing in travel direction
      this.ctx.ellipse(
        dropX,
        dropY,
        dropRadius * 1.5,
        dropRadius * 0.8,
        sprayAngle,
        0,
        Math.PI * 2
      );
      this.ctx.fill();
    }

    this.ctx.restore();
  }

  // Scorch mark from explosions, railgun burns, or plasma shots
  public addScorch(x: number, y: number, radius: number = 32, isLinear: boolean = false, angle: number = 0, length: number = 0) {
    this.ctx.save();
    if (isLinear && length > 0) {
      // Railgun burn stripe on floor
      this.ctx.translate(x, y);
      this.ctx.rotate(angle);
      const grad = this.ctx.createLinearGradient(0, -radius, 0, radius);
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(0.5, 'rgba(0,0,0,0.7)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      this.ctx.fillStyle = grad;
      this.ctx.fillRect(0, -radius, length, radius * 2);

      // Neon residual scorch line in center
      this.ctx.fillStyle = 'rgba(6, 182, 212, 0.25)';
      this.ctx.fillRect(0, -2, length, 4);
    } else {
      // Circular blast crater / scorch
      const grad = this.ctx.createRadialGradient(x, y, radius * 0.2, x, y, radius);
      grad.addColorStop(0, 'rgba(10, 10, 10, 0.85)');
      grad.addColorStop(0.5, 'rgba(25, 20, 20, 0.5)');
      grad.addColorStop(0.8, 'rgba(40, 30, 20, 0.2)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

      this.ctx.fillStyle = grad;
      this.ctx.beginPath();
      this.ctx.arc(x, y, radius, 0, Math.PI * 2);
      this.ctx.fill();
    }
    this.ctx.restore();
  }

  // Severed droid limbs, chassis parts, or bio-mech head gibs baked into floor
  public addSeveredLimb(
    x: number,
    y: number,
    angle: number,
    type: 'ARM' | 'LEG' | 'CHASSIS' | 'HEAD',
    color: string = '#64748b'
  ) {
    this.ctx.save();
    this.ctx.translate(x, y);
    this.ctx.rotate(angle);
    this.ctx.globalAlpha = 0.9;

    // Small oil puddle beneath the severed limb
    this.ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
    this.ctx.beginPath();
    this.ctx.ellipse(0, 0, 14, 8, 0, 0, Math.PI * 2);
    this.ctx.fill();

    // Cybernetic limb piece
    this.ctx.fillStyle = color;
    this.ctx.strokeStyle = '#0f172a';
    this.ctx.lineWidth = 1.5;

    if (type === 'ARM') {
      this.ctx.fillRect(-10, -3, 20, 6);
      this.ctx.strokeRect(-10, -3, 20, 6);
      // Joint ring
      this.ctx.fillStyle = '#06b6d4';
      this.ctx.fillRect(4, -2, 3, 4);
    } else if (type === 'LEG') {
      this.ctx.beginPath();
      this.ctx.moveTo(-12, -4);
      this.ctx.lineTo(8, -2);
      this.ctx.lineTo(14, 6);
      this.ctx.lineTo(8, 6);
      this.ctx.lineTo(-12, 1);
      this.ctx.closePath();
      this.ctx.fill();
      this.ctx.stroke();
    } else if (type === 'HEAD') {
      this.ctx.beginPath();
      this.ctx.arc(0, 0, 8, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.stroke();
      // Glowing shattered eye
      this.ctx.fillStyle = '#ef4444';
      this.ctx.beginPath();
      this.ctx.arc(3, 0, 2.5, 0, Math.PI * 2);
      this.ctx.fill();
    } else {
      // Chassis metal plate
      this.ctx.beginPath();
      this.ctx.moveTo(-10, -8);
      this.ctx.lineTo(12, -6);
      this.ctx.lineTo(8, 9);
      this.ctx.lineTo(-8, 7);
      this.ctx.closePath();
      this.ctx.fill();
      this.ctx.stroke();
    }

    this.ctx.restore();
  }

  public render(targetCtx: CanvasRenderingContext2D, cameraX: number, cameraY: number) {
    targetCtx.drawImage(this.canvas, -cameraX, -cameraY);
  }
}
