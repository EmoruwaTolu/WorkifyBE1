import { PrismaClient, Prisma, $Enums } from "@prisma/client";

// Prevent multiple instances during dev with hot reload (Vite, Next.js, etc.)
const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export const Enums = $Enums;  
export type Role = (typeof $Enums.Role)[keyof typeof $Enums.Role];
export type { Prisma };
