import { data, type LoaderFunctionArgs } from "react-router";
import { prisma } from "~/lib/prisma.server";

export async function loader({ request }: LoaderFunctionArgs) {
    const url = new URL(request.url);
    const query = url.searchParams.get("q");

    if (!query) {
        return data({ tags: [] });
    }

    const tags = await prisma.travelTag.findMany({
        where: {
            OR: [
                { name: { contains: query } },
                { slug: { contains: query } }
            ]
        },
        take: 10,
        orderBy: {
            name: 'asc'
        }
    });

    return data({ tags });
}
