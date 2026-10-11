import { Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/apiResponse';
import { chatService } from '../config/container';
import { AppError } from '../utils/AppError';

export const chatSchema = z.object({
  message: z.string().min(1).max(1000),
  sessionId: z.string().min(4).max(64).default('default'),
  language: z.enum(['en', 'hi', 'bn']).default('en'),
});

const uid = (req: Request) => {
  if (!req.user) throw new AppError('UNAUTHORIZED', 'Not authenticated');
  return String(req.user._id);
};

export const send = asyncHandler(async (req: Request, res: Response) => {
  const { message, sessionId, language } = req.body as z.infer<typeof chatSchema>;
  sendSuccess(res, await chatService.respond(uid(req), sessionId, message, language));
});
export const history = asyncHandler(async (req: Request, res: Response) => {
  sendSuccess(res, { messages: await chatService.history(uid(req), String(req.query.sessionId ?? 'default')) });
});
