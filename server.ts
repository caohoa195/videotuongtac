import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';

dotenv.config({ path: '.env.local' });
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ALLOWED_GEMINI_MODELS = new Set([
  'gemini-4-hydrogen',
  'gemini-3.1-flash-lite',
]);

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY chưa được cấu hình trên máy chủ. Vui lòng kiểm tra Settings > Secrets.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function mapGeminiError(err: unknown): { status: number; message: string } {
  const rawMessage = err instanceof Error ? err.message : String(err);
  const lower = rawMessage.toLowerCase();

  if (lower.includes('api_key_invalid') || lower.includes('permission_denied') || lower.includes('403') || lower.includes('api key')) {
    return {
      status: 400,
      message: 'API key Gemini không hợp lệ hoặc chưa được thiết lập. Vui lòng kiểm tra trong mục Settings > Secrets.',
    };
  }
  if (lower.includes('resource_exhausted') || lower.includes('429') || lower.includes('quota')) {
    return {
      status: 429,
      message: 'Đã vượt giới hạn gọi Gemini API tạm thời (429). Vui lòng thử lại sau ít phút.',
    };
  }
  return {
    status: 500,
    message: rawMessage || 'Lỗi máy chủ khi gọi Gemini API.',
  };
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '2mb' }));

  // Generate interactive video quiz questions with Gemini
  app.post('/api/gemini/generate-questions', async (req, res) => {
    try {
      const {
        topic,
        contentSnippet,
        model = 'gemini-4-hydrogen',
        count = 3,
        types = ['multiple_choice', 'true_false'],
        difficulty = 'medium',
        includeLatex = true,
      } = req.body ?? {};

      if (!topic || typeof topic !== 'string' || !topic.trim()) {
        res.status(400).json({ error: 'Vui lòng nhập chủ đề hoặc tiêu đề bài giảng.' });
        return;
      }

      const selectedModel = ALLOWED_GEMINI_MODELS.has(model) ? model : 'gemini-4-hydrogen';
      const safeCount = Math.min(Math.max(Number(count) || 3, 1), 10);
      const allowedTypes = Array.isArray(types) && types.length > 0
        ? types.filter((t: string) => ['multiple_choice', 'true_false', 'fill_blank', 'short_answer'].includes(t))
        : ['multiple_choice'];

      const typesDescription = allowedTypes.map((t: string) => {
        switch (t) {
          case 'multiple_choice': return 'multiple_choice (4 lựa chọn)';
          case 'true_false': return 'true_false (Đúng / Sai)';
          case 'fill_blank': return 'fill_blank (Điền khuyết)';
          case 'short_answer': return 'short_answer (Trả lời ngắn)';
          default: return t;
        }
      }).join(', ');

      const difficultyDesc =
        difficulty === 'easy'
          ? 'Nhận biết, dễ hiểu'
          : difficulty === 'hard'
            ? 'Vận dụng cao, tư duy phân hóa sâu sắc'
            : 'Thông hiểu, vận dụng vừa phải';

      const systemInstruction = `Bạn là một chuyên gia giáo dục thiết kế bộ câu hỏi tương tác cho video bài giảng bằng tiếng Việt.
Quy tắc bắt buộc:
1. Tạo chính xác ${safeCount} câu hỏi chỉ sử dụng các loại trong danh sách: ${typesDescription}.
2. Nếu type là "multiple_choice": mảng options phải có đúng 4 phương án, correctAnswerIndex là chỉ số từ 0 đến 3.
3. Nếu type là "true_false": mảng options phải là ["Đúng", "Sai"], correctAnswerIndex là 0 (Đúng) hoặc 1 (Sai).
4. Nếu type là "fill_blank" hoặc "short_answer": mảng options là [], correctAnswerText là đáp án chính xác ngắn gọn, correctAnswerIndex là 0.
5. ${includeLatex ? 'Sử dụng ký hiệu LaTeX kẹp giữa $...$ cho mọi công thức Toán, Lý, Hóa khi phù hợp.' : 'Diễn đạt rõ ràng, súc tích bằng văn bản thuần.'}
6. Mức độ khó: ${difficultyDesc}.
7. Mỗi câu hỏi kèm một explanation ngắn gọn giải thích vì sao đáp án đó đúng.`;

      const userPrompt = `Chủ đề bài giảng: ${topic.trim()}
${contentSnippet && typeof contentSnippet === 'string' && contentSnippet.trim()
  ? `\nNội dung tóm tắt / lời thoại video:\n${contentSnippet.trim()}`
  : ''}
Hãy tạo ${safeCount} câu hỏi tương tác chất lượng cao.`;

      const ai = getGeminiClient();
      const response = await ai.models.generateContent({
        model: selectedModel,
        contents: userPrompt,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          thinkingConfig: {
            thinkingLevel: selectedModel === 'gemini-4-hydrogen' ? ThinkingLevel.LOW : ThinkingLevel.MINIMAL,
          },
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              questions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    type: {
                      type: Type.STRING,
                      description: 'One of: multiple_choice, true_false, fill_blank, short_answer',
                    },
                    text: {
                      type: Type.STRING,
                      description: 'Question prompt text',
                    },
                    options: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                      description: '4 options for multiple_choice, ["Đúng","Sai"] for true_false, [] for fill_blank/short_answer',
                    },
                    correctAnswerIndex: {
                      type: Type.INTEGER,
                      description: '0-based index of correct option for multiple_choice or true_false',
                    },
                    correctAnswerText: {
                      type: Type.STRING,
                      description: 'Exact short answer string for fill_blank or short_answer',
                    },
                    explanation: {
                      type: Type.STRING,
                      description: 'Brief explanation in Vietnamese',
                    },
                  },
                  required: ['type', 'text', 'options', 'correctAnswerIndex'],
                },
              },
            },
            required: ['questions'],
          },
        },
      });

      const rawText = (response.text ?? '{"questions":[]}').trim();
      const parsed = JSON.parse(rawText);
      const rawList = Array.isArray(parsed.questions) ? parsed.questions : [];

      const questions = rawList.map((item: any, idx: number) => {
        let type = item.type;
        if (!['multiple_choice', 'true_false', 'fill_blank', 'short_answer'].includes(type)) {
          type = Array.isArray(item.options) && item.options.length > 0 ? 'multiple_choice' : 'short_answer';
        }

        let options: string[] = Array.isArray(item.options) ? item.options.map(String) : [];
        let correctAnswerIndex = typeof item.correctAnswerIndex === 'number' ? item.correctAnswerIndex : 0;

        if (type === 'multiple_choice') {
          if (options.length < 4) {
            while (options.length < 4) options.push(`Phương án ${options.length + 1}`);
          } else if (options.length > 4) {
            options = options.slice(0, 4);
          }
          if (correctAnswerIndex < 0 || correctAnswerIndex >= options.length) {
            correctAnswerIndex = 0;
          }
        } else if (type === 'true_false') {
          options = ['Đúng', 'Sai'];
          correctAnswerIndex = correctAnswerIndex === 1 ? 1 : 0;
        } else {
          options = [];
          correctAnswerIndex = 0;
        }

        return {
          id: `gemini-${Date.now()}-${idx}`,
          type,
          text: String(item.text || `Câu hỏi ${idx + 1}`),
          options,
          correctAnswerIndex,
          correctAnswerText:
            type === 'fill_blank' || type === 'short_answer'
              ? String(item.correctAnswerText || '')
              : undefined,
          explanation: item.explanation ? String(item.explanation) : '',
        };
      });

      res.json({ questions, model: selectedModel });
    } catch (err) {
      console.error('Gemini generate-questions error:', err);
      const mapped = mapGeminiError(err);
      res.status(mapped.status).json({ error: mapped.message });
    }
  });

  // Generate 3 plausible distractors for an existing multiple-choice question
  app.post('/api/gemini/generate-distractors', async (req, res) => {
    try {
      const { questionText, correctAnswer, model = 'gemini-4-hydrogen' } = req.body ?? {};
      if (!questionText || !correctAnswer) {
        res.status(400).json({ error: 'Thiếu nội dung câu hỏi hoặc đáp án đúng.' });
        return;
      }

      const selectedModel = ALLOWED_GEMINI_MODELS.has(model) ? model : 'gemini-4-hydrogen';
      const ai = getGeminiClient();

      const response = await ai.models.generateContent({
        model: selectedModel,
        contents: `Dựa vào câu hỏi và đáp án đúng dưới đây, hãy tạo đúng 3 phương án gây nhiễu (các đáp án sai nhưng hợp lý, có tính đánh lừa học viên, giữ cùng định dạng/độ dài/LaTeX nếu có).

CÂU HỎI: ${String(questionText)}
ĐÁP ÁN ĐÚNG: ${String(correctAnswer)}`,
        config: {
          systemInstruction: 'Bạn là trợ lý soạn đề thi trắc nghiệm tiếng Việt. Luôn trả về đúng 3 phương án nhiễu khác nhau và khác đáp án đúng.',
          responseMimeType: 'application/json',
          thinkingConfig: {
            thinkingLevel: selectedModel === 'gemini-4-hydrogen' ? ThinkingLevel.LOW : ThinkingLevel.MINIMAL,
          },
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              distractors: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'Exactly 3 wrong answer options',
              },
            },
            required: ['distractors'],
          },
        },
      });

      const rawText = (response.text ?? '{"distractors":[]}').trim();
      const parsed = JSON.parse(rawText);
      const distractors = Array.isArray(parsed.distractors)
        ? parsed.distractors.slice(0, 3).map(String)
        : [];

      if (distractors.length < 3) {
        while (distractors.length < 3) {
          distractors.push(`Phương án khác ${distractors.length + 1}`);
        }
      }

      res.json({ distractors });
    } catch (err) {
      console.error('Gemini generate-distractors error:', err);
      const mapped = mapGeminiError(err);
      res.status(mapped.status).json({ error: mapped.message });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
