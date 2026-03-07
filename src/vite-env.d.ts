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
  }

  interface KinemeInstance {
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    scaleX: number;
    scaleY: number;
    angle: number; // Rotation in degrees
    alpha: number; // Opacity (0.0 to 1.0)
    tint: string; // Hex color (e.g., "#ffffff") - for future implementation
    spriteProps: any;
    assetId: string | null;
    visible: boolean;
    _destroyed: boolean;
    destroy: () => void;
    onCreate?: () => void; // Optional because not all objects have code
    onStep?: () => void; // Optional because not all objects have code
  }
}
