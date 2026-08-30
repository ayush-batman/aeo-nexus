import { Header } from "@/components/dashboard/header";
import { CitationMap } from "@/components/dashboard/analytics/citation-map";

export default function SourcesPage() {
    return <>
        <Header title="Sources" description="Provider-backed domains, exact URLs, and evidence gaps" />
        <main className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
            <CitationMap />
        </main>
    </>;
}
