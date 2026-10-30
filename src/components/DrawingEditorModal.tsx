import React, { useState, useRef, useEffect } from 'react';
import * as fabric from 'fabric';
import { 
  X, 
  Square, 
  Circle, 
  Minus, 
  Pencil, 
  Type, 
  Eraser, 
  Trash2, 
  Undo2, 
  Save, 
  MousePointer2,
  Image as ImageIcon
} from 'lucide-react';

interface DrawingEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (imageData: string) => void;
  initialData?: string;
}

export function DrawingEditorModal({
  isOpen,
  onClose,
  onInsert,
  initialData
}: DrawingEditorModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<fabric.Canvas | null>(null);
  const [activeTool, setActiveTool] = useState<string>('pencil');
  const [color, setColor] = useState<string>('#4f46e5'); // Indigo 600
  const [brushSize, setBrushSize] = useState<number>(3);

  // Initialize Canvas
  useEffect(() => {
    if (isOpen && canvasRef.current && !fabricCanvas) {
      const canvas = new fabric.Canvas(canvasRef.current, {
        width: 700,
        height: 400,
        backgroundColor: '#ffffff',
        isDrawingMode: true
      });

      // Style the brush
      canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
      canvas.freeDrawingBrush.width = brushSize;
      canvas.freeDrawingBrush.color = color;

      setFabricCanvas(canvas);

      // Load initial data if exists
      if (initialData) {
        // If it's a dataURL, we can't easily "edit" layers unless we stored JSON.
        // For simplicity, we'll just treat it as an image background if users want to edit,
        // but usually in these apps, "insert" means "start fresh or replace".
      }
    }

    return () => {
      if (fabricCanvas) {
        fabricCanvas.dispose();
        setFabricCanvas(null);
      }
    };
  }, [isOpen]);

  // Update Color & Size
  useEffect(() => {
    if (fabricCanvas && fabricCanvas.freeDrawingBrush) {
      fabricCanvas.freeDrawingBrush.color = color;
      fabricCanvas.freeDrawingBrush.width = brushSize;
    }
  }, [color, brushSize, fabricCanvas]);

  const setTool = (tool: string) => {
    setActiveTool(tool);
    if (!fabricCanvas) return;

    fabricCanvas.isDrawingMode = tool === 'pencil';
    fabricCanvas.selection = tool === 'select';
    
    // Disable selection when not in 'select' mode
    fabricCanvas.forEachObject(obj => {
      obj.selectable = tool === 'select';
      obj.evented = tool === 'select';
    });
    
    fabricCanvas.requestRenderAll();
  };

  const addShape = (type: string) => {
    if (!fabricCanvas) return;
    
    setTool('select');

    let shape: fabric.Object | undefined;
    const center = fabricCanvas.getVpCenter();

    switch (type) {
      case 'rect':
        shape = new fabric.Rect({
          left: center.x - 50,
          top: center.y - 50,
          fill: 'transparent',
          stroke: color,
          strokeWidth: brushSize,
          width: 100,
          height: 100,
        });
        break;
      case 'circle':
        shape = new fabric.Circle({
          left: center.x - 50,
          top: center.y - 50,
          fill: 'transparent',
          stroke: color,
          strokeWidth: brushSize,
          radius: 50,
        });
        break;
      case 'triangle':
        shape = new fabric.Triangle({
          left: center.x - 50,
          top: center.y - 50,
          fill: 'transparent',
          stroke: color,
          strokeWidth: brushSize,
          width: 100,
          height: 100,
        });
        break;
      case 'line':
        shape = new fabric.Line([50, 50, 150, 50], {
          left: center.x - 50,
          top: center.y - 50,
          stroke: color,
          strokeWidth: brushSize,
        });
        break;
      case 'arrow':
        // Creating an arrow using a group of a line and a triangle as head
        const line = new fabric.Line([0, 5, 100, 5], {
          stroke: color,
          strokeWidth: brushSize,
        });
        const head = new fabric.Triangle({
          width: 15 + brushSize,
          height: 15 + brushSize,
          fill: color,
          left: 100,
          top: 0,
          angle: 90,
        });
        shape = new fabric.Group([line, head], {
          left: center.x - 50,
          top: center.y - 7,
        });
        break;
      case 'star':
        const points = [];
        const n = 5;
        const r = 50;
        const ir = 25;
        for (let i = 0; i < n * 2; i++) {
          const currR = i % 2 === 0 ? r : ir;
          const angle = (i * Math.PI) / n - Math.PI / 2;
          points.push({ x: currR * Math.cos(angle), y: currR * Math.sin(angle) });
        }
        shape = new fabric.Polygon(points, {
          left: center.x - 50,
          top: center.y - 50,
          fill: 'transparent',
          stroke: color,
          strokeWidth: brushSize,
        });
        break;
      case 'hexagon':
        const hexPoints = [];
        for (let i = 0; i < 6; i++) {
          const angle = (i * Math.PI) / 3;
          hexPoints.push({ x: 50 * Math.cos(angle), y: 50 * Math.sin(angle) });
        }
        shape = new fabric.Polygon(hexPoints, {
          left: center.x - 50,
          top: center.y - 50,
          fill: 'transparent',
          stroke: color,
          strokeWidth: brushSize,
        });
        break;
      case 'diamond':
        shape = new fabric.Rect({
          left: center.x - 50,
          top: center.y - 50,
          fill: 'transparent',
          stroke: color,
          strokeWidth: brushSize,
          width: 80,
          height: 80,
          angle: 45,
        });
        break;
      case 'text':
        shape = new fabric.IText('Nhập chữ...', {
          left: center.x - 50,
          top: center.y - 50,
          fill: color,
          fontSize: 24,
        });
        break;
    }

    if (shape) {
      fabricCanvas.add(shape);
      fabricCanvas.setActiveObject(shape);
      fabricCanvas.requestRenderAll();
    }
  };

  const deleteSelected = () => {
    if (!fabricCanvas) return;
    const activeObjects = fabricCanvas.getActiveObjects();
    if (activeObjects.length > 0) {
      fabricCanvas.remove(...activeObjects);
      fabricCanvas.discardActiveObject();
      fabricCanvas.requestRenderAll();
    }
  };

  const handleClear = () => {
    if (confirm('Bạn có chắc muốn xóa toàn bộ hình vẽ?') && fabricCanvas) {
      fabricCanvas.clear();
      fabricCanvas.backgroundColor = '#ffffff';
      fabricCanvas.requestRenderAll();
    }
  };

  const handleUndo = () => {
    if (!fabricCanvas) return;
    const objects = fabricCanvas.getObjects();
    if (objects.length > 0) {
      fabricCanvas.remove(objects[objects.length - 1]);
      fabricCanvas.requestRenderAll();
    }
  };

  const handleSave = () => {
    if (!fabricCanvas) return;
    // Export at a reasonable quality
    const dataURL = fabricCanvas.toDataURL({
      format: 'png',
      quality: 1,
      multiplier: 2 // High res
    });
    onInsert(dataURL);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl flex flex-col overflow-hidden max-h-[90vh]">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-indigo-600" />
            Vẽ sơ đồ / hình họa
          </h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-800">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden h-[500px]">
          {/* Tool Sidebar */}
          <div className="w-16 bg-slate-100 border-r border-slate-200 flex flex-col items-center py-4 gap-4">
            <button
              onClick={() => setTool('select')}
              className={`p-2 rounded-lg transition-colors ${activeTool === 'select' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-200'}`}
              title="Chọn đối tượng"
            >
              <MousePointer2 className="w-6 h-6" />
            </button>
            <button
              onClick={() => setTool('pencil')}
              className={`p-2 rounded-lg transition-colors ${activeTool === 'pencil' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-200'}`}
              title="Vẽ tự do"
            >
              <Pencil className="w-6 h-6" />
            </button>
            <div className="h-px w-8 bg-slate-300" />
            <button
              onClick={() => addShape('rect')}
              className="p-2 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg transition-colors"
              title="Hình chữ nhật"
            >
              <Square className="w-6 h-6" />
            </button>
            <button
              onClick={() => addShape('circle')}
              className="p-2 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg transition-colors"
              title="Hình tròn"
            >
              <Circle className="w-6 h-6" />
            </button>
            <button
              onClick={() => addShape('triangle')}
              className="p-2 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg transition-colors"
              title="Hình tam giác"
            >
              <div className="w-6 h-6 flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l9 18H3L12 3z"/></svg>
              </div>
            </button>
            <button
              onClick={() => addShape('diamond')}
              className="p-2 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg transition-colors"
              title="Hình thoi"
            >
              <div className="w-6 h-6 flex items-center justify-center rotate-45">
                 <Square className="w-5 h-5" />
              </div>
            </button>
            <button
              onClick={() => addShape('arrow')}
              className="p-2 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg transition-colors"
              title="Mũi tên"
            >
              <div className="w-6 h-6 flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </div>
            </button>
            <button
              onClick={() => addShape('star')}
              className="p-2 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg transition-colors"
              title="Ngôi sao"
            >
              <div className="w-6 h-6 flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
              </div>
            </button>
            <button
              onClick={() => addShape('hexagon')}
              className="p-2 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg transition-colors"
              title="Lục giác"
            >
              <div className="w-6 h-6 flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l8.66 5v10L12 22l-8.66-5V7L12 2z"/></svg>
              </div>
            </button>
            <button
              onClick={() => addShape('line')}
              className="p-2 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg transition-colors"
              title="Đường thẳng"
            >
              <Minus className="w-6 h-6" />
            </button>
            <button
              onClick={() => addShape('text')}
              className="p-2 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg transition-colors"
              title="Văn bản"
            >
              <Type className="w-6 h-6" />
            </button>
            <div className="h-px w-8 bg-slate-300" />
            <button
              onClick={handleUndo}
              className="p-2 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
              title="Hoàn tác"
            >
              <Undo2 className="w-6 h-6" />
            </button>
            <button
              onClick={handleClear}
              className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition-colors"
              title="Xóa trắng toàn bộ"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>

          {/* Main Workspace */}
          <div className="flex-1 flex flex-col bg-slate-200 p-8 overflow-auto">
            {/* Context bar */}
            <div className="mb-4 bg-white p-3 rounded-lg shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Màu sắc</span>
                  <div className="flex gap-1.5">
                    {['#000000', '#ef4444', '#10b981', '#4f46e5', '#f59e0b', '#ffffff'].map(c => (
                      <button
                        key={c}
                        onClick={() => setColor(c)}
                        className={`w-6 h-6 rounded-full border ${c === '#ffffff' ? 'border-slate-300' : 'border-transparent'} ${color === c ? 'ring-2 ring-indigo-400 scale-110' : ''}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                    <input 
                      type="color" 
                      value={color} 
                      onChange={(e) => setColor(e.target.value)}
                      className="w-6 h-6 p-0 border-0 cursor-pointer rounded-full" 
                    />
                  </div>
                </div>
                
                <div className="flex items-center gap-3 w-48">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Độ dày</span>
                  <input 
                    type="range" 
                    min="1" 
                    max="20" 
                    value={brushSize} 
                    onChange={(e) => setBrushSize(parseInt(e.target.value))}
                    className="w-full accent-indigo-600" 
                  />
                  <span className="text-xs font-mono w-4 text-slate-600">{brushSize}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 border-l pl-4 border-slate-200">
                <button
                  onClick={deleteSelected}
                  className="flex items-center gap-2 px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-md text-sm font-medium transition-colors"
                  title="Xóa hình đang chọn"
                >
                  <Trash2 className="w-4 h-4" />
                  Xóa hình chọn
                </button>
              </div>
            </div>

            <div className="flex-1 flex items-center justify-center">
              <div className="shadow-2xl bg-white rounded-sm">
                <canvas ref={canvasRef} />
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-md font-medium transition-colors">
            Hủy
          </button>
          <button 
            onClick={handleSave} 
            className="px-6 py-2 bg-indigo-600 text-white rounded-md font-medium hover:bg-indigo-700 transition-colors flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            Chèn hình vẽ
          </button>
        </div>
      </div>
    </div>
  );
}
