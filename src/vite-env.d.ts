/// <reference types="vite/client" />

// Tell TypeScript about our custom Kineme Engine global variables
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

// Add this interface to define what a "Live" object looks like in the runner
interface KinemeInstance {
  id: string;
  x: number;
  y: number;
  spriteProps: any;
  assetId: string | null;
  visible: boolean;
  _destroyed: boolean;
  destroy: () => void;
  onCreate?: () => void; // Optional because not all objects have code
  onStep?: () => void; // Optional because not all objects have code
}
