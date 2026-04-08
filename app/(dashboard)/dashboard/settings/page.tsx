"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Script from "next/script";
import { Header } from "@/components/dashboard/header";
import { SchedulesTab } from "@/components/dashboard/settings/schedules-tab";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import {
    Settings,
    User,
    Building,
    CreditCard,
    Users,
    Bell,
    Key,
    Save,
    Plus,
    Trash2,
    Crown,
    Loader2,
    CheckCircle,
    IndianRupee,
    Swords,
    X,
    Calendar,
    AlertCircle,
} from "lucide-react";
import { PLAN_LIMITS, PLAN_PRICES } from "@/lib/config";


declare global {
    interface Window {
        Razorpay: new (options: RazorpayOptions) => RazorpayInstance;
    }
}

interface RazorpayOptions {
    key: string;
    amount: number;
    currency: string;
    name: string;
    description: string;
    order_id: string;
    handler: (response: RazorpayResponse) => void;
    prefill: { email: string };
    theme: { color: string };
}

interface RazorpayInstance {
    open: () => void;
}

interface RazorpayResponse {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
}

const tabs = [
    { id: "general", label: "General", icon: Settings },
    { id: "team", label: "Team", icon: Users },
    { id: "billing", label: "Billing", icon: CreditCard },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "schedules", label: "Scheduled Scans", icon: Calendar },
    { id: "api", label: "API Keys", icon: Key },
];

interface UserProfile {
    id: string;
    email: string;
    full_name: string | null;
    role: string;
    org_id: string;
}

interface Workspace {
    id: string;
    name: string;
    settings: Record<string, unknown>;
}

interface Organization {
    id: string;
    name: string;
    plan: string;
}

interface TeamMember {
    id: string;
    full_name: string | null;
    email: string;
    role: string;
}



