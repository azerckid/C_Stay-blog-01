import { type ActionFunctionArgs, type LoaderFunctionArgs, data } from "react-router";
import { getSession } from "~/lib/auth-utils.server";
import { db } from "~/db";
import { travelPlans } from "~/db/schema";
import { eq, and, desc } from "drizzle-orm";
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
    const status = url.searchParams.get("status") as "PLANNING" | "ONGOING" | "COMPLETED" | null;

    try {
        const plans = await db.query.travelPlans.findMany({
            where: status
                ? and(eq(travelPlans.userId, userId), eq(travelPlans.status, status))
                : eq(travelPlans.userId, userId),
            orderBy: [desc(travelPlans.createdAt)],
            with: {
                items: true,
                tweets: true
            }
        });

        const formattedPlans = plans.map(p => ({
            ...p,
            _count: {
                items: p.items.length,
                tweets: p.tweets.length
            }
        }));

        return data({ travelPlans: formattedPlans });
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

        const [travelPlan] = await db.insert(travelPlans).values({
            id: crypto.randomUUID(),
            userId: session.user.id,
            title: validated.title,
            description: validated.description,
            // Drizzle schema uses text for dates, so use ISO string
            startDate: validated.startDate ? new Date(validated.startDate).toISOString() : null,
            endDate: validated.endDate ? new Date(validated.endDate).toISOString() : null,
            status: validated.status,
            updatedAt: new Date().toISOString(),
        }).returning();

        return data({ travelPlan });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return data({ error: error.issues[0].message }, { status: 400 });
        }
        console.error("Failed to create travel plan:", error);
        return data({ error: "여행 계획을 생성하는데 실패했습니다." }, { status: 500 });
    }
}
