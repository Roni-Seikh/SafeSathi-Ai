import { Types } from 'mongoose';
import { ISOSLog, INotifiedContact, SOSTriggerType } from '../models/SOSLog.model';
import { ISOSLogRepository } from '../repositories/sosLog.repository';
import { IEmergencyContactRepository } from '../repositories/emergencyContact.repository';
import { IUserRepository } from '../repositories/user.repository';
import { NotificationService } from './notification.service';
import { LocationService } from './location.service';
import { AppError } from '../utils/AppError';
import { PaginatedResult, IGeoPoint } from '../types/common.types';

export interface TriggerSOSInput {
  userId: string;
  triggerType: SOSTriggerType;
  location: IGeoPoint;
  batteryLevel?: number;
  deviceInfo?: string;
  safeScoreAtTrigger?: number;
  voiceLogId?: string;
  sensorLogId?: string;
}

export class SOSService {
  constructor(
    private readonly sosLogRepository: ISOSLogRepository,
    private readonly contactRepository: IEmergencyContactRepository,
    private readonly userRepository: IUserRepository,
    private readonly notificationService: NotificationService,
    private readonly locationService: LocationService
  ) {}

  /**
   * The single entry point every trigger source (manual button, voice
   * keyword, tone analysis, motion detection, admin override) ultimately
   * calls — see docs/architecture/ARCHITECTURE.md §11 for the full
   * sequence diagram. Idempotent per user: a second trigger while one is
   * already active returns the existing event rather than starting a
   * concurrent one.
   */
  async trigger(input: TriggerSOSInput): Promise<ISOSLog> {
    const existingActive = await this.sosLogRepository.findActiveForUser(input.userId);
    if (existingActive) {
      return existingActive;
    }

    const sosLog = await this.sosLogRepository.create({
      userId: new Types.ObjectId(input.userId),
      triggerType: input.triggerType,
      status: 'active',
      location: input.location,
      batteryLevel: input.batteryLevel,
      deviceInfo: input.deviceInfo,
      safeScoreAtTrigger: input.safeScoreAtTrigger,
      voiceLogId: input.voiceLogId ? new Types.ObjectId(input.voiceLogId) : undefined,
      sensorLogId: input.sensorLogId ? new Types.ObjectId(input.sensorLogId) : undefined,
      triggeredAt: new Date(),
    });

    // Auto-start live location sharing with every linked contact who
    // wants SOS alerts — this is what makes the SOS Active screen's
    // "your contacts can see you moving in real time" promise true
    // without the user having to separately hit "share location".
    await this.locationService.startSharing(input.userId);
    await this.notifyEmergencyContacts(input.userId, sosLog, 'sos_alert');

    return sosLog;
  }

  async getActive(userId: string): Promise<ISOSLog | null> {
    return this.sosLogRepository.findActiveForUser(userId);
  }

  async getHistory(userId: string, page: number, limit: number): Promise<PaginatedResult<ISOSLog>> {
    return this.sosLogRepository.findHistoryForUser(userId, page, limit);
  }

  async resolve(userId: string, sosId: string, resolvedBy: ISOSLog['resolvedBy'] = 'user'): Promise<ISOSLog> {
    const sosLog = await this.assertOwnedSOS(userId, sosId);
    const updated = await this.sosLogRepository.updateStatus(String(sosLog._id), 'resolved', resolvedBy);
    if (!updated) throw new AppError('NOT_FOUND', 'SOS event not found');
    await this.locationService.stopSharing(userId);
    return updated;
  }

  async markFalseAlarm(userId: string, sosId: string): Promise<ISOSLog> {
    const sosLog = await this.assertOwnedSOS(userId, sosId);
    const updated = await this.sosLogRepository.updateStatus(String(sosLog._id), 'false_alarm', 'user');
    if (!updated) throw new AppError('NOT_FOUND', 'SOS event not found');
    await this.locationService.stopSharing(userId);
    return updated;
  }

  /** Resolves any active SOS and tells every emergency contact the user
   * is safe now — the "I'm Safe" button's backing action. */
  async sendImSafe(userId: string): Promise<void> {
    const active = await this.sosLogRepository.findActiveForUser(userId);
    if (active) {
      await this.sosLogRepository.updateStatus(String(active._id), 'resolved', 'user');
    }
    await this.locationService.stopSharing(userId);
    await this.notifyEmergencyContacts(userId, active, 'im_safe');
  }

  private async assertOwnedSOS(userId: string, sosId: string): Promise<ISOSLog> {
    const sosLog = await this.sosLogRepository.findById(sosId);
    if (!sosLog || sosLog.userId.toString() !== userId) {
      throw new AppError('NOT_FOUND', 'SOS event not found');
    }
    return sosLog;
  }

  private async notifyEmergencyContacts(
    userId: string,
    sosLog: ISOSLog | null,
    type: 'sos_alert' | 'im_safe'
  ): Promise<void> {
    const [user, contacts] = await Promise.all([
      this.userRepository.findById(userId),
      this.contactRepository.findAllForUser(userId),
    ]);
    if (!user) return;

    const title = type === 'sos_alert' ? `SOS from ${user.name}` : `${user.name} is safe`;
    const body =
      type === 'sos_alert'
        ? `${user.name} may need help. Tap to view their live location.`
        : `${user.name} has marked themselves safe.`;

    for (const contact of contacts) {
      const shouldNotify = type === 'sos_alert' ? contact.notifyOnSOS : contact.notifyOnImSafe;
      if (!shouldNotify) continue;

      let channel: INotifiedContact['channel'] = 'sms';

      if (contact.linkedUserId) {
        await this.notificationService.sendToUser({
          userId: contact.linkedUserId.toString(),
          type,
          title,
          body,
          data: sosLog ? { sosLogId: String(sosLog._id), sharerUserId: userId } : { sharerUserId: userId },
        });
        channel = 'push';
      } else {
        await this.notificationService.sendSms(contact.phone, `${title} — ${body}`);
      }

      if (sosLog) {
        const entry: INotifiedContact = {
          contactId: contact._id as unknown as Types.ObjectId,
          channel,
          notifiedAt: new Date(),
          deliveryStatus: 'sent',
        };
        await this.sosLogRepository.addNotifiedContact(String(sosLog._id), entry);
      }
    }
  }
}
