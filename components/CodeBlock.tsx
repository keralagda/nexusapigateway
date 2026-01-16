import React from 'react';

interface CodeBlockProps {
  content: string;
  label?: string;
  isJson?: boolean;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({ content, label, isJson }) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full h-full flex flex-col bg-nexus-900 rounded-lg border border-nexus-700 overflow-hidden shadow-inner shadow-black/50">
      <div className="flex items-center justify-between px-4 py-2 bg-nexus-800 border-b border-nexus-700">
        <span className="text-xs font-mono text-nexus-400 uppercase tracking-wider">
          {label || (isJson ? "JSON Payload" : "Output")}
        </span>
        <button 
          onClick={handleCopy}
          className="text-nexus-400 hover:text-nexus-200 transition-colors text-xs flex items-center gap-1"
        >
          {copied ? (
            <><i className="fa-solid fa-check text-neon-green"></i> COPIED</>
          ) : (
            <><i className="fa-regular fa-copy"></i> COPY</>
          )}
        </button>
      </div>
      <div className="flex-1 overflow-auto p-4 custom-scrollbar">
        <pre className={`font-mono text-sm leading-relaxed ${isJson ? 'text-neon-green' : 'text-nexus-200'}`}>
          <code>{content}</code>
        </pre>
      </div>
    </div>
  );
};
