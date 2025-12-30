import { redirect } from "react-router";
import { auth } from "~/lib/auth";
import type { LoaderFunctionArgs } from "react-router";

export const loader = async ({ request }: LoaderFunctionArgs) => {
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user) {
        return redirect("/login");
    }

    return redirect(`/user/${session.user.id}`);
};

export default function ProfileRedirect() {
    return null;
}
