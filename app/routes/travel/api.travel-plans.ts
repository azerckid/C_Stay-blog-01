import { type ActionFunctionArgs, type LoaderFunctionArgs, data } from "react-router";
import { prisma } from "~/lib/prisma.server";
import { getSession } from "~/lib/auth-utils.server";
import { z } from "zod";

const createTravelPlanSchema = z.object({
    title: z.string().min(1, "제목은 필수입니다."),
    description: z.string().optional().nullable(),
    startDate: z.string().optional().nullable(),
    endDate: z.string().optional().nullable(),
    status: z.enum(["PLANNING", "ONGOING", "COMPLETED"]).default("PLANNING"),
});

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

export async function action({ request }: ActionFunctionArgs) {
    const session = await getSession(request);
    if (!session) {
        return data({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    if (request.method !== "POST") {
        return data({ error: "Method not allowed" }, { status: 405 });
    }

    try {
        const formData = await request.formData();
        const rawData = {
            title: formData.get("title"),
            description: formData.get("description"),
            startDate: formData.get("startDate"),
            endDate: formData.get("endDate"),
            status: formData.get("status") || "PLANNING",
        };

        const validated = createTravelPlanSchema.parse(rawData);

        const travelPlan = await prisma.travelPlan.create({
            data: {
                userId: session.user.id,
                title: validated.title,
                description: validated.description,
                startDate: validated.startDate ? new Date(validated.startDate) : null,
                endDate: validated.endDate ? new Date(validated.endDate) : null,
                status: validated.status,
            }
        });

        return data({ travelPlan });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return data({ error: error.issues[0].message }, { status: 400 });
        }
        console.error("Failed to create travel plan:", error);
        return data({ error: "여행 계획을 생성하는데 실패했습니다." }, { status: 500 });
    }
}
