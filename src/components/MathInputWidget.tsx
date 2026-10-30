import React, { useState, useRef, useEffect } from 'react';
import 'mathlive';

export function MathInputWidget({ onInsert }: { onInsert: (latex: string) => void }) {
  const [latex, setLatex] = useState('');
  const mfRef = useRef<any>(null);

  useEffect(() => {
    const mf = mfRef.current;
    if (mf) {
      const handleInput = (e: Event) => {
        setLatex((e.target as any).value);
      };
      mf.addEventListener('input', handleInput);
      return () => mf.removeEventListener('input', handleInput);
    }
  }, []);

  return (
    <div className="flex flex-col gap-2 p-3 bg-slate-50 border border-slate-200 rounded-md">
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium text-slate-700">Bàn phím Toán học</span>
        <button
          type="button"
          onClick={() => {
            if (latex.trim()) {
              onInsert(`$${latex}$`);
              if (mfRef.current) {
                mfRef.current.value = '';
                setLatex('');
              }
            }
          }}
          disabled={!latex.trim()}
          className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded text-sm font-medium hover:bg-indigo-200 disabled:opacity-50"
        >
          Chèn vào văn bản
        </button>
      </div>
      <math-field 
        ref={mfRef} 
        style={{ 
          width: '100%', 
          padding: '8px', 
          backgroundColor: 'white', 
          border: '1px solid #cbd5e1', 
          borderRadius: '0.375rem',
          fontSize: '1.2rem'
        }}
      >
        {latex}
      </math-field>
    </div>
  );
}
