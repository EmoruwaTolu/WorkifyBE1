import jwt, { SignOptions, Secret, JwtPayload } from "jsonwebtoken";
import * as Prisma from "@prisma/client";

const SECRET: Secret  = (process.env.JWT_SECRET ?? "dev-secret");
const ISSUER          = process.env.JWT_ISSUER   ?? "uevents-api";
const AUDIENCE        = process.env.JWT_AUDIENCE ?? "uevents-app";

type Role = Prisma.$Enums.Role;
const RoleValue = Prisma.Role;

export type JwtClaims = {
    sub: string;       // user id
    email: string;
    role: Prisma.$Enums.Role;
    locale: Prisma.$Enums.Language;
} & JwtPayload;

type Expires = NonNullable<SignOptions["expiresIn"]>;

export function signToken(claims: Omit<JwtClaims, "iat" | "exp">, ttl: Expires = "7d") {
  const opts: SignOptions = {
    expiresIn: ttl,
    issuer: ISSUER,
    audience: AUDIENCE,
    algorithm: "HS256",
  };
  return jwt.sign(claims, SECRET, opts);
}

export function verifyToken(token: string): JwtClaims {
  try {
    return jwt.verify(token, SECRET, {
      algorithms: ["HS256"],
      issuer: ISSUER,
      audience: AUDIENCE,
    }) as JwtClaims;
  } catch (err) {
    throw err;
  }
}
