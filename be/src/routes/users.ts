import { Router, type Request, type Response } from "express";
import { prisma } from "../db.js";
import { z } from "zod";
import bcrypt from "bcrypt";
import { signToken } from "../lib/jwt.js";
import { requireAuth } from "../middleware/requireAuth.js";
import type { $Enums } from "@prisma/client";

const router = Router();

const email = z.string().email().transform((e) => e.toLowerCase().trim());
const password = z.string().min(8, "Password must be at least 8 characters");

const RegisterSchema = z.object({
    email,
    password,
    firstName: z.string().min(1),
    lastName: z.string().min(1),
});

const LoginSchema = z.object({
    email,
    password: z.string().min(1),
});

const MeUpdateSchema = z.object({
    firstName: z.string().trim().min(1).optional(),
    lastName: z.string().trim().min(1).optional(),
    locale: z.enum(["en", "fr"]).optional(), // $Enums.Language
});

function publicUser(u: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: $Enums.Role;
    locale: $Enums.Language;
}) {
    return {
        id: u.id,
        email: u.email,
        firstName: u.firstName,
        lastName: u.lastName,
        role: u.role,
        locale: u.locale,
    };
}

router.post("/register", async (req: Request, res: Response) => {
    try {
        const body = RegisterSchema.parse(req.body);

        // Ensure email unique
        const existing = await prisma.user.findUnique({
            where: { email: body.email },
            select: { id: true },
        });
        if (existing) {
            return res.status(400).json({ error: "Email already in use" });
        }

        const passwordHash = await bcrypt.hash(body.password, 12);

        const user = await prisma.user.create({
            data: {
                email: body.email,
                passwordHash,
                firstName: body.firstName,
                lastName: body.lastName,
            },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                role: true,
                locale: true,
            },
        });

        const token = signToken({
            sub: user.id,
            email: user.email,
            role: user.role,
            locale: user.locale,
            iss: "api",
            aud: "app",
        });

        res.status(201).json({ token, user: publicUser(user) });
    } catch (err: any) {
        if (err?.name === "ZodError") return res.status(400).json({ error: err.issues?.[0]?.message ?? "Invalid input" });
        console.error("POST /users/register", err);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

router.post("/login", async (req: Request, res: Response) => {
    try {
        const body = LoginSchema.parse(req.body);

        const user = await prisma.user.findUnique({
            where: { email: body.email },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                role: true,
                locale: true,
                passwordHash: true,
            },
        });

        if (!user) {
            return res.status(401).json({ error: "Invalid email or password" });
        }

        const ok = await bcrypt.compare(body.password, user.passwordHash);
        if (!ok) {
            return res.status(401).json({ error: "Invalid email or password" });
        }

        const token = signToken({
            sub: user.id,
            email: user.email,
            role: user.role,
            locale: user.locale,
            iss: "api",
            aud: "app",
        });

        // strip hash before returning
        const { passwordHash: _omit, ...safe } = user;
        res.json({ token, user: publicUser(safe as any) });
    } catch (err: any) {
        if (err?.name === "ZodError") return res.status(400).json({ error: err.issues?.[0]?.message ?? "Invalid input" });
        console.error("POST /users/login", err);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

router.get("/me", requireAuth, async (req: any, res: Response) => {
    const user = await prisma.user.findUnique({
        where: { id: req.user.sub },
        select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            locale: true,
        },
    });
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ user: publicUser(user) });
});

router.patch("/me", requireAuth, async (req: any, res: Response) => {
    try {
        const body = MeUpdateSchema.parse(req.body);

        const updated = await prisma.user.update({
            where: { id: req.user.sub },
            data: {
                ...(body.firstName !== undefined ? { firstName: body.firstName } : {}),
                ...(body.lastName !== undefined ? { lastName: body.lastName } : {}),
                ...(body.locale !== undefined ? { locale: body.locale } : {}),
            },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                role: true,
                locale: true,
            },
        });

        res.json({ user: publicUser(updated) });
    } catch (err: any) {
        if (err?.name === "ZodError")  return res.status(400).json({ error: err.issues?.[0]?.message ?? "Invalid input" });
        
        console.error("PATCH /users/me", err);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

export default router;