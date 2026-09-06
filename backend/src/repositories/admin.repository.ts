import Admin, { IAdmin } from '../models/Admin.model';

export interface IAdminRepository {
  findById(id: string): Promise<IAdmin | null>;
  findByEmailWithPassword(email: string): Promise<IAdmin | null>;
  updateLastLogin(id: string): Promise<void>;
}

class MongoAdminRepository implements IAdminRepository {
  async findById(id: string) {
    return Admin.findById(id);
  }

  async findByEmailWithPassword(email: string) {
    return Admin.findOne({ email: email.toLowerCase() }).select('+passwordHash');
  }

  async updateLastLogin(id: string) {
    await Admin.findByIdAndUpdate(id, { lastLoginAt: new Date() });
  }
}

export const adminRepository: IAdminRepository = new MongoAdminRepository();
