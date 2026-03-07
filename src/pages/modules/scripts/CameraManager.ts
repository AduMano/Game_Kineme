export const CameraManagerCode = `/**
 * Global Camera Manager
 * Controls the viewport and follows target objects.
 */
window.Camera = {
    x: 0, y: 0, width: 800, height: 600, roomWidth: 800, roomHeight: 600,
    target: null,
    panDelay: 0.1, // Smooth panning (lower = slower, 1 = instant snap)

    follow(instance) {
        this.target = instance;
    },

    update() {
        if (this.target) {
            // Find the center of the target
            const targetX = this.target.x - (this.width / 2) + (this.target.width / 2);
            const targetY = this.target.y - (this.height / 2) + (this.target.height / 2);

            // Lerp (smooth move) towards target
            this.x += (targetX - this.x) * this.panDelay;
            this.y += (targetY - this.y) * this.panDelay;
        }

        // Clamp camera so it never looks outside the Room borders!
        this.x = Math.max(0, Math.min(this.x, this.roomWidth - this.width));
        this.y = Math.max(0, Math.min(this.y, this.roomHeight - this.height));
    }
};`;
