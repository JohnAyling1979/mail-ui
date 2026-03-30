import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  user?: string;
}

export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    res.status(401).json({ error: 'No token provided' });
    return;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { user: string };
    req.user = decoded.user;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};