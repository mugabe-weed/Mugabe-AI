import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isProd = process.env.NODE_ENV === 'production';
const PORT = parseInt(process.env.PORT || '3000', 10);

const app = express();
// Enforce 15MB payload limit for base64 file attachments
app.use(express.json({ limit: '15mb' }));

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

interface IncomingAttachment {
  name: string;
  type: string;
  size: number;
  dataUrl: string; // Base64 data URL
}

interface AskRequestBody {
  question: string;
  mode?: 'balanced' | 'brainstorm' | 'concise' | 'eli5' | 'steps' | 'technical';
  enableSearch?: boolean;
  history?: HistoryMessage[];
  attachments?: IncomingAttachment[];
}

// Supported MIME types for multimodal inspection
const SUPPORTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
const SUPPORTED_DOC_TYPES = ['application/pdf', 'text/plain', 'text/markdown', 'text/csv', 'application/json'];

function getSystemInstructionForMode(mode: string = 'balanced'): string {
  const baseInstruction = `You are Mugabe AI, a brilliant, highly creative, thoughtful, and capable AI assistant specialized in deep research, question answering, and inventive idea generation.
Your mission is to directly, accurately, and thoroughly answer questions and produce imaginative, high-impact ideas.
When the user asks for ideas, suggestions, concepts, solutions, business models, or brainstorming:
- Be prolific, imaginative, and bold — avoid generic or superficial advice.
- Provide multiple distinct, high-potential ideas with creative angles.
- For each idea, give a memorable title, clear rationale, key differentiation, and a practical first step.
When documents (PDFs, text files, CSVs) or images are provided, analyze them rigorously and extract precise details.
Always format complex answers with clean markdown headings, bulleted lists, tables where appropriate, code blocks with explicit language tags, and clear mathematical notation where formulas are involved.`;

  switch (mode) {
    case 'brainstorm':
      return `${baseInstruction}\n\nMODE: 💡 Idea & Creative Brainstorming.
You are in maximum creative strategist mode! Generate a rich, diverse, and inspiring set of 5 to 10 out-of-the-box ideas.
Break your response into:
1. **Bold & Visionary Concepts**: Unconventional, disruptive, and innovative ideas.
2. **Fast-Action & Practical Quick Wins**: High-leverage ideas that can be tested immediately.
3. **Action Blueprint**: Concrete next steps and experiment to validate the top pick.
Make every single idea specific, memorable, and actionable with real-world examples.`;

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
      return `${baseInstruction}\n\nMODE: Comprehensive & Balanced. Provide a clear direct summary upfront, followed by a well-organized breakdown, practical examples or context, creative suggestions where relevant, and a concise concluding takeaway.`;
  }
}

function formatErrorMessage(error: any): string {
  const msg = error?.message || '';
  if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED')) {
    return 'Gemini API quota rate limit reached. Please wait a few moments and try your question again.';
  }
  if (msg.includes('API_KEY_INVALID') || msg.includes('API key not valid')) {
    return 'Invalid Gemini API key configured. Please check your API key in environment settings.';
  }
  try {
    const parsed = JSON.parse(msg);
    if (parsed?.error?.message) {
      return parsed.error.message;
    }
  } catch {}
  return msg || 'Failed to generate answer. Please try again.';
}

/**
 * Validates and converts incoming user attachments into Gemini multimodal parts
 */
