import { prisma } from "../db.js";

export async function ensureOwnsEventOr403(userId: string, eventId: string) {
    const ev = await prisma.event.findUnique({
        where: { id: eventId },
        select: { club: { select: { ownerUserId: true } } },
    });
    if (!ev) return { notFound: true as const };
    if (ev.club.ownerUserId !== userId) return { forbidden: true as const };
    return { ok: true as const };
}

export async function updateEvent(id: string, body: any) {
    // centralize date/order checks here so PATCH and PUBLISH can reuse
    if (body.startAt || body.endAt !== undefined) {
        const start = body.startAt ? new Date(body.startAt) : undefined;
        const end   = body.endAt === null ? null : body.endAt ? new Date(body.endAt) : undefined;
        if (start && end && end < start) throw Object.assign(new Error("endAt must be >= startAt"), { status: 400 });
    }
    return prisma.event.update({
        where: { id },
        data: {
            startAt: body.startAt ? new Date(body.startAt) : undefined,
            endAt: body.endAt === undefined ? undefined : (body.endAt ? new Date(body.endAt) : null),
            locationName: body.locationName,
            tags: body.tags,
            status: body.status,
        },
        select: { id: true, status: true },
    });
}
