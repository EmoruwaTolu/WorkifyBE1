import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();

async function main() {
  const club = await db.club.upsert({
    where: { name: "CSSA" },
    update: {},
    create: { name: "CSSA" }
  });

  const starts = new Date(); 
  starts.setHours(18, 0, 0, 0); 
  const ends = new Date(starts.getTime() + 2 * 60 * 60 * 1000);

  const evt = await db.event.create({
    data: {
      clubId: club.id,
      startsAt: starts,
      endsAt: ends,
      locationName: "SITE H010",
      tags: ["Social", "Halloween"]
    }
  });

  await db.eventTranslation.createMany({
    data: [
      { eventId: evt.id, lang: "en", title: "Haunted House Night", description: "Spooky vibes.", status: "published" },
      { eventId: evt.id, lang: "fr", title: "Soirée Maison Hantée", description: "Ambiance effrayante.", status: "published" }
    ],
    skipDuplicates: true
  });

  console.log({ clubId: club.id, eventId: evt.id });
}

main().finally(() => db.$disconnect());
