import { create } from 'zustand';
import type { IResourcesItem, TFromDirectory } from '../../../types/ResourcesItemTypes';
import { UTIL_ADD_ITEM, UTIL_REMOVE_ITEM_BY_ID } from './utilities/mutateResources';
import { UTIL_SORT_SOURCES } from './utilities/sortResources';

interface ResourcesState {
  resources: IResourcesItem[]
  setResources: (newResources: IResourcesItem[]) => void,
  addItem: (payload: IMutateResourcesItem) => void,
  removeItem: (payload: IMutateResourcesItem) => void,
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
