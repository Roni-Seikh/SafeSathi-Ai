import { Schema, model, Document, Types } from 'mongoose';

export type ChatRole = 'user' | 'assistant';
export type ChatIntent = 'women_rights' | 'legal_help' | 'emergency_numbers' | 'self_defense' | 'general';

export interface IChatHistory extends Document {
  userId: Types.ObjectId;
  sessionId: string;
  role: ChatRole;
  message: string;
  intent?: ChatIntent;
  /** Knowledge-base chunk ids used for RAG retrieval — assistant turns only. */
  sourceDocIds?: string[];
  createdAt: Date;
}

const chatHistorySchema = new Schema<IChatHistory>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    sessionId: { type: String, required: true, index: true },
    role: { type: String, enum: ['user', 'assistant'], required: true },
    message: { type: String, required: true, maxlength: 4000 },
    intent: {
      type: String,
      enum: ['women_rights', 'legal_help', 'emergency_numbers', 'self_defense', 'general'],
    },
    sourceDocIds: { type: [String], default: undefined },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

chatHistorySchema.index({ sessionId: 1, createdAt: 1 });

export default model<IChatHistory>('ChatHistory', chatHistorySchema);
