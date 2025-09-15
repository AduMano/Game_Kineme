import { useState } from "react";
import type { IToolbarItem } from "../../types/ToolbarItemTypes";
import { IconRenderer } from "../IconRenderer";
import type { ContextMenuItem } from "../../types/ContextMenuTypes";
import ContextMenu from "../ContextMenu";

export const ToolbarItem = ({ icon = "File", label = "Item", className = "" }: IToolbarItem) => {
  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null)
  const [menuItems, setMenuItems] = useState<ContextMenuItem[]>([])

  const handleContextMenu = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    e.preventDefault();
    setMenuPos({ x: e.pageX, y: e.pageY });

    const baseItems = [
      { icon: <IconRenderer icon="CircleStack" width={16} height={16} />, label: `Save Locally`, onClick: () => alert(`Saving locally...`) },
      { icon: <IconRenderer icon="FolderArrowDown" width={16} height={16} />, label: `Download`, onClick: () => alert(`Downloading...`) },
    ];

    setMenuItems(baseItems);
  };

  return (
    <>
      <div
        onContextMenu={(e) => e.preventDefault()}
        onClick={(e) => { label === "Save Project" && handleContextMenu(e) }}
        className={
          `flex items-center gap-2 py-2 px-4 text-black hover:text-c-lighter 
        border-c-dark border-r-[1px] select-none active:bg-white active:text-c-darker
        bg-white hover:bg-c-darker hover:cursor-pointer ${className}`
        }
      >
        <IconRenderer icon={icon} width={18} height={18} />
        <h1>{label}</h1>
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
