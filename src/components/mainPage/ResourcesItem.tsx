import { Disclosure, DisclosureButton, DisclosurePanel } from "@headlessui/react";
import type { IResourcesItem } from "../../types/ResourcesItemTypes";
import { IconRenderer } from "../IconRenderer";
import { NESTED_COLORS } from "../../Constants";

const FolderItem = ({ icon, label, className, subDirectory, colorIndex }: IResourcesItem) => {
  const currentColor = NESTED_COLORS[colorIndex! % NESTED_COLORS.length];

  return (
    <Disclosure>
      {({ open }) => (
        <>
          <DisclosureButton
            style={{ borderColor: colorIndex! > 0 ? currentColor : "none" }}
            onContextMenu={(e) => e.preventDefault()}
            className={
              `w-full px-4 py-2 relative flex items-center gap-x-4 ${className}
              hover:bg-c-darker hover:text-c-lighter hover:cursor-pointer
              select-none border-l-2
              ${className}
            `}
          >
            <IconRenderer
              icon={icon}
              width={colorIndex! > 0 ? 16 : 20}
              height={colorIndex! > 0 ? 16 : 20}
            />
            <h1 className="relative w-[80%] text-left truncate text-ellipsis">{label}</h1>
            <IconRenderer className="relative flex justify-end text-right flex-1" icon={open ? "ChevronDown" : "ChevronRight"} width={16} height={16} />
          </DisclosureButton>

          <DisclosurePanel className={`relative w-full pl-2`}>
            {
              subDirectory!.length !== 0 ?
                subDirectory!.map((sub, index) => (
                  <ResourcesItem key={index} icon={sub.icon} label={sub.label} className={`${sub.className}`} subDirectory={sub.subDirectory} colorIndex={(colorIndex! + 1)} />
                )) :
                (
                  <span className="relative text-center my-2 block text-sm text-c-darker">Empty</span>
                )
            }
          </DisclosurePanel>
        </>
      )}
    </Disclosure>
  )
};

const FileItem = ({ icon, label, className, colorIndex }: IResourcesItem) => {
  const currentColor = NESTED_COLORS[colorIndex! % NESTED_COLORS.length];

  return (
    <div
      style={{ borderColor: colorIndex! > 0 ? `${currentColor}` : "" }}
      onContextMenu={(e) => e.preventDefault()}
      className={
        `w-full px-4 py-2 relative flex items-center gap-x-4 ${className}
      hover:bg-c-darker hover:text-c-lighter hover:cursor-pointer
        select-none border-l-2`
      }
    >
      <IconRenderer icon={icon} width={16} height={16} />
      <h1 className="relative w-[80%] text-left truncate text-ellipsis">{label}</h1>
    </div>
  )
};

export const ResourcesItem = ({ icon = "File", label = "Item", className = "", subDirectory = [], colorIndex = 0 }: IResourcesItem) => (
  <>
    {icon === "Folder" ?
      (FolderItem({ icon, label, className, subDirectory, colorIndex })) :
      (FileItem({ icon, label, className, colorIndex }))
    }
  </>
);
