import { Schema, model, Document, Types } from 'mongoose';
import { SupportedLanguage } from '../types/common.types';

export type DetectedKeyword = 'help' | 'save_me' | 'bachao' | 'chere_din' | 'stop' | 'none';

export interface IToneAnalysis {
  pitchHz?: number;
  loudnessDb?: number;
  screamProbability: number; // 0–1, from librosa feature analysis
  fearProbability: number; // 0–1
}

export interface IVoiceLog extends Document {
  userId: Types.ObjectId;
  detectedKeyword: DetectedKeyword;
  language: SupportedLanguage;
  keywordConfidence: number; // 0–1, from Vosk
  toneAnalysis: IToneAnalysis;
  audioSnippetUrl?: string; // Firebase Storage — only populated if evidence capture is on
  triggeredSOS: boolean;
  sosLogId?: Types.ObjectId;
  recordedAt: Date;
  createdAt: Date;
}

const voiceLogSchema = new Schema<IVoiceLog>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    detectedKeyword: {
      type: String,
      enum: ['help', 'save_me', 'bachao', 'chere_din', 'stop', 'none'],
      required: true,
    },
    language: { type: String, enum: ['en', 'hi', 'bn'], required: true },
    keywordConfidence: { type: Number, min: 0, max: 1, required: true },
    toneAnalysis: {
      pitchHz: { type: Number },
      loudnessDb: { type: Number },
      screamProbability: { type: Number, min: 0, max: 1, default: 0 },
      fearProbability: { type: Number, min: 0, max: 1, default: 0 },
    },
    audioSnippetUrl: { type: String },
    triggeredSOS: { type: Boolean, default: false },
    sosLogId: { type: Schema.Types.ObjectId, ref: 'SOSLog' },
    recordedAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

voiceLogSchema.index({ userId: 1, recordedAt: -1 });

export default model<IVoiceLog>('VoiceLog', voiceLogSchema);
