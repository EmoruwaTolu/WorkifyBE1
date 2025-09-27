type Translation = {
    lang: "en" | "fr";
    title: string;
    description: string;
    posterKey: string | null;
};

// Decide what language to serve the event in to the user
export function pickTranslation(all: Translation[], preferred: "en" | "fr") {
    const chosen =
        all.find(t => t.lang === preferred) ??
        all.find(t => t.lang === "en") ??
        all[0] ??
        null;

    const servedLang = chosen?.lang ?? preferred;
    const isFallback = !!chosen && servedLang !== preferred;
    const availableLangs = all.map(t => t.lang);

    return { chosen, servedLang, isFallback, availableLangs };
}
