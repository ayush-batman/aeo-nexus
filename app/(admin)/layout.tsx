import { redirect } from "next/navigation";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { isSuperAdmin } from "@/lib/admin";

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // Check if user is super admin
    const isAdmin = await isSuperAdmin();

    if (!isAdmin) {
        redirect("/dashboard");
    }

    return (
        <div className="min-h-screen bg-[var(--background)]">
            <AdminSidebar />
            <main className="pl-64 transition-all duration-300">
                {children}
            </main>
        </div>
    );
}
