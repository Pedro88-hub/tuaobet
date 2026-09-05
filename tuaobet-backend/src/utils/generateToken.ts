import jwt from 'jsonwebtoken';
import { getJwtSecret } from '../config/jwt';

export const generateToken = (userId: string) => {
  return jwt.sign({ id: userId }, getJwtSecret(), {
    expiresIn: '7d',
  });
};