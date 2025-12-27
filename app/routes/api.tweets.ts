import { type ActionFunctionArgs, data } from "react-router";
import { prisma } from "~/lib/prisma.server";
import { getSession } from "~/lib/auth-utils.server";
import { z } from "zod";

const createTweetSchema = z.object({
    content: z.string().min(1, "내용을 입력해주세요.").max(280, "280자 이내로 입력해주세요."),
    locationName: z.string().optional().nullable(),
    country: z.string().optional().nullable(),
    city: z.string().optional().nullable(),
    travelDate: z.string().optional().nullable(),
});

export async function action({ request }: ActionFunctionArgs) {
    if (request.method !== "POST") {
        return data({ error: "Method Not Allowed" }, { status: 405 });
    }

    const session = await getSession(request);
    if (!session) {
        return data({ error: "인증이 필요합니다." }, { status: 401 });
    }

    try {
        const formData = await request.formData();
        const payload = {
            content: formData.get("content"),
            locationName: formData.get("locationName") || undefined,
            country: formData.get("country") || undefined,
            city: formData.get("city") || undefined,
            travelDate: formData.get("travelDate") || undefined,
        };

        const validatedData = createTweetSchema.parse(payload);

        const tweet = await prisma.tweet.create({
            data: {
                content: validatedData.content,
                userId: session.user.id,
                locationName: validatedData.locationName,
                country: validatedData.country,
                city: validatedData.city,
                travelDate: validatedData.travelDate ? new Date(validatedData.travelDate as unknown as string) : undefined,
            },
            include: {
                user: true,
            }
        });

        return data({ success: true, tweet }, { status: 201 });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return data({ error: error.issues[0].message }, { status: 400 });
        }
        console.error("Tweet Creation Error:", error);
        return data({ error: "트윗 작성 중 오류가 발생했습니다." }, { status: 500 });
    }
}
