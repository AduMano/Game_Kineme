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
import Modal from "../../Modal";

const generateFileHash = async (file: Blob): Promise<string> => {
  const arrayBuffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-1", arrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
};

interface EditorProps {
  windowData: WindowNode;
}

const SpriteEditor = ({ windowData }: EditorProps) => {
  const { requestClose, registerInterceptors, updateWindowTitle } =
    useWindowStore();
  const updateItemData = useResourcesStore((state) => state.updateItemData);
  const renameItem = useResourcesStore((state) => state.renameItem);

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
  const [assetId, setAssetId] = useState<string | null>(
    (fileNode as any)?.data?.assetId ?? null,
  );
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [imageBlob, setImageBlob] = useState<Blob | null>(null);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [menuPos, setMenuPos] = useState<{
    x: number;
    y: number;
    items: ContextMenuItem[];
  } | null>(null);
  const [currentFrame, setCurrentFrame] = useState(0);

  // --- Custom Modal State ---
  const [showConfirmClose, setShowConfirmClose] = useState(false);
  const confirmPromiseResolve = useRef<((value: boolean) => void) | null>(null);

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

  useEffect(() => {
    const loadData = async () => {
      const currentAssetId = (fileNode as any)?.data?.assetId;
      if (currentAssetId) {
        const blob = await loadFileFromDB(currentAssetId);
        if (blob) {
          setImageBlob(blob);
          setImageSrc(URL.createObjectURL(blob));
          setAssetId(currentAssetId);
        }
      }
      setIsLoading(false);
    };
    loadData();
  }, [windowData.id, fileNode]);

  useEffect(() => {
    registerInterceptors(windowData.id, {
      onClose: () => {
        if (!hasChanges) return true;

        setShowConfirmClose(true);
        return new Promise<boolean>((resolve) => {
          confirmPromiseResolve.current = resolve;
        });
      },
    });
  }, [hasChanges, windowData.id, registerInterceptors]);

  // --- Safe Save Logic ---
  const handleSave = async () => {
    let finalAssetId = assetId;

    if (imageBlob) {
      finalAssetId = await generateFileHash(imageBlob);
      await saveFileToDB(finalAssetId, imageBlob);
    }

    updateItemData(windowData.id, {
      spriteProps: props,
      hasImage: !!imageBlob,
      assetId: finalAssetId,
    });

    if (props.name !== windowData.title && windowData.data) {
      const isRenamed = renameItem({
        id: windowData.id,
        directory: windowData.data.fromDirectory,
        level: windowData.data.level,
        name: props.name,
      });

      if (isRenamed) {
        updateWindowTitle(windowData.id, props.name);
      } else {
        setProps((p) => ({ ...p, name: windowData.title }));
      }
    }

    setAssetId(finalAssetId);
    setHasChanges(false);
  };

  const handlePropChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setProps((prev) => ({
      ...prev,
      [name]: type === "number" ? Number(value) : value,
    }));
    setHasChanges(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageBlob(file);
      setImageSrc(URL.createObjectURL(file));
      setHasChanges(true);
    }
  };

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

  // Listen for the global "Save All" broadcast
  useEffect(() => {
    const handleGlobalSave = () => {
      if (hasChanges) {
        handleSave();
      }
    };

    window.addEventListener("kineme-save-all", handleGlobalSave);
    return () =>
      window.removeEventListener("kineme-save-all", handleGlobalSave);
  }, [hasChanges, handleSave]);

  if (isLoading)
    return (
      <div className="w-full h-full flex items-center justify-center bg-c-dark text-c-lighter">
        Loading...
      </div>
    );

  return (
    <div className="flex flex-col w-full h-full bg-c-light text-black text-sm select-none relative">
      <Modal
        isOpen={showConfirmClose}
        type="confirm"
        title="Unsaved Changes"
        message="You have unsaved changes in this sprite. If you close now, those changes will be lost."
        confirmText="Discard Changes"
        onCancel={() => {
          setShowConfirmClose(false);
          confirmPromiseResolve.current?.(false);
        }}
        onConfirm={() => {
          setShowConfirmClose(false);
          confirmPromiseResolve.current?.(true);
        }}
      />

      <input
        type="file"
        accept="image/png, image/jpeg"
        ref={fileInputRef}
        className="hidden"
        onChange={handleImageUpload}
      />

      {/* TOP MENU */}
      <div className="flex items-center bg-c-lighter border-b border-c-darker px-2 py-1 gap-2 relative z-10 shadow-sm">
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
          className="px-2 py-1 hover:bg-c-dark hover:text-c-lighter rounded cursor-pointer transition"
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
                    setImageSize({ width: 0, height: 0 });
                    setHasChanges(true);
                  },
                },
              ],
            })
          }
          className="px-2 py-1 hover:bg-c-dark hover:text-c-lighter rounded cursor-pointer transition"
        >
          Image
        </button>

        {hasChanges && (
          <span className="ml-auto text-xs text-red-600 font-semibold italic">
            * Unsaved changes
          </span>
        )}
      </div>

      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* MATCHING CARD STYLE PANEL */}
        <div className="w-72 bg-neutral-200 border-r border-c-darker flex flex-col shrink-0 p-3 gap-3 z-10 overflow-y-auto custom-scrollbar">
          {/* Sprite Properties Card */}
          <div className="bg-white rounded-md border border-neutral-300 shadow-sm p-3 flex flex-col gap-3 shrink-0">
            <h3 className="font-bold text-c-dark tracking-wide uppercase text-xs flex items-center gap-2 border-b pb-1">
              <IconRenderer icon="Image" width={14} height={14} /> Sprite
              Properties
            </h3>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-semibold text-neutral-600">
                Sprite Name
              </label>
              <input
                type="text"
                name="name"
                value={props.name}
                onChange={handlePropChange}
                className="border border-neutral-300 bg-neutral-50 px-2 py-1.5 rounded outline-none focus:border-blue-500 transition-colors text-xs"
              />
            </div>
          </div>

          {/* Grid & Slicing Card */}
          <div className="bg-white rounded-md border border-neutral-300 shadow-sm p-3 flex flex-col gap-3 shrink-0">
            <h3 className="font-bold text-c-dark tracking-wide uppercase text-xs flex items-center gap-2 border-b pb-1">
              Slicing & Grid
            </h3>

            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold text-neutral-600">
                  Width
                </label>
                <input
                  type="number"
                  name="width"
                  min={1}
                  value={props.width}
                  onChange={handlePropChange}
                  className="border border-neutral-300 bg-neutral-50 px-2 py-1 rounded outline-none text-xs"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold text-neutral-600">
                  Height
                </label>
                <input
                  type="number"
                  name="height"
                  min={1}
                  value={props.height}
                  onChange={handlePropChange}
                  className="border border-neutral-300 bg-neutral-50 px-2 py-1 rounded outline-none text-xs"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold text-neutral-600">
                  Rows
                </label>
                <input
                  type="number"
                  name="rows"
                  min={1}
                  value={props.rows}
                  onChange={handlePropChange}
                  className="border border-neutral-300 bg-neutral-50 px-2 py-1 rounded outline-none text-xs"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold text-neutral-600">
                  Cols
                </label>
                <input
                  type="number"
                  name="cols"
                  min={1}
                  value={props.cols}
                  onChange={handlePropChange}
                  className="border border-neutral-300 bg-neutral-50 px-2 py-1 rounded outline-none text-xs"
                />
              </div>

              <div className="flex flex-col gap-1 mt-1">
                <label className="text-[10px] font-semibold text-neutral-600">
                  Offset X
                </label>
                <input
                  type="number"
                  name="offsetX"
                  value={props.offsetX}
                  onChange={handlePropChange}
                  className="border border-neutral-300 bg-neutral-50 px-2 py-1 rounded outline-none text-xs"
                />
              </div>
              <div className="flex flex-col gap-1 mt-1">
                <label className="text-[10px] font-semibold text-neutral-600">
                  Offset Y
                </label>
                <input
                  type="number"
                  name="offsetY"
                  value={props.offsetY}
                  onChange={handlePropChange}
                  className="border border-neutral-300 bg-neutral-50 px-2 py-1 rounded outline-none text-xs"
                />
              </div>

              <div className="flex flex-col gap-1 mt-1">
                <label className="text-[10px] font-semibold text-neutral-600">
                  Origin X
                </label>
                <input
                  type="number"
                  name="originX"
                  value={props.originX}
                  onChange={handlePropChange}
                  className="border border-neutral-300 bg-neutral-50 px-2 py-1 rounded outline-none text-xs"
                />
              </div>
              <div className="flex flex-col gap-1 mt-1">
                <label className="text-[10px] font-semibold text-neutral-600">
                  Origin Y
                </label>
                <input
                  type="number"
                  name="originY"
                  value={props.originY}
                  onChange={handlePropChange}
                  className="border border-neutral-300 bg-neutral-50 px-2 py-1 rounded outline-none text-xs"
                />
              </div>

              <div className="flex flex-col gap-1 col-span-2 mt-1">
                <label className="text-[10px] font-semibold text-neutral-600">
                  Gap (px)
                </label>
                <input
                  type="number"
                  name="gap"
                  min={0}
                  value={props.gap}
                  onChange={handlePropChange}
                  className="border border-neutral-300 bg-neutral-50 px-2 py-1 rounded outline-none text-xs"
                />
              </div>
            </div>
          </div>

          {/* Animation Preview Card */}
          <div className="bg-white rounded-md border border-neutral-300 shadow-sm p-3 flex flex-col gap-2 shrink-0">
            <div className="flex justify-between items-center border-b pb-1">
              <h3 className="font-bold text-c-dark tracking-wide uppercase text-xs">
                Preview
              </h3>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  name="fps"
                  min={1}
                  max={60}
                  value={props.fps}
                  onChange={handlePropChange}
                  className="border border-neutral-300 bg-neutral-50 px-1 py-0.5 rounded w-10 text-[10px] outline-none"
                />
                <span className="text-[10px] text-neutral-600 font-semibold">
                  FPS
                </span>
              </div>
            </div>

            <div className="h-40 bg-neutral-100 border border-neutral-300 rounded flex items-center justify-center overflow-hidden relative shadow-inner mt-1">
              {imageSrc ? (
                <div
                  className="rendering-pixelated scale-[2]"
                  style={getFrameStyle()}
                />
              ) : (
                <span className="text-neutral-400 text-[10px] text-center px-4">
                  Import image to preview
                </span>
              )}
            </div>
          </div>
        </div>

        {/* FULLY RESPONSIVE WORKSPACE */}
        <div className="flex-1 bg-c-dark flex items-center justify-center overflow-hidden relative p-4 bg-checkerboard">
          {imageSrc ? (
            <div className="relative w-full h-full flex items-center justify-center">
              <img
                src={imageSrc}
                alt="Sprite Sheet"
                onLoad={(e) =>
                  setImageSize({
                    width: e.currentTarget.naturalWidth,
                    height: e.currentTarget.naturalHeight,
                  })
                }
                className="absolute inset-0 w-full h-full object-contain rendering-pixelated"
              />

              {imageSize.width > 0 && (
                <svg
                  className="absolute inset-0 w-full h-full pointer-events-none"
                  viewBox={`0 0 ${imageSize.width} ${imageSize.height}`}
                  preserveAspectRatio="xMidYMid meet"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  {Array.from({ length: props.rows }).map((_, r) =>
                    Array.from({ length: props.cols }).map((_, c) => {
                      const cellX =
                        props.offsetX + c * (props.width + props.gap);
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
              )}
            </div>
          ) : (
            <div className="text-c-lighter flex flex-col items-center gap-2">
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
      <div className="bg-c-lighter border-t border-c-darker px-4 py-2 flex justify-end gap-2 shrink-0 z-10">
        <button
          onClick={() => requestClose(windowData.id)}
          className="px-4 py-1.5 border border-c-darker rounded hover:bg-c-dark hover:text-c-lighter transition"
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
