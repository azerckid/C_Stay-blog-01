import { Outlet } from "react-router";
import { MainLayout } from "~/components/layout/main-layout";
import { APIProvider } from "@vis.gl/react-google-maps";

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";

export default function AppLayout() {
    return (
        <APIProvider apiKey={GOOGLE_MAPS_API_KEY} libraries={['places']}>
            <MainLayout>
                <Outlet />
            </MainLayout>
        </APIProvider>
    );
}
