import React, { useState, useRef, useEffect } from 'react';
import 'mathlive';
import { X } from 'lucide-react';

const MATH_CATEGORIES = [
  {
    name: 'Cơ bản',
    items: [
      { label: 'Phân số', latex: '\\frac{#0}{#0}' },
      { label: 'Căn bậc 2', latex: '\\sqrt{#0}' },
      { label: 'Căn bậc n', latex: '\\sqrt[#0]{#0}' },
      { label: 'Mũ', latex: '#0^{#0}' },
      { label: 'Chỉ số dưới', latex: '#0_{#0}' },
      { label: 'Mũ & Chỉ số', latex: '#0_{#0}^{#0}' },
      { label: 'Trị tuyệt đối', latex: '\\left| #0 \\right|' },
      { label: 'Ngoặc tròn', latex: '\\left( #0 \\right)' },
      { label: 'Ngoặc vuông', latex: '\\left[ #0 \\right]' },
      { label: 'Ngoặc nhọn', latex: '\\left\\{ #0 \\right\\}' },
    ]
  },
  {
    name: 'Phép toán',
    items: [
      { label: '×', latex: '\\times' },
      { label: '÷', latex: '\\div' },
      { label: '±', latex: '\\pm' },
      { label: '∓', latex: '\\mp' },
      { label: '≠', latex: '\\neq' },
      { label: '≈', latex: '\\approx' },
      { label: '≡', latex: '\\equiv' },
      { label: '≤', latex: '\\leq' },
      { label: '≥', latex: '\\geq' },
      { label: '∝', latex: '\\propto' },
      { label: '∞', latex: '\\infty' },
      { label: '·', latex: '\\cdot' },
      { label: '∘', latex: '\\circ' },
    ]
  },
  {
    name: 'Hàm số & Logarit',
    items: [
      { label: 'log', latex: '\\log_{#0}(#0)' },
      { label: 'ln', latex: '\\ln(#0)' },
      { label: 'e^x', latex: 'e^{#0}' },
      { label: 'Giới hạn (lim)', latex: '\\lim_{#0 \\to #0} #0' },
      { label: 'Hệ phương trình', latex: '\\begin{cases} #0 \\\\ #0 \\end{cases}' },
      { label: 'Hệ 3 phương trình', latex: '\\begin{cases} #0 \\\\ #0 \\\\ #0 \\end{cases}' },
    ]
  },
  {
    name: 'Giải tích',
    items: [
      { label: 'Tích phân', latex: '\\int_{#0}^{#0} #0 \\, dx' },
      { label: 'Tích phân kép', latex: '\\iint_{#0} #0 \\, dx \\, dy' },
      { label: 'Tích phân đường', latex: '\\oint_{#0} #0 \\, ds' },
      { label: 'Tổng (Sigma)', latex: '\\sum_{#0}^{#0} #0' },
      { label: 'Tích (Pi)', latex: '\\prod_{#0}^{#0} #0' },
      { label: 'Đạo hàm', latex: '\\frac{d}{dx} #0' },
      { label: 'Đạo hàm riêng', latex: '\\frac{\\partial}{\\partial x} #0' },
      { label: 'Nabla', latex: '\\nabla' },
    ]
  },
  {
    name: 'Lượng giác',
    items: [
      { label: 'sin', latex: '\\sin(#0)' },
      { label: 'cos', latex: '\\cos(#0)' },
      { label: 'tan', latex: '\\tan(#0)' },
      { label: 'cot', latex: '\\cot(#0)' },
      { label: 'arcsin', latex: '\\arcsin(#0)' },
      { label: 'arccos', latex: '\\arccos(#0)' },
      { label: 'arctan', latex: '\\arctan(#0)' },
      { label: 'sinh', latex: '\\sinh(#0)' },
      { label: 'cosh', latex: '\\cosh(#0)' },
      { label: 'tanh', latex: '\\tanh(#0)' },
    ]
  },
  {
    name: 'Tập hợp & Logic',
    items: [
      { label: '∈', latex: '\\in' },
      { label: '∉', latex: '\\notin' },
      { label: '⊂', latex: '\\subset' },
      { label: '⊆', latex: '\\subseteq' },
      { label: '∪', latex: '\\cup' },
      { label: '∩', latex: '\\cap' },
      { label: '∅', latex: '\\emptyset' },
      { label: '∀', latex: '\\forall' },
      { label: '∃', latex: '\\exists' },
      { label: '⇒', latex: '\\Rightarrow' },
      { label: '⇔', latex: '\\Leftrightarrow' },
      { label: '∴', latex: '\\therefore' },
      { label: '∵', latex: '\\because' },
    ]
  },
  {
    name: 'Hình học & Ký hiệu',
    items: [
      { label: 'Độ (°)', latex: '^\\circ' },
      { label: 'Góc (∠)', latex: '\\angle' },
      { label: 'Tam giác (△)', latex: '\\triangle' },
      { label: 'Vuông góc (⊥)', latex: '\\perp' },
      { label: 'Song song (∥)', latex: '\\parallel' },
      { label: 'Đồng dạng (∼)', latex: '\\sim' },
      { label: 'Bằng nhau (≅)', latex: '\\cong' },
      { label: 'Cung (⌒)', latex: '\\overarc{#0}' },
      { label: 'Mũi tên phải', latex: '\\rightarrow' },
      { label: 'Mũi tên trái', latex: '\\leftarrow' },
    ]
  },
  {
    name: 'Ma trận & Vector',
    items: [
      { label: 'Vector', latex: '\\vec{#0}' },
      { label: 'Độ dài vector', latex: '\\left\\| \\vec{#0} \\right\\|' },
      { label: 'Ma trận 2x2', latex: '\\begin{pmatrix} #0 & #0 \\\\ #0 & #0 \\end{pmatrix}' },
      { label: 'Ma trận 3x3', latex: '\\begin{pmatrix} #0 & #0 & #0 \\\\ #0 & #0 & #0 \\\\ #0 & #0 & #0 \\end{pmatrix}' },
      { label: 'Định thức 2x2', latex: '\\begin{vmatrix} #0 & #0 \\\\ #0 & #0 \\end{vmatrix}' },
      { label: 'Định thức 3x3', latex: '\\begin{vmatrix} #0 & #0 & #0 \\\\ #0 & #0 & #0 \\\\ #0 & #0 & #0 \\end{vmatrix}' },
    ]
  },
  {
    name: 'Chữ cái Hy Lạp',
    items: [
      { label: 'α', latex: '\\alpha' },
      { label: 'β', latex: '\\beta' },
      { label: 'γ', latex: '\\gamma' },
      { label: 'Δ', latex: '\\Delta' },
      { label: 'δ', latex: '\\delta' },
      { label: 'ε', latex: '\\varepsilon' },
      { label: 'θ', latex: '\\theta' },
      { label: 'λ', latex: '\\lambda' },
      { label: 'μ', latex: '\\mu' },
      { label: 'π', latex: '\\pi' },
      { label: 'ρ', latex: '\\rho' },
      { label: 'σ', latex: '\\sigma' },
      { label: 'φ', latex: '\\varphi' },
      { label: 'ω', latex: '\\omega' },
      { label: 'Ω', latex: '\\Omega' },
    ]
  }
];

