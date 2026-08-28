"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Key,
    Plus,
    Copy,
    CheckCircle,
    Trash2,
    Loader2,
    AlertCircle,
    ShieldCheck,
    ExternalLink,
} from "lucide-react";

interface ApiKey {
    id: string;
    name: string;
    key_prefix: string;
    scopes: string[];
    last_used_at: string | null;
    created_at: string;
    revoked_at: string | null;
}

// Real, self-serve API keys for the Aelo MCP server. A key is read-first and
// scoped to this workspace; the secret is shown exactly once.
export function ApiKeysTab({ workspaceId: _workspaceId }: { workspaceId: string }) {
    const [keys, setKeys] = useState<ApiKey[]>([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [name, setName] = useState("");
    const [newSecret, setNewSecret] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function load() {
        try {
            const res = await fetch("/api/keys");
            const data = await res.json();
            if (res.ok) setKeys(data.keys || []);
        } catch {
            /* ignore */
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        load();
    }, []);

    async function createKey() {
        setCreating(true);
        setError(null);
        setNewSecret(null);
        try {
            const res = await fetch("/api/keys", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: name.trim() || "API key" }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to create key");
            setNewSecret(data.secret);
            setName("");
            await load();
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to create key");
        } finally {
            setCreating(false);
        }
    }

    async function revokeKey(id: string) {
        try {
            const res = await fetch(`/api/keys/${id}`, { method: "DELETE" });
            if (res.ok) await load();
        } catch {
            /* ignore */
        }
    }

    function copySecret() {
        if (!newSecret) return;
        navigator.clipboard?.writeText(newSecret).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    }

    const active = keys.filter((k) => !k.revoked_at);

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Key className="w-5 h-5 text-[var(--accent-base)]" /> API Keys
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                    {/* What these are for */}
                    <div className="flex items-start gap-3 p-4 rounded-lg bg-[var(--bg-raised)] border border-[var(--border-default)]">
                        <ShieldCheck className="w-5 h-5 text-[var(--data-green)] flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm text-[var(--text-primary)] font-medium">
                                Read-first keys for the Aelo MCP server.
                            </p>
                            <p className="text-sm text-[var(--text-secondary)] mt-1 leading-relaxed">
                                Connect Claude, Cursor or Codex to ask how visible your brand is, with the receipts. A key
                                can read your visibility data and take measurement actions (track a prompt, schedule a scan).
                                It can never spend money or post anything.
                            </p>
                            <a
                                href="/mcp"
                                className="inline-flex items-center gap-1 text-sm text-[var(--accent-base)] hover:text-[var(--accent-hover)] mt-2"
                            >
                                How to connect the MCP <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                        </div>
                    </div>

                    {/* One-time secret reveal */}
                    {newSecret && (
                        <div className="p-4 rounded-lg bg-[var(--data-green-muted)] border border-[var(--data-green)]/30">
                            <div className="flex items-center gap-2 mb-2 text-[var(--data-green)]">
                                <CheckCircle className="w-4 h-4" />
                                <p className="text-sm font-medium">Key created. Copy it now, you will not see it again.</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <code className="flex-1 text-sm text-[var(--text-primary)] bg-[var(--bg-surface)] px-3 py-2 rounded font-mono break-all">
                                    {newSecret}
                                </code>
                                <Button variant="outline" size="sm" onClick={copySecret}>
                                    {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                </Button>
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="flex items-center gap-2 p-3 rounded-lg bg-[var(--data-red-muted)] border border-[var(--data-red)]/25 text-[var(--data-red)] text-sm">
                            <AlertCircle className="w-4 h-4" /> {error}
                        </div>
                    )}

                    {/* Create */}
                    <div className="flex flex-col sm:flex-row gap-2">
                        <Input
                            placeholder="Key name (e.g. My laptop, CI)"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="flex-1"
                        />
                        <Button onClick={createKey} disabled={creating}>
                            {creating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                            Create key
                        </Button>
                    </div>

                    {/* List */}
                    {loading ? (
                        <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)] py-4">
                            <Loader2 className="w-4 h-4 animate-spin" /> Loading keys...
                        </div>
                    ) : active.length === 0 ? (
                        <p className="text-sm text-[var(--text-ghost)] py-2">No keys yet. Create one to connect the MCP.</p>
                    ) : (
                        <div className="space-y-2">
                            {active.map((k) => (
                                <div
                                    key={k.id}
                                    className="flex items-center justify-between p-3 rounded-lg bg-[var(--bg-raised)] border border-[var(--border-default)]"
                                >
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <p className="font-medium text-[var(--text-primary)] text-sm">{k.name}</p>
                                            {(k.scopes || []).map((s) => (
                                                <Badge key={s} variant="outline" className="text-[10px] uppercase tracking-wide">
                                                    {s}
                                                </Badge>
                                            ))}
                                        </div>
                                        <code className="text-xs text-[var(--text-secondary)] font-mono">
                                            {k.key_prefix}…{"•".repeat(8)}
                                        </code>
                                        <p className="text-[11px] text-[var(--text-ghost)] mt-0.5">
                                            Created {new Date(k.created_at).toLocaleDateString()}
                                            {k.last_used_at
                                                ? ` · last used ${new Date(k.last_used_at).toLocaleDateString()}`
                                                : " · never used"}
                                        </p>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => revokeKey(k.id)}
                                        className="text-[var(--text-secondary)] hover:text-[var(--data-red)]"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
