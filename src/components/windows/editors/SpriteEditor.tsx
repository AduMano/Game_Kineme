import type { WindowNode } from "../../../pages/modules/stores/useWindowStore";

interface EditorProps {
  windowData: WindowNode;
}

const SpriteEditor = ({ windowData }: EditorProps) => {
  return (
    <div className="w-full h-full p-4 bg-white text-black overflow-auto flex flex-col items-center justify-center">
      <div className="text-center">
        <h2 className="text-xl font-bold mb-2">Sprite Editor</h2>
        <p className="text-gray-500">Editing: {windowData.title}</p>
        <p className="text-sm mt-4 text-gray-400">
          (Scalable UI to be built next)
        </p>
      </div>
    </div>
  );
};

export default SpriteEditor;
