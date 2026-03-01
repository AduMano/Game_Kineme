export const InputManagerCode = `/**
 * Global Input Manager
 * Handles Keyboard and Mouse states.
 */
const Input = {
  _keys: {},
  _keysPressed: {},
  mouseX: 0,
  mouseY: 0,
  isMouseDown: false,
  isMousePressed: false,

  /**
   * Returns true if the key is currently held down.
   * @param {string} key - e.g. "ArrowLeft", " ", "w"
   * @returns {boolean}
   */
  isKeyDown(key) {
    return !!this._keys[key];
  },

  /**
   * Returns true only on the exact frame the key was pressed.
   * @param {string} key - e.g. "ArrowLeft", " ", "w"
   * @returns {boolean}
   */
  isKeyPressed(key) {
    return !!this._keysPressed[key];
  }
};`;
