import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/apiResponse';
import { emergencyContactService } from '../config/container';
import { AppError } from '../utils/AppError';

function requireUser(req: Request) {
  if (!req.user) throw new AppError('UNAUTHORIZED', 'Not authenticated');
  return req.user;
}

export const listContacts = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const contacts = await emergencyContactService.list(String(user._id));
  sendSuccess(res, { contacts });
});

export const addContact = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const contact = await emergencyContactService.add(String(user._id), req.body);
  sendSuccess(res, { contact }, 201);
});

export const updateContact = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const contact = await emergencyContactService.update(String(user._id), req.params.id, req.body);
  sendSuccess(res, { contact });
});

export const deleteContact = asyncHandler(async (req: Request, res: Response) => {
  const user = requireUser(req);
  await emergencyContactService.remove(String(user._id), req.params.id);
  sendSuccess(res, { deleted: true });
});
