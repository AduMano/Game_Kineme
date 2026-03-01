import React, { useState, useEffect, useRef } from "react";
import {
  useWindowStore,
  type WindowNode,
} from "../../../pages/modules/stores/useWindowStore";
import { useResourcesStore } from "../../../pages/modules/stores/useResourcesStore";
import ContextMenu from "../../ContextMenu";
import type { ContextMenuItem } from "../../../types/ContextMenuTypes";
import { IconRenderer } from "../../IconRenderer";
import Modal from "../../Modal";
import CodeEditor from "../../CodeEditor";

interface EditorProps {
  windowData: WindowNode;
}

type EventType = "onCreate" | "onStep" | "onDestroy";

const ObjectEditor = ({ windowData }: EditorProps) => {
  const { requestClose, registerInterceptors, updateWindowTitle } =
    useWindowStore();
  const { updateItemData, renameItem, resources } = useResourcesStore();

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

  const [hasChanges, setHasChanges] = useState(false);
  const [menuPos, setMenuPos] = useState<{
    x: number;
    y: number;
    items: ContextMenuItem[];
  } | null>(null);

  const [showConfirmClose, setShowConfirmClose] = useState(false);
  const [showSpriteSelector, setShowSpriteSelector] = useState(false);
  const [spriteSearch, setSpriteSearch] = useState("");
  const confirmPromiseResolve = useRef<((value: boolean) => void) | null>(null);

  const savedData = (fileNode as any)?.data;
  const [name, setName] = useState(windowData.title);
  const [spriteId, setSpriteId] = useState<string | null>(
    savedData?.spriteId || null,
  );

  const [events, setEvents] = useState<Record<EventType, string>>({
    onCreate:
      savedData?.events?.onCreate ||
      "// Runs once when the object is created\n",
    onStep: savedData?.events?.onStep || "// Runs every frame (game loop)\n",
    onDestroy:
      savedData?.events?.onDestroy ||
      "// Runs when the object is removed from the room\n",
  });

  const [activeEvent, setActiveEvent] = useState<EventType>("onCreate");

  const spriteRoot = resources.find(
    (r) => r.fromDirectory === "Sprites" && r.level === 0,
  );
  const getAllSprites = (
    items: any[],
    currentPath = "",
  ): { id: string; label: string; path: string }[] => {
    let list: { id: string; label: string; path: string }[] = [];
    items.forEach((item) => {
      if (item.icon === "Image")
        list.push({ id: item.id, label: item.label, path: currentPath });
      if (item.subDirectory) {
        const nextPath = currentPath
          ? `${currentPath}/${item.label}`
          : item.label;
        list = list.concat(getAllSprites(item.subDirectory, nextPath));
      }
    });
    return list;
  };

  const availableSprites = spriteRoot?.subDirectory
    ? getAllSprites(spriteRoot.subDirectory)
    : [];
  const filteredSprites = availableSprites.filter(
    (s) =>
      s.label.toLowerCase().includes(spriteSearch.toLowerCase()) ||
      s.path.toLowerCase().includes(spriteSearch.toLowerCase()),
  );
  const selectedSpriteName =
    availableSprites.find((s) => s.id === spriteId)?.label || "No Sprite";

  const scriptRoot = resources.find(
    (r) => r.fromDirectory === "Scripts" && r.level === 0,
  );
  const getAllScriptsCode = (items: any[]): string => {
    let combinedCode = "";
    items.forEach((item) => {
      if (item.icon === "Script" && item.data?.code)
        combinedCode += `\n${item.data.code}\n`;
      if (item.subDirectory)
        combinedCode += getAllScriptsCode(item.subDirectory);
    });
    return combinedCode;
  };
  const userScripts = scriptRoot?.subDirectory
    ? getAllScriptsCode(scriptRoot.subDirectory)
    : "";

  const engineAPI = `
    interface KinemeObject {
      x: number; y: number; width: number; height: number;
      scaleX: number; scaleY: number; alpha: number; angle: number;
      visible: boolean; spriteId: string | null; destroy(): void;
    }
    declare const self: KinemeObject;
    
    // Tell Monaco about our Global Camera!
    declare const Camera: {
      x: number; y: number; width: number; height: number;
      follow(instance: KinemeObject): void;
    };

    ${userScripts}
  `;

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
    updateItemData(windowData.id, { spriteId, events });
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

  const handleEventCodeChange = (value: string | undefined) => {
    if (value === undefined) return;
    setEvents((prev) => ({ ...prev, [activeEvent]: value }));
    setHasChanges(true);
  };

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
        isOpen={showSpriteSelector}
        type="alert"
        title="Select Default Sprite"
        confirmText="Close"
        onConfirm={() => setShowSpriteSelector(false)}
        onCancel={() => setShowSpriteSelector(false)}
      >
        <div className="flex flex-col gap-2 mt-4 max-h-80 pr-2">
          <div className="relative mb-2">
            <IconRenderer
              icon="MagnifyingGlass"
              width={14}
              height={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
            />
            <input
              type="text"
              placeholder="Search sprites..."
              value={spriteSearch}
              onChange={(e) => setSpriteSearch(e.target.value)}
              className="w-full bg-c-dark border border-neutral-600 rounded pl-9 pr-3 py-2 text-c-lighter outline-none focus:border-blue-500"
            />
          </div>
          <div className="overflow-y-auto flex flex-col gap-2 pr-2">
            {!spriteSearch && (
              <button
                onClick={() => {
                  setSpriteId(null);
                  setHasChanges(true);
                  setShowSpriteSelector(false);
                }}
                className={`text-left px-3 py-2 rounded border ${!spriteId ? "bg-blue-600 text-white border-blue-500" : "bg-c-dark border-neutral-600 hover:bg-neutral-600 text-c-lighter"}`}
              >
                (No Sprite)
              </button>
            )}
            {filteredSprites.map((sprite) => (
              <button
                key={sprite.id}
                onClick={() => {
                  setSpriteId(sprite.id);
                  setHasChanges(true);
                  setShowSpriteSelector(false);
                }}
                className={`text-left px-3 py-2 rounded border flex flex-col ${spriteId === sprite.id ? "bg-blue-600 text-white border-blue-500" : "bg-c-dark border-neutral-600 hover:bg-neutral-600 text-c-lighter"}`}
              >
                <div className="flex items-center gap-2">
                  <IconRenderer icon="Image" width={16} height={16} />
                  <span className="font-medium">{sprite.label}</span>
                </div>
                {sprite.path && (
                  <span className="text-[10px] text-neutral-400 mt-1 truncate">
                    Folder: {sprite.path}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </Modal>

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
        {/* MATCHING CARD STYLE PANEL */}
        <div className="w-72 bg-neutral-200 border-r border-c-darker flex flex-col shrink-0 p-3 gap-3 z-10 overflow-y-auto custom-scrollbar">
          <div className="bg-white rounded-md border border-neutral-300 shadow-sm p-3 flex flex-col gap-3 shrink-0">
            <h3 className="font-bold text-c-dark tracking-wide uppercase text-xs flex items-center gap-2 border-b pb-1">
              <IconRenderer icon="Object" width={14} height={14} /> Object
              Properties
            </h3>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-semibold text-neutral-600">
                Object Name
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

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-semibold text-neutral-600">
                Default Sprite
              </label>
              <div
                onClick={() => {
                  setSpriteSearch("");
                  setShowSpriteSelector(true);
                }}
                className="border border-neutral-300 bg-neutral-50 px-2 py-2 rounded cursor-pointer hover:border-blue-500 flex items-center gap-2 transition-colors"
              >
                <div className="w-8 h-8 bg-checkerboard border border-neutral-300 flex items-center justify-center shrink-0 rounded-sm overflow-hidden">
                  {spriteId ? (
                    <IconRenderer
                      icon="Image"
                      width={16}
                      height={16}
                      className="text-blue-500"
                    />
                  ) : (
                    <span className="text-xs text-neutral-400">?</span>
                  )}
                </div>
                <span className="truncate text-xs font-medium text-neutral-700">
                  {selectedSpriteName}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-md border border-neutral-300 shadow-sm flex flex-col flex-1 min-h-[200px] overflow-hidden">
            <div className="p-3 border-b border-neutral-200 bg-neutral-50 shrink-0">
              <h3 className="font-bold text-c-dark tracking-wide uppercase text-xs flex items-center gap-2">
                <IconRenderer icon="Code" width={14} height={14} /> Events
              </h3>
            </div>

            <div className="flex-1 overflow-y-auto flex flex-col">
              {(["onCreate", "onStep", "onDestroy"] as EventType[]).map(
                (evt) => (
                  <button
                    key={evt}
                    onClick={() => setActiveEvent(evt)}
                    className={`px-4 py-3 text-left border-b border-neutral-100 flex items-center justify-between transition text-xs ${activeEvent === evt ? "bg-blue-50 border-l-4 border-l-blue-600 text-blue-900 font-semibold" : "hover:bg-neutral-50 text-neutral-700 border-l-4 border-l-transparent"}`}
                  >
                    {evt}
                    <IconRenderer
                      icon="Code"
                      width={14}
                      height={14}
                      className={
                        activeEvent === evt
                          ? "text-blue-600"
                          : "text-neutral-400"
                      }
                    />
                  </button>
                ),
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col bg-[#1e1e1e] min-w-0">
          <div className="bg-[#2d2d2d] text-gray-300 px-4 py-2 text-sm border-b border-black shadow-sm flex items-center gap-2 shrink-0">
            <IconRenderer
              icon="Code"
              width={16}
              height={16}
              className="text-yellow-500"
            />
            Editing Event:{" "}
            <span className="font-bold text-white">{activeEvent}</span>
          </div>
          <div className="flex-1 min-h-0 relative">
            <CodeEditor
              code={events[activeEvent]}
              onChange={handleEventCodeChange}
              customLib={engineAPI}
            />
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
          Save Object
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

export default ObjectEditor;
