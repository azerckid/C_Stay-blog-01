"use client";

import { Outlet, useLoaderData } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import { MainLayout } from "~/components/layout/main-layout";
import { APIProvider } from "@vis.gl/react-google-maps";
import { db } from "~/db";
import { travelTags, tweetTravelTags, tweets, notifications } from "~/db/schema";
import { eq, and, desc, count, gte, isNull, sql } from "drizzle-orm";
import { getSession } from "~/lib/auth-utils.server";

export async function loader({ request }: LoaderFunctionArgs) {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString();

    const fetchPopularTags = async (dateFilter: boolean) => {
        const query = db.select({
            id: travelTags.id,
            name: travelTags.name,
            slug: travelTags.slug,
            count: count(tweetTravelTags.tweetId)
        })
            .from(travelTags)
            .leftJoin(tweetTravelTags, eq(travelTags.id, tweetTravelTags.travelTagId))
            .leftJoin(tweets, eq(tweetTravelTags.tweetId, tweets.id))
            .where(dateFilter ? and(
                gte(tweets.createdAt, sevenDaysAgoStr),
                isNull(tweets.deletedAt)
            ) : isNull(tweets.deletedAt)) // Ensure we don't count deleted tweets generally, or removed constraint if checking all time?
            // Actually for fallback (all time), we might just count all tags usage.
            .groupBy(travelTags.id)
            .orderBy(desc(count(tweetTravelTags.tweetId)))
            .limit(5);

        return await query;
    };

    let resultTags = await fetchPopularTags(true);

    if (resultTags.length === 0) {
        // Fallback: simple popular tags without date restriction
        // Note: The previous join logic filters by 'tweets' table to check deletedAt.
        // If we want raw tag count regardless of tweet status (if we don't join stats), we might count just tweetTravelTags.
        // But safer to check existence of valid tweet.
        resultTags = await db.select({
            id: travelTags.id,
            name: travelTags.name,
            slug: travelTags.slug,
            count: count(tweetTravelTags.tweetId)
        })
            .from(travelTags)
            .leftJoin(tweetTravelTags, eq(travelTags.id, tweetTravelTags.travelTagId))
            .groupBy(travelTags.id)
            .orderBy(desc(count(tweetTravelTags.tweetId)))
            .limit(5);
    }

    const formattedTags = resultTags.map(t => ({
        ...t,
        _count: { tweetTags: Number(t.count) }
    }));

    const session = await getSession(request);
    const userId = session?.user?.id;

    let unreadCount = 0;
    if (userId) {
        const [{ value }] = await db.select({ value: count() })
            .from(notifications)
            .where(and(
                eq(notifications.recipientId, userId),
                eq(notifications.isRead, false)
            ));
        unreadCount = value;
    }

    return { popularTags: formattedTags, unreadCount };
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
