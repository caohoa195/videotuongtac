import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Plus, Edit, Eye, Download, Upload, CheckCircle2, XCircle, Trash2, Save, X, FileArchive, Settings, Image as ImageIcon, Sparkles, Cpu, Wand2 } from 'lucide-react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import Markdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

import { DrawingEditorModal } from './components/DrawingEditorModal';
import { OllamaSettingsModal } from './components/OllamaSettingsModal';
import { OllamaQuestionGeneratorModal, FinalQuestionPointToAdd } from './components/OllamaQuestionGeneratorModal';
import { 
  getSavedOllamaSettings, 
  saveOllamaSettings, 
  OllamaSettings, 
  OllamaConnectionResult,
  testOllamaConnection,
  generateDistractorsWithOllama,
  OLLAMA_DEFAULT_MODELS 
} from './services/ollamaService';

type QuestionType = 'multiple_choice' | 'true_false' | 'fill_blank' | 'short_answer';

type Question = {
  id: string;
  type: QuestionType;
  text: string;
  options: string[];
  correctAnswerIndex: number;
  correctAnswerText?: string;
  imageUrl?: string;
};

type QuestionPoint = {
  id: string;
  time: number;
  questions: Question[];
};

export default function App() {
  const [mode, setMode] = useState<'edit' | 'preview' | 'export'>('edit');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [questionPoints, setQuestionPoints] = useState<QuestionPoint[]>([]);

  // Local Ollama State
  const [ollamaSettings, setOllamaSettings] = useState<OllamaSettings>(getSavedOllamaSettings);
  const [isOllamaSettingsOpen, setIsOllamaSettingsOpen] = useState(false);
  const [isOllamaGeneratorOpen, setIsOllamaGeneratorOpen] = useState(false);
  const [generatorForCurrentTimeOnly, setGeneratorForCurrentTimeOnly] = useState(false);
  const [lastConnectionStatus, setLastConnectionStatus] = useState<OllamaConnectionResult | null>(null);
  const [videoDuration, setVideoDuration] = useState(0);
  const [videoCurrentTime, setVideoCurrentTime] = useState(0);

  useEffect(() => {
    testOllamaConnection(ollamaSettings.baseUrl).then(res => {
      setLastConnectionStatus(res);
    }).catch(() => {});
  }, [ollamaSettings.baseUrl]);

  const handleSaveOllamaSettings = (newSettings: OllamaSettings) => {
    setOllamaSettings(newSettings);
    saveOllamaSettings(newSettings);
  };

  const handleApplyGeneratedPoints = (newPoints: FinalQuestionPointToAdd[]) => {
    setQuestionPoints(prev => {
      let updated = [...prev];
      for (const np of newPoints) {
        const existingIdx = updated.findIndex(p => Math.abs(p.time - np.time) < 1.0);
        if (existingIdx >= 0) {
          updated[existingIdx] = {
            ...updated[existingIdx],
            questions: [...updated[existingIdx].questions, ...np.questions],
          };
        } else {
          updated.push({
            id: Date.now().toString() + Math.random().toString(36).substring(2, 7),
            time: np.time,
            questions: np.questions,
          });
        }
      }
      return updated.sort((a, b) => a.time - b.time);
    });
  };

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setVideoFile(file);
      setVideoUrl(URL.createObjectURL(file));
      setQuestionPoints([]);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Header Banner */}
      <header className="bg-indigo-600 text-white shadow-md p-4 flex flex-wrap justify-between items-center gap-3">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Settings className="w-6 h-6" />
          Interactive Video Creator
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          {/* Ollama Local AI Quick Button */}
          <button
            onClick={() => setIsOllamaSettingsOpen(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-md bg-indigo-700 hover:bg-indigo-800 border border-indigo-400/50 text-xs font-semibold text-white transition-all shadow-xs"
            title="Cài đặt & kiểm tra mô hình Ollama cục bộ"
          >
            <span className="text-base">🦙</span>
            <span className="hidden sm:inline">Ollama AI:</span>
            <span className="font-mono bg-indigo-950/60 px-1.5 py-0.5 rounded text-[11px] max-w-[140px] truncate">
              {ollamaSettings.selectedModelTag}
            </span>
            <span 
              className={`w-2 h-2 rounded-full ${lastConnectionStatus?.connected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} 
              title={lastConnectionStatus?.connected ? 'Đã kết nối Ollama' : 'Chưa kết nối Ollama'}
            />
          </button>

          <button
            onClick={() => setMode('edit')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
              mode === 'edit' ? 'bg-indigo-800' : 'hover:bg-indigo-500'
            }`}
          >
            <Edit className="w-4 h-4" />
            Chỉnh sửa
          </button>
          <button
            onClick={() => setMode('preview')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
              mode === 'preview' ? 'bg-indigo-800' : 'hover:bg-indigo-500'
            }`}
            disabled={!videoUrl}
          >
            <Eye className="w-4 h-4" />
            Xem trước
          </button>
          <button
            onClick={() => setMode('export')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
              mode === 'export' ? 'bg-indigo-800' : 'hover:bg-indigo-500'
            }`}
            disabled={!videoUrl}
          >
            <Download className="w-4 h-4" />
            Xuất file
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6 flex flex-col items-center">
        {!videoUrl ? (
          <div className="flex-1 flex flex-col items-center justify-center w-full max-w-2xl">
            <div className="bg-white p-12 rounded-2xl shadow-sm border border-slate-200 w-full text-center flex flex-col items-center gap-4">
              <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600">
                <Upload className="w-10 h-10" />
              </div>
              <h2 className="text-2xl font-semibold text-slate-800">Tải lên video của bạn</h2>
              <p className="text-slate-500">Hỗ trợ mọi định dạng video phổ biến (MP4, WebM, OGG)</p>
              <label className="mt-4 cursor-pointer bg-indigo-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-indigo-700 transition-colors">
                Chọn Video
                <input type="file" accept="video/*" className="hidden" onChange={handleVideoUpload} />
              </label>
            </div>
          </div>
        ) : (
          <div className="w-full max-w-5xl flex flex-col gap-6">
            {mode === 'edit' && (
              <EditMode
                videoUrl={videoUrl}
                questionPoints={questionPoints}
                setQuestionPoints={setQuestionPoints}
                ollamaSettings={ollamaSettings}
                onOpenOllamaGenerator={(forCurrentTime?: boolean) => {
                  setGeneratorForCurrentTimeOnly(!!forCurrentTime);
                  setIsOllamaGeneratorOpen(true);
                }}
                onOpenOllamaSettings={() => setIsOllamaSettingsOpen(true)}
                onTimeUpdate={(time) => setVideoCurrentTime(time)}
                onDurationLoaded={(dur) => setVideoDuration(dur)}
              />
            )}
            {mode === 'preview' && (
              <PreviewMode
                videoUrl={videoUrl}
                questionPoints={questionPoints}
              />
            )}
            {mode === 'export' && (
              <ExportMode
                videoFile={videoFile}
                questionPoints={questionPoints}
              />
            )}
          </div>
        )}
      </main>

      {/* Ollama Settings Modal */}
      <OllamaSettingsModal
        isOpen={isOllamaSettingsOpen}
        onClose={() => setIsOllamaSettingsOpen(false)}
        settings={ollamaSettings}
        onSave={handleSaveOllamaSettings}
        lastConnectionStatus={lastConnectionStatus}
        setLastConnectionStatus={setLastConnectionStatus}
      />

      {/* Ollama Question Generator Modal */}
      <OllamaQuestionGeneratorModal
        isOpen={isOllamaGeneratorOpen}
        onClose={() => setIsOllamaGeneratorOpen(false)}
        settings={ollamaSettings}
        onOpenSettings={() => {
          setIsOllamaGeneratorOpen(false);
          setIsOllamaSettingsOpen(true);
        }}
        videoDuration={videoDuration}
        currentTime={videoCurrentTime}
        insertDirectlyToCurrentPoint={generatorForCurrentTimeOnly}
        onApplyQuestions={handleApplyGeneratedPoints}
      />
    </div>
  );
}

