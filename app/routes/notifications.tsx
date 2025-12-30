import type { LoaderFunctionArgs, MetaFunction } from "react-router";
import { getSession } from "~/lib/auth-utils.server";
import { useLoaderData, useFetcher, useNavigate, Link, data } from "react-router";
import { prisma } from "~/lib/prisma.server";
import { DateTime } from "luxon";
import { HugeiconsIcon } from "@hugeicons/react";
import {
    FavouriteIcon,
    Message01Icon,
    UserAdd01Icon,
    RepeatIcon,
    Settings02Icon,
    Tick01Icon
} from "@hugeicons/core-free-icons";
import { cn } from "~/lib/utils";
import { useEffect } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "~/components/ui/avatar";

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

    const notifications = await prisma.notification.findMany({
        where: { recipientId: userId },
        orderBy: { createdAt: "desc" },
        take: 50,
        include: {
            issuer: {
                select: {
                    id: true,
                    name: true,
                    image: true,
                    email: true,
                }
            },
            tweet: {
                select: {
                    id: true,
                    content: true,
                }
            }
        }
    });

    return data({ notifications });
}

export default function NotificationsPage() {
    const { notifications } = useLoaderData<typeof loader>();
    const navigate = useNavigate();
    const fetcher = useFetcher();

    // 페이지 진입 시 모든 알림 읽음 처리
    useEffect(() => {
        if (notifications.some(n => !n.isRead)) {
            fetcher.submit({}, { method: "POST", action: "/api/notifications" });
        }
    }, []);

    const getNotificationIcon = (type: string) => {
        switch (type) {
            case "LIKE":
                return <HugeiconsIcon icon={FavouriteIcon} className="h-5 w-5 text-rose-500 fill-rose-500" />;
            case "REPLY":
                return <HugeiconsIcon icon={Message01Icon} className="h-5 w-5 text-blue-500" />;
            case "FOLLOW":
                return <HugeiconsIcon icon={UserAdd01Icon} className="h-5 w-5 text-primary" />;
            case "RETWEET":
                return <HugeiconsIcon icon={RepeatIcon} className="h-5 w-5 text-green-500" />;
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
            case "RETWEET":
                return <span><strong className="font-bold">{name}</strong>님이 내 트윗을 리트윗했습니다</span>;
            default:
                return null;
        }
    };

    const handleNotificationClick = (notification: any) => {
        if (notification.tweetId) {
            navigate(`/tweet/${notification.tweetId}`);
        } else if (notification.type === "FOLLOW") {
            navigate(`/user/${notification.issuerId}`);
        }
    };

    return (
        <div className="flex flex-col min-h-screen">
            <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border px-4 py-3 flex items-center justify-between">
                <h1 className="text-xl font-bold font-heading">알림</h1>
                <button className="p-2 hover:bg-accent rounded-full transition-colors">
                    <HugeiconsIcon icon={Settings02Icon} className="h-5 w-5" />
                </button>
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
                            <div
                                key={notification.id}
                                onClick={() => handleNotificationClick(notification)}
                                className={cn(
                                    "p-4 flex gap-4 cursor-pointer hover:bg-accent/50 transition-colors",
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
                                            {DateTime.fromJSDate(new Date(notification.createdAt)).setLocale("ko").toRelative()}
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
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
