import { type ActionFunctionArgs, data } from "react-router";
import { auth } from "~/lib/auth";
import { prisma } from "~/lib/prisma.server";

export async function action({ request }: ActionFunctionArgs) {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session || !session.user) {
        return data({ error: "Unauthorized" }, { status: 401 });
    }

    if (request.method !== "PATCH") {
        return data({ error: "Method Not Allowed" }, { status: 405 });
    }

    const formData = await request.formData();
    const dataToUpdate: any = {};
    if (formData.has("name")) dataToUpdate.name = formData.get("name") as string;
    if (formData.has("bio")) dataToUpdate.bio = formData.get("bio") as string;
    if (formData.has("image")) dataToUpdate.image = formData.get("image") as string;
    if (formData.has("coverImage")) dataToUpdate.coverImage = formData.get("coverImage") as string;
    if (formData.has("isPrivate")) {
        const isPrivateStr = formData.get("isPrivate") as string;
        dataToUpdate.isPrivate = isPrivateStr === "true";
    }

    try {
        const updatedUser = await prisma.user.update({
            where: { id: session.user.id },
            data: dataToUpdate
        });

        return data({ success: true, user: updatedUser });
    } catch (error) {
        console.error("User Update Error:", error);
        return data({ error: "Failed to update profile details" }, { status: 500 });
    }
}
