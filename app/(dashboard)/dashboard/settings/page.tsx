"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Script from "next/script";
import { Header } from "@/components/dashboard/header";
import { SchedulesTab } from "@/components/dashboard/settings/schedules-tab";
import { InstallTab } from "@/components/dashboard/settings/install-tab";
import { ApiKeysTab } from "@/components/dashboard/settings/api-keys-tab";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
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
    Zap,
} from "lucide-react";
import { PLAN_LIMITS } from "@/lib/config";
import { PUBLIC_PLANS, planByStoredKey } from "@/lib/billing/plan-catalog";
import { ReportsSettingsTabs } from "@/components/dashboard/reports-settings-tabs";


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
    { id: "general",       label: "General",         icon: Settings },
    { id: "install",       label: "Install",         icon: Zap },
    { id: "team",          label: "Team",            icon: Users },
    { id: "billing",       label: "Billing",         icon: CreditCard },
    { id: "notifications", label: "Notifications",   icon: Bell },
    { id: "schedules",     label: "Scheduled Scans", icon: Calendar },
    { id: "api",           label: "API Keys",        icon: Key },
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
    const searchParams = useSearchParams();
    const [activeTab, setActiveTab] = useState(() => {
        const tab = searchParams.get("tab");
        return tab && tabs.some(item => item.id === tab) ? tab : "general";
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [upgrading, setUpgrading] = useState<string | null>(null);
    const [paymentSuccess, setPaymentSuccess] = useState(() => Boolean(searchParams.get("success")));

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
    const [settingsError, setSettingsError] = useState<string | null>(null);

    // Alert preferences state
    const [alertPrefs, setAlertPrefs] = useState<Record<string, boolean>>({});
    const [savingAlerts, setSavingAlerts] = useState(false);
    const [alertsSaved, setAlertsSaved] = useState(false);
    const [alertError, setAlertError] = useState<string | null>(null);

    async function fetchData() {
        try {
            setSettingsError(null);
            const response = await fetch('/api/settings', { cache: 'no-store' });
            if (!response.ok) throw new Error('Could not load settings. Please retry.');
            const data = await response.json();
            setUser(data.user);
            setFullName(data.user.full_name || '');
            setEmail(data.user.email);
            setOrganization(data.organization);
            setTeamMembers(data.team);
            setWorkspace({ id: data.workspace.publicId, name: data.workspace.name, settings: data.workspace.settings });
            setWorkspaceName(data.workspace.name);
            setCompetitors(data.workspace.settings?.competitors || []);
        } catch (error) {
            setSettingsError(error instanceof Error ? error.message : 'Could not load settings.');
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
            } else {
                const payload = await alertRes.json().catch(() => null) as { error?: string } | null;
                setAlertError(payload?.error || 'Could not load alert preferences');
            }
        } catch (err) {
            console.error('Error loading alert preferences:', err);
            setAlertError('Could not load alert preferences');
        }
    }

    useEffect(() => {
        const loadTimer = window.setTimeout(() => { void fetchData(); }, 0);
        return () => window.clearTimeout(loadTimer);
    }, []);

    useEffect(() => {
        if (!paymentSuccess) return;
        const successTimer = window.setTimeout(() => setPaymentSuccess(false), 5000);
        return () => window.clearTimeout(successTimer);
    }, [paymentSuccess]);

    async function saveAlertPrefs() {
        setSavingAlerts(true);
        setAlertsSaved(false);
        setAlertError(null);
        try {
            const preferences = Object.entries(alertPrefs).map(([alert_type, enabled]) => ({
                alert_type,
                enabled,
            }));
            const response = await fetch('/api/alerts/preferences', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ preferences }),
            });
            const payload = await response.json().catch(() => null) as { error?: string } | null;
            if (!response.ok) throw new Error(payload?.error || 'Could not save alert preferences');
            setAlertsSaved(true);
            setTimeout(() => setAlertsSaved(false), 3000);
        } catch (err) {
            console.error('Error saving alert preferences:', err);
            setAlertError(err instanceof Error ? err.message : 'Could not save alert preferences');
        } finally {
            setSavingAlerts(false);
        }
    }

    async function handleSaveWorkspace() {
        if (!workspace) return;
        setSaving(true);
        setSaveSuccess(false);

        try {
            await saveSettings({ kind: 'workspace', name: workspaceName });

            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
        } catch (error) {
            setSettingsError(error instanceof Error ? error.message : 'Could not save workspace.');
        } finally {
            setSaving(false);
        }
    }

    async function handleSaveProfile() {
        if (!user) return;
        setSaving(true);
        setSaveSuccess(false);

        try {
            await saveSettings({ kind: 'profile', fullName });

            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
        } catch (error) {
            setSettingsError(error instanceof Error ? error.message : 'Could not save profile.');
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
            const updatedSettings = { ...(workspace.settings || {}), competitors };
            await saveSettings({ kind: 'workspace', competitors });
            setWorkspace({ ...workspace, settings: updatedSettings });
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
        } catch (error) {
            setSettingsError(error instanceof Error ? error.message : 'Could not save competitors.');
        } finally {
            setSavingCompetitors(false);
        }
    }

    async function saveSettings(body: Record<string, unknown>) {
        setSettingsError(null);
        const response = await fetch('/api/settings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'The change was not saved.');
    }

    const currentPlan = organization?.plan || 'free';
    const currentPlanDefinition = planByStoredKey(currentPlan);
    const limits = PLAN_LIMITS[currentPlanDefinition.storedKey];

    return (
        <>
            <Script src="https://checkout.razorpay.com/v1/checkout.js" />

            <Header
                title="Settings"
                description="Manage your workspace settings"
            />

            <main className="mx-auto max-w-[1440px] px-5 py-10 sm:px-8 lg:px-16 lg:py-12">
                <ReportsSettingsTabs />
                {settingsError && <div role="alert" className="mb-4"><p>{settingsError}</p><Button variant="outline" onClick={() => void fetchData()}>Reload settings</Button></div>}
                {paymentSuccess && (
                    <div className="mb-6 p-4 rounded-lg bg-[var(--data-green-muted)] border border-[var(--data-green)]/30 flex items-center gap-3">
                        <CheckCircle className="w-5 h-5 text-[var(--data-green)]" />
                        <p className="text-[var(--data-green)]">Payment submitted. Your current plan below updates after provider confirmation.</p>
                    </div>
                )}

                <div className="mt-10 flex flex-col gap-8 lg:flex-row">
                    {/* Sidebar */}
                    <div className="flex w-full flex-shrink-0 gap-1 overflow-x-auto border-b border-[var(--border-default)] pb-3 lg:w-52 lg:flex-col lg:border-b-0 lg:border-r lg:pb-0 lg:pr-6">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={cn(
                                    "flex min-h-11 shrink-0 items-center gap-2 px-3 py-2 text-left text-sm font-medium transition-all lg:w-full",
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
                                                    <label htmlFor="workspace-name" className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                                                        Workspace Name
                                                    </label>
                                                    <Input
                                                        id="workspace-name"
                                                        value={workspaceName}
                                                        onChange={(e) => setWorkspaceName(e.target.value)}
                                                    />
                                                </div>
                                                <Button onClick={handleSaveWorkspace} disabled={saving}>
                                                    {saving ? (
                                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                    ) : saveSuccess ? (
                                                        <CheckCircle className="w-4 h-4 mr-2 text-[var(--data-green)]" />
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
                                                        <label htmlFor="profile-full-name" className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                                                            Full Name
                                                        </label>
                                                        <Input
                                                            id="profile-full-name"
                                                            value={fullName}
                                                            onChange={(e) => setFullName(e.target.value)}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label htmlFor="profile-email" className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                                                            Email
                                                        </label>
                                                        <Input
                                                            id="profile-email"
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
                                                                    aria-label={`Remove ${comp}`}
                                                                    onClick={() => removeCompetitor(comp)}
                                                                    className="text-[var(--text-secondary)] hover:text-[var(--data-red)] transition-colors"
                                                                >
                                                                    <X className="w-3.5 h-3.5" />
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <p className="text-xs text-[var(--text-secondary)]">No competitors added yet.</p>
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

                                {activeTab === "install" && workspace && (
                                    <InstallTab workspaceId={workspace.id} workspaceName={workspace.name || ""} />
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
                                                            <div className="w-10 h-10 rounded-full bg-[var(--accent-muted)] flex items-center justify-center text-white font-medium">
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
                                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-[var(--data-red)]">
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
                                                <div className="p-4 rounded-lg bg-[var(--accent-muted)] border border-[var(--accent-base)]/25">
                                                    <div className="flex items-center justify-between mb-4">
                                                        <div>
                                                            <Badge variant="default" className="mb-2">{currentPlanDefinition.name} plan</Badge>
                                                            <p className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-1">
                                                                {currentPlanDefinition.priceLabel}<span className="text-sm font-normal text-[var(--text-secondary)]">/{currentPlanDefinition.billingNote === 'per month' ? 'month' : currentPlanDefinition.billingNote}</span>
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="grid grid-cols-3 gap-4 text-sm">
                                                        <div>
                                                            <p className="text-[var(--text-secondary)]">LLM Scans</p>
                                                            <p className="font-medium text-[var(--text-primary)]">{currentPlanDefinition.scanPromise}</p>
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
                                                        <div className="mb-4 p-3 rounded-lg bg-[var(--data-red-muted)] border border-[var(--data-red)]/30 flex items-center gap-3">
                                                            <AlertCircle className="w-5 h-5 text-[var(--data-red)]" />
                                                            <p className="text-sm text-[var(--data-red)]">{upgradeError}</p>
                                                        </div>
                                                    )}
                                                    <div className="grid grid-cols-3 gap-4">
                                                        {PUBLIC_PLANS.filter((plan) => plan.checkoutKey).map((plan) => (
                                                            <div
                                                                key={plan.storedKey}
                                                                className={cn(
                                                                    "p-4 rounded-lg border transition-all",
                                                                    plan.storedKey === 'pro'
                                                                        ? "border-[var(--accent-base)]/25 bg-[var(--accent-muted)]"
                                                                        : "border-[var(--border-default)] bg-[var(--bg-raised)]"
                                                                )}
                                                            >
                                                                <h3 className="font-semibold text-[var(--text-primary)] mb-1">{plan.name}</h3>
                                                                <p className="text-2xl font-bold text-[var(--text-primary)] mb-3 flex items-center">
                                                                    <IndianRupee className="w-5 h-5" />
                                                                    {plan.priceLabel.replace('₹', '')}
                                                                    <span className="text-sm text-[var(--text-secondary)] ml-1">/mo</span>
                                                                </p>
                                                                <p className="mb-3 text-xs text-[var(--text-secondary)]">{plan.scanPromise}</p>
                                                                <Button
                                                                    onClick={() => handleUpgrade(plan.storedKey)}
                                                                    disabled={upgrading !== null}
                                                                    className="w-full"
                                                                    variant={plan.storedKey === 'pro' ? 'default' : 'outline'}
                                                                >
                                                                    {upgrading === plan.storedKey ? (
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
                                                <Bell className="w-5 h-5 text-[var(--accent-base)]" />
                                                Smart Alerts
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-6">
                                            {/* Visibility Alerts */}
                                            <div>
                                                <h3 className="text-sm font-semibold text-[var(--text-secondary)] mb-3 flex items-center gap-2">
                                                    <div className="w-2 h-2 rounded-full bg-[var(--data-red)]" />
                                                    Visibility Alerts
                                                </h3>
                                                <div className="space-y-2">
                                                    {[
                                                        { key: "visibility_drop", label: "Visibility drop detected", description: "Alert after a 10+ point drop with non-overlapping 95% confidence ranges" },
                                                        { key: "competitor_overtake", label: "Competitor overtake", description: "Alert when a competitor surpasses your brand in AI responses" },
                                                        { key: "zero_visibility", label: "Zero visibility warning", description: "Alert if your brand gets 0 mentions in a completed measurement run" },
                                                    ].map((item) => (
                                                        <div key={item.key} className="flex items-center justify-between p-3 rounded-lg bg-[var(--bg-raised)]">
                                                            <div>
                                                                <p className="font-medium text-[var(--text-primary)] text-sm">{item.label}</p>
                                                                <p className="text-xs text-[var(--text-ghost)]">{item.description}</p>
                                                            </div>
                                                            <input
                                                                type="checkbox"
                                                                disabled={Boolean(user && !['owner', 'admin'].includes(user.role))}
                                                                checked={alertPrefs[item.key] ?? true}
                                                                onChange={(e) => setAlertPrefs(prev => ({ ...prev, [item.key]: e.target.checked }))}
                                                                className="rounded accent-[var(--accent-base)]"
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Content Alerts */}
                                            <div>
                                                <h3 className="text-sm font-semibold text-[var(--text-secondary)] mb-3 flex items-center gap-2">
                                                        <div className="h-2 w-2 rounded-full bg-[var(--data-amber)]" />
                                                    Content & Citation Alerts
                                                </h3>
                                                <div className="space-y-2">
                                                    {[
                                                        { key: "new_citation", label: "New citation observed", description: "Alert when a provider cites one of your pages not seen in the prior 30 days" },
                                                        { key: "negative_sentiment", label: "Negative sentiment detected", description: "Alert when a completed measurement contains negative brand sentiment" },
                                                        { key: "sentiment_drift", label: "Weekly sentiment drift", description: "Alert when matched weekly sentiment moves by at least 0.3" },
                                                    ].map((item) => (
                                                        <div key={item.key} className="flex items-center justify-between p-3 rounded-lg bg-[var(--bg-raised)]">
                                                            <div>
                                                                <p className="font-medium text-[var(--text-primary)] text-sm">{item.label}</p>
                                                                <p className="text-xs text-[var(--text-ghost)]">{item.description}</p>
                                                            </div>
                                                            <input
                                                                type="checkbox"
                                                                disabled={Boolean(user && !['owner', 'admin'].includes(user.role))}
                                                                checked={alertPrefs[item.key] ?? false}
                                                                onChange={(e) => setAlertPrefs(prev => ({ ...prev, [item.key]: e.target.checked }))}
                                                                className="rounded accent-[var(--accent-base)]"
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Digests */}
                                            <div>
                                                <h3 className="text-sm font-semibold text-[var(--text-secondary)] mb-3 flex items-center gap-2">
                                                        <div className="h-2 w-2 rounded-full bg-[var(--accent-base)]" />
                                                    Reports & Digests
                                                </h3>
                                                <div className="space-y-2">
                                                    {[
                                                        { key: "weekly_digest", label: "Weekly Aelo digest", description: "Comprehensive weekly summary of all Aelo activity" },
                                                    ].map((item) => (
                                                        <div key={item.key} className="flex items-center justify-between p-3 rounded-lg bg-[var(--bg-raised)]">
                                                            <div>
                                                                <p className="font-medium text-[var(--text-primary)] text-sm">{item.label}</p>
                                                                <p className="text-xs text-[var(--text-ghost)]">{item.description}</p>
                                                            </div>
                                                            <input
                                                                type="checkbox"
                                                                disabled={Boolean(user && !['owner', 'admin'].includes(user.role))}
                                                                checked={alertPrefs[item.key] ?? false}
                                                                onChange={(e) => setAlertPrefs(prev => ({ ...prev, [item.key]: e.target.checked }))}
                                                                className="rounded accent-[var(--accent-base)]"
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3">
                                                <Button onClick={saveAlertPrefs} disabled={savingAlerts || Boolean(user && !['owner', 'admin'].includes(user.role))}>
                                                    {savingAlerts ? (
                                                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
                                                    ) : alertsSaved ? (
                                                        <><CheckCircle className="w-4 h-4 mr-2" /> Saved!</>
                                                    ) : (
                                                        <><Save className="w-4 h-4 mr-2" /> Save Preferences</>
                                                    )}
                                                </Button>
                                            </div>
                                            {user && !['owner', 'admin'].includes(user.role) && (
                                                <p className="text-xs text-[var(--text-secondary)]">Only workspace owners and admins can change organization-wide alerts.</p>
                                            )}
                                            {alertError && (
                                                <p role="alert" className="text-xs text-[var(--data-red)]">{alertError}</p>
                                            )}
                                            <p className="text-xs text-[var(--text-ghost)]">
                                                Email notifications require Pro plan or above. In-app alerts are always free.
                                            </p>
                                        </CardContent>
                                    </Card>
                                )}

                                {activeTab === "api" && workspace && (
                                    <ApiKeysTab />
                                )}

                                {activeTab === "schedules" && workspace && (
                                    <SchedulesTab />
                                )}
                            </>
                        )}
                    </div>
                </div>
            </main>
        </>
    );
}
