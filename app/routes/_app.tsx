import { Outlet, useLoaderData } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import { MainLayout } from "~/components/layout/main-layout";
import { APIProvider } from "@vis.gl/react-google-maps";
import { prisma } from "~/lib/prisma.server";
import { getSession } from "~/lib/auth-utils.server";

export async function loader({ request }: LoaderFunctionArgs) {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const popularTags = await prisma.travelTag.findMany({
        where: {
            tweetTags: {
                some: {
                    tweet: {
                        createdAt: { gte: sevenDaysAgo },
                        deletedAt: null
                    }
                }
            }
        },
        orderBy: {
            tweetTags: {
                _count: "desc"
            }
        },
        take: 5,
        include: {
            _count: {
                select: { tweetTags: true }
            }
        }
    });

    // If no recent tags, fallback to overall popular ones
    let resultTags = popularTags;
    if (popularTags.length === 0) {
        resultTags = await prisma.travelTag.findMany({
            orderBy: {
                tweetTags: {
                    _count: "desc"
                }
            },
            take: 5,
            include: {
                _count: {
                    select: { tweetTags: true }
                }
            }
        });
    }

    const session = await getSession(request);
    const userId = session?.user?.id;

    const unreadCount = (userId && (prisma as any).notification) ? await (prisma as any).notification.count({
        where: { recipientId: userId, isRead: false }
    }) : 0;

    return { popularTags: resultTags, unreadCount };
}

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";

export default function AppLayout() {
    const { popularTags, unreadCount } = useLoaderData<typeof loader>();

    return (
        <APIProvider apiKey={GOOGLE_MAPS_API_KEY} libraries={['places']}>
            <MainLayout popularTags={popularTags} unreadCount={unreadCount}>
                <Outlet />
            </MainLayout>
        </APIProvider>
    );
}
