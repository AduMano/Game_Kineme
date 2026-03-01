import React from "react";
import {
  useWindowStore,
  type WindowType,
  type WindowNode,
} from "../../pages/modules/stores/useWindowStore";
import BaseWindow from "./BaseWindow";

// Import all your separated editors here
import SpriteEditor from "./editors/SpriteEditor";
import ObjectEditor from "./editors/ObjectEditor";
import RoomEditor from "./editors/RoomEditor";
// import RoomEditor from './editors/RoomEditor';

// Define the props that every editor will receive
export interface EditorComponentProps {
  windowData: WindowNode;
}

// The Registry: Map the string type to the actual React component
const EditorRegistry: Record<WindowType, React.FC<EditorComponentProps>> = {
  SPRITE_EDITOR: SpriteEditor,
  OBJECT_EDITOR: ObjectEditor,
  ROOM_EDITOR: RoomEditor, // Replace with RoomEditor when ready
  SCRIPT_EDITOR: () => <div>Script Editor Placeholder</div>,
  FUNCTION_EDITOR: () => <div>Function Editor Placeholder</div>,
  SOUND_EDITOR: () => <div>Sound Editor Placeholder</div>,
};

const WindowManager = () => {
  const windows = useWindowStore((state) => state.windows);

  return (
    <>
      {windows.map((win) => {
        // Look up the correct component based on the window type
        const SpecificEditorComponent = EditorRegistry[win.type];

        // Fallback if a type isn't registered
        if (!SpecificEditorComponent) {
          console.warn(`No editor registered for window type: ${win.type}`);
          return null;
        }

        return (
          <BaseWindow key={win.id} windowData={win}>
            {/* Inject the separated component, passing the window data down */}
            <SpecificEditorComponent windowData={win} />
          </BaseWindow>
        );
      })}
    </>
  );
};

export default WindowManager;
