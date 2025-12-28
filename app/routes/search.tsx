import type { LoaderFunctionArgs, MetaFunction } from "react-router";
import { Form, useLoaderData, useSearchParams, Link, useNavigate } from "react-router";
import { getSession } from "~/lib/auth-utils.server";
import { prisma } from "~/lib/prisma.server";
import { UserCard } from "~/components/user/user-card";
import { Input } from "~/components/ui/input"; // Need input component? Assuming standard input or basic HTML input
import { Button } from "~/components/ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import { Search01Icon, ArrowLeft02Icon } from "@hugeicons/core-free-icons";

export const meta: MetaFunction = ({ data }: any) => {
    return [{ title: `검색 / STAYnC` }];
};

export async function loader({ request }: LoaderFunctionArgs) {
    const session = await getSession(request);
    const userId = session?.user?.id;
    const url = new URL(request.url);
    const query = url.searchParams.get("q");

    if (!query) {
        return { session, users: [] };
    }

    const users = await prisma.user.findMany({
        where: {
            OR: [
                { name: { contains: query } },
                { email: { contains: query } },
            ]
        },
        take: 20,
        select: {
            id: true,
            name: true,
            email: true,
            image: true,
            avatarUrl: true,
            bio: true,
            followedBy: userId ? {
                where: { followerId: userId },
                select: { id: true }
            } : false
        }
    });

    const formattedUsers = users.map(user => ({
        id: user.id,
        name: user.name,
        username: user.email.split("@")[0],
        image: user.image,
        avatarUrl: user.avatarUrl,
        bio: user.bio,
        isFollowing: (user.followedBy?.length ?? 0) > 0,
        isCurrentUser: user.id === userId
    }));

    return { session, users: formattedUsers, query };
}

export default function SearchPage() {
    const { users, query } = useLoaderData<typeof loader>();
    const navigate = useNavigate();

    return (
        <div className="flex flex-col min-h-screen">
            {/* Header */}
            <header className="sticky top-0 z-20 bg-background/80 backdrop-blur-md border-b border-border px-4 py-3 flex items-center gap-2">
                <button
                    onClick={() => navigate(-1)}
                    className="p-2 -ml-2 hover:bg-accent rounded-full transition-colors"
                >
                    <HugeiconsIcon icon={ArrowLeft02Icon} strokeWidth={2} className="h-5 w-5" />
                </button>
                <Form className="flex-1 relative">
                    <div className="relative">
                        <Input
                            name="q"
                            defaultValue={query || ""}
                            placeholder="사용자 검색"
                            className="pl-10 rounded-full bg-accent/50 border-transparent focus:bg-background focus:border-primary transition-all"
                            autoComplete="off"
                        />
                        <HugeiconsIcon
                            icon={Search01Icon}
                            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
                        />
                    </div>
                </Form>
            </header>

            <main className="flex-1">
                {query && users.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                        "{query}"에 대한 검색 결과가 없습니다.
                    </div>
                ) : (
                    <div className="flex flex-col">
                        {users.map((user: any) => (
                            <UserCard
                                key={user.id}
                                user={user}
                                isCurrentUser={user.isCurrentUser}
                                isFollowing={user.isFollowing}
                            />
                        ))}
                    </div>
                )}
                {!query && (
                    <div className="p-8 text-center text-muted-foreground text-sm">
                        사용자 이름이나 이메일로 검색해보세요.
                    </div>
                )}
            </main>
        </div>
    );
}
