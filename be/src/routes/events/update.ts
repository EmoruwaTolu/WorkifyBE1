import { Router } from "express";
import { requireAuth, requireRole } from "../../middleware/requireAuth.js";
import { EventUpdateSchema } from "../../validators/events.schema.js";
import { ensureOwnsEventOr403, updateEvent } from "../../services/events.service.js";

const router = Router();

router.patch("/events/:id", requireAuth, requireRole("club"), async (req: any, res) => {
    const id = String(req.params.id);
    const check = await ensureOwnsEventOr403(req.user.sub, id);
    if (check.notFound) return res.status(404).json({ error: "Event not found" });
    if (check.forbidden) return res.status(403).json({ error: "Not your club" });

    const body = EventUpdateSchema.parse(req.body);
    const result = await updateEvent(id, body);
    return res.json(result);
});

export default router;