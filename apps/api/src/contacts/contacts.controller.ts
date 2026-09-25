import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { contactsService } from './contacts.service';
import { authGuard } from '../common/auth.guard';

export const contactsRouter = Router();

const addContactSchema = z.object({
  contactUserId: z.string().min(1, 'Target user ID required'),
  nickname: z.string().max(64).optional(),
});

contactsRouter.use(authGuard);

// 1. Get contacts
contactsRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const list = await contactsService.getContacts(req.user!.userId);
    return res.json({
      success: true,
      data: list,
    });
  } catch (err) {
    next(err);
  }
});

// 2. Add contact
contactsRouter.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { contactUserId, nickname } = addContactSchema.parse(req.body);
    const contact = await contactsService.addContact(req.user!.userId, contactUserId, nickname);
    return res.status(201).json({
      success: true,
      data: contact,
    });
  } catch (err) {
    next(err);
  }
});

// 3. Remove contact
contactsRouter.delete('/:targetUserId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await contactsService.removeContact(req.user!.userId, req.params.targetUserId);
    return res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
});
