import type { TIcon } from "./IconRendererTypes";

export interface IResourcesItem {
  label: string;
  icon: TIcon;
  className?: string;

  subDirectory?: IResourcesItem[];
  colorIndex?: number;
}