import { logger } from '../utils/logger';

export interface ISmsGateway {
  send(to: string, message: string): Promise<{ status: 'sent' | 'failed' }>;
}

/**
 * Default SMS gateway used until a real provider is wired in. It logs the
 * outbound message the way a real gateway's dashboard would, and reports
 * success — this keeps the SOS notification pipeline fully functional in
 * development/demo without a paid SMS account.
 *
 * To go live with a real provider (Twilio, MSG91, etc.): implement
 * ISmsGateway against that provider's SDK and swap the `smsGateway` export
 * below — NotificationService and every other caller depends only on the
 * ISmsGateway interface, not this class, so nothing else changes.
 */
export class LoggingSmsGateway implements ISmsGateway {
  async send(to: string, message: string): Promise<{ status: 'sent' | 'failed' }> {
    logger.info('SMS dispatched (logging gateway)', { to, message });
    return { status: 'sent' };
  }
}

export const smsGateway: ISmsGateway = new LoggingSmsGateway();
