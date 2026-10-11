import type { SafeUser } from './safe-user.ts';

declare module 'express-serve-static-core' {
  interface Request {
    user?: SafeUser;
  }
}
