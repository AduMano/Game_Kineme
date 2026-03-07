export const InputManagerCode = `/**
 * Global Input Manager
 * Handles Keyboard and Mouse states.
 */
window.Input = {
    keys: {},
    keysPressed: {},

    init() {
        window.addEventListener("keydown", (e) => {
            // Only trigger "pressed" on the exact frame it goes down
            if (!this.keys[e.code]) {
                this.keysPressed[e.code] = true;
            }
            this.keys[e.code] = true;
        });
        window.addEventListener("keyup", (e) => {
            this.keys[e.code] = false;
        });
    },

    update() {
        // Clear the "pressed" state at the end of every frame
        this.keysPressed = {};
    },

    isKeyDown(code) { return !!this.keys[code]; },
    isKeyPressed(code) { return !!this.keysPressed[code]; }
};

// Initialize immediately when the script runs!
window.Input.init();`;
