"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  Search,
  Ticket,
  AlertCircle,
  Phone,
  Mail,
  CreditCard,
  Users,
} from "lucide-react";
import TicketPDF from "@/components/TicketPDF";

type SearchMode = "free" | "paid";
type ContactType = "phone" | "email";

const FindTicket = () => {
  const [mode, setMode] = useState<SearchMode>("paid");

  // Paid event fields
  const [transactionId, setTransactionId] = useState("");
  const [paidName, setPaidName] = useState("");

  // Free event fields
  const [contactType, setContactType] = useState<ContactType>("phone");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [freeName, setFreeName] = useState("");

  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setResult(null);
    setError(null);
  };

  const handlePaidSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transactionId.trim() || !paidName.trim()) return;
    setLoading(true);
    reset();
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/find-ticket`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          },
          body: JSON.stringify({
            transaction_id: transactionId.trim(),
            name: paidName.trim(),
          }),
        },
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

  const handleFreeSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const contactValue = contactType === "phone" ? phone.trim() : email.trim();
    if (!contactValue || !freeName.trim()) return;
    setLoading(true);
    reset();
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/find-ticket`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          },
          body: JSON.stringify({
            contact_type: contactType,
            contact_value: contactValue,
            name: freeName.trim(),
          }),
        },
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

  const inputCls =
    "h-11 rounded-md border-border/50 bg-muted/30 focus-visible:bg-background focus-visible:ring-1 focus-visible:ring-primary/40 text-sm transition-colors";

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="mx-auto flex h-14 max-w-2xl items-center gap-3 px-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/">
              <ArrowLeft className="mr-1 h-3.5 w-3.5" /> Home
            </Link>
          </Button>
          <h1 className="text-sm font-semibold">Find My Ticket</h1>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 py-8 space-y-5">
        {/* ── Mode Selector ── */}
        <Card className="shadow-sm border-border/40">
          <CardContent className="p-6 space-y-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 shrink-0">
                <Ticket className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="font-semibold text-sm">Recover Your Ticket</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Select your event type below to find your ticket
                </p>
              </div>
            </div>

            {/* Paid / Free toggle */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setMode("paid");
                  reset();
                }}
                className={`flex flex-col items-center gap-1.5 rounded-lg border-2 p-4 transition-all text-sm font-medium ${
                  mode === "paid"
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border/50 bg-background text-muted-foreground hover:border-border"
                }`}
              >
                <CreditCard className="h-5 w-5" />
                <span>Paid Event</span>
                <span className="text-[10px] font-normal opacity-70">
                  Search by Transaction ID
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("free");
                  reset();
                }}
                className={`flex flex-col items-center gap-1.5 rounded-lg border-2 p-4 transition-all text-sm font-medium ${
                  mode === "free"
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border/50 bg-background text-muted-foreground hover:border-border"
                }`}
              >
                <Ticket className="h-5 w-5" />
                <span>Free Event</span>
                <span className="text-[10px] font-normal opacity-70">
                  Search by Phone or Email
                </span>
              </button>
            </div>

            {/* ── Paid Event Form ── */}
            {mode === "paid" && (
              <form onSubmit={handlePaidSearch} className="space-y-4">
                <div className="rounded-md bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40 px-3.5 py-2.5">
                  <p className="text-xs text-blue-700 dark:text-blue-300 flex items-center gap-1.5">
                    <CreditCard className="h-3.5 w-3.5 shrink-0" />
                    Paid event এ Transaction ID এবং নাম দিয়ে ticket খুঁজুন।
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label
                    htmlFor="trx_id"
                    className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
                  >
                    Transaction ID <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="trx_id"
                    placeholder="e.g. 8C3F2A1B9D"
                    value={transactionId}
                    onChange={(e) => setTransactionId(e.target.value)}
                    className={inputCls}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label
                    htmlFor="paid_name"
                    className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
                  >
                    Full Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="paid_name"
                    placeholder="Name used during registration"
                    value={paidName}
                    onChange={(e) => setPaidName(e.target.value)}
                    className={inputCls}
                    required
                  />
                </div>
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full gap-2 h-11"
                >
                  <Search className="h-4 w-4" />
                  {loading ? "Searching..." : "Find My Ticket"}
                </Button>
              </form>
            )}

            {/* ── Free Event Form ── */}
            {mode === "free" && (
              <form onSubmit={handleFreeSearch} className="space-y-4">
                <div className="rounded-md bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900/40 px-3.5 py-2.5">
                  <p className="text-xs text-green-700 dark:text-green-300 flex items-center gap-1.5">
                    <Ticket className="h-3.5 w-3.5 shrink-0" />
                    Free event এ Phone number অথবা Email এবং নাম দিয়ে ticket
                    খুঁজুন।
                  </p>
                </div>

                {/* Phone / Email toggle */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Contact Type <span className="text-destructive">*</span>
                  </Label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setContactType("phone")}
                      className={`flex items-center justify-center gap-2 rounded-md border py-2.5 text-sm font-medium transition-all ${
                        contactType === "phone"
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-border/50 bg-background text-muted-foreground hover:border-border"
                      }`}
                    >
                      <Phone className="h-3.5 w-3.5" /> Phone
                    </button>
                    <button
                      type="button"
                      onClick={() => setContactType("email")}
                      className={`flex items-center justify-center gap-2 rounded-md border py-2.5 text-sm font-medium transition-all ${
                        contactType === "email"
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-border/50 bg-background text-muted-foreground hover:border-border"
                      }`}
                    >
                      <Mail className="h-3.5 w-3.5" /> Email
                    </button>
                  </div>
                </div>

                {contactType === "phone" ? (
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="free_phone"
                      className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
                    >
                      Phone Number <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="free_phone"
                      placeholder="01XXXXXXXXX"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className={inputCls}
                      required
                    />
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="free_email"
                      className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
                    >
                      Email Address <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="free_email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={inputCls}
                      required
                    />
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label
                    htmlFor="free_name"
                    className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
                  >
                    Full Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="free_name"
                    placeholder="Name used during registration"
                    value={freeName}
                    onChange={(e) => setFreeName(e.target.value)}
                    className={inputCls}
                    required
                  />
                </div>
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full gap-2 h-11"
                >
                  <Search className="h-4 w-4" />
                  {loading ? "Searching..." : "Find My Ticket"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        {/* ── Error ── */}
        {error && (
          <Card className="border-destructive/30">
            <CardContent className="flex items-center gap-3 p-4">
              <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
              <p className="text-sm text-destructive">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* ── Not Found ── */}
        {result && !result.found && (
          <Card className="border-border/40">
            <CardContent className="flex flex-col items-center py-10 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted mb-4">
                <Ticket className="h-7 w-7 text-muted-foreground" />
              </div>
              <h3 className="font-semibold mb-1">Ticket Not Found</h3>
              <p className="text-sm text-muted-foreground max-w-xs">
                {mode === "paid"
                  ? "Transaction ID বা নাম মিলছে না। আবার চেক করুন।"
                  : "Phone/Email বা নাম মিলছে না। আবার চেক করুন।"}
              </p>
            </CardContent>
          </Card>
        )}

        {/* ── Multiple Results ── */}
        {result?.found && result.multiple && (
          <Card className="border-amber-300/60 bg-amber-50/50 dark:bg-amber-950/20">
            <CardContent className="flex items-start gap-3 p-5">
              <Users className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                  একাধিক registration পাওয়া গেছে
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                  এই Transaction ID তে একাধিক account থাকায় ticket সরাসরি
                  দেওয়া সম্ভব হচ্ছে না। অনুগ্রহ করে event organizer এর সাথে
                  যোগাযোগ করুন।
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Single Result ── */}
        {result?.found &&
          !result.multiple &&
          result.registration &&
          result.event && (
            <TicketPDF
              registration={result.registration}
              event={result.event}
            />
          )}
      </main>
    </div>
  );
};

export default FindTicket;
