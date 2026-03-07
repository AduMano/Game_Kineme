import { useEffect, useRef, useState } from "react";
import { useResourcesStore } from "./modules/stores/useResourcesStore";
import { loadFileFromDB } from "./modules/stores/utilities/indexedDB";

export const RenderGamePage = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isRunning = true;
    let animationFrameId: number;

    const startEngine = async () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const resources = useResourcesStore.getState().resources;

      const findItems = (type: string, arr: any[]): any[] => {
        let result: any[] = [];
        arr.forEach((item) => {
          if (item.icon === type) result.push(item);
          if (item.subDirectory)
            result = result.concat(findItems(type, item.subDirectory));
        });
        return result;
      };

      const scripts = findItems("Script", resources);
      const sprites = findItems("Image", resources);
      let globalCode = "";

      // 1.5 CREATE GLOBAL SPRITES DICTIONARY
      // This allows you to type this.spriteId = Sprites.PlayerRun
      globalCode += `window.Sprites = {\n`;
      sprites.forEach((s) => {
        // Strip spaces/symbols so it becomes a valid JavaScript property name
        const cleanName = s.label.replace(/[^a-zA-Z0-9]/g, "");
        globalCode += `  "${cleanName}": "${s.id}",\n`;
      });
      globalCode += `};\n`;

      scripts.forEach((script) => {
        if (script.data?.code) {
          const pureCode = script.data.code
            .replace(/^export\s+const\s+\w+\s+=\s+`/, "")
            .replace(/`;\s*$/, "");

          globalCode += `\n/* --- ${script.label} --- */\n${pureCode}\n`;
        }
      });

      const scriptTag = document.createElement("script");
      scriptTag.innerHTML = globalCode;
      document.head.appendChild(scriptTag);

      // 2. FIND DEFAULT ROOM
      const rooms = findItems("Room", resources);
      const defaultRoom =
        rooms.find((r) => r.data?.roomProps?.isDefault) || rooms[0];
      if (!defaultRoom) return setError("No Default Room found!");

      const roomData = defaultRoom.data;
      const roomProps = roomData.roomProps;
      const camData = roomData.camera;

      canvas.width = camData.width;
      canvas.height = camData.height;

      // Initialize Camera from Room Properties if window.Camera exists
      if (window.Camera) {
        window.Camera.x = camData.x;
        window.Camera.y = camData.y;
        window.Camera.width = camData.width;
        window.Camera.height = camData.height;
        window.Camera.roomWidth = roomProps.width;
        window.Camera.roomHeight = roomProps.height;
      }

      // 3. PRE-LOAD ALL IMAGE ASSETS FROM INDEXEDDB
      const imageCache: Record<string, HTMLImageElement> = {};
      const loadPromises: Promise<void>[] = [];

      sprites.forEach((sprite) => {
        const assetId = sprite.data?.assetId;
        if (assetId) {
          const p = loadFileFromDB(assetId).then((blob) => {
            if (blob) {
              return new Promise<void>((resolve) => {
                const img = new Image();
                img.onload = () => resolve();
                img.onerror = () => {
                  console.warn(`Failed to load image asset: ${assetId}`);
                  resolve(); // Resolve anyway so the engine doesn't freeze!
                };
                img.src = URL.createObjectURL(blob);
                imageCache[assetId] = img;
              });
            }
          });
          loadPromises.push(p);
        }
      });

      await Promise.all(loadPromises);
      if (!isRunning) return; // Prevent memory leak if user closed tab during load
      setIsLoading(false);

      // 4. INSTANTIATE OBJECTS AND COMPILE CODE
      const objects = findItems("Object", resources);
      const liveInstances: KinemeInstance[] = [];

      roomData.layers.forEach((layer: any) => {
        if (layer.type === "instances" && layer.visible) {
          layer.instances.forEach((inst: any) => {
            const baseObj = objects.find((o) => o.id === inst.objectId);
            if (!baseObj) return;

            const spriteResource = baseObj.data?.spriteId
              ? sprites.find((s) => s.id === baseObj.data.spriteId)
              : null;
            const sprProps = spriteResource?.data?.spriteProps || null;
            const assetId = spriteResource?.data?.assetId || null;

            const liveObj = {
              id: inst.id,
              layerId: layer.id, // Track layer for parallax ordering!
              spriteId: baseObj.data?.spriteId || null, // Dynamic sprite tracking!
              x: inst.x,
              y: inst.y,
              width: sprProps?.width || 32,
              height: sprProps?.height || 32,
              scaleX: 1,
              scaleY: 1,
              angle: 0,
              alpha: 1,
              animationSpeed: 1,
              tint: "#ffffff",
              spriteProps: sprProps,
              assetId: assetId,
              visible: true,
              _destroyed: false,
              destroy: function () {
                this._destroyed = true;
              },
            } as KinemeInstance;

            try {
              const onCreateFunc = new Function(
                "self",
                baseObj.data?.events?.onCreate || "",
              );
              const onStepFunc = new Function(
                "self",
                baseObj.data?.events?.onStep || "",
              );

              // THIS IS THE MAGIC: Bind the function to 'this' AND pass it as 'self'
              liveObj.onCreate = function () {
                onCreateFunc.call(this, this);
              };
              liveObj.onStep = function () {
                onStepFunc.call(this, this);
              };

              liveInstances.push(liveObj);
            } catch (err) {
              console.error(
                `Compilation Error in Object ${baseObj.label}:`,
                err,
              );
            }
          });
        }
      });

      // FIRE ALL ONCREATE EVENTS
      liveInstances.forEach((inst) => {
        if (inst.onCreate) inst.onCreate();
      });

      // 5. THE MASTER GAME LOOP
      const gameLoop = (time: number) => {
        if (!isRunning) return;

        // --- UPDATE PHASE ---
        if (window.Camera && window.Camera.update) window.Camera.update();

        liveInstances.forEach((inst) => {
          if (!inst._destroyed && inst.onStep) inst.onStep();
        });

        // --- DRAW PHASE ---
        ctx.fillStyle = "#000000";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // SAVE #1: Save the raw canvas state before moving the camera
        ctx.save();

        // Handle Camera offset (Math.round prevents pixel jitter!)
        const camX = Math.round(window.Camera ? window.Camera.x : camData.x);
        const camY = Math.round(window.Camera ? window.Camera.y : camData.y);
        ctx.translate(-camX, -camY);

        // Draw Backgrounds
        roomData.layers.forEach((layer: any) => {
          if (layer.type === "background" && layer.visible) {
            const spriteNodeId =
              layer.backgroundAssetId ||
              layer.spriteId ||
              layer.backgroundSpriteId;

            if (spriteNodeId) {
              const spriteResource = sprites.find((s) => s.id === spriteNodeId);
              const actualAssetId = spriteResource?.data?.assetId;

              if (actualAssetId) {
                const bgImg = imageCache[actualAssetId];

                if (bgImg) {
                  const px =
                    camX *
                    (layer.parallaxX !== undefined ? layer.parallaxX : 1);
                  const py =
                    camY *
                    (layer.parallaxY !== undefined ? layer.parallaxY : 1);

                  ctx.drawImage(bgImg, px, py);
                }
              }
            }
          }
        });

        // Draw Instances (WITH ANIMATION LOGIC)
        liveInstances.forEach((inst) => {
          if (inst._destroyed || !inst.visible || !inst.assetId) return;
          const img = imageCache[inst.assetId];
          const sp = inst.spriteProps;
          if (!img || !sp) return;

          const totalFrames = sp.rows * sp.cols;
          let currentFrame = 0;

          if (totalFrames > 1 && sp.fps > 0 && inst.animationSpeed > 0) {
            const frameDuration = 1000 / (sp.fps * inst.animationSpeed);
            currentFrame = Math.floor(time / frameDuration) % totalFrames;
          }

          const col = currentFrame % sp.cols;
          const row = Math.floor(currentFrame / sp.cols);

          const sx = sp.offsetX + col * (sp.width + sp.gap);
          const sy = sp.offsetY + row * (sp.height + sp.gap);

          // SAVE #2: Save camera state before moving object
          ctx.save();

          // 1. Move the canvas origin to the object's exact x/y position
          ctx.translate(inst.x, inst.y);

          if (inst.angle !== 0) ctx.rotate((inst.angle * Math.PI) / 180);
          if (inst.scaleX !== 1 || inst.scaleY !== 1)
            ctx.scale(inst.scaleX, inst.scaleY);
          if (inst.alpha !== 1) ctx.globalAlpha = inst.alpha;

          // Now draw the image relative to the new origin (-originX and -originY)
          ctx.drawImage(
            img,
            sx,
            sy,
            sp.width,
            sp.height,
            -sp.originX,
            -sp.originY,
            sp.width,
            sp.height,
          );
          // RESTORE #2: Restore back to camera state
          ctx.restore();
        });

        ctx.restore();
        if (window.Input && window.Input.update) window.Input.update();
        animationFrameId = requestAnimationFrame(gameLoop);
      };

      animationFrameId = requestAnimationFrame(gameLoop);
    };

    startEngine();

    return () => {
      isRunning = false;
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  if (error) {
    return (
      <div className="w-screen h-screen bg-black text-red-500 flex items-center justify-center font-bold text-xl select-none">
        Error: {error}
      </div>
    );
  }

  return (
    <div className="w-screen h-screen bg-black flex items-center justify-center overflow-hidden select-none relative">
      {/* Loading Overlay is now separate from the canvas! */}
      {isLoading && (
        <div className="absolute inset-0 z-50 bg-black flex items-center justify-center text-white text-xl animate-pulse font-bold tracking-widest">
          Compiling Game...
        </div>
      )}

      <canvas
        ref={canvasRef}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
          imageRendering: "pixelated",
          // Opacity transition makes it fade in beautifully when compiling finishes!
          opacity: isLoading ? 0 : 1,
          transition: "opacity 0.3s ease-in-out",
        }}
      />
    </div>
  );
};
