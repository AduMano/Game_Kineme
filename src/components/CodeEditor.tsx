import Editor, { type Monaco } from "@monaco-editor/react";
import { useRef, useEffect } from "react";

interface CodeEditorProps {
  code: string;
  onChange: (value: string | undefined) => void;
  customLib?: string; // We will pass our engine API and scripts here!
}

const CodeEditor = ({ code, onChange, customLib = "" }: CodeEditorProps) => {
  const monacoRef = useRef<Monaco | null>(null);
  const extraLibRef = useRef<any>(null);

  const handleEditorDidMount = (editor: any, monaco: Monaco) => {
    monacoRef.current = monaco;

    // 1. Configure the JavaScript environment
    monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: false,
      noSyntaxValidation: false,
    });

    // 2. Set compiler options to allow ES6 and our custom 'this' context
    monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
      target: monaco.languages.typescript.ScriptTarget.ES2020,
      allowNonTsExtensions: true,
      allowJs: true,
    });

    // Force Monaco to sync models instantly when we add libraries
    monaco.languages.typescript.javascriptDefaults.setEagerModelSync(true);

    // 3. Inject the Initial Game Engine API
    extraLibRef.current =
      monaco.languages.typescript.javascriptDefaults.addExtraLib(
        customLib,
        "kineme-engine-api.d.ts",
      );
  };

  // 4. DYNAMIC UPDATE: Whenever customLib changes
  useEffect(() => {
    if (monacoRef.current) {
      if (extraLibRef.current) {
        extraLibRef.current.dispose();
      }
      extraLibRef.current =
        monacoRef.current.languages.typescript.javascriptDefaults.addExtraLib(
          customLib,
          "kineme-engine-api.d.ts",
        );
    }
  }, [customLib]);

  return (
    <div className="w-full h-full bg-[#1e1e1e]">
      <Editor
        height="100%"
        defaultLanguage="javascript"
        theme="vs-dark"
        value={code}
        onChange={onChange}
        onMount={handleEditorDidMount} // Using onMount!
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          wordWrap: "on",
          scrollBeyondLastLine: false,
          smoothScrolling: true,
          cursorBlinking: "smooth",
          suggestOnTriggerCharacters: true,
        }}
      />
    </div>
  );
};

export default CodeEditor;
