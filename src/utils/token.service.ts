import jwt, { JwtPayload, SignOptions } from "jsonwebtoken";
import { config } from "../config/env";

export function signToken(payload: object): string {
  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  } as SignOptions);
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, config.jwtSecret) as JwtPayload;
}
