import type { IToolbarItem } from "../../types/ToolbarItemTypes";
import { IconRenderer } from "../IconRenderer";

export const ToolbarItem = ({ icon = "File", label = "Item", className = "" }: IToolbarItem) => (
  <div
    onContextMenu={(e) => e.preventDefault()}
    className={
      `flex items-center gap-2 py-2 px-4 text-black hover:text-c-lighter 
        border-c-dark border-r-[1px] select-none active:bg-white active:text-c-darker
        bg-white hover:bg-c-darker hover:cursor-pointer ${className}`
    }
  >
    <IconRenderer icon={icon} width={18} height={18} />
    <h1>{label}</h1>
  </div>
);
