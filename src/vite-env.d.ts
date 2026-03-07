/// <reference types="vite/client" />

export {};

declare global {
  interface Window {
    Camera: {
      x: number;
      y: number;
      width: number;
      height: number;
      roomWidth: number;
      roomHeight: number;
      target: any;
      panDelay: number;
      clampToRoom: boolean;
      follow: (instance: any) => void;
      update: () => void;
    };
    Input: {
      keys: Record<string, boolean>;
      keysPressed: Record<string, boolean>;
      init: () => void;
      update: () => void;
      isKeyDown: (code: string) => boolean;
      isKeyPressed: (code: string) => boolean;
    };
    Sprites: Record<string, string>;
  }

  interface KinemeInstance {
    id: string;
    layerId: string; // NEW: Tracks which layer this object belongs to
    spriteId: string | null; // NEW: The current sprite being drawn
    x: number;
    y: number;
    width: number;
    height: number;
    scaleX: number;
    scaleY: number;
    angle: number;
    alpha: number;
    tint: string;
    animationSpeed: number; // NEW: Multiplier for sprite animation (1 = normal)
    spriteProps: any;
    assetId: string | null;
    visible: boolean;
    _destroyed: boolean;
    destroy: () => void;
    onCreate?: () => void;
    onStep?: () => void;
  }
}
