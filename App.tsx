import React, { useState, useEffect, useRef } from 'react';
import { ConsoleHeader } from './components/ConsoleHeader';
import { StatusBadge } from './components/StatusBadge';
import { CodeBlock } from './components/CodeBlock';
import { processPayload } from './services/geminiService';
import { GatewayMode, OutputFormat, LogEntry, HttpMethod, SimulatedRequest } from './types';

const App: React.FC = () => {
  // Request State
  const [method, setMethod] = useState<HttpMethod>('POST');
  const [path, setPath] = useState('/api/v1/webhook');
  const [reqBody, setReqBody] = useState('');
  const [reqHeaders, setReqHeaders] = useState('{\n  "Content-Type": "application/json"\n}');
  const [activeTab, setActiveTab] = useState<'BODY' | 'HEADERS'>('BODY');

  // App State
  const [output, setOutput] = useState('');
  const [mode, setMode] = useState<GatewayMode>(GatewayMode.NORMALIZATION);
  const [format, setFormat] = useState<OutputFormat>(OutputFormat.JSON);
  const [destination, setDestination] = useState('');
  const [processingRules, setProcessingRules] = useState(''); // New State for Logic
  const [status, setStatus] = useState<'IDLE' | 'PROCESSING' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [hostedUrl, setHostedUrl] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(true); // Virtual Listener State

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-focus input on mode change
  useEffect(() => {
    if (activeTab === 'BODY') textareaRef.current?.focus();
  }, [mode, activeTab]);

  // Clean up blob URLs
  useEffect(() => {
    return () => {
      if (hostedUrl) URL.revokeObjectURL(hostedUrl);
    };
  }, [hostedUrl]);

  const handleProcess = async () => {
    if (!reqBody.trim() && activeTab === 'BODY') {
      setStatus('ERROR');
      setOutput(JSON.stringify({
        status: "error",
        error_code: "EMPTY_BODY",
        message: "Request body is empty.",
      }, null, 2));
      return;
    }

    setStatus('PROCESSING');
    setOutput('');
    setHostedUrl(null);
    
    let contextHint = "";
    if (mode === GatewayMode.NORMALIZATION) {
      contextHint = "Task: Normalize incoming request data.";
    } else if (mode === GatewayMode.CORS_PROXY) {
      contextHint = "Task: Generate CORS headers for this request origin.";
    } else {
      contextHint = "Task: Debug HTTP request anomalies.";
    }

    const requestData: SimulatedRequest = {
      method,
      path,
      headers: reqHeaders,
      body: reqBody
    };

    try {
      const result = await processPayload(requestData, contextHint, destination, format, processingRules);
      
      let displayResult = result;
      if (format === OutputFormat.JSON || format === OutputFormat.N8N_WORKFLOW) {
        try {
          const parsed = JSON.parse(result);
          displayResult = JSON.stringify(parsed, null, 2);
        } catch (e) {
          // Keep raw
        }
      }

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
        inputSnippet: `${method} ${path}`,
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
    setReqBody('');
    setProcessingRules('');
    setOutput('');
    setStatus('IDLE');
    setHostedUrl(null);
  };

  const loadTemplate = () => {
    let template = "";
    switch (mode) {
      case GatewayMode.CORS_PROXY:
        setMethod('GET');
        setPath('/api/external/resource');
        setReqHeaders('{\n  "Origin": "http://localhost:3000"\n}');
        template = "Query param: ?id=123 (Simulating cross-origin fetch)";
        setProcessingRules('Allow all origins matching localhost*');
        break;
      case GatewayMode.NORMALIZATION:
        setMethod('POST');
        setPath('/hooks/catch/123');
        template = "User John Doe (ID: 992) signed up at 12:00 PM via Landing Page B.";
        setProcessingRules('Extract user_id, full_name, and signup_source. Convert timestamp to ISO 8601.');
        break;
      case GatewayMode.DEBUG_ANALYSIS:
        setMethod('POST');
        template = "Error: 500 Internal Server Error\nTimestamp: 1678888\nMessage: Invalid Token";
        setProcessingRules('Identify the root cause and suggest a retry strategy.');
        break;
    }
    setReqBody(template);
    setActiveTab('BODY');
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
        
        {/* LEFT PANEL: INPUT FLOW & LISTENER */}
        <section className="w-full md:w-1/2 flex flex-col border-r border-nexus-800 bg-nexus-950 overflow-y-auto">
          
          {/* Controls */}
          <div className="p-6 border-b border-nexus-800 space-y-6">
            
            {/* VIRTUAL LISTENER STATUS */}
            <div className="flex items-center justify-between bg-nexus-900/50 p-3 rounded-lg border border-nexus-800">
               <div className="flex items-center gap-3">
                 <div className={`w-3 h-3 rounded-full ${isListening ? 'bg-neon-green animate-pulse' : 'bg-nexus-600'}`}></div>
                 <div className="flex flex-col">
                   <span className="text-xs font-bold text-nexus-200">VIRTUAL LISTENER</span>
                   <span className="text-[10px] font-mono text-nexus-500">{isListening ? 'LISTENING ON *:443' : 'OFFLINE'}</span>
                 </div>
               </div>
               <button 
                 onClick={() => setIsListening(!isListening)}
                 className={`text-[10px] px-2 py-1 rounded border ${isListening ? 'border-neon-green text-neon-green' : 'border-nexus-600 text-nexus-500'}`}
               >
                 {isListening ? 'ACTIVE' : 'START'}
               </button>
            </div>

            {/* MODE & ROUTING */}
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-mono text-nexus-500 uppercase tracking-wider mb-2">Protocol</label>
                <select 
                  value={mode} 
                  onChange={(e) => setMode(e.target.value as GatewayMode)}
                  className="w-full bg-nexus-900 border border-nexus-700 rounded p-2 text-xs font-mono text-nexus-200 focus:border-neon-blue outline-none"
                >
                  <option value={GatewayMode.NORMALIZATION}>NORMALIZE</option>
                  <option value={GatewayMode.CORS_PROXY}>CORS PROXY</option>
                  <option value={GatewayMode.DEBUG_ANALYSIS}>DEBUGGER</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-mono text-nexus-500 uppercase tracking-wider mb-2">Output Format</label>
                <select 
                  value={format} 
                  onChange={(e) => setFormat(e.target.value as OutputFormat)}
                  className="w-full bg-nexus-900 border border-nexus-700 rounded p-2 text-xs font-mono text-nexus-200 focus:border-neon-purple outline-none"
                >
                  <option value={OutputFormat.JSON}>JSON Payload</option>
                  <option value={OutputFormat.JS_WORKER}>JS Worker</option>
                  <option value={OutputFormat.CURL}>cURL Command</option>
                  <option value={OutputFormat.N8N_WORKFLOW}>n8n Workflow</option>
                </select>
              </div>
            </div>

            {/* ROUTING DESTINATION */}
            <div>
               <div className="relative mb-4">
                  <span className="absolute left-3 top-2.5 text-nexus-500 text-xs"><i className="fa-solid fa-route"></i></span>
                  <input 
                    type="text" 
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    placeholder="Route to: e.g., https://webhook.site/..."
                    className="w-full bg-nexus-900 border border-nexus-700 rounded-md py-2 pl-9 pr-3 text-sm font-mono text-nexus-100 focus:outline-none focus:border-neon-blue placeholder-nexus-600"
                  />
                </div>
                
                {/* GATEWAY LOGIC INPUT */}
                <div className="relative">
                   <label className="block text-xs font-mono text-nexus-500 uppercase tracking-wider mb-1">
                    Gateway Logic / Transformation Rules
                   </label>
                   <textarea
                     value={processingRules}
                     onChange={(e) => setProcessingRules(e.target.value)}
                     placeholder="e.g. 'Extract only the email and timestamp', 'Convert XML to JSON', 'Filter if status != active'"
                     className="w-full bg-nexus-900 border border-nexus-700 rounded-md p-3 text-xs font-mono text-nexus-300 focus:outline-none focus:border-neon-purple focus:ring-1 focus:ring-neon-purple placeholder-nexus-600 h-20 resize-none transition-all"
                   />
                </div>
            </div>
          </div>

          {/* REQUEST BUILDER */}
          <div className="flex-1 flex flex-col min-h-[300px]">
             
             {/* Method & Path Bar */}
             <div className="px-6 py-4 bg-nexus-900/30 border-b border-nexus-800 flex gap-0">
                <select 
                  value={method}
                  onChange={(e) => setMethod(e.target.value as HttpMethod)}
                  className="bg-nexus-800 text-neon-blue font-bold text-xs px-3 py-2 rounded-l-md border-y border-l border-nexus-700 outline-none"
                >
                  <option>GET</option>
                  <option>POST</option>
                  <option>PUT</option>
                  <option>DELETE</option>
                  <option>PATCH</option>
                </select>
                <input 
                  type="text" 
                  value={path}
                  onChange={(e) => setPath(e.target.value)}
                  className="flex-1 bg-nexus-900 text-nexus-200 text-sm font-mono px-3 py-2 border border-nexus-700 rounded-r-md outline-none focus:border-neon-blue"
                />
             </div>

             {/* Tabs */}
             <div className="flex border-b border-nexus-800 bg-nexus-950 px-6">
                <button 
                  onClick={() => setActiveTab('BODY')}
                  className={`px-4 py-2 text-xs font-mono border-b-2 transition-colors ${activeTab === 'BODY' ? 'border-neon-blue text-white' : 'border-transparent text-nexus-500 hover:text-nexus-300'}`}
                >
                  BODY
                </button>
                <button 
                  onClick={() => setActiveTab('HEADERS')}
                  className={`px-4 py-2 text-xs font-mono border-b-2 transition-colors ${activeTab === 'HEADERS' ? 'border-neon-purple text-white' : 'border-transparent text-nexus-500 hover:text-nexus-300'}`}
                >
                  HEADERS
                </button>
                <div className="flex-1 flex justify-end items-center gap-3">
                   <button onClick={loadTemplate} className="text-[10px] text-nexus-500 hover:text-white uppercase"><i className="fa-solid fa-bolt mr-1"></i> Template</button>
                   <button onClick={clearAll} className="text-[10px] text-nexus-500 hover:text-white uppercase"><i className="fa-solid fa-trash mr-1"></i> Clear</button>
                </div>
             </div>

             {/* Editor Area */}
             <div className="flex-1 relative group bg-nexus-900/20">
              {activeTab === 'BODY' ? (
                <textarea
                  ref={textareaRef}
                  value={reqBody}
                  onChange={(e) => setReqBody(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Enter Request Body..."
                  className={`w-full h-full bg-transparent p-6 font-mono text-sm resize-none focus:outline-none text-nexus-100 placeholder-nexus-700`}
                />
              ) : (
                <textarea
                  value={reqHeaders}
                  onChange={(e) => setReqHeaders(e.target.value)}
                  placeholder='{ "Content-Type": "application/json" }'
                  className={`w-full h-full bg-transparent p-6 font-mono text-sm resize-none focus:outline-none text-neon-purple placeholder-nexus-700`}
                />
              )}

              {/* EXECUTE BUTTON FLOATING */}
              <div className="absolute bottom-6 right-6 z-10">
                <button
                  onClick={handleProcess}
                  disabled={status === 'PROCESSING' || !isListening}
                  className={`
                    h-12 px-6 rounded-full font-bold text-sm tracking-wide shadow-xl transition-all flex items-center gap-2 border border-white/10
                    ${status === 'PROCESSING' || !isListening
                      ? 'bg-nexus-800 text-nexus-500 cursor-not-allowed grayscale'
                      : 'bg-gradient-to-r from-neon-blue to-neon-purple text-white hover:brightness-110 active:scale-95 shadow-neon-blue/20'}
                  `}
                >
                  {status === 'PROCESSING' ? (
                    <>PROCESSING...</>
                  ) : !isListening ? (
                    <>LISTENER OFFLINE</>
                  ) : (
                    <>SEND REQUEST <i className="fa-solid fa-paper-plane text-xs"></i></>
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

          <div className="flex-1 p-6 flex flex-col min-h-0 relative">
            <StatusBadge status={status} />
            <div className="mt-4 h-full">
              {output ? (
                <CodeBlock 
                  content={output} 
                  isJson={output.trim().startsWith('{') || output.trim().startsWith('[')}
                  label={`RESPONSE (${format})`}
                />
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-nexus-600 space-y-4 opacity-50">
                   <div className="w-20 h-20 rounded-full border-2 border-dashed border-nexus-600 flex items-center justify-center animate-spin-slow">
                      <i className="fa-solid fa-satellite-dish text-3xl"></i>
                   </div>
                   <p className="font-mono text-sm">LISTENER READY. WAITING FOR TRAFFIC...</p>
                </div>
              )}
            </div>
          </div>

          {/* LOGS / HISTORY FOOTER */}
          <div className="h-48 border-t border-nexus-800 bg-nexus-950 p-4 overflow-y-auto">
            <h3 className="text-xs font-mono text-nexus-500 uppercase tracking-wider mb-3 sticky top-0 bg-nexus-950 pb-2">
              Traffic Logs
            </h3>
            <div className="space-y-1">
              {logs.length === 0 && (
                <div className="text-xs font-mono text-nexus-700 italic px-2">No traffic recorded.</div>
              )}
              {logs.map((log) => (
                <div key={log.id} className="flex items-center justify-between p-2 rounded hover:bg-nexus-900 group cursor-pointer border border-transparent hover:border-nexus-800 transition-colors">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <span className="text-[10px] text-nexus-500 font-mono">
                      {log.timestamp.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' })}
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                      log.inputSnippet.startsWith('GET') ? 'bg-neon-blue/20 text-neon-blue' :
                      log.inputSnippet.startsWith('POST') ? 'bg-neon-green/20 text-neon-green' :
                      log.inputSnippet.startsWith('DELETE') ? 'bg-neon-error/20 text-neon-error' :
                      'bg-nexus-700 text-nexus-300'
                    }`}>
                      {log.inputSnippet.split(' ')[0]}
                    </span>
                    <span className="text-[9px] px-1 rounded border border-nexus-700 text-nexus-400">
                      {log.format}
                    </span>
                    <span className="text-xs font-mono text-nexus-400 truncate max-w-[150px]">
                      {log.inputSnippet.split(' ').slice(1).join(' ')}
                    </span>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => {
                        const [m, ...p] = log.inputSnippet.split(' ');
                        setMethod(m as HttpMethod);
                        setPath(p.join(' '));
                        // Note: We don't restore body in this simple log version yet to keep log object small, 
                        // but normally we would.
                      }} 
                      className="text-nexus-500 hover:text-white"
                      title="Replay Request"
                    >
                      <i className="fa-solid fa-rotate-right text-xs"></i>
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
