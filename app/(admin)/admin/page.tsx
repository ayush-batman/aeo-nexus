import { getPlatformStats, getAllOrganizations } from "@/lib/admin";
import AdminDashboardClient from "./AdminDashboardClient";

export default async function AdminDashboard() {
    const stats = await getPlatformStats();
    const recentOrgs = (await getAllOrganizations()).slice(0, 5);

    return <AdminDashboardClient initialStats={stats} initialOrgs={recentOrgs} />;
}
