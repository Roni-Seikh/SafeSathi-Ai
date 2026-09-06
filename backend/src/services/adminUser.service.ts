import { IUser } from '../models/User.model';
import { IUserRepository } from '../repositories/user.repository';
import { AppError } from '../utils/AppError';
import { PaginatedResult } from '../types/common.types';

export class AdminUserService {
  constructor(private readonly userRepository: IUserRepository) {}

  async list(page: number, limit: number, search?: string): Promise<PaginatedResult<IUser>> {
    return this.userRepository.listAll(page, limit, search);
  }

  async setActiveStatus(userId: string, isActive: boolean): Promise<IUser> {
    const updated = await this.userRepository.setActiveStatus(userId, isActive);
    if (!updated) throw new AppError('NOT_FOUND', 'User not found');
    return updated;
  }
}
