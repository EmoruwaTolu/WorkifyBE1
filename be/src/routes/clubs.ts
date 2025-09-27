import { Router } from "express";
import { prisma } from "../db.js";
import { z } from "zod";
import * as slugifyModule from "slugify";
import { requireAuth, requireRole } from "../middleware/requireAuth.js";

const router = Router();

const CreateClubSchema = z.object({
    name: z.string().min(1).max(80),
    bio: z.string().max(500).optional(),
    logoKey: z.string().optional(),
});

//Things that a slug should never be neamed
const RESERVED = new Set([
    "api","admin","health","users","clubs","events","login","register","me","upload","help"
]);

// Had to use slugify like this unfortunately due to some issues with import slugify I couldn't figure out
const slugify: (s: string, o?: any) => string = (slugifyModule as any).default ?? (slugifyModule as any);

export async function makeUniqueSlug(name: string): Promise<string> {
    const raw = (name ?? "").trim();
    const base0 = slugify(raw, { lower: true, strict: true });
    const base = base0.length ? base0 : `club-${Date.now()}`;
    const safeBase = RESERVED.has(base) ? `${base}-club` : base;
  
    let slug = safeBase;
    for (let n = 2; ; n++) {
        const exists = await prisma.club.findUnique({ where: { slug } });
        if (!exists) return slug;
        slug = `${safeBase}-${n}`;
    }
}

// Create a club
router.post("/clubs", requireAuth, requireRole("club"), async (req: any, res) => {
    try {
        const body = CreateClubSchema.parse(req.body);

        // Prevent owning multiple clubs
        const existing = await prisma.club.findFirst({
            where: { ownerUserId: req.user.sub },
            select: { id: true, name: true, slug: true },
        });

        if (existing) {
            return res.status(409).json({
                error: "You already own a club",
                club: existing,
            });
        }

        const slug = await makeUniqueSlug(body.name);

        const club = await prisma.club.create({
            data: {
                name: body.name,
                slug,
                ownerUserId: req.user.sub,
                bio: body.bio ?? null,
                logoKey: body.logoKey ?? null,
            },
            select: { id: true, name: true, slug: true, bio: true, logoKey: true },
        });

        return res.status(201).json({ club });
    } catch (err: any) {
        if (err?.name === "ZodError") {
            return res.status(400).json({ error: err.issues?.[0]?.message ?? "Invalid input" });
        }
        if (err?.code === "P2002") {
            // unique constraint (slug or ownerUserId)
            return res.status(409).json({ error: "Club already exists (slug or owner constraint)" });
        }
        console.error("POST /clubs:", err);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});

// Fetch the club owned by the current user.
router.get("/clubs/mine", requireAuth, requireRole("club"), async (req: any, res) => {
    const club = await prisma.club.findFirst({
        where: { ownerUserId: req.user.sub },
        select: { id: true, name: true, slug: true, bio: true, logoKey: true },
    });
    if (!club) return res.status(404).json({ error: "No club found for this account" });
    res.json({ club });
});

// look up club
router.get("/clubs/:slug", async (req, res) => {
    const club = await prisma.club.findUnique({
        where: { slug: String(req.params.slug) },
        select: { id: true, name: true, slug: true, bio: true, logoKey: true },
    });
    if (!club) return res.status(404).json({ error: "Club not found" });
    res.json({ club });
});

const ClubUpdateSchema = z.object({
    name: z.string().trim().min(1).max(100).optional(),
    bio: z.string().trim().max(2000).nullable().optional(),
    logoKey: z.string().trim().max(255).nullable().optional(),
});

// Update the club information (bio, name, logo)
router.patch("/clubs/:slug", requireAuth, requireRole("club"), async (req: any, res) => {
    try {
        const slug = String(req.params.slug);
    
        // Ensure the club exists and the caller owns it
        const club = await prisma.club.findUnique({
            where: { slug },
            select: { id: true, ownerUserId: true },
        });
        if (!club) return res.status(404).json({ error: "Club not found" });
        if (club.ownerUserId !== req.user.sub) return res.status(403).json({ error: "Not your club" });
    
        // Validate body (partial updates allowed)
        const body = ClubUpdateSchema.parse(req.body);
    
        // Build partial update payload; preserve null vs undefined semantics
        const data: any = {};
        if (body.name !== undefined) data.name = body.name;
        if (body.bio !== undefined) data.bio = body.bio;               // can be string or null
        if (body.logoKey !== undefined) data.logoKey = body.logoKey;   // can be string or null
    
        const updated = await prisma.club.update({
            where: { id: club.id },
            data,
            select: { id: true, slug: true, name: true, bio: true, logoKey: true, updatedAt: true },
        });
    
        return res.json(updated);
    } catch (err: any) {
        if (err?.name === "ZodError") {
            return res.status(400).json({ error: err.issues?.[0]?.message ?? "Invalid input" });
        }
        console.error("PATCH /clubs/:slug", err);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});


export default router;
