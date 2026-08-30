import DashboardView from "./dashboard-view";
import { AdminRoleRedirect } from "@/components/AdminRoleRedirect";
import Premium3DBackground from "@/components/background/Premium3DBackground";

export default function DashboardPage() {
    return (
        <AdminRoleRedirect>
            <DashboardView />
        </AdminRoleRedirect>
    );
}