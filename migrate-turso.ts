import "dotenv/config";
import { prisma } from "./app/lib/prisma.server";

async function main() {
    console.log("Starting manual migration to Turso (creating DM tables)...");

    // Tables
    const createTables = [
        `CREATE TABLE IF NOT EXISTS "DMConversation" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "isGroup" BOOLEAN NOT NULL DEFAULT false,
      "groupName" TEXT,
      "lastMessageAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "isAccepted" BOOLEAN NOT NULL DEFAULT false,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL
    );`,

        `CREATE TABLE IF NOT EXISTS "User" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "email" TEXT NOT NULL UNIQUE,
        "password" TEXT,
        "name" TEXT,
        "image" TEXT,
        "provider" TEXT NOT NULL DEFAULT 'local',
        "snsId" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL,
        "emailVerified" BOOLEAN NOT NULL DEFAULT false,
        "avatarUrl" TEXT,
        "bio" TEXT,
        "coverImage" TEXT,
        "status" TEXT NOT NULL DEFAULT 'ACTIVE',
        "isPrivate" BOOLEAN NOT NULL DEFAULT false
    );`,
        // ^ Note: User table likely exists, but IF NOT EXISTS handles it. 
        // If it exists, we don't need to mod it as we added no columns, just relations.

        `CREATE TABLE IF NOT EXISTS "DMParticipant" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "conversationId" TEXT NOT NULL,
      "userId" TEXT NOT NULL,
      "joinedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "leftAt" DATETIME,
      "isAdmin" BOOLEAN NOT NULL DEFAULT false,
      CONSTRAINT "DMParticipant_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "DMConversation" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "DMParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    );`,

        `CREATE TABLE IF NOT EXISTS "DirectMessage" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "conversationId" TEXT NOT NULL,
      "senderId" TEXT NOT NULL,
      "content" TEXT NOT NULL,
      "isRead" BOOLEAN NOT NULL DEFAULT false,
      "deletedBySender" BOOLEAN NOT NULL DEFAULT false,
      "deletedByReceiver" BOOLEAN NOT NULL DEFAULT false,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL,
      CONSTRAINT "DirectMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "DMConversation" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "DirectMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    );`
    ];

    // Indices
    const createIndices = [
        `CREATE INDEX IF NOT EXISTS "DMConversation_lastMessageAt_idx" ON "DMConversation"("lastMessageAt");`,
        `CREATE INDEX IF NOT EXISTS "DMConversation_isAccepted_idx" ON "DMConversation"("isAccepted");`,

        `CREATE INDEX IF NOT EXISTS "DMParticipant_conversationId_idx" ON "DMParticipant"("conversationId");`,
        `CREATE INDEX IF NOT EXISTS "DMParticipant_userId_idx" ON "DMParticipant"("userId");`,
        `CREATE UNIQUE INDEX IF NOT EXISTS "DMParticipant_conversationId_userId_key" ON "DMParticipant"("conversationId", "userId");`,

        `CREATE INDEX IF NOT EXISTS "DirectMessage_conversationId_idx" ON "DirectMessage"("conversationId");`,
        `CREATE INDEX IF NOT EXISTS "DirectMessage_senderId_idx" ON "DirectMessage"("senderId");`,
        `CREATE INDEX IF NOT EXISTS "DirectMessage_createdAt_idx" ON "DirectMessage"("createdAt");`
    ];

    const queries = [...createTables, ...createIndices];

    for (const query of queries) {
        try {
            // Clean up newlines for log
            const logQuery = query.replace(/\s+/g, ' ').substring(0, 50) + "...";
            console.log(`Executing: ${logQuery}`);
            await prisma.$executeRawUnsafe(query);
            console.log("  Success");
        } catch (e: any) {
            if (e.message && e.message.includes("already exists")) {
                console.log("  Table/Index already exists (skipped)");
            } else {
                console.error("  Error executing query:", e);
            }
        }
    }

    console.log("Migration completed.");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
