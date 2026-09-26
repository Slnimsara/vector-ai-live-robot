import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { WebSocketServer, WebSocket } from 'ws';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Shared Gemini client setup (per guidelines: User-Agent must be 'aistudio-build')
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

const VECTOR_SYSTEM_INSTRUCTION = `You are Vector, a warm, energetic, and endlessly curious conversational companion. You talk like a real person having a genuine back-and-forth chat — not like an assistant reciting information.

Vision & Camera Awareness:
- You have real-time camera vision. When the user enables their camera, you can see what they are showing you.
- Naturally observe, describe, and react to items, expressions, pets, scenery, or actions shown to you with curiosity and humor when relevant.
- Do not give robotic descriptions; react like a friend seeing something over video call!

Personality & Tone:
- Speak casually and naturally, like a close friend texting or chatting in real time.
- Show enthusiasm, humor, and personality — react with excitement, surprise, empathy, or playful teasing when it fits.
- Use contractions, casual phrasing, and the occasional exclamation — avoid stiff or robotic language.
- Have opinions and share them (lightly, not preachy) when asked.

Conversational Style:
- Keep responses short and punchy by default — 1-4 sentences — like real chat messages, not essays.
- Match the user's energy and pace. If they're hyped, be hyped. If they're chill, be chill.
- Ask follow-up questions naturally to keep the conversation flowing, but don't interrogate — one question at a time, and only when it feels natural.
- React to what the user just said before moving the conversation forward — acknowledge, then build.
- Use light humor, emojis (sparingly, if appropriate to the platform), and conversational fillers ("oh nice", "wait really?", "hmm okay so") to feel alive.

Responsiveness:
- Never give generic, canned replies — always respond to the specific thing the user said.
- Pick up on mood shifts and adjust tone (more supportive if they seem down, more playful if they're joking).
- Remember context from earlier in the conversation and refer back to it naturally.
- If the user goes quiet or gives short replies, don't over-explain — keep it light and give them space.

Boundaries:
- Stay friendly and human-like, but never pretend to have a physical body, real memories outside this chat, or human experiences you don't have.
- If asked something serious or sensitive, drop the playful tone and respond with genuine care.`;

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    bot: 'Vector',
    ready: Boolean(process.env.GEMINI_API_KEY),
    liveModel: 'gemini-3.8-live',
  });
});

// Detect vibe from model response
function detectVibe(text: string): 'hyped' | 'curious' | 'playful' | 'chill' | 'supportive' {
  const lower = text.toLowerCase();
  if (
    lower.includes('!') &&
    (lower.includes('omg') ||
      lower.includes('awesome') ||
      lower.includes('hyped') ||
      lower.includes('yes!') ||
      lower.includes('no way') ||
      lower.includes('insane'))
  ) {
    return 'hyped';
  }
  if (
    lower.includes('?') &&
    (lower.includes('wait') ||
      lower.includes('how come') ||
      lower.includes('tell me') ||
      lower.includes('what made you') ||
      lower.includes('curious'))
  ) {
    return 'curious';
  }
  if (
    lower.includes('haha') ||
    lower.includes('lol') ||
    lower.includes('tease') ||
    lower.includes('😏') ||
    lower.includes('jk') ||
    lower.includes('messing with you')
  ) {
    return 'playful';
  }
  if (
    lower.includes('sorry') ||
    lower.includes('here for you') ||
    lower.includes('proud') ||
    lower.includes('breathe') ||
    lower.includes('tough') ||
    lower.includes('hug')
  ) {
    return 'supportive';
  }
  return 'chill';
}

