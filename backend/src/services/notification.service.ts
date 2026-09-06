import { Types } from 'mongoose';
import { INotification, NotificationType } from '../models/Notification.model';
import { INotificationRepository } from '../repositories/notification.repository';
import { IUserRepository } from '../repositories/user.repository';
import { firebaseMessagingService } from './firebaseMessaging.service';
import { smsGateway } from './sms.service';
import { PaginatedResult } from '../types/common.types';

export interface SendToUserInput {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, string>;
}

export class NotificationService {
  constructor(
    private readonly notificationRepository: INotificationRepository,
    private readonly userRepository: IUserRepository
  ) {}

  /** Records the notification and pushes it via FCM to every registered
   * device for the user, pruning any tokens Firebase reports as dead. */
  async sendToUser(input: SendToUserInput): Promise<INotification> {
    const record = await this.notificationRepository.create({
      userId: new Types.ObjectId(input.userId),
      type: input.type,
      title: input.title,
      body: input.body,
      data: input.data,
      channel: 'push',
      deliveryStatus: 'pending',
    });

    const user = await this.userRepository.findById(input.userId);
    if (user && user.fcmTokens.length > 0) {
      const { invalidTokens } = await firebaseMessagingService.sendToTokens(user.fcmTokens, {
        title: input.title,
        body: input.body,
        data: input.data,
      });
      if (invalidTokens.length > 0) {
        await this.userRepository.removeFcmTokens(input.userId, invalidTokens);
      }
    }

    await this.notificationRepository.markDelivered(String(record._id));
    return record;
  }

  /** Notifies someone who is on file as an emergency contact but is not
   * necessarily a SafeSathi user themselves — SMS is the only channel
   * guaranteed to reach them. */
  async sendSms(phone: string, message: string): Promise<{ status: 'sent' | 'failed' }> {
    return smsGateway.send(phone, message);
  }

  async listForUser(userId: string, page: number, limit: number): Promise<PaginatedResult<INotification>> {
    return this.notificationRepository.findForUser(userId, page, limit);
  }

  async markRead(userId: string, notificationId: string): Promise<void> {
    await this.notificationRepository.markReadForUser(userId, notificationId);
  }

  async markAllRead(userId: string): Promise<void> {
    await this.notificationRepository.markAllRead(userId);
  }
}
