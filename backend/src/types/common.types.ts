import { Schema } from 'mongoose';

/**
 * GeoJSON Point — used for every single-coordinate field (user location,
 * SOS location, heatmap zone center, route origin/destination, etc).
 * Coordinates are stored as [longitude, latitude], which matches both the
 * GeoJSON spec and what MongoDB's 2dsphere index expects.
 */
export interface IGeoPoint {
  type: 'Point';
  coordinates: [number, number]; // [lng, lat]
}

export const geoPointSchema = new Schema<IGeoPoint>(
  {
    type: { type: String, enum: ['Point'], default: 'Point', required: true },
    coordinates: {
      type: [Number],
      required: true,
      validate: {
        validator: (v: number[]) =>
          v.length === 2 &&
          v[0] >= -180 && v[0] <= 180 &&
          v[1] >= -90 && v[1] <= 90,
        message: 'coordinates must be [longitude, latitude] within valid ranges',
      },
    },
  },
  { _id: false }
);

/**
 * GeoJSON LineString — used for computed route geometry
 * (Safe Route Recommendation, see Route.model.ts).
 */
export interface IGeoLineString {
  type: 'LineString';
  coordinates: [number, number][];
}

export const geoLineStringSchema = new Schema<IGeoLineString>(
  {
    type: { type: String, enum: ['LineString'], default: 'LineString', required: true },
    coordinates: { type: [[Number]], required: true },
  },
  { _id: false }
);

/** Languages supported by voice keyword detection (Vosk) and the UI. */
export type SupportedLanguage = 'en' | 'hi' | 'bn';
export const SUPPORTED_LANGUAGES: SupportedLanguage[] = ['en', 'hi', 'bn'];

/** Shared shape returned by every repository's paginated list method. */
export interface PaginatedResult<T> {
  items: T[];
  total: number;
}