// --- EDIT MODE COMPONENT ---
function EditMode({
  videoUrl,
  questionPoints,
  setQuestionPoints,
  ollamaSettings,
  onOpenOllamaGenerator,
  onOpenOllamaSettings,
  onTimeUpdate,
  onDurationLoaded,
}: {
  videoUrl: string;
  questionPoints: QuestionPoint[];
  setQuestionPoints: React.Dispatch<React.SetStateAction<QuestionPoint[]>>;
  ollamaSettings: OllamaSettings;
  onOpenOllamaGenerator: (forCurrentTime?: boolean) => void;
  onOpenOllamaSettings: () => void;
  onTimeUpdate?: (time: number) => void;
  onDurationLoaded?: (duration: number) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showQuestionEditor, setShowQuestionEditor] = useState(false);
  const [editingPointId, setEditingPointId] = useState<string | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      onTimeUpdate?.(video.currentTime);
    };
    const handleLoadedMetadata = () => {
      setDuration(video.duration);
      onDurationLoaded?.(video.duration);
    };
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
    };
  }, [onTimeUpdate, onDurationLoaded]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) videoRef.current.pause();
      else videoRef.current.play();
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
      onTimeUpdate?.(time);
    }
  };

  const handleAddQuestionClick = () => {
    if (videoRef.current) {
      videoRef.current.pause();
    }
    setEditingPointId(null);
    setShowQuestionEditor(true);
  };

  const handleEditPoint = (id: string) => {
    if (videoRef.current) {
      videoRef.current.pause();
    }
    setEditingPointId(id);
    setShowQuestionEditor(true);
  };

  const handleDeletePoint = (id: string) => {
    setQuestionPoints((prev) => prev.filter((p) => p.id !== id));
  };

  const formatTime = (time: number) => {
    const m = Math.floor(time / 60);
    const s = Math.floor(time % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="bg-black rounded-xl overflow-hidden shadow-lg relative group">
        <video
          ref={videoRef}
          src={videoUrl}
          className="w-full max-h-[60vh] object-contain"
          onClick={togglePlay}
        />
        
        {/* Controls Overlay */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="flex items-center gap-4 text-white mb-2">
            <button onClick={togglePlay} className="hover:text-indigo-400">
              {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
            </button>
            <span className="text-sm font-mono">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
            
            <div className="flex-1 relative flex items-center">
              <input
                type="range"
                min={0}
                max={duration || 100}
                value={currentTime}
                onChange={handleSeek}
                className="w-full h-2 bg-white/30 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
              {/* Markers */}
              {questionPoints.map((point) => (
                <div
                  key={point.id}
                  className="absolute w-3 h-3 bg-yellow-400 rounded-full cursor-pointer transform -translate-x-1/2 -translate-y-1/2 top-1/2 hover:scale-150 transition-transform"
                  style={{ left: `${(point.time / duration) * 100}%` }}
                  onClick={() => handleEditPoint(point.id)}
                  title={`Câu hỏi tại ${formatTime(point.time)}`}
                />
              ))}
            </div>

            {/* Quick AI Question at current time */}
            <button
              onClick={() => onOpenOllamaGenerator(true)}
              className="flex items-center gap-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 px-3 py-1.5 rounded-md text-sm font-semibold text-white transition-all shadow-sm"
              title="Tự động tạo câu hỏi tại thời điểm này bằng AI Ollama"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              AI Ollama
            </button>

            <button
              onClick={handleAddQuestionClick}
              className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-500 px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              Thêm câu hỏi
            </button>
          </div>
        </div>
      </div>

      {/* Ollama Local AI Quick Action Card */}
      <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-900 text-white rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 border border-indigo-500/30">
        <div className="flex items-center gap-3.5 w-full sm:w-auto">
          <div className="w-11 h-11 rounded-xl bg-indigo-500/20 flex items-center justify-center text-2xl shrink-0 border border-indigo-400/30">
            🦙
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-sm font-bold text-white">Trợ lý AI Ollama Cục bộ</h4>
              <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                {ollamaSettings.selectedModelTag}
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Hỗ trợ 4 mô hình: <strong>Qwen3.6 35B-A3B (Q4)</strong>, <strong>Gemma 4 12B</strong>, <strong>qwen2.5-coder:7b</strong>, <strong>gemma4:e4b</strong>. Tự động sinh câu hỏi và công thức Toán LaTeX ($...$).
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end shrink-0">
          <button
            onClick={() => onOpenOllamaSettings()}
            className="px-3.5 py-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5"
          >
            <Settings className="w-3.5 h-3.5 text-indigo-300" />
            Cài đặt Model
          </button>
          <button
            onClick={() => onOpenOllamaGenerator(false)}
            className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white font-bold rounded-lg text-xs transition-all shadow-md flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            Tạo bộ câu hỏi AI
          </button>
        </div>
      </div>

      {/* List of Question Points */}
      {questionPoints.length > 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-800">Các điểm dừng câu hỏi ({questionPoints.length})</h3>
            <button
              onClick={() => onOpenOllamaGenerator(false)}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 hover:underline"
            >
              <Sparkles className="w-3.5 h-3.5" /> Thêm câu hỏi với Ollama
            </button>
          </div>
          <div className="grid gap-3">
            {questionPoints.sort((a, b) => a.time - b.time).map((point) => (
              <div key={point.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100 hover:border-indigo-100 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="bg-indigo-100 text-indigo-700 px-2 py-1 rounded font-mono text-sm font-semibold">
                    {formatTime(point.time)}
                  </div>
                  <div className="text-slate-700 text-sm">
                    {point.questions.length} câu hỏi
                    <span className="text-xs text-slate-400 ml-2">
                      ({point.questions.map(q => q.type === 'multiple_choice' ? 'Trắc nghiệm' : q.type === 'true_false' ? 'Đúng/Sai' : 'Điền khuyết').join(', ')})
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      if (videoRef.current) videoRef.current.currentTime = point.time;
                    }}
                    className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                    title="Đi tới thời điểm này"
                  >
                    <Play className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleEditPoint(point.id)}
                    className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                    title="Chỉnh sửa"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeletePoint(point.id)}
                    className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                    title="Xóa"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center flex flex-col items-center">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mb-3">
            <Sparkles className="w-6 h-6 text-indigo-600" />
          </div>
          <h3 className="font-bold text-slate-800 text-base mb-1">Chưa có điểm dừng câu hỏi nào</h3>
          <p className="text-slate-500 text-xs max-w-md mb-4 leading-relaxed">
            Bạn có thể tua video đến thời điểm mong muốn rồi bấm <strong>"Thêm câu hỏi"</strong> để tạo thủ công, hoặc bấm <strong>"Tạo bộ câu hỏi AI"</strong> để Ollama tự động phân tích và sinh câu hỏi tương tác.
          </p>
          <div className="flex gap-3">
            <button
              onClick={handleAddQuestionClick}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Thêm thủ công
            </button>
            <button
              onClick={() => onOpenOllamaGenerator(false)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <Sparkles className="w-4 h-4 text-amber-300" /> Tạo tự động bằng Ollama
            </button>
          </div>
        </div>
      )}

      {showQuestionEditor && (
        <QuestionEditor
          currentTime={currentTime}
          existingPoint={editingPointId ? questionPoints.find(p => p.id === editingPointId) : undefined}
          ollamaSettings={ollamaSettings}
          onOpenOllamaGenerator={() => {
            setShowQuestionEditor(false);
            onOpenOllamaGenerator(true);
          }}
          onSave={(point) => {
            setQuestionPoints(prev => {
              if (editingPointId) {
                return prev.map(p => p.id === editingPointId ? point : p);
              }
              return [...prev, point];
            });
            setShowQuestionEditor(false);
          }}
          onClose={() => setShowQuestionEditor(false)}
        />
      )}
    </div>
  );
}

import { MathEditorModal } from './components/MathEditorModal';

// --- QUESTION EDITOR COMPONENT ---
function QuestionEditor({
  currentTime,
  existingPoint,
  onSave,
  onClose,
  ollamaSettings,
  onOpenOllamaGenerator,
}: {
  currentTime: number;
  existingPoint?: QuestionPoint;
  onSave: (point: QuestionPoint) => void;
  onClose: () => void;
  ollamaSettings?: OllamaSettings;
  onOpenOllamaGenerator?: () => void;
}) {
  const [questions, setQuestions] = useState<Question[]>(
    existingPoint?.questions || [
      { id: Date.now().toString(), type: 'multiple_choice', text: '', options: ['', '', '', ''], correctAnswerIndex: 0 }
    ]
  );
  const [error, setError] = useState<string | null>(null);
  const [activeMathInput, setActiveMathInput] = useState<{ id: string, field: 'text' | 'correctAnswerText' | 'option', optIndex?: number } | null>(null);
  const [activeDrawingInput, setActiveDrawingInput] = useState<string | null>(null);
  const [isGeneratingDistractorsForId, setIsGeneratingDistractorsForId] = useState<string | null>(null);

  const handleGenerateDistractors = async (qId: string) => {
    if (!ollamaSettings) return;
    const q = questions.find(item => item.id === qId);
    if (!q || !q.text.trim()) {
      setError('Vui lòng nhập nội dung câu hỏi trước để Ollama sinh phương án nhiễu.');
      return;
    }
    const correctAnswer = q.options[q.correctAnswerIndex]?.trim() || q.options[0]?.trim();
    if (!correctAnswer) {
      setError('Vui lòng nhập đáp án đúng trước để Ollama dựa vào đó sinh đáp án gây nhiễu.');
      return;
    }

    setIsGeneratingDistractorsForId(qId);
    setError(null);
    try {
      const distractors = await generateDistractorsWithOllama(ollamaSettings, q.text, correctAnswer);
      setQuestions(prev => prev.map(item => {
        if (item.id === qId) {
          const newOpts = [...item.options];
          let dIdx = 0;
          for (let i = 0; i < newOpts.length; i++) {
            if (i !== item.correctAnswerIndex && dIdx < distractors.length) {
              newOpts[i] = distractors[dIdx++];
            }
          }
          return { ...item, options: newOpts };
        }
        return item;
      }));
    } catch (err: any) {
      setError('Không thể tạo phương án với Ollama: ' + (err?.message || 'Lỗi không xác định'));
    } finally {
      setIsGeneratingDistractorsForId(null);
    }
  };

  const handleAddQuestion = () => {
    if (questions.length >= 10) return;
    setQuestions([...questions, { id: Date.now().toString(), type: 'multiple_choice', text: '', options: ['', '', '', ''], correctAnswerIndex: 0 }]);
  };

  const handleRemoveQuestion = (id: string) => {
    setQuestions(questions.filter(q => q.id !== id));
  };

  const handleUpdateQuestion = (id: string, field: keyof Question, value: any) => {
    setQuestions(questions.map(q => {
      if (q.id === id) {
        const updated = { ...q, [field]: value };
        // Reset specific fields when type changes
        if (field === 'type') {
          if (value === 'multiple_choice') {
            updated.options = ['', '', '', ''];
            updated.correctAnswerIndex = 0;
          } else if (value === 'true_false') {
            updated.options = ['Đúng', 'Sai'];
            updated.correctAnswerIndex = 0;
          } else {
            updated.options = [];
            updated.correctAnswerText = '';
          }
        }
        return updated;
      }
      return q;
    }));
    setError(null);
  };

  const handleUpdateOption = (qId: string, optIndex: number, value: string) => {
    setQuestions(questions.map(q => {
      if (q.id === qId) {
        const newOptions = [...q.options];
        newOptions[optIndex] = value;
        return { ...q, options: newOptions };
      }
      return q;
    }));
    setError(null);
  };

  const handleSave = () => {
    // Basic validation
    for (const q of questions) {
      if (!q.text.trim()) {
        setError('Vui lòng nhập nội dung câu hỏi.');
        return;
      }
      if (q.type === 'multiple_choice' && q.options.some(opt => !opt.trim())) {
        setError('Vui lòng nhập đầy đủ các lựa chọn.');
        return;
      }
      if ((q.type === 'fill_blank' || q.type === 'short_answer') && (!q.correctAnswerText || !q.correctAnswerText.trim())) {
        setError('Vui lòng nhập đáp án đúng.');
        return;
      }
    }

    onSave({
      id: existingPoint?.id || Date.now().toString(),
      time: existingPoint?.time ?? currentTime,
      questions,
    });
  };

  const formatTime = (time: number) => {
    const m = Math.floor(time / 60);
    const s = Math.floor(time % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-800">
              {existingPoint ? 'Chỉnh sửa câu hỏi' : 'Thêm câu hỏi mới'} tại {formatTime(existingPoint?.time ?? currentTime)}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {onOpenOllamaGenerator && (
              <button
                type="button"
                onClick={onOpenOllamaGenerator}
                className="text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
                title="Sử dụng Ollama để tạo câu hỏi tự động tại đây"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span>Ollama AI tạo nhanh</span>
              </button>
            )}
            <button onClick={onClose} className="text-slate-500 hover:text-slate-800 p-1 rounded-md hover:bg-slate-200 transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg border border-red-200 font-medium text-sm">
              {error}
            </div>
          )}
          {questions.map((q, index) => (
            <div key={q.id} className="bg-slate-50 p-5 rounded-xl border border-slate-200 relative">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-slate-700">Câu hỏi {index + 1}</h3>
                {questions.length > 1 && (
                  <button onClick={() => handleRemoveQuestion(q.id)} className="text-red-500 hover:text-red-700 text-sm flex items-center gap-1">
                    <Trash2 className="w-4 h-4" /> Xóa
                  </button>
                )}
              </div>
              
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="w-1/3">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Loại câu hỏi</label>
                    <select
                      value={q.type || 'multiple_choice'}
                      onChange={(e) => handleUpdateQuestion(q.id, 'type', e.target.value as QuestionType)}
                      className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white"
                    >
                      <option value="multiple_choice">Trắc nghiệm nhiều lựa chọn</option>
                      <option value="true_false">Đúng / Sai</option>
                      <option value="fill_blank">Điền khuyết</option>
                      <option value="short_answer">Trả lời ngắn</option>
                    </select>
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-sm font-medium text-slate-700">Nội dung câu hỏi (Hỗ trợ Markdown & LaTeX với $...$)</label>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => setActiveDrawingInput(q.id)}
                          className="text-xs bg-indigo-50 text-indigo-600 px-2 py-1 rounded hover:bg-indigo-100 font-medium flex items-center gap-1"
                        >
                          <ImageIcon className="w-3 h-3" /> + Vẽ hình
                        </button>
                        <button 
                          onClick={() => setActiveMathInput({ id: q.id, field: 'text' })}
                          className="text-xs bg-indigo-50 text-indigo-600 px-2 py-1 rounded hover:bg-indigo-100 font-medium"
                        >
                          + Bàn phím Toán
                        </button>
                      </div>
                    </div>
                    <textarea
                      value={q.text}
                      onChange={(e) => handleUpdateQuestion(q.id, 'text', e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none min-h-[80px]"
                      placeholder="Nhập câu hỏi..."
                    />
                    {q.imageUrl && (
                      <div className="mt-2 relative group w-fit">
                        <img src={q.imageUrl} alt="Drawing" className="max-h-48 rounded border border-slate-200 bg-white shadow-sm" />
                        <button 
                          onClick={() => handleUpdateQuestion(q.id, 'imageUrl', undefined)}
                          className="absolute -top-2 -right-2 bg-red-600 text-white p-1.5 rounded-full shadow-md hover:bg-red-700 transition-colors z-10"
                          title="Xóa hình vẽ"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                    {q.text && (
                      <div className="mt-2 p-3 bg-white border border-slate-200 rounded-md text-sm text-slate-800 markdown-body">
                        <Markdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                          {q.text}
                        </Markdown>
                      </div>
                    )}
                  </div>
                </div>

                {q.type === 'multiple_choice' && (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="block text-sm font-medium text-slate-700">Các lựa chọn (Chọn đáp án đúng)</label>
                      {ollamaSettings && (
                        <button
                          type="button"
                          disabled={isGeneratingDistractorsForId === q.id}
                          onClick={() => handleGenerateDistractors(q.id)}
                          className="text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-2.5 py-1 rounded-md font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                          title="Dùng mô hình Ollama đang chọn để tự sinh 3 phương án sai"
                        >
                          <Sparkles className={`w-3.5 h-3.5 text-indigo-600 ${isGeneratingDistractorsForId === q.id ? 'animate-spin' : ''}`} />
                          {isGeneratingDistractorsForId === q.id ? 'Đang suy luận...' : 'Ollama: Tạo 3 đáp án nhiễu'}
                        </button>
                      )}
                    </div>
                    {q.options.map((opt, optIndex) => (
                      <div key={optIndex} className="flex items-center gap-3">
                        <input
                          type="radio"
                          name={`correct-${q.id}`}
                          checked={q.correctAnswerIndex === optIndex}
                          onChange={() => handleUpdateQuestion(q.id, 'correctAnswerIndex', optIndex)}
                          className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                        <div className="flex-1 space-y-2">
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={opt}
                              onChange={(e) => handleUpdateOption(q.id, optIndex, e.target.value)}
                              className={`flex-1 p-2 border rounded-md outline-none focus:ring-2 focus:ring-indigo-500 ${
                                q.correctAnswerIndex === optIndex ? 'border-indigo-500 bg-indigo-50' : 'border-slate-300'
                              }`}
                              placeholder={`Lựa chọn ${optIndex + 1} (Hỗ trợ LaTeX)`}
                            />
                            <button 
                              onClick={() => setActiveMathInput({ id: q.id, field: 'option', optIndex })}
                              className="px-3 py-2 bg-slate-100 text-slate-600 rounded-md hover:bg-slate-200 text-sm font-medium shrink-0"
                              title="Bàn phím Toán học"
                            >
                              Toán
                            </button>
                          </div>
                          {opt && (
                            <div className="p-2 bg-white border border-slate-200 rounded-md text-sm text-slate-800 markdown-body min-h-[2.5rem]">
                              <Markdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                                {opt}
                              </Markdown>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {q.type === 'true_false' && (
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-700">Chọn đáp án đúng</label>
                    <div className="flex gap-4">
                      {q.options.map((opt, optIndex) => (
                        <label key={optIndex} className={`flex-1 flex items-center justify-center gap-2 p-3 border rounded-md cursor-pointer transition-colors ${
                          q.correctAnswerIndex === optIndex ? 'border-indigo-500 bg-indigo-50 text-indigo-700 font-medium' : 'border-slate-300 hover:bg-slate-50'
                        }`}>
                          <input
                            type="radio"
                            name={`correct-${q.id}`}
                            checked={q.correctAnswerIndex === optIndex}
                            onChange={() => handleUpdateQuestion(q.id, 'correctAnswerIndex', optIndex)}
                            className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                          />
                          {opt}
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {(q.type === 'fill_blank' || q.type === 'short_answer') && (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="block text-sm font-medium text-slate-700">Đáp án đúng (Hỗ trợ LaTeX)</label>
                      <button 
                        onClick={() => setActiveMathInput({ id: q.id, field: 'correctAnswerText' })}
                        className="text-xs bg-indigo-50 text-indigo-600 px-2 py-1 rounded hover:bg-indigo-100 font-medium"
                      >
                        + Bàn phím Toán
                      </button>
                    </div>
                    <input
                      type="text"
                      value={q.correctAnswerText || ''}
                      onChange={(e) => handleUpdateQuestion(q.id, 'correctAnswerText', e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                      placeholder="Nhập đáp án đúng..."
                    />
                    {q.correctAnswerText && (
                      <div className="p-2 bg-white border border-slate-200 rounded-md text-sm text-slate-800 markdown-body min-h-[2.5rem]">
                        <Markdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                          {q.correctAnswerText}
                        </Markdown>
                      </div>
                    )}
                    <p className="text-xs text-slate-500">Học viên cần nhập chính xác (không phân biệt hoa thường) để vượt qua.</p>
                  </div>
                )}
              </div>
            </div>
          ))}

          {questions.length < 10 && (
            <button
              onClick={handleAddQuestion}
              className="w-full py-3 border-2 border-dashed border-slate-300 rounded-xl text-slate-600 font-medium hover:border-indigo-500 hover:text-indigo-600 transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Thêm câu hỏi khác (Tối đa 10)
            </button>
          )}
        </div>

        <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-md font-medium transition-colors">
            Hủy
          </button>
          <button onClick={handleSave} className="px-6 py-2 bg-indigo-600 text-white rounded-md font-medium hover:bg-indigo-700 transition-colors flex items-center gap-2">
            <Save className="w-4 h-4" />
            Lưu câu hỏi
          </button>
        </div>
      </div>

      <MathEditorModal
        isOpen={!!activeMathInput}
        onClose={() => setActiveMathInput(null)}
        onInsert={(latex) => {
          if (!activeMathInput) return;
          
          const { id, field, optIndex } = activeMathInput;
          const q = questions.find(q => q.id === id);
          if (!q) return;

          if (field === 'text') {
            handleUpdateQuestion(id, 'text', q.text + (q.text && !q.text.endsWith(' ') ? ' ' : '') + latex);
          } else if (field === 'correctAnswerText') {
            handleUpdateQuestion(id, 'correctAnswerText', (q.correctAnswerText || '') + ((q.correctAnswerText && !q.correctAnswerText.endsWith(' ')) ? ' ' : '') + latex);
          } else if (field === 'option' && optIndex !== undefined) {
            handleUpdateOption(id, optIndex, q.options[optIndex] + (q.options[optIndex] && !q.options[optIndex].endsWith(' ') ? ' ' : '') + latex);
          }
        }}
      />
      <DrawingEditorModal
        isOpen={!!activeDrawingInput}
        onClose={() => setActiveDrawingInput(null)}
        onInsert={(imageData) => {
          if (activeDrawingInput) {
            handleUpdateQuestion(activeDrawingInput, 'imageUrl', imageData);
          }
        }}
      />
    </div>
  );
}

// --- PREVIEW MODE COMPONENT ---
function PreviewMode({
  videoUrl,
  questionPoints,
}: {
  videoUrl: string;
  questionPoints: QuestionPoint[];
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [activePoint, setActivePoint] = useState<QuestionPoint | null>(null);
  const [answeredPoints, setAnsweredPoints] = useState<Set<string>>(new Set());
  
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [textAnswer, setTextAnswer] = useState<string>('');
  const [showError, setShowError] = useState(false);
  const [activeMathInput, setActiveMathInput] = useState<boolean>(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      const time = video.currentTime;
      setCurrentTime(time);

      // Check for question points
      const point = questionPoints.find(p => 
        !answeredPoints.has(p.id) && 
        time >= p.time && 
        time < p.time + 1 // 1 second window
      );

      if (point && !activePoint) {
        video.pause();
        setActivePoint(point);
        setCurrentQuestionIndex(0);
        setSelectedAnswer(null);
        setTextAnswer('');
        setShowError(false);
      }
    };

    const handleLoadedMetadata = () => setDuration(video.duration);
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    // Prevent seeking forward past unanswered questions
    const handleSeeking = () => {
      const nextUnansweredPoint = questionPoints
        .filter(p => !answeredPoints.has(p.id))
        .sort((a, b) => a.time - b.time)[0];
        
      const maxAllowedTime = nextUnansweredPoint ? nextUnansweredPoint.time : video.duration;

      if (video.currentTime > maxAllowedTime + 0.5) {
        video.currentTime = maxAllowedTime;
      }
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('seeking', handleSeeking);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('seeking', handleSeeking);
    };
  }, [questionPoints, answeredPoints, activePoint]);

  const togglePlay = () => {
    if (activePoint) return; // Cannot play while answering questions
    if (videoRef.current) {
      if (isPlaying) videoRef.current.pause();
      else videoRef.current.play();
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (activePoint) return;
    const time = parseFloat(e.target.value);
    
    const nextUnansweredPoint = questionPoints
      .filter(p => !answeredPoints.has(p.id))
      .sort((a, b) => a.time - b.time)[0];
      
    const maxAllowedTime = nextUnansweredPoint ? nextUnansweredPoint.time : duration;

    // Only allow seeking up to maxAllowedTime
    if (time <= maxAllowedTime) {
      if (videoRef.current) {
        videoRef.current.currentTime = time;
        setCurrentTime(time);
      }
    } else {
      if (videoRef.current) {
        videoRef.current.currentTime = maxAllowedTime;
        setCurrentTime(maxAllowedTime);
      }
    }
  };

  const handleAnswerSubmit = () => {
    if (!activePoint) return;

    const currentQuestion = activePoint.questions[currentQuestionIndex];
    let isCorrect = false;

    if (currentQuestion.type === 'multiple_choice' || currentQuestion.type === 'true_false') {
      if (selectedAnswer === null) return;
      isCorrect = selectedAnswer === currentQuestion.correctAnswerIndex;
    } else if (currentQuestion.type === 'fill_blank' || currentQuestion.type === 'short_answer') {
      if (!textAnswer.trim()) return;
      isCorrect = textAnswer.trim().toLowerCase() === (currentQuestion.correctAnswerText || '').trim().toLowerCase();
    }

    if (isCorrect) {
      // Correct answer
      setShowError(false);
      if (currentQuestionIndex < activePoint.questions.length - 1) {
        // Next question
        setCurrentQuestionIndex(prev => prev + 1);
        setSelectedAnswer(null);
        setTextAnswer('');
      } else {
        // All questions answered correctly
        setAnsweredPoints(prev => new Set(prev).add(activePoint.id));
        setActivePoint(null);
        if (videoRef.current) {
          videoRef.current.play();
        }
      }
    } else {
      // Wrong answer
      setShowError(true);
    }
  };

  const formatTime = (time: number) => {
    const m = Math.floor(time / 60);
    const s = Math.floor(time % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-black rounded-xl overflow-hidden shadow-lg relative group">
        <video
          ref={videoRef}
          src={videoUrl}
          className="w-full max-h-[70vh] object-contain"
          onClick={togglePlay}
        />
        
        {/* Controls Overlay */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="flex items-center gap-4 text-white">
            <button onClick={togglePlay} className="hover:text-indigo-400" disabled={!!activePoint}>
              {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
            </button>
            <span className="text-sm font-mono">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
            
            <div className="flex-1 relative flex items-center">
              <input
                type="range"
                min={0}
                max={duration || 100}
                value={currentTime}
                onChange={handleSeek}
                className="w-full h-2 bg-white/30 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
              {/* Progress Bar Fill for allowed seek area */}
              <div 
                className="absolute left-0 h-2 bg-indigo-500/30 rounded-l-lg pointer-events-none"
                style={{ width: `${((questionPoints.filter(p => !answeredPoints.has(p.id)).sort((a, b) => a.time - b.time)[0]?.time ?? duration) / duration) * 100}%` }}
              />
              {/* Markers */}
              {questionPoints.map((point) => (
                <div
                  key={point.id}
                  className={`absolute w-3 h-3 rounded-full transform -translate-x-1/2 -translate-y-1/2 top-1/2 ${
                    answeredPoints.has(point.id) ? 'bg-green-400' : 'bg-yellow-400'
                  }`}
                  style={{ left: `${(point.time / duration) * 100}%` }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Question Overlay */}
        {activePoint && (
          <div className="absolute inset-0 bg-black/80 flex items-center justify-center p-6 z-10">
            <div className="bg-white rounded-2xl p-8 max-w-2xl w-full shadow-2xl animate-in fade-in zoom-in duration-200">
              <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-semibold text-indigo-600 uppercase tracking-wider">
                    Câu hỏi {currentQuestionIndex + 1} / {activePoint.questions.length}
                  </span>
                  <span className="text-xs text-slate-500">Bắt buộc trả lời đúng để tiếp tục</span>
                </div>
                <div className="text-2xl font-bold text-slate-800 markdown-body">
                  <Markdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                    {activePoint.questions[currentQuestionIndex].text}
                  </Markdown>
                </div>
                {activePoint.questions[currentQuestionIndex].imageUrl && (
                  <div className="mt-4 flex justify-center">
                    <img 
                      src={activePoint.questions[currentQuestionIndex].imageUrl} 
                      alt="Question diagram" 
                      className="max-h-64 rounded-xl shadow-sm border border-slate-200"
                    />
                  </div>
                )}
              </div>

              <div className="space-y-3 mb-8">
                {(activePoint.questions[currentQuestionIndex].type === 'multiple_choice' || activePoint.questions[currentQuestionIndex].type === 'true_false') && activePoint.questions[currentQuestionIndex].options.map((opt, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setSelectedAnswer(idx);
                      setShowError(false);
                    }}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                      selectedAnswer === idx
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-900'
                        : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="markdown-body">
                      <Markdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                        {opt}
                      </Markdown>
                    </div>
                  </button>
                ))}
                
                {(activePoint.questions[currentQuestionIndex].type === 'fill_blank' || activePoint.questions[currentQuestionIndex].type === 'short_answer') && (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-sm font-medium text-slate-700">Câu trả lời của bạn</label>
                      <button 
                        onClick={() => setActiveMathInput(true)}
                        className="text-xs bg-indigo-50 text-indigo-600 px-2 py-1 rounded hover:bg-indigo-100 font-medium"
                      >
                        + Bàn phím Toán
                      </button>
                    </div>
                    <input
                      type="text"
                      value={textAnswer}
                      onChange={(e) => {
                        setTextAnswer(e.target.value);
                        setShowError(false);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleAnswerSubmit();
                        }
                      }}
                      className="w-full p-4 border-2 border-slate-300 rounded-xl focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500 outline-none text-lg"
                      placeholder="Nhập câu trả lời của bạn (hỗ trợ LaTeX với $...$)..."
                      autoFocus
                    />
                    {textAnswer && (
                      <div className="mt-2 p-3 bg-slate-50 border border-slate-200 rounded-lg min-h-[3rem] text-slate-800 markdown-body">
                        <Markdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                          {textAnswer}
                        </Markdown>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {showError && (
                <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg flex items-center gap-2 animate-in slide-in-from-top-2">
                  <XCircle className="w-5 h-5" />
                  <span>Câu trả lời chưa chính xác. Vui lòng thử lại!</span>
                </div>
              )}

              <button
                onClick={handleAnswerSubmit}
                disabled={(activePoint.questions[currentQuestionIndex].type === 'multiple_choice' || activePoint.questions[currentQuestionIndex].type === 'true_false') ? selectedAnswer === null : !textAnswer.trim()}
                className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold text-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                Xác nhận
                <CheckCircle2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>
      
      <div className="bg-blue-50 text-blue-800 p-4 rounded-lg flex items-start gap-3 text-sm">
        <Eye className="w-5 h-5 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold mb-1">Chế độ xem trước</p>
          <p>Người xem có thể tua tự do tới trước câu hỏi. Khi đến điểm có câu hỏi, video sẽ tự động dừng và bắt buộc người xem phải trả lời đúng tất cả câu hỏi để tiếp tục xem phần tiếp theo.</p>
        </div>
      </div>

      <MathEditorModal
        isOpen={activeMathInput}
        onClose={() => setActiveMathInput(false)}
        onInsert={(latex) => {
          setTextAnswer(prev => prev + (prev && !prev.endsWith(' ') ? ' ' : '') + latex);
          setShowError(false);
        }}
      />
    </div>
  );
}

// --- EXPORT MODE COMPONENT ---
function ExportMode({
  videoFile,
  questionPoints,
}: {
  videoFile: File | null;
  questionPoints: QuestionPoint[];
}) {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateHTML5 = async (format: 'html5' | 'scorm12' | 'scorm2004') => {
    if (!videoFile) return;
    setIsExporting(true);
    setError(null);

    try {
      const zip = new JSZip();
      
      // 1. Add Video File
      zip.file(`media/${videoFile.name}`, videoFile);

      // 2. Add Data JSON
      const dataJson = JSON.stringify({
        videoSrc: `media/${videoFile.name}`,
        questionPoints: questionPoints,
      }, null, 2);
      zip.file('data.js', `window.INTERACTIVE_DATA = ${dataJson};`);

      // 3. Add Player HTML
      const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Interactive Video</title>
    <!-- KaTeX CSS -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css" crossorigin="anonymous">
    <!-- Marked and KaTeX scripts for Markdown and Math rendering -->
    <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js" crossorigin="anonymous"></script>
    <script src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js" crossorigin="anonymous"></script>
    <script defer src="https://unpkg.com/mathlive"></script>
    <style>
        body { margin: 0; font-family: system-ui, sans-serif; background: #0f172a; color: white; display: flex; justify-content: center; align-items: center; min-height: 100vh; overflow: hidden; }
        #player-container { position: relative; width: 100%; max-width: 1200px; aspect-ratio: 16/9; background: #000; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); }
        video { width: 100%; height: 100%; object-fit: contain; }
        #overlay { display: none; position: absolute; inset: 0; background: rgba(0,0,0,0.9); z-index: 10; flex-direction: column; justify-content: center; align-items: center; padding: 2rem; }
        .question-box { background: white; color: #0f172a; padding: 2rem; border-radius: 1rem; width: 100%; max-width: 600px; }
        .options { display: flex; flex-direction: column; gap: 1rem; margin-top: 1.5rem; }
        .option-btn { padding: 1rem; border: 2px solid #e2e8f0; border-radius: 0.5rem; background: transparent; cursor: pointer; text-align: left; font-size: 1rem; transition: all 0.2s; }
        .option-btn:hover { border-color: #6366f1; background: #e0e7ff; }
        .option-btn.selected { border-color: #4f46e5; background: #e0e7ff; }
        .text-input { width: 100%; padding: 1rem; border: 2px solid #e2e8f0; border-radius: 0.5rem; font-size: 1rem; outline: none; box-sizing: border-box; }
        .text-input:focus { border-color: #4f46e5; }
        .submit-btn { margin-top: 1.5rem; width: 100%; padding: 1rem; background: #4f46e5; color: white; border: none; border-radius: 0.5rem; font-size: 1.1rem; font-weight: bold; cursor: pointer; }
        .submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .error-msg { color: #ef4444; margin-top: 1rem; display: none; text-align: center; font-weight: bold; }
        
        /* Custom Controls */
        #controls { position: absolute; bottom: 0; left: 0; right: 0; background: linear-gradient(transparent, rgba(0,0,0,0.8)); padding: 1rem; display: flex; align-items: center; gap: 1rem; opacity: 0; transition: opacity 0.3s; }
        #player-container:hover #controls { opacity: 1; }
        .play-btn { background: none; border: none; color: white; cursor: pointer; font-size: 1.5rem; }
        .progress-container { flex: 1; height: 6px; background: rgba(255,255,255,0.3); border-radius: 3px; position: relative; cursor: pointer; }
        .progress-bar { height: 100%; background: #4f46e5; border-radius: 3px; width: 0%; pointer-events: none; }
        .progress-allowed { position: absolute; top: 0; left: 0; height: 100%; background: rgba(255,255,255,0.2); border-radius: 3px; width: 0%; pointer-events: none; }
        .marker { position: absolute; width: 8px; height: 8px; background: #fbbf24; border-radius: 50%; top: 50%; transform: translate(-50%, -50%); }
    </style>
</head>
<body>
    <div id="player-container">
        <video id="video" playsinline></video>
        <div id="controls">
            <button class="play-btn" id="playPauseBtn">▶</button>
            <div class="progress-container" id="progressContainer">
                <div class="progress-allowed" id="progressAllowed"></div>
                <div class="progress-bar" id="progressBar"></div>
                <div id="markers"></div>
            </div>
        </div>
        <div id="overlay">
            <div class="question-box">
                <div style="display: flex; justify-content: space-between; margin-bottom: 1rem; color: #64748b; font-size: 0.875rem; font-weight: bold; text-transform: uppercase;">
                    <span id="q-counter">Question 1/1</span>
                    <span>Bắt buộc trả lời đúng</span>
                </div>
                <h2 id="q-text" style="margin: 0 0 1.5rem 0; font-size: 1.5rem;"></h2>
        <div id="q-image" style="margin-bottom: 1.5rem; display: none; text-align: center;">
            <img id="q-img-src" style="max-width: 100%; max-height: 300px; border-radius: 0.5rem; border: 1px solid #e2e8f0;">
        </div>
                <div class="options" id="q-options"></div>
                <div class="error-msg" id="q-error">Câu trả lời chưa chính xác. Vui lòng thử lại!</div>
                <button class="submit-btn" id="q-submit" disabled>Xác nhận</button>
            </div>
        </div>
    </div>

    <!-- SCORM API Wrapper (Mock for HTML5, real for SCORM) -->
    <script>
        var SCORM = {
            init: function() { console.log('SCORM Init'); return true; },
            setScore: function(score) { console.log('Score:', score); },
            setStatus: function(status) { console.log('Status:', status); },
            quit: function() { console.log('SCORM Quit'); }
        };
    </script>
    <script src="data.js"></script>
    <script src="player.js"></script>
</body>
</html>`;
      zip.file('index.html', htmlContent);

      // 4. Add Player JS
      const jsContent = `
document.addEventListener('DOMContentLoaded', () => {
    const data = window.INTERACTIVE_DATA;
    const video = document.getElementById('video');
    const overlay = document.getElementById('overlay');
    const qText = document.getElementById('q-text');
    const qImage = document.getElementById('q-image');
    const qImgSrc = document.getElementById('q-img-src');
    const qOptions = document.getElementById('q-options');
    const qSubmit = document.getElementById('q-submit');
    const qError = document.getElementById('q-error');
    const qCounter = document.getElementById('q-counter');
    
    const playPauseBtn = document.getElementById('playPauseBtn');
    const progressContainer = document.getElementById('progressContainer');
    const progressBar = document.getElementById('progressBar');
    const progressAllowed = document.getElementById('progressAllowed');
    const markersContainer = document.getElementById('markers');

    video.src = data.videoSrc;

    let activePoint = null;
    let answeredPoints = new Set();
    let currentQuestionIndex = 0;
    let selectedAnswer = null;
    let textAnswer = '';

    function getMaxAllowedTime() {
        const unansweredPoints = data.questionPoints.filter(p => !answeredPoints.has(p.id));
        unansweredPoints.sort((a, b) => a.time - b.time);
        return unansweredPoints.length > 0 ? unansweredPoints[0].time : video.duration;
    }

    // Initialize SCORM
    SCORM.init();
    SCORM.setStatus('incomplete');

    // Render markers
    video.addEventListener('loadedmetadata', () => {
        data.questionPoints.forEach(point => {
            const marker = document.createElement('div');
            marker.className = 'marker';
            marker.style.left = (point.time / video.duration * 100) + '%';
            marker.id = 'marker-' + point.id;
            markersContainer.appendChild(marker);
        });
    });

    video.addEventListener('timeupdate', () => {
        const time = video.currentTime;
        
        progressBar.style.width = (time / video.duration * 100) + '%';
        progressAllowed.style.width = (getMaxAllowedTime() / video.duration * 100) + '%';

        const point = data.questionPoints.find(p => 
            !answeredPoints.has(p.id) && time >= p.time && time < p.time + 1
        );

        if (point && !activePoint) {
            video.pause();
            activePoint = point;
            currentQuestionIndex = 0;
            showQuestion();
        }
    });

    video.addEventListener('seeking', () => {
        const maxAllowedTime = getMaxAllowedTime();
        if (video.currentTime > maxAllowedTime + 0.5) {
            video.currentTime = maxAllowedTime;
        }
    });

    video.addEventListener('play', () => playPauseBtn.textContent = '⏸');
    video.addEventListener('pause', () => playPauseBtn.textContent = '▶');

    playPauseBtn.addEventListener('click', () => {
        if (activePoint) return;
        if (video.paused) video.play();
        else video.pause();
    });

    progressContainer.addEventListener('click', (e) => {
        if (activePoint) return;
        const rect = progressContainer.getBoundingClientRect();
        const pos = (e.clientX - rect.left) / rect.width;
        const targetTime = pos * video.duration;
        const maxAllowedTime = getMaxAllowedTime();
        if (targetTime <= maxAllowedTime) {
            video.currentTime = targetTime;
        } else {
            video.currentTime = maxAllowedTime;
        }
    });

    video.addEventListener('ended', () => {
        SCORM.setStatus('completed');
        SCORM.setScore(100);
    });

    function renderMathInElement(element) {
        if (window.renderMathInElement) {
            window.renderMathInElement(element, {
                delimiters: [
                    {left: '$$', right: '$$', display: true},
                    {left: '$', right: '$', display: false},
                    {left: '\\\\(', right: '\\\\)', display: false},
                    {left: '\\\\[', right: '\\\\]', display: true}
                ],
                throwOnError: false
            });
        }
    }

    function renderMarkdownWithMath(text, isInline = false) {
        if (!window.marked) return text;
        
        const mathBlocks = [];
        let processedText = text;
        
        // Replace $$...$$
        processedText = processedText.replace(/\\$\\$([\\s\\S]+?)\\$\\$/g, (match) => {
            mathBlocks.push(match);
            return \`%%%MATH_BLOCK_\${mathBlocks.length - 1}%%%\`;
        });
        
        // Replace \\[...\\]
        processedText = processedText.replace(/\\\\\\[([\\s\\S]+?)\\\\\\]/g, (match) => {
            mathBlocks.push(match);
            return \`%%%MATH_BLOCK_\${mathBlocks.length - 1}%%%\`;
        });
        
        // Replace \\(...\\)
        processedText = processedText.replace(/\\\\\\(([\\s\\S]+?)\\\\\\)/g, (match) => {
            mathBlocks.push(match);
            return \`%%%MATH_BLOCK_\${mathBlocks.length - 1}%%%\`;
        });
        
        // Replace $...$
        processedText = processedText.replace(/\\$((?:\\\\.|[^$])+?)\\$/g, (match) => {
            mathBlocks.push(match);
            return \`%%%MATH_BLOCK_\${mathBlocks.length - 1}%%%\`;
        });
        
        let html = isInline ? window.marked.parseInline(processedText) : window.marked.parse(processedText);
        
        // Put math back
        mathBlocks.forEach((block, i) => {
            html = html.replace(\`%%%MATH_BLOCK_\${i}%%%\`, block);
        });
        
        return html;
    }

    function showQuestion() {
        overlay.style.display = 'flex';
        selectedAnswer = null;
        textAnswer = '';
        qSubmit.disabled = true;
        qError.style.display = 'none';
        
        const q = activePoint.questions[currentQuestionIndex];
        qCounter.textContent = 'Câu hỏi ' + (currentQuestionIndex + 1) + '/' + activePoint.questions.length;
        
        // Render markdown and math for question text
        qText.innerHTML = renderMarkdownWithMath(q.text, false);
        renderMathInElement(qText);
        
        // Render image if exists
        if (q.imageUrl) {
            qImgSrc.src = q.imageUrl;
            qImage.style.display = 'block';
        } else {
            qImage.style.display = 'none';
        }
        
        qOptions.innerHTML = '';
        
        if (q.type === 'multiple_choice' || q.type === 'true_false') {
            q.options.forEach((opt, idx) => {
                const btn = document.createElement('button');
                btn.className = 'option-btn';
                // Render markdown and math for options
                btn.innerHTML = renderMarkdownWithMath(opt, true);
                renderMathInElement(btn);
                
                btn.onclick = () => {
                    document.querySelectorAll('.option-btn').forEach(b => b.classList.remove('selected'));
                    btn.classList.add('selected');
                    selectedAnswer = idx;
                    qSubmit.disabled = false;
                    qError.style.display = 'none';
                };
                qOptions.appendChild(btn);
            });
        } else if (q.type === 'fill_blank' || q.type === 'short_answer') {
            const labelContainer = document.createElement('div');
            labelContainer.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;';
            
            const label = document.createElement('label');
            label.textContent = 'Câu trả lời của bạn';
            label.style.cssText = 'font-size: 0.875rem; font-weight: bold; color: #475569;';
            
            const mathBtn = document.createElement('button');
            mathBtn.textContent = '+ Bàn phím Toán';
            mathBtn.style.cssText = 'padding: 0.25rem 0.5rem; background: #e0e7ff; color: #4f46e5; border: none; border-radius: 0.25rem; cursor: pointer; font-size: 0.75rem; font-weight: bold;';
            
            labelContainer.appendChild(label);
            labelContainer.appendChild(mathBtn);
            qOptions.appendChild(labelContainer);
            
            const mathFieldContainer = document.createElement('div');
            mathFieldContainer.style.display = 'none';
            mathFieldContainer.style.marginBottom = '0.5rem';
            mathFieldContainer.style.width = '100%';
            
            const mathField = document.createElement('math-field');
            mathField.style.cssText = 'width: 100%; padding: 0.5rem; border: 1px solid #cbd5e1; border-radius: 0.25rem; font-size: 1.2rem; background: white; color: black; box-sizing: border-box;';
            
            const insertBtn = document.createElement('button');
            insertBtn.textContent = 'Chèn công thức';
            insertBtn.style.cssText = 'margin-top: 0.5rem; padding: 0.5rem; background: #4f46e5; color: white; border: none; border-radius: 0.25rem; cursor: pointer; font-size: 0.875rem; font-weight: bold; width: 100%;';
            
            mathFieldContainer.appendChild(mathField);
            mathFieldContainer.appendChild(insertBtn);
            qOptions.appendChild(mathFieldContainer);
            
            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'text-input';
            input.placeholder = 'Nhập câu trả lời của bạn (hỗ trợ LaTeX với $...$)...';
            
            mathBtn.onclick = () => {
                mathFieldContainer.style.display = mathFieldContainer.style.display === 'none' ? 'block' : 'none';
            };
            
            insertBtn.onclick = () => {
                if (mathField.value) {
                    input.value += (input.value && !input.value.endsWith(' ') ? ' ' : '') + '$' + mathField.value + '$';
                    textAnswer = input.value;
                    qSubmit.disabled = !textAnswer.trim();
                    qError.style.display = 'none';
                    previewDiv.innerHTML = renderMarkdownWithMath(input.value, true);
                    renderMathInElement(previewDiv);
                    mathField.value = '';
                    mathFieldContainer.style.display = 'none';
                }
            };

            input.oninput = (e) => {
                textAnswer = e.target.value;
                qSubmit.disabled = !textAnswer.trim();
                qError.style.display = 'none';
            };
            input.onkeydown = (e) => {
                if (e.key === 'Enter' && !qSubmit.disabled) {
                    qSubmit.click();
                }
            };
            qOptions.appendChild(input);
            
            // Add a preview area for math input
            const previewDiv = document.createElement('div');
            previewDiv.className = 'mt-2 p-2 bg-slate-50 border border-slate-200 rounded min-h-[2.5rem] text-slate-800';
            previewDiv.style.marginTop = '0.5rem';
            previewDiv.style.padding = '0.5rem';
            previewDiv.style.backgroundColor = '#f8fafc';
            previewDiv.style.border = '1px solid #e2e8f0';
            previewDiv.style.borderRadius = '0.25rem';
            previewDiv.style.minHeight = '2.5rem';
            previewDiv.style.color = '#1e293b';
            qOptions.appendChild(previewDiv);
            
            input.addEventListener('input', (e) => {
                previewDiv.innerHTML = renderMarkdownWithMath(e.target.value, true);
                renderMathInElement(previewDiv);
            });
            
            setTimeout(() => input.focus(), 100);
        }
    }

    qSubmit.addEventListener('click', () => {
        const q = activePoint.questions[currentQuestionIndex];
        let isCorrect = false;

        if (q.type === 'multiple_choice' || q.type === 'true_false') {
            if (selectedAnswer === null) return;
            isCorrect = selectedAnswer === q.correctAnswerIndex;
        } else if (q.type === 'fill_blank' || q.type === 'short_answer') {
            if (!textAnswer.trim()) return;
            isCorrect = textAnswer.trim().toLowerCase() === (q.correctAnswerText || '').trim().toLowerCase();
        }
        
        if (isCorrect) {
            if (currentQuestionIndex < activePoint.questions.length - 1) {
                currentQuestionIndex++;
                showQuestion();
            } else {
                answeredPoints.add(activePoint.id);
                document.getElementById('marker-' + activePoint.id).style.background = '#4ade80';
                activePoint = null;
                overlay.style.display = 'none';
                video.play();
            }
        } else {
            qError.style.display = 'block';
        }
    });
});`;
      zip.file('player.js', jsContent);

      // 5. Add SCORM Manifests if needed
      if (format === 'scorm12') {
        const manifest = `<?xml version="1.0" standalone="no" ?>
<manifest identifier="InteractiveVideo" version="1" xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2" xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_rootv1p2" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.imsproject.org/xsd/imscp_rootv1p1p2 imscp_rootv1p1p2.xsd http://www.imsglobal.org/xsd/imsmd_rootv1p2p1 imsmd_rootv1p2p1.xsd http://www.adlnet.org/xsd/adlcp_rootv1p2 adlcp_rootv1p2.xsd">
  <metadata>
    <schema>ADL SCORM</schema>
    <schemaversion>1.2</schemaversion>
  </metadata>
  <organizations default="default_org">
    <organization identifier="default_org">
      <title>Interactive Video</title>
      <item identifier="item_1" identifierref="resource_1">
        <title>Interactive Video Module</title>
      </item>
    </organization>
  </organizations>
  <resources>
    <resource identifier="resource_1" type="webcontent" adlcp:scormtype="sco" href="index.html">
      <file href="index.html"/>
      <file href="player.js"/>
      <file href="data.js"/>
      <file href="media/${videoFile.name}"/>
    </resource>
  </resources>
</manifest>`;
        zip.file('imsmanifest.xml', manifest);
        
        // Add SCORM 1.2 API Wrapper
        const scormWrapper = `
// Basic SCORM 1.2 Wrapper
var SCORM = {
    api: null,
    init: function() {
        this.api = this.getAPI(window);
        if(this.api) this.api.LMSInitialize("");
    },
    getAPI: function(win) {
        var attempts = 0;
        while(win.API == null && win.parent != null && win.parent != win) {
            attempts++;
            if(attempts > 7) return null;
            win = win.parent;
        }
        return win.API;
    },
    setStatus: function(status) {
        if(this.api) {
            this.api.LMSSetValue("cmi.core.lesson_status", status);
            this.api.LMSCommit("");
        }
    },
    setScore: function(score) {
        if(this.api) {
            this.api.LMSSetValue("cmi.core.score.raw", score);
            this.api.LMSCommit("");
        }
    }
};`;
        // We would inject this into player.js or index.html, for simplicity we just overwrite the mock in index.html
        const htmlWithScorm = htmlContent.replace(
            /<script>\s*var SCORM = {[\s\S]*?};\s*<\/script>/,
            `<script>${scormWrapper}</script>`
        );
        zip.file('index.html', htmlWithScorm);
      } else if (format === 'scorm2004') {
        const manifest = `<?xml version="1.0" standalone="no" ?>
<manifest identifier="InteractiveVideo2004" version="1" xmlns="http://www.imsglobal.org/xsd/imscp_v1p1" xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_v1p3" xmlns:adlseq="http://www.adlnet.org/xsd/adlseq_v1p3" xmlns:adlnav="http://www.adlnet.org/xsd/adlnav_v1p3" xmlns:imsss="http://www.imsglobal.org/xsd/imsss" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.imsglobal.org/xsd/imsglobal.org/xsd/imscp_v1p1 imscp_v1p1.xsd http://www.adlnet.org/xsd/adlcp_v1p3 adlcp_v1p3.xsd http://www.adlnet.org/xsd/adlseq_v1p3 adlseq_v1p3.xsd http://www.adlnet.org/xsd/adlnav_v1p3 adlnav_v1p3.xsd http://www.imsglobal.org/xsd/imsss imsss_v1p0.xsd">
  <metadata>
    <schema>ADL SCORM</schema>
    <schemaversion>2004 3rd Edition</schemaversion>
  </metadata>
  <organizations default="default_org">
    <organization identifier="default_org">
      <title>Interactive Video</title>
      <item identifier="item_1" identifierref="resource_1">
        <title>Interactive Video Module</title>
        <imsss:sequencing>
          <imsss:deliveryControls tracked="true" completionSetByContent="true" objectiveSetByContent="true"/>
        </imsss:sequencing>
      </item>
    </organization>
  </organizations>
  <resources>
    <resource identifier="resource_1" type="webcontent" adlcp:scormType="sco" href="index.html">
      <file href="index.html"/>
      <file href="player.js"/>
      <file href="data.js"/>
      <file href="media/${videoFile.name}"/>
    </resource>
  </resources>
</manifest>`;
        zip.file('imsmanifest.xml', manifest);

        // Add SCORM 2004 API Wrapper
        const scormWrapper = `
// Basic SCORM 2004 Wrapper
var SCORM = {
    api: null,
    init: function() {
        this.api = this.getAPI(window);
        if(this.api) this.api.Initialize("");
    },
    getAPI: function(win) {
        var attempts = 0;
        while(win.API_1484_11 == null && win.parent != null && win.parent != win) {
            attempts++;
            if(attempts > 7) return null;
            win = win.parent;
        }
        return win.API_1484_11;
    },
    setStatus: function(status) {
        if(this.api) {
            this.api.SetValue("cmi.completion_status", status);
            this.api.Commit("");
        }
    },
    setScore: function(score) {
        if(this.api) {
            this.api.SetValue("cmi.score.raw", score);
            this.api.SetValue("cmi.score.scaled", score/100);
            this.api.Commit("");
        }
    }
};`;
        const htmlWithScorm = htmlContent.replace(
            /<script>\s*var SCORM = {[\s\S]*?};\s*<\/script>/,
            `<script>${scormWrapper}</script>`
        );
        zip.file('index.html', htmlWithScorm);
      }

      // 6. Generate and save zip
      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, `interactive-video-${format}.zip`);
    } catch (err) {
      console.error('Export failed:', err);
      setError('Có lỗi xảy ra khi xuất file.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 max-w-3xl mx-auto w-full">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center">
          <FileArchive className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Xuất bản khóa học</h2>
          <p className="text-slate-500">Chọn định dạng phù hợp với hệ thống LMS của bạn</p>
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 text-red-600 p-4 rounded-xl border border-red-200 font-medium">
          {error}
        </div>
      )}

      <div className="grid gap-6">
        {/* HTML5 Export */}
        <div className="border border-slate-200 rounded-xl p-6 flex items-start gap-4 hover:border-indigo-300 transition-colors">
          <div className="flex-1">
            <h3 className="text-lg font-bold text-slate-800 mb-1">Xuất HTML5 (Web)</h3>
            <p className="text-slate-600 text-sm mb-4">
              Định dạng chuẩn để chạy trực tiếp trên trình duyệt web hoặc nhúng vào website. Không có chức năng theo dõi điểm số trên LMS.
            </p>
            <button
              onClick={() => generateHTML5('html5')}
              disabled={isExporting}
              className="px-4 py-2 bg-slate-800 text-white rounded-lg font-medium hover:bg-slate-700 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Tải xuống HTML5
            </button>
          </div>
        </div>

        {/* SCORM 1.2 Export */}
        <div className="border border-slate-200 rounded-xl p-6 flex items-start gap-4 hover:border-indigo-300 transition-colors">
          <div className="flex-1">
            <h3 className="text-lg font-bold text-slate-800 mb-1">SCORM 1.2</h3>
            <p className="text-slate-600 text-sm mb-2">
              Định dạng LMS chuẩn và phổ biến nhất. Hỗ trợ hầu hết tất cả các hệ thống quản lý học tập (LMS) hiện nay.
            </p>
            <ul className="text-sm text-slate-500 list-disc list-inside mb-4">
              <li>Theo dõi tiến độ hoàn thành (Hoàn thành/Chưa hoàn thành)</li>
              <li>Ghi nhận điểm số</li>
            </ul>
            <button
              onClick={() => generateHTML5('scorm12')}
              disabled={isExporting}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Tải xuống SCORM 1.2
            </button>
          </div>
        </div>

        {/* SCORM 2004 Export */}
        <div className="border border-slate-200 rounded-xl p-6 flex items-start gap-4 hover:border-indigo-300 transition-colors">
          <div className="flex-1">
            <h3 className="text-lg font-bold text-slate-800 mb-1">SCORM 2004</h3>
            <p className="text-slate-600 text-sm mb-2">
              Định dạng LMS hiện đại. Cung cấp khả năng theo dõi chi tiết hơn và cấu trúc điều hướng phức tạp hơn.
            </p>
            <ul className="text-sm text-slate-500 list-disc list-inside mb-4">
              <li>Theo dõi tiến độ và điểm số chi tiết</li>
              <li>Hỗ trợ trạng thái hoàn thành và trạng thái đạt/trượt riêng biệt</li>
            </ul>
            <button
              onClick={() => generateHTML5('scorm2004')}
              disabled={isExporting}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Tải xuống SCORM 2004
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
