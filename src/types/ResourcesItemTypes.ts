import type { TIcon } from "./IconRendererTypes";

export type TFromDirectory = "Sprites"
  | "Sounds"
  | "Scripts"
  | "Functions"
  | "Objects"
  | "Rooms";
export interface IResourcesItem {
  parent?: IResourcesItem;
  id?: string;
  fromDirectory: TFromDirectory;
  label: string;
  icon: TIcon;
  level: number;

  className?: string;
  subDirectory?: IResourcesItem[];
}