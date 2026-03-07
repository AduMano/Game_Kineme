import React, { useState, useRef } from "react";
import type { IToolbarItem } from "../../types/ToolbarItemTypes";
import { IconRenderer } from "../IconRenderer";
import type { ContextMenuItem } from "../../types/ContextMenuTypes";
import ContextMenu from "../ContextMenu";
import Modal from "../Modal";
import { useWindowStore } from "../../pages/modules/stores/useWindowStore";
import {
  exportProjectLocally,
  saveProjectToBrowser,
  getBrowserProjects,
  loadProjectFromBrowser,
  importProjectFromFile,
  createNewProject,
  getIsProjectDirty,
  type SavedProject,
} from "../../pages/modules/stores/utilities/projectManager";

export const ToolbarItem = ({
  icon = "File",
  label = "Item",
  className = "",
}: IToolbarItem) => {
  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [menuItems, setMenuItems] = useState<ContextMenuItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Modal States ---
  const [showSaveLocalModal, setShowSaveLocalModal] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [showLoadLocalModal, setShowLoadLocalModal] = useState(false);

  // Warning Modal State
  const [showDirtyWarning, setShowDirtyWarning] = useState(false);
  const pendingAction = useRef<(() => void) | null>(null);

  const [projectName, setProjectName] = useState("MyKinemeGame");
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [browserProjects, setBrowserProjects] = useState<SavedProject[]>([]);

  // --- DIRTY CHECKER WRAPPER ---
  const executeWithDirtyCheck = (action: () => void) => {
    const isProjectDirty = getIsProjectDirty();
    const hasOpenWindows = useWindowStore.getState().windows.length > 0;

    // If the resource tree has changed OR if any editor windows are currently open
    if (isProjectDirty || hasOpenWindows) {
      pendingAction.current = action;
      setShowDirtyWarning(true);
    } else {
      action();
    }
  };

  const handleConfirmDirtyWarning = () => {
    setShowDirtyWarning(false);
    if (pendingAction.current) {
      pendingAction.current();
      pendingAction.current = null;
    }
  };

  // --- SAVE MENUS ---
  const handleSaveContextMenu = (
    e: React.MouseEvent<HTMLDivElement, MouseEvent>,
  ) => {
    e.preventDefault();
    setMenuPos({ x: e.pageX, y: e.pageY });
    setMenuItems([
      {
        icon: <IconRenderer icon="CircleStack" width={16} height={16} />,
        label: `Save Locally (Browser)`,
        onClick: () => {
          setSaveSuccess(false);
          setShowSaveLocalModal(true);
        },
      },
      {
        icon: <IconRenderer icon="FolderArrowDown" width={16} height={16} />,
        label: `Download (.kineme)`,
        onClick: () => setShowDownloadModal(true),
      },
    ]);
  };

  // --- LOAD MENUS ---
  const handleLoadContextMenu = (
    e: React.MouseEvent<HTMLDivElement, MouseEvent>,
  ) => {
    e.preventDefault();
    setMenuPos({ x: e.pageX, y: e.pageY });
    setMenuItems([
      {
        icon: <IconRenderer icon="CircleStack" width={16} height={16} />,
        label: `Load from Browser`,
        onClick: () => {
          setBrowserProjects(getBrowserProjects());
          setShowLoadLocalModal(true);
        },
      },
      {
        icon: <IconRenderer icon="FolderArrowDown" width={16} height={16} />,
        label: `Load from PC (.kineme)`,
        onClick: () =>
          executeWithDirtyCheck(() => fileInputRef.current?.click()),
      },
    ]);
  };

  const handleDownloadConfirm = async () => {
    setShowDownloadModal(false);
    if (projectName.trim() !== "")
      await exportProjectLocally(projectName.trim());
  };

  const handleSaveLocalConfirm = () => {
    if (projectName.trim() !== "") {
      const success = saveProjectToBrowser(projectName.trim());
      if (success) {
        setSaveSuccess(true);
        setTimeout(() => {
          setShowSaveLocalModal(false);
          setSaveSuccess(false);
        }, 1500);
      }
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await importProjectFromFile(file);
    }
    e.target.value = ""; // Reset input
  };

  return (
    <>
      <input
        type="file"
        accept=".kineme,.zip"
        ref={fileInputRef}
        className="hidden"
        onChange={handleFileUpload}
      />

      {/* DIRTY WARNING MODAL */}
      <Modal
        isOpen={showDirtyWarning}
        type="confirm"
        title="Warning: Active Workspace"
        message="You have an active workspace with open windows or unsaved changes. Opening a different project will discard your current session. Do you want to proceed?"
        confirmText="Proceed & Discard"
        onConfirm={handleConfirmDirtyWarning}
        onCancel={() => {
          setShowDirtyWarning(false);
          pendingAction.current = null;
        }}
      />

      <Modal
        isOpen={showSaveLocalModal}
        type="confirm"
        title="Save to Browser"
        message={
          saveSuccess
            ? ""
            : "Name your project to save it in your browser's local library:"
        }
        confirmText={saveSuccess ? "Saved!" : "Save Project"}
        onConfirm={handleSaveLocalConfirm}
        onCancel={() => setShowSaveLocalModal(false)}
      >
        <div className="mt-4">
          {saveSuccess ? (
            <div className="bg-green-500/20 text-green-400 p-3 rounded border border-green-500/50 flex items-center justify-center gap-2">
              <IconRenderer icon="Code" width={20} height={20} />
              <span className="font-bold">Project saved successfully!</span>
            </div>
          ) : (
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              className="w-full border border-c-darker bg-[#1e1e1e] text-c-lighter px-3 py-2 rounded outline-none focus:border-blue-500 transition-colors"
              placeholder="Project Name..."
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleSaveLocalConfirm()}
            />
          )}
        </div>
      </Modal>

      <Modal
        isOpen={showDownloadModal}
        type="confirm"
        title="Download Project"
        message="Enter a file name for your downloaded .kineme backup:"
        confirmText="Download"
        onConfirm={handleDownloadConfirm}
        onCancel={() => setShowDownloadModal(false)}
      >
        <div className="mt-4">
          <input
            type="text"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            className="w-full border border-c-darker bg-[#1e1e1e] text-c-lighter px-3 py-2 rounded outline-none focus:border-blue-500 transition-colors"
            placeholder="File Name..."
            autoFocus
            onKeyDown={(e) => e.key === "Enter" && handleDownloadConfirm()}
          />
        </div>
      </Modal>

      <Modal
        isOpen={showLoadLocalModal}
        type="alert"
        title="Load Browser Project"
        confirmText="Close"
        onConfirm={() => setShowLoadLocalModal(false)}
        onCancel={() => setShowLoadLocalModal(false)}
      >
        <div className="mt-4 max-h-60 overflow-y-auto flex flex-col gap-2 custom-scrollbar pr-2">
          {browserProjects.length === 0 ? (
            <p className="text-sm text-neutral-400 text-center py-4">
              No saved projects found in browser.
            </p>
          ) : (
            browserProjects.map((proj) => (
              <div
                key={proj.id}
                className="flex justify-between items-center bg-[#1e1e1e] p-3 rounded border border-neutral-700 hover:border-neutral-500 transition-colors"
              >
                <div>
                  <h4 className="font-bold text-blue-400 text-sm">
                    {proj.name}
                  </h4>
                  <p className="text-[10px] text-neutral-500">
                    {new Date(proj.updatedAt).toLocaleString()}
                  </p>
                </div>
                <button
                  onClick={() =>
                    executeWithDirtyCheck(() => {
                      loadProjectFromBrowser(proj.id);
                      setShowLoadLocalModal(false);
                    })
                  }
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded transition shadow"
                >
                  Load
                </button>
              </div>
            ))
          )}
        </div>
      </Modal>

      <div
        onContextMenu={(e) => e.preventDefault()}
        onClick={(e) => {
          if (label === "Save Project") handleSaveContextMenu(e);
          if (label === "Load Project") handleLoadContextMenu(e);
          if (label === "New Project") executeWithDirtyCheck(createNewProject);
          if (label === "Run") window.open("/run", "_blank");
          if (label === "Save All") {
            window.dispatchEvent(new Event("kineme-save-all"));
          }
        }}
        className={`flex items-center gap-2 py-2 px-4 text-black hover:text-c-lighter border-c-dark border-r-[1px] select-none active:bg-white active:text-c-darker bg-white hover:bg-c-darker hover:cursor-pointer transition-colors ${className}`}
      >
        <IconRenderer icon={icon} width={18} height={18} />
        <h1 className="font-semibold">{label}</h1>
      </div>

      {menuPos && (
        <ContextMenu
          x={menuPos.x}
          y={menuPos.y}
          items={menuItems}
          onClose={() => setMenuPos(null)}
        />
      )}
    </>
  );
};
