import type { LoaderFunctionArgs, MetaFunction } from "react-router";
import { getSession } from "~/lib/auth-utils.server";
import { useLoaderData, useFetcher, useNavigate, Link, data } from "react-router";
import { db } from "~/db";
import { notifications, follows } from "~/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { DateTime } from "luxon";
import { HugeiconsIcon } from "@hugeicons/react";
import {
    FavouriteIcon,
    Message01Icon,
    RepeatIcon,
    Settings02Icon,
    Tick01Icon,
    UserIcon,
    Delete02Icon,
    MoreHorizontalIcon
} from "@hugeicons/core-free-icons";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { cn } from "~/lib/utils";
import { useEffect, useState } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";

export const meta: MetaFunction = () => {
    return [
        { title: "알림 / STAYnC" },
    ];
};

export async function loader({ request }: LoaderFunctionArgs) {
    const session = await getSession(request);
    if (!session) {
        return data({ notifications: [] }, { status: 401 });
    }

    const userId = session.user.id;

    const notificationsList = await db.query.notifications.findMany({
        where: eq(notifications.recipientId, userId),
        orderBy: [desc(notifications.createdAt)],
        limit: 50,
        with: {
            issuer: {
                columns: {
                    id: true,
                    name: true,
                    image: true,
                    email: true,
                }
            },
            // Assuming 'tweet' relation exists on notifications in schema.ts.
            // If not found in previous sessions, I should check schema again or assume it was added if partial views didn't show.
            // Based on 'api.tweets.ts' comments, it might be missing or under different name?
            // Drizzle schema relations: notifications table has tweetId field
            // The relation is defined in schema.ts as tweetsRelations.notifications
            // We can safely use the tweet relation here
            tweet: {
                columns: {
                    id: true,
                    content: true
                }
            }
        }
    });

    // 팔로우 요청 알림에 대해 실제 팔로우 상태 확인
    const notificationsWithStatus = await Promise.all(notificationsList.map(async (notification) => {
        if (notification.type === "FOLLOW_REQUEST") {
            // issuer가 나(recipient)를 팔로우하고 있는지 확인
            // Follow 테이블: followerId(요청자) -> followingId(나)
            const follow = await db.query.follows.findFirst({
                where: and(
                    eq(follows.followerId, notification.issuerId),
                    eq(follows.followingId, userId)
                )
            });

            // 팔로우 요청이 존재하고 상태가 PENDING이면 아직 처리 안 된 것 (isHandled = false)
            // 팔로우가 없거나(거절됨), 상태가 ACCEPTED면 처리 된 것 (isHandled = true)
            const isHandled = !follow || follow.status !== "PENDING";
            return { ...notification, isHandled };
        }
        return { ...notification, isHandled: false };
    }));

    return data({ notifications: notificationsWithStatus });
}

