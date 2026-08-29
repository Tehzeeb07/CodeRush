import DashboardView from "./dashboard-view";
import { AdminRoleRedirect } from "@/components/AdminRoleRedirect";

export default function DashboardPage() {
    return (
        <AdminRoleRedirect>
            <DashboardView />
        </AdminRoleRedirect>
    );
}