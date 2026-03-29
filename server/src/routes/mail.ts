import { Router, Request, Response } from 'express';

const router = Router();

router.get('/inbox', (req: Request, res: Response) => {
  res.json({ messages: [] });
});

export default router;