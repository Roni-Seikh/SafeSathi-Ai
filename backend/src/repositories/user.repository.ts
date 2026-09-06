import User, { IUser } from '../models/User.model';
import { IGeoPoint, PaginatedResult } from '../types/common.types';

export interface IUserRepository {
  findById(id: string): Promise<IUser | null>;
  findByFirebaseUid(uid: string): Promise<IUser | null>;
  findByEmail(email: string): Promise<IUser | null>;
  findByPhone(phone: string): Promise<IUser | null>;
  create(data: Partial<IUser>): Promise<IUser>;
  updateById(id: string, data: Partial<IUser>): Promise<IUser | null>;
  updateLastKnownLocation(id: string, coordinates: [number, number]): Promise<void>;
  addFcmToken(id: string, token: string): Promise<void>;
  removeFcmToken(id: string, token: string): Promise<void>;
  removeFcmTokens(id: string, tokens: string[]): Promise<void>;
  deactivate(id: string): Promise<void>;
  /** Used by ReportService for proactive community alerts — everyone
   * within radius of the report who has opted in, excluding the
   * reporter themselves. */
  findNearbyOptedIn(point: IGeoPoint, radiusMeters: number, excludeUserId: string): Promise<IUser[]>;
  /** Admin-only listing — every user, not scoped to "the current user"
   * the way every other method on this interface is. */
  listAll(page: number, limit: number, search?: string): Promise<PaginatedResult<IUser>>;
  countTotal(): Promise<number>;
  countActive(): Promise<number>;
  setActiveStatus(id: string, isActive: boolean): Promise<IUser | null>;
}

class MongoUserRepository implements IUserRepository {
  async findById(id: string) {
    return User.findById(id);
  }

  async findByFirebaseUid(uid: string) {
    return User.findOne({ firebaseUid: uid });
  }

  async findByEmail(email: string) {
    return User.findOne({ email: email.toLowerCase() });
  }

  async findByPhone(phone: string) {
    return User.findOne({ phone });
  }

  async create(data: Partial<IUser>) {
    return User.create(data);
  }

  async updateById(id: string, data: Partial<IUser>) {
    return User.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  }

  async updateLastKnownLocation(id: string, coordinates: [number, number]) {
    await User.findByIdAndUpdate(id, {
      lastKnownLocation: { type: 'Point', coordinates },
      lastKnownLocationUpdatedAt: new Date(),
    });
  }

  async addFcmToken(id: string, token: string) {
    await User.findByIdAndUpdate(id, { $addToSet: { fcmTokens: token } });
  }

  async removeFcmToken(id: string, token: string) {
    await User.findByIdAndUpdate(id, { $pull: { fcmTokens: token } });
  }

  async removeFcmTokens(id: string, tokens: string[]) {
    await User.findByIdAndUpdate(id, { $pull: { fcmTokens: { $in: tokens } } });
  }

  async deactivate(id: string) {
    await User.findByIdAndUpdate(id, { isActive: false });
  }

  async findNearbyOptedIn(point: IGeoPoint, radiusMeters: number, excludeUserId: string) {
    return User.find({
      _id: { $ne: excludeUserId },
      isActive: true,
      'safetyPreferences.communityAlertsEnabled': true,
      lastKnownLocation: { $near: { $geometry: point, $maxDistance: radiusMeters } },
    });
  }

  async listAll(page: number, limit: number, search?: string) {
    const filter = search
      ? {
          $or: [
            { name: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
            { phone: { $regex: search, $options: 'i' } },
          ],
        }
      : {};
    const [items, total] = await Promise.all([
      User.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      User.countDocuments(filter),
    ]);
    return { items, total };
  }

  async countTotal() {
    return User.countDocuments({});
  }

  async countActive() {
    return User.countDocuments({ isActive: true });
  }

  async setActiveStatus(id: string, isActive: boolean) {
    return User.findByIdAndUpdate(id, { isActive }, { new: true });
  }
}

export const userRepository: IUserRepository = new MongoUserRepository();
