import { Types } from 'mongoose';
import { ILocation } from '../models/Location.model';
import { ILocationRepository } from '../repositories/location.repository';
import { IEmergencyContactRepository } from '../repositories/emergencyContact.repository';
import { IUserRepository } from '../repositories/user.repository';
import { NotificationService } from './notification.service';
import { getSocketServer, locationRoom } from '../realtime/socketServer';
import { AppError } from '../utils/AppError';
import { PaginatedResult, IGeoPoint } from '../types/common.types';

export interface RecordLocationInput {
  userId: string;
  coordinates: IGeoPoint;
  accuracy?: number;
  speed?: number;
  heading?: number;
  altitude?: number;
  batteryLevel?: number;
  sosLogId?: string;
}

export class LocationService {
  constructor(
    private readonly locationRepository: ILocationRepository,
    private readonly contactRepository: IEmergencyContactRepository,
    private readonly userRepository: IUserRepository,
    private readonly notificationService: NotificationService
  ) {}

  /** Records a point, updates the user's lastKnownLocation, and — if
   * sharing is currently active — broadcasts it over the socket room to
   * whoever is watching. This is the single write path used both by the
   * explicit "share my location" feature and by the continuous stream an
   * active SOS starts automatically. */
  async recordLocation(input: RecordLocationInput): Promise<ILocation> {
    const user = await this.userRepository.findById(input.userId);
    if (!user) throw new AppError('NOT_FOUND', 'User not found');

    const point = await this.locationRepository.create({
      userId: new Types.ObjectId(input.userId),
      sosLogId: input.sosLogId ? new Types.ObjectId(input.sosLogId) : undefined,
      coordinates: input.coordinates,
      accuracy: input.accuracy,
      speed: input.speed,
      heading: input.heading,
      altitude: input.altitude,
      batteryLevel: input.batteryLevel,
      isSharing: user.locationSharing.isActive,
      sharedWithContactIds: user.locationSharing.isActive ? user.locationSharing.sharedWithUserIds : [],
      recordedAt: new Date(),
    });

    await this.userRepository.updateLastKnownLocation(input.userId, input.coordinates.coordinates);

    if (user.locationSharing.isActive) {
      getSocketServer()
        .to(locationRoom(input.userId))
        .emit('location:update', {
          sharerUserId: input.userId,
          coordinates: input.coordinates.coordinates,
          accuracy: input.accuracy,
          batteryLevel: input.batteryLevel,
          recordedAt: point.recordedAt,
        });
    }

    return point;
  }

  /**
   * Starts a sharing session. `contactIds` (EmergencyContact _ids) is
   * optional — when omitted, every linked contact with notifyOnSOS
   * enabled is used, which is how SOSService auto-starts sharing the
   * moment an SOS fires without the caller needing to know the contact
   * list itself.
   */
  async startSharing(userId: string, contactIds?: string[]): Promise<{ sharedWithUserIds: string[] }> {
    const contacts = contactIds
      ? await Promise.all(contactIds.map((id) => this.contactRepository.findById(id)))
      : await this.contactRepository.findAllForUser(userId);

    const eligible = contacts.filter(
      (contact): contact is NonNullable<typeof contact> =>
        !!contact && contact.userId.toString() === userId && !!contact.linkedUserId && (contactIds ? true : contact.notifyOnSOS)
    );

    const sharedWithUserIds = eligible.map((contact) => contact.linkedUserId as Types.ObjectId);

    await this.userRepository.updateById(userId, {
      locationSharing: { isActive: true, sharedWithUserIds, startedAt: new Date() },
    });

    const sharer = await this.userRepository.findById(userId);
    if (sharer) {
      for (const viewerId of sharedWithUserIds) {
        await this.notificationService.sendToUser({
          userId: viewerId.toString(),
          type: 'location_share_started',
          title: `${sharer.name} is sharing their live location`,
          body: 'Tap to view their location in real time.',
          data: { sharerUserId: userId },
        });
      }
    }

    return { sharedWithUserIds: sharedWithUserIds.map(String) };
  }

  async stopSharing(userId: string): Promise<void> {
    await this.userRepository.updateById(userId, {
      locationSharing: { isActive: false, sharedWithUserIds: [], startedAt: undefined },
    });
    getSocketServer().to(locationRoom(userId)).emit('location:sharing-stopped', { sharerUserId: userId });
  }

  async getLiveLocation(sharerUserId: string, requesterId: string): Promise<ILocation> {
    const sharer = await this.userRepository.findById(sharerUserId);
    if (!sharer) throw new AppError('NOT_FOUND', 'User not found');

    const authorized =
      sharer.locationSharing.isActive &&
      sharer.locationSharing.sharedWithUserIds.some((id) => id.toString() === requesterId);
    if (!authorized) {
      throw new AppError('FORBIDDEN', 'This user is not currently sharing their location with you');
    }

    const latest = await this.locationRepository.findLatestForUser(sharerUserId);
    if (!latest) throw new AppError('NOT_FOUND', 'No location has been recorded yet');
    return latest;
  }

  async getHistory(userId: string, page: number, limit: number): Promise<PaginatedResult<ILocation>> {
    return this.locationRepository.findHistoryForUser(userId, page, limit);
  }
}
