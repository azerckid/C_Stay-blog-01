import { type ActionFunctionArgs, data } from "react-router";
import { prisma } from "~/lib/prisma.server";
import { getSession } from "~/lib/auth-utils.server";
import { z } from "zod";

const updateTravelPlanSchema = z.object({
    title: z.string().min(1, "제목은 필수입니다."),
    description: z.string().optional().nullable(),
    startDate: z.string().optional().nullable(),
    endDate: z.string().optional().nullable(),
    status: z.enum(["PLANNING", "ONGOING", "COMPLETED"]),
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

    const travelPlan = await prisma.travelPlan.findUnique({
        where: { id },
        select: { userId: true }
    });

    if (!travelPlan) {
        return data({ error: "여행 계획을 찾을 수 없습니다." }, { status: 404 });
    }

    if (travelPlan.userId !== session.user.id) {
        return data({ error: "권한이 없습니다." }, { status: 403 });
    }

    if (request.method === "PATCH") {
        try {
            const formData = await request.formData();
            const rawData = {
                title: formData.get("title"),
                description: formData.get("description"),
                startDate: formData.get("startDate"),
                endDate: formData.get("endDate"),
                status: formData.get("status"),
            };

            const validated = updateTravelPlanSchema.parse(rawData);

            const updatedPlan = await prisma.travelPlan.update({
                where: { id },
                data: {
                    title: validated.title,
                    description: validated.description,
                    startDate: validated.startDate ? new Date(validated.startDate) : null,
                    endDate: validated.endDate ? new Date(validated.endDate) : null,
                    status: validated.status,
                }
            });

            return data({ travelPlan: updatedPlan });
        } catch (error) {
            if (error instanceof z.ZodError) {
                return data({ error: error.issues[0].message }, { status: 400 });
            }
            console.error("Failed to update travel plan:", error);
            return data({ error: "여행 계획을 수정하는데 실패했습니다." }, { status: 500 });
        }
    }

    if (request.method === "DELETE") {
        try {
            await prisma.travelPlan.delete({
                where: { id }
            });
            return data({ success: true });
        } catch (error) {
            console.error("Failed to delete travel plan:", error);
            return data({ error: "여행 계획을 삭제하는데 실패했습니다." }, { status: 500 });
        }
    }

    return data({ error: "Method not allowed" }, { status: 405 });
}
