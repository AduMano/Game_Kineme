import React, { useState, useEffect, useRef } from "react";
import {
  useWindowStore,
  type WindowNode,
} from "../../../pages/modules/stores/useWindowStore";
import { useResourcesStore } from "../../../pages/modules/stores/useResourcesStore";
import { loadFileFromDB } from "../../../pages/modules/stores/utilities/indexedDB";
import ContextMenu from "../../ContextMenu";
import type { ContextMenuItem } from "../../../types/ContextMenuTypes";
import { IconRenderer } from "../../IconRenderer";
import Modal from "../../Modal";
import cuid from "cuid";

interface EditorProps {
  windowData: WindowNode;
}

export interface RoomCamera {
  x: number;
  y: number;
  width: number;
  height: number;
  targetInstanceId: string | null;
  clampToRoom: boolean;
  panDelay: number;
}

export interface RoomInstance {
  id: string;
  objectId: string;
  x: number;
  y: number;
}

export interface RoomLayer {
  id: string;
  name: string;
  type: "instances" | "background";
  visible: boolean;
  instances: RoomInstance[];
  parallaxX: number;
  parallaxY: number;
  backgroundAssetId?: string | null;
  isDeletable?: boolean;
}

interface SpriteDataCache {
  url: string;
  props: any;
}

