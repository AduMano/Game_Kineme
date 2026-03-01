import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  IResourcesItem,
  TFromDirectory,
} from "../../../types/ResourcesItemTypes";
import {
  UTIL_ADD_ITEM,
  UTIL_REMOVE_ITEM_BY_ID,
  UTIL_RENAME_ITEM_BY_ID_PATH,
} from "./utilities/mutateResources";
import { UTIL_SORT_SOURCES } from "./utilities/sortResources";
import { InputManagerCode } from "../scripts/InputManager";
import { CollisionManagerCode } from "../scripts/CollisionManager";

interface ResourcesState {
  resources: IResourcesItem[];
  editingItemId: string | null;
  setEditingItemId: (id: string | null) => void;
  setResources: (newResources: IResourcesItem[]) => void;
  addItem: (payload: IMutateResourcesItem) => void;
  removeItem: (payload: IMutateResourcesItem) => void;
  renameItem: (payload: IMutateResourcesItem) => boolean;
  updateItemData: (id: string, data: any) => void;
}

export interface IMutateResourcesItem {
  id?: string;
  data?: any;
  name?: string;
  directory: TFromDirectory;
  level: number;
  isFolder?: boolean;
}

export const useResourcesStore = create<ResourcesState>()(
  persist(
    (set) => ({
      resources: [
        {
          fromDirectory: "Sprites",
          label: "Sprites",
          icon: "Folder",
          subDirectory: [],
          level: 0,
        },
        {
          fromDirectory: "Sounds",
          label: "Sounds",
          icon: "Folder",
          subDirectory: [],
          level: 0,
        },
        {
          fromDirectory: "Scripts",
          label: "Scripts",
          icon: "Folder",
          subDirectory: [
            {
              id: "builtin-script-input",
              fromDirectory: "Scripts",
              label: "InputManager",
              icon: "Script",
              level: 0,
              data: { code: InputManagerCode },
            },
            {
              id: "builtin-script-collision",
              fromDirectory: "Scripts",
              label: "CollisionManager",
              icon: "Script",
              level: 1,
              data: { code: CollisionManagerCode },
            },
          ],
          level: 0,
        },
        {
          fromDirectory: "Functions",
          label: "Functions",
          icon: "Folder",
          subDirectory: [],
          level: 0,
        },
        {
          fromDirectory: "Objects",
          label: "Objects",
          icon: "Folder",
          subDirectory: [],
          level: 0,
        },
        {
          fromDirectory: "Rooms",
          label: "Rooms",
          icon: "Folder",
          subDirectory: [],
          level: 0,
        },
      ],

      editingItemId: null,
      setEditingItemId: (id) => set({ editingItemId: id }),

      setResources: (newResources) => set({ resources: newResources }),

      addItem: (payload) =>
        set((state) => ({
          resources: UTIL_SORT_SOURCES(
            UTIL_ADD_ITEM(state.resources, payload),
            "asc",
          ),
        })),

      removeItem: (payload) =>
        set((state) => ({
          resources: UTIL_REMOVE_ITEM_BY_ID(state.resources, payload.id!),
        })),

      renameItem: (payload) => {
        let isValid = true;
        set((state) => {
          try {
            return {
              resources: UTIL_SORT_SOURCES(
                UTIL_RENAME_ITEM_BY_ID_PATH(
                  state.resources,
                  payload.directory,
                  payload.level,
                  payload.id!,
                  payload.name!,
                ),
              ),
            };
          } catch (err: any) {
            alert(err.message);
            isValid = false;
            return { resources: state.resources };
          }
        });
        return isValid;
      },

      updateItemData: (id, data) =>
        set((state) => {
          const updateRecursive = (items: any[]): any[] =>
            items.map((item) => {
              if (item.id === id) return { ...item, data };
              if (item.subDirectory)
                return {
                  ...item,
                  subDirectory: updateRecursive(item.subDirectory),
                };
              return item;
            });
          return { resources: updateRecursive(state.resources) };
        }),
    }),
    {
      name: "game-kineme-resources",
      partialize: (state) => ({ resources: state.resources }), // Only save the file tree to local storage!
    },
  ),
);

// [
// {
//   label: "kyato", icon: "Folder", subDirectory: [
//     { label: "spr_kyato_stand", icon: "Image" },
//     { label: "spr_kyato_hurt", icon: "Image" },
//     {
//       label: "Kyato_Test", icon: "Folder", subDirectory: [

//         { label: "spr_kyato_stand", icon: "Image" },
//         { label: "spr_kyato_hurt", icon: "Image" },
//         {
//           label: "Kyato_Test", icon: "Folder", subDirectory: [
//             { label: "spr_kyato_stand", icon: "Image" },
//             { label: "spr_kyato_hurt", icon: "Image" },
//             {
//               label: "Kyato_Test", icon: "Folder", subDirectory: [
//                 { label: "spr_kyato_stand", icon: "Image" },
//                 { label: "spr_kyato_hurt", icon: "Image" },
//                 {
//                   label: "Kyato_Test", icon: "Folder", subDirectory: [
//                     { label: "spr_kyato_stand", icon: "Image" },
//                     { label: "spr_kyato_hurt", icon: "Image" },
//                     {
//                       label: "Kyato_Test", icon: "Folder", subDirectory: [
//                         { label: "spr_kyato_stand", icon: "Image" },
//                         { label: "spr_kyato_hurt", icon: "Image" }
//                       ]
//                     }
//                   ]
//                 }
//               ]
//             }
//           ]
//         }
//       ]
//     },
//   ]
// }
// ]
