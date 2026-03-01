import {
  Disclosure,
  DisclosureButton,
  DisclosurePanel,
} from "@headlessui/react";
import type { IResourcesItem } from "../../types/ResourcesItemTypes";
import { IconRenderer } from "../IconRenderer";
import { NESTED_COLORS } from "../../Constants";
import ContextMenu from "../ContextMenu";
import { useEffect, useRef, useState, type RefObject } from "react";
import type { ContextMenuItem } from "../../types/ContextMenuTypes";
import { useResourcesStore } from "../../pages/modules/stores/useResourcesStore";
import { useGlobalClick } from "../../hooks/useGlobalClick";
import {
  useWindowStore,
  type WindowType,
} from "../../pages/modules/stores/useWindowStore";
import cuid from "cuid";

const FolderItem = ({
  id,
  fromDirectory,
  icon,
  label,
  className,
  subDirectory,
  level,
  parent,
}: IResourcesItem) => {
  const currentColor = NESTED_COLORS[level! % NESTED_COLORS.length];
  const disclosureRef = useRef<HTMLButtonElement | null>(null);
  const [isOpen, setOpenState] = useState<boolean>(false);
  const [isNaming, setNamingState] = useState<boolean>(false);
  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [menuItems, setMenuItems] = useState<ContextMenuItem[]>([]);
  const nameField = useRef<HTMLInputElement>(null);

  const addItem = useResourcesStore((state) => state.addItem);
  const removeItem = useResourcesStore((state) => state.removeItem);
  const renameItem = useResourcesStore((state) => state.renameItem);
  const editingItemId = useResourcesStore((state) => state.editingItemId);
  const setEditingItemId = useResourcesStore((state) => state.setEditingItemId);

  const updateWindowTitle = useWindowStore((state) => state.updateWindowTitle);
  const closeWindow = useWindowStore((state) => state.closeWindow); // Added closeWindow for folders!

  useEffect(() => {
    if (editingItemId === id) {
      setNamingState(true);
      setEditingItemId(null);
    }
  }, [editingItemId, id, setEditingItemId]);

  const handleAddItem = (type: "Folder" | "File") => {
    if (!isOpen) disclosureRef?.current?.click();

    let baseName = label!;
    if (level === 0 && label?.endsWith("s")) baseName = label.slice(0, -1);
    const prefix = type === "Folder" ? `${baseName}Folder` : baseName;

    const regex = new RegExp(`^${prefix}_(\\d{3})$`);
    const existingNumbers = (subDirectory || [])
      .map((item) => {
        const match = item.label?.match(regex);
        return match ? parseInt(match[1], 10) : null;
      })
      .filter((n) => n !== null) as number[];

    let nextNum = 1;
    while (existingNumbers.includes(nextNum)) nextNum++;
    const newName = `${prefix}_${nextNum.toString().padStart(3, "0")}`;
    const newId = cuid();

    addItem({
      id: newId,
      isFolder: type === "Folder",
      directory: fromDirectory,
      level: level!,
      name: newName,
    });

    setEditingItemId(newId);
  };

  const handleRemoveItem = () => {
    if (
      window.confirm(
        `Are you sure you want to delete the folder "${label}" and all its contents?`,
      )
    ) {
      // 1. Helper to gather all nested IDs inside this folder
      const gatherIds = (subs: IResourcesItem[] | undefined): string[] => {
        let ids: string[] = [];
        if (!subs) return ids;
        subs.forEach((s) => {
          if (s.id) ids.push(s.id);
          if (s.subDirectory) ids = ids.concat(gatherIds(s.subDirectory));
        });
        return ids;
      };

      const allIdsToClose = [id!, ...gatherIds(subDirectory)];

      // 2. Remove the item from the file tree
      removeItem({
        id: id!,
        directory: fromDirectory,
        level: level!,
      });

      // 3. Force close every window associated with those deleted files
      allIdsToClose.forEach((childId) => closeWindow(childId));
    }
  };

  const handleRenameItem = (textValue: string) => {
    const name = textValue.trim();
    if (
      name === "" ||
      parent?.subDirectory?.some(
        (file) => file.icon === "Folder" && file.label === name,
      )
    ) {
      nameField!.current!.style.borderBottomColor = "red";
      return;
    } else {
      const isRenamed = renameItem({
        directory: fromDirectory,
        level,
        id,
        name,
      });
      if (isRenamed) {
        setNamingState(false);
        updateWindowTitle(id!, name);
      } else {
        nameField!.current!.style.borderBottomColor = "red";
      }
    }
  };

  const handleContextMenu = (
    e: React.MouseEvent<HTMLButtonElement, MouseEvent>,
  ) => {
    e.preventDefault();
    setMenuPos({ x: e.pageX, y: e.pageY });

    const baseItems = [
      {
        icon: <IconRenderer icon="File" width={16} height={16} />,
        label: "New File",
        onClick: () => handleAddItem("File"),
      },
      {
        icon: <IconRenderer icon="Folder" width={16} height={16} />,
        label: `Create ${icon}`,
        onClick: () => handleAddItem("Folder"),
      },
    ];

    setMenuItems(
      level === 0
        ? baseItems
        : [
            ...baseItems,
            {
              icon: <IconRenderer icon="Pencil" width={16} height={16} />,
              label: `Rename ${icon}`,
              onClick: () => setNamingState(true),
            },
            {
              icon: <IconRenderer icon="Trash" width={16} height={16} />,
              label: `Delete ${icon}`,
              onClick: () => handleRemoveItem(),
            },
          ],
    );
  };

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
              className={`w-full px-4 py-2 relative flex items-center gap-x-4 ${className}
              hover:bg-c-darker hover:text-c-lighter hover:cursor-pointer
              select-none border-l-2 text-black outline-none
              ${className}
            `}
              onClick={(e) => {
                if (isNaming) e.preventDefault();
                else {
                  setMenuPos(null);
                  setOpenState((current) => !current);
                }
              }}
              onKeyDown={(e) => {
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
                  onKeyDown={(e) =>
                    e.key === "Enter" && handleRenameItem(e.currentTarget.value)
                  }
                />
              ) : (
                <h1
                  title={label}
                  className="relative w-[80%] text-left truncate text-ellipsis"
                >
                  {label}
                </h1>
              )}
              <IconRenderer
                className="relative flex justify-end text-right flex-1"
                icon={open ? "ChevronDown" : "ChevronRight"}
                width={16}
                height={16}
              />
            </DisclosureButton>

            <DisclosurePanel className={`relative w-full pl-2`}>
              {subDirectory!.length !== 0 ? (
                subDirectory!.map((sub, index) => (
                  <ResourcesItem
                    key={index}
                    id={sub.id}
                    fromDirectory={sub.fromDirectory}
                    icon={sub.icon}
                    label={sub.label}
                    className={`${sub.className}`}
                    subDirectory={sub.subDirectory}
                    level={level! + 1}
                  />
                ))
              ) : (
                <span className="relative text-center my-2 block text-sm text-c-darker select-none">
                  Empty
                </span>
              )}
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
  );
};

