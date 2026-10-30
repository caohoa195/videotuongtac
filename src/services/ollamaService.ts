export interface OllamaModelConfig {
  id: string;
  name: string;
  tag: string;
  description: string;
  badge: string;
  color: string;
  recommendedTask: string;
}

export const OLLAMA_DEFAULT_MODELS: OllamaModelConfig[] = [
  {
    id: 'qwen3.6-35b',
    name: 'Qwen3.6 35B-A3B (Q4)',
    tag: 'qwen3.6:35b-a3b-q4',
    description: 'Mô hình MoE 35B lượng tử hóa Q4 tối ưu, suy luận sư phạm sâu sắc và tạo câu hỏi học thuật phân hóa cao.',
    badge: 'Hiệu năng cao',
    color: 'from-purple-600 to-indigo-600',
    recommendedTask: 'Câu hỏi phân hóa cao, tư duy logic, tổng hợp bài giảng phức tạp',
  },
  {
    id: 'gemma4-12b',
    name: 'Gemma 4 12B',
    tag: 'gemma4:12b',
    description: 'Thế hệ Gemma 4 từ Google với 12 tỷ tham số, cân bằng tối ưu giữa độ chính xác kiến thức và tốc độ phản hồi.',
    badge: 'Cân bằng & Chuẩn xác',
    color: 'from-blue-600 to-cyan-600',
    recommendedTask: 'Kiến thức tổng quát, khoa học, ngôn ngữ & văn học',
  },
  {
    id: 'qwen2.5-coder-7b',
    name: 'qwen2.5-coder:7b',
    tag: 'qwen2.5-coder:7b',
    description: 'Chuyên gia lập trình và toán học logic, tạo công thức LaTeX chuẩn xác, câu hỏi thuật toán và bài tập tính toán.',
    badge: 'Chuyên Toán & Code',
    color: 'from-emerald-600 to-teal-600',
    recommendedTask: 'Toán học LaTeX ($...$), Tin học, Lập trình, Khoa học tự nhiên',
  },
  {
    id: 'gemma4-e4b',
    name: 'gemma4:e4b',
    tag: 'gemma4:e4b',
    description: 'Bản Gemma 4 siêu nhẹ tối ưu hóa (Edge/Embedded 4B), tốn rất ít RAM/VRAM, chạy mượt trên mọi laptop cá nhân.',
    badge: 'Siêu nhẹ & Nhanh',
    color: 'from-amber-600 to-orange-600',
    recommendedTask: 'Máy tính cấu hình phổ thông, sinh câu hỏi nhanh tức thì',
  },
];

export interface OllamaSettings {
  baseUrl: string;
  selectedModelTag: string;
  customModelTag?: string;
  temperature: number;
  useDemoFallback: boolean;
}

const SETTINGS_STORAGE_KEY = 'interactive_video_ollama_settings';

export const getSavedOllamaSettings = (): OllamaSettings => {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Failed to load Ollama settings from localStorage:', e);
  }

  return {
    baseUrl: 'http://localhost:11434',
    selectedModelTag: 'qwen2.5-coder:7b',
    temperature: 0.7,
    useDemoFallback: true,
  };
};

export const saveOllamaSettings = (settings: OllamaSettings) => {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save Ollama settings to localStorage:', e);
  }
};

export interface OllamaConnectionResult {
  connected: boolean;
  version?: string;
  installedModels: string[];
  error?: string;
  corsAdvice?: boolean;
}

