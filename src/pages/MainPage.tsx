import type { IToolbarItem } from "../types/ToolbarItemTypes";
import { useResourcesStore } from "./modules/stores/useResourcesStore";
import { Resources } from "./modules/Resources";
import { Toolbar } from "./modules/Toolbar";

export const MainPage = () => {
    const toolbarItems: IToolbarItem[] = [
        { label: "New Project", icon: "NewFile" },
        { label: "Open Project", icon: "OpenFolder" },
        { label: "Save Project", icon: "Save" },
        { label: "Run", icon: "Play", className: "ml-auto" }
    ];
    const resources = useResourcesStore(state => state.resources)
    const setResources = useResourcesStore(state => state.setResources)

    return (
        <main className="relative w-full h-[100%]">
            {/* ToolBar */}
            <Toolbar toolbarItems={toolbarItems} />

            {/* Resources and Panel */}
            <section className="relative w-[100%] h-[100%] flex items-start">
                {/* Resources */}
                <Resources resourcesItems={resources} />

                {/* Panel */}
                <section className="relative flex-1">
                    <input type="text" className="border border-1" onKeyDown={(e) => e.key === "Enter" && alert(`${e.currentTarget.value}`)} />
                </section>
            </section>
        </main >
    )
}

