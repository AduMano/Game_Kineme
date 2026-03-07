import type { IToolbarItem } from "../types/ToolbarItemTypes";
import { useResourcesStore } from "./modules/stores/useResourcesStore";
import { Resources } from "./modules/Resources";
import Taskbar from "../components/windows/TaskBar";
import WindowManager from "../components/windows/WindowManager";
import { Toolbar } from "./modules/ToolBar";
import { useEffect } from "react";

export const MainPage = () => {
  const toolbarItems: IToolbarItem[] = [
    { label: "New Project", icon: "NewFile" },
    { label: "Load Project", icon: "OpenFolder" },
    { label: "Save Progress", icon: "Save" },
    { label: "Save Project", icon: "Save" },
    { label: "Run", icon: "Play", className: "ml-auto" },
  ];
  const resources = useResourcesStore((state) => state.resources);
  const setResources = useResourcesStore((state) => state.setResources);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault(); // Stop browser from saving the webpage
        window.dispatchEvent(new Event("kineme-save-all"));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    // 1. ADDED `flex flex-col` HERE:
    <main className="relative w-full h-screen flex flex-col">
      {/* ToolBar */}
      <Toolbar toolbarItems={toolbarItems} />

      {/* Resources and Panel */}
      {/* 2. REMOVED `h-full` HERE (flex-1 handles the height now): */}
      <section className="relative w-full flex-1 flex overflow-hidden">
        {/* Resources */}
        <Resources resourcesItems={resources} />

        {/* Panel */}
        <section className="relative flex-1 h-full overflow-hidden">
          <WindowManager />
          <Taskbar />
        </section>
      </section>
    </main>
  );
};