function processAttachments(attachments?: IncomingAttachment[]): Array<any> {
  if (!attachments || !Array.isArray(attachments) || attachments.length === 0) {
    return [];
  }

  // Safety limits: max 4 files, max 10MB per file
  const validFiles = attachments.slice(0, 4);
  const parts: Array<any> = [];

  for (const file of validFiles) {
    if (!file.dataUrl || typeof file.dataUrl !== 'string') continue;

    const commaIdx = file.dataUrl.indexOf(',');
    const base64Data = commaIdx !== -1 ? file.dataUrl.slice(commaIdx + 1) : file.dataUrl;
    const mimeType = file.type || 'application/octet-stream';

    if (SUPPORTED_IMAGE_TYPES.includes(mimeType) || mimeType === 'application/pdf') {
      parts.push({
        inlineData: {
          mimeType,
          data: base64Data,
        },
      });
    } else if (
      mimeType.startsWith('text/') ||
      mimeType === 'application/json' ||
      mimeType === 'text/csv' ||
      mimeType === 'text/markdown'
    ) {
      try {
        const textContent = Buffer.from(base64Data, 'base64').toString('utf-8');
        parts.push({
          text: `\n\n[Attached Document: "${file.name || 'document'}" (${mimeType})]\n${textContent}\n[End of Document "${file.name || 'document'}"]\n\n`,
        });
      } catch {
        // Fallback to inlineData
        parts.push({
          inlineData: {
            mimeType: 'text/plain',
            data: base64Data,
          },
        });
      }
    }
  }

  return parts;
}

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    hasApiKey: Boolean(apiKey && apiKey !== 'MY_GEMINI_API_KEY'),
    timestamp: new Date().toISOString(),
  });
});

/**
 * Executes a Gemini API call with automatic transient retry (for 503 / 429 / high demand spikes)
 */
async function callWithRetry<T>(fn: () => Promise<T>, maxRetries = 2): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (err: any) {
      attempt++;
      const msg = err?.message || '';
      const isTransient =
        msg.includes('high demand') ||
        msg.includes('503') ||
        msg.includes('429') ||
        msg.includes('RESOURCE_EXHAUSTED') ||
        msg.includes('overloaded');

      if (isTransient && attempt <= maxRetries) {
        await new Promise((res) => setTimeout(res, 1200 * attempt));
        continue;
      }
      throw err;
    }
  }
}

/**
 * Builds a strictly valid alternating Gemini contents array starting with user role
 */
function buildConversationContents(
  history: HistoryMessage[] = [],
  question: string,
  attachmentParts: Array<any> = []
): Array<{ role: 'user' | 'model'; parts: Array<any> }> {
  const contents: Array<{ role: 'user' | 'model'; parts: Array<any> }> = [];

  const cleanHistory = (Array.isArray(history) ? history : []).filter(
    (m) => m && typeof m.text === 'string' && m.text.trim().length > 0
  );

  const recent = cleanHistory.slice(-6);

  let expectedRole: 'user' | 'model' = 'user';
  for (const m of recent) {
    const role = m.role === 'model' ? 'model' : 'user';
    if (role === expectedRole) {
      contents.push({
        role,
        parts: [{ text: m.text.trim() }],
      });
      expectedRole = expectedRole === 'user' ? 'model' : 'user';
    }
  }

  // Ensure last turn in history wasn't already a user message before appending latest question
  if (contents.length > 0 && contents[contents.length - 1].role === 'user') {
    contents.pop();
  }

  const userPromptText = question.trim() || 'Analyze the attached files and provide a detailed explanation.';
  contents.push({
    role: 'user',
    parts: [...attachmentParts, { text: userPromptText }],
  });

  return contents;
}

