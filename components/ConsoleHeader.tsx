import React from 'react';
import { APP_NAME, APP_VERSION } from '../constants';

export const ConsoleHeader: React.FC = () => {
  return (
    <header className="h-16 border-b border-nexus-800 bg-nexus-950 flex items-center justify-between px-6 sticky top-0 z-50">
      <div className="flex items-center gap-4">
        <div className="w-8 h-8 rounded bg-gradient-to-br from-neon-blue to-neon-purple flex items-center justify-center text-white font-bold shadow-lg shadow-neon-blue/20">
          <i className="fa-solid fa-network-wired text-sm"></i>
        </div>
        <div>
          <h1 className="text-nexus-100 font-mono font-bold tracking-tight text-lg leading-none">
            {APP_NAME}
          </h1>
          <span className="text-xs text-nexus-500 font-mono tracking-widest uppercase">
            {APP_VERSION} // ONLINE
          </span>
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-nexus-900 border border-nexus-800 text-xs font-mono text-neon-green">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neon-green opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-neon-green"></span>
          </span>
          SYSTEM OPERATIONAL
        </div>
      </div>
    </header>
  );
};
