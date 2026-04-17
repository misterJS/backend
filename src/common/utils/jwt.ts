import jwt, { Secret, SignOptions } from "jsonwebtoken";
import { env } from "../../config/env";

export type JwtPayload = {
  userId: string;
  phoneNumber: string;
};

export const signAccessToken = (payload: JwtPayload): string => {
  const secret: Secret = env.JWT_SECRET;
  const options: SignOptions = {
    expiresIn: env.JWT_EXPIRES_IN as SignOptions["expiresIn"]
  };

  return jwt.sign(payload, secret, options);
};

export const verifyAccessToken = (token: string): JwtPayload => {
  return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
};
