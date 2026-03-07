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

      // 1. CREATE GLOBAL SPRITES DICTIONARY
      globalCode += `window.Sprites = {\n`;
      sprites.forEach((s) => {
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

      if (window.Camera) {
        window.Camera.x = camData.x;
        window.Camera.y = camData.y;
        window.Camera.width = camData.width;
        window.Camera.height = camData.height;
        window.Camera.roomWidth = roomProps.width;
        window.Camera.roomHeight = roomProps.height;
      }

      // 3. PRE-LOAD ASSETS
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
                  resolve();
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
      if (!isRunning) return;
      setIsLoading(false);

      // 4. INSTANTIATE OBJECTS (DO NOT REVERSE HERE!)
      const objects = findItems("Object", resources);
      const liveInstances: KinemeInstance[] = [];

      roomData.layers.forEach((layer: any, layerIndex: number) => {
        const safeLayerId = layer.id || `layer_${layerIndex}`;

        if (layer.type === "instances" && layer.visible) {
          layer.instances.forEach((inst: any) => {
            const baseObj = objects.find((o) => o.id === inst.objectId);
            if (!baseObj) return;

            const spriteResource = baseObj.data?.spriteId
              ? sprites.find((s) => s.id === baseObj.data.spriteId)
              : null;
            const sprProps = spriteResource?.data?.spriteProps || null;

            const liveObj = {
              id: inst.id,
              layerId: safeLayerId,
              spriteId: baseObj.data?.spriteId || null,
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

      liveInstances.forEach((inst) => {
        if (inst.onCreate) inst.onCreate();
      });

      // 5. THE MASTER GAME LOOP
      const gameLoop = (time: number) => {
        if (!isRunning) return;

        if (window.Camera && window.Camera.update) window.Camera.update();

        liveInstances.forEach((inst) => {
          if (!inst._destroyed && inst.onStep) inst.onStep();
        });

        // --- DRAW PHASE ---
        ctx.fillStyle = "#000000";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const camX = Math.round(window.Camera ? window.Camera.x : camData.x);
        const camY = Math.round(window.Camera ? window.Camera.y : camData.y);

        // SAFE REVERSE LOOP: We count backwards manually so layerIndex perfectly matches the instantiation phase!
        for (let i = roomData.layers.length - 1; i >= 0; i--) {
          const layer = roomData.layers[i];
          if (!layer.visible) continue;

          const safeLayerId = layer.id || `layer_${i}`;

          ctx.save();
          ctx.translate(-camX, -camY);

          // A. BACKGROUND LAYERS (Affected by Parallax)
          if (layer.type === "background") {
            const spriteNodeId =
              layer.backgroundAssetId ||
              layer.spriteId ||
              layer.backgroundSpriteId;
            if (spriteNodeId) {
              const spriteResource = sprites.find((s) => s.id === spriteNodeId);
              const actualAssetId = spriteResource?.data?.assetId;

              if (actualAssetId && imageCache[actualAssetId]) {
                const pX = layer.parallaxX !== undefined ? layer.parallaxX : 1;
                const pY = layer.parallaxY !== undefined ? layer.parallaxY : 1;
                ctx.drawImage(imageCache[actualAssetId], camX * pX, camY * pY);
              }
            }
          }

          // B. DECORATOR / ASSETS LAYERS (Affected by Parallax)
          else if (
            (layer.type === "assets" || layer.type === "decorator") &&
            layer.assets
          ) {
            const pX = layer.parallaxX !== undefined ? layer.parallaxX : 0;
            const pY = layer.parallaxY !== undefined ? layer.parallaxY : 0;

            layer.assets.forEach((asset: any) => {
              const spriteResource = sprites.find(
                (s) => s.id === asset.spriteId,
              );
              const actualAssetId = spriteResource?.data?.assetId;
              const sp = spriteResource?.data?.spriteProps;

              if (actualAssetId && imageCache[actualAssetId] && sp) {
                ctx.save();
                ctx.translate(asset.x + camX * pX, asset.y + camY * pY);

                if (asset.angle) ctx.rotate((asset.angle * Math.PI) / 180);
                if (asset.scaleX !== undefined || asset.scaleY !== undefined)
                  ctx.scale(asset.scaleX ?? 1, asset.scaleY ?? 1);
                if (asset.alpha !== undefined && asset.alpha !== 1)
                  ctx.globalAlpha = asset.alpha;

                ctx.drawImage(
                  imageCache[actualAssetId],
                  sp.offsetX,
                  sp.offsetY,
                  sp.width,
                  sp.height,
                  -sp.originX,
                  -sp.originY,
                  sp.width,
                  sp.height,
                );
                ctx.restore();
              }
            });
          }

          // C. INSTANCES LAYERS (EXPLICITLY BLOCKS PARALLAX!)
          else if (layer.type === "instances") {
            liveInstances.forEach((inst) => {
              // Now safeLayerId is guaranteed to match!
              if (
                inst._destroyed ||
                !inst.visible ||
                inst.layerId !== safeLayerId
              )
                return;

              const activeSpriteResource = inst.spriteId
                ? sprites.find((s) => s.id === inst.spriteId)
                : null;
              const sp = activeSpriteResource?.data?.spriteProps;
              const assetId = activeSpriteResource?.data?.assetId;

              if (!assetId || !imageCache[assetId] || !sp) return;

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

              ctx.save();

              // NO PARALLAX. Pure World Coordinates!
              ctx.translate(inst.x, inst.y);

              if (inst.angle !== 0) ctx.rotate((inst.angle * Math.PI) / 180);
              if (inst.scaleX !== 1 || inst.scaleY !== 1)
                ctx.scale(inst.scaleX, inst.scaleY);
              if (inst.alpha !== 1) ctx.globalAlpha = inst.alpha;

              ctx.drawImage(
                imageCache[assetId],
                sx,
                sy,
                sp.width,
                sp.height,
                -sp.originX,
                -sp.originY,
                sp.width,
                sp.height,
              );

              ctx.restore();
            });
          }

          ctx.restore();
        } // End of Layer For-Loop

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
          opacity: isLoading ? 0 : 1,
          transition: "opacity 0.3s ease-in-out",
        }}
      />
    </div>
  );
};
