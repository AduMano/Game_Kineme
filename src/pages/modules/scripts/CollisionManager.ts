export const CollisionManagerCode = `/**
 * Global Collision Manager
 */
window.Collision = {
  /**
   * Simple Axis-Aligned Bounding Box (AABB) collision check.
   * @param {KinemeObject} obj1 - First object with x, y, width, height
   * @param {KinemeObject} obj2 - Second object with x, y, width, height
   * @returns {boolean} True if the objects are overlapping
   */
  checkAABB(obj1, obj2) {
    return (
      obj1.x < obj2.x + obj2.width &&
      obj1.x + obj1.width > obj2.x &&
      obj1.y < obj2.y + obj2.height &&
      obj1.y + obj1.height > obj2.y
    );
  }
};`;
