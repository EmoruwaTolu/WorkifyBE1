import { Router } from "express";
import { prisma } from "../../db.js";
import { effectiveLang } from "../../lang.js";
import { pickTranslation } from "../../utils/translations.js";
import { EventDaySchema } from "../../validators/events.schema.js";
import { $Enums } from "@prisma/client";

const router = Router();

type T = { lang: "en" | "fr"; title: string; description: string; posterKey: string | null };

// Opens up details about a specific event
router.get("/events/:id", async (req, res) => {
    const preferred = effectiveLang(req);
    const event = await prisma.event.findUnique({
        where: { id: String(req.params.id) },
        select: {
            id: true, status: true, startAt: true, endAt: true, locationName: true, tags: true,
            club: { select: { id: true, name: true, slug: true, logoKey: true } },
            translations: { select: { lang: true, title: true, description: true, posterKey: true } },
        },
    });

    if (!event || event.status !== "published") return res.status(404).json({ error: "Event not found" });

    const { chosen, servedLang, isFallback, availableLangs } = pickTranslation(event.translations as any, preferred);
    res.json({
        id: event.id,
        club: event.club,
        startAt: event.startAt,
        endAt: event.endAt,
        locationName: event.locationName,
        tags: event.tags,
        requestedLang: preferred,
        servedLang,
        isFallback,
        availableLangs,
        translation: chosen ? {
        lang: chosen.lang,
        title: chosen.title,
        description: chosen.description,
        posterKey: chosen.posterKey,
        } : null,
    });
});

// Get events for a particular day
router.get("/events", async (req, res) => {
    const preferred = effectiveLang(req);
    const params = EventDaySchema.parse({
        date: req.query.date,
        page: req.query.page,
        pageSize: req.query.pageSize,
    });

    const start = new Date(`${params.date}T00:00:00.000Z`);
    const nextDay = new Date(start); nextDay.setUTCDate(start.getUTCDate() + 1);

    const where = {
        status: $Enums.EventStatus.published,
        startAt: { gte: start, lt: nextDay },
    };

    const skip = (params.page - 1) * params.pageSize;

    const [rows, total] = await Promise.all([
        prisma.event.findMany({
        where,
        orderBy: { startAt: "asc" },
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

    res.json({ page: params.page, pageSize: params.pageSize, total, items });
});


export default router;
