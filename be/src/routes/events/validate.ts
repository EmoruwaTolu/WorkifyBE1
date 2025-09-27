import { Router } from "express";
import { prisma } from "../../db.js";
import { requireAuth, requireRole } from "../../middleware/requireAuth.js";
import { ensureOwnsEventOr403 } from "../../services/events.service.js";

const router = Router();

router.get("/events/:id/validate", requireAuth, requireRole("club"), async (req: any, res) => {
    const id = String(req.params.id);

    const check = await ensureOwnsEventOr403(req.user.sub, id);
    if ((check as any).notFound) return res.status(404).json({ error: "Event not found" });
    if ((check as any).forbidden) return res.status(403).json({ error: "Not your club" });

    const e = await prisma.event.findUnique({
        where: { id },
        select: {
        startAt: true, endAt: true, locationName: true,
        translations: { select: { lang: true, title: true, description: true } },
        },
    });
    if (!e) return res.status(404).json({ error: "Event not found" });

    const issues: string[] = [];
    if (!e.locationName) issues.push("locationName is required");
    if (e.endAt && e.endAt < e.startAt) issues.push("endAt must be >= startAt");
    const hasEN = e.translations.some(t => t.lang === "en");
    if (!hasEN) issues.push("English translation is required");
    const hasTitle = e.translations.some(t => !!t.title);
    if (!hasTitle) issues.push("title is required in at least one translation");
    const hasDesc = e.translations.some(t => !!t.description);
    if (!hasDesc) issues.push("description is required in at least one translation");

    res.json({ ok: issues.length === 0, issues });
});

export default router;
