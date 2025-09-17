import type { TIcon } from "../../../../types/IconRendererTypes";
import type { IResourcesItem, TFromDirectory } from "../../../../types/ResourcesItemTypes";
import type { IMutateResourcesItem } from "../useResourcesStore";
import cuid from 'cuid';

const icons = {
  "Sprites": "Image",
  "Sounds": "Sound",
  "Scripts": "Script",
  "Functions": "Script",
  "Objects": "Object",
  "Rooms": "Room"
}

export const UTIL_ADD_ITEM = (
  items: IResourcesItem[],
  payload: IMutateResourcesItem
): IResourcesItem[] => {

  return items.map(item => {
    if (item.fromDirectory === payload.directory && item.level === 0) {
      return {
        ...item,
        subDirectory: INSERT_AT_LEVEL(item.subDirectory ?? [], payload.level, payload, 0, item)
      }
    }

    if (item.subDirectory) {
      return {
        ...item,
        subDirectory: UTIL_ADD_ITEM(item.subDirectory, payload)
      }
    }

    return item
  })
}

const INSERT_AT_LEVEL = (
  items: IResourcesItem[],
  targetLevel: number,
  payload: IMutateResourcesItem,
  currentLevel = 0,
  parent: IResourcesItem
): IResourcesItem[] => {

  if (currentLevel === targetLevel) {
    const newItem: IResourcesItem = {
      id: cuid(),
      fromDirectory: payload.directory,
      label: payload.name || "Unnamed",
      icon: payload.isFolder ? 'Folder' as TIcon : icons[payload.directory] as TIcon,
      level: currentLevel,
      subDirectory: payload.isFolder ? [] : undefined,
      parent: parent,
    }

    return [...items, newItem]
  }

  return items.map(item => {
    if (item.subDirectory) {
      return {
        ...item,
        subDirectory: INSERT_AT_LEVEL(item.subDirectory, targetLevel, payload, currentLevel + 1, item)
      }
    }
    return item
  })
}

export const UTIL_REMOVE_ITEM_BY_ID = (
  items: IResourcesItem[],
  idToRemove: string
): IResourcesItem[] => items
  .filter(item => item.id !== idToRemove)
  .map(item =>
    item.subDirectory
      ? {
        ...item,
        subDirectory: UTIL_REMOVE_ITEM_BY_ID(item.subDirectory, idToRemove),
      }
      : item
  );

export const UTIL_RENAME_ITEM_BY_ID_PATH = (
  resources: IResourcesItem[],
  fromDirectory: TFromDirectory,
  level: number,
  idToRename: string,
  newName: string
): IResourcesItem[] => {
  return resources.map(item => {
    if (item.fromDirectory !== fromDirectory) return item;

    const renameRecursive = (
      currentItems: IResourcesItem[],
      currentLevel: number
    ): IResourcesItem[] => {
      return currentItems.map(child => {
        if (currentLevel === level && child.id === idToRename) {
          const hasDuplicate = currentItems.some(
            sibling => sibling.id !== idToRename && sibling.label === newName
          );
          if (hasDuplicate) {
            throw new Error(
              `An item named "${newName}" already exists at level ${level}.`
            );
          }
          return { ...child, label: newName };
        }

        if (child.subDirectory) {
          return {
            ...child,
            subDirectory: renameRecursive(child.subDirectory, currentLevel + 1),
          };
        }

        return child;
      });
    };

    return {
      ...item,
      subDirectory: item.subDirectory
        ? renameRecursive(item.subDirectory, 1)
        : item.subDirectory,
    };
  });
};