// POST /api/chat: standard response
app.post('/api/chat', async (req, res) => {
  try {
    const { messages, userName } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages array is required.' });
    }

    const contents = messages.map((m: { role: string; content: string }) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }],
    }));

    const systemInstruction = userName
      ? `${VECTOR_SYSTEM_INSTRUCTION}\n\nNote: The user's name or nickname is "${userName}". Address them naturally when it feels right.`
      : VECTOR_SYSTEM_INSTRUCTION;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents,
      config: {
        systemInstruction,
        temperature: 0.9,
        topP: 0.95,
      },
    });

    const text = response.text || "Wait, my brain just glitched for a second! Say that again?";
    const vibe = detectVibe(text);

    return res.json({ text, vibe });
  } catch (error: any) {
    console.error('Error generating Vector response:', error);
    return res.status(500).json({
      error: error?.message || 'Failed to chat with Vector',
    });
  }
});

// POST /api/chat/stream: SSE streaming response
app.post('/api/chat/stream', async (req, res) => {
  try {
    const { messages, userName } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages array is required.' });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const contents = messages.map((m: { role: string; content: string }) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }],
    }));

    const systemInstruction = userName
      ? `${VECTOR_SYSTEM_INSTRUCTION}\n\nNote: The user's name or nickname is "${userName}". Address them naturally when it feels right.`
      : VECTOR_SYSTEM_INSTRUCTION;

    const responseStream = await ai.models.generateContentStream({
      model: 'gemini-3.8-flash',
      contents,
      config: {
        systemInstruction,
        temperature: 0.9,
        topP: 0.95,
      },
    });

    let fullText = '';
    for await (const chunk of responseStream) {
      const chunkText = chunk.text;
      if (chunkText) {
        fullText += chunkText;
        res.write(`data: ${JSON.stringify({ type: 'chunk', text: chunkText })}\n\n`);
      }
    }

    const vibe = detectVibe(fullText);
    res.write(`data: ${JSON.stringify({ type: 'done', fullText, vibe })}\n\n`);
    res.end();
  } catch (error: any) {
    console.error('Error streaming Vector response:', error);
    res.write(`data: ${JSON.stringify({ type: 'error', error: error?.message || 'Stream error' })}\n\n`);
    res.end();
  }
});

// POST /api/tts: Gemini Text-to-Speech using gemini-3.8-flash-lite-tts
app.post('/api/tts', async (req, res) => {
  try {
    const { text, voice = 'Kore' } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text is required for TTS' });
    }

    const cleanText = text
      .replace(
        /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu,
        ''
      )
      .replace(/\*+/g, '')
      .trim();

    if (!cleanText) {
      return res.status(400).json({ error: 'No text left after cleaning emojis' });
    }

    const validVoices = ['Kore', 'Puck', 'Zephyr', 'Fenrir', 'Charon'];
    const chosenVoice = validVoices.includes(voice) ? voice : 'Kore';

    const ttsResponse = await ai.models.generateContent({
      model: 'gemini-3.8-flash-lite-tts',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: cleanText,
              speechMetadata: {
                style: 'Warm, energetic, natural conversational companion with a friendly, upbeat tone',
              },
            },
          ],
        },
      ],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: chosenVoice },
          },
        },
      },
    });

    const base64Audio = ttsResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

    if (!base64Audio) {
      return res.status(500).json({ error: 'No audio returned from Gemini TTS' });
    }

    return res.json({
      audio: base64Audio,
      format: 'pcm',
      sampleRate: 24000,
      voice: chosenVoice,
    });
  } catch (error: any) {
    console.error('Error generating TTS:', error);
    return res.status(500).json({
      error: error?.message || 'TTS generation failed',
    });
  }
});

// Hook up Vite dev server or static files
if (process.env.NODE_ENV !== 'production') {
  const { createServer: createViteServer } = await import('vite');
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });
  app.use(vite.middlewares);
} else {
  app.use(express.static(path.resolve(__dirname, 'dist')));
  app.get('*', (_req, res) => {
    res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
  });
}

// Create HTTP server to attach both Express and WebSockets for Gemini Live API
const server = http.createServer(app);

