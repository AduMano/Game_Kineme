import { useState } from "react";
import {
  getWindowPrefix,
  useWindowStore,
  type WindowNode,
} from "../../pages/modules/stores/useWindowStore";
import ContextMenu from "../ContextMenu";
import type { ContextMenuItem } from "../../types/ContextMenuTypes";

const Taskbar = () => {
  const {
    windows,
    activeWindowId,
    restoreWindow,
    focusWindow,
    requestClose,
    requestMaximize,
    requestMinimize,
  } = useWindowStore();

  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [menuItems, setMenuItems] = useState<ContextMenuItem[]>([]);

  const handleContextMenu = (e: React.MouseEvent, win: WindowNode) => {
    e.preventDefault();
    setMenuPos({ x: e.pageX, y: e.pageY });

    setMenuItems([
      {
        label: win.isMinimized ? "Restore" : "Minimize",
        onClick: () =>
          win.isMinimized ? restoreWindow(win.id) : requestMinimize(win.id),
      },
      {
        label: win.isMaximized ? "Restore Down" : "Maximize",
        onClick: () => requestMaximize(win.id),
      },
      {
        label: "Close",
        onClick: () => requestClose(win.id),
      },
    ]);
  };

  if (windows.length === 0) return null;

  return (
    <>
      <div className="absolute bottom-0 left-0 right-0 h-10 bg-c-darker border-t border-neutral-700 flex items-center px-2 gap-2 overflow-x-auto z-[9999] select-none">
        {windows.map((win) => {
          const isActive = activeWindowId === win.id && !win.isMinimized;

          return (
            <div
              key={win.id}
              onContextMenu={(e) => handleContextMenu(e, win)}
              onClick={() => {
                if (win.isMinimized) restoreWindow(win.id);
                else focusWindow(win.id);
              }}
              className={`flex items-center px-3 py-1 text-sm rounded cursor-pointer max-w-[150px] truncate border transition-colors ${
                isActive
                  ? "bg-c-light text-black border-c-darker"
                  : "bg-c-darker text-black border-neutral-600 hover:bg-neutral-700"
              }`}
            >
              <span className="truncate">
                {getWindowPrefix(win.type)}
                {win.title}
              </span>
            </div>
          );
        })}
      </div>

      {menuPos && (
        <ContextMenu
          x={menuPos.x}
          y={menuPos.y - 120} // Push it up slightly so it doesn't spawn off the bottom of the screen!
          items={menuItems}
          onClose={() => setMenuPos(null)}
        />
      )}
    </>
  );
};

export default Taskbar;
