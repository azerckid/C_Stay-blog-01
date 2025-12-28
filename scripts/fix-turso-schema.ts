import { createClient } from "@libsql/client";
import dotenv from "dotenv";

const env = dotenv.config();

async function checkAndFixBioColumn() {
    let url = process.env.TURSO_DATABASE_URL;
    const authToken = process.env.TURSO_AUTH_TOKEN;

    if (!url || !authToken) {
        console.error("Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN");
        return;
    }

    // Sanitize URL for direct client usage
    // 1. Remove query parameters (like authToken which causes conflict if passed twice)
    url = url.split("?")[0];

    // 2. Use https:// instead of libsql:// for HTTP client compatibility if needed
    // (libsql:// usually implies websocket or special protocol, https is safer for simple REST execution)
    url = url.replace("libsql://", "https://");

    console.log("Connecting to:", url);

    const client = createClient({
        url,
        authToken,
    });

    try {
        // 1. Check if column exists
        console.log("Checking if 'bio' column exists in 'User' table...");

        // Check specific table info
        // Note: Table names might be case sensitive depending on creation. Prisma maps it to "User".
        const result = await client.execute("PRAGMA table_info('User')");

        if (result.rows.length === 0) {
            console.log("⚠️ Table 'User' not found (or empty result). Trying lowercase 'user'...");
            const resultLower = await client.execute("PRAGMA table_info('user')");
            if (resultLower.rows.length > 0) {
                console.log("Found table as 'user'.");
                // Logic for 'user' table if needed, but Prisma schema says @map("User")
            }
        }

        const hasBio = result.rows.some(row => row.name === 'bio');

        if (hasBio) {
            console.log("✅ 'bio' column already exists in 'User' table.");
        } else {
            console.log("❌ 'bio' column missing in 'User' table. Attempting to add it...");
            // Wrap table and column names in quotes for safety
            await client.execute('ALTER TABLE "User" ADD COLUMN "bio" TEXT');
            console.log("✅ Successfully added 'bio' column to 'User' table.");
        }

    } catch (error) {
        console.error("Error checking/updating DB:", error);
    } finally {
        client.close();
    }
}

checkAndFixBioColumn();
