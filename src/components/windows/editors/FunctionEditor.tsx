import { useState, useEffect, useRef } from "react";
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

const FunctionEditor = ({ windowData }: EditorProps) => {
  const { requestClose, registerInterceptors, updateWindowTitle } =
    useWindowStore();
  const { updateItemData, renameItem } = useResourcesStore();

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

  const savedData = (fileNode as any)?.data;

  const [hasChanges, setHasChanges] = useState(false);
  const [menuPos, setMenuPos] = useState<{
    x: number;
    y: number;
    items: ContextMenuItem[];
  } | null>(null);
  const [showConfirmClose, setShowConfirmClose] = useState(false);
  const confirmPromiseResolve = useRef<((value: boolean) => void) | null>(null);

  const [name, setName] = useState(windowData.title);
  const defaultCode = `export function ${windowData.title.replace(/[^a-zA-Z0-9]/g, "_")} () {\n  // Your reusable logic here\n  \n}\n`;
  const [code, setCode] = useState<string>(savedData?.code || defaultCode);

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
    updateItemData(windowData.id, { code });
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

  const handleCodeChange = (value: string | undefined) => {
    if (value === undefined) return;
    setCode(value);
    setHasChanges(true);
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
              <IconRenderer icon="Code" width={14} height={14} /> Function
              Properties
            </h3>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-semibold text-neutral-600">
                Function Name
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
          </div>

          <div className="bg-green-50 border border-green-200 p-3 rounded-md text-xs text-green-900 leading-relaxed shadow-sm shrink-0">
            <p className="font-bold mb-1">
              <IconRenderer
                icon="Code"
                width={14}
                height={14}
                className="inline mr-1"
              />
              Modular Logic
            </p>
            <p>
              Functions are isolated. They do not run automatically. You must{" "}
              <code className="bg-green-200 px-1 rounded">import</code> and call
              them from an Object's event.
            </p>
            <p className="mt-2 text-green-700 italic">
              Use this for damage calculators, procedural algorithms, or math
              utilities.
            </p>
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
            <span className="font-bold text-white">{name}.js</span>
          </div>
          <div className="flex-1 min-h-0 relative">
            <CodeEditor code={code} onChange={handleCodeChange} />
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
          Save Function
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

export default FunctionEditor;
