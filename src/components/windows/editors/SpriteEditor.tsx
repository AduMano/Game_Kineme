import React, { useState, useEffect, useRef } from "react";
import {
  useWindowStore,
  type WindowNode,
} from "../../../pages/modules/stores/useWindowStore";
import { useResourcesStore } from "../../../pages/modules/stores/useResourcesStore";
import {
  saveFileToDB,
  loadFileFromDB,
} from "../../../pages/modules/stores/utilities/indexedDB";
import ContextMenu from "../../ContextMenu";
import type { ContextMenuItem } from "../../../types/ContextMenuTypes";
import { IconRenderer } from "../../IconRenderer";

interface EditorProps {
  windowData: WindowNode;
}

const SpriteEditor = ({ windowData }: EditorProps) => {
  const { requestClose, registerInterceptors, updateWindowTitle } =
    useWindowStore();
  const updateItemData = useResourcesStore((state) => state.updateItemData);

  // Find the actual file data from the resources tree to see if we have saved data
  const fileNode = useResourcesStore((state) => {
    let found = null;
    const search = (items: any[]) => {
      for (const item of items) {
        if (item.id === windowData.id) found = item;
        if (item.subDirectory) search(item.subDirectory);
      }
    };
    search(state.resources);
    return found;
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(true);

  // --- Local State ---
  const [hasChanges, setHasChanges] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [imageBlob, setImageBlob] = useState<Blob | null>(null); // Keep the raw blob for saving
  const [menuPos, setMenuPos] = useState<{
    x: number;
    y: number;
    items: ContextMenuItem[];
  } | null>(null);
  const [currentFrame, setCurrentFrame] = useState(0);

  // --- Custom Modal State ---
  const [showConfirmClose, setShowConfirmClose] = useState(false);
  const confirmPromiseResolve = useRef<((value: boolean) => void) | null>(null);

  // Sprite Properties (Load from fileNode if it exists, otherwise default)
  const savedProps = (fileNode as any)?.data?.spriteProps;
  const [props, setProps] = useState({
    name: windowData.title,
    offsetX: savedProps?.offsetX ?? 0,
    offsetY: savedProps?.offsetY ?? 0,
    originX: savedProps?.originX ?? 0,
    originY: savedProps?.originY ?? 0,
    rows: savedProps?.rows ?? 1,
    cols: savedProps?.cols ?? 1,
    width: savedProps?.width ?? 32,
    height: savedProps?.height ?? 32,
    gap: savedProps?.gap ?? 0,
    fps: savedProps?.fps ?? 15,
  });

  // --- 1. Load Data on Mount ---
  useEffect(() => {
    const loadData = async () => {
      if ((fileNode as any)?.data?.hasImage) {
        const blob = await loadFileFromDB(windowData.id);
        if (blob) {
          setImageBlob(blob);
          setImageSrc(URL.createObjectURL(blob));
        }
      }
      setIsLoading(false);
    };
    loadData();
  }, [windowData.id]);

  // --- 2. Safe Close Interceptor with CUSTOM MODAL ---
  useEffect(() => {
    registerInterceptors(windowData.id, {
      onClose: () => {
        if (!hasChanges && imageSrc) return true; // Safe to close if no changes
        if (!hasChanges && !imageSrc) return true; // Safe to close if empty

        // Show our custom modal
        setShowConfirmClose(true);

        // Return a promise that pauses the close operation!
        return new Promise<boolean>((resolve) => {
          confirmPromiseResolve.current = resolve;
        });
      },
    });
  }, [hasChanges, imageSrc, windowData.id, registerInterceptors]);

  // --- 3. Save Logic ---
  const handleSave = async () => {
    if (imageBlob) {
      await saveFileToDB(windowData.id, imageBlob); // Save heavy binary to IndexedDB
    }

    // Save lightweight properties to Zustand (localStorage)
    updateItemData(windowData.id, {
      spriteProps: props,
      hasImage: !!imageBlob,
    });

    setHasChanges(false);
  };

  // --- Actions ---
  const handlePropChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setProps((prev) => ({
      ...prev,
      [name]: type === "number" ? Number(value) : value,
    }));
    setHasChanges(true);
    if (name === "name") updateWindowTitle(windowData.id, value);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageBlob(file);
      setImageSrc(URL.createObjectURL(file));
      setHasChanges(true);
    }
  };

  // --- Animation Loop ---
  useEffect(() => {
    if (!imageSrc || props.fps <= 0) return;
    const interval = setInterval(
      () => setCurrentFrame((prev) => (prev + 1) % (props.rows * props.cols)),
      1000 / props.fps,
    );
    return () => clearInterval(interval);
  }, [imageSrc, props.fps, props.rows, props.cols]);

  const getFrameStyle = () => {
    if (!imageSrc) return {};
    const col = currentFrame % props.cols;
    const row = Math.floor(currentFrame / props.cols);
    const x = props.offsetX + col * (props.width + props.gap);
    const y = props.offsetY + row * (props.height + props.gap);
    return {
      backgroundImage: `url(${imageSrc})`,
      backgroundPosition: `-${x}px -${y}px`,
      width: `${props.width}px`,
      height: `${props.height}px`,
      backgroundRepeat: "no-repeat",
    };
  };

  if (isLoading)
    return (
      <div className="w-full h-full flex items-center justify-center bg-neutral-100 text-black">
        Loading...
      </div>
    );

  return (
    <div className="flex flex-col w-full h-full bg-neutral-100 text-neutral-900 text-sm select-none relative">
      {/* CUSTOM CONFIRMATION MODAL */}
      {showConfirmClose && (
        <div className="absolute inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-neutral-800 text-white p-6 rounded shadow-2xl border border-neutral-600 max-w-sm w-full">
            <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
              <IconRenderer
                icon="Alert"
                width={20}
                height={20}
                className="text-yellow-500"
              />
              Unsaved Changes
            </h3>
            <p className="text-neutral-300 text-sm mb-6">
              You have unsaved changes in this sprite. If you close now, those
              changes will be lost.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowConfirmClose(false);
                  confirmPromiseResolve.current?.(false);
                }}
                className="px-4 py-2 bg-neutral-600 hover:bg-neutral-500 rounded transition"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowConfirmClose(false);
                  confirmPromiseResolve.current?.(true);
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 rounded transition"
              >
                Discard Changes
              </button>
            </div>
          </div>
        </div>
      )}

      <input
        type="file"
        accept="image/png, image/jpeg"
        ref={fileInputRef}
        className="hidden"
        onChange={handleImageUpload}
      />

      {/* TOP MENU */}
      <div className="flex items-center bg-neutral-200 border-b border-neutral-300 px-2 py-1 gap-2 relative z-10">
        <button
          onClick={(e) =>
            setMenuPos({
              x: e.currentTarget.getBoundingClientRect().left,
              y: e.currentTarget.getBoundingClientRect().bottom,
              items: [
                {
                  label: "Save",
                  onClick: handleSave,
                  icon: <IconRenderer icon="Save" width={16} height={16} />,
                },
                { label: "Close", onClick: () => requestClose(windowData.id) },
              ],
            })
          }
          className="px-2 py-1 hover:bg-neutral-300 rounded cursor-pointer"
        >
          File
        </button>

        <button
          onClick={(e) =>
            setMenuPos({
              x: e.currentTarget.getBoundingClientRect().left,
              y: e.currentTarget.getBoundingClientRect().bottom,
              items: [
                {
                  label: "Import Sprite Sheet",
                  onClick: () => fileInputRef.current?.click(),
                  icon: <IconRenderer icon="Image" width={16} height={16} />,
                },
                {
                  label: "Clear Image",
                  onClick: () => {
                    setImageSrc(null);
                    setImageBlob(null);
                    setHasChanges(true);
                  },
                },
              ],
            })
          }
          className="px-2 py-1 hover:bg-neutral-300 rounded cursor-pointer"
        >
          Image
        </button>

        {hasChanges && (
          <span className="ml-auto text-xs text-neutral-500 italic">
            * Unsaved changes
          </span>
        )}
      </div>

      {/* Main Workspace Split */}
      <div className="flex flex-1 overflow-hidden">
        {/* LEFT PANEL */}
        <div className="w-64 bg-neutral-200 border-r border-neutral-300 p-4 flex flex-col gap-4 overflow-y-auto">
          {/* ... (Keep ALL your existing input fields here perfectly intact: Name, Offset, Origin, Rows, Cols, etc) ... */}

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-neutral-600">
              Sprite Name
            </label>
            <input
              type="text"
              name="name"
              value={props.name}
              onChange={handlePropChange}
              className="border px-2 py-1 rounded outline-none focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-neutral-600">
                Grid Offset X
              </label>
              <input
                type="number"
                name="offsetX"
                value={props.offsetX}
                onChange={handlePropChange}
                className="border px-2 py-1 rounded outline-none"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-neutral-600">
                Grid Offset Y
              </label>
              <input
                type="number"
                name="offsetY"
                value={props.offsetY}
                onChange={handlePropChange}
                className="border px-2 py-1 rounded outline-none"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-neutral-600">
                Origin X
              </label>
              <input
                type="number"
                name="originX"
                value={props.originX}
                onChange={handlePropChange}
                className="border px-2 py-1 rounded outline-none"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-neutral-600">
                Origin Y
              </label>
              <input
                type="number"
                name="originY"
                value={props.originY}
                onChange={handlePropChange}
                className="border px-2 py-1 rounded outline-none"
              />
            </div>
          </div>

          <hr className="border-neutral-300" />

          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-neutral-600">
                Rows
              </label>
              <input
                type="number"
                name="rows"
                min={1}
                value={props.rows}
                onChange={handlePropChange}
                className="border px-2 py-1 rounded outline-none"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-neutral-600">
                Columns
              </label>
              <input
                type="number"
                name="cols"
                min={1}
                value={props.cols}
                onChange={handlePropChange}
                className="border px-2 py-1 rounded outline-none"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-neutral-600">
                Width
              </label>
              <input
                type="number"
                name="width"
                min={1}
                value={props.width}
                onChange={handlePropChange}
                className="border px-2 py-1 rounded outline-none"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-neutral-600">
                Height
              </label>
              <input
                type="number"
                name="height"
                min={1}
                value={props.height}
                onChange={handlePropChange}
                className="border px-2 py-1 rounded outline-none"
              />
            </div>
            <div className="flex flex-col gap-1 col-span-2">
              <label className="text-xs font-semibold text-neutral-600">
                Gap (px)
              </label>
              <input
                type="number"
                name="gap"
                min={0}
                value={props.gap}
                onChange={handlePropChange}
                className="border px-2 py-1 rounded outline-none"
              />
            </div>
          </div>

          {/* Animation Preview Area */}
          <div className="flex flex-col gap-1 mt-2">
            <div className="flex justify-between items-end">
              <label className="text-xs font-semibold text-neutral-600">
                Preview
              </label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  name="fps"
                  min={1}
                  max={60}
                  value={props.fps}
                  onChange={handlePropChange}
                  className="border px-1 py-0.5 rounded w-12 text-xs"
                />
                <span className="text-xs text-neutral-500">FPS</span>
              </div>
            </div>
            <div className="h-48 bg-neutral-300 border border-neutral-400 rounded flex items-center justify-center overflow-hidden relative">
              {imageSrc ? (
                <div
                  className="rendering-pixelated scale-[2]"
                  style={getFrameStyle()}
                />
              ) : (
                <span className="text-neutral-500 text-xs text-center px-4">
                  Import an image to see animation
                </span>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT PANEL: WORKSPACE */}
        <div className="flex-1 bg-neutral-400 flex items-center justify-center overflow-auto relative p-4">
          {imageSrc ? (
            <div
              className="relative shadow-md bg-checkerboard"
              style={{ width: "fit-content", height: "fit-content" }}
            >
              <img
                src={imageSrc}
                alt="Sprite Sheet"
                className="block rendering-pixelated"
                style={{ minWidth: "100px", minHeight: "100px" }}
              />

              <svg
                className="absolute top-0 left-0 w-full h-full pointer-events-none"
                xmlns="http://www.w3.org/2000/svg"
              >
                {Array.from({ length: props.rows }).map((_, r) =>
                  Array.from({ length: props.cols }).map((_, c) => {
                    const cellX = props.offsetX + c * (props.width + props.gap);
                    const cellY =
                      props.offsetY + r * (props.height + props.gap);
                    return (
                      <g key={`cell-${r}-${c}`}>
                        <rect
                          x={cellX}
                          y={cellY}
                          width={props.width}
                          height={props.height}
                          fill="none"
                          stroke="rgba(59, 130, 246, 0.8)"
                          strokeWidth="1"
                        />
                        <g stroke="rgba(255, 0, 0, 0.7)" strokeWidth="1">
                          <line
                            x1={cellX + props.originX - 5}
                            y1={cellY + props.originY}
                            x2={cellX + props.originX + 5}
                            y2={cellY + props.originY}
                          />
                          <line
                            x1={cellX + props.originX}
                            y1={cellY + props.originY - 5}
                            x2={cellX + props.originX}
                            y2={cellY + props.originY + 5}
                          />
                        </g>
                      </g>
                    );
                  }),
                )}
              </svg>
            </div>
          ) : (
            <div className="text-neutral-600 flex flex-col items-center gap-2">
              <IconRenderer icon="Image" width={48} height={48} />
              <p>No sprite sheet loaded.</p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500 transition shadow"
              >
                Import Image
              </button>
            </div>
          )}
        </div>
      </div>

      {/* BOTTOM ACTIONS */}
      <div className="bg-neutral-200 border-t border-neutral-300 px-4 py-2 flex justify-end gap-2">
        <button
          onClick={() => requestClose(windowData.id)}
          className="px-4 py-1.5 border border-neutral-400 rounded hover:bg-neutral-300 transition"
        >
          Close
        </button>
        <button
          onClick={handleSave}
          className={`px-4 py-1.5 rounded transition shadow ${hasChanges ? "bg-blue-600 text-white hover:bg-blue-500" : "bg-neutral-400 text-neutral-200 cursor-not-allowed"}`}
          disabled={!hasChanges}
        >
          Save Sprite
        </button>
      </div>

      {menuPos && (
        <ContextMenu
          x={menuPos.x}
          y={menuPos.y}
          items={menuPos.items}
          onClose={() => setMenuPos(null)}
        />
      )}
    </div>
  );
};

export default SpriteEditor;
