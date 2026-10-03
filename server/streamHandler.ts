import { InMemoryRunner, LiveRequestQueue, type RunConfig } from '@google/adk';
import { Modality, type Blob, type Content } from '@google/genai';

import { rootAgent, vivaContext } from '../viva-agent/agent.js';

type MediaPayload =
  | { type: 'audio'; chunk: Buffer | ArrayBuffer | Uint8Array }
  | { type: 'image'; chunk: Buffer | ArrayBuffer | Uint8Array; mimeType?: string };

interface VivaSocket {
  data: { candidateName?: string };
  on(event: string, listener: (...args: never[]) => void): this;
  off(event: string, listener: (...args: never[]) => void): this;
  emit(event: string, ...args: unknown[]): this;
}

function toBuffer(value: Buffer | ArrayBuffer | Uint8Array): Buffer {
  if (Buffer.isBuffer(value)) return value;
  return value instanceof ArrayBuffer
    ? Buffer.from(value)
    : Buffer.from(value.buffer, value.byteOffset, value.byteLength);
}

function toBlob(payload: MediaPayload): Blob {
  const data = toBuffer(payload.chunk).toString('base64');
  return payload.type === 'audio'
    ? { data, mimeType: 'audio/pcm;rate=16000' }
    : { data, mimeType: payload.mimeType ?? 'image/jpeg' };
}

const runner = new InMemoryRunner({ appName: 'frcs_urology_viva', agent: rootAgent });

/**
 * Bridges Socket.IO media events to ADK's supported live request queue.
 * Audio is expected to be mono 16 kHz linear PCM; video is JPEG at about 1 FPS.
 */
export async function handleVivaSession(
  clientSocket: VivaSocket,
  userId: string,
  sessionId: string,
): Promise<void> {
  const requestQueue = new LiveRequestQueue();
  const runConfig: RunConfig = {
    enableAffectiveDialog: true,
    responseModalities: [Modality.AUDIO],
    outputAudioTranscription: {},
  };

  const liveStream = runner.runLive({ userId, sessionId, runConfig, liveRequestQueue: requestQueue });

  // A first user turn prompts the model to start rapport immediately on connect.
  const candidateName = clientSocket.data.candidateName?.trim() || 'candidate';
  const kickoff: Content = {
    role: 'user',
    parts: [{ text: `The candidate's name is ${candidateName}. Begin the viva now with your required brief rapport greeting.` }],
  };
  requestQueue.sendContent(kickoff);

  const onMedia = (payload: MediaPayload): void => {
    requestQueue.sendRealtime(toBlob(payload));
  };
  const onFinishedSpeaking = (): void => requestQueue.sendActivityEnd();
  const onExhibitRequested = (exhibitId: string): void => {
    const exhibit = vivaContext.exhibits.find((item) => item.id === exhibitId);
    if (!exhibit) return;
    // A separate signal lets the host application deliver the protected asset.
    clientSocket.emit('viva-exhibit-requested', {
      caseId: vivaContext.case.id,
      exhibitId: exhibit.id,
      label: exhibit.label,
      file: exhibit.file,
    });
  };

  clientSocket.on('client-media-stream', onMedia as (...args: never[]) => void);
  clientSocket.on('student-finished-speaking', onFinishedSpeaking);
  clientSocket.on('candidate-request-exhibit', onExhibitRequested);

  try {
    for await (const event of liveStream) {
      if (event.content?.parts) {
        for (const part of event.content.parts) {
          if (part.inlineData?.mimeType?.startsWith('audio/')) {
            clientSocket.emit('agent-audio-out', Buffer.from(part.inlineData.data ?? '', 'base64'));
          }
        }
      }

      if (event.outputTranscription?.text) {
        clientSocket.emit('agent-transcript', event.outputTranscription.text);
      }

      if (event.interrupted) {
        clientSocket.emit('ai-interrupted');
      }
    }
  } catch (error) {
    console.error('Real-time viva session error:', error);
    clientSocket.emit('viva-session-error', { message: 'The viva session encountered an error.' });
  } finally {
    clientSocket.off('client-media-stream', onMedia as (...args: never[]) => void);
    clientSocket.off('student-finished-speaking', onFinishedSpeaking);
    clientSocket.off('candidate-request-exhibit', onExhibitRequested);
    requestQueue.close();
  }
}
