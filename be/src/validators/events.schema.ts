import { z } from "zod";

export const EventUpdateSchema = z.object({
    startAt: z.string().datetime().optional(),
    endAt: z.string().datetime().nullable().optional(),
    locationName: z.string().min(1).optional(),
    tags: z.array(z.string()).optional(),
    status: z.enum(["draft", "published"]).optional(),
});

export const EventSearchSchema = z.object({
    from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    tag: z.string().optional(),
    club: z.string().optional(),
    q: z.string().optional(),
    page: z.coerce.number().min(1).default(1),
    pageSize: z.coerce.number().min(1).max(100).default(20),
});

export const EventCreateSchema = z.object({
    startAt: z.string().datetime(),
    endAt: z.string().datetime().optional(),
    locationName: z.string().min(1),
    tags: z.array(z.string()).optional(),
    status: z.enum(["draft","published"]).optional().default("draft"),
    translations: z.object({
        en: z.object({
            title: z.string().min(1),
            description: z.string().min(1),
            posterKey: z.string().optional(),
        }),
        fr: z.object({
            title: z.string().min(1),
            description: z.string().min(1),
            posterKey: z.string().optional(),
        }).optional(),
    }),
});

export const EventDaySchema = z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    page: z.coerce.number().min(1).default(1),
    pageSize: z.coerce.number().min(1).max(100).default(50),
});