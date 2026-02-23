"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  CheckCircle,
  XCircle,
  Clock,
  ArrowLeft,
  Search,
  Ticket,
  MapPin,
  Users,
  AlertCircle,
} from "lucide-react";

const statusDisplay: Record<
  string,
  { label: string; icon: typeof Clock; colorClass: string }
> = {
  approved: {
    label: "Approved",
    icon: CheckCircle,
    colorClass: "text-emerald-600 dark:text-emerald-400",
  },
  rejected: {
    label: "Rejected",
    icon: XCircle,
    colorClass: "text-red-600 dark:text-red-400",
  },
  pending: {
    label: "Pending",
    icon: Clock,
    colorClass: "text-amber-600 dark:text-amber-400",
  },
};

const VerifyTicket = () => {
  const searchParams = useSearchParams();
  const regId = searchParams.get("reg_id");
  const [searchMode, setSearchMode] = useState<"reg_number" | "trx_id">(
    "reg_number",
  );
  const [searchValue, setSearchValue] = useState("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lookup = async (params: Record<string, string>) => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const qs = new URLSearchParams(params).toString();
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/verify-registration?${qs}`,
        { headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! } },
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Lookup failed");
      setResult(json);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (regId) lookup({ reg_id: regId });
  }, [regId]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchValue.trim()) return;
    lookup({ [searchMode]: searchValue.trim() });
  };

  const sd = result?.registration
    ? statusDisplay[result.registration.status] || statusDisplay.pending
    : null;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-2xl items-center gap-3 px-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/">
              <ArrowLeft className="mr-1 h-3.5 w-3.5" /> Home
            </Link>
          </Button>
          <h1 className="text-sm font-semibold">Ticket Verification</h1>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-8 space-y-6">
        <Card className="border-0 shadow-lg">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <Search className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="font-medium font-display">Verify ticket</h2>
                <p className="text-xs text-muted-foreground">
                  Look up ticket registration by ID or transaction ID
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setSearchMode("reg_number")}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  searchMode === "reg_number"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                Registration ID
              </button>
              <button
                onClick={() => setSearchMode("trx_id")}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  searchMode === "trx_id"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                Transaction ID
              </button>
            </div>

            <form onSubmit={handleSearch} className="flex gap-2">
              <Input
                placeholder={
                  searchMode === "reg_number" ? "REG-XXXXXX" : "Transaction ID"
                }
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                className="flex-1"
              />
              <Button type="submit" disabled={loading}>
                {loading ? "Searching..." : "Search"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {loading && !result && (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        )}

        {error && (
          <Card className="border-destructive/30">
            <CardContent className="flex items-center gap-3 p-4">
              <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
              <p className="text-sm text-destructive">{error}</p>
            </CardContent>
          </Card>
        )}

        {result && !result.found && (
          <Card>
            <CardContent className="flex flex-col items-center py-12 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted mb-4">
                <Ticket className="h-7 w-7 text-muted-foreground" />
              </div>
              <h3 className="font-semibold mb-1">Registration Not Found</h3>
              <p className="text-sm text-muted-foreground">
                Please check your ID and try again.
              </p>
            </CardContent>
          </Card>
        )}

        {result?.found && sd && (
          <Card className="border-0 shadow-xl overflow-hidden">
            <div
              className={`flex items-center gap-3 px-6 py-4 ${
                result.registration.status === "approved"
                  ? "bg-emerald-50 dark:bg-emerald-950/30"
                  : result.registration.status === "rejected"
                    ? "bg-red-50 dark:bg-red-950/30"
                    : "bg-amber-50 dark:bg-amber-950/30"
              }`}
            >
              <sd.icon className={`h-8 w-8 ${sd.colorClass}`} />
              <div>
                <p className={`text-lg font-bold ${sd.colorClass}`}>
                  {sd.label}
                </p>
                <p className="text-xs text-muted-foreground">
                  Registration Status
                </p>
              </div>
            </div>

            <CardContent className="p-6 space-y-4">
              {result.event && (
                <div className="space-y-2 pb-4 border-b">
                  <h3 className="font-semibold text-lg">
                    {result.event.title}
                  </h3>
                  {result.event.venue && (
                    <span className="inline-flex items-center gap-1 bg-muted px-2.5 py-1 rounded-full text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" /> {result.event.venue}
                    </span>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Name</p>
                  <p className="font-medium">{result.registration.name}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">
                    Registration #
                  </p>
                  <p className="font-mono font-medium text-primary">
                    {result.registration.registration_number}
                  </p>
                </div>
                {result.registration.email && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">
                      Email
                    </p>
                    <p className="font-medium">{result.registration.email}</p>
                  </div>
                )}
                {result.registration.phone && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">
                      Phone
                    </p>
                    <p className="font-medium">{result.registration.phone}</p>
                  </div>
                )}
                {result.registration.guest_count > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">
                      Guests
                    </p>
                    <p className="font-medium flex items-center gap-1">
                      <Users className="h-3 w-3" />{" "}
                      {result.registration.guest_count}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">
                    Registered
                  </p>
                  <p className="font-medium">
                    {new Date(
                      result.registration.created_at,
                    ).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

// ✅ Suspense wrap — Next.js এ useSearchParams এর জন্য দরকার
export default function VerifyPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <VerifyTicket />
    </Suspense>
  );
}
