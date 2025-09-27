import { Router } from "express";
import { prisma } from "../../db.js";
import { requireAuth, requireRole } from "../../middleware/requireAuth.js";
import { EventCreateSchema } from "../../validators/events.schema.js";
import { $Enums } from "@prisma/client";

const router = Router();

router.post("/clubs/:clubId/events", requireAuth, requireRole("club"), async (req: any, res) => {
    try {
            const clubId = String(req.params.clubId);
            const body = EventCreateSchema.parse(req.body);

            //Ensure the authenticated user owns this club
            const club = await prisma.club.findUnique({ where: { id: clubId }, select: { ownerUserId: true } });
            if (!club) return res.status(404).json({ error: "Club not found" });
            if (club.ownerUserId !== req.user.sub) return res.status(403).json({ error: "Not your club" });

            if (body.status === "published") {
            const start = new Date(body.startAt);
            const end = body.endAt ? new Date(body.endAt) : null;
            if (end && end < start) return res.status(400).json({ error: "endAt must be >= startAt" });
        }

        const created = await prisma.event.create({
            data: {
                clubId,
                createdBy: req.user.sub,
                startAt: new Date(body.startAt),
                endAt: body.endAt ? new Date(body.endAt) : null,
                locationName: body.locationName,
                tags: body.tags ?? [],
                status: body.status,
                translations: {
                create: [
                    {
                    lang: $Enums.Language.en,
                    title: body.translations.en.title,
                    description: body.translations.en.description,
                    posterKey: body.translations.en.posterKey ?? null,
                    },
                    ...(body.translations.fr
                    ? [{
                        lang: $Enums.Language.fr,
                        title: body.translations.fr.title,
                        description: body.translations.fr.description,
                        posterKey: body.translations.fr.posterKey ?? null,
                        }]
                    : []),
                ],
                },
            },
            select: { id: true },
        });

        res.status(201).json({ id: created.id });
    } catch (err: any) {
        if (err?.name === "ZodError") return res.status(400).json({ error: err.issues?.[0]?.message ?? "Invalid input" });
        console.error("POST /clubs/:clubId/events", err);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

export default router;