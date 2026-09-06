import Notification, { INotification } from '../models/Notification.model';
import { PaginatedResult } from '../types/common.types';

export interface INotificationRepository {
  create(data: Partial<INotification>): Promise<INotification>;
  findForUser(userId: string, page: number, limit: number): Promise<PaginatedResult<INotification>>;
  markDelivered(id: string): Promise<void>;
  markReadForUser(userId: string, id: string): Promise<void>;
  markAllRead(userId: string): Promise<void>;
  countUnread(userId: string): Promise<number>;
}

class MongoNotificationRepository implements INotificationRepository {
  async create(data: Partial<INotification>) {
    return Notification.create(data);
  }

  async findForUser(userId: string, page: number, limit: number) {
    const [items, total] = await Promise.all([
      Notification.find({ userId })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Notification.countDocuments({ userId }),
    ]);
    return { items, total };
  }

  async markDelivered(id: string) {
    await Notification.findByIdAndUpdate(id, { deliveryStatus: 'sent' });
  }

  async markReadForUser(userId: string, id: string) {
    await Notification.updateOne({ _id: id, userId }, { isRead: true, readAt: new Date() });
  }

  async markAllRead(userId: string) {
    await Notification.updateMany({ userId, isRead: false }, { isRead: true, readAt: new Date() });
  }

  async countUnread(userId: string) {
    return Notification.countDocuments({ userId, isRead: false });
  }
}

export const notificationRepository: INotificationRepository = new MongoNotificationRepository();
