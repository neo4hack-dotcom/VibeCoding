import React from 'react';
import MonacoEditor from '@monaco-editor/react';

interface EditorProps {
  code: string;
  language: string;
  onChange: (value: string | undefined) => void;
  readOnly?: boolean;
}

const Editor: React.FC<EditorProps> = ({ code, language, onChange, readOnly = false }) => {
  return (
    <div className="h-full w-full overflow-hidden bg-[#1e1e1e]">
      <MonacoEditor
        height="100%"
        language={language === 'tsx' ? 'typescript' : language}
        value={code}
        theme="vs-dark"
        onChange={onChange}
        options={{
          minimap: { enabled: false },
          fontSize: 12, // Réduit pour plus de densité
          lineHeight: 20,
          scrollBeyondLastLine: false,
          readOnly: readOnly,
          fontFamily: "'Fira Code', monospace",
          automaticLayout: true,
          padding: { top: 12, bottom: 12 }
        }}
      />
    </div>
  );
};

export default Editor;