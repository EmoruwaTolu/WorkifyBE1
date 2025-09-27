import { Router } from "express";
import { prisma } from "../../db.js";
import { requireAuth, requireRole } from "../../middleware/requireAuth.js";
import { ensureOwnsEventOr403 } from "../../services/events.service.js";

const router = Router();

// Works similarly to archiving on instagram
router.patch("/events/:id/unpublish", requireAuth, requireRole("club"), async (req: any, res) => {
    const id = String(req.params.id);
    const check = await ensureOwnsEventOr403(req.user.sub, id);
    if ((check as any).notFound) return res.status(404).json({ error: "Event not found" });
    if ((check as any).forbidden) return res.status(403).json({ error: "Not your club" });

    const event = await prisma.event.findUnique({ where: { id }, select: { status: true } });
    if (!event) return res.status(404).json({ error: "Event not found" });
    if (event.status === "draft") return res.json({ id, status: "draft" });

    const updated = await prisma.event.update({
        where: { id },
        data: { status: "draft" },
        select: { id: true, status: true },
    });
    res.json(updated);
});

export default router;