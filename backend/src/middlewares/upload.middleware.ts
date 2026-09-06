import multer from 'multer';

/** In-memory storage — the file becomes a Buffer on req.file, never
 * touches disk. Fine for the short voice clips this is used for
 * (POST /voice-logs, WAV or m4a/AAC — the AI service transcodes via
 * ffmpeg if needed); a general-purpose evidence-upload path (Silent
 * Evidence Collection, Phase 6+) would use signed Firebase Storage URLs
 * instead, the same pattern as the avatar upload in UserService. */
export const memoryUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB — a few seconds of 16-bit mono PCM WAV
});
