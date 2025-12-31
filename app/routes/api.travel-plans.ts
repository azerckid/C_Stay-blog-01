import { type LoaderFunctionArgs, data } from "react-router";
import { prisma } from "~/lib/prisma.server";
import { getSession } from "~/lib/auth-utils.server";

export async function loader({ request }: LoaderFunctionArgs) {
    const session = await getSession(request);
    if (!session) {
        return data({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const userId = session.user.id;
    const url = new URL(request.url);
    const status = url.searchParams.get("status") || undefined;

    try {
        const travelPlans = await prisma.travelPlan.findMany({
            where: {
                userId,
                status: status as any,
            },
            orderBy: {
                createdAt: "desc",
            },
            include: {
                _count: {
                    select: {
                        items: true,
                        tweets: true,
                    }
                }
            }
        });

        return data({ travelPlans });
    } catch (error) {
        console.error("Failed to fetch travel plans:", error);
        return data({ error: "여행 계획을 불러오는데 실패했습니다." }, { status: 500 });
    }
}
