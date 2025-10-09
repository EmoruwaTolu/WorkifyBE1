import { Router, type Request, type Response } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma, type Role, type Prisma, Enums } from "../db.js";

const router = Router();

/* ---------------- Zod Schema Definitions ---------------- */

const StudentProfileInput = z.object({
  major: z.string().min(1).optional(),
  year: z.number().int().positive().optional(),
  resumeUrl: z.string().url().optional(),
});

const EmployerProfileInput = z.object({
  company: z.string().min(1).optional(),
  role: z.string().min(1).optional(),
});

const AdminProfileInput = z.object({}).optional();

const BaseUserInput = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
  role: z.nativeEnum(Enums.Role).optional(), // runtime-safe
  profile: z.union([
    StudentProfileInput,
    EmployerProfileInput,
    AdminProfileInput,
  ]).optional(),
});

type BaseUserInput = z.infer<typeof BaseUserInput>;

const PUBLIC_USER_SELECT = {
  id: true,
  email: true,
  name: true,
  role: true,
  createdAt: true,
} as const;

/* ---------------- Route Handler ---------------- */

router.post("/", async (req: Request, res: Response) => {
  const parsed = BaseUserInput.safeParse(req.body);

  if (!parsed.success) {
    return res
      .status(400)
      .json({ error: "Invalid body", details: parsed.error.flatten() });
  }

  const {
    email,
    password,
    name,
    role = Enums.Role.STUDENT,
    profile,
  } = parsed.data;

  const passwordHash = await bcrypt.hash(password, 12);
  const normalizedRole = role as Role;

  try {
    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const user = await tx.user.create({
        data: {
          email,
          password: passwordHash,
          name,
          role: normalizedRole,
        },
        select: PUBLIC_USER_SELECT,
      });

      let createdProfile: { type: string; data: unknown } | null = null;

      switch (normalizedRole) {
        case Enums.Role.STUDENT: {
          const p = StudentProfileInput.parse(profile ?? {});
          const data = await tx.studentProfile.create({
            data: {
              userId: user.id,
              major: p.major ?? null,
              year: p.year ?? null,
              resumeUrl: p.resumeUrl ?? null,
            },
          });
          createdProfile = { type: "student", data };
          break;
        }

        case Enums.Role.EMPLOYER: {
          const p = EmployerProfileInput.parse(profile ?? {});
          const data = await tx.employerProfile.create({
            data: {
              userId: user.id,
              company: p.company ?? null,
              role: p.role ?? null,
            },
          });
          createdProfile = { type: "employer", data };
          break;
        }

        case Enums.Role.ADMIN: {
          if (profile !== undefined) {
            AdminProfileInput.parse(profile);
            const data = await tx.adminProfile.create({
              data: { userId: user.id },
            });
            createdProfile = { type: "admin", data };
          }
          break;
        }
      }

      return { user, profile: createdProfile };
    });

    return res.status(201).json(result);
  } catch (e: any) {
    if (
      e?.code === "P2002" &&
      Array.isArray(e?.meta?.target) &&
      e.meta.target.includes("email")
    ) {
      return res.status(409).json({ error: "Email already in use" });
    }

    console.error("[POST /api/users] error:", e);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
