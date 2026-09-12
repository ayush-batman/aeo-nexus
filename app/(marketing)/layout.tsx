import { MarketingNav } from "@/components/marketing/nav";
import { MarketingFooter } from "@/components/marketing/footer";

export default function MarketingLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="marketing-site min-h-screen bg-[#131717] text-[#eff2ec] selection:bg-[#a8cbe0] selection:text-[#17201f] font-sans [--accent-base:#a8cbe0] [--accent-hover:#bdd9e8] [--text-on-accent:#17201f]">
            <MarketingNav />
            <main id="main-content">{children}</main>
            <MarketingFooter />
        </div>
    );
}
