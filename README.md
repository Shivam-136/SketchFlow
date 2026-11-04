# SketchFlow — Modern Online Whiteboard

A complete, production-quality, Excalidraw-inspired whiteboard application built with React, Vite, Tailwind CSS, HTML5 Canvas API, and Zustand.

## 🚀 Key Features

### 1. Drawing Tools
- **Selection Tool (`V`)**: Select individual shapes, multi-select via marquee drag or `Shift + click`, translate, and resize with 8 bounding box handles.
- **Hand Tool (`H`)**: Pan around the infinite-style canvas (also supports holding `Space` or middle mouse button).
- **Rectangle (`R`)**: Clean or sketchy rectangles with sharp or rounded corners.
- **Circle / Ellipse (`O`)**: Organic circular shapes with custom fill styles.
- **Diamond (`D`)**: Flowchart decision diamonds.
- **Arrow (`A`)**: Vector arrows with clean angled arrowheads.
- **Line (`L`)**: Clean or sketchy line segments.
- **Pencil (`P`)**: Freehand drawing with smooth curves and point optimization.
- **Text (`T`)**: Click-to-type inline multiline text with font family, font size, and alignment options (double-click existing text to edit).
- **Eraser (`E`)**: Click or drag across shapes to erase them.

### 2. Shape Properties & Styling
- **Stroke Color**: Curated palette + full RGB/Hex color picker.
- **Background Fill**: Transparent, solid, translucent (`semi`), and authentic **hachure** cross-hatching.
- **Stroke Width**: Thin (1px), Regular (2px), Bold (4px), Extra Bold (6px).
- **Stroke Style**: Solid, Dashed, Dotted.
- **Roughness / Aesthetic**:
  - `Architect`: Clean, geometric lines.
  - `Artist`: Organic, hand-drawn look.
  - `Cartoonist`: Bold, playful double-drawn sketch lines.
- **Corners**: Sharp vs Rounded edges for rectangles.
- **Opacity**: 10% to 100% slider.
- **Text Styling**: Font families (Handwritten Caveat, Clean Inter, Monospace Code), Font size (S, M, L, XL), Text alignment.

### 3. Selection & Manipulation
- Single click selection & Shift+click multi-selection.
- 8-point bounding box resize handles (`nw`, `n`, `ne`, `e`, `se`, `s`, `sw`, `w`) with proportional scaling for single and group selections.
- Drag & move selected element(s).
- Alignment tools: Align Left, Center X, Right, Top, Middle Y, Bottom.
- Layer management: Bring to Front, Send to Back, Bring Forward, Send Backward.
- Duplicate (`Ctrl + D`), Copy (`Ctrl + C`), Paste (`Ctrl + V`), Delete (`Delete` / `Backspace`).

### 4. Canvas & Navigation
- Infinite-style canvas.
- Mouse wheel zoom centered at cursor position.
- Fit to Screen & Center Canvas controls.
- Grid mode toggle: `Dots`, `Lines`, `None`.
- High-DPI / Retina display support.

### 5. History & Persistence
- Undo (`Ctrl + Z`) and Redo (`Ctrl + Shift + Z` / `Ctrl + Y`).
- Automatic debounced persistence in `localStorage`.
- Restores canvas drawing after refresh.
- Clear canvas option with confirmation dialog.

### 6. Export & Import
- **Export as PNG**: High-resolution image (2x Retina scale).
- **Export as SVG**: Scalable vector graphics.
- **Export as JSON**: Project file (`.sketchflow` / `.json`).
- **Import JSON**: File picker to restore and edit previous projects.

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `V` / `1` | Selection Tool |
| `H` | Hand Tool |
| `R` / `2` | Rectangle Tool |
| `O` / `3` | Circle / Ellipse Tool |
| `D` / `4` | Diamond Tool |
| `A` / `5` | Arrow Tool |
| `L` / `6` | Line Tool |
| `P` / `7` | Pencil Tool |
| `T` / `8` | Text Tool |
| `E` / `9` | Eraser Tool |
| `Delete` / `Backspace` | Delete Selected |
| `Ctrl + Z` | Undo |
| `Ctrl + Shift + Z` / `Ctrl + Y` | Redo |
| `Ctrl + C` | Copy Elements |
| `Ctrl + V` | Paste Elements |
| `Ctrl + D` | Duplicate Elements |
| `Ctrl + A` | Select All |
| `Space + Drag` | Pan Canvas |
| `Ctrl + (+ / -)` | Zoom In / Out |
| `Ctrl + 0` | Reset Zoom (100%) |
| `?` | Keyboard Shortcuts Reference |

## 🛠️ Project Setup

```bash
# Install dependencies
npm install

# Start Vite dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

