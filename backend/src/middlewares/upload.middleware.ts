import multer from 'multer';

/** In-memory storage — the file becomes a Buffer on req.file, never touches disk. */
export const memoryUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // short voice clips for /voice-logs
});

/** SOS evidence chunks (≈20-30 s of AAC/m4a, typically 100–400 KB). */
export const evidenceUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 12 * 1024 * 1024 },
});
