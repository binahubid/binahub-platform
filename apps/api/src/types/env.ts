import type { AuthUser } from '.';

export type AppEnv = {
  Variables: {
    user: AuthUser;
    token: string;
  };
};
