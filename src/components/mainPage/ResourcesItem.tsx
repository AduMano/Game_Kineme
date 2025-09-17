import { Disclosure, DisclosureButton, DisclosurePanel } from "@headlessui/react";
import type { IResourcesItem } from "../../types/ResourcesItemTypes";
import { IconRenderer } from "../IconRenderer";
import { NESTED_COLORS } from "../../Constants";
import ContextMenu from "../ContextMenu";
import { useEffect, useRef, useState, type RefObject } from "react";
import type { ContextMenuItem } from "../../types/ContextMenuTypes";
import { useResourcesStore } from "../../pages/modules/stores/useResourcesStore";
import { useGlobalClick } from "../../hooks/useGlobalClick";

const FolderItem = ({ id, fromDirectory, icon, label, className, subDirectory, level, parent }: IResourcesItem) => {
  const currentColor = NESTED_COLORS[level! % NESTED_COLORS.length];
  const disclosureRef = useRef<HTMLButtonElement | null>(null)
  const [isOpen, setOpenState] = useState<boolean>(false);
  const [isNaming, setNamingState] = useState<boolean>(false);
  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [menuItems, setMenuItems] = useState<ContextMenuItem[]>([]);
  const nameField = useRef<HTMLInputElement>(null);
  const addItem = useResourcesStore(state => state.addItem);
  const removeItem = useResourcesStore(state => state.removeItem);
  const renameItem = useResourcesStore(state => state.renameItem);

  const handleAddItem = (type: "Folder" | "File") => {
    // Ask user first what to name, can be cancelled or confirm
    if (!isOpen) disclosureRef?.current?.click();
    // Then Add
    addItem({
      isFolder: type === "Folder",
      directory: fromDirectory,
      level: level!,
      name: "Testing LANG"
    });
  }

  const handleRemoveItem = () => {
    // Ask user first if they really want to delete it
    removeItem({
      id: id!,
      directory: fromDirectory,
      level: level!
    });
  }

  const handleRenameItem = (textValue: string) => {
    const name = textValue.trim();
    if (
      name === "" ||
      parent?.subDirectory?.some(file => file.icon === "Folder" && file.label === name)
    ) {
      nameField!.current!.style.borderBottomColor = "red";
      return;
    }
    else {
      const isRenamed = renameItem({
        directory: fromDirectory,
        level, id, name,
      });

      if (isRenamed) setNamingState(false);
      else nameField!.current!.style.borderBottomColor = "red";
    }
  }

  const handleContextMenu = (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    e.preventDefault();
    setMenuPos({ x: e.pageX, y: e.pageY });

    const baseItems = [
      { icon: <IconRenderer icon="File" width={16} height={16} />, label: "New File", onClick: () => handleAddItem("File") },
      { icon: <IconRenderer icon="Folder" width={16} height={16} />, label: `Create ${icon}`, onClick: () => handleAddItem("Folder") },
    ]

    setMenuItems(
      level === 0 ? baseItems :
        [
          ...baseItems,
          { icon: <IconRenderer icon="Pencil" width={16} height={16} />, label: `Rename ${icon}`, onClick: () => setNamingState(true) },
          { icon: <IconRenderer icon="Trash" width={16} height={16} />, label: `Delete ${icon}`, onClick: () => handleRemoveItem() },
        ]
    );
  }

  useEffect(() => {
    isNaming && nameField!.current!.focus();
  }, [isNaming]);

  useGlobalClick(() => {
    if (isNaming) setNamingState(false);
  }, nameField as RefObject<HTMLElement>);

  return (
    <>
      <Disclosure>
        {({ open }) => (
          <>
            <DisclosureButton
              ref={disclosureRef}
              style={{ borderColor: level! > 0 ? currentColor : "none" }}
              onContextMenu={(e) => handleContextMenu(e)}
              className={
                `w-full px-4 py-2 relative flex items-center gap-x-4 ${className}
              hover:bg-c-darker hover:text-c-lighter hover:cursor-pointer
              select-none border-l-2 text-black outline-none
              ${className}
            `}
              onClick={(e) => {
                if (isNaming) e.preventDefault();
                else {
                  setMenuPos(null);
                  setOpenState(current => !current);
                }
              }}
              onKeyDown={e => {
                if (e.key === "Enter") e.preventDefault();
                else if (e.key.trim() === "") {
                  e.preventDefault();
                  nameField!.current!.value += " ";
                }
              }}
            >
              <IconRenderer
                icon={open ? "OpenFolder" : "Folder"}
                width={level! > 0 ? 16 : 20}
                height={level! > 0 ? 16 : 20}
              />
              {isNaming ? (
                <input
                  ref={nameField}
                  type="text"
                  style={{ borderBottomColor: "gray" }}
                  className="relative w-[80%] text-left border-b-2 border-gray-600 bg-transparent outline-none"
                  onKeyDown={(e) => e.key === "Enter" && handleRenameItem(e.currentTarget.value)}
                />
              ) : (
                <h1 title={label} className="relative w-[80%] text-left truncate text-ellipsis">{label}</h1>
              )}
              <IconRenderer className="relative flex justify-end text-right flex-1" icon={open ? "ChevronDown" : "ChevronRight"} width={16} height={16} />
            </DisclosureButton>

            <DisclosurePanel className={`relative w-full pl-2`}>
              {
                subDirectory!.length !== 0 ?
                  subDirectory!.map((sub, index) => (
                    <ResourcesItem key={index} id={sub.id} fromDirectory={sub.fromDirectory} icon={sub.icon} label={sub.label} className={`${sub.className}`} subDirectory={sub.subDirectory} level={(level! + 1)} />
                  )) :
                  (
                    <span className="relative text-center my-2 block text-sm text-c-darker">Empty</span>
                  )
              }
            </DisclosurePanel>
          </>
        )}
      </Disclosure >

      {menuPos && (
        <ContextMenu
          x={menuPos.x}
          y={menuPos.y}
          items={menuItems}
          onClose={() => setMenuPos(null)}
        />
      )
      }
    </>
  )
};

