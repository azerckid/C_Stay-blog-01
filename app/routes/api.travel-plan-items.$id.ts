import { type ActionFunctionArgs, data } from "react-router";
import { prisma } from "~/lib/prisma.server";
import { getSession } from "~/lib/auth-utils.server";
import { z } from "zod";

const updateItemSchema = z.object({
    title: z.string().min(1, "제목을 입력해주세요."),
    description: z.string().optional().nullable(),
    locationName: z.string().optional().nullable(),
    date: z.string().optional().nullable(),
    time: z.string().optional().nullable(),
    status: z.enum(["TODO", "IN_PROGRESS", "DONE"]).optional(),
});

export async function action({ request, params }: ActionFunctionArgs) {
    const session = await getSession(request);
    if (!session) {
        return data({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const { id } = params;
    if (!id) {
        return data({ error: "잘못된 접근입니다." }, { status: 400 });
    }

    const item = await prisma.travelPlanItem.findUnique({
        where: { id },
        include: { travelPlan: { select: { userId: true } } }
    });

    if (!item) {
        return data({ error: "항목을 찾을 수 없습니다." }, { status: 404 });
    }

    if (item.travelPlan.userId !== session.user.id) {
        return data({ error: "권한이 없습니다." }, { status: 403 });
    }

    if (request.method === "PATCH") {
        try {
            const formData = await request.formData();
            const rawData = {
                title: formData.get("title"),
                description: formData.get("description"),
                locationName: formData.get("locationName"),
                date: formData.get("date"),
                time: formData.get("time"),
                status: formData.get("status"),
            };

            const validated = updateItemSchema.parse(rawData);

            const updatedItem = await prisma.travelPlanItem.update({
                where: { id },
                data: {
                    title: validated.title,
                    description: validated.description,
                    locationName: validated.locationName,
                    date: validated.date ? new Date(validated.date) : null,
                    time: validated.time,
                    status: validated.status,
                }
            });

            return data({ item: updatedItem });
        } catch (error) {
            if (error instanceof z.ZodError) {
                return data({ error: error.issues[0].message }, { status: 400 });
            }
            console.error("Failed to update travel plan item:", error);
            return data({ error: "항목을 수정하는데 실패했습니다." }, { status: 500 });
        }
    }

    if (request.method === "DELETE") {
        try {
            await prisma.travelPlanItem.delete({
                where: { id }
            });
            return data({ success: true });
        } catch (error) {
            console.error("Failed to delete travel plan item:", error);
            return data({ error: "항목을 삭제하는데 실패했습니다." }, { status: 500 });
        }
    }

    return data({ error: "Method not allowed" }, { status: 405 });
}
