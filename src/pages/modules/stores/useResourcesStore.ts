import { create } from 'zustand';
import type { IResourcesItem, TFromDirectory } from '../../../types/ResourcesItemTypes';
import { UTIL_ADD_ITEM, UTIL_REMOVE_ITEM_BY_ID, UTIL_RENAME_ITEM_BY_ID_PATH } from './utilities/mutateResources';
import { UTIL_SORT_SOURCES } from './utilities/sortResources';

interface ResourcesState {
  resources: IResourcesItem[]
  setResources: (newResources: IResourcesItem[]) => void,
  addItem: (payload: IMutateResourcesItem) => void,
  removeItem: (payload: IMutateResourcesItem) => void,
  renameItem: (payload: IMutateResourcesItem) => boolean,
}

export interface IMutateResourcesItem {
  id?: string;
  name?: string;
  directory: TFromDirectory;
  level: number;
  isFolder?: boolean;
}

export const useResourcesStore = create<ResourcesState>((set) => ({
  resources: [
    { fromDirectory: "Sprites", label: "Sprites", icon: "Folder", subDirectory: [], level: 0 },
    { fromDirectory: "Sounds", label: "Sounds", icon: "Folder", subDirectory: [], level: 0 },
    { fromDirectory: "Scripts", label: "Scripts", icon: "Folder", subDirectory: [], level: 0 },
    { fromDirectory: "Functions", label: "Functions", icon: "Folder", subDirectory: [], level: 0 },
    { fromDirectory: "Objects", label: "Objects", icon: "Folder", subDirectory: [], level: 0 },
    { fromDirectory: "Rooms", label: "Rooms", icon: "Folder", subDirectory: [], level: 0 },
  ],

  setResources: (newResources) => set({ resources: newResources }),

  addItem: (payload) =>
    set(state => {
      const resources = UTIL_ADD_ITEM(state.resources, payload);

      return {
        resources: UTIL_SORT_SOURCES(resources, 'asc')
      }
    }),

  removeItem: (payload: IMutateResourcesItem) =>
    set(state => ({
      resources: UTIL_REMOVE_ITEM_BY_ID(state.resources, payload.id!)
    })),

  renameItem: (payload: IMutateResourcesItem) => {
    let isValid = true;

    set(state => {
      try {
        const renamedItemResources = UTIL_RENAME_ITEM_BY_ID_PATH(state.resources, payload.directory, payload.level, payload.id!, payload.name!);
        return ({
          resources: UTIL_SORT_SOURCES(renamedItemResources)
        });
      }
      catch (err: any) {
        alert(err.message);

        isValid = false;
        return ({
          resources: state.resources
        });
      }
    });

    return isValid;
  }
}));

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