export function MathEditorModal({
  isOpen,
  onClose,
  onInsert,
}: {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (latex: string) => void;
}) {
  const [latex, setLatex] = useState('');
  const [activeTab, setActiveTab] = useState(0);
  const mfRef = useRef<any>(null);

  useEffect(() => {
    if (isOpen && mfRef.current) {
      const mf = mfRef.current;
      // Focus the math field when modal opens
      setTimeout(() => mf.focus(), 100);
      
      const handleInput = (e: Event) => {
        setLatex((e.target as any).value);
      };
      mf.addEventListener('input', handleInput);
      return () => mf.removeEventListener('input', handleInput);
    }
  }, [isOpen]);

  const insertLatex = (latexCmd: string) => {
    if (mfRef.current) {
      mfRef.current.executeCommand(['insert', latexCmd]);
      mfRef.current.focus();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl flex flex-col overflow-hidden max-h-[90vh]">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <h2 className="text-lg font-bold text-slate-800">Bàn phím Toán học (MathType Style)</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-800">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Toolbar Tabs */}
          <div className="flex overflow-x-auto border-b border-slate-200 bg-slate-50 scrollbar-hide">
            {MATH_CATEGORIES.map((cat, idx) => (
              <button
                key={idx}
                onClick={() => setActiveTab(idx)}
                className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === idx
                    ? 'border-indigo-600 text-indigo-600 bg-white'
                    : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Toolbar Buttons */}
          <div className="p-3 bg-slate-100 border-b border-slate-200 flex flex-wrap gap-2 overflow-y-auto max-h-32">
            {MATH_CATEGORIES[activeTab].items.map((item, idx) => (
              <button
                key={idx}
                onClick={() => insertLatex(item.latex)}
                className="px-3 py-2 bg-white border border-slate-300 rounded shadow-sm hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700 text-slate-700 font-medium text-sm transition-colors"
                title={item.latex}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="p-6 flex-1 overflow-y-auto">
            <p className="text-sm text-slate-600 mb-4">
              Sử dụng thanh công cụ phía trên hoặc gõ trực tiếp bằng bàn phím.
            </p>
            <div className="border-2 border-slate-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500 bg-white min-h-[120px] flex items-center">
              <math-field 
                ref={mfRef} 
                math-virtual-keyboard-policy="manual"
                style={{ 
                  width: '100%', 
                  padding: '16px', 
                  backgroundColor: 'white', 
                  fontSize: '1.8rem',
                  outline: 'none',
                  border: 'none',
                  minHeight: '80px'
                }}
              >
                {latex}
              </math-field>
            </div>
            
            <div className="flex justify-end gap-3 pt-6">
              <button 
                onClick={onClose} 
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-md font-medium transition-colors"
              >
                Hủy
              </button>
              <button 
                onClick={() => {
                  if (latex.trim()) {
                    onInsert(`$${latex}$`);
                    setLatex('');
                    onClose();
                  }
                }}
                disabled={!latex.trim()}
                className="px-6 py-2 bg-indigo-600 text-white rounded-md font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                Chèn công thức
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
