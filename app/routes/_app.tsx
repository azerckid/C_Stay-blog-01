import { Outlet } from "react-router";
import { MainLayout } from "~/components/layout/main-layout";

export default function AppLayout() {
    return (
        <MainLayout>
            <Outlet />
        </MainLayout>
    );
}