export default function SettingsPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [activeTab, setActiveTab] = useState("general");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [upgrading, setUpgrading] = useState<string | null>(null);
    const [paymentSuccess, setPaymentSuccess] = useState(false);

    // Data states
    const [user, setUser] = useState<UserProfile | null>(null);
    const [workspace, setWorkspace] = useState<Workspace | null>(null);
    const [organization, setOrganization] = useState<Organization | null>(null);
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);

    // Form states
    const [workspaceName, setWorkspaceName] = useState("");
    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [competitors, setCompetitors] = useState<string[]>([]);
    const [newCompetitor, setNewCompetitor] = useState("");
    const [savingCompetitors, setSavingCompetitors] = useState(false);
    const [upgradeError, setUpgradeError] = useState<string | null>(null);

    // Alert preferences state
    const [alertPrefs, setAlertPrefs] = useState<Record<string, boolean>>({});
    const [savingAlerts, setSavingAlerts] = useState(false);
    const [alertsSaved, setAlertsSaved] = useState(false);

    // Check for payment redirect status
    useEffect(() => {
        const success = searchParams.get("success");
        if (success) {
            setPaymentSuccess(true);
            fetchData();
            setTimeout(() => setPaymentSuccess(false), 5000);
        }
    }, [searchParams]);

    async function fetchData() {
        try {
            const supabase = createClient();

            const { data: { user: authUser } } = await supabase.auth.getUser();
            if (!authUser) return;

            const { data: userData } = await supabase
                .from('users')
                .select('*')
                .eq('id', authUser.id)
                .single();

            if (userData) {
                setUser(userData);
                setFullName(userData.full_name || '');
                setEmail(userData.email);

                const { data: orgData } = await supabase
                    .from('organizations')
                    .select('*')
                    .eq('id', userData.org_id)
                    .single();

                if (orgData) {
                    setOrganization(orgData);
                }

                const { data: workspaceData } = await supabase
                    .from('workspaces')
                    .select('*')
                    .eq('org_id', userData.org_id)
                    .limit(1)
                    .single();

                if (workspaceData) {
                    setWorkspace(workspaceData);
                    setWorkspaceName(workspaceData.name);
                    setCompetitors(workspaceData.settings?.competitors || []);
                }

                const { data: teamData } = await supabase
                    .from('users')
                    .select('id, full_name, email, role')
                    .eq('org_id', userData.org_id);

                if (teamData) {
                    setTeamMembers(teamData);
                }
            }
        } catch (error) {
            console.error('Error fetching settings data:', error);
        } finally {
            setLoading(false);
        }

        // Load alert preferences
        try {
            const alertRes = await fetch('/api/alerts/preferences');
            if (alertRes.ok) {
                const alertData = await alertRes.json();
                const prefsMap: Record<string, boolean> = {};
                (alertData.preferences || []).forEach((p: { alert_type: string; enabled: boolean }) => {
                    prefsMap[p.alert_type] = p.enabled;
                });
                setAlertPrefs(prefsMap);
            }
        } catch (err) {
            console.error('Error loading alert preferences:', err);
        }
    }

    useEffect(() => {
        fetchData();
    }, []);

    async function saveAlertPrefs() {
        setSavingAlerts(true);
        setAlertsSaved(false);
        try {
            const preferences = Object.entries(alertPrefs).map(([alert_type, enabled]) => ({
                alert_type,
                enabled,
            }));
            await fetch('/api/alerts/preferences', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ preferences }),
            });
            setAlertsSaved(true);
            setTimeout(() => setAlertsSaved(false), 3000);
        } catch (err) {
            console.error('Error saving alert preferences:', err);
        } finally {
            setSavingAlerts(false);
        }
    }

    async function handleSaveWorkspace() {
        if (!workspace) return;
        setSaving(true);
        setSaveSuccess(false);

        try {
            const supabase = createClient();
            await supabase
                .from('workspaces')
                .update({ name: workspaceName })
                .eq('id', workspace.id);

            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
        } catch (error) {
            console.error('Error saving workspace:', error);
        } finally {
            setSaving(false);
        }
    }

    async function handleSaveProfile() {
        if (!user) return;
        setSaving(true);
        setSaveSuccess(false);

        try {
            const supabase = createClient();
            await supabase
                .from('users')
                .update({ full_name: fullName })
                .eq('id', user.id);

            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
        } catch (error) {
            console.error('Error saving profile:', error);
        } finally {
            setSaving(false);
        }
    }

    async function handleUpgrade(plan: string) {
        if (!user || !organization) return;
        setUpgrading(plan);
        setUpgradeError(null);

        try {
            // Create Razorpay order
            const response = await fetch('/api/razorpay/create-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ plan }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to create order');
            }

            if (!data.orderId) {
                throw new Error(data.error || 'Failed to create order');
            }

            // Open Razorpay checkout
            const options: RazorpayOptions = {
                key: data.keyId,
                amount: data.amount,
                currency: data.currency,
                name: 'Aelo',
                description: data.plan,
                order_id: data.orderId,
                handler: async (response: RazorpayResponse) => {
                    // Verify payment
                    const verifyRes = await fetch('/api/razorpay/verify', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature,
                            plan,
                            org_id: organization.id,
                        }),
                    });

                    if (verifyRes.ok) {
                        setPaymentSuccess(true);
                        fetchData();
                        setTimeout(() => setPaymentSuccess(false), 5000);
                    }
                },
                prefill: {
                    email: user.email,
                },
                theme: {
                    color: '#7c3aed',
                },
            };

            const razorpay = new window.Razorpay(options);
            razorpay.open();
        } catch (error) {
            console.error('Upgrade error:', error);
            setUpgradeError(error instanceof Error ? error.message : 'Payment initialization failed');
        } finally {
            setUpgrading(null);
        }
    }

    function addCompetitor() {
        const name = newCompetitor.trim();
        if (!name || competitors.includes(name)) return;
        setCompetitors(prev => [...prev, name]);
        setNewCompetitor("");
    }

    function removeCompetitor(name: string) {
        setCompetitors(prev => prev.filter(c => c !== name));
    }

    async function handleSaveCompetitors() {
        if (!workspace) return;
        setSavingCompetitors(true);
        try {
            const supabase = createClient();
            const updatedSettings = { ...(workspace.settings || {}), competitors };
            await supabase
                .from('workspaces')
                .update({ settings: updatedSettings })
                .eq('id', workspace.id);
            setWorkspace({ ...workspace, settings: updatedSettings });
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
        } catch (error) {
            console.error('Error saving competitors:', error);
        } finally {
            setSavingCompetitors(false);
        }
    }

    const currentPlan = organization?.plan || 'free';
    const limits = PLAN_LIMITS[currentPlan] || PLAN_LIMITS.free;

    return (
        <>
            <Script src="https://checkout.razorpay.com/v1/checkout.js" />

            <Header
                title="Settings"
                description="Manage your workspace settings"
            />

            <div className="p-6">
                {paymentSuccess && (
                    <div className="mb-6 p-4 rounded-lg bg-green-500/10 border border-green-500/30 flex items-center gap-3">
                        <CheckCircle className="w-5 h-5 text-green-400" />
                        <p className="text-green-300">Payment successful! Your plan has been upgraded.</p>
                    </div>
                )}

                <div className="flex gap-6">
                    {/* Sidebar */}
                    <div className="w-48 flex-shrink-0 space-y-1">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={cn(
                                    "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all text-left",
                                    activeTab === tab.id
                                        ? "bg-[var(--bg-raised)] text-[var(--text-primary)]"
                                        : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-raised)]"
                                )}
                            >
                                <tab.icon className="w-4 h-4" />
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Content */}
                    <div className="flex-1 space-y-6">
                        {loading ? (
                            <Card>
                                <CardContent className="p-6 space-y-4">
                                    <Skeleton className="h-4 w-32" />
                                    <Skeleton className="h-10 w-full" />
                                    <Skeleton className="h-10 w-32" />
                                </CardContent>
                            </Card>
                        ) : (
                            <>
                                {activeTab === "general" && (
                                    <>
                                        <Card>
                                            <CardHeader>
                                                <CardTitle className="text-lg flex items-center gap-2">
                                                    <Building className="w-5 h-5" />
                                                    Workspace
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent className="space-y-4">
                                                <div>
                                                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                                                        Workspace Name
                                                    </label>
                                                    <Input
                                                        value={workspaceName}
                                                        onChange={(e) => setWorkspaceName(e.target.value)}
                                                    />
                                                </div>
                                                <Button onClick={handleSaveWorkspace} disabled={saving}>
                                                    {saving ? (
                                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                    ) : saveSuccess ? (
                                                        <CheckCircle className="w-4 h-4 mr-2 text-green-400" />
                                                    ) : (
                                                        <Save className="w-4 h-4 mr-2" />
                                                    )}
                                                    {saveSuccess ? "Saved!" : "Save Changes"}
                                                </Button>
                                            </CardContent>
                                        </Card>

                                        <Card>
                                            <CardHeader>
                                                <CardTitle className="text-lg flex items-center gap-2">
                                                    <User className="w-5 h-5" />
                                                    Profile
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent className="space-y-4">
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                                                            Full Name
                                                        </label>
                                                        <Input
                                                            value={fullName}
                                                            onChange={(e) => setFullName(e.target.value)}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                                                            Email
                                                        </label>
                                                        <Input
                                                            value={email}
                                                            type="email"
                                                            disabled
                                                            className="opacity-60"
                                                        />
                                                    </div>
                                                </div>
                                                <Button onClick={handleSaveProfile} disabled={saving}>
                                                    {saving ? (
                                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                    ) : (
                                                        <Save className="w-4 h-4 mr-2" />
                                                    )}
                                                    Update Profile
                                                </Button>
                                            </CardContent>
                                        </Card>

                                        <Card>
                                            <CardHeader>
                                                <CardTitle className="text-lg flex items-center gap-2">
                                                    <Swords className="w-5 h-5" />
                                                    Competitors
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent className="space-y-4">
                                                <p className="text-sm text-[var(--text-secondary)]">
                                                    Add competitor brands to track alongside yours in LLM scans.
                                                </p>
                                                <div className="flex gap-2">
                                                    <Input
                                                        placeholder="Add competitor brand name..."
                                                        value={newCompetitor}
                                                        onChange={(e) => setNewCompetitor(e.target.value)}
                                                        onKeyDown={(e) => e.key === 'Enter' && addCompetitor()}
                                                    />
                                                    <Button onClick={addCompetitor} variant="outline" disabled={!newCompetitor.trim()}>
                                                        <Plus className="w-4 h-4 mr-1" />
                                                        Add
                                                    </Button>
                                                </div>
                                                {competitors.length > 0 ? (
                                                    <div className="flex flex-wrap gap-2">
                                                        {competitors.map((comp) => (
                                                            <div
                                                                key={comp}
                                                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--bg-raised)] border border-[var(--border-default)] text-sm text-[var(--text-primary)]"
                                                            >
                                                                {comp}
                                                                <button
                                                                    onClick={() => removeCompetitor(comp)}
                                                                    className="text-[var(--text-ghost)] hover:text-red-400 transition-colors"
                                                                >
                                                                    <X className="w-3.5 h-3.5" />
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <p className="text-xs text-[var(--text-ghost)]">No competitors added yet.</p>
                                                )}
                                                <Button onClick={handleSaveCompetitors} disabled={savingCompetitors}>
                                                    {savingCompetitors ? (
                                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                    ) : (
                                                        <Save className="w-4 h-4 mr-2" />
                                                    )}
                                                    Save Competitors
                                                </Button>
                                            </CardContent>
                                        </Card>
                                    </>
                                )}

                                {activeTab === "team" && (
                                    <Card>
                                        <CardHeader className="flex flex-row items-center justify-between">
                                            <CardTitle className="text-lg">Team Members</CardTitle>
                                            <Button size="sm">
                                                <Plus className="w-4 h-4 mr-2" />
                                                Invite
                                            </Button>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="space-y-3">
                                                {teamMembers.map((member) => (
                                                    <div
                                                        key={member.id}
                                                        className="flex items-center justify-between p-3 rounded-lg bg-[var(--bg-raised)]"
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-medium">
                                                                {(member.full_name || member.email)[0].toUpperCase()}
                                                            </div>
                                                            <div>
                                                                <p className="font-medium text-[var(--text-primary)]">{member.full_name || 'Unnamed'}</p>
                                                                <p className="text-sm text-[var(--text-ghost)]">{member.email}</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            <Badge variant={member.role === "owner" ? "default" : "outline"}>
                                                                {member.role === "owner" && <Crown className="w-3 h-3 mr-1" />}
                                                                {member.role}
                                                            </Badge>
                                                            {member.role !== "owner" && member.id !== user?.id && (
                                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400">
                                                                    <Trash2 className="w-4 h-4" />
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}

                                {activeTab === "billing" && (
                                    <>
                                        <Card>
                                            <CardHeader>
                                                <CardTitle className="text-lg">Current Plan</CardTitle>
                                            </CardHeader>
                                            <CardContent className="space-y-6">
                                                <div className="p-4 rounded-lg bg-gradient-to-r from-indigo-500/20 to-violet-600/20 border border-indigo-500/30">
                                                    <div className="flex items-center justify-between mb-4">
                                                        <div>
                                                            <Badge variant="default" className="mb-2 capitalize">{currentPlan} Plan</Badge>
                                                            <p className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-1">
                                                                {PLAN_PRICES[currentPlan].display}<span className="text-sm font-normal text-[var(--text-secondary)]">/month</span>
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="grid grid-cols-3 gap-4 text-sm">
                                                        <div>
                                                            <p className="text-[var(--text-secondary)]">LLM Scans</p>
                                                            <p className="font-medium text-[var(--text-primary)]">
                                                                {limits.scans === -1 ? 'Unlimited' : `${limits.scans}/mo`}
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <p className="text-[var(--text-secondary)]">Forum Threads</p>
                                                            <p className="font-medium text-[var(--text-primary)]">
                                                                {limits.threads === -1 ? 'Unlimited' : limits.threads}
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <p className="text-[var(--text-secondary)]">Team Members</p>
                                                            <p className="font-medium text-[var(--text-primary)]">
                                                                {limits.members === -1 ? 'Unlimited' : limits.members}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>

                                        {currentPlan === 'free' && (
                                            <Card>
                                                <CardHeader>
                                                    <CardTitle className="text-lg">Upgrade Your Plan</CardTitle>
                                                </CardHeader>
                                                <CardContent>
                                                    {upgradeError && (
                                                        <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center gap-3">
                                                            <AlertCircle className="w-5 h-5 text-red-400" />
                                                            <p className="text-sm text-red-300">{upgradeError}</p>
                                                        </div>
                                                    )}
                                                    <div className="grid grid-cols-3 gap-4">
                                                        {['starter', 'pro', 'agency'].map((plan) => (
                                                            <div
                                                                key={plan}
                                                                className={cn(
                                                                    "p-4 rounded-lg border transition-all",
                                                                    plan === 'pro'
                                                                        ? "border-indigo-500/50 bg-indigo-500/10"
                                                                        : "border-[var(--border-default)] bg-[var(--bg-raised)]"
                                                                )}
                                                            >
                                                                <h3 className="font-semibold text-[var(--text-primary)] capitalize mb-1">{plan}</h3>
                                                                <p className="text-2xl font-bold text-[var(--text-primary)] mb-3 flex items-center">
                                                                    <IndianRupee className="w-5 h-5" />
                                                                    {PLAN_PRICES[plan].display.replace('₹', '')}
                                                                    <span className="text-sm text-[var(--text-secondary)] ml-1">/mo</span>
                                                                </p>
                                                                <Button
                                                                    onClick={() => handleUpgrade(plan)}
                                                                    disabled={upgrading !== null}
                                                                    className="w-full"
                                                                    variant={plan === 'pro' ? 'default' : 'outline'}
                                                                >
                                                                    {upgrading === plan ? (
                                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                                    ) : (
                                                                        'Upgrade'
                                                                    )}
                                                                </Button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                    <p className="text-xs text-[var(--text-ghost)] mt-4 flex items-center gap-1">
                                                        <IndianRupee className="w-3 h-3" />
                                                        Secure payments powered by Razorpay
                                                    </p>
                                                </CardContent>
                                            </Card>
                                        )}
                                    </>
                                )}

                                {activeTab === "notifications" && (
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="text-lg flex items-center gap-2">
                                                <Bell className="w-5 h-5 text-indigo-400" />
                                                Smart Alerts
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-6">
                                            {/* Visibility Alerts */}
                                            <div>
                                                <h3 className="text-sm font-semibold text-[var(--text-secondary)] mb-3 flex items-center gap-2">
                                                    <div className="w-2 h-2 rounded-full bg-red-400" />
                                                    Visibility Alerts
                                                </h3>
                                                <div className="space-y-2">
                                                    {[
                                                        { key: "visibility_drop", label: "Visibility drop detected", description: "Alert when your brand mention rate drops >10% week-over-week" },
                                                        { key: "competitor_overtake", label: "Competitor overtake", description: "Alert when a competitor surpasses your brand in AI responses" },
                                                        { key: "zero_visibility", label: "Zero visibility warning", description: "Alert if your brand gets 0 mentions across all scans in a day" },
                                                    ].map((item) => (
                                                        <div key={item.key} className="flex items-center justify-between p-3 rounded-lg bg-[var(--bg-raised)]">
                                                            <div>
                                                                <p className="font-medium text-[var(--text-primary)] text-sm">{item.label}</p>
                                                                <p className="text-xs text-[var(--text-ghost)]">{item.description}</p>
                                                            </div>
                                                            <input
                                                                type="checkbox"
                                                                checked={alertPrefs[item.key] ?? true}
                                                                onChange={(e) => setAlertPrefs(prev => ({ ...prev, [item.key]: e.target.checked }))}
                                                                className="rounded accent-indigo-500"
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Content Alerts */}
                                            <div>
                                                <h3 className="text-sm font-semibold text-[var(--text-secondary)] mb-3 flex items-center gap-2">
                                                    <div className="w-2 h-2 rounded-full bg-amber-400" />
                                                    Content & Citation Alerts
                                                </h3>
                                                <div className="space-y-2">
                                                    {[
                                                        { key: "new_citation", label: "New citation earned", description: "Alert when an LLM cites your domain for the first time" },
                                                        { key: "citation_lost", label: "Citation lost", description: "Alert when a previously-cited page stops being cited" },
                                                        { key: "negative_sentiment", label: "Negative sentiment spike", description: "Alert when negative sentiment increases significantly" },
                                                    ].map((item) => (
                                                        <div key={item.key} className="flex items-center justify-between p-3 rounded-lg bg-[var(--bg-raised)]">
                                                            <div>
                                                                <p className="font-medium text-[var(--text-primary)] text-sm">{item.label}</p>
                                                                <p className="text-xs text-[var(--text-ghost)]">{item.description}</p>
                                                            </div>
                                                            <input
                                                                type="checkbox"
                                                                checked={alertPrefs[item.key] ?? false}
                                                                onChange={(e) => setAlertPrefs(prev => ({ ...prev, [item.key]: e.target.checked }))}
                                                                className="rounded accent-indigo-500"
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Community Alerts */}
                                            <div>
                                                <h3 className="text-sm font-semibold text-[var(--text-secondary)] mb-3 flex items-center gap-2">
                                                    <div className="w-2 h-2 rounded-full bg-green-400" />
                                                    Community Alerts
                                                </h3>
                                                <div className="space-y-2">
                                                    {[
                                                        { key: "hot_thread", label: "Hot forum opportunity", description: "Alert when a high-score thread is discovered in your niche" },
                                                        { key: "brand_forum_mention", label: "Brand mentioned in forums", description: "Alert when someone mentions your brand on Reddit/Quora" },
                                                    ].map((item) => (
                                                        <div key={item.key} className="flex items-center justify-between p-3 rounded-lg bg-[var(--bg-raised)]">
                                                            <div>
                                                                <p className="font-medium text-[var(--text-primary)] text-sm">{item.label}</p>
                                                                <p className="text-xs text-[var(--text-ghost)]">{item.description}</p>
                                                            </div>
                                                            <input
                                                                type="checkbox"
                                                                checked={alertPrefs[item.key] ?? false}
                                                                onChange={(e) => setAlertPrefs(prev => ({ ...prev, [item.key]: e.target.checked }))}
                                                                className="rounded accent-indigo-500"
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Digests */}
                                            <div>
                                                <h3 className="text-sm font-semibold text-[var(--text-secondary)] mb-3 flex items-center gap-2">
                                                    <div className="w-2 h-2 rounded-full bg-blue-400" />
                                                    Reports & Digests
                                                </h3>
                                                <div className="space-y-2">
                                                    {[
                                                        { key: "daily_report", label: "Daily visibility report", description: "Morning summary of LLM visibility metrics" },
                                                        { key: "weekly_digest", label: "Weekly Aelo digest", description: "Comprehensive weekly summary of all Aelo activity" },
                                                    ].map((item) => (
                                                        <div key={item.key} className="flex items-center justify-between p-3 rounded-lg bg-[var(--bg-raised)]">
                                                            <div>
                                                                <p className="font-medium text-[var(--text-primary)] text-sm">{item.label}</p>
                                                                <p className="text-xs text-[var(--text-ghost)]">{item.description}</p>
                                                            </div>
                                                            <input
                                                                type="checkbox"
                                                                checked={alertPrefs[item.key] ?? false}
                                                                onChange={(e) => setAlertPrefs(prev => ({ ...prev, [item.key]: e.target.checked }))}
                                                                className="rounded accent-indigo-500"
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3">
                                                <Button onClick={saveAlertPrefs} disabled={savingAlerts}>
                                                    {savingAlerts ? (
                                                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
                                                    ) : alertsSaved ? (
                                                        <><CheckCircle className="w-4 h-4 mr-2" /> Saved!</>
                                                    ) : (
                                                        <><Save className="w-4 h-4 mr-2" /> Save Preferences</>
                                                    )}
                                                </Button>
                                            </div>
                                            <p className="text-xs text-[var(--text-ghost)]">
                                                Email notifications require Pro plan or above. In-app alerts are always free.
                                            </p>
                                        </CardContent>
                                    </Card>
                                )}

                                {activeTab === "api" && (
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="text-lg">API Keys</CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            <div className="p-4 rounded-lg bg-[var(--bg-raised)] border border-[var(--border-default)]">
                                                <div className="flex items-center justify-between mb-2">
                                                    <p className="font-medium text-[var(--text-primary)]">Production Key</p>
                                                    <Badge variant="success">Active</Badge>
                                                </div>
                                                <code className="text-sm text-[var(--text-secondary)] bg-[var(--bg-surface)] px-2 py-1 rounded">
                                                    aelo_live_••••••••••••••••
                                                </code>
                                            </div>
                                            <Button variant="outline">
                                                <Plus className="w-4 h-4 mr-2" />
                                                Generate New Key
                                            </Button>
                                            <p className="text-xs text-[var(--text-ghost)]">
                                                API access is available on Pro and Agency plans.
                                            </p>
                                        </CardContent>
                                    </Card>
                                )}

                                {activeTab === "schedules" && workspace && (
                                    <SchedulesTab workspaceId={workspace.id} />
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div >
        </>
    );
}
