import { Router } from "express";
import { prisma } from "../../db.js";
import { requireAuth, requireRole } from "../../middleware/requireAuth.js";
import { z } from "zod";
import { pickTranslation } from "../../utils/translations.js";
import { effectiveLang } from "../../lang.js";
import { $Enums } from "@prisma/client";

const router = Router();

const SavedListSchema = z.object({
    page: z.coerce.number().min(1).default(1),
    pageSize: z.coerce.number().min(1).max(100).default(50),
});

// student saves event
router.post("/events/:id/save", requireAuth, requireRole("student"), async (req: any, res) => {
    const id = String(req.params.id);

    const event = await prisma.event.findUnique({ where: { id }, select: { id: true, status: true } });
    if (!event || event.status !== "published") return res.status(404).json({ error: "Event not found" });

    await prisma.savedEvent.upsert({
        where: { userId_eventId: { userId: req.user.sub, eventId: id } },
        update: {},
        create: { userId: req.user.sub, eventId: id },
    });

    res.status(204).end();
});

// student deletes event
router.delete("/events/:id/save", requireAuth, requireRole("student"), async (req: any, res) => {
    const id = String(req.params.id);
    await prisma.savedEvent.deleteMany({ where: { userId: req.user.sub, eventId: id } });
    res.status(204).end();
});

// list events from the user
router.get("/me/saved-events", requireAuth, async (req: any, res) => {
    const preferred = effectiveLang(req);
    const params = SavedListSchema.parse(req.query);
    const skip = (params.page - 1) * params.pageSize;
  
    const baseWhere = { userId: req.user.sub, event: { status: $Enums.EventStatus.published } };
  
    const [rows, total] = await Promise.all([
        prisma.savedEvent.findMany({
            where: baseWhere,
            orderBy: { createdAt: "desc" },
            skip, take: params.pageSize,
            select: {
                createdAt: true,
                event: {
                    select: {
                        id: true, startAt: true, endAt: true, locationName: true, tags: true, status: true,
                        club: { select: { id: true, name: true, slug: true, logoKey: true } },
                        translations: { select: { lang: true, title: true, description: true, posterKey: true } },
                    },
                },
            },
        }),
        prisma.savedEvent.count({ where: baseWhere }),
    ]);
  
    const items = rows.map((r: typeof rows[number]) => {
        const e = r.event!;
        const { chosen, servedLang, isFallback, availableLangs } = pickTranslation(e.translations as any, preferred);
        return {
            savedAt: r.createdAt,
            event: {
                id: e.id,
                club: e.club,
                startAt: e.startAt,
                endAt: e.endAt,
                locationName: e.locationName,
                tags: e.tags,
                requestedLang: preferred,
                servedLang,
                isFallback,
                availableLangs,
                translation: chosen ? {
                    lang: chosen.lang, title: chosen.title, description: chosen.description, posterKey: chosen.posterKey
                } : null,
            }
        };
    });
  
    const hasMore = params.page * params.pageSize < total;
    res.json({ page: params.page, pageSize: params.pageSize, total, hasMore, items });
});

export default router;