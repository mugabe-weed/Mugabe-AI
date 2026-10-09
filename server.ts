import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isProd = process.env.NODE_ENV === 'production';
const PORT = parseInt(process.env.PORT || '3000', 10);

const app = express();
app.use(express.json({ limit: '10mb' }));

// Initialize GoogleGenAI server-side with telemetry User-Agent
const apiKey = process.env.GEMINI_API_KEY || '';
const ai = new GoogleGenAI({
  apiKey: apiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

interface HistoryMessage {
  role: 'user' | 'model';
  text: string;
}

interface AskRequestBody {
  question: string;
  mode?: 'balanced' | 'concise' | 'eli5' | 'steps' | 'technical';
  enableSearch?: boolean;
  history?: HistoryMessage[];
}

function getSystemInstructionForMode(mode: string = 'balanced'): string {
  const baseInstruction = `You are Mugabe AI, a brilliant, thoughtful, and highly capable question-answering AI assistant.
Your mission is to directly, accurately, and thoroughly answer the user's question with exceptional clarity and structure.
Always organize complex answers with clean markdown headings, bulleted lists, code blocks with specified language when applicable, and key takeaways where appropriate.`;

  switch (mode) {
    case 'concise':
      return `${baseInstruction}\n\nMODE: Quick & Concise. Deliver the direct answer immediately in 2 to 4 punchy sentences or concise bullet points. Skip filler pleasantries and provide maximum information density.`;
    case 'eli5':
      return `${baseInstruction}\n\nMODE: Explain Like I'm 5 (ELI5). Use clear, vivid real-world analogies, intuitive storytelling, and plain everyday language. Avoid jargon completely, or if a technical term is necessary, explain it with a friendly metaphor.`;
    case 'steps':
      return `${baseInstruction}\n\nMODE: Step-by-Step Guide. Structure your response as a numbered, actionable workflow with milestones, prerequisites (if any), concrete instructions, and verification steps.`;
    case 'technical':
      return `${baseInstruction}\n\nMODE: Deep Technical & Academic. Provide in-depth analysis, underlying mechanisms, formulas/specs if applicable, edge cases, trade-offs, and authoritative reasoning.`;
    case 'balanced':
    default:
      return `${baseInstruction}\n\nMODE: Comprehensive & Balanced. Provide a clear direct summary upfront, followed by a well-organized breakdown, practical examples or context, and a concise concluding takeaway.`;
  }
}

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    hasApiKey: Boolean(apiKey && apiKey !== 'MY_GEMINI_API_KEY'),
    timestamp: new Date().toISOString(),
  });
});

// Non-streaming ask endpoint
app.post('/api/ask', async (req: Request, res: Response): Promise<void> => {
  try {
    const { question, mode = 'balanced', enableSearch = false, history = [] }: AskRequestBody = req.body;

    if (!question || typeof question !== 'string' || !question.trim()) {
      res.status(400).json({ error: 'Question is required.' });
      return;
    }

    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
      res.status(500).json({
        error: 'Gemini API key is not configured. Please ensure GEMINI_API_KEY is set in environment secrets.',
      });
      return;
    }

    const systemInstruction = getSystemInstructionForMode(mode);

    // Build contents array including conversation history
    const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];

    if (Array.isArray(history) && history.length > 0) {
      for (const msg of history.slice(-8)) {
        if (msg.role && msg.text) {
          contents.push({
            role: msg.role === 'model' ? 'model' : 'user',
            parts: [{ text: msg.text }],
          });
        }
      }
    }

    contents.push({
      role: 'user',
      parts: [{ text: question.trim() }],
    });

    const config: any = {
      systemInstruction,
      temperature: mode === 'technical' ? 0.2 : mode === 'eli5' ? 0.7 : 0.4,
    };

    if (enableSearch) {
      config.tools = [{ googleSearch: {} }];
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents,
      config,
    });

    const answer = response.text || '';
    const groundingMetadata = response.candidates?.[0]?.groundingMetadata || null;

    res.json({
      answer,
      groundingMetadata,
    });
  } catch (error: any) {
    console.error('Error generating answer:', error);
    res.status(500).json({
      error: error?.message || 'Failed to generate answer. Please try again.',
    });
  }
});

// Streaming ask endpoint using Server-Sent Events (SSE)
app.post('/api/ask/stream', async (req: Request, res: Response): Promise<void> => {
  const { question, mode = 'balanced', enableSearch = false, history = [] }: AskRequestBody = req.body;

  if (!question || typeof question !== 'string' || !question.trim()) {
    res.status(400).json({ error: 'Question is required.' });
    return;
  }

  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    res.status(500).json({
      error: 'Gemini API key is not configured. Please ensure GEMINI_API_KEY is set in environment secrets.',
    });
    return;
  }

  // Set SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  const sendEvent = (event: string, data: any) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const systemInstruction = getSystemInstructionForMode(mode);

    const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];

    if (Array.isArray(history) && history.length > 0) {
      for (const msg of history.slice(-8)) {
        if (msg.role && msg.text) {
          contents.push({
            role: msg.role === 'model' ? 'model' : 'user',
            parts: [{ text: msg.text }],
          });
        }
      }
    }

    contents.push({
      role: 'user',
      parts: [{ text: question.trim() }],
    });

    const config: any = {
      systemInstruction,
      temperature: mode === 'technical' ? 0.2 : mode === 'eli5' ? 0.7 : 0.4,
    };

    if (enableSearch) {
      config.tools = [{ googleSearch: {} }];
    }

    const responseStream = await ai.models.generateContentStream({
      model: 'gemini-3.8-flash',
      contents,
      config,
    });

    let fullAnswer = '';
    let lastGroundingMetadata: any = null;

    for await (const chunk of responseStream) {
      const text = chunk.text || '';
      if (text) {
        fullAnswer += text;
        sendEvent('chunk', { text });
      }

      const grounding = chunk.candidates?.[0]?.groundingMetadata;
      if (grounding) {
        lastGroundingMetadata = grounding;
      }
    }

    if (lastGroundingMetadata) {
      sendEvent('grounding', { groundingMetadata: lastGroundingMetadata });
    }

    sendEvent('done', { fullAnswer });
    res.end();
  } catch (error: any) {
    console.error('Error during streaming answer:', error);
    sendEvent('error', { error: error?.message || 'Streaming interrupted.' });
    res.end();
  }
});

// Follow-up question suggestion endpoint
app.post('/api/suggest-followups', async (req: Request, res: Response): Promise<void> => {
  try {
    const { question, answer } = req.body;
    if (!question || !answer) {
      res.json({ suggestions: [] });
      return;
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `Based on this question and answer pair, provide exactly 3 brief, fascinating follow-up questions that the user might want to ask next to explore deeper.
Question: "${question}"
Answer snippet: "${typeof answer === 'string' ? answer.slice(0, 500) : ''}"

Return ONLY a valid JSON array of strings containing the 3 questions, without markdown code fences or other text. Example:
["What are the main drawbacks?", "Can you give a practical example?", "How does this compare to alternative approaches?"]`,
      config: {
        temperature: 0.7,
        responseMimeType: 'application/json',
      },
    });

    let suggestions: string[] = [];
    try {
      const rawText = response.text?.trim() || '[]';
      suggestions = JSON.parse(rawText);
      if (!Array.isArray(suggestions)) {
        suggestions = [];
      }
    } catch {
      suggestions = [];
    }

    res.json({ suggestions: suggestions.slice(0, 3) });
  } catch (err) {
    res.json({ suggestions: [] });
  }
});

// Mount Vite or serve static assets
async function startServer() {
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Mugabe AI server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
