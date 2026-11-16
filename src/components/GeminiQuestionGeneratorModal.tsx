import React, { useEffect, useState } from 'react';
import {
  X,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Check,
  Info,
} from 'lucide-react';
import Markdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

import { GeneratedQuestionItem } from '../services/ollamaService';
import { FinalQuestionPointToAdd } from './OllamaQuestionGeneratorModal';
import {
  GEMINI_MODELS,
  GeminiModelId,
  generateQuizQuestionsWithGemini,
} from '../services/geminiService';

type QuestionType = 'multiple_choice' | 'true_false' | 'fill_blank' | 'short_answer';

interface GeminiQuestionGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoDuration: number;
  currentTime: number;
  hasVideo: boolean;
  onApplyQuestions: (points: FinalQuestionPointToAdd[]) => void;
  insertDirectlyToCurrentPoint?: boolean;
}

export const GeminiQuestionGeneratorModal: React.FC<GeminiQuestionGeneratorModalProps> = ({
  isOpen,
  onClose,
  videoDuration,
  currentTime,
  hasVideo,
  onApplyQuestions,
  insertDirectlyToCurrentPoint = false,
}) => {
  const [topic, setTopic] = useState('');
  const [contentSnippet, setContentSnippet] = useState('');
  const [selectedModel, setSelectedModel] = useState<GeminiModelId>('gemini-4-hydrogen');
  const [questionCount, setQuestionCount] = useState<number>(3);
  const [selectedTypes, setSelectedTypes] = useState<QuestionType[]>(['multiple_choice', 'true_false']);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [includeLatex, setIncludeLatex] = useState(true);
  const [placement, setPlacement] = useState<'current' | 'distributed'>(
    insertDirectlyToCurrentPoint ? 'current' : 'distributed'
  );

  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedQuestions, setGeneratedQuestions] = useState<GeneratedQuestionItem[]>([]);
  const [step, setStep] = useState<'config' | 'preview'>('config');

  useEffect(() => {
    if (isOpen) {
      setPlacement(insertDirectlyToCurrentPoint ? 'current' : 'distributed');
      setError(null);
    }
  }, [isOpen, insertDirectlyToCurrentPoint]);

  if (!isOpen) return null;

  const currentModelInfo = GEMINI_MODELS.find((m) => m.id === selectedModel);

  const handleToggleType = (type: QuestionType) => {
    if (selectedTypes.includes(type)) {
      if (selectedTypes.length > 1) {
        setSelectedTypes(selectedTypes.filter((t) => t !== type));
      }
    } else {
      setSelectedTypes([...selectedTypes, type]);
    }
  };

  const handleGenerate = async () => {
    if (!topic.trim()) {
      setError('Vui lòng nhập chủ đề hoặc nội dung câu hỏi.');
      return;
    }

    setError(null);
    setIsGenerating(true);

    try {
      const results = await generateQuizQuestionsWithGemini({
        topic: topic.trim(),
        contentSnippet: contentSnippet.trim() || undefined,
        model: selectedModel,
        count: questionCount,
        types: selectedTypes,
        difficulty,
        includeLatex,
      });

      setGeneratedQuestions(results);
      setStep('preview');
    } catch (err: any) {
      console.error('Gemini generation error:', err);
      setError(err?.message || 'Có lỗi xảy ra khi tạo câu hỏi với Gemini.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUpdateQuestion = (index: number, field: keyof GeneratedQuestionItem, value: any) => {
    setGeneratedQuestions((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleUpdateOption = (qIndex: number, optIndex: number, val: string) => {
    setGeneratedQuestions((prev) => {
      const next = [...prev];
      const newOpts = [...next[qIndex].options];
      newOpts[optIndex] = val;
      next[qIndex] = { ...next[qIndex], options: newOpts };
      return next;
    });
  };

  const handleDeleteGeneratedQuestion = (index: number) => {
    setGeneratedQuestions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleApplyToVideo = () => {
    if (generatedQuestions.length === 0 || !hasVideo) return;

    if (placement === 'current' || insertDirectlyToCurrentPoint) {
      const point: FinalQuestionPointToAdd = {
        time: currentTime,
        questions: generatedQuestions.map((q) => ({
          id: Date.now().toString() + Math.random().toString(36).substring(2, 7),
          type: q.type,
          text: q.text,
          options: q.options,
          correctAnswerIndex: q.correctAnswerIndex,
          correctAnswerText: q.correctAnswerText,
        })),
      };
      onApplyQuestions([point]);
    } else {
      const safeDuration = videoDuration > 10 ? videoDuration : 60;
      const stepTime = safeDuration / (generatedQuestions.length + 1);

      const points: FinalQuestionPointToAdd[] = generatedQuestions.map((q, idx) => ({
        time: Math.round(stepTime * (idx + 1)),
        questions: [
          {
            id: Date.now().toString() + Math.random().toString(36).substring(2, 7) + idx,
            type: q.type,
            text: q.text,
            options: q.options,
            correctAnswerIndex: q.correctAnswerIndex,
            correctAnswerText: q.correctAnswerText,
          },
        ],
      }));

      onApplyQuestions(points);
    }

    onClose();
  };

  const formatTime = (time: number) => {
    const m = Math.floor(time / 60);
    const s = Math.floor(time % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-gradient-to-r from-sky-700 via-blue-700 to-indigo-700 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center border border-white/25 backdrop-blur-xs shadow-inner">
              <Sparkles className="w-5 h-5 text-amber-200" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold">Tạo Câu Hỏi Bằng Google Gemini AI</h2>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-white/15 text-sky-100">
                  {selectedModel}
                </span>
              </div>
              <p className="text-xs text-sky-100">
                Sinh nhanh bộ câu hỏi trắc nghiệm, đúng/sai, điền khuyết và công thức Toán LaTeX qua máy chủ Gemini
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1.5 rounded-lg hover:bg-white/15 transition-colors"
            title="Đóng"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Step Navigation when preview is ready */}
        {step === 'preview' && (
          <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-2">
            <button
              onClick={() => setStep('config')}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-blue-600 border-b-2 border-transparent transition-colors"
            >
              1. Cấu hình & Chủ đề
            </button>
            <button className="px-4 py-2 text-xs font-semibold text-blue-600 border-b-2 border-blue-600">
              2. Xem & Chỉnh sửa kết quả ({generatedQuestions.length} câu)
            </button>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {!hasVideo && (
            <div className="mb-4 bg-sky-50 text-sky-800 p-3 rounded-xl border border-sky-200 text-xs flex items-center gap-2">
              <Info className="w-4 h-4 text-sky-600 shrink-0" />
              <span>
                Bạn chưa tải video lên. Hãy tải video lên ở màn hình chính để có thể chèn trực tiếp câu hỏi tạo bởi Gemini vào dòng thời gian video.
              </span>
            </div>
          )}

          {error && (
            <div className="mb-4 bg-red-50 text-red-700 p-3.5 rounded-xl border border-red-200 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {step === 'config' ? (
            <div className="space-y-6">
              {/* Model selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Chọn mô hình Gemini
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {GEMINI_MODELS.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setSelectedModel(m.id)}
                      className={`p-3.5 rounded-xl border text-left transition-all ${
                        selectedModel === m.id
                          ? 'border-blue-600 bg-blue-50/80 shadow-xs ring-1 ring-blue-500'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-sm text-slate-900">{m.name}</span>
                        {selectedModel === m.id && <Check className="w-4 h-4 text-blue-600 shrink-0" />}
                      </div>
                      <span className="text-[10px] text-blue-700 font-semibold bg-blue-100 px-2 py-0.5 rounded inline-block mb-1.5">
                        {m.badge}
                      </span>
                      <p className="text-xs text-slate-600 leading-relaxed">{m.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Topic & Content Snippet */}
              <div className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Chủ đề hoặc Tiêu đề bài giảng <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="Ví dụ: Khảo sát hàm số bậc ba, Định luật bảo toàn động lượng, Lập trình Python..."
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    autoFocus
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Ghi chú / Tóm tắt nội dung video (Tùy chọn)
                    </label>
                    <span className="text-[11px] text-slate-500">
                      Dán phụ đề hoặc nội dung chính để câu hỏi sát với bài giảng
                    </span>
                  </div>
                  <textarea
                    rows={3}
                    value={contentSnippet}
                    onChange={(e) => setContentSnippet(e.target.value)}
                    placeholder="Dán các ý chính, công thức hoặc lời thoại của đoạn video..."
                    className="w-full p-3 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
              </div>

              {/* Config Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Types */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Loại câu hỏi
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedTypes.includes('multiple_choice')}
                        onChange={() => handleToggleType('multiple_choice')}
                        className="rounded text-blue-600 focus:ring-blue-500"
                      />
                      <span>Trắc nghiệm (4 lựa chọn)</span>
                    </label>
                    <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedTypes.includes('true_false')}
                        onChange={() => handleToggleType('true_false')}
                        className="rounded text-blue-600 focus:ring-blue-500"
                      />
                      <span>Đúng / Sai</span>
                    </label>
                    <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedTypes.includes('fill_blank')}
                        onChange={() => handleToggleType('fill_blank')}
                        className="rounded text-blue-600 focus:ring-blue-500"
                      />
                      <span>Điền khuyết</span>
                    </label>
                    <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedTypes.includes('short_answer')}
                        onChange={() => handleToggleType('short_answer')}
                        className="rounded text-blue-600 focus:ring-blue-500"
                      />
                      <span>Trả lời ngắn</span>
                    </label>
                  </div>
                </div>

                {/* Count & Difficulty */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Số lượng câu hỏi
                  </label>
                  <div className="flex gap-1.5 mb-4">
                    {[1, 2, 3, 5, 8].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setQuestionCount(n)}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                          questionCount === n
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>

                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Mức độ khó
                  </label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value as any)}
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs outline-none"
                  >
                    <option value="easy">Nhận biết (Dễ hiểu)</option>
                    <option value="medium">Thông hiểu (Vừa phải)</option>
                    <option value="hard">Vận dụng cao (Phân hóa)</option>
                  </select>
                </div>

                {/* Placement & LaTeX */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                      Vị trí đặt trong video
                    </label>
                    <div className="space-y-1.5">
                      <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                        <input
                          type="radio"
                          name="gemini-placement"
                          checked={placement === 'current'}
                          onChange={() => setPlacement('current')}
                          className="text-blue-600 focus:ring-blue-500"
                        />
                        <span>Tại mốc hiện tại ({formatTime(currentTime)})</span>
                      </label>
                      <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                        <input
                          type="radio"
                          name="gemini-placement"
                          checked={placement === 'distributed'}
                          onChange={() => setPlacement('distributed')}
                          className="text-blue-600 focus:ring-blue-500"
                        />
                        <span>Phân bổ đều suốt video ({formatTime(videoDuration)})</span>
                      </label>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200">
                    <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={includeLatex}
                        onChange={(e) => setIncludeLatex(e.target.checked)}
                        className="rounded text-blue-600 focus:ring-blue-500"
                      />
                      <span className="font-medium">Hỗ trợ công thức Toán LaTeX ($...$)</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between bg-blue-50 p-3.5 rounded-xl border border-blue-200 gap-3">
                <div className="flex items-center gap-2 text-xs text-blue-900 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    Đã tạo {generatedQuestions.length} câu hỏi bằng <strong>{currentModelInfo?.name || selectedModel}</strong>. Kiểm tra hoặc chỉnh sửa trước khi chèn vào video.
                  </span>
                </div>
                <button
                  onClick={() => setStep('config')}
                  className="px-3 py-1 bg-white border border-blue-300 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-medium transition-colors shrink-0"
                >
                  Tạo lại
                </button>
              </div>

              <div className="space-y-4">
                {generatedQuestions.map((q, idx) => (
                  <div key={q.id || idx} className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-200 text-slate-700 uppercase">
                          {q.type === 'multiple_choice'
                            ? 'Trắc nghiệm'
                            : q.type === 'true_false'
                            ? 'Đúng/Sai'
                            : q.type === 'fill_blank'
                            ? 'Điền khuyết'
                            : 'Trả lời ngắn'}
                        </span>
                      </div>
                      <button
                        onClick={() => handleDeleteGeneratedQuestion(idx)}
                        className="text-slate-400 hover:text-red-600 p-1 rounded transition-colors"
                        title="Xóa câu hỏi này"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="space-y-2 mb-3">
                      <label className="text-[11px] font-bold text-slate-600 uppercase">Nội dung câu hỏi</label>
                      <textarea
                        rows={2}
                        value={q.text}
                        onChange={(e) => handleUpdateQuestion(idx, 'text', e.target.value)}
                        className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                      {q.text && (
                        <div className="p-2.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 markdown-body">
                          <Markdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                            {q.text}
                          </Markdown>
                        </div>
                      )}
                    </div>

                    {(q.type === 'multiple_choice' || q.type === 'true_false') && (
                      <div className="space-y-2 mb-3">
                        <label className="text-[11px] font-bold text-slate-600 uppercase">
                          Các lựa chọn (Tích chọn đáp án đúng)
                        </label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {q.options.map((opt, optIdx) => (
                            <div key={optIdx} className="flex items-center gap-2 bg-white p-2 border rounded-lg border-slate-300">
                              <input
                                type="radio"
                                name={`gemini-correct-${q.id || idx}`}
                                checked={q.correctAnswerIndex === optIdx}
                                onChange={() => handleUpdateQuestion(idx, 'correctAnswerIndex', optIdx)}
                                className="w-4 h-4 text-blue-600 cursor-pointer shrink-0"
                              />
                              <input
                                type="text"
                                value={opt}
                                onChange={(e) => handleUpdateOption(idx, optIdx, e.target.value)}
                                className="flex-1 text-xs outline-none"
                                placeholder={`Lựa chọn ${optIdx + 1}`}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {(q.type === 'fill_blank' || q.type === 'short_answer') && (
                      <div className="space-y-1 mb-3">
                        <label className="text-[11px] font-bold text-slate-600 uppercase">Đáp án đúng chính xác</label>
                        <input
                          type="text"
                          value={q.correctAnswerText || ''}
                          onChange={(e) => handleUpdateQuestion(idx, 'correctAnswerText', e.target.value)}
                          className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs outline-none"
                          placeholder="Nhập đáp án..."
                        />
                      </div>
                    )}

                    {q.explanation && (
                      <div className="text-[11px] bg-blue-50/70 text-blue-900 p-2 rounded-md border border-blue-100 flex items-start gap-1.5">
                        <span className="font-semibold shrink-0">Giải thích:</span>
                        <span>{q.explanation}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            API Key Gemini được quản lý an toàn ở máy chủ (<strong>Settings &gt; Secrets</strong>).
          </div>

          <div className="flex gap-2">
            <button
              onClick={onClose}
              disabled={isGenerating}
              className="px-4 py-2 text-slate-700 hover:bg-slate-200 rounded-lg text-xs font-semibold transition-colors"
            >
              Hủy
            </button>

            {step === 'config' ? (
              <button
                onClick={handleGenerate}
                disabled={isGenerating || !topic.trim()}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-2 disabled:opacity-50"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Đang tạo bằng Gemini...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Bắt đầu tạo câu hỏi</span>
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={handleApplyToVideo}
                disabled={!hasVideo || generatedQuestions.length === 0}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-2 disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                <span>
                  {hasVideo ? `Chèn ${generatedQuestions.length} câu hỏi vào Video` : 'Hãy tải video lên để chèn'}
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
