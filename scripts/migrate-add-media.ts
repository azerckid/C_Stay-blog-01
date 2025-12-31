import { createClient } from "@libsql/client";
import dotenv from "dotenv";

dotenv.config();

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url || !authToken) {
    console.error("Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN");
    process.exit(1);
}

const client = createClient({
    url,
    authToken,
});

async function main() {
    console.log("Adding media columns to DirectMessage table...");

    try {
        // Add mediaUrl column
        await client.execute(`
      ALTER TABLE "DirectMessage" ADD COLUMN "mediaUrl" TEXT;
    `);
        console.log("✅ Added mediaUrl column");
    } catch (e: any) {
        if (e.message.includes("duplicate column name")) {
            console.log("ℹ️ mediaUrl column already exists");
        } else {
            console.error("❌ Failed to add mediaUrl:", e);
        }
    }

    try {
        // Add mediaType column
        await client.execute(`
      ALTER TABLE "DirectMessage" ADD COLUMN "mediaType" TEXT;
    `);
        console.log("✅ Added mediaType column");
    } catch (e: any) {
        if (e.message.includes("duplicate column name")) {
            console.log("ℹ️ mediaType column already exists");
        } else {
            console.error("❌ Failed to add mediaType:", e);
        }
    }
}

main();