const RoomEditor = ({ windowData }: EditorProps) => {
  const { requestClose, registerInterceptors, updateWindowTitle } =
    useWindowStore();
  const { updateItemData, renameItem, resources } = useResourcesStore();

  const findNode = (items: any[], id: string): any => {
    for (const item of items) {
      if (item.id === id) return item;
      if (item.subDirectory) {
        const found = findNode(item.subDirectory, id);
        if (found) return found;
      }
    }
    return null;
  };

  const fileNode = findNode(resources, windowData.id);
  const savedData = fileNode?.data;

  // --- Local State ---
  const [hasChanges, setHasChanges] = useState(false);
  const [menuPos, setMenuPos] = useState<{
    x: number;
    y: number;
    items: ContextMenuItem[];
  } | null>(null);
  const [showConfirmClose, setShowConfirmClose] = useState(false);
  const confirmPromiseResolve = useRef<((value: boolean) => void) | null>(null);
  const [layerToDelete, setLayerToDelete] = useState<string | null>(null);

  // --- Room State ---
  const [name, setName] = useState(windowData.title);
  const [roomProps, setRoomProps] = useState({
    width: savedData?.roomProps?.width ?? 800,
    height: savedData?.roomProps?.height ?? 600,
    isDefault: savedData?.roomProps?.isDefault ?? false,
    gridSize: savedData?.roomProps?.gridSize ?? 32,
  });

  const [camera, setCamera] = useState<RoomCamera>({
    x: savedData?.camera?.x ?? 0,
    y: savedData?.camera?.y ?? 0,
    width: savedData?.camera?.width ?? 800,
    height: savedData?.camera?.height ?? 600,
    panDelay: savedData?.camera?.panDelay ?? 0.1,
    targetInstanceId: savedData?.camera?.targetInstanceId ?? null,
    clampToRoom: savedData?.camera?.clampToRoom ?? true,
  });

  const [layers, setLayers] = useState<RoomLayer[]>(
    savedData?.layers ?? [
      {
        id: cuid(),
        name: "Instances",
        type: "instances",
        visible: true,
        instances: [],
        parallaxX: 1,
        parallaxY: 1,
        isDeletable: false,
      },
      {
        id: cuid(),
        name: "Background",
        type: "background",
        visible: true,
        instances: [],
        parallaxX: 0.5,
        parallaxY: 0.5,
        isDeletable: false,
      },
    ],
  );
  const [activeLayerId, setActiveLayerId] = useState<string>(
    layers[0]?.id || "",
  );
  const activeLayer = layers.find((l) => l.id === activeLayerId);

  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);

  // --- Canvas State ---
  const [pan, setPan] = useState({ x: 50, y: 50 });
  const [zoom, setZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [draggingInst, setDraggingInst] = useState<{
    layerId: string;
    instId: string;
  } | null>(null);
  const isDraggingRef = useRef(false);
  const workspaceContainerRef = useRef<HTMLDivElement>(null);

  // --- Asset Helpers ---
  const objectRoot = resources.find(
    (r) => r.fromDirectory === "Objects" && r.level === 0,
  );
  const spriteRoot = resources.find(
    (r) => r.fromDirectory === "Sprites" && r.level === 0,
  );

  const getAllAssets = (
    items: any[],
    type: "Object" | "Image",
  ): { id: string; label: string }[] => {
    let list: { id: string; label: string }[] = [];
    items.forEach((item) => {
      if (item.icon === type) list.push({ id: item.id, label: item.label });
      if (item.subDirectory)
        list = list.concat(getAllAssets(item.subDirectory, type));
    });
    return list;
  };

  const availableObjects = objectRoot?.subDirectory
    ? getAllAssets(objectRoot.subDirectory, "Object")
    : [];
  const availableSprites = spriteRoot?.subDirectory
    ? getAllAssets(spriteRoot.subDirectory, "Image")
    : [];

  const [spriteCache, setSpriteCache] = useState<
    Record<string, SpriteDataCache>
  >({});

  useEffect(() => {
    const loadObjectSprites = async () => {
      const newCache = { ...spriteCache };
      let hasNew = false;

      // We load ALL available sprites AND object-assigned sprites into memory!
      const itemsToLoad = [...availableObjects, ...availableSprites];

      for (const obj of itemsToLoad) {
        if (newCache[obj.id] === undefined) {
          const objNode = findNode(resources, obj.id);
          // If it's an object, get its spriteId. If it's ALREADY a sprite, use its own ID.
          const spriteId =
            objNode?.icon === "Image" ? obj.id : objNode?.data?.spriteId;

          if (spriteId) {
            const spriteNode = findNode(resources, spriteId);
            const assetId = spriteNode?.data?.assetId;
            const props = spriteNode?.data?.spriteProps;
            if (assetId && props) {
              const blob = await loadFileFromDB(assetId);
              if (blob) {
                newCache[obj.id] = { url: URL.createObjectURL(blob), props };
                hasNew = true;
                continue;
              }
            }
          }
          newCache[obj.id] = { url: "", props: null };
          hasNew = true;
        }
      }
      if (hasNew) setSpriteCache(newCache);
    };
    loadObjectSprites();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availableObjects.length, availableSprites.length, resources]);

  const getCachedSprite = (objId: string | null) => {
    if (!objId) return null;
    const cache = spriteCache[objId];
    return {
      url: cache?.url || "",
      width: cache?.props?.width || roomProps.gridSize,
      height: cache?.props?.height || roomProps.gridSize,
      offsetX: cache?.props?.offsetX || 0,
      offsetY: cache?.props?.offsetY || 0,
    };
  };

  // --- Interceptors & Saving ---
  useEffect(() => {
    registerInterceptors(windowData.id, {
      onClose: () => {
        if (!hasChanges) return true;
        setShowConfirmClose(true);
        return new Promise<boolean>(
          (resolve) => (confirmPromiseResolve.current = resolve),
        );
      },
    });
  }, [hasChanges, windowData.id, registerInterceptors]);

  const handleSave = () => {
    updateItemData(windowData.id, { roomProps, camera, layers });
    if (name !== windowData.title && windowData.data) {
      const isRenamed = renameItem({
        id: windowData.id,
        directory: windowData.data.fromDirectory,
        level: windowData.data.level,
        name,
      });
      if (isRenamed) updateWindowTitle(windowData.id, name);
      else setName(windowData.title);
    }
    setHasChanges(false);
  };

  const handlePropChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setRoomProps((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : Number(value),
    }));
    setHasChanges(true);
  };

  const handleCameraChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setCamera((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : Number(value),
    }));
    setHasChanges(true);
  };

  // --- LAYER MANAGEMENT LOGIC ---
  const addLayer = (type: "instances" | "background") => {
    const newLayer: RoomLayer = {
      id: cuid(),
      name: `New ${type === "instances" ? "Instances" : "Background"}`,
      type,
      visible: true,
      instances: [],
      parallaxX: 1,
      parallaxY: 1,
      isDeletable: true,
    };
    setLayers([newLayer, ...layers]);
    setActiveLayerId(newLayer.id);
    setHasChanges(true);
  };

  const deleteLayer = (id: string) => {
    setLayerToDelete(id);
  };

  const moveLayer = (index: number, direction: -1 | 1) => {
    if (index + direction < 0 || index + direction >= layers.length) return;
    const newLayers = [...layers];
    const temp = newLayers[index];
    newLayers[index] = newLayers[index + direction];
    newLayers[index + direction] = temp;
    setLayers(newLayers);
    setHasChanges(true);
  };

  const updateActiveLayer = (updates: Partial<RoomLayer>) => {
    setLayers((prev) =>
      prev.map((l) => (l.id === activeLayerId ? { ...l, ...updates } : l)),
    );
    setHasChanges(true);
  };

  // --- Canvas Interaction Logic ---
  const handleWheel = (e: React.WheelEvent) => {
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom((prev) => Math.max(0.1, Math.min(5, prev * zoomFactor)));
  };

  const handlePointerDownCanvas = (e: React.PointerEvent) => {
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      e.preventDefault();
      setIsPanning(true);
    }
  };

  const handlePointerDownInstance = (
    e: React.PointerEvent,
    layerId: string,
    instId: string,
  ) => {
    if (e.button === 0 && !e.altKey) {
      e.stopPropagation();
      setDraggingInst({ layerId, instId });
      isDraggingRef.current = false;
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const rect = workspaceContainerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const rawX = (e.clientX - rect.left - pan.x) / zoom;
    const rawY = (e.clientY - rect.top - pan.y) / zoom;
    const snappedX = Math.floor(rawX / roomProps.gridSize) * roomProps.gridSize;
    const snappedY = Math.floor(rawY / roomProps.gridSize) * roomProps.gridSize;

    setMousePos({ x: snappedX, y: snappedY });

    if (isPanning)
      setPan((prev) => ({ x: prev.x + e.movementX, y: prev.y + e.movementY }));
    else if (draggingInst) {
      isDraggingRef.current = true;
      setLayers((prev) =>
        prev.map((layer) =>
          layer.id === draggingInst.layerId
            ? {
                ...layer,
                instances: layer.instances.map((inst) =>
                  inst.id === draggingInst.instId
                    ? { ...inst, x: snappedX, y: snappedY }
                    : inst,
                ),
              }
            : layer,
        ),
      );
    }
  };

  const handlePointerUp = () => {
    setIsPanning(false);
    if (draggingInst) {
      setDraggingInst(null);
      if (isDraggingRef.current) setHasChanges(true);
    }
  };

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (
      isPanning ||
      isDraggingRef.current ||
      e.button !== 0 ||
      !selectedObjectId
    )
      return;
    if (
      !activeLayer ||
      activeLayer.type !== "instances" ||
      !activeLayer.visible
    )
      return;

    setLayers((prev) =>
      prev.map((layer) =>
        layer.id === activeLayerId
          ? {
              ...layer,
              instances: [
                ...layer.instances,
                {
                  id: cuid(),
                  objectId: selectedObjectId,
                  x: mousePos.x,
                  y: mousePos.y,
                },
              ],
            }
          : layer,
      ),
    );
    setHasChanges(true);
  };

  const handleRemoveInstance = (
    e: React.MouseEvent,
    layerId: string,
    instanceId: string,
  ) => {
    e.stopPropagation();
    e.preventDefault();
    setLayers((prev) =>
      prev.map((layer) =>
        layer.id === layerId
          ? {
              ...layer,
              instances: layer.instances.filter(
                (inst) => inst.id !== instanceId,
              ),
            }
          : layer,
      ),
    );
    setHasChanges(true);
  };

  const ghostSprite = getCachedSprite(selectedObjectId);

  return (
    <div className="flex flex-col w-full h-full bg-c-light text-black text-sm select-none relative">
      <Modal
        isOpen={showConfirmClose}
        type="confirm"
        title="Unsaved Changes"
        message="You have unsaved changes. If you close now, they will be lost."
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

      <Modal
        isOpen={!!layerToDelete}
        type="confirm"
        title="Delete Layer"
        message="Are you sure you want to delete this layer? All instances inside it will be lost."
        confirmText="Delete Layer"
        onCancel={() => setLayerToDelete(null)}
        onConfirm={() => {
          if (layerToDelete) {
            setLayers((prev) => prev.filter((l) => l.id !== layerToDelete));
            if (activeLayerId === layerToDelete)
              setActiveLayerId(
                layers.find((l) => l.id !== layerToDelete)?.id || "",
              );
            setHasChanges(true);
          }
          setLayerToDelete(null);
        }}
      />

      {/* TOP MENU */}
      <div className="flex items-center bg-c-lighter border-b border-c-darker px-2 py-1 gap-2 relative z-10 shrink-0 shadow-sm">
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
        {hasChanges && (
          <span className="ml-auto text-xs text-red-600 font-semibold italic">
            * Unsaved changes
          </span>
        )}
      </div>

      <div className="flex flex-1 min-h-0">
        <div className="w-72 bg-neutral-200 border-r border-c-darker flex flex-col shrink-0 overflow-y-auto custom-scrollbar z-10 p-3 gap-3">
          {/* ROOM CARD */}
          <div className="bg-white rounded-md border border-neutral-300 shadow-sm p-3 flex flex-col gap-3">
            <h3 className="font-bold text-c-dark tracking-wide uppercase text-xs flex items-center gap-2 border-b pb-1">
              <IconRenderer icon="Room" width={14} height={14} /> Room
              Properties
            </h3>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-neutral-600">
                Room Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setHasChanges(true);
                }}
                className="border border-neutral-300 bg-neutral-50 px-2 py-1.5 rounded outline-none focus:border-blue-500 transition-colors"
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold text-neutral-600">
                  Width
                </label>
                <input
                  type="number"
                  name="width"
                  value={roomProps.width}
                  onChange={handlePropChange}
                  className="border border-neutral-300 bg-neutral-50 px-2 py-1 rounded outline-none"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold text-neutral-600">
                  Height
                </label>
                <input
                  type="number"
                  name="height"
                  value={roomProps.height}
                  onChange={handlePropChange}
                  className="border border-neutral-300 bg-neutral-50 px-2 py-1 rounded outline-none"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold text-neutral-600">
                  Grid
                </label>
                <input
                  type="number"
                  name="gridSize"
                  value={roomProps.gridSize}
                  onChange={handlePropChange}
                  className="border border-neutral-300 bg-neutral-50 px-2 py-1 rounded outline-none"
                />
              </div>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <input
                type="checkbox"
                id={`default-${windowData.id}`}
                name="isDefault"
                checked={roomProps.isDefault}
                onChange={handlePropChange}
                className="cursor-pointer"
              />
              <label
                htmlFor={`default-${windowData.id}`}
                className="text-xs font-semibold text-neutral-700 cursor-pointer"
              >
                Set as Default Start Room
              </label>
            </div>
          </div>

          {/* CAMERA CARD */}
          <div className="bg-white rounded-md border border-neutral-300 shadow-sm p-3 flex flex-col gap-3">
            <h3 className="font-bold text-c-dark tracking-wide uppercase text-xs flex items-center gap-2 border-b pb-1">
              <IconRenderer icon="MagnifyingGlass" width={14} height={14} />{" "}
              Camera & Viewport
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold text-neutral-600">
                  Start X
                </label>
                <input
                  type="number"
                  name="x"
                  value={camera.x}
                  onChange={handleCameraChange}
                  className="border border-neutral-300 bg-neutral-50 px-2 py-1 rounded outline-none"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold text-neutral-600">
                  Start Y
                </label>
                <input
                  type="number"
                  name="y"
                  value={camera.y}
                  onChange={handleCameraChange}
                  className="border border-neutral-300 bg-neutral-50 px-2 py-1 rounded outline-none"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold text-neutral-600">
                  View Width
                </label>
                <input
                  type="number"
                  name="width"
                  value={camera.width}
                  onChange={handleCameraChange}
                  className="border border-neutral-300 bg-neutral-50 px-2 py-1 rounded outline-none"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold text-neutral-600">
                  View Height
                </label>
                <input
                  type="number"
                  name="height"
                  value={camera.height}
                  onChange={handleCameraChange}
                  className="border border-neutral-300 bg-neutral-50 px-2 py-1 rounded outline-none"
                />
              </div>
              <div className="flex flex-col gap-1 col-span-2">
                <label className="text-[10px] font-semibold text-neutral-600">
                  Pan Smoothing (Lerp Delay)
                </label>
                <input
                  type="number"
                  step="0.1"
                  name="panDelay"
                  value={camera.panDelay}
                  onChange={handleCameraChange}
                  className="border border-neutral-300 bg-neutral-50 px-2 py-1 rounded outline-none"
                />
              </div>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <input
                type="checkbox"
                id={`clamp-${windowData.id}`}
                name="clampToRoom"
                checked={camera.clampToRoom}
                onChange={handleCameraChange}
                className="cursor-pointer"
              />
              <label
                htmlFor={`clamp-${windowData.id}`}
                className="text-xs font-semibold text-neutral-700 cursor-pointer"
              >
                Clamp to Room Bounds
              </label>
            </div>
          </div>

          {/* LAYERS CARD */}
          <div className="bg-white rounded-md border border-neutral-300 shadow-sm p-3 flex flex-col gap-2">
            <div className="flex justify-between items-center mb-1 border-b pb-1">
              <h3 className="font-bold text-c-dark tracking-wide uppercase text-xs">
                Layers
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={() => addLayer("instances")}
                  className="text-blue-600 hover:text-blue-800"
                  title="Add Instances Layer"
                >
                  <IconRenderer icon="Object" width={14} height={14} />
                </button>
                <button
                  onClick={() => addLayer("background")}
                  className="text-green-600 hover:text-green-800"
                  title="Add Background Layer"
                >
                  <IconRenderer icon="Image" width={14} height={14} />
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              {layers.map((layer, index) => (
                <div
                  key={layer.id}
                  onClick={() => setActiveLayerId(layer.id)}
                  className={`flex items-center justify-between px-2 py-1.5 border rounded cursor-pointer transition ${activeLayerId === layer.id ? "bg-blue-600 text-white border-blue-600" : "bg-neutral-50 border-neutral-200 hover:bg-neutral-100"}`}
                >
                  <div className="flex items-center gap-2">
                    <IconRenderer
                      icon={layer.type === "instances" ? "Object" : "Image"}
                      width={14}
                      height={14}
                    />
                    <span className="text-xs font-medium truncate w-20">
                      {layer.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        moveLayer(index, -1);
                      }}
                      disabled={index === 0}
                      className="disabled:opacity-30"
                    >
                      <IconRenderer
                        icon="ChevronDown"
                        className="rotate-180"
                        width={12}
                        height={12}
                      />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        moveLayer(index, 1);
                      }}
                      disabled={index === layers.length - 1}
                      className="disabled:opacity-30"
                    >
                      <IconRenderer icon="ChevronDown" width={12} height={12} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteLayer(layer.id);
                      }}
                      disabled={layer.isDeletable === false}
                      className={`ml-1 ${layer.isDeletable === false ? "opacity-20 cursor-not-allowed" : "text-red-400 hover:text-red-600"}`}
                      title={
                        layer.isDeletable === false
                          ? "Default layer cannot be deleted"
                          : "Delete Layer"
                      }
                    >
                      <IconRenderer icon="Trash" width={12} height={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* LAYER PROPERTIES */}
            {activeLayer && (
              <div className="mt-2 bg-neutral-100 p-2 border border-neutral-300 rounded flex flex-col gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-semibold text-neutral-600">
                    Layer Name
                  </label>
                  <input
                    type="text"
                    value={activeLayer.name}
                    onChange={(e) =>
                      updateActiveLayer({ name: e.target.value })
                    }
                    className="border border-neutral-300 bg-white px-2 py-1 rounded outline-none text-xs"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-semibold text-neutral-600">
                      Parallax X
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={activeLayer.parallaxX}
                      onChange={(e) =>
                        updateActiveLayer({ parallaxX: Number(e.target.value) })
                      }
                      className="border border-neutral-300 bg-white px-1 py-1 rounded outline-none text-xs"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-semibold text-neutral-600">
                      Parallax Y
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={activeLayer.parallaxY}
                      onChange={(e) =>
                        updateActiveLayer({ parallaxY: Number(e.target.value) })
                      }
                      className="border border-neutral-300 bg-white px-1 py-1 rounded outline-none text-xs"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* DYNAMIC ASSET BROWSER CARD (OBJECTS OR SPRITES) */}
          <div className="bg-white rounded-md border border-neutral-300 shadow-sm p-3 flex flex-col gap-2 flex-1 min-h-[200px]">
            <h3 className="font-bold text-c-dark tracking-wide uppercase text-xs border-b pb-1">
              {activeLayer?.type === "instances"
                ? "Available Objects"
                : "Available Sprites"}
            </h3>
            <p className="text-[10px] text-neutral-500 leading-tight">
              {activeLayer?.type === "instances"
                ? "Select to paint instances on grid."
                : "Select to assign background to layer."}
            </p>
            <div className="flex-1 overflow-y-auto bg-neutral-50 border border-neutral-200 rounded p-1 flex flex-col gap-1">
              {activeLayer?.type === "instances" &&
                availableObjects.map((obj) => (
                  <button
                    key={obj.id}
                    onClick={() => setSelectedObjectId(obj.id)}
                    className={`text-left px-2 py-1.5 rounded text-xs flex items-center gap-2 truncate ${selectedObjectId === obj.id ? "bg-blue-100 text-blue-900 font-semibold" : "hover:bg-neutral-200"}`}
                  >
                    <IconRenderer
                      icon="Object"
                      width={14}
                      height={14}
                      className={
                        selectedObjectId === obj.id
                          ? "text-blue-600"
                          : "text-neutral-500"
                      }
                    />
                    {obj.label}
                  </button>
                ))}

              {activeLayer?.type === "background" && (
                <>
                  <button
                    onClick={() =>
                      updateActiveLayer({ backgroundAssetId: null })
                    }
                    className={`text-left px-2 py-1.5 rounded text-xs flex items-center gap-2 truncate ${!activeLayer.backgroundAssetId ? "bg-blue-100 text-blue-900 font-semibold" : "hover:bg-neutral-200"}`}
                  >
                    <IconRenderer
                      icon="Image"
                      width={14}
                      height={14}
                      className={
                        !activeLayer.backgroundAssetId
                          ? "text-blue-600"
                          : "text-neutral-500"
                      }
                    />
                    (No Background)
                  </button>
                  {availableSprites.map((spr) => (
                    <button
                      key={spr.id}
                      onClick={() =>
                        updateActiveLayer({ backgroundAssetId: spr.id })
                      }
                      className={`text-left px-2 py-1.5 rounded text-xs flex items-center gap-2 truncate ${activeLayer.backgroundAssetId === spr.id ? "bg-blue-100 text-blue-900 font-semibold" : "hover:bg-neutral-200"}`}
                    >
                      <IconRenderer
                        icon="Image"
                        width={14}
                        height={14}
                        className={
                          activeLayer.backgroundAssetId === spr.id
                            ? "text-blue-600"
                            : "text-neutral-500"
                        }
                      />
                      {spr.label}
                    </button>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT PANEL: INTERACTIVE CANVAS */}
        <div
          ref={workspaceContainerRef}
          className="flex-1 bg-c-dark overflow-hidden relative bg-checkerboard cursor-crosshair"
          onWheel={handleWheel}
          onPointerDown={handlePointerDownCanvas}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          onContextMenu={(e) => e.preventDefault()}
        >
          {/* Controls Hint */}
          <div className="absolute top-4 right-4 bg-black/50 text-white text-xs px-3 py-2 rounded pointer-events-none z-50">
            <p>
              <strong>Pan Workspace:</strong> Middle Mouse / Alt+Click
            </p>
            <p>
              <strong>Zoom:</strong> Scroll Wheel ({(zoom * 100).toFixed(0)}%)
            </p>
          </div>

          {/* The Transform Container */}
          <div
            className="absolute top-0 left-0 origin-top-left"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              width: `${roomProps.width}px`,
              height: `${roomProps.height}px`,
            }}
          >
            {/* Background / Grid */}
            <div
              className="absolute inset-0 bg-[#2a2a2a] shadow-2xl"
              style={{
                backgroundImage: `linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)`,
                backgroundSize: `${roomProps.gridSize}px ${roomProps.gridSize}px`,
              }}
              onClick={handleCanvasClick}
            />
            <div className="absolute inset-0 border-2 border-blue-500/50 pointer-events-none" />

            {/* RENDER LAYERS */}
            {[...layers]
              .reverse()
              .filter((l) => l.visible)
              .map((layer) => {
                const bgCache =
                  layer.type === "background"
                    ? getCachedSprite(layer.backgroundAssetId || null)
                    : null;

                return (
                  <div
                    key={layer.id}
                    className={`absolute inset-0 pointer-events-none ${layer.id !== activeLayerId ? "opacity-70" : ""}`}
                  >
                    {/* Background Layer Rendering */}
                    {layer.type === "background" && bgCache?.url && (
                      <div
                        className="absolute inset-0 rendering-pixelated"
                        style={{
                          backgroundImage: `url(${bgCache.url})`,
                          backgroundRepeat: "repeat",
                        }}
                      />
                    )}

                    {/* Instances Rendering */}
                    {layer.instances.map((inst) => {
                      const objLabel =
                        availableObjects.find((o) => o.id === inst.objectId)
                          ?.label || "Unknown";
                      const cache = getCachedSprite(inst.objectId);

                      return (
                        <div
                          key={inst.id}
                          onPointerDown={(e) =>
                            handlePointerDownInstance(e, layer.id, inst.id)
                          }
                          onContextMenu={(e) =>
                            handleRemoveInstance(e, layer.id, inst.id)
                          }
                          onClick={(e) => e.stopPropagation()}
                          className={`absolute flex items-center justify-center overflow-hidden cursor-move pointer-events-auto transition-all group hover:outline hover:outline-2 hover:outline-red-500 ${draggingInst?.instId === inst.id ? "opacity-80 z-50 scale-105 shadow-xl" : ""}`}
                          style={{
                            left: `${inst.x}px`,
                            top: `${inst.y}px`,
                            width: `${cache?.width}px`,
                            height: `${cache?.height}px`,
                            backgroundColor: cache?.url
                              ? "transparent"
                              : "rgba(59, 130, 246, 0.8)",
                          }}
                          title={`${layer.name}\n${objLabel}`}
                        >
                          {cache?.url ? (
                            <div
                              className="rendering-pixelated w-full h-full group-hover:opacity-60 transition-opacity"
                              style={{
                                backgroundImage: `url(${cache.url})`,
                                backgroundPosition: `-${cache.offsetX}px -${cache.offsetY}px`,
                                backgroundRepeat: "no-repeat",
                              }}
                            />
                          ) : (
                            <IconRenderer
                              icon="Object"
                              width={16}
                              height={16}
                              className="text-white group-hover:text-red-200"
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}

            {/* GHOST CURSOR */}
            {selectedObjectId &&
              !isPanning &&
              !draggingInst &&
              ghostSprite &&
              activeLayer?.type === "instances" && (
                <div
                  className="absolute opacity-50 pointer-events-none z-50 transition-all duration-75"
                  style={{
                    left: mousePos.x,
                    top: mousePos.y,
                    width: ghostSprite.width,
                    height: ghostSprite.height,
                    backgroundColor: ghostSprite.url
                      ? "transparent"
                      : "rgba(59, 130, 246, 0.5)",
                  }}
                >
                  {ghostSprite.url && (
                    <div
                      className="rendering-pixelated w-full h-full"
                      style={{
                        backgroundImage: `url(${ghostSprite.url})`,
                        backgroundPosition: `-${ghostSprite.offsetX}px -${ghostSprite.offsetY}px`,
                        backgroundRepeat: "no-repeat",
                      }}
                    />
                  )}
                </div>
              )}

            {/* Camera View Indicator */}
            <div
              className="absolute top-0 left-0 border-2 border-red-500 pointer-events-none flex items-start justify-start p-1"
              style={{
                width: `${camera.width}px`,
                height: `${camera.height}px`,
                transform: `translate(${camera.x}px, ${camera.y}px)`,
              }}
            >
              <span className="text-red-500 font-bold text-[10px] bg-black/50 px-1 rounded">
                Camera View
              </span>
            </div>
          </div>
        </div>
      </div>

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
          Save Room
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

export default RoomEditor;
