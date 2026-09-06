import { IUser } from '../models/User.model';
import { IUserRepository } from '../repositories/user.repository';
import { AppError } from '../utils/AppError';

export interface RegisterInput {
  firebaseUid: string;
  name: string;
  email: string;
  phone: string;
}

export class AuthService {
  constructor(private readonly userRepository: IUserRepository) {}

  /**
   * Idempotent — if a User already exists for this Firebase UID, returns
   * it instead of erroring, so a retried register call after a flaky
   * network response doesn't attempt to create a duplicate account.
   */
  async register(input: RegisterInput): Promise<{ user: IUser; isNewUser: boolean }> {
    const existing = await this.userRepository.findByFirebaseUid(input.firebaseUid);
    if (existing) {
      return { user: existing, isNewUser: false };
    }

    const emailTaken = await this.userRepository.findByEmail(input.email);
    if (emailTaken) {
      throw new AppError('CONFLICT', 'An account already exists with this email');
    }
    const phoneTaken = await this.userRepository.findByPhone(input.phone);
    if (phoneTaken) {
      throw new AppError('CONFLICT', 'An account already exists with this phone number');
    }

    const user = await this.userRepository.create({
      firebaseUid: input.firebaseUid,
      name: input.name,
      email: input.email,
      phone: input.phone,
      // Firebase Phone Auth already verified this number before the
      // client ever calls this endpoint.
      isPhoneVerified: true,
    });

    return { user, isNewUser: true };
  }

  async login(firebaseUid: string): Promise<IUser> {
    const user = await this.userRepository.findByFirebaseUid(firebaseUid);
    if (!user) {
      throw new AppError('NOT_FOUND', 'No SafeSathi account found for this login — please register first');
    }
    if (!user.isActive) {
      throw new AppError('FORBIDDEN', 'This account has been deactivated');
    }
    return user;
  }

  async logout(userId: string, fcmToken?: string): Promise<void> {
    if (fcmToken) {
      await this.userRepository.removeFcmToken(userId, fcmToken);
    }
  }
}
