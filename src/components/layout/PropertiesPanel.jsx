import React from 'react';
import {
  Layers,
  Copy,
  Trash2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  BringToFront,
  SendToBack,
  Sliders,
  Sparkles,
  Square,
  Hash
} from 'lucide-react';
import { useCanvasStore } from '../../store/canvasStore';
import { ColorPicker } from '../common/ColorPicker';
import { Tooltip } from '../common/Tooltip';

export function PropertiesPanel() {
  const activeTool = useCanvasStore((s) => s.activeTool);
  const selectedIds = useCanvasStore((s) => s.selectedIds);
  const elements = useCanvasStore((s) => s.elements);
  const toolProperties = useCanvasStore((s) => s.toolProperties);
  const updateToolProperties = useCanvasStore((s) => s.updateToolProperties);
  const deleteSelected = useCanvasStore((s) => s.deleteSelected);
  const duplicateSelected = useCanvasStore((s) => s.duplicateSelected);
  const bringToFront = useCanvasStore((s) => s.bringToFront);
  const sendToBack = useCanvasStore((s) => s.sendToBack);
  const bringForward = useCanvasStore((s) => s.bringForward);
  const sendBackward = useCanvasStore((s) => s.sendBackward);
  const alignSelected = useCanvasStore((s) => s.alignSelected);

  const selectedElements = elements.filter((e) => selectedIds.includes(e.id));
  const hasSelection = selectedElements.length > 0;
  const isMultipleSelected = selectedElements.length > 1;

  // Decide which property sections to show
  const isTextMode = activeTool === 'text' || (hasSelection && selectedElements.some((e) => e.type === 'text'));
  const isLineOrArrow = activeTool === 'line' || activeTool === 'arrow' || (hasSelection && selectedElements.every((e) => e.type === 'line' || e.type === 'arrow'));
  const isPencilMode = activeTool === 'pencil' || (hasSelection && selectedElements.every((e) => e.type === 'pencil'));
  const isShapeMode = !isTextMode && !isLineOrArrow && !isPencilMode;

  // If hand tool is active and nothing is selected, hide properties panel
  if (activeTool === 'hand' && !hasSelection) {
    return null;
  }

  return (
    <aside
      aria-label="Shape Properties Panel"
      className="fixed left-4 top-20 z-30 w-64 max-h-[calc(100vh-160px)] overflow-y-auto bg-white/95 backdrop-blur-md rounded-2xl shadow-sketch border border-zinc-200/80 p-3.5 flex flex-col gap-4 text-xs select-none"
    >
      {/* Header info */}
      <div className="flex items-center justify-between pb-1 border-b border-zinc-100">
        <span className="font-semibold text-zinc-800 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
          <Sliders className="w-3.5 h-3.5 text-indigo-600" />
          {hasSelection
            ? `${selectedElements.length} Selected`
            : `${activeTool.charAt(0).toUpperCase() + activeTool.slice(1)} Style`}
        </span>
      </div>

      {/* Stroke Color */}
      <ColorPicker
        label="Stroke Color"
        value={toolProperties.strokeColor}
        onChange={(color) => updateToolProperties({ strokeColor: color })}
      />

      {/* Background / Fill Color (for shapes) */}
      {!isLineOrArrow && !isPencilMode && !isTextMode && (
        <ColorPicker
          label="Background Fill"
          value={toolProperties.backgroundColor}
          onChange={(color) => updateToolProperties({ backgroundColor: color })}
          allowTransparent
        />
      )}

      {/* Fill Style: None, Solid, Semi, Hachure */}
      {isShapeMode && toolProperties.backgroundColor !== 'transparent' && (
        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Fill Style</span>
          <div className="grid grid-cols-4 gap-1 p-1 bg-zinc-100/80 rounded-xl">
            {[
              { id: 'none', label: 'None' },
              { id: 'semi', label: 'Semi' },
              { id: 'solid', label: 'Solid' },
              { id: 'hachure', label: 'Hachure' }
            ].map((style) => (
              <button
                key={style.id}
                type="button"
                onClick={() => updateToolProperties({ fillStyle: style.id })}
                className={`
                  py-1 text-[11px] rounded-lg font-medium transition-all
                  ${toolProperties.fillStyle === style.id
                    ? 'bg-white text-zinc-900 shadow-sm'
                    : 'text-zinc-600 hover:text-zinc-900'}
                `}
              >
                {style.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Stroke Width */}
      {!isTextMode && (
        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Stroke Width</span>
          <div className="grid grid-cols-4 gap-1.5">
            {[
              { width: 1, label: 'Thin' },
              { width: 2, label: 'Regular' },
              { width: 4, label: 'Bold' },
              { width: 6, label: 'Extra' }
            ].map((item) => (
              <button
                key={item.width}
                type="button"
                onClick={() => updateToolProperties({ strokeWidth: item.width })}
                className={`
                  flex items-center justify-center h-8 rounded-lg border transition-all
                  ${toolProperties.strokeWidth === item.width
                    ? 'bg-indigo-50 border-indigo-400 text-indigo-700'
                    : 'border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-600'}
                `}
                title={item.label}
              >
                <div
                  className="w-4 bg-current rounded-full"
                  style={{ height: item.width }}
                />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Stroke Style: Solid, Dashed, Dotted */}
      {!isTextMode && (
        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Stroke Style</span>
          <div className="grid grid-cols-3 gap-1 p-1 bg-zinc-100/80 rounded-xl">
            {[
              { id: 'solid', label: 'Solid' },
              { id: 'dashed', label: 'Dashed' },
              { id: 'dotted', label: 'Dotted' }
            ].map((style) => (
              <button
                key={style.id}
                type="button"
                onClick={() => updateToolProperties({ strokeStyle: style.id })}
                className={`
                  py-1 text-[11px] rounded-lg font-medium transition-all
                  ${toolProperties.strokeStyle === style.id
                    ? 'bg-white text-zinc-900 shadow-sm'
                    : 'text-zinc-600 hover:text-zinc-900'}
                `}
              >
                {style.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Sloppiness / Roughness */}
      {!isTextMode && (
        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider flex items-center justify-between">
            <span>Roughness / Style</span>
            <Sparkles className="w-3 h-3 text-amber-500" />
          </span>
          <div className="grid grid-cols-3 gap-1 p-1 bg-zinc-100/80 rounded-xl">
            {[
              { val: 0, label: 'Architect' },
              { val: 1, label: 'Artist' },
              { val: 2, label: 'Cartoonist' }
            ].map((r) => (
              <button
                key={r.val}
                type="button"
                onClick={() => updateToolProperties({ roughness: r.val })}
                className={`
                  py-1 text-[11px] rounded-lg font-medium transition-all
                  ${toolProperties.roughness === r.val
                    ? 'bg-white text-zinc-900 shadow-sm'
                    : 'text-zinc-600 hover:text-zinc-900'}
                `}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Corners: Sharp vs Rounded (for rectangles) */}
      {(activeTool === 'rectangle' || (hasSelection && selectedElements.some((e) => e.type === 'rectangle'))) && (
        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Corners</span>
          <div className="grid grid-cols-2 gap-1 p-1 bg-zinc-100/80 rounded-xl">
            {[
              { id: 'sharp', label: 'Sharp' },
              { id: 'round', label: 'Rounded' }
            ].map((edge) => (
              <button
                key={edge.id}
                type="button"
                onClick={() => updateToolProperties({ edgeStyle: edge.id })}
                className={`
                  py-1 text-[11px] rounded-lg font-medium transition-all
                  ${toolProperties.edgeStyle === edge.id
                    ? 'bg-white text-zinc-900 shadow-sm'
                    : 'text-zinc-600 hover:text-zinc-900'}
                `}
              >
                {edge.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Text Options */}
      {isTextMode && (
        <>
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Font Family</span>
            <div className="grid grid-cols-3 gap-1 p-1 bg-zinc-100/80 rounded-xl">
              {[
                { id: 'Caveat, cursive', label: 'Handwritten' },
                { id: 'Inter, sans-serif', label: 'Normal' },
                { id: 'JetBrains Mono, monospace', label: 'Code' }
              ].map((font) => (
                <button
                  key={font.id}
                  type="button"
                  onClick={() => updateToolProperties({ fontFamily: font.id })}
                  className={`
                    py-1 text-[11px] rounded-lg font-medium transition-all truncate px-1
                    ${toolProperties.fontFamily === font.id
                      ? 'bg-white text-zinc-900 shadow-sm'
                      : 'text-zinc-600 hover:text-zinc-900'}
                  `}
                >
                  {font.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Font Size</span>
            <div className="grid grid-cols-4 gap-1 p-1 bg-zinc-100/80 rounded-xl">
              {[
                { size: 16, label: 'S' },
                { size: 24, label: 'M' },
                { size: 36, label: 'L' },
                { size: 48, label: 'XL' }
              ].map((s) => (
                <button
                  key={s.size}
                  type="button"
                  onClick={() => updateToolProperties({ fontSize: s.size })}
                  className={`
                    py-1 text-[11px] rounded-lg font-medium transition-all
                    ${toolProperties.fontSize === s.size
                      ? 'bg-white text-zinc-900 shadow-sm'
                      : 'text-zinc-600 hover:text-zinc-900'}
                  `}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Text Alignment</span>
            <div className="grid grid-cols-3 gap-1 p-1 bg-zinc-100/80 rounded-xl">
              {[
                { id: 'left', icon: AlignLeft },
                { id: 'center', icon: AlignCenter },
                { id: 'right', icon: AlignRight }
              ].map((al) => {
                const Icon = al.icon;
                return (
                  <button
                    key={al.id}
                    type="button"
                    onClick={() => updateToolProperties({ textAlign: al.id })}
                    className={`
                      py-1 flex items-center justify-center rounded-lg transition-all
                      ${toolProperties.textAlign === al.id
                        ? 'bg-white text-zinc-900 shadow-sm'
                        : 'text-zinc-600 hover:text-zinc-900'}
                    `}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* Opacity slider */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
          <span>Opacity</span>
          <span className="text-zinc-700 font-mono">{toolProperties.opacity}%</span>
        </div>
        <input
          type="range"
          min="10"
          max="100"
          step="5"
          value={toolProperties.opacity}
          onChange={(e) => updateToolProperties({ opacity: Number(e.target.value) }, false)}
          onPointerUp={() => {
            const { elements, pushHistory } = useCanvasStore.getState();
            pushHistory(elements);
          }}
          className="w-full accent-indigo-600 cursor-pointer h-1.5 bg-zinc-200 rounded-lg appearance-none"
        />
      </div>

      {/* Multi-selection Alignment controls */}
      {isMultipleSelected && (
        <div className="flex flex-col gap-1.5 pt-2 border-t border-zinc-100">
          <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Align Elements</span>
          <div className="grid grid-cols-6 gap-1">
            {[
              { id: 'left', label: 'Left', icon: '⇤' },
              { id: 'center', label: 'Center X', icon: '⇥⇤' },
              { id: 'right', label: 'Right', icon: '⇥' },
              { id: 'top', label: 'Top', icon: '⤊' },
              { id: 'middle', label: 'Middle Y', icon: '⤋⤊' },
              { id: 'bottom', label: 'Bottom', icon: '⤋' }
            ].map((al) => (
              <button
                key={al.id}
                type="button"
                onClick={() => alignSelected(al.id)}
                title={`Align ${al.label}`}
                className="h-7 text-xs flex items-center justify-center font-mono rounded bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 text-zinc-700"
              >
                {al.icon}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Selection layer actions */}
      {hasSelection && (
        <div className="flex flex-col gap-1.5 pt-2 border-t border-zinc-100">
          <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Layers</span>
          <div className="grid grid-cols-4 gap-1">
            <button
              type="button"
              onClick={bringToFront}
              title="Bring to Front"
              className="p-1.5 flex items-center justify-center rounded-lg border border-zinc-200 hover:bg-zinc-100 text-zinc-700"
            >
              <BringToFront className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={bringForward}
              title="Bring Forward"
              className="p-1.5 text-xs font-semibold rounded-lg border border-zinc-200 hover:bg-zinc-100 text-zinc-700 flex items-center justify-center"
            >
              +1
            </button>
            <button
              type="button"
              onClick={sendBackward}
              title="Send Backward"
              className="p-1.5 text-xs font-semibold rounded-lg border border-zinc-200 hover:bg-zinc-100 text-zinc-700 flex items-center justify-center"
            >
              -1
            </button>
            <button
              type="button"
              onClick={sendToBack}
              title="Send to Back"
              className="p-1.5 flex items-center justify-center rounded-lg border border-zinc-200 hover:bg-zinc-100 text-zinc-700"
            >
              <SendToBack className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Duplicate & Delete */}
          <div className="grid grid-cols-2 gap-1.5 mt-1">
            <button
              type="button"
              onClick={duplicateSelected}
              className="flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-zinc-200 hover:bg-zinc-100 text-zinc-700 text-xs font-medium"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Duplicate</span>
            </button>
            <button
              type="button"
              onClick={deleteSelected}
              className="flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-700 text-xs font-medium"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
