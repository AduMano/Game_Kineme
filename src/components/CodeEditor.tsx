import Editor, { type Monaco } from "@monaco-editor/react";

interface CodeEditorProps {
  code: string;
  onChange: (value: string | undefined) => void;
  customLib?: string; // We will pass our engine API and scripts here!
}

const CodeEditor = ({ code, onChange, customLib = "" }: CodeEditorProps) => {
  const handleEditorWillMount = (monaco: Monaco) => {
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

    // 3. Inject our Game Engine API and User Scripts!
    monaco.languages.typescript.javascriptDefaults.addExtraLib(
      customLib,
      "kineme-engine-api.d.ts",
    );
  };

  return (
    <div className="w-full h-full bg-[#1e1e1e]">
      <Editor
        height="100%"
        defaultLanguage="javascript"
        theme="vs-dark"
        value={code}
        onChange={onChange}
        beforeMount={handleEditorWillMount}
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
