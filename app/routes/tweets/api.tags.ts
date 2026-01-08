import { data, type LoaderFunctionArgs } from "react-router";
import { db } from "~/db";
import { travelTags } from "~/db/schema";
import { ilike, or, asc } from "drizzle-orm";

export async function loader({ request }: LoaderFunctionArgs) {
    const url = new URL(request.url);
    const query = url.searchParams.get("q");

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

    return data({ tags });
}
