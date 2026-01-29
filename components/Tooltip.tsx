import React from 'react';

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

const Tooltip: React.FC<TooltipProps> = ({ content, children, position = 'bottom' }) => {
  return (
    <div className="group relative flex items-center justify-center">
      {children}
      <div className={`
        absolute whitespace-nowrap bg-slate-800 text-slate-200 text-xs px-2 py-1 rounded 
        border border-slate-700 shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50
        ${position === 'bottom' ? 'top-full mt-2' : ''}
        ${position === 'top' ? 'bottom-full mb-2' : ''}
        ${position === 'right' ? 'left-full ml-2' : ''}
        ${position === 'left' ? 'right-full mr-2' : ''}
      `}>
        {content}
      </div>
    </div>
  );
};

export default Tooltip;