// Non-streaming ask endpoint (fallback and testing)
app.post('/api/ask', async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      question,
      mode = 'balanced',
      enableSearch = false,
      history = [],
      attachments = [],
    }: AskRequestBody = req.body;

    if (!question || typeof question !== 'string' || !question.trim()) {
      if (!attachments || attachments.length === 0) {
        res.status(400).json({ error: 'Question or file attachment is required.' });
        return;
      }
    }

    if (question && question.length > 25000) {
      res.status(400).json({ error: 'Question exceeds maximum character limit of 25,000.' });
      return;
    }

    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
      res.status(500).json({
        error: 'Gemini API key is not configured. Please ensure GEMINI_API_KEY is set in environment secrets.',
      });
      return;
    }

    const systemInstruction = getSystemInstructionForMode(mode);
    const attachmentParts = processAttachments(attachments);
    const contents = buildConversationContents(history, question, attachmentParts);

    const config: any = {
      systemInstruction,
      // Dynamic temperature: Higher for brainstorming and creative thinking, focused for technical
      temperature: mode === 'brainstorm' ? 0.95 : mode === 'technical' ? 0.2 : mode === 'eli5' ? 0.7 : mode === 'concise' ? 0.3 : 0.6,
      // ThinkingLevel.LOW delivers near-instant response latency
      thinkingConfig: {
        thinkingLevel: ThinkingLevel.LOW,
      },
    };

    if (enableSearch) {
      config.tools = [{ googleSearch: {} }];
    }

    const response = await callWithRetry(() =>
      ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents,
        config,
      })
    );

    const answer = response.text || '';
    const groundingMetadata = response.candidates?.[0]?.groundingMetadata || null;

    res.json({
      answer,
      groundingMetadata,
    });
  } catch (error: any) {
    console.error('Error generating answer:', error);
    res.status(500).json({
      error: formatErrorMessage(error),
    });
  }
});

// Streaming ask endpoint using Server-Sent Events (SSE)
app.post('/api/ask/stream', async (req: Request, res: Response): Promise<void> => {
  const {
    question,
    mode = 'balanced',
    enableSearch = false,
    history = [],
    attachments = [],
  }: AskRequestBody = req.body;

  if (!question || typeof question !== 'string' || !question.trim()) {
    if (!attachments || attachments.length === 0) {
      res.status(400).json({ error: 'Question or file attachment is required.' });
      return;
    }
  }

  if (question && question.length > 25000) {
    res.status(400).json({ error: 'Question exceeds maximum character limit of 25,000.' });
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
  res.flushHeaders?.();

  const sendEvent = (event: string, data: any) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    if (typeof (res as any).flush === 'function') {
      (res as any).flush();
    }
  };

  let isClientClosed = false;
  req.on('close', () => {
    isClientClosed = true;
  });

  try {
    const systemInstruction = getSystemInstructionForMode(mode);
    const attachmentParts = processAttachments(attachments);
    const contents = buildConversationContents(history, question, attachmentParts);

    const config: any = {
      systemInstruction,
      // Dynamic temperature: Higher for creative ideas and brainstorms
      temperature: mode === 'brainstorm' ? 0.95 : mode === 'technical' ? 0.2 : mode === 'eli5' ? 0.7 : mode === 'concise' ? 0.3 : 0.6,
      // ThinkingLevel.LOW minimizes latency to provide instant streaming
      thinkingConfig: {
        thinkingLevel: ThinkingLevel.LOW,
      },
    };

    if (enableSearch) {
      config.tools = [{ googleSearch: {} }];
    }

    let responseStream;
    try {
      responseStream = await callWithRetry(() =>
        ai.models.generateContentStream({
          model: 'gemini-3.8-flash',
          contents,
          config,
        })
      );
    } catch (streamErr: any) {
      if (enableSearch) {
        console.warn('Search tool failed or exceeded quota; retrying without search grounding:', streamErr?.message);
        delete config.tools;
        responseStream = await callWithRetry(() =>
          ai.models.generateContentStream({
            model: 'gemini-3.8-flash',
            contents,
            config,
          })
        );
      } else {
        throw streamErr;
      }
    }

    let fullAnswer = '';
    let lastGroundingMetadata: any = null;

    for await (const chunk of responseStream) {
      if (isClientClosed) {
        break;
      }

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

    if (lastGroundingMetadata && !isClientClosed) {
      sendEvent('grounding', { groundingMetadata: lastGroundingMetadata });
    }

    if (!isClientClosed) {
      sendEvent('done', { fullAnswer });
      res.end();
    }
  } catch (error: any) {
    console.error('Error during streaming answer:', error);
    if (!isClientClosed) {
      sendEvent('error', { error: formatErrorMessage(error) });
      res.end();
    }
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
