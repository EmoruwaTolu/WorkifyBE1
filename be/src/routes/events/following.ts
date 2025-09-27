import { Router } from "express";
import { prisma } from "../../db.js";
import { requireAuth } from "../../middleware/requireAuth.js";
import { effectiveLang } from "../../lang.js";
import { pickTranslation } from "../../utils/translations.js";
import { EventDaySchema } from "../../validators/events.schema.js";
import { $Enums } from "@prisma/client";

const router = Router();

// Published events happening on a given day from clubs the authed user follows.
router.get("/feed/events", requireAuth, async (req: any, res) => {
    const preferred = effectiveLang(req);
    const params = EventDaySchema.parse({
        date: req.query.date,
        page: req.query.page,
        pageSize: req.query.pageSize,
    });

    const start = new Date(`${params.date}T00:00:00.000Z`);
    const nextDay = new Date(start); nextDay.setUTCDate(start.getUTCDate() + 1);

    // where the user is in a club's following
    const where = {
        status: $Enums.EventStatus.published,
        startAt: { gte: start, lt: nextDay },
        club: { followers: { some: { userId: req.user.sub } } },
    };

    const skip = (params.page - 1) * params.pageSize;

    const [rows, total] = await Promise.all([
        prisma.event.findMany({
            where,
            orderBy: [{ startAt: "asc" }, { id: "asc" }], // stable pagination
            skip, take: params.pageSize,
            select: {
                id: true, startAt: true, endAt: true, locationName: true, tags: true,
                club: { select: { id: true, name: true, slug: true, logoKey: true } },
                translations: { select: { lang: true, title: true, description: true, posterKey: true } },
            },
        }),
        prisma.event.count({ where }),
    ]);

    const items = rows.map(e => {
        const { chosen, servedLang, isFallback, availableLangs } = pickTranslation(e.translations as any, preferred);
        return {
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
        };
    });

    const hasMore = params.page * params.pageSize < total;
    res.json({ page: params.page, pageSize: params.pageSize, total, hasMore, items });
});

export default router;
