import React from 'react';

interface StatusBadgeProps {
  status: 'IDLE' | 'PROCESSING' | 'SUCCESS' | 'ERROR';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const styles = {
    IDLE: "text-nexus-500 bg-nexus-900 border-nexus-700",
    PROCESSING: "text-neon-blue bg-neon-blue/10 border-neon-blue/30 animate-pulse",
    SUCCESS: "text-neon-green bg-neon-green/10 border-neon-green/30",
    ERROR: "text-neon-error bg-neon-error/10 border-neon-error/30",
  };

  const icons = {
    IDLE: "fa-solid fa-circle-pause",
    PROCESSING: "fa-solid fa-microchip",
    SUCCESS: "fa-solid fa-circle-check",
    ERROR: "fa-solid fa-triangle-exclamation",
  };

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-md border text-xs font-mono font-medium transition-all duration-300 ${styles[status]}`}>
      <i className={`${icons[status]} ${status === 'PROCESSING' ? 'fa-spin' : ''}`}></i>
      <span>{status}</span>
    </div>
  );
};
