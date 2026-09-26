import { Router, Request, Response, NextFunction } from 'express';
import { foldersService } from './folders.service';
import { authGuard } from '../common/auth.guard';

export const foldersRouter = Router();

foldersRouter.use(authGuard);

// 1. Get user folders
foldersRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const list = await foldersService.getUserFolders(req.user!.userId);
    return res.json({
      success: true,
      data: list,
    });
  } catch (err) {
    next(err);
  }
});

// 2. Create folder
foldersRouter.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, icon, filterType, chatIds } = req.body;
    if (!name || typeof name !== 'string') {
      return res.status(400).json({ success: false, error: { message: 'Name is required' } });
    }
    const folder = await foldersService.createFolder(req.user!.userId, {
      name,
      icon,
      filterType,
      chatIds,
    });
    return res.status(201).json({
      success: true,
      data: folder,
    });
  } catch (err) {
    next(err);
  }
});

// 3. Update folder
foldersRouter.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const folder = await foldersService.updateFolder(req.user!.userId, req.params.id, req.body);
    return res.json({
      success: true,
      data: folder,
    });
  } catch (err) {
    next(err);
  }
});

// 4. Delete folder
foldersRouter.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await foldersService.deleteFolder(req.user!.userId, req.params.id);
    return res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
});
