import { Disclosure, DisclosureButton, DisclosurePanel } from "@headlessui/react";
import type { IResourcesItem } from "../../types/ResourcesItemTypes";
import { IconRenderer } from "../IconRenderer";
import { NESTED_COLORS } from "../../Constants";
import ContextMenu from "../ContextMenu";
import { useState } from "react";
import type { ContextMenuItem } from "../../types/ContextMenuTypes";

const FolderItem = ({ icon, label, className, subDirectory, level }: IResourcesItem) => {
  const currentColor = NESTED_COLORS[level! % NESTED_COLORS.length];
  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null)
  const [menuItems, setMenuItems] = useState<ContextMenuItem[]>([])

  const handleContextMenu = (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    e.preventDefault();
    setMenuPos({ x: e.pageX, y: e.pageY });

    const baseItems = [
      { icon: <IconRenderer icon="File" width={16} height={16} />, label: "New File", onClick: () => alert("New File") },
      { icon: <IconRenderer icon="Folder" width={16} height={16} />, label: `Create ${icon}`, onClick: () => alert(`Create ${icon}`) },
      { icon: <IconRenderer icon="Pencil" width={16} height={16} />, label: `Rename ${icon}`, onClick: () => alert(`Renaming ${icon}`) },
    ]

    setMenuItems(
      level === 0 ? baseItems :
        [...baseItems, { icon: <IconRenderer icon="Trash" width={16} height={16} />, label: `Delete ${icon}`, onClick: () => alert(`Deleting ${icon}`) }]
    );
  }

  return (
    <>
      <Disclosure>
        {({ open }) => (
          <>
            <DisclosureButton
              style={{ borderColor: level! > 0 ? currentColor : "none" }}
              onContextMenu={(e) => handleContextMenu(e)}
              className={
                `w-full px-4 py-2 relative flex items-center gap-x-4 ${className}
              hover:bg-c-darker hover:text-c-lighter hover:cursor-pointer
              select-none border-l-2
              ${className}
            `}
              onClick={() => setMenuPos(null)}
            >
              <IconRenderer
                icon={open ? "OpenFolder" : "Folder"}
                width={level! > 0 ? 16 : 20}
                height={level! > 0 ? 16 : 20}
              />
              <h1 title={label} className="relative w-[80%] text-left truncate text-ellipsis">{label}</h1>
              <IconRenderer className="relative flex justify-end text-right flex-1" icon={open ? "ChevronDown" : "ChevronRight"} width={16} height={16} />
            </DisclosureButton>

            <DisclosurePanel className={`relative w-full pl-2`}>
              {
                subDirectory!.length !== 0 ?
                  subDirectory!.map((sub, index) => (
                    <ResourcesItem key={index} icon={sub.icon} label={sub.label} className={`${sub.className}`} subDirectory={sub.subDirectory} level={(level! + 1)} />
                  )) :
                  (
                    <span className="relative text-center my-2 block text-sm text-c-darker">Empty</span>
                  )
              }
            </DisclosurePanel>
          </>
        )}
      </Disclosure>

      {menuPos && (
        <ContextMenu
          x={menuPos.x}
          y={menuPos.y}
          items={menuItems}
          onClose={() => setMenuPos(null)}
        />
      )}
    </>
  )
};

const FileItem = ({ icon, label, className, level }: IResourcesItem) => {
  const currentColor = NESTED_COLORS[level! % NESTED_COLORS.length];
  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null)
  const [menuItems, setMenuItems] = useState<ContextMenuItem[]>([])

  const handleContextMenu = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    e.preventDefault();
    setMenuPos({ x: e.pageX, y: e.pageY });

    const baseItems = [
      { icon: <IconRenderer icon="MagnifyingGlass" width={16} height={16} />, label: "Open", onClick: () => alert("Opening") },
      { icon: <IconRenderer icon="Pencil" width={16} height={16} />, label: `Rename`, onClick: () => alert(`Renaming ${icon}`) },
      { icon: <IconRenderer icon="Trash" width={16} height={16} />, label: `Delete`, onClick: () => alert(`Delete ${icon}`) },
    ];

    setMenuItems(baseItems);
  }

  return (
    <>
      <div
        style={{ borderColor: level! > 0 ? `${currentColor}` : "" }}
        onContextMenu={(e) => handleContextMenu(e)}
        className={
          `w-full px-4 py-2 relative flex items-center gap-x-4 ${className}
          hover:bg-c-darker hover:text-c-lighter hover:cursor-pointer
            select-none border-l-2`
        }
      >
        <IconRenderer icon={icon} width={16} height={16} />
        <h1 title={label} className="relative w-[80%] text-left truncate text-ellipsis">{label}</h1>
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
  )
};

export const ResourcesItem = ({ icon = "File", label = "Item", className = "", subDirectory = [], level = 0 }: IResourcesItem) => (
  <>
    {icon === "Folder" ?
      (FolderItem({ icon, label, className, subDirectory, level })) :
      (FileItem({ icon, label, className, level }))
    }
  </>
);
