export type TIcon =
  | "Folder"
  | "Image"
  | "Sound"
  | "Object"
  | "Script"
  | "Room"
  | "File"
  | "NewFile"
  | "OpenFolder"
  | "Save"
  | "Play"
  | "ChevronRight"
  | "ChevronDown"
  | "Trash"
  | "Pencil"
  | "MagnifyingGlass";

export interface IIConRenderer {
  icon: TIcon;
  width?: number;
  height?: number;

  className?: string;
}