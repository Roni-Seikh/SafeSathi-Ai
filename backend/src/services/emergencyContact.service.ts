import { Types } from 'mongoose';
import { IEmergencyContact } from '../models/EmergencyContact.model';
import { IEmergencyContactRepository } from '../repositories/emergencyContact.repository';
import { IUserRepository } from '../repositories/user.repository';
import { AppError } from '../utils/AppError';
import { MAX_EMERGENCY_CONTACTS } from '../utils/constants';

export interface AddContactInput {
  name: string;
  relationship: string;
  phone: string;
  email?: string;
  priority: number;
  isPrimary?: boolean;
}

export class EmergencyContactService {
  constructor(
    private readonly contactRepository: IEmergencyContactRepository,
    private readonly userRepository: IUserRepository
  ) {}

  async list(userId: string): Promise<IEmergencyContact[]> {
    return this.contactRepository.findAllForUser(userId);
  }

  async add(userId: string, input: AddContactInput): Promise<IEmergencyContact> {
    const count = await this.contactRepository.countForUser(userId);
    if (count >= MAX_EMERGENCY_CONTACTS) {
      throw new AppError(
        'SOS_CONTACT_LIMIT_EXCEEDED',
        `You can have at most ${MAX_EMERGENCY_CONTACTS} emergency contacts.`
      );
    }

    // If this contact's phone number belongs to a registered SafeSathi
    // user, link it — this is what lets SOS alerts reach them as an
    // in-app push + live-location view, not just an SMS fallback.
    const linkedUser = await this.userRepository.findByPhone(input.phone);

    if (input.isPrimary) {
      await this.contactRepository.unsetPrimaryForUser(userId);
    }

    return this.contactRepository.create({
      userId: new Types.ObjectId(userId),
      name: input.name,
      relationship: input.relationship,
      phone: input.phone,
      email: input.email,
      priority: input.priority,
      isPrimary: input.isPrimary ?? false,
      linkedUserId: linkedUser ? linkedUser._id : undefined,
    });
  }

  async update(userId: string, contactId: string, input: Partial<AddContactInput>): Promise<IEmergencyContact> {
    const contact = await this.contactRepository.findById(contactId);
    if (!contact || contact.userId.toString() !== userId) {
      throw new AppError('NOT_FOUND', 'Emergency contact not found');
    }

    const updatePayload: Partial<IEmergencyContact> = { ...input };

    if (input.phone && input.phone !== contact.phone) {
      const linkedUser = await this.userRepository.findByPhone(input.phone);
      updatePayload.linkedUserId = linkedUser ? linkedUser._id : undefined;
    }

    if (input.isPrimary) {
      await this.contactRepository.unsetPrimaryForUser(userId, contactId);
    }

    const updated = await this.contactRepository.updateById(contactId, updatePayload);
    if (!updated) throw new AppError('NOT_FOUND', 'Emergency contact not found');
    return updated;
  }

  async remove(userId: string, contactId: string): Promise<void> {
    const contact = await this.contactRepository.findById(contactId);
    if (!contact || contact.userId.toString() !== userId) {
      throw new AppError('NOT_FOUND', 'Emergency contact not found');
    }
    await this.contactRepository.deleteById(contactId);
  }
}