export async function testOllamaConnection(baseUrl: string): Promise<OllamaConnectionResult> {
  const cleanUrl = baseUrl.replace(/\/+$/, '');
  
  try {
    // 1. Check version endpoint with 5s timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const versionRes = await fetch(`${cleanUrl}/api/version`, {
      method: 'GET',
      signal: controller.signal,
    }).catch(async (err) => {
      // If version fails, try /api/tags
      return await fetch(`${cleanUrl}/api/tags`, {
        method: 'GET',
        signal: controller.signal,
      });
    });

    clearTimeout(timeoutId);

    if (!versionRes.ok) {
      throw new Error(`Mã trạng thái phản hồi: ${versionRes.status} ${versionRes.statusText}`);
    }

    let version = '';
    try {
      const data = await versionRes.json();
      version = data.version || 'Ollama Server';
    } catch {
      version = 'Ollama Server';
    }

    // 2. Fetch list of models
    let installedModels: string[] = [];
    try {
      const tagsRes = await fetch(`${cleanUrl}/api/tags`);
      if (tagsRes.ok) {
        const tagsData = await tagsRes.json();
        if (Array.isArray(tagsData.models)) {
          installedModels = tagsData.models.map((m: any) => m.name || m.model);
        }
      }
    } catch (e) {
      console.warn('Could not list models from /api/tags:', e);
    }

    return {
      connected: true,
      version,
      installedModels,
    };
  } catch (err: any) {
    const errorMsg = err?.message || String(err);
    const isCorsOrNetwork = errorMsg.includes('Failed to fetch') || errorMsg.includes('NetworkError') || errorMsg.includes('abort');
    
    return {
      connected: false,
      installedModels: [],
      error: isCorsOrNetwork
        ? `Không thể kết nối đến ${cleanUrl}. Vui lòng đảm bảo Ollama đang chạy và đã cấu hình CORS.`
        : errorMsg,
      corsAdvice: isCorsOrNetwork,
    };
  }
}

export interface GenerateQuizRequest {
  topic: string;
  contentSnippet?: string;
  modelTag: string;
  count: number;
  types: ('multiple_choice' | 'true_false' | 'fill_blank' | 'short_answer')[];
  difficulty: 'easy' | 'medium' | 'hard';
  includeLatex: boolean;
  language?: string;
}

export interface GeneratedQuestionItem {
  id: string;
  type: 'multiple_choice' | 'true_false' | 'fill_blank' | 'short_answer';
  text: string;
  options: string[];
  correctAnswerIndex: number;
  correctAnswerText?: string;
  explanation?: string;
}

