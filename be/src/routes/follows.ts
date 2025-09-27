import { Router } from "express";
import { prisma } from "../db.js";
import { requireAuth, requireRole } from "../middleware/requireAuth.js";
import { z } from "zod";

const router = Router();

// Follow
router.post("/clubs/:slug/follow", requireAuth, requireRole("student"), async (req: any, res) => {
    const slug = String(req.params.slug);

    const club = await prisma.club.findUnique({ where: { slug }, select: { id: true } });
    if (!club) return res.status(404).json({ error: "Club not found" });

    await prisma.follow.upsert({
        where: { userId_clubId: { userId: req.user.sub, clubId: club.id } },
        update: {}, // idempotent
        create: { userId: req.user.sub, clubId: club.id },
    });

    res.status(204).end();
});

// Unfollow
router.delete("/clubs/:slug/follow", requireAuth, requireRole("student"), async (req: any, res) => {
    const slug = String(req.params.slug);

    const club = await prisma.club.findUnique({ where: { slug }, select: { id: true } });
    if (!club) return res.status(404).json({ error: "Club not found" });

    await prisma.follow.deleteMany({ where: { userId: req.user.sub, clubId: club.id } });
    res.status(204).end();
});

const MeFollowsSchema = z.object({
    page: z.coerce.number().min(1).default(1),
    pageSize: z.coerce.number().min(1).max(100).default(50),
});

// Lists the clubs a user follows
router.get("/me/follows", requireAuth, async (req: any, res) => {
    const params = MeFollowsSchema.parse(req.query);
    const skip = (params.page - 1) * params.pageSize;

    const [rows, total] = await Promise.all([
        prisma.follow.findMany({
            where: { userId: req.user.sub },
            orderBy: { createdAt: "desc" },
            skip, take: params.pageSize,
            select: {
                createdAt: true,
                club: { select: { id: true, name: true, slug: true, logoKey: true, bio: true } },
            },
        }),
        prisma.follow.count({ where: { userId: req.user.sub } }),
  ]);

  const hasMore = params.page * params.pageSize < total;
  res.json({ page: params.page, pageSize: params.pageSize, total, hasMore, items: rows });
});

// See if a user is following a specific club
router.get("/clubs/:slug/follow/status", requireAuth, async (req: any, res) => {
    const slug = String(req.params.slug);

    const club = await prisma.club.findUnique({ where: { slug }, select: { id: true } });
    if (!club) return res.status(404).json({ error: "Club not found" });

    const follow = await prisma.follow.findUnique({
        where: { userId_clubId: { userId: req.user.sub, clubId: club.id } },
        select: { userId: true },
    });

    res.json({ following: !!follow });
});

// NUmber of followers for a specific club
router.get("/clubs/:slug/followers/count", async (req, res) => {
    const slug = String(req.params.slug);

    const club = await prisma.club.findUnique({ where: { slug }, select: { id: true } });
    if (!club) return res.status(404).json({ error: "Club not found" });

    const count = await prisma.follow.count({ where: { clubId: club.id } });
    res.json({ count });
});

export default router;
