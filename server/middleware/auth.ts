import type { Request, Response, NextFunction } from 'express';
import { supabaseServer } from '../supabase';

export interface AuthenticatedRequest extends Request {
  supabaseUser?: { id: string };
}

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }
  const token = authHeader.substring(7);
  try {
    const { data: { user }, error } = await supabaseServer.auth.getUser(token);
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    (req as AuthenticatedRequest).supabaseUser = { id: user.id };
    next();
  } catch (err) {
    console.error('Auth middleware error', err);
    res.status(500).json({ error: 'Internal authentication error' });
  }
};