export async function generateQuizQuestionsWithOllama(
  settings: OllamaSettings,
  req: GenerateQuizRequest,
  onProgress?: (chunk: string) => void
): Promise<GeneratedQuestionItem[]> {
  const model = req.modelTag || settings.selectedModelTag;
  const cleanUrl = settings.baseUrl.replace(/\/+$/, '');

  const typesStr = req.types.map(t => {
    switch (t) {
      case 'multiple_choice': return 'multiple_choice (4 lựa chọn)';
      case 'true_false': return 'true_false (Đúng/Sai)';
      case 'fill_blank': return 'fill_blank (Điền vào chỗ trống)';
      case 'short_answer': return 'short_answer (Trả lời ngắn)';
    }
  }).join(', ');

  const systemPrompt = `Bạn là một chuyên gia giáo dục thiết kế bộ câu hỏi tương tác cho video bài giảng.
Mục tiêu: Tạo chính xác ${req.count} câu hỏi chất lượng cao phù hợp cho học viên dựa trên thông tin được cung cấp.

YÊU CẦU ĐỊNH DẠNG ĐẦU RA:
Bắt buộc chỉ trả về định dạng JSON thuần túy (không bọc trong \`\`\`json hoặc bất kỳ ký tự nào ngoài chuỗi JSON hợp lệ).
Cấu trúc JSON như sau:
{
  "questions": [
    {
      "type": "multiple_choice" | "true_false" | "fill_blank" | "short_answer",
      "text": "Nội dung câu hỏi...",
      "options": ["Lựa chọn 1", "Lựa chọn 2", "Lựa chọn 3", "Lựa chọn 4"],
      "correctAnswerIndex": 0,
      "correctAnswerText": "đáp án cho fill_blank hoặc short_answer",
      "explanation": "Giải thích ngắn gọn vì sao đáp án này đúng"
    }
  ]
}

QUY TẮC CÂU HỎI:
1. Nếu là multiple_choice: bắt buộc có mảng options gồm 4 lựa chọn, correctAnswerIndex là vị trí từ 0 đến 3.
2. Nếu là true_false: options gồm ["Đúng", "Sai"], correctAnswerIndex là 0 (Đúng) hoặc 1 (Sai).
3. Nếu là fill_blank hoặc short_answer: options là [], và bắt buộc điền correctAnswerText chính xác.
4. ${req.includeLatex ? 'Sử dụng ký hiệu LaTeX kẹp giữa cặp $...$ cho các công thức Toán học / Lý / Hóa (ví dụ: $x^2 + 5x = 0$ hoặc $\\int_0^1 f(x)dx$).' : 'Diễn đạt rõ ràng, xúc tích.'}
5. Độ khó: ${req.difficulty === 'easy' ? 'Nhận biết, dễ hiểu' : req.difficulty === 'medium' ? 'Thông hiểu, vận dụng vừa phải' : 'Nâng cao, tư duy phân hóa cao'}.
6. Cho phép các loại câu hỏi sau: ${typesStr}.`;

  const userPrompt = `Hãy tạo ${req.count} câu hỏi tương tác về chủ đề sau:
CHỦ ĐỀ: ${req.topic}
${req.contentSnippet ? `NỘI DUNG TÓM TẮT / BẢNG GHI CHÚ BÀI GIẢNG VIDEO:\n${req.contentSnippet}` : ''}
NGÔN NGỮ: Tiếng Việt`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout for local model generation

    const response = await fetch(`${cleanUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: model,
        prompt: `${systemPrompt}\n\n${userPrompt}`,
        format: 'json',
        stream: false,
        options: {
          temperature: settings.temperature || 0.7,
        },
      }),
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Ollama lỗi (${response.status}): ${response.statusText}`);
    }

    const data = await response.json();
    const responseText = data.response;

    if (!responseText) {
      throw new Error('Ollama trả về phản hồi rỗng.');
    }

    // Parse JSON safely
    const parsed = parseOllamaQuizJson(responseText);
    if (parsed.length > 0) {
      return parsed;
    }

    throw new Error('Không thể phân tích dữ liệu JSON từ mô hình Ollama.');
  } catch (error: any) {
    console.error('Error generating with Ollama:', error);

    // If demo fallback is allowed, produce high quality demo questions
    if (settings.useDemoFallback) {
      console.warn('Ollama offline or error, providing mock generation for preview.');
      return generateMockQuestions(req);
    }

    throw error;
  }
}

