import { Outlet, useLoaderData } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import { MainLayout } from "~/components/layout/main-layout";
import { APIProvider } from "@vis.gl/react-google-maps";
import { prisma } from "~/lib/prisma.server";

export async function loader({ request }: LoaderFunctionArgs) {
    const popularTags = await prisma.travelTag.findMany({
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

    return { popularTags };
}

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";

export default function AppLayout() {
    const { popularTags } = useLoaderData<typeof loader>();

    return (
        <APIProvider apiKey={GOOGLE_MAPS_API_KEY} libraries={['places']}>
            <MainLayout popularTags={popularTags}>
                <Outlet />
            </MainLayout>
        </APIProvider>
    );
}