const FileItem = ({ id, fromDirectory, icon, label, className, level, parent, }: IResourcesItem) => {
  const currentColor = NESTED_COLORS[level! % NESTED_COLORS.length];
  const nameField = useRef<HTMLInputElement | null>(null);
  const [isNaming, setNamingState] = useState<boolean>(false);
  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [menuItems, setMenuItems] = useState<ContextMenuItem[]>([]);
  const renameItem = useResourcesStore(state => state.renameItem);
  const removeItem = useResourcesStore(state => state.removeItem);

  const handleRemoveItem = () => {
    // Ask user first if they really want to delete it
    removeItem({
      id: id!,
      directory: fromDirectory,
      level: level!
    });
  }

  const handleRenameItem = (textValue: string) => {
    const name = textValue.trim();
    if (
      name === "" ||
      parent?.subDirectory?.some(file => file.icon === "Folder" && file.label === name)
    ) {
      nameField!.current!.style.borderBottomColor = "red";
      return;
    }
    else {
      const isRenamed = renameItem({
        directory: fromDirectory,
        level, id, name,
      });

      if (isRenamed) setNamingState(false);
      else nameField!.current!.style.borderBottomColor = "red";
    }
  }

  const handleContextMenu = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    e.preventDefault();
    setMenuPos({ x: e.pageX, y: e.pageY });

    const baseItems = [
      { icon: <IconRenderer icon="MagnifyingGlass" width={16} height={16} />, label: "Open", onClick: () => alert("Opening") },
      { icon: <IconRenderer icon="Pencil" width={16} height={16} />, label: `Rename`, onClick: () => setNamingState(true) },
      { icon: <IconRenderer icon="Trash" width={16} height={16} />, label: `Delete`, onClick: () => handleRemoveItem() },
    ];

    setMenuItems(baseItems);
  }

  useEffect(() => {
    isNaming && nameField!.current!.focus();
  }, [isNaming]);

  useGlobalClick(() => {
    if (isNaming) setNamingState(false);
  });

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
        {isNaming ? (
          <input
            ref={nameField}
            type="text"
            style={{ borderBottomColor: "gray" }}
            className="relative w-[80%] text-left border-b-2 border-gray-600 bg-transparent outline-none"
            onKeyDown={(e) => e.key === "Enter" && handleRenameItem(e.currentTarget.value)}
          />
        ) : (
          <h1 title={label} className="relative w-[80%] text-left truncate text-ellipsis">{label}</h1>
        )}
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

export const ResourcesItem = ({
  id,
  fromDirectory,
  icon = "File",
  label = "Item",
  className = "",
  subDirectory = [],
  level = 0,
  parent
}: IResourcesItem) => {
  return icon === "Folder" ? (
    <FolderItem
      id={id}
      fromDirectory={fromDirectory}
      icon={icon}
      label={label}
      className={className}
      subDirectory={subDirectory}
      level={level}
      parent={parent}
    />
  ) : (
    <FileItem
      id={id}
      fromDirectory={fromDirectory}
      icon={icon}
      label={label}
      className={className}
      level={level}
      parent={parent}
    />
  );
};
