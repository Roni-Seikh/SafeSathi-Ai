import { firebaseMessaging } from '../config/firebase';
import { logger } from '../utils/logger';

export interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

export class FirebaseMessagingService {
  /**
   * Sends to every token for a user. Firebase reports back which tokens
   * are no longer registered (app uninstalled, etc.) — those are returned
   * so the caller can prune them from the User document, rather than
   * this service reaching into the User repository itself.
   */
  async sendToTokens(tokens: string[], payload: PushPayload): Promise<{ invalidTokens: string[] }> {
    if (tokens.length === 0) return { invalidTokens: [] };

    const invalidTokens: string[] = [];

    await Promise.all(
      tokens.map(async (token) => {
        try {
          await firebaseMessaging.send({
            token,
            notification: { title: payload.title, body: payload.body },
            data: payload.data,
            android: { priority: 'high' },
            apns: { headers: { 'apns-priority': '10' } },
          });
        } catch (error) {
          const code = (error as { code?: string }).code;
          if (code === 'messaging/registration-token-not-registered') {
            invalidTokens.push(token);
          } else {
            logger.error('FCM send failed', {
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }
      })
    );

    return { invalidTokens };
  }
}

export const firebaseMessagingService = new FirebaseMessagingService();
