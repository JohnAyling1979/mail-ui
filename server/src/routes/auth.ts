import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

const router = Router();

router.post('/login', (req: Request, res: Response) => {
  const { password } = req.body;

  if (password === process.env.MAIL_PASSWORD) {
    const token = jwt.sign(
      { user: process.env.MAIL_USER },
      process.env.JWT_SECRET as string,
      { expiresIn: '24h' }
    );
    res.json({ token });
  } else {
    res.status(401).json({ error: 'Invalid password' });
  }
});

export default router;