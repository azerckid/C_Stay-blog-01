import { type ActionFunctionArgs, data } from "react-router";
import { auth } from "~/lib/auth";
import { db } from "~/db";
import { users } from "~/db/schema";
import { eq } from "drizzle-orm";

export async function action({ request }: ActionFunctionArgs) {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session || !session.user) {
        return data({ error: "Unauthorized" }, { status: 401 });
    }

    if (request.method !== "PATCH") {
        return data({ error: "Method Not Allowed" }, { status: 405 });
    }

    const formData = await request.formData();
    const dataToUpdate: Partial<typeof users.$inferInsert> = {};
    if (formData.has("name")) dataToUpdate.name = formData.get("name") as string;
    if (formData.has("bio")) dataToUpdate.bio = formData.get("bio") as string;
    if (formData.has("image")) dataToUpdate.image = formData.get("image") as string;
    if (formData.has("coverImage")) dataToUpdate.coverImage = formData.get("coverImage") as string;
    if (formData.has("isPrivate")) {
        const isPrivateStr = formData.get("isPrivate") as string;
        // isPrivate in Drizzle (sqlite) is typically integer (boolean mode).
        // Check schema. If it's `integer("isPrivate", { mode: "boolean" })`, true/false works.
        // If it's boolean, fine.
        // Assuming boolean mode based on other files.
        dataToUpdate.isPrivate = isPrivateStr === "true";
    }

    try {
        const [updatedUser] = await db.update(users)
            .set(dataToUpdate)
            .where(eq(users.id, session.user.id))
            .returning();

        return data({ success: true, user: updatedUser });
    } catch (error) {
        console.error("User Update Error:", error);
        return data({ error: "Failed to update profile details" }, { status: 500 });
    }
}