const FileItem = ({
  id,
  fromDirectory,
  icon,
  label,
  className,
  level,
  parent,
}: IResourcesItem) => {
  const currentColor = NESTED_COLORS[level! % NESTED_COLORS.length];
  const nameField = useRef<HTMLInputElement | null>(null);
  const [isNaming, setNamingState] = useState<boolean>(false);
  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [menuItems, setMenuItems] = useState<ContextMenuItem[]>([]);

  const renameItem = useResourcesStore((state) => state.renameItem);
  const removeItem = useResourcesStore((state) => state.removeItem);
  const updateWindowTitle = useWindowStore((state) => state.updateWindowTitle);
  const editingItemId = useResourcesStore((state) => state.editingItemId);
  const setEditingItemId = useResourcesStore((state) => state.setEditingItemId);

  const openWindow = useWindowStore((state) => state.openWindow);
  const closeWindow = useWindowStore((state) => state.closeWindow);

  useEffect(() => {
    if (editingItemId === id) {
      setNamingState(true);
      setEditingItemId(null);
    }
  }, [editingItemId, id, setEditingItemId]);

  const handleRemoveItem = () => {
    if (window.confirm(`Are you sure you want to delete "${label}"?`)) {
      removeItem({
        id: id!,
        directory: fromDirectory,
        level: level!,
      });

      closeWindow(id!);
    }
  };

  const handleRenameItem = (textValue: string) => {
    const name = textValue.trim();
    if (
      name === "" ||
      parent?.subDirectory?.some(
        (file) => file.icon === "Folder" && file.label === name,
      )
    ) {
      nameField!.current!.style.borderBottomColor = "red";
      return;
    } else {
      const isRenamed = renameItem({
        directory: fromDirectory,
        level,
        id,
        name,
      });
      if (isRenamed) {
        setNamingState(false);
        updateWindowTitle(id!, name);
      } else {
        nameField!.current!.style.borderBottomColor = "red";
      }
    }
  };

  const handleOpenEditor = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    let windowType: WindowType | null = null;

    switch (fromDirectory) {
      case "Sprites":
        windowType = "SPRITE_EDITOR";
        break;
      case "Objects":
        windowType = "OBJECT_EDITOR";
        break;
      case "Rooms":
        windowType = "ROOM_EDITOR";
        break;
      case "Scripts":
        windowType = "SCRIPT_EDITOR";
        break;
      case "Functions":
        windowType = "FUNCTION_EDITOR";
        break;
      default:
        console.warn("Unknown resource type:", fromDirectory);
    }

    if (windowType) {
      openWindow({
        id: id!,
        type: windowType,
        title: label!,
        data: { id, fromDirectory, icon, label, level }, // Pass the file data down
      });
    }
  };

  const handleContextMenu = (
    e: React.MouseEvent<HTMLDivElement, MouseEvent>,
  ) => {
    e.preventDefault();
    setMenuPos({ x: e.pageX, y: e.pageY });

    const baseItems = [
      {
        icon: <IconRenderer icon="MagnifyingGlass" width={16} height={16} />,
        label: "Open",
        onClick: () => handleOpenEditor(),
      },
      {
        icon: <IconRenderer icon="Pencil" width={16} height={16} />,
        label: `Rename`,
        onClick: () => setNamingState(true),
      },
      {
        icon: <IconRenderer icon="Trash" width={16} height={16} />,
        label: `Delete`,
        onClick: () => handleRemoveItem(),
      },
    ];

    setMenuItems(baseItems);
  };

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
        onDoubleClick={handleOpenEditor}
        className={`w-full px-4 py-2 relative flex items-center gap-x-4 ${className}
          hover:bg-c-darker hover:text-c-lighter hover:cursor-pointer
            select-none border-l-2`}
      >
        <IconRenderer icon={icon} width={16} height={16} />
        {isNaming ? (
          <input
            ref={nameField}
            type="text"
            style={{ borderBottomColor: "gray" }}
            className="relative w-[80%] text-left border-b-2 border-gray-600 bg-transparent outline-none"
            onKeyDown={(e) =>
              e.key === "Enter" && handleRenameItem(e.currentTarget.value)
            }
          />
        ) : (
          <h1
            title={label}
            className="relative w-[80%] text-left truncate text-ellipsis"
          >
            {label}
          </h1>
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
  );
};

export const ResourcesItem = ({
  id,
  fromDirectory,
  icon = "File",
  label = "Item",
  className = "",
  subDirectory = [],
  level = 0,
  parent,
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
