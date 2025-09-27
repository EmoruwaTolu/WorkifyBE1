import { z } from "zod";
export const Lang = z.enum(["en", "fr"]);
export type Lang = z.infer<typeof Lang>;

export function pickFromAcceptLanguage(h?: string): Lang | undefined {
    if (!h) return;
    const prefs = h.split(",").map(s => s.trim().toLowerCase());
    if (prefs.some(p => p.startsWith("fr"))) return "fr";
    if (prefs.some(p => p.startsWith("en"))) return "en";
}

export function effectiveLang(req: any): Lang {
    const q = String(req.query?.lang ?? "").toLowerCase();
    if (Lang.safeParse(q).success) return q as Lang;

    const prof = String(req.user?.locale ?? "").toLowerCase();
    if (Lang.safeParse(prof).success) return prof as Lang;

    const fromHeader = pickFromAcceptLanguage(req.headers["accept-language"]);
    return fromHeader ?? "en";
}
