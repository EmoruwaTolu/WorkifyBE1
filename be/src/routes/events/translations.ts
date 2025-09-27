import { Router } from "express";
import { prisma } from "../../db.js";
import { requireAuth, requireRole } from "../../middleware/requireAuth.js";
import { ensureOwnsEventOr403 } from "../../services/events.service.js";
import { z } from "zod";
import { $Enums } from "@prisma/client";

const router = Router();

const Lang = z.enum(["en", "fr"]);
const UpsertTranslationSchema = z.object({
    title: z.string().min(1),
    description: z.string().min(1),
    posterKey: z.string().nullable().optional(),
});

// adding new translation for event
router.put("/events/:id/translations/:lang", requireAuth, requireRole("club"), async (req: any, res) => {
    const id = String(req.params.id);
    const lang = Lang.parse(req.params.lang);

    const check = await ensureOwnsEventOr403(req.user.sub, id);
    if ((check as any).notFound) return res.status(404).json({ error: "Event not found" });
    if ((check as any).forbidden) return res.status(403).json({ error: "Not your club" });

    const body = UpsertTranslationSchema.parse(req.body);

    const existing = await prisma.eventTranslation.findUnique({
        where: { eventId_lang: { eventId: id, lang: lang as any } },
        select: { id: true },
    });

    const data = existing
        ? await prisma.eventTranslation.update({
            where: { id: existing.id },
            data: { title: body.title, description: body.description, posterKey: body.posterKey ?? null },
            select: { id: true, lang: true, title: true, description: true, posterKey: true },
        })
        : await prisma.eventTranslation.create({
            data: { eventId: id, lang: $Enums.Language[lang], title: body.title, description: body.description, posterKey: body.posterKey ?? null },
            select: { id: true, lang: true, title: true, description: true, posterKey: true },
        });

    res.json({ translation: data });
});

// remove a translation from an event
router.delete("/events/:id/translations/:lang", requireAuth, requireRole("club"), async (req: any, res) => {
    const id = String(req.params.id);
    const lang = Lang.parse(req.params.lang);

    const check = await ensureOwnsEventOr403(req.user.sub, id);
    if ((check as any).notFound) return res.status(404).json({ error: "Event not found" });
    if ((check as any).forbidden) return res.status(403).json({ error: "Not your club" });

    await prisma.eventTranslation.deleteMany({ where: { eventId: id, lang: lang as any } });
    res.status(204).end();
});

export default router;
