import { redirect } from "next/navigation";
import { getCurrentWorkspaceContext } from "@/lib/data-access";
import { getEntitlements } from "@/lib/entitlements";
import { buildReport } from "@/lib/analytics/report";
import { createClient } from "@/lib/supabase/server";
import ReportView from "./report-view";

export const metadata = { title: "Client report · Aelo" };

export default async function ReportPage() {
    const ctx = await getCurrentWorkspaceContext();
    if (!ctx) redirect("/login");

    const supabase = await createClient();
    const { data: ws } = await supabase
        .from("workspaces")
        .select("name")
        .eq("id", ctx.workspaceId)
        .single();
    const brand = ws?.name ?? "Your brand";

    const ent = await getEntitlements(ctx.orgId);
    if (!ent.paid) {
        return <ReportView paid={false} brand={brand} report={null} />;
    }

    const report = await buildReport(ctx.workspaceId, brand, 30);
    return <ReportView paid={true} brand={brand} report={report} />;
}
