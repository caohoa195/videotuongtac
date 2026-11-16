import { GeneratedQuestionItem } from './ollamaService';

export type GeminiModelId = 'gemini-4-hydrogen' | 'gemini-3.1-flash-lite';

export interface GeminiModelConfig {
  id: GeminiModelId;
  name: string;
  badge: string;
  description: string;
}

export const GEMINI_MODELS: GeminiModelConfig[] = [
  {
    id: 'gemini-4-hydrogen',
    name: 'Gemini 4 Hydrogen',
    badge: 'Khuyên dùng',
    description: 'Cân bằng tối ưu giữa độ chính xác sư phạm, công thức Toán LaTeX và tốc độ tạo câu hỏi.',
  },
  {
    id: 'gemini-3.1-flash-lite',
    name: 'Gemini 3.1 Flash Lite',
    badge: 'Siêu tốc độ',
    description: 'Phản hồi cực nhanh, phù hợp tạo nhanh bộ câu hỏi kiểm tra kiến thức cơ bản.',
  },
];

export interface GeminiGenerateQuizRequest {
  topic: string;
  contentSnippet?: string;
  model: GeminiModelId;
  count: number;
  types: ('multiple_choice' | 'true_false' | 'fill_blank' | 'short_answer')[];
  difficulty: 'easy' | 'medium' | 'hard';
  includeLatex: boolean;
}

export async function generateQuizQuestionsWithGemini(
  req: GeminiGenerateQuizRequest
): Promise<GeneratedQuestionItem[]> {
  const response = await fetch('/api/gemini/generate-questions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(req),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error || `Gemini API trả về lỗi (${response.status})`);
  }

  if (!Array.isArray(data?.questions) || data.questions.length === 0) {
    throw new Error('Gemini không trả về câu hỏi nào. Vui lòng thử lại với mô tả chi tiết hơn.');
  }

  return data.questions;
}

export async function generateDistractorsWithGemini(
  questionText: string,
  correctAnswer: string,
  model: GeminiModelId = 'gemini-4-hydrogen'
): Promise<string[]> {
  const response = await fetch('/api/gemini/generate-distractors', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      questionText,
      correctAnswer,
      model,
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error || `Gemini API trả về lỗi (${response.status})`);
  }

  if (!Array.isArray(data?.distractors) || data.distractors.length === 0) {
    throw new Error('Không nhận được phương án gây nhiễu từ Gemini.');
  }

  return data.distractors.slice(0, 3);
}
