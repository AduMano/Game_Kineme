import type { IResourcesItem } from "../types/ResourcesItemTypes";
import type { IToolbarItem } from "../types/ToolbarItemTypes";
import { ToolBar } from "./modules/ToolBar";
import { Resources } from "./modules/Resources";

export const MainPage = () => {
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
            <ToolBar toolbarItems={toolbarItems} />

            {/* Resources and Panel */}
            <section className="relative w-[100%] h-[100%] flex items-start">
                {/* Resources */}
                <Resources resourcesItems={resourcesItems} />

                {/* Panel */}
                <section className="relative flex-1">
                </section>
            </section>
        </main >
    )
}
