import { IUser } from '../models/User.model';
import { IUserRepository } from '../repositories/user.repository';
import { AppError } from '../utils/AppError';
import { firebaseBucket } from '../config/firebase';

export interface UpdateProfileInput {
  name?: string;
  dateOfBirth?: Date;
  gender?: IUser['gender'];
  address?: Partial<IUser['address']>;
  preferredLanguage?: IUser['preferredLanguage'];
}

export interface UpdateMedicalInfoInput {
  bloodGroup?: IUser['medicalInfo']['bloodGroup'];
  allergies?: string[];
  conditions?: string[];
  medications?: string[];
  organDonor?: boolean;
}

export class UserService {
  constructor(private readonly userRepository: IUserRepository) {}

  async getProfile(userId: string): Promise<IUser> {
    const user = await this.userRepository.findById(userId);
    if (!user) throw new AppError('NOT_FOUND', 'User not found');
    return user;
  }

  async updateProfile(userId: string, input: UpdateProfileInput): Promise<IUser> {
    const user = await this.getProfile(userId);
    const mergedAddress = input.address ? { ...user.address, ...input.address } : user.address;

    const updated = await this.userRepository.updateById(userId, {
      ...input,
      address: mergedAddress,
    } as Partial<IUser>);
    if (!updated) throw new AppError('NOT_FOUND', 'User not found');
    return updated;
  }

  async updateMedicalInfo(userId: string, input: UpdateMedicalInfoInput): Promise<IUser> {
    const user = await this.getProfile(userId);
    const merged = { ...user.medicalInfo, ...input };
    const updated = await this.userRepository.updateById(userId, { medicalInfo: merged } as Partial<IUser>);
    if (!updated) throw new AppError('NOT_FOUND', 'User not found');
    return updated;
  }

  async updateSafetyPreferences(userId: string, input: Partial<IUser['safetyPreferences']>): Promise<IUser> {
    const user = await this.getProfile(userId);
    const merged = { ...user.safetyPreferences, ...input };
    const updated = await this.userRepository.updateById(userId, { safetyPreferences: merged } as Partial<IUser>);
    if (!updated) throw new AppError('NOT_FOUND', 'User not found');
    return updated;
  }

  async registerFcmToken(userId: string, token: string): Promise<void> {
    await this.userRepository.addFcmToken(userId, token);
  }

  async removeFcmToken(userId: string, token: string): Promise<void> {
    await this.userRepository.removeFcmToken(userId, token);
  }

  /** Returns a short-lived signed Firebase Storage URL the mobile app
   * uploads the avatar image to directly — the binary never passes
   * through this API. */
  async getAvatarUploadUrl(userId: string, contentType: string): Promise<{ uploadUrl: string; publicPath: string }> {
    const path = `users/${userId}/avatar-${Date.now()}`;
    const file = firebaseBucket.file(path);
    const [uploadUrl] = await file.getSignedUrl({
      version: 'v4',
      action: 'write',
      expires: Date.now() + 15 * 60 * 1000,
      contentType,
    });
    return { uploadUrl, publicPath: path };
  }

  async deactivateAccount(userId: string): Promise<void> {
    await this.userRepository.deactivate(userId);
  }
}