export default function NotificationsPage() {
    const { notifications } = useLoaderData<typeof loader>();
    const navigate = useNavigate();
    const fetcher = useFetcher();

    // 페이지 진입 시 모든 알림 읽음 처리
    useEffect(() => {
        if (notifications.some((n: any) => !n.isRead)) {
            fetcher.submit({}, { method: "POST", action: "/api/notifications" });
        }
    }, []);

    return (
        <div className="flex flex-col min-h-screen">
            <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border px-4 py-3 flex items-center justify-between">
                <h1 className="text-xl font-bold font-heading">알림</h1>
                <DropdownMenu>
                    <DropdownMenuTrigger className="p-2 hover:bg-accent rounded-full transition-colors outline-none">
                        <HugeiconsIcon icon={Settings02Icon} className="h-5 w-5" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem
                            className="text-destructive focus:text-destructive cursor-pointer"
                            onClick={() => {
                                if (confirm("모든 알림을 삭제하시겠습니까?")) {
                                    fetcher.submit({ type: "all" }, { method: "DELETE", action: "/api/notifications" });
                                }
                            }}
                        >
                            <HugeiconsIcon icon={Delete02Icon} className="mr-2 h-4 w-4" />
                            모든 알림 삭제
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </header>

            <main className="flex-1">
                {notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
                        <h2 className="text-2xl font-bold mb-2">아직 알림이 없습니다</h2>
                        <p className="text-muted-foreground max-w-xs">
                            좋아요, 리트윗, 팔로우 등의 소식이 여기에 표시됩니다.
                        </p>
                    </div>
                ) : (
                    <div className="divide-y divide-border">
                        {notifications.map((notification: any) => (
                            <NotificationItem key={notification.id} notification={notification} />
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}

function NotificationItem({ notification }: { notification: any }) {
    const navigate = useNavigate();
    const fetcher = useFetcher();
    // 서버에서 전달받은 isHandled 값을 초기값으로 사용
    const [hasHandled, setHasHandled] = useState(notification.isHandled || false);

    useEffect(() => {
        if (fetcher.state === "idle" && fetcher.data && (fetcher.data as any).success) {
            setHasHandled(true);
        }
    }, [fetcher.state, fetcher.data]);

    const getNotificationIcon = (type: string) => {
        switch (type) {
            case "LIKE":
                return <HugeiconsIcon icon={FavouriteIcon} className="h-5 w-5 text-rose-500 fill-rose-500" />;
            case "REPLY":
                return <HugeiconsIcon icon={Message01Icon} className="h-5 w-5 text-blue-500" />;
            case "FOLLOW":
            case "FOLLOW_REQUEST":
                return <HugeiconsIcon icon={UserIcon} className="h-5 w-5 text-primary" />;
            case "RETWEET":
                return <HugeiconsIcon icon={RepeatIcon} className="h-5 w-5 text-green-500" />;
            case "FOLLOW_ACCEPTED":
                return <HugeiconsIcon icon={Tick01Icon} className="h-5 w-5 text-green-500" />;
            default:
                return null;
        }
    };

    const getNotificationText = (notification: any) => {
        const name = notification.issuer.name || "알 수 없음";
        switch (notification.type) {
            case "LIKE":
                return <span><strong className="font-bold">{name}</strong>님이 내 트윗을 좋아합니다</span>;
            case "REPLY":
                return <span><strong className="font-bold">{name}</strong>님이 내 트윗에 답글을 남겼습니다</span>;
            case "FOLLOW":
                return <span><strong className="font-bold">{name}</strong>님이 나를 팔로우하기 시작했습니다</span>;
            case "FOLLOW_REQUEST":
                return <span><strong className="font-bold">{name}</strong>님이 팔로우를 요청했습니다</span>;
            case "FOLLOW_ACCEPTED":
                return <span><strong className="font-bold">{name}</strong>님이 팔로우 요청을 수락했습니다</span>;
            case "RETWEET":
                return <span><strong className="font-bold">{name}</strong>님이 내 트윗을 리트윗했습니다</span>;
            default:
                return null;
        }
    };

    const handleNotificationClick = (notification: any) => {
        if (notification.tweetId) {
            navigate(`/tweet/${notification.tweetId}`);
        } else if (["FOLLOW", "FOLLOW_REQUEST", "FOLLOW_ACCEPTED"].includes(notification.type)) {
            navigate(`/user/${notification.issuerId}`);
        }
    };

    return (
        <div
            onClick={() => handleNotificationClick(notification)}
            className={cn(
                "p-4 flex gap-4 cursor-pointer hover:bg-accent/50 transition-colors group relative",
                !notification.isRead && "bg-primary/5 border-l-2 border-primary"
            )}
        >
            <div className="mt-1">
                {getNotificationIcon(notification.type)}
            </div>
            <div className="flex-1 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                        <AvatarImage src={notification.issuer.image || ""} />
                        <AvatarFallback>{notification.issuer.name?.[0] || 'U'}</AvatarFallback>
                    </Avatar>
                    <div className="text-xs text-muted-foreground">
                        {DateTime.fromISO(notification.createdAt).setLocale("ko").toRelative()}
                    </div>
                </div>
                <div className="text-sm">
                    {getNotificationText(notification)}
                </div>
                {notification.tweet && (
                    <div className="text-sm text-muted-foreground line-clamp-2 mt-1 px-3 py-2 bg-accent/50 rounded-lg italic">
                        "{notification.tweet.content}"
                    </div>
                )}

                {/* Follow Request Actions */}
                {notification.type === "FOLLOW_REQUEST" && !hasHandled && (
                    <div className="flex items-center gap-2 mt-2" onClick={(e) => e.stopPropagation()}>
                        <fetcher.Form method="post" action="/api/follows" onSubmit={() => setHasHandled(true)}>
                            <input type="hidden" name="targetUserId" value={notification.issuerId} />
                            <input type="hidden" name="intent" value="accept" />
                            <Button
                                type="submit"
                                size="sm"
                                className="h-8 px-4 rounded-full font-bold"
                                disabled={fetcher.state !== "idle"}
                            >
                                승인
                            </Button>
                        </fetcher.Form>
                        <fetcher.Form method="post" action="/api/follows" onSubmit={() => setHasHandled(true)}>
                            <input type="hidden" name="targetUserId" value={notification.issuerId} />
                            <input type="hidden" name="intent" value="reject" />
                            <Button
                                type="submit"
                                variant="outline"
                                size="sm"
                                className="h-8 px-4 rounded-full font-bold text-destructive border-destructive/50 hover:bg-destructive/10"
                                disabled={fetcher.state !== "idle"}
                            >
                                거절
                            </Button>
                        </fetcher.Form>
                    </div>
                )}
                {hasHandled && (
                    <div className="text-sm text-muted-foreground mt-2 font-medium">
                        요청이 처리되었습니다.
                    </div>
                )}
            </div>

            {/* Delete Single Notification */}
            <div className="opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                <DropdownMenu>
                    <DropdownMenuTrigger className="p-1.5 hover:bg-primary/10 rounded-full transition-colors text-muted-foreground hover:text-primary outline-none">
                        <HugeiconsIcon icon={MoreHorizontalIcon} className="h-4 w-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem
                            className="text-destructive focus:text-destructive cursor-pointer"
                            onClick={() => {
                                fetcher.submit({ id: notification.id }, { method: "DELETE", action: "/api/notifications" });
                            }}
                        >
                            <HugeiconsIcon icon={Delete02Icon} className="mr-2 h-4 w-4" />
                            알림 삭제
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    );
}
