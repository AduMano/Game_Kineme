import { useRef, useState } from "react";
import { ResourcesItem } from "../components/mainPage/ResourcesItem";
import { ToolbarItem } from "../components/mainPage/ToolbarItem";
import type { IResourcesItem } from "../types/ResourcesItemTypes";
import type { IToolbarItem } from "../types/ToolbarItemTypes";

export const MainPage = () => {
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

    const toolbarItems: IToolbarItem[] = [
        { label: "New Project", icon: "NewFile" },
        { label: "Open Project", icon: "OpenFolder" },
        { label: "Save Project", icon: "Save" },
        { label: "Run", icon: "Play", className: "ml-auto" }
    ];

    const resourcesItems: IResourcesItem[] = [
        {
            label: "Sprites", icon: "Folder", subDirectory: [
                {
                    label: "kyato", icon: "Folder", subDirectory: [
                        { label: "spr_kyato_stand", icon: "Image" },
                        { label: "spr_kyato_hurt", icon: "Image" },
                        {
                            label: "Kyato_Test", icon: "Folder", subDirectory: [

                                { label: "spr_kyato_stand", icon: "Image" },
                                { label: "spr_kyato_hurt", icon: "Image" },
                                {
                                    label: "Kyato_Test", icon: "Folder", subDirectory: [
                                        { label: "spr_kyato_stand", icon: "Image" },
                                        { label: "spr_kyato_hurt", icon: "Image" },
                                        {
                                            label: "Kyato_Test", icon: "Folder", subDirectory: [
                                                { label: "spr_kyato_stand", icon: "Image" },
                                                { label: "spr_kyato_hurt", icon: "Image" },
                                                {
                                                    label: "Kyato_Test", icon: "Folder", subDirectory: [
                                                        { label: "spr_kyato_stand", icon: "Image" },
                                                        { label: "spr_kyato_hurt", icon: "Image" },
                                                        {
                                                            label: "Kyato_Test", icon: "Folder", subDirectory: [
                                                                { label: "spr_kyato_stand", icon: "Image" },
                                                                { label: "spr_kyato_hurt", icon: "Image" }
                                                            ]
                                                        }
                                                    ]
                                                }
                                            ]
                                        }
                                    ]
                                }
                            ]
                        },
                    ]
                }
            ]
        },
        { label: "Sounds", icon: "Folder" },
        { label: "Scripts", icon: "Folder" },
        { label: "Functions", icon: "Folder" },
        { label: "Objects", icon: "Folder" },
        { label: "Rooms", icon: "Folder" },
    ]

    return (
        <main className="relative w-full h-[100%]">
            {/* ToolBar */}
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

            {/* Resources and Panel */}
            <section className="relative w-[100%] h-[100%] flex items-start">
                {/* Resources */}
                <aside style={{ width: `${width}px` }} className={`
                    relative overflow-y-auto h-[100%] flex flex-col 
                    scrollbar-thin scrollbar-thumb-c-darker scrollbar-track-gray-200
                `}>
                    <h1 className="text-xl font-semibold text-c-darker tracking-wide p-4 pb-2">Resources</h1>
                    <div className="relative h-[100%]">
                        {resourcesItems.map((item, index) => (
                            <ResourcesItem
                                key={index}
                                icon={item.icon}
                                label={item.label}
                                className={`${item.className}`}

                                subDirectory={item.subDirectory}
                            />
                        ))}
                    </div>
                </aside>

                <div
                    onMouseDown={startResize}
                    className="w-[3.5px] h-[100%] cursor-col-resize bg-c-darker"
                />

                {/* Panel */}
                <section className="relative flex-1">
                </section>
            </section>
        </main >
    )
}
