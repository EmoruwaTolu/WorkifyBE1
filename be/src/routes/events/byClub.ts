import { Router } from "express";
import { prisma } from "../../db.js";
import { requireAuth, requireRole } from "../../middleware/requireAuth.js";
import { effectiveLang } from "../../lang.js";
import { pickTranslation } from "../../utils/translations.js";

const router = Router();

type T = { lang: "en" | "fr"; title: string; description: string; posterKey: string | null };

// Owner view: (includes drafts)
router.get("/clubs/:clubId/events", requireAuth, requireRole("club"), async (req: any, res) => {
    const clubId = String(req.params.clubId);
    const club = await prisma.club.findUnique({ where: { id: clubId }, select: { ownerUserId: true } });
    if (!club) return res.status(404).json({ error: "Club not found" });
    if (club.ownerUserId !== req.user.sub) return res.status(403).json({ error: "Not your club" });

    const items = await prisma.event.findMany({
        where: { clubId },
        orderBy: { startAt: "asc" },
        select: { id: true, status: true, startAt: true, endAt: true, locationName: true, tags: true },
    });
    res.json(items);
});

// Public view: GET /clubs/:slug/events/public (published only)
router.get("/clubs/:slug/events/public", async (req, res) => {
    const preferred = effectiveLang(req);
    const club = await prisma.club.findUnique({ where: { slug: String(req.params.slug) }, select: { id: true } });
    if (!club) return res.status(404).json({ error: "Club not found" });

    const items = await prisma.event.findMany({
        where: { clubId: club.id, status: "published" },
        orderBy: { startAt: "asc" },
        select: {
            id: true, startAt: true, endAt: true, locationName: true, tags: true,
            translations: { select: { lang: true, title: true, description: true, posterKey: true } },
        }
    });

    res.json(items.map(e => {
        const { chosen, servedLang, isFallback } = pickTranslation(e.translations as any, preferred);
        return {
            id: e.id, startAt: e.startAt, endAt: e.endAt, locationName: e.locationName, tags: e.tags,
            requestedLang: preferred, servedLang, isFallback,
            translation: chosen ? { lang: chosen.lang, title: chosen.title, description: chosen.description, posterKey: chosen.posterKey } : null,
        };
    }));
});

export default router;
