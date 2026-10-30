import React, { useState, useEffect } from 'react';
import { 
  X, Server, Check, Copy, AlertCircle, RefreshCw, Sparkles, 
  Terminal, ShieldCheck, Zap, Info, ExternalLink 
} from 'lucide-react';
import { 
  OllamaSettings, 
  OLLAMA_DEFAULT_MODELS, 
  testOllamaConnection, 
  OllamaConnectionResult 
} from '../services/ollamaService';

interface OllamaSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: OllamaSettings;
  onSave: (newSettings: OllamaSettings) => void;
  lastConnectionStatus: OllamaConnectionResult | null;
  setLastConnectionStatus: (status: OllamaConnectionResult | null) => void;
}

export const OllamaSettingsModal: React.FC<OllamaSettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSave,
  lastConnectionStatus,
  setLastConnectionStatus,
}) => {
  const [localSettings, setLocalSettings] = useState<OllamaSettings>(settings);
  const [isChecking, setIsChecking] = useState(false);
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);
  const [customTagInput, setCustomTagInput] = useState('');

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings, isOpen]);

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    setIsChecking(true);
    const result = await testOllamaConnection(localSettings.baseUrl);
    setLastConnectionStatus(result);
    setIsChecking(false);
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCmd(id);
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  const handleSaveAndClose = () => {
    onSave(localSettings);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-gradient-to-r from-slate-900 to-indigo-950 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-sm border border-white/20">
              <span className="text-2xl">🦙</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold">Cấu hình Ollama Cục Bộ</h2>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Local AI
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Chạy mô hình ngôn ngữ lớn trực tiếp trên phần cứng máy tính của bạn (100% riêng tư & miễn phí)
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* Connection Endpoint & Status */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <Server className="w-4 h-4 text-indigo-600" />
                Địa chỉ Ollama API (Host Endpoint)
              </label>
              <div className="flex items-center gap-2">
                {lastConnectionStatus && (
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium flex items-center gap-1.5 ${
                    lastConnectionStatus.connected
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      : 'bg-amber-100 text-amber-800 border border-amber-200'
                  }`}>
                    <span className={`w-2 h-2 rounded-full ${lastConnectionStatus.connected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                    {lastConnectionStatus.connected ? `Đã kết nối (${lastConnectionStatus.version || 'Ollama'})` : 'Chưa kết nối'}
                  </span>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={localSettings.baseUrl}
                onChange={(e) => setLocalSettings({ ...localSettings, baseUrl: e.target.value })}
                placeholder="http://localhost:11434"
                className="flex-1 px-4 py-2.5 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none font-mono"
              />
              <button
                onClick={handleTestConnection}
                disabled={isChecking}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2 shrink-0 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
                {isChecking ? 'Đang kiểm tra...' : 'Kiểm tra kết nối'}
              </button>
            </div>

            {/* Error or CORS Notice */}
            {lastConnectionStatus && !lastConnectionStatus.connected && (
              <div className="mt-4 p-3.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1.5">
                  <p className="font-semibold text-amber-950">Không thể kết nối đến Ollama trên máy của bạn</p>
                  <p className="text-amber-800">
                    Ollama mặc định có thể chặn truy cập từ trình duyệt (CORS). Hãy khởi động Ollama với biến môi trường cho phép:
                  </p>
                  <div className="space-y-1 mt-2">
                    <div className="flex items-center justify-between bg-black/80 text-emerald-400 px-3 py-1.5 rounded font-mono text-[11px]">
                      <span># Windows PowerShell:</span>
                      <button 
                        onClick={() => handleCopy('$env:OLLAMA_ORIGINS="*"; ollama serve', 'cors-win')}
                        className="text-slate-300 hover:text-white flex items-center gap-1"
                      >
                        {copiedCmd === 'cors-win' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        Copy
                      </button>
                    </div>
                    <code className="block bg-slate-900 text-slate-100 p-2 rounded text-[11px] font-mono select-all">
                      $env:OLLAMA_ORIGINS="*"; ollama serve
                    </code>

                    <div className="flex items-center justify-between bg-black/80 text-emerald-400 px-3 py-1.5 rounded font-mono text-[11px] mt-1.5">
                      <span># macOS / Linux Terminal:</span>
                      <button 
                        onClick={() => handleCopy('OLLAMA_ORIGINS="*" ollama serve', 'cors-mac')}
                        className="text-slate-300 hover:text-white flex items-center gap-1"
                      >
                        {copiedCmd === 'cors-mac' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        Copy
                      </button>
                    </div>
                    <code className="block bg-slate-900 text-slate-100 p-2 rounded text-[11px] font-mono select-all">
                      OLLAMA_ORIGINS="*" ollama serve
                    </code>
                  </div>
                </div>
              </div>
            )}

            {/* List of Detected Local Models */}
            {lastConnectionStatus?.connected && lastConnectionStatus.installedModels.length > 0 && (
              <div className="mt-3 pt-3 border-t border-slate-200">
                <span className="text-xs font-medium text-slate-600 block mb-1.5">
                  Các model đã cài đặt trên máy ({lastConnectionStatus.installedModels.length}):
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {lastConnectionStatus.installedModels.map((m) => (
                    <button
                      key={m}
                      onClick={() => setLocalSettings({ ...localSettings, selectedModelTag: m })}
                      className={`text-xs px-2.5 py-1 rounded-md border font-mono transition-colors ${
                        localSettings.selectedModelTag === m
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Model Selection - 4 specific requested models */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                Chọn Model Ollama Cục Bộ
              </label>
              <span className="text-xs text-slate-500">
                4 mô hình tối ưu theo yêu cầu
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {OLLAMA_DEFAULT_MODELS.map((model) => {
                const isSelected = localSettings.selectedModelTag === model.tag;
                return (
                  <div
                    key={model.id}
                    onClick={() => setLocalSettings({ ...localSettings, selectedModelTag: model.tag })}
                    className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/50 shadow-sm ring-1 ring-indigo-500'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-1.5">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-slate-900 text-sm">{model.name}</h4>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                            {model.badge}
                          </span>
                        </div>
                        <span className="text-xs font-mono text-slate-500 block mt-0.5">
                          tag: {model.tag}
                        </span>
                      </div>
                      <input
                        type="radio"
                        checked={isSelected}
                        onChange={() => setLocalSettings({ ...localSettings, selectedModelTag: model.tag })}
                        className="w-4 h-4 text-indigo-600 mt-1 cursor-pointer"
                      />
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed mb-2">
                      {model.description}
                    </p>

                    <div className="text-[11px] bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md mb-2">
                      <span className="font-semibold text-slate-900">Phù hợp:</span> {model.recommendedTask}
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px] text-slate-500 font-mono">
                      <span>Lệnh tải model:</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopy(`ollama run ${model.tag}`, model.id);
                        }}
                        className="text-indigo-600 hover:text-indigo-800 flex items-center gap-1 font-sans font-medium hover:underline"
                      >
                        {copiedCmd === model.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        {copiedCmd === model.id ? 'Đã sao chép' : `ollama run ${model.tag}`}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Custom model tag option */}
            <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-3">
              <span className="text-xs font-medium text-slate-700 shrink-0">Model tùy chỉnh khác:</span>
              <input
                type="text"
                placeholder="Nhập tên tag Ollama khác (vd: mistral, llama3, qwen:latest)..."
                value={customTagInput}
                onChange={(e) => setCustomTagInput(e.target.value)}
                className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md font-mono"
              />
              <button
                type="button"
                onClick={() => {
                  if (customTagInput.trim()) {
                    setLocalSettings({ ...localSettings, selectedModelTag: customTagInput.trim() });
                  }
                }}
                disabled={!customTagInput.trim()}
                className="px-3 py-1.5 bg-slate-800 text-white rounded-md text-xs font-medium hover:bg-slate-700 disabled:opacity-40"
              >
                Áp dụng
              </button>
            </div>
          </div>

          {/* Model Temperature & Fallback Settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-200">
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-semibold text-slate-700">Độ sáng tạo (Temperature)</label>
                <span className="text-xs font-mono font-bold text-indigo-600">{localSettings.temperature}</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1.2"
                step="0.05"
                value={localSettings.temperature}
                onChange={(e) => setLocalSettings({ ...localSettings, temperature: parseFloat(e.target.value) })}
                className="w-full accent-indigo-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                <span>Chính xác & Logic (0.2)</span>
                <span>Cân bằng (0.7)</span>
                <span>Sáng tạo (1.0)</span>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <input
                type="checkbox"
                id="useDemoFallback"
                checked={localSettings.useDemoFallback}
                onChange={(e) => setLocalSettings({ ...localSettings, useDemoFallback: e.target.checked })}
                className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer"
              />
              <label htmlFor="useDemoFallback" className="text-xs text-slate-700 cursor-pointer select-none">
                <span className="font-semibold block text-slate-900">Chế độ Thử nghiệm Mẫu (Demo Fallback)</span>
                Tự động tạo câu hỏi mô phỏng khi Ollama chưa bật hoặc chưa tải xong model để không làm gián đoạn công việc.
              </label>
            </div>
          </div>

          {/* Quick Setup Instructions & Tips */}
          <div className="bg-indigo-50/70 border border-indigo-100 rounded-xl p-4 text-xs text-indigo-950 space-y-2">
            <div className="flex items-center gap-1.5 font-bold text-indigo-900">
              <Info className="w-4 h-4 text-indigo-600" />
              Hướng dẫn nhanh chạy Ollama cục bộ:
            </div>
            <ol className="list-decimal list-inside space-y-1 text-slate-700 pl-1">
              <li>Tải và cài đặt Ollama từ trang chính thức <a href="https://ollama.com" target="_blank" rel="noreferrer" className="text-indigo-600 underline font-semibold">ollama.com</a>.</li>
              <li>Mở Terminal và gõ: <code className="bg-white px-1.5 py-0.5 rounded border border-indigo-200 text-indigo-800 font-mono">ollama run qwen2.5-coder:7b</code> (hoặc model bạn muốn).</li>
              <li>Nếu gặp thông báo CORS, hãy chạy với <code className="bg-white px-1.5 py-0.5 rounded border border-indigo-200 text-indigo-800 font-mono">OLLAMA_ORIGINS="*" ollama serve</code>.</li>
            </ol>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="text-xs text-slate-500 flex items-center gap-1">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            Dữ liệu video và câu hỏi xử lý 100% nội bộ trên máy bạn
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-slate-700 hover:bg-slate-200 rounded-lg text-sm font-medium transition-colors"
            >
              Đóng
            </button>
            <button
              onClick={handleSaveAndClose}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              Lưu cấu hình
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
