export const CameraManagerCode = `/**
 * Global Camera Manager
 * Controls the viewport and follows target objects.
 */
window.Camera = {
  x: 0,
  y: 0,
  width: 800,
  height: 600,
  roomWidth: 800,
  roomHeight: 600,
  target: null,
  panDelay: 0.1,
  clampToRoom: true,

  follow(instance) {
    this.target = instance;
  },

  update() {
    if (this.target) {
      const targetX = this.target.x - (this.width / 2);
      const targetY = this.target.y - (this.height / 2);
      this.x += (targetX - this.x) * this.panDelay;
      this.y += (targetY - this.y) * this.panDelay;
    }
    if (this.clampToRoom) {
      this.x = Math.max(0, Math.min(this.x, this.roomWidth - this.width));
      this.y = Math.max(0, Math.min(this.y, this.roomHeight - this.height));
    }
  }
};`;
