import type { TIcon } from "../../../../types/IconRendererTypes";
import type { IResourcesItem } from "../../../../types/ResourcesItemTypes";
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

export const UTIL_RENAME_ITEM_BY_ID = (
  items: IResourcesItem[],
  idToRename: string,
  newName: string
): IResourcesItem[] => {
  return items.map(item => {
    if (item.id === idToRename) {
      return {
        ...item,
        label: newName,
      };
    }

    if (item.subDirectory) {
      return {
        ...item,
        subDirectory: UTIL_RENAME_ITEM_BY_ID(item.subDirectory, idToRename, newName),
      };
    }

    return item;
  });
};