import { Router } from "express";
import { prisma } from "../../db.js";
import { requireAuth, requireRole } from "../../middleware/requireAuth.js";
import { ensureOwnsEventOr403 } from "../../services/events.service.js";

const router = Router();

router.patch("/events/:id/publish", requireAuth, requireRole("club"), async (req: any, res) => {
    const id = String(req.params.id);

    const check = await ensureOwnsEventOr403(req.user.sub, id);
    if ((check as any).notFound) return res.status(404).json({ error: "Event not found" });
    if ((check as any).forbidden) return res.status(403).json({ error: "Not your club" });

    const event = await prisma.event.findUnique({
        where: { id },
        select: { startAt: true, endAt: true, status: true },
    });
    if (!event) return res.status(404).json({ error: "Event not found" });
    if (event.endAt && event.endAt < event.startAt) return res.status(400).json({ error: "endAt must be >= startAt" });

    const translations = await prisma.eventTranslation.findMany({ where: { eventId: id } });
    const hasEN = translations.some(t => t.lang === "en");
    if (!hasEN) return res.status(400).json({ error: "English translation is required to publish" });

    if (event.status === "published") return res.json({ id, status: "published" });

    const updated = await prisma.event.update({
        where: { id },
        data: { status: "published" },
        select: { id: true, status: true },
    });
    res.json(updated);
});

export default router;
