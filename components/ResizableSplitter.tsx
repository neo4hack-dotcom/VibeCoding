import React, { useState, useRef, useEffect } from 'react';

interface ResizableSplitterProps {
  isVertical?: boolean;
  initialSize?: number; // Pourcentage
  minSize?: number; // Pourcentage
  maxSize?: number; // Pourcentage
  firstChild: React.ReactNode;
  secondChild: React.ReactNode;
  isFirstHidden?: boolean;
  isSecondHidden?: boolean;
}

const ResizableSplitter: React.FC<ResizableSplitterProps> = ({
  isVertical = false,
  initialSize = 50,
  minSize = 10,
  maxSize = 90,
  firstChild,
  secondChild,
  isFirstHidden = false,
  isSecondHidden = false,
}) => {
  const [size, setSize] = useState(initialSize);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      let newSize;

      if (isVertical) {
        // Calcul hauteur
        const offset = e.clientY - containerRect.top;
        newSize = (offset / containerRect.height) * 100;
      } else {
        // Calcul largeur
        const offset = e.clientX - containerRect.left;
        newSize = (offset / containerRect.width) * 100;
      }

      if (newSize < minSize) newSize = minSize;
      if (newSize > maxSize) newSize = maxSize;

      setSize(newSize);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = isVertical ? 'row-resize' : 'col-resize';
      document.body.style.userSelect = 'none';
    } else {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isVertical, minSize, maxSize]);

  // Si un enfant est caché, on rend l'autre en plein écran
  if (isFirstHidden) return <div className="w-full h-full">{secondChild}</div>;
  if (isSecondHidden) return <div className="w-full h-full">{firstChild}</div>;

  return (
    <div 
        ref={containerRef} 
        className={`flex w-full h-full ${isVertical ? 'flex-col' : 'flex-row'}`}
    >
      {/* Premier Enfant */}
      <div 
        style={{ 
            [isVertical ? 'height' : 'width']: `${size}%`,
        }}
        className="relative overflow-hidden"
      >
        {firstChild}
      </div>

      {/* Handle de redimensionnement */}
      <div
        onMouseDown={handleMouseDown}
        className={`z-10 flex items-center justify-center bg-slate-900 border-slate-700 transition-colors hover:bg-blue-600
            ${isVertical 
                ? 'h-1.5 w-full cursor-row-resize border-y hover:h-2' 
                : 'w-1.5 h-full cursor-col-resize border-x hover:w-2'
            }
            ${isDragging ? 'bg-blue-600' : ''}
        `}
      >
          {/* Petite poignée visuelle */}
          <div className={`bg-slate-500 rounded-full opacity-50 ${isVertical ? 'w-8 h-0.5' : 'h-8 w-0.5'}`} />
      </div>

      {/* Second Enfant (Flex 1 pour remplir le reste) */}
      <div className="flex-1 overflow-hidden relative">
        {secondChild}
      </div>
    </div>
  );
};

export default ResizableSplitter;