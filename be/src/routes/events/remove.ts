import { Router } from "express";
import { prisma } from "../../db.js";
import { requireAuth, requireRole } from "../../middleware/requireAuth.js";
import { ensureOwnsEventOr403 } from "../../services/events.service.js";

const router = Router();

router.delete("/events/:id", requireAuth, requireRole("club"), async (req: any, res) => {
    const id = String(req.params.id);

    const check = await ensureOwnsEventOr403(req.user.sub, id);
    if ((check as any).notFound) return res.status(404).json({ error: "Event not found" });
    if ((check as any).forbidden) return res.status(403).json({ error: "Not your club" });

    await prisma.event.delete({ where: { id } }); // cascades: SavedEvent, EventRSVP, EventTranslation
    res.status(204).end();
});

export default router;