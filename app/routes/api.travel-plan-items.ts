import { type ActionFunctionArgs, data } from "react-router";
import { prisma } from "~/lib/prisma.server";
import { getSession } from "~/lib/auth-utils.server";
import { z } from "zod";

const createItemSchema = z.object({
    travelPlanId: z.string().min(1),
    title: z.string().min(1, "제목을 입력해주세요."),
    description: z.string().optional(),
    locationName: z.string().optional(),
    date: z.string().optional().nullable(),
    time: z.string().optional().nullable(),
});

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
            travelPlanId: formData.get("travelPlanId"),
            title: formData.get("title"),
            description: formData.get("description"),
            locationName: formData.get("locationName"),
            date: formData.get("date"),
            time: formData.get("time"),
        };

        const validated = createItemSchema.parse(rawData);

        // Verify ownership of the plan
        const plan = await prisma.travelPlan.findUnique({
            where: { id: validated.travelPlanId },
            select: { userId: true }
        });

        if (!plan || plan.userId !== session.user.id) {
            return data({ error: "권한이 없거나 계획을 찾을 수 없습니다." }, { status: 403 });
        }

        // Get max order
        const lastItem = await prisma.travelPlanItem.findFirst({
            where: { travelPlanId: validated.travelPlanId },
            orderBy: { order: "desc" },
            select: { order: true }
        });

        const newOrder = (lastItem?.order ?? -1) + 1;

        const newItem = await prisma.travelPlanItem.create({
            data: {
                travelPlanId: validated.travelPlanId,
                title: validated.title,
                description: validated.description,
                locationName: validated.locationName,
                date: validated.date ? new Date(validated.date) : null,
                time: validated.time,
                order: newOrder,
            }
        });

        return data({ item: newItem });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return data({ error: error.issues[0].message }, { status: 400 });
        }
        console.error("Failed to create travel plan item:", error);
        return data({ error: "항목을 추가하는데 실패했습니다." }, { status: 500 });
    }
}
