import { ToolbarItem } from "../../components/mainPage/ToolbarItem"
import type { IToolbarItem } from "../../types/ToolbarItemTypes"

export const Toolbar = ({ toolbarItems }: { toolbarItems: IToolbarItem[] }) => {
  return (
    <section className="relative flex items-center border-c-darker border-b-2">
      {toolbarItems.map((item, index) => (
        <ToolbarItem
          key={index}
          icon={item.icon}
          label={item.label}
          className={
            `${item.className} ${(index === 0 || index === toolbarItems.length - 1) && "border-l-[1px]"}`
          }
        />
      ))}
    </section>
  )
}
