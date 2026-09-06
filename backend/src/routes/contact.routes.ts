import { Router } from 'express';
import * as contactController from '../controllers/contact.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validateRequest.middleware';
import { addContactSchema, updateContactSchema } from '../validators/contact.validator';

const router = Router();

router.use(requireAuth);

router.get('/', contactController.listContacts);
router.post('/', validate(addContactSchema), contactController.addContact);
router.patch('/:id', validate(updateContactSchema), contactController.updateContact);
router.delete('/:id', contactController.deleteContact);

export default router;
