import React, { useState, useEffect, useRef } from 'react';
import { ConsoleHeader } from './components/ConsoleHeader';
import { StatusBadge } from './components/StatusBadge';
import { CodeBlock } from './components/CodeBlock';
import { processPayload } from './services/geminiService';
import { GatewayMode, OutputFormat, LogEntry } from './types';

const App: React.FC = () => {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [mode, setMode] = useState<GatewayMode>(GatewayMode.NORMALIZATION);
  const [format, setFormat] = useState<OutputFormat>(OutputFormat.JSON);
  const [destination, setDestination] = useState('');
  const [status, setStatus] = useState<'IDLE' | 'PROCESSING' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [hostedUrl, setHostedUrl] = useState<string | null>(null);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-focus input on mode change
  useEffect(() => {
    textareaRef.current?.focus();
  }, [mode]);

  // Clean up blob URLs to prevent memory leaks
  useEffect(() => {
    return () => {
      if (hostedUrl) URL.revokeObjectURL(hostedUrl);
    };
  }, [hostedUrl]);

  const handleProcess = async () => {
    if (!input.trim()) {
      setStatus('ERROR');
      setOutput(JSON.stringify({
        status: "error",
        error_code: "PAYLOAD_MISSING",
        message: "Input buffer is void. Please provide a valid payload or query.",
        timestamp: new Date().toISOString()
      }, null, 2));
      return;
    }

    setStatus('PROCESSING');
    setOutput('');
    setHostedUrl(null);
    
    let contextHint = "";
    if (mode === GatewayMode.NORMALIZATION) {
      contextHint = "Task: Normalize raw data.";
    } else if (mode === GatewayMode.CORS_PROXY) {
      contextHint = "Task: Generate CORS configuration/Proxy code.";
    } else {
      contextHint = "Task: Debug analysis of the payload.";
    }

    try {
      const result = await processPayload(input, contextHint, destination, format);
      
      let displayResult = result;
      // Try parsing if JSON format requested to pretty print
      if (format === OutputFormat.JSON || format === OutputFormat.N8N_WORKFLOW) {
        try {
          const parsed = JSON.parse(result);
          displayResult = JSON.stringify(parsed, null, 2);
        } catch (e) {
          // Keep raw
        }
      }

      // If Output is a JS Worker, we can "Host" it
      if (format === OutputFormat.JS_WORKER) {
        const blob = new Blob([result], { type: 'application/javascript' });
        const url = URL.createObjectURL(blob);
        setHostedUrl(url);
      }

      setOutput(displayResult);
      setStatus('SUCCESS');

      setLogs(prev => [{
        id: Date.now().toString(),
        timestamp: new Date(),
        mode,
        format,
        inputSnippet: input.substring(0, 40) + (input.length > 40 ? '...' : ''),
        status: 'SUCCESS'
      }, ...prev]);

    } catch (error) {
      console.error(error);
      setOutput(JSON.stringify({
        error: "INTERNAL_GATEWAY_ERROR",
        message: error instanceof Error ? error.message : "Unknown error occurred"
      }, null, 2));
      setStatus('ERROR');
    }
  };

  const clearAll = () => {
    setInput('');
    setOutput('');
    setStatus('IDLE');
    setHostedUrl(null);
  };

  const loadTemplate = () => {
    let template = "";
    switch (mode) {
      case GatewayMode.CORS_PROXY:
        template = "I'm trying to fetch data from api.example.com using Puter.js in the browser, but I'm getting a CORS error. Generate the fix.";
        break;
      case GatewayMode.NORMALIZATION:
        template = "User John Doe (ID: 992) signed up at 12:00 PM via Landing Page B.";
        break;
      case GatewayMode.DEBUG_ANALYSIS:
        template = "Error: 500 Internal Server Error\nTimestamp: 1678888\nMessage: Invalid Token";
        break;
    }
    setInput(template);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.ctrlKey && e.key === 'Enter') {
      handleProcess();
    }
  };

  return (
    <div className="min-h-screen bg-nexus-950 text-nexus-200 font-sans selection:bg-neon-blue/30 selection:text-white flex flex-col">
      <ConsoleHeader />

      <main className="flex-1 flex flex-col md:flex-row h-[calc(100vh-4rem)] overflow-hidden">
        
        {/* LEFT PANEL: CONFIG & INPUT */}
        <section className="w-full md:w-1/2 flex flex-col border-r border-nexus-800 bg-nexus-950 overflow-y-auto">
          
          {/* Controls */}
          <div className="p-6 border-b border-nexus-800 space-y-6">
            
            {/* MODE SELECTION */}
            <div>
              <label className="block text-xs font-mono text-nexus-500 uppercase tracking-wider mb-3">
                1. Operation Mode
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: GatewayMode.NORMALIZATION, label: 'NORMALIZE', icon: 'fa-brackets-curly' },
                  { id: GatewayMode.CORS_PROXY, label: 'CORS PROXY', icon: 'fa-shield-halved' },
                  { id: GatewayMode.DEBUG_ANALYSIS, label: 'DEBUGGER', icon: 'fa-magnifying-glass-code' },
                ].map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setMode(m.id)}
                    className={`
                      flex flex-col items-center justify-center gap-2 p-3 rounded-lg border transition-all duration-200
                      ${mode === m.id 
                        ? 'bg-nexus-800 border-neon-blue text-neon-blue shadow-lg shadow-neon-blue/10' 
                        : 'bg-nexus-900 border-nexus-700 text-nexus-400 hover:bg-nexus-800 hover:text-nexus-200'}
                    `}
                  >
                    <i className={`fa-solid ${m.icon} text-lg`}></i>
                    <span className="text-[10px] font-bold tracking-wide">{m.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* ROUTING CONFIG */}
            <div className="space-y-4">
              <label className="block text-xs font-mono text-nexus-500 uppercase tracking-wider">
                2. Routing Configuration
              </label>
              
              <div className="space-y-2">
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-nexus-500 text-xs">
                    <i className="fa-solid fa-location-arrow"></i>
                  </span>
                  <input 
                    type="text" 
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    placeholder="Destination URL (Optional - e.g. n8n webhook)"
                    className="w-full bg-nexus-900 border border-nexus-700 rounded-md py-2 pl-9 pr-3 text-sm font-mono text-nexus-100 focus:outline-none focus:border-neon-purple focus:ring-1 focus:ring-neon-purple placeholder-nexus-600 transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                 {[
                   { id: OutputFormat.JSON, label: 'JSON' },
                   { id: OutputFormat.JS_WORKER, label: 'JS WORKER' },
                   { id: OutputFormat.CURL, label: 'CURL' },
                   { id: OutputFormat.N8N_WORKFLOW, label: 'n8n NODE' },
                 ].map((f) => (
                   <button
                     key={f.id}
                     onClick={() => setFormat(f.id)}
                     className={`
                       px-2 py-2 rounded text-[10px] font-bold font-mono border transition-all
                       ${format === f.id
                         ? 'bg-neon-purple/20 border-neon-purple text-neon-purple'
                         : 'bg-nexus-900 border-nexus-700 text-nexus-500 hover:border-nexus-500'}
                     `}
                   >
                     {f.label}
                   </button>
                 ))}
              </div>
            </div>
            
            <div className="flex items-center justify-between pt-2">
              <StatusBadge status={status} />
              <div className="flex gap-4">
                <button 
                  onClick={loadTemplate}
                  className="text-xs text-nexus-400 hover:text-neon-blue font-mono flex items-center gap-1 transition-colors"
                >
                  <i className="fa-solid fa-file-import"></i> LOAD TEMPLATE
                </button>
                <button 
                  onClick={clearAll}
                  className="text-xs text-nexus-500 hover:text-nexus-300 font-mono underline decoration-nexus-700 underline-offset-4"
                >
                  RESET
                </button>
              </div>
            </div>
          </div>

          {/* Input Area */}
          <div className="flex-1 p-6 flex flex-col min-h-[300px]">
             <label className="block text-xs font-mono text-nexus-500 uppercase tracking-wider mb-2 flex justify-between">
               <span>Input Payload / Query</span>
               <span className="text-nexus-600">CTRL+ENTER to execute</span>
            </label>
            <div className="flex-1 relative group">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={mode === GatewayMode.CORS_PROXY 
                  ? "Describe the CORS error or paste the URL you are trying to reach..." 
                  : "Paste raw logs, messy XML, or unstructured text here..."}
                className={`w-full h-full bg-nexus-900/50 border rounded-lg p-4 font-mono text-sm resize-none focus:outline-none focus:ring-1 transition-all placeholder-nexus-600 text-nexus-100 ${
                  status === 'ERROR' && !input.trim() 
                    ? 'border-neon-error ring-1 ring-neon-error/50' 
                    : 'border-nexus-700 focus:ring-neon-blue focus:border-neon-blue'
                }`}
              />
              <div className="absolute bottom-4 right-4">
                <button
                  onClick={handleProcess}
                  disabled={status === 'PROCESSING'}
                  className={`
                    h-10 px-6 rounded-md font-bold text-sm tracking-wide shadow-lg transition-all flex items-center gap-2
                    ${status === 'PROCESSING'
                      ? 'bg-nexus-700 text-nexus-500 cursor-not-allowed'
                      : 'bg-gradient-to-r from-neon-blue to-neon-purple text-white hover:brightness-110 active:scale-95 shadow-neon-blue/20'}
                  `}
                >
                  {status === 'PROCESSING' ? (
                    <>ROUTING...</>
                  ) : (
                    <>EXECUTE <i className="fa-solid fa-bolt text-xs"></i></>
                  )}
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* RIGHT PANEL: OUTPUT */}
        <section className="w-full md:w-1/2 bg-nexus-900 border-l border-nexus-800 flex flex-col h-full min-h-[50vh]">
          {/* Hosted Script Banner (If available) */}
          {hostedUrl && (
            <div className="bg-nexus-800/50 border-b border-nexus-700 px-6 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-neon-green text-xs font-mono">
                <i className="fa-solid fa-server"></i>
                <span>VIRTUAL WORKER DEPLOYED</span>
              </div>
              <a 
                href={hostedUrl} 
                target="_blank" 
                rel="noreferrer"
                className="text-[10px] bg-nexus-900 hover:bg-black border border-nexus-600 text-nexus-300 px-3 py-1 rounded transition-colors"
              >
                OPEN SCRIPT BLOB <i className="fa-solid fa-external-link-alt ml-1"></i>
              </a>
            </div>
          )}

          <div className="flex-1 p-6 flex flex-col min-h-0">
            {output ? (
              <CodeBlock 
                content={output} 
                isJson={output.trim().startsWith('{') || output.trim().startsWith('[')}
                label={`OUTPUT (${format})`}
              />
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-nexus-600 space-y-4 opacity-50">
                 <div className="w-16 h-16 rounded-full border-2 border-dashed border-nexus-600 flex items-center justify-center animate-spin-slow">
                    <i className="fa-solid fa-satellite-dish text-2xl"></i>
                 </div>
                 <p className="font-mono text-sm">AWAITING SIGNAL...</p>
              </div>
            )}
          </div>

          {/* LOGS / HISTORY FOOTER */}
          <div className="h-48 border-t border-nexus-800 bg-nexus-950 p-4 overflow-y-auto">
            <h3 className="text-xs font-mono text-nexus-500 uppercase tracking-wider mb-3 sticky top-0 bg-nexus-950 pb-2">
              Transaction Logs
            </h3>
            <div className="space-y-1">
              {logs.length === 0 && (
                <div className="text-xs font-mono text-nexus-700 italic px-2">No transactions recorded.</div>
              )}
              {logs.map((log) => (
                <div key={log.id} className="flex items-center justify-between p-2 rounded hover:bg-nexus-900 group cursor-pointer border border-transparent hover:border-nexus-800 transition-colors">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <span className="text-[10px] text-nexus-500 font-mono">
                      {log.timestamp.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' })}
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                      log.mode === GatewayMode.NORMALIZATION ? 'bg-neon-green/20 text-neon-green' :
                      log.mode === GatewayMode.CORS_PROXY ? 'bg-neon-blue/20 text-neon-blue' :
                      'bg-nexus-700 text-nexus-300'
                    }`}>
                      {log.mode.charAt(0)}
                    </span>
                    <span className="text-[9px] px-1 rounded border border-nexus-700 text-nexus-400">
                      {log.format}
                    </span>
                    <span className="text-xs font-mono text-nexus-400 truncate max-w-[150px]">
                      {log.inputSnippet}
                    </span>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => setInput(log.inputSnippet)} 
                      className="text-nexus-500 hover:text-white"
                      title="Load this input"
                    >
                      <i className="fa-solid fa-arrow-rotate-left text-xs"></i>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

      </main>
    </div>
  );
};

export default App;
