import { data, type LoaderFunctionArgs } from "react-router";
import { db } from "~/db";
import { travelTags } from "~/db/schema";
import { ilike, or, asc } from "drizzle-orm";

export async function loader({ request }: LoaderFunctionArgs) {
    try {
        const url = new URL(request.url);
        const query = url.searchParams.get("q");

        console.log(`[Tags API] Search query: ${query}`);

        if (!query) {
            return data({ tags: [] });
        }

        const tags = await db.query.travelTags.findMany({
            where: or(
                ilike(travelTags.name, `%${query}%`),
                ilike(travelTags.slug, `%${query}%`)
            ),
            limit: 10,
            orderBy: [asc(travelTags.name)]
        });

        console.log(`[Tags API] Found ${tags.length} tags`);
        return data({ tags });

    } catch (error: any) {
        console.error("[Tags API] Error fetching tags:", error.message || error);
        return data({
            error: "Failed to fetch tags",
            details: error.message || "Unknown error"
        }, { status: 500 });
    }
}
