import { Router } from "express";
import { prisma } from "../../db.js";
import { requireAuth, requireRole } from "../../middleware/requireAuth.js";
import { effectiveLang } from "../../lang.js";
import { pickTranslation } from "../../utils/translations.js";
import { ensureOwnsEventOr403 } from "../../services/events.service.js";
import { $Enums } from "@prisma/client";
import { z } from "zod";

const router = Router();

// Student is going to event
router.post("/events/:id/rsvp", requireAuth, requireRole("student"), async (req: any, res) => {
    const eventId = String(req.params.id);

    const ev = await prisma.event.findUnique({
        where: { id: eventId },
        select: { id: true, status: true },
    });

    if (!ev || ev.status !== $Enums.EventStatus.published) {
        return res.status(404).json({ error: "Event not found" });
    }

    await prisma.eventRSVP.upsert({
        where: { userId_eventId: { userId: req.user.sub, eventId } },
        update: {}, // updatedAt auto-updates
        create: { userId: req.user.sub, eventId },
    });

    res.status(204).end();
});

// Student is no longer going to event
router.delete("/events/:id/rsvp", requireAuth, requireRole("student"), async (req: any, res) => {
    const eventId = String(req.params.id);
    await prisma.eventRSVP.deleteMany({ where: { userId: req.user.sub, eventId } });
    res.status(204).end();
});

// Number of people going to an event
router.get("/events/:id/rsvp/count", async (req, res) => {
    const eventId = String(req.params.id);
    // If the event doesn't exist, still return 0 to avoid leaking draft/archived
    // Safer: 404 only if event truly doesn't exist at all.
    const exists = await prisma.event.findUnique({ where: { id: eventId }, select: { id: true } });
    if (!exists) return res.status(404).json({ error: "Event not found" });

    const count = await prisma.eventRSVP.count({ where: { eventId } });
    res.json({ count });
});

const OwnerListSchema = z.object({
    page: z.coerce.number().min(1).default(1),
    pageSize: z.coerce.number().min(1).max(200).default(50),
});

// List of people going to an event
router.get("/events/:id/rsvps", requireAuth, requireRole("club"), async (req: any, res) => {
    const eventId = String(req.params.id);
    const params = OwnerListSchema.parse(req.query);

    // Ensure the caller owns the event's club
    const check = await ensureOwnsEventOr403(req.user.sub, eventId);
    if ((check as any).notFound) return res.status(404).json({ error: "Event not found" });
    if ((check as any).forbidden) return res.status(403).json({ error: "Not your club" });

    const skip = (params.page - 1) * params.pageSize;

    const [rows, total] = await Promise.all([
        prisma.eventRSVP.findMany({
            where: { eventId },
            orderBy: { createdAt: "desc" },
            skip, take: params.pageSize,
            select: {
                createdAt: true,
                user: { select: { id: true, firstName: true, lastName: true, email: true, role: true } },
            },
        }),
        prisma.eventRSVP.count({ where: { eventId } }),
    ]);

    res.json({ page: params.page, pageSize: params.pageSize, total, items: rows });
});

const MeListSchema = z.object({
    page: z.coerce.number().min(1).default(1),
    pageSize: z.coerce.number().min(1).max(100).default(50),
});

// Events I'm going to (RSVP'd)
router.get("/me/rsvps", requireAuth, async (req: any, res) => {
    const preferred = effectiveLang(req);
    const params = MeListSchema.parse(req.query);
    const skip = (params.page - 1) * params.pageSize;

    // filter to published so drafts/archived don't appear
    const [rows, total] = await Promise.all([
        prisma.eventRSVP.findMany({
        where: { userId: req.user.sub, event: { status: $Enums.EventStatus.published } },
        orderBy: { createdAt: "desc" },
        skip, take: params.pageSize,
        select: {
            createdAt: true,
            event: {
                select: {
                    id: true, startAt: true, endAt: true, locationName: true, tags: true, status: true,
                    club: { select: { id: true, name: true, slug: true, logoKey: true } },
                    translations: { select: { lang: true, title: true, description: true, posterKey: true } },
                },
            },
        },
        }),
        prisma.eventRSVP.count({
            where: { userId: req.user.sub, event: { status: $Enums.EventStatus.published } },
        }),
    ]);

    const items = rows.map((r: { event: any; createdAt: any; }) => {
        const e = r.event!;
        const { chosen, servedLang, isFallback, availableLangs } =
        pickTranslation(e.translations as any, preferred);
        return {
            rsvpAt: r.createdAt,
            event: {
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
            }
        };
    });

    res.json({ page: params.page, pageSize: params.pageSize, total, items });
});

// Returns whether the authed user is "going" to this event.
// We only reveal status for published events to avoid leaking drafts.
router.get("/events/:id/rsvp/status", requireAuth, async (req: any, res) => {
    const eventId = String(req.params.id);
  
    const ev = await prisma.event.findUnique({
        where: { id: eventId },
        select: { status: true },
    });
    if (!ev || ev.status !== $Enums.EventStatus.published) {
        return res.status(404).json({ error: "Event not found" });
    }
  
    const rsvp = await prisma.eventRSVP.findUnique({
        where: { userId_eventId: { userId: req.user.sub, eventId } },
        select: { userId: true },
    });
  
    res.json({ going: !!rsvp });
});

export default router;
