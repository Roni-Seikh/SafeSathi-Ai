import { ISOSLog, SOSStatus } from '../models/SOSLog.model';
import { ISOSLogRepository } from '../repositories/sosLog.repository';
import { PaginatedResult } from '../types/common.types';

export class AdminSOSService {
  constructor(private readonly sosLogRepository: ISOSLogRepository) {}

  async list(page: number, limit: number, status?: SOSStatus): Promise<PaginatedResult<ISOSLog>> {
    return this.sosLogRepository.listAll(page, limit, status);
  }
}