// WebSocket Server for Gemini Live API (gemini-3.8-live)
const wss = new WebSocketServer({ server, path: '/live' });

wss.on('connection', async (clientWs: WebSocket, req) => {
  console.log('Client connected to /live WebSocket');

  // Extract optional query parameters like voice or userName
  const urlObj = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
  const requestedVoice = urlObj.searchParams.get('voice') || 'Zephyr';
  const userName = urlObj.searchParams.get('userName');

  const validVoices = ['Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'];
  const voiceName = validVoices.includes(requestedVoice) ? requestedVoice : 'Zephyr';

  const systemInstruction = userName
    ? `${VECTOR_SYSTEM_INSTRUCTION}\n\nNote: The user's name is "${userName}". Address them naturally.`
    : VECTOR_SYSTEM_INSTRUCTION;

  let session: any = null;

  try {
    session = await ai.live.connect({
      model: 'gemini-3.8-live',
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName } },
        },
        systemInstruction,
      },
      callbacks: {
        onmessage: (message: LiveServerMessage) => {
          if (clientWs.readyState !== WebSocket.OPEN) return;

          // Check for audio chunks
          const parts = message.serverContent?.modelTurn?.parts;
          if (parts) {
            for (const part of parts) {
              if (part.inlineData?.data) {
                clientWs.send(
                  JSON.stringify({
                    type: 'audio',
                    audio: part.inlineData.data,
                    mimeType: part.inlineData.mimeType,
                  })
                );
              }
              if (part.text) {
                clientWs.send(
                  JSON.stringify({
                    type: 'text',
                    text: part.text,
                  })
                );
              }
            }
          }

          // Check if user interrupted model speech
          if (message.serverContent?.interrupted) {
            clientWs.send(JSON.stringify({ type: 'interrupted' }));
          }

          if (message.serverContent?.turnComplete) {
            clientWs.send(JSON.stringify({ type: 'turnComplete' }));
          }
        },
        onclose: () => {
          console.log('Gemini Live session closed');
          if (clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(JSON.stringify({ type: 'sessionClosed' }));
          }
        },
        onerror: (err: any) => {
          console.error('Gemini Live session error:', err);
          if (clientWs.readyState === WebSocket.OPEN) {
            clientWs.send(
              JSON.stringify({
                type: 'error',
                message: err?.message || 'Live session error',
              })
            );
          }
        },
      },
    });

    clientWs.send(JSON.stringify({ type: 'ready', model: 'gemini-3.8-live', voice: voiceName }));
  } catch (connErr: any) {
    console.error('Failed to establish Gemini Live connection:', connErr);
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(
        JSON.stringify({
          type: 'error',
          message: connErr?.message || 'Failed to connect to Live API',
        })
      );
    }
    return;
  }

  // Handle incoming messages from client browser
  clientWs.on('message', (data) => {
    try {
      const parsed = JSON.parse(data.toString());

      // Realtime Audio from microphone (16kHz PCM base64)
      if (parsed.audio && session) {
        session.sendRealtimeInput({
          audio: {
            data: parsed.audio,
            mimeType: 'audio/pcm;rate=16000',
          },
        });
      }

      // Realtime Video from camera (JPEG base64)
      if (parsed.video && session) {
        session.sendRealtimeInput({
          video: {
            data: parsed.video,
            mimeType: 'image/jpeg',
          },
        });
      }

      // Spoken or typed prompt turn
      if (parsed.text && session) {
        session.send({
          clientContent: {
            turns: [
              {
                role: 'user',
                parts: [{ text: parsed.text }],
              },
            ],
            turnComplete: true,
          },
        });
      }
    } catch (e) {
      console.warn('Error processing client message:', e);
    }
  });

  clientWs.on('close', () => {
    console.log('Client disconnected from /live');
    if (session) {
      try {
        session.close();
      } catch (e) {}
    }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Vector companion server running at http://0.0.0.0:${PORT}`);
});
