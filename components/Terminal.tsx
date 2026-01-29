import React from 'react';
import { TerminalLog } from '../types';
import { Terminal as TerminalIcon, XCircle, CheckCircle, AlertTriangle, Info } from 'lucide-react';

interface TerminalProps {
  logs: TerminalLog[];
  onClear: () => void;
  onFixError?: () => void;
}

const Terminal: React.FC<TerminalProps> = ({ logs, onClear, onFixError }) => {
  return (
    <div className="flex flex-col h-full bg-[#1e1e1e] text-slate-300 font-mono text-sm">
      <div className="flex items-center justify-between px-4 py-2 bg-[#252526] border-b border-black">
        <div className="flex items-center gap-2">
          <TerminalIcon size={14} />
          <span className="font-semibold text-xs uppercase tracking-wider">Terminal</span>
        </div>
        <div className="flex gap-2">
            {logs.some(l => l.type === 'error') && onFixError && (
                <button 
                    onClick={onFixError}
                    className="text-xs px-2 py-1 bg-red-600/20 text-red-400 hover:bg-red-600/30 rounded flex items-center gap-1 transition-colors"
                >
                    <AlertTriangle size={12} /> Auto-Fix
                </button>
            )}
            <button onClick={onClear} className="text-xs hover:text-white">Clear</button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {logs.length === 0 && <div className="text-slate-600 italic">No logs...</div>}
        {logs.map((log) => (
          <div key={log.id} className="flex gap-2 items-start animate-in fade-in duration-300">
            <span className="text-slate-500 text-xs mt-0.5 min-w-[60px]">{log.timestamp}</span>
            <div className="mt-0.5">
                {log.type === 'error' && <XCircle size={14} className="text-red-500" />}
                {log.type === 'success' && <CheckCircle size={14} className="text-green-500" />}
                {log.type === 'warning' && <AlertTriangle size={14} className="text-yellow-500" />}
                {log.type === 'info' && <Info size={14} className="text-blue-500" />}
            </div>
            <span className={`${
                log.type === 'error' ? 'text-red-400' : 
                log.type === 'success' ? 'text-green-400' : 
                log.type === 'warning' ? 'text-yellow-400' : 'text-slate-300'
            }`}>
              {log.message}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Terminal;