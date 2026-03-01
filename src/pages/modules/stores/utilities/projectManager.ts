import JSZip from "jszip";
import { saveAs } from "file-saver";
import { useResourcesStore } from "../useResourcesStore";
import { useWindowStore } from "../useWindowStore";
import { loadFileFromDB, saveFileToDB } from "./indexedDB";

// --- GLOBAL PROJECT STATE TRACKER ---
let cleanStateHash: string | null = null;

export const getIsProjectDirty = () => {
  const currentResources = useResourcesStore.getState().resources;
  const currentHash = JSON.stringify(currentResources);

  // If this is the first check, capture the initial state
  if (cleanStateHash === null) {
    cleanStateHash = currentHash;
    return false;
  }

  // If the hash is different from the last save, it's dirty!
  return currentHash !== cleanStateHash;
};

export const setProjectClean = () => {
  const currentResources = useResourcesStore.getState().resources;
  cleanStateHash = JSON.stringify(currentResources);
};

// --- NEW PROJECT (HARD RESET) ---
export const createNewProject = () => {
  localStorage.removeItem("game-kineme-workspace");
  localStorage.removeItem("game-kineme-resources");
  window.location.reload();
};

// --- EXPORT TO PC (.KINEME) ---
export const exportProjectLocally = async (projectName: string = "MyGame") => {
  try {
    const zip = new JSZip();
    const resources = useResourcesStore.getState().resources;

    const projectData = {
      version: "1.0.0",
      engine: "Kineme",
      timestamp: new Date().toISOString(),
      resources: resources,
    };
    zip.file("project.json", JSON.stringify(projectData, null, 2));

    const assetsFolder = zip.folder("assets");
    if (!assetsFolder)
      throw new Error("Failed to create assets folder in zip.");

    const assetIds = new Set<string>();
    const extractAssetIds = (items: any[]) => {
      items.forEach((item) => {
        if (item.data?.assetId) assetIds.add(item.data.assetId);
        if (item.subDirectory) extractAssetIds(item.subDirectory);
      });
    };

    extractAssetIds(resources);

    for (const id of assetIds) {
      const blob = await loadFileFromDB(id);
      if (blob) assetsFolder.file(id, blob);
    }

    const content = await zip.generateAsync({ type: "blob" });
    saveAs(content, `${projectName}.kineme`);

    setProjectClean(); // Mark as saved!
    return true;
  } catch (error) {
    console.error("Failed to export project:", error);
    alert("Failed to export project. Check the console for details.");
    return false;
  }
};

// --- SAVE TO BROWSER LIBRARY ---
export interface SavedProject {
  id: string;
  name: string;
  updatedAt: string;
  resources: any;
}

export const saveProjectToBrowser = (projectName: string) => {
  try {
    const resources = useResourcesStore.getState().resources;
    const existingData = localStorage.getItem("kineme_projects");
    let projects: SavedProject[] = existingData ? JSON.parse(existingData) : [];

    const existingIndex = projects.findIndex((p) => p.name === projectName);

    if (existingIndex >= 0) {
      projects[existingIndex].updatedAt = new Date().toISOString();
      projects[existingIndex].resources = resources;
    } else {
      projects.push({
        id: crypto.randomUUID(),
        name: projectName,
        updatedAt: new Date().toISOString(),
        resources: resources,
      });
    }

    localStorage.setItem("kineme_projects", JSON.stringify(projects));
    setProjectClean(); // Mark as saved!
    return true;
  } catch (error) {
    console.error("Failed to save project locally:", error);
    return false;
  }
};

// --- LOAD FROM BROWSER LIBRARY ---
export const getBrowserProjects = (): SavedProject[] => {
  const existingData = localStorage.getItem("kineme_projects");
  return existingData ? JSON.parse(existingData) : [];
};

export const loadProjectFromBrowser = (projectId: string) => {
  try {
    const projects = getBrowserProjects();
    const project = projects.find((p) => p.id === projectId);

    if (project) {
      useWindowStore.setState({ windows: [], activeWindowId: null });
      useResourcesStore.setState({ resources: project.resources });
      setProjectClean(); // Freshly loaded, so it's clean
      return true;
    }
    return false;
  } catch (error) {
    console.error("Failed to load local project:", error);
    return false;
  }
};

// --- IMPORT FROM PC (.KINEME) ---
export const importProjectFromFile = async (file: File) => {
  try {
    const zip = await JSZip.loadAsync(file);
    const projectJsonFile = zip.file("project.json");
    if (!projectJsonFile)
      throw new Error("Invalid .kineme file: project.json missing");

    const projectJsonString = await projectJsonFile.async("string");
    const projectData = JSON.parse(projectJsonString);

    const assetsFolder = zip.folder("assets");
    if (assetsFolder) {
      const assetPromises: Promise<void>[] = [];
      assetsFolder.forEach((relativePath, zipEntry) => {
        if (!zipEntry.dir) {
          const promise = zipEntry
            .async("blob")
            .then((blob) => saveFileToDB(relativePath, blob));
          assetPromises.push(promise);
        }
      });
      await Promise.all(assetPromises);
    }

    useWindowStore.setState({ windows: [], activeWindowId: null });
    useResourcesStore.setState({ resources: projectData.resources });
    setProjectClean(); // Freshly loaded, so it's clean
    return true;
  } catch (error) {
    console.error("Failed to import project:", error);
    alert("Failed to read the .kineme file. It might be corrupted.");
    return false;
  }
};
