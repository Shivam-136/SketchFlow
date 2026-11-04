import React from 'react';
import {
  MousePointer2,
  Hand,
  Square,
  Circle,
  ArrowUpRight,
  Minus,
  Pencil,
  Type,
  Eraser
} from 'lucide-react';
import { useCanvasStore } from '../../store/canvasStore';
import { IconButton } from '../common/IconButton';

// Custom clean Diamond Icon
function DiamondIcon({ className, strokeWidth = 2 }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <polygon points="12 2 22 12 12 22 2 12" />
    </svg>
  );
}

const TOOLS = [
  { id: 'selection', label: 'Selection', shortcut: 'V', icon: MousePointer2 },
  { id: 'hand', label: 'Hand (Pan Canvas)', shortcut: 'H', icon: Hand },
  { id: 'rectangle', label: 'Rectangle', shortcut: 'R', icon: Square },
  { id: 'circle', label: 'Circle / Ellipse', shortcut: 'O', icon: Circle },
  { id: 'diamond', label: 'Diamond', shortcut: 'D', icon: DiamondIcon },
  { id: 'arrow', label: 'Arrow', shortcut: 'A', icon: ArrowUpRight },
  { id: 'line', label: 'Line', shortcut: 'L', icon: Minus },
  { id: 'pencil', label: 'Pencil (Freehand)', shortcut: 'P', icon: Pencil },
  { id: 'text', label: 'Text', shortcut: 'T', icon: Type },
  { id: 'eraser', label: 'Eraser', shortcut: 'E', icon: Eraser },
];

export function Toolbar() {
  const activeTool = useCanvasStore((s) => s.activeTool);
  const setActiveTool = useCanvasStore((s) => s.setActiveTool);

  return (
    <div className="fixed top-3 left-1/2 -translate-x-1/2 z-40 pointer-events-auto">
      <nav
        aria-label="Drawing Tools"
        className="flex items-center gap-1 bg-white/95 backdrop-blur-md px-2 py-1.5 rounded-2xl shadow-sketch border border-zinc-200/80"
      >
        {TOOLS.map((tool) => (
          <IconButton
            key={tool.id}
            icon={tool.icon}
            label={tool.label}
            shortcut={tool.shortcut}
            isActive={activeTool === tool.id}
            onClick={() => setActiveTool(tool.id)}
            size="md"
            position="bottom"
          />
        ))}
      </nav>
    </div>
  );
}