function parseOllamaQuizJson(raw: string): GeneratedQuestionItem[] {
  let cleaned = raw.trim();
  // Strip code fences if present
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/i, '').replace(/\s*```$/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }

  try {
    const obj = JSON.parse(cleaned);
    const list = Array.isArray(obj) ? obj : (obj.questions || obj.items || []);
    
    return list.map((item: any, idx: number) => {
      let type = item.type;
      if (!['multiple_choice', 'true_false', 'fill_blank', 'short_answer'].includes(type)) {
        type = item.options && item.options.length > 0 ? 'multiple_choice' : 'short_answer';
      }

      let options = Array.isArray(item.options) ? item.options : [];
      let correctAnswerIndex = typeof item.correctAnswerIndex === 'number' ? item.correctAnswerIndex : 0;

      if (type === 'multiple_choice' && options.length < 2) {
        options = ['Đáp án A', 'Đáp án B', 'Đáp án C', 'Đáp án D'];
      }

      if (type === 'true_false' && options.length < 2) {
        options = ['Đúng', 'Sai'];
      }

      return {
        id: `ollama-${Date.now()}-${idx}`,
        type,
        text: item.text || item.question || `Câu hỏi số ${idx + 1}`,
        options,
        correctAnswerIndex,
        correctAnswerText: item.correctAnswerText || item.correct_answer || (options[correctAnswerIndex] || ''),
        explanation: item.explanation || '',
      };
    });
  } catch (e) {
    console.error('Failed to parse json string from Ollama:', e, raw);
    return [];
  }
}

// Fallback generator when local Ollama is offline or in testing mode
export function generateMockQuestions(req: GenerateQuizRequest): GeneratedQuestionItem[] {
  const isMathOrTech = req.includeLatex || req.topic.toLowerCase().includes('toán') || req.topic.toLowerCase().includes('code') || req.topic.toLowerCase().includes('hàm') || req.topic.toLowerCase().includes('lập trình');

  const mathTemplates = [
    {
      type: 'multiple_choice' as const,
      text: `Cho hàm số $f(x) = x^2 - 4x + 3$. Tọa độ đỉnh $I$ của parabol là:`,
      options: ['$I(2; -1)$', '$I(-2; 15)$', '$I(2; 1)$', '$I(1; 0)$'],
      correctAnswerIndex: 0,
      explanation: 'Đỉnh parabol có hoành độ $x_I = -\\frac{b}{2a} = 2$, thay vào ta được $y_I = 2^2 - 4(2) + 3 = -1$.',
    },
    {
      type: 'true_false' as const,
      text: `Trong không gian vector, nếu hệ vector phụ thuộc tuyến tính thì có ít nhất một vector biểu diễn tuyến tính qua các vector còn lại.`,
      options: ['Đúng', 'Sai'],
      correctAnswerIndex: 0,
      explanation: 'Đây là định lý cơ bản về tính phụ thuộc tuyến tính của hệ vector.',
    },
    {
      type: 'fill_blank' as const,
      text: `Nghiệm dương của phương trình bậc hai $x^2 - 5x + 6 = 0$ lớn nhất là $x = ...$`,
      options: [],
      correctAnswerIndex: 0,
      correctAnswerText: '3',
      explanation: 'Phương trình có hai nghiệm là $x = 2$ và $x = 3$. Nghiệm dương lớn nhất là 3.',
    },
    {
      type: 'multiple_choice' as const,
      text: `Tính đạo hàm của hàm số $y = \\ln(2x + 1)$ với $x > -\\frac{1}{2}$?`,
      options: [
        '$y\' = \\frac{2}{2x + 1}$',
        '$y\' = \\frac{1}{2x + 1}$',
        '$y\' = \\frac{2}{(2x + 1)^2}$',
        '$y\' = 2\\ln(2x + 1)$'
      ],
      correctAnswerIndex: 0,
      explanation: 'Đạo hàm $(\\ln u)\' = \\frac{u\'}{u}$, với $u = 2x + 1 \\Rightarrow u\' = 2$.',
    },
    {
      type: 'short_answer' as const,
      text: `Trong lập trình Python, hàm nào dùng để trả về độ dài của một danh sách (list)?`,
      options: [],
      correctAnswerIndex: 0,
      correctAnswerText: 'len',
      explanation: 'Hàm len() trong Python trả về số phần tử của iterable.',
    }
  ];

  const generalTemplates = [
    {
      type: 'multiple_choice' as const,
      text: `Ý chính được đề cập và nhấn mạnh nhất trong phần bài giảng về "${req.topic}" là gì?`,
      options: [
        'Nắm vững nguyên lý cốt lõi và phương pháp ứng dụng thực tế',
        'Ghi nhớ máy móc các định nghĩa lý thuyết',
        'Bỏ qua các bước kiểm tra thử nghiệm',
        'Chỉ tập trung vào công cụ thay vì tư duy bản chất',
      ],
      correctAnswerIndex: 0,
      explanation: 'Mục tiêu của bài giảng là giúp học viên hiểu bản chất cốt lõi và vận dụng linh hoạt.',
    },
    {
      type: 'true_false' as const,
      text: `Việc tương tác và trả lời các câu hỏi kiểm tra ngắt quãng trong video giúp tăng khả năng ghi nhớ dài hạn (retention rate).`,
      options: ['Đúng', 'Sai'],
      correctAnswerIndex: 0,
      explanation: 'Các nghiên cứu sư phạm chỉ ra hiệu ứng kiểm tra ngắt quãng (testing effect) cải thiện đáng kể độ ghi nhớ.',
    },
    {
      type: 'fill_blank' as const,
      text: `Để đảm bảo độ chính xác khi tạo câu hỏi với Ollama cục bộ, mô hình nên được thiết lập định dạng đầu ra chuẩn là dạng dữ liệu ...`,
      options: [],
      correctAnswerIndex: 0,
      correctAnswerText: 'JSON',
      explanation: 'Ollama hỗ trợ tham số format: "json" để đảm bảo câu trả lời luôn phân tích cú pháp được.',
    },
    {
      type: 'multiple_choice' as const,
      text: `Ưu điểm vượt trội nhất khi chạy mô hình ngôn ngữ lớn (như Qwen, Gemma) cục bộ qua Ollama là gì?`,
      options: [
        'Bảo mật dữ liệu tuyệt đối 100%, không mất phí API và chạy offline',
        'Yêu cầu không cần cài đặt phần mềm nào trên máy',
        'Tốc độ luôn nhanh hơn siêu máy tính đám mây',
        'Tự động kết nối Internet tìm dữ liệu thời gian thực',
      ],
      correctAnswerIndex: 0,
      explanation: 'Ollama xử lý hoàn toàn trên máy tính người dùng (on-premise), không gửi dữ liệu ra bên ngoài và hoàn toàn miễn phí.',
    },
  ];

  const pool = isMathOrTech ? mathTemplates : generalTemplates;
  const results: GeneratedQuestionItem[] = [];

  for (let i = 0; i < req.count; i++) {
    const template = pool[i % pool.length];
    results.push({
      id: `demo-${Date.now()}-${i}`,
      type: template.type,
      text: req.contentSnippet ? `[Liên hệ bài giảng] ${template.text}` : template.text,
      options: [...template.options],
      correctAnswerIndex: template.correctAnswerIndex,
      correctAnswerText: template.correctAnswerText,
      explanation: template.explanation,
    });
  }

  return results;
}

// Helper to generate 3 distractor choices given a question text and the correct answer
export async function generateDistractorsWithOllama(
  settings: OllamaSettings,
  questionText: string,
  correctAnswer: string
): Promise<string[]> {
  const model = settings.selectedModelTag;
  const cleanUrl = settings.baseUrl.replace(/\/+$/, '');

  const prompt = `Bạn là trợ lý soạn đề thi trắc nghiệm.
Dựa vào câu hỏi và đáp án đúng sau đây, hãy tạo ra đúng 3 phương án gây nhiễu (distractors - các câu trả lời sai nhưng hợp lý và có tính đánh lừa học sinh).

CÂU HỎI: ${questionText}
ĐÁP ÁN ĐÚNG: ${correctAnswer}

Chỉ trả về JSON định dạng:
{
  "distractors": ["Lựa chọn sai 1", "Lựa chọn sai 2", "Lựa chọn sai 3"]
}`;

  try {
    const res = await fetch(`${cleanUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: model,
        prompt: prompt,
        format: 'json',
        stream: false,
        options: { temperature: 0.6 }
      }),
    });

    if (res.ok) {
      const data = await res.json();
      const parsed = JSON.parse(data.response);
      if (Array.isArray(parsed.distractors) && parsed.distractors.length >= 3) {
        return parsed.distractors.slice(0, 3);
      }
    }
  } catch (e) {
    console.warn('Ollama distractor generation failed, falling back to smart defaults:', e);
  }

  // Fallback defaults
  return [
    `Phương án tương tự 1 (nhiễu)`,
    `Phương án tương tự 2 (nhiễu)`,
    `Phương án tương tự 3 (nhiễu)`,
  ];
}
