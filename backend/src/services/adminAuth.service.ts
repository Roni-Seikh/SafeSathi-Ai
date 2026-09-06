import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AppError } from '../utils/AppError';
import { IAdminRepository } from '../repositories/admin.repository';

export interface AdminLoginResult {
  token: string;
  admin: { id: string; name: string; email: string; role: string };
}

export class AdminAuthService {
  constructor(private readonly adminRepository: IAdminRepository) {}

  async login(email: string, password: string): Promise<AdminLoginResult> {
    const admin = await this.adminRepository.findByEmailWithPassword(email);
    if (!admin) {
      throw new AppError('UNAUTHORIZED', 'Invalid email or password');
    }
    if (!admin.isActive) {
      throw new AppError('FORBIDDEN', 'This admin account has been deactivated');
    }

    const passwordMatches = await bcrypt.compare(password, admin.passwordHash);
    if (!passwordMatches) {
      throw new AppError('UNAUTHORIZED', 'Invalid email or password');
    }

    await this.adminRepository.updateLastLogin(String(admin._id));

    const token = jwt.sign({ adminId: String(admin._id), role: admin.role }, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN,
    } as jwt.SignOptions);

    return {
      token,
      admin: { id: String(admin._id), name: admin.name, email: admin.email, role: admin.role },
    };
  }
}
