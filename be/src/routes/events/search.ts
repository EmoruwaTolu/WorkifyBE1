import { Router } from "express";
import { prisma } from "../../db.js";
import { effectiveLang } from "../../lang.js";
import { EventSearchSchema } from "../../validators/events.schema.js";
import { pickTranslation } from "../../utils/translations.js";

const router = Router();

type T = { lang: "en" | "fr"; title: string; description: string; posterKey: string | null };

router.get("/events/search", async (req, res) => {
    const preferred = effectiveLang(req);
    const params = EventSearchSchema.parse(req.query);

    const start = params.from ? new Date(`${params.from}T00:00:00.000Z`) : undefined;
    const end = params.to ? new Date(`${params.to}T23:59:59.999Z`) : undefined;

    const club = params.club
        ? await prisma.club.findUnique({ where: { slug: params.club }, select: { id: true } })
        : null;

    const where: any = {
        status: "published",
        ...(start ? { startAt: { gte: start } } : {}),
        ...(end ? { startAt: { ...(start ? { gte: start } : {}), lte: end } } : {}),
        ...(params.tag ? { tags: { has: params.tag } } : {}),
        ...(club ? { clubId: club.id } : {}),
    };

    const skip = (params.page - 1) * params.pageSize;
    const [items, total] = await Promise.all([
        prisma.event.findMany({
            where,
            orderBy: { startAt: "asc" },
            skip, take: params.pageSize,
            select: {
                id: true, startAt: true, endAt: true, locationName: true, tags: true,
                translations: { select: { lang: true, title: true, description: true, posterKey: true } },
                club: { select: { id: true, name: true, slug: true, logoKey: true } },
            },
        }),
        prisma.event.count({ where }),
    ]);

    const mapped = items
        .map(e => {
            const { chosen, servedLang, isFallback } = pickTranslation(e.translations as any, preferred);
            const hay = (chosen?.title ?? "") + " " + (chosen?.description ?? "");
            if (params.q && !hay.toLowerCase().includes(params.q.toLowerCase())) return null;
            return {
                id: e.id, club: e.club, startAt: e.startAt, endAt: e.endAt,
                locationName: e.locationName, tags: e.tags,
                requestedLang: preferred, servedLang, isFallback,
                translation: chosen ? { lang: chosen.lang, title: chosen.title, description: chosen.description, posterKey: chosen.posterKey } : null,
            };
        })
        .filter(Boolean);

    res.json({ page: params.page, pageSize: params.pageSize, total, items: mapped });
});

export default router;
