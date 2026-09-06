import Heatmap, { IHeatmap } from '../models/Heatmap.model';
import { PaginatedResult } from '../types/common.types';

export interface IHeatmapRepository {
  upsertByZoneId(zoneId: string, data: Partial<IHeatmap>): Promise<IHeatmap>;
  findWithinBBox(minLng: number, minLat: number, maxLng: number, maxLat: number): Promise<IHeatmap[]>;
  findByZoneId(zoneId: string): Promise<IHeatmap | null>;
  /** Admin-only — every zone that's ever been calculated, riskiest
   * first, not limited to one bounding box. */
  listAll(page: number, limit: number): Promise<PaginatedResult<IHeatmap>>;
}

class MongoHeatmapRepository implements IHeatmapRepository {
  async upsertByZoneId(zoneId: string, data: Partial<IHeatmap>) {
    const updated = await Heatmap.findOneAndUpdate(
      { zoneId },
      { $set: data },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    // findOneAndUpdate with upsert:true always returns a document
    return updated as IHeatmap;
  }

  async findWithinBBox(minLng: number, minLat: number, maxLng: number, maxLat: number) {
    return Heatmap.find({
      center: {
        $geoWithin: {
          $box: [
            [minLng, minLat],
            [maxLng, maxLat],
          ],
        },
      },
    });
  }

  async findByZoneId(zoneId: string) {
    return Heatmap.findOne({ zoneId });
  }

  async listAll(page: number, limit: number) {
    const [items, total] = await Promise.all([
      Heatmap.find({})
        .sort({ riskScore: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Heatmap.countDocuments({}),
    ]);
    return { items, total };
  }
}

export const heatmapRepository: IHeatmapRepository = new MongoHeatmapRepository();
