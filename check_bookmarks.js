import { createClient } from "@libsql/client";
import dotenv from "dotenv";

dotenv.config();

const client = createClient({
    url: process.env.TURSO_DATABASE_URL.replace("$TURSO_AUTH_TOKEN", process.env.TURSO_AUTH_TOKEN),
    authToken: process.env.TURSO_AUTH_TOKEN,
});

async function checkBookmarks() {
    try {
        console.log("=== Checking Bookmarks ===");
        const bookmarks = await client.execute("SELECT * FROM Bookmark ORDER BY createdAt DESC LIMIT 10");
        console.log("Recent Bookmarks:", JSON.stringify(bookmarks.rows, null, 2));

        console.log("\n=== Checking Collections ===");
        const collections = await client.execute("SELECT * FROM BookmarkCollection");
        console.log("Collections:", JSON.stringify(collections.rows, null, 2));

        console.log("\n=== Checking Bookmarks with Collection Info ===");
        const bookmarksWithCollection = await client.execute(`
      SELECT 
        b.id,
        b.userId,
        b.tweetId,
        b.collectionId,
        b.createdAt,
        c.name as collectionName
      FROM Bookmark b
      LEFT JOIN BookmarkCollection c ON b.collectionId = c.id
      ORDER BY b.createdAt DESC
      LIMIT 10
    `);
        console.log("Bookmarks with Collections:", JSON.stringify(bookmarksWithCollection.rows, null, 2));

    } catch (error) {
        console.error("Error:", error);
    } finally {
        client.close();
    }
}

checkBookmarks();
