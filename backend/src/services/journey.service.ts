import { Types } from 'mongoose';
import Journey, { IJourney, JourneyMode } from '../models/Journey.model';
import SOSLog from '../models/SOSLog.model';
import { IGeoPoint } from '../types/common.types';
import { IEmergencyContactRepository } from '../repositories/emergencyContact.repository';
import { IUserRepository } from '../repositories/user.repository';
import { NotificationService } from './notification.service';
import { SOSService } from './sos.service';
import { AppError } from '../utils/AppError';
import { env } from '../config/env';
import { logger } from '../utils/logger';

const ARRIVAL_RADIUS_M = 60;
const SIGNAL_LOST_MS = 10 * 60 * 1000;

export function haversineMeters(a: [number, number], b: [number, number]): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b[1] - a[1]);
  const dLng = toRad(b[0] - a[0]);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a[1])) * Math.cos(toRad(b[1])) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

export interface StartJourneyInput {
  userId: string;
  mode: JourneyMode;
  destinationName: string;
  destination: IGeoPoint;
  start: IGeoPoint;
  etaMinutes: number;
  graceMinutes?: number;
  vehicleNumber?: string;
  driverName?: string;
}

export class JourneyService {
  private timer?: NodeJS.Timeout;

  constructor(
    private readonly contactRepository: IEmergencyContactRepository,
    private readonly userRepository: IUserRepository,
    private readonly notificationService: NotificationService,
    private readonly sosService: SOSService
  ) {}

  async start(input: StartJourneyInput): Promise<IJourney> {
    const open = await Journey.findOne({ userId: input.userId, status: { $in: ['active', 'prompted'] } });
    if (open) throw new AppError('CONFLICT', 'You already have a journey in progress. Finish or cancel it first.');
    const now = Date.now();
    return Journey.create({
      userId: new Types.ObjectId(input.userId),
      mode: input.mode,
      destinationName: input.destinationName,
      destination: input.destination,
      start: input.start,
      lastLocation: input.start,
      lastLocationAt: new Date(now),
      remainingMeters: haversineMeters(input.start.coordinates, input.destination.coordinates),
      etaAt: new Date(now + input.etaMinutes * 60 * 1000),
      graceMinutes: input.graceMinutes ?? 5,
      vehicleNumber: input.vehicleNumber,
      driverName: input.driverName,
    });
  }

  async getActive(userId: string): Promise<IJourney | null> {
    return Journey.findOne({ userId, status: { $in: ['active', 'prompted'] } }).sort({ startedAt: -1 });
  }

  async history(userId: string, limit = 20): Promise<IJourney[]> {
    return Journey.find({ userId }).sort({ startedAt: -1 }).limit(limit);
  }

  private async own(userId: string, id: string): Promise<IJourney> {
    if (!Types.ObjectId.isValid(id)) throw new AppError('NOT_FOUND', 'Journey not found');
    const j = await Journey.findById(id);
    if (!j || j.userId.toString() !== userId) throw new AppError('NOT_FOUND', 'Journey not found');
    return j;
  }

  /** Called every ~15-30 s by the phone. Also auto-detects arrival. */
  async ping(userId: string, id: string, point: IGeoPoint): Promise<IJourney> {
    const j = await this.own(userId, id);
    if (j.status !== 'active' && j.status !== 'prompted') return j;
    j.lastLocation = point;
    j.lastLocationAt = new Date();
    j.remainingMeters = haversineMeters(point.coordinates, j.destination.coordinates);
    await j.save();
    if (j.remainingMeters <= ARRIVAL_RADIUS_M) return this.arrive(userId, id, true);
    return j;
  }

  /** "Yes, I'm fine" — answers the watchdog prompt and buys more time. */
  async confirmOk(userId: string, id: string, extendMinutes = 10): Promise<IJourney> {
    const j = await this.own(userId, id);
    if (j.status !== 'active' && j.status !== 'prompted') throw new AppError('CONFLICT', 'Journey is no longer active');
    j.status = 'active';
    j.promptedAt = undefined;
    j.etaAt = new Date(Math.max(j.etaAt.getTime(), Date.now()) + extendMinutes * 60 * 1000);
    j.lastLocationAt = new Date();
    return j.save();
  }

  async extend(userId: string, id: string, minutes: number): Promise<IJourney> {
    return this.confirmOk(userId, id, minutes);
  }

