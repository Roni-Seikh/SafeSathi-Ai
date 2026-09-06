import EmergencyContact, { IEmergencyContact } from '../models/EmergencyContact.model';

export interface IEmergencyContactRepository {
  findAllForUser(userId: string): Promise<IEmergencyContact[]>;
  countForUser(userId: string): Promise<number>;
  findById(id: string): Promise<IEmergencyContact | null>;
  create(data: Partial<IEmergencyContact>): Promise<IEmergencyContact>;
  updateById(id: string, data: Partial<IEmergencyContact>): Promise<IEmergencyContact | null>;
  deleteById(id: string): Promise<void>;
  unsetPrimaryForUser(userId: string, exceptId?: string): Promise<void>;
}

class MongoEmergencyContactRepository implements IEmergencyContactRepository {
  async findAllForUser(userId: string) {
    return EmergencyContact.find({ userId }).sort({ priority: 1 });
  }

  async countForUser(userId: string) {
    return EmergencyContact.countDocuments({ userId });
  }

  async findById(id: string) {
    return EmergencyContact.findById(id);
  }

  async create(data: Partial<IEmergencyContact>) {
    return EmergencyContact.create(data);
  }

  async updateById(id: string, data: Partial<IEmergencyContact>) {
    return EmergencyContact.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  }

  async deleteById(id: string) {
    await EmergencyContact.findByIdAndDelete(id);
  }

  async unsetPrimaryForUser(userId: string, exceptId?: string) {
    await EmergencyContact.updateMany(
      { userId, ...(exceptId ? { _id: { $ne: exceptId } } : {}) },
      { $set: { isPrimary: false } }
    );
  }
}

export const emergencyContactRepository: IEmergencyContactRepository = new MongoEmergencyContactRepository();
