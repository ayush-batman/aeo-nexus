import { Header } from "@/components/dashboard/header";
import { CitationMap } from "@/components/dashboard/analytics/citation-map";

export default function SourcesPage() {
    return <>
        <Header title="Sources" description="Provider-backed domains, exact URLs, and evidence gaps" />
        <main className="mx-auto max-w-[1440px] px-5 py-10 sm:px-8 lg:px-16 lg:py-12">
            <CitationMap />
        </main>
    </>;
}