  async arrive(userId: string, id: string, auto = false): Promise<IJourney> {
    const j = await this.own(userId, id);
    if (j.status === 'arrived') return j;
    if (j.status !== 'active' && j.status !== 'prompted') throw new AppError('CONFLICT', 'Journey is no longer active');
    j.status = 'arrived';
    j.arrivedAt = new Date();
    await j.save();
    await this.notifyContacts(userId, 'im_safe', 'Reached safely', (n) => `${n} reached ${j.destinationName} safely${auto ? ' (auto-detected)' : ''}.`);
    return j;
  }

  /** `duress` = the user typed the secret duress PIN. The client shows a normal
   * "journey cancelled" screen but we silently raise a real SOS. */
  async cancel(userId: string, id: string, duress = false): Promise<IJourney> {
    const j = await this.own(userId, id);
    if (duress) {
      await this.escalate(j, true);
      return j;
    }
    if (j.status === 'active' || j.status === 'prompted') {
      j.status = 'cancelled';
      await j.save();
    }
    return j;
  }

  private async notifyContacts(userId: string, type: 'im_safe' | 'sos_alert', title: string, body: (name: string) => string) {
    const [user, contacts] = await Promise.all([this.userRepository.findById(userId), this.contactRepository.findAllForUser(userId)]);
    if (!user) return;
    const text = body(user.name);
    for (const c of contacts) {
      if (!c.notifyOnImSafe) continue;
      try {
        if (c.linkedUserId) await this.notificationService.sendToUser({ userId: c.linkedUserId.toString(), type, title, body: text, data: { sharerUserId: userId } });
        else await this.notificationService.sendSms(c.phone, `${title} — ${text}`);
      } catch (err) {
        logger.warn('Journey contact notification failed', { error: err instanceof Error ? err.message : String(err) });
      }
    }
  }

  private async escalate(j: IJourney, duress: boolean): Promise<void> {
    const point = j.lastLocation ?? j.start;
    const sos = await this.sosService.trigger({ userId: j.userId.toString(), triggerType: 'journey', location: point });
    await SOSLog.findByIdAndUpdate(sos._id, { journeyId: j._id, ...(duress ? { duress: true } : {}) });
    j.status = 'escalated';
    j.escalatedAt = new Date();
    j.sosLogId = sos._id as Types.ObjectId;
    await j.save();
  }

  /** One watchdog pass. Stage 1: overdue / silent → push "are you OK?".
   *  Stage 2: no answer within JOURNEY_PROMPT_TIMEOUT_MS → real SOS. */
  async runWatchdog(now = Date.now()): Promise<void> {
    const active = await Journey.find({ status: 'active' });
    for (const j of active) {
      const overdue = now > j.etaAt.getTime() + j.graceMinutes * 60 * 1000;
      const silent = j.lastLocationAt ? now - j.lastLocationAt.getTime() > SIGNAL_LOST_MS : false;
      if (!overdue && !silent) continue;
      j.status = 'prompted';
      j.promptedAt = new Date(now);
      await j.save();
      try {
        await this.notificationService.sendToUser({
          userId: j.userId.toString(),
          type: 'system',
          title: overdue ? 'Are you OK?' : 'We lost your signal',
          body: 'Open SafeSathi and tap "I\'m OK" within 2 minutes or your contacts will be alerted.',
          data: { journeyId: String(j._id), action: 'journey_prompt' },
        });
      } catch (err) {
        logger.warn('Journey prompt push failed', { error: err instanceof Error ? err.message : String(err) });
      }
    }

    const prompted = await Journey.find({ status: 'prompted' });
    for (const j of prompted) {
      if (j.promptedAt && now - j.promptedAt.getTime() >= env.JOURNEY_PROMPT_TIMEOUT_MS) {
        try {
          await this.escalate(j, false);
          logger.warn('Guardian Journey escalated to SOS', { journeyId: String(j._id) });
        } catch (err) {
          logger.error('Journey escalation failed', { error: err instanceof Error ? err.message : String(err) });
        }
      }
    }
  }

  startWatchdog(): void {
    if (this.timer) return;
    this.timer = setInterval(() => {
      this.runWatchdog().catch((e) => logger.error('Journey watchdog error', { error: e instanceof Error ? e.message : String(e) }));
    }, env.JOURNEY_WATCHDOG_MS);
    this.timer.unref();
    logger.info(`Guardian Journey watchdog running every ${env.JOURNEY_WATCHDOG_MS / 1000}s`);
  }
}
