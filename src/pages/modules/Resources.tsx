import { useRef, useState } from "react";
import { ResourcesItem } from "../../components/mainPage/ResourcesItem"
import type { IResourcesItem } from "../../types/ResourcesItemTypes"

export const Resources = ({ resourcesItems }: { resourcesItems: IResourcesItem[] }) => {
  const [width, setWidth] = useState<number>(window.screen.width / 7);
  const minWidth = 200;
  const maxWidth = 300;

  const frameRef = useRef<number | null>(null);

  const startResize = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = width;

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);

      frameRef.current = requestAnimationFrame(() => {
        const newWidth =
          startWidth + (moveEvent.clientX - startX);
        setWidth(Math.min(Math.max(newWidth, minWidth), maxWidth));
      });
    };

    const onMouseUp = () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  };

  return (
    <>
      {/* Side Nav */}
      <aside style={{ width: `${width}px` }} className={`
        relative overflow-y-auto h-[100%] flex flex-col 
        scrollbar-thin scrollbar-thumb-c-darker scrollbar-track-gray-200
      `}>
        <h1 className="text-xl font-semibold text-c-darker tracking-wide p-4 pb-2">Resources</h1>
        <div className="relative h-[100%]">
          {resourcesItems.map((item, index) => (
            <ResourcesItem
              key={index}
              id={item.id!}
              fromDirectory={item.fromDirectory}
              icon={item.icon}
              label={item.label}
              className={item.className}
              level={item.level}

              subDirectory={item.subDirectory}
            />
          ))}
        </div>
      </aside>

      {/* Divider */}
      <div
        onMouseDown={startResize}
        className="w-[3.5px] h-[100%] cursor-col-resize bg-c-darker"
      />
    </>
  )
}
