import { Request, Response, NextFunction } from "express";
import * as Prisma from "@prisma/client";
import { verifyToken, JwtClaims } from "../lib/jwt.js";

declare global {
    namespace Express {
        interface Request {
            user?: JwtClaims;
        }
    }
}

type Role = Prisma.$Enums.Role;

export function requireAuth(req: Request, res: Response, next: NextFunction) {
    const m = /^Bearer (.+)$/.exec(req.headers.authorization || "");
    if (!m) return res.status(401).json({ error: "Missing token" });
    try {
        const claims = verifyToken(m[1]);
        req.user = claims;
        next();
    } catch {
        return res.status(401).json({ error: "Invalid token" });
    }
}

export function requireRole(role: Role) {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.user) return res.status(401).json({ error: "Missing token" });
        if (req.user.role !== role) return res.status(403).json({ error: "Forbidden" });
        next();
    };
}
