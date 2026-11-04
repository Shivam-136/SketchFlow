import React, { useRef } from 'react';
import {
  MousePointer2,
  Hand,
  Square,
  Circle,
  ArrowUpRight,
  Minus,
  Pencil,
  Type,
  Eraser,
  Image as ImageIcon
} from 'lucide-react';
import { useCanvasStore } from '../../store/canvasStore';
import { IconButton } from '../common/IconButton';
import { screenToCanvas } from '../../utils/canvasUtils';
import { createImageElementFromFile } from '../../utils/imageUtils';

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
  { id: 'image', label: 'Image', shortcut: '9', icon: ImageIcon },
  { id: 'eraser', label: 'Eraser', shortcut: 'E', icon: Eraser },
];

export function Toolbar() {
  const activeTool = useCanvasStore((s) => s.activeTool);
  const setActiveTool = useCanvasStore((s) => s.setActiveTool);
  const addElement = useCanvasStore((s) => s.addElement);
  const setSelectedIds = useCanvasStore((s) => s.setSelectedIds);
  const panOffset = useCanvasStore((s) => s.panOffset);
  const zoom = useCanvasStore((s) => s.zoom);

  const fileInputRef = useRef(null);

  const handleToolClick = (toolId) => {
    if (toolId === 'image') {
      fileInputRef.current?.click();
      return;
    }
    setActiveTool(toolId);
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const centerScreen = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
      const centerCanvas = screenToCanvas(centerScreen.x, centerScreen.y, panOffset, zoom);
      const newEl = await createImageElementFromFile(file, centerCanvas);
      addElement(newEl);
      setSelectedIds([newEl.id]);
      setActiveTool('selection');
    } catch (err) {
      alert(err.message || 'Failed to upload image.');
    } finally {
      if (e.target) e.target.value = '';
    }
  };

  return (
    <div className="fixed top-3 left-1/2 -translate-x-1/2 z-40 pointer-events-auto">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        onChange={handleFileChange}
        className="hidden"
        aria-hidden="true"
      />
      <nav
        aria-label="Drawing Tools"
        className="flex items-center gap-1 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md px-2 py-1.5 rounded-2xl shadow-sketch border border-zinc-200/80 dark:border-zinc-800 transition-colors duration-200"
      >
        {TOOLS.map((tool) => (
          <IconButton
            key={tool.id}
            icon={tool.icon}
            label={tool.label}
            shortcut={tool.shortcut}
            isActive={activeTool === tool.id}
            onClick={() => handleToolClick(tool.id)}
            size="md"
            position="bottom"
          />
        ))}
      </nav>
    </div>
  );
}

