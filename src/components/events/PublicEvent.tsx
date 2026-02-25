"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { usePublicEvent, useCustomFormFields } from "@/hooks/useEvents";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  CalendarDays,
  MapPin,
  Mail,
  Phone,
  Clock,
  Users,
  CheckCircle,
  ArrowLeft,
  Ticket,
  Share2,
  Search,
  AlertTriangle,
  Copy,
} from "lucide-react";
import { format } from "date-fns";
import TicketPDF from "@/components/TicketPDF";
import SmartText from "@/components/SmartText";
import CornerBox from "@/components/ui/CornerBox";

const defaultBanner = "/default-event-banner.jpeg";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

function parsePaymentEntries(
  paymentNumber: string,
  paymentMethods: string[],
): { method: string; number: string }[] {
  if (!paymentNumber) return [];
  const raw = paymentNumber.trim();
  if (raw.startsWith("{")) {
    try {
      const parsed = JSON.parse(raw);
      if (typeof parsed === "object" && parsed !== null) {
        const methods = paymentMethods?.length
          ? paymentMethods
          : Object.keys(parsed);
        return methods
          .filter((m) => parsed[m])
          .map((m) => ({ method: m, number: parsed[m] }));
      }
    } catch {}
  }
  return [{ method: paymentMethods?.[0] || "Payment", number: raw }];
}

const MetaCard = ({
  icon: Icon,
  label,
  value,
  danger,
  accent,
}: {
  icon: any;
  label: string;
  value: string;
  danger?: boolean;
  accent?: boolean;
}) => (
  <div
    className={`flex items-start gap-3 p-3.5 rounded-md border transition-colors ${danger ? "bg-destructive/5 border-destructive/20" : accent ? "bg-primary/5 border-primary/15" : "bg-muted/40 border-border/30"}`}
  >
    <div
      className={`flex h-8 w-8 items-center justify-center rounded-md shrink-0 ${danger ? "bg-destructive/10" : accent ? "bg-primary/10" : "bg-background"}`}
    >
      <Icon
        className={`h-3.5 w-3.5 ${danger ? "text-destructive" : accent ? "text-primary" : "text-muted-foreground"}`}
      />
    </div>
    <div className="min-w-0">
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">
        {label}
      </p>
      <p
        className={`text-sm font-semibold truncate ${danger ? "text-destructive" : accent ? "text-primary" : "text-foreground"}`}
      >
        <SmartText text={value} />
      </p>
    </div>
  </div>
);

const SuccessView = ({
  regNumber,
  regData,
  event,
  trxWarning,
  onClose,
}: any) => (
  <div className="py-2 space-y-5">
    <div className="text-center space-y-3">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mx-auto">
        <CheckCircle className="h-8 w-8 text-primary" />
      </div>
      <div>
        <p className="font-bold text-base">Registration confirmed!</p>
        <p className="text-xs text-muted-foreground mt-1">
          Save your registration ID
        </p>
      </div>
      <div className="bg-muted rounded-2xl px-6 py-4 mx-auto inline-block">
        <p className="text-2xl font-mono font-black tracking-[0.15em] text-foreground">
          {regNumber}
        </p>
      </div>
    </div>

    {trxWarning && (
      <div className="flex items-start gap-2.5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
        <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-800 leading-relaxed">{trxWarning}</p>
      </div>
    )}

    {regData && (
      <TicketPDF
        registration={regData}
        event={{
          title: event.title,
          venue: event.venue,
          banner_url: event.banner_url,
        }}
      />
    )}

    <button
      onClick={onClose}
      className="w-full h-11 text-sm font-bold rounded-2xl border border-border/60 hover:bg-muted transition-colors"
    >
      Done
    </button>
  </div>
);

const RegistrationForm = ({
  event,
  customFields,
  form,
  setForm,
  onSubmit,
  isPending,
}: any) => {
  const isFree = !event.price || Number(event.price) === 0;
  const showPhone = event.show_phone_field !== false;
  const showEmail = event.show_email_field !== false;
  const bothContactOn = isFree && showPhone && showEmail;
  const phoneRequired = isFree && showPhone && !showEmail;
  const emailRequired = isFree && showEmail && !showPhone;
  const paymentEntries = parsePaymentEntries(
    event.payment_number || "",
    event.payment_methods || [],
  );
  const hasPaidPayment =
    !isFree && event.price > 0 && paymentEntries.length > 0;

  const copyNumber = (number: string, method: string) => {
    navigator.clipboard.writeText(number);
    toast({ title: `${method} number copied!` });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (bothContactOn && !form.phone.trim() && !form.email.trim()) {
      toast({
        title: "Contact info required",
        description: "Please provide at least your phone number or email.",
        variant: "destructive",
      });
      return;
    }
    onSubmit();
  };

  const inputCls =
    "h-11 rounded-md border-border/50 bg-muted/30 focus-visible:bg-background focus-visible:ring-1 focus-visible:ring-primary/40 text-sm transition-colors";
  const labelCls =
    "text-xs font-bold uppercase tracking-wider text-muted-foreground";

  return (
    <form className="space-y-4 pt-1" onSubmit={handleSubmit}>
      {hasPaidPayment && (
        <div className="rounded-md bg-primary/5 border border-primary/20 p-4 space-y-3">
          <p className="text-xs font-bold uppercase tracking-wider text-primary">
            💳 Payment Info
          </p>
          <div className="space-y-2.5">
            {paymentEntries.map(({ method, number }) => (
              <div key={method}>
                <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground mb-1">
                  {method}
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-background border border-gray-400/70 rounded-md px-3 py-2.5 text-sm font-mono font-bold tracking-wider truncate select-all">
                    {number}
                  </code>
                  <button
                    type="button"
                    onClick={() => copyNumber(number, method)}
                    className="h-10 w-10 flex items-center justify-center rounded-md border border-border/50 bg-green-100 hover:bg-green-200 transition-colors shrink-0"
                  >
                    <Copy className="h-3.5 w-3.5 text-green-700" />
                  </button>
                </div>
              </div>
            ))}
          </div>
          {paymentEntries.length > 1 && (
            <p className="text-[11px] text-muted-foreground border-t border-primary/10 pt-2">
              ↑ যেকোনো একটি method এ পেমেন্ট করুন
            </p>
          )}
          {event.payment_instruction && (
            <div className="border-t border-primary/10 pt-3">
              <p className="text-xs text-muted-foreground whitespace-pre-line leading-relaxed">
                <SmartText text={event.payment_instruction} />
              </p>
            </div>
          )}
        </div>
      )}

      {event.require_name !== false && (
        <div className="space-y-1.5">
          <Label htmlFor="reg-name" className={labelCls}>
            Full Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="reg-name"
            required
            value={form.name}
            onChange={(e) =>
              setForm((p: any) => ({ ...p, name: e.target.value }))
            }
            className={inputCls}
            placeholder="Your full name"
          />
        </div>
      )}

      {showPhone && (
        <div className="space-y-1.5">
          <Label htmlFor="reg-phone" className={labelCls}>
            Phone Number{" "}
            {phoneRequired && <span className="text-destructive">*</span>}
            {bothContactOn && (
              <span className="text-destructive normal-case tracking-normal font-medium ml-1">
                (phone or email required)
              </span>
            )}
          </Label>
          <Input
            id="reg-phone"
            required={phoneRequired}
            value={form.phone}
            onChange={(e) =>
              setForm((p: any) => ({ ...p, phone: e.target.value }))
            }
            className={inputCls}
            placeholder="01XXXXXXXXX"
          />
        </div>
      )}

      {showEmail && (
        <div className="space-y-1.5">
          <Label htmlFor="reg-email" className={labelCls}>
            Email Address{" "}
            {emailRequired && <span className="text-destructive">*</span>}
            {bothContactOn && (
              <span className="text-destructive normal-case tracking-normal font-medium ml-1">
                (phone or email required)
              </span>
            )}
          </Label>
          <Input
            id="reg-email"
            type="email"
            required={emailRequired}
            value={form.email}
            onChange={(e) =>
              setForm((p: any) => ({ ...p, email: e.target.value }))
            }
            className={inputCls}
            placeholder="you@example.com"
          />
        </div>
      )}

      {event.guest_limit > 0 && (
        <div className="space-y-1.5">
          <Label htmlFor="reg-guests" className={labelCls}>
            Guests (max {event.guest_limit})
          </Label>
          <Input
            id="reg-guests"
            type="number"
            min={0}
            max={event.guest_limit}
            value={form.guest_count}
            onChange={(e) =>
              setForm((p: any) => ({
                ...p,
                guest_count: Number(e.target.value),
              }))
            }
            className={inputCls}
          />
        </div>
      )}

      {event.price != null &&
        event.price > 0 &&
        event.require_transaction_id !== false && (
          <div className="space-y-1.5">
            <Label htmlFor="reg-txn" className={labelCls}>
              Transaction ID (
              {paymentEntries.length > 0
                ? paymentEntries.map((e) => e.method).join("/")
                : "bKash/Nagad/Rocket"}
              ) <span className="text-destructive">*</span>
            </Label>
            <Input
              id="reg-txn"
              required
              value={form.transaction_id}
              onChange={(e) =>
                setForm((p: any) => ({ ...p, transaction_id: e.target.value }))
              }
              className={inputCls}
              placeholder="Payment transaction ID"
            />
          </div>
        )}

      {customFields?.map((field: any) => (
        <div key={field.id} className="space-y-1.5">
          <Label className={labelCls}>
            {field.field_name}
            {field.is_required && (
              <span className="text-destructive ml-0.5">*</span>
            )}
          </Label>
          {field.field_type === "text" && (
            <Input
              required={field.is_required}
              value={form.custom_fields[field.id] || ""}
              onChange={(e) =>
                setForm((p: any) => ({
                  ...p,
                  custom_fields: {
                    ...p.custom_fields,
                    [field.id]: e.target.value,
                  },
                }))
              }
              className={inputCls}
              placeholder={`Enter ${field.field_name}`}
            />
          )}
          {field.field_type === "number" && (
            <Input
              type="number"
              required={field.is_required}
              value={form.custom_fields[field.id] || ""}
              onChange={(e) =>
                setForm((p: any) => ({
                  ...p,
                  custom_fields: {
                    ...p.custom_fields,
                    [field.id]: e.target.value,
                  },
                }))
              }
              className={inputCls}
              placeholder={`Enter ${field.field_name}`}
            />
          )}
          {field.field_type === "select" && (
            <Select
              value={form.custom_fields[field.id] || undefined}
              onValueChange={(val) =>
                setForm((p: any) => ({
                  ...p,
                  custom_fields: { ...p.custom_fields, [field.id]: val },
                }))
              }
            >
              <SelectTrigger className="h-11 rounded-md border-border/50 bg-muted/30 text-sm">
                <SelectValue placeholder="Select an option..." />
              </SelectTrigger>
              <SelectContent className="z-[9999] rounded-md">
                {(field.field_options as string[])
                  ?.filter((o) => o.trim())
                  .map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {opt}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          )}
          {field.field_type === "checkbox" && (
            <div className="space-y-2">
              {(field.field_options as string[])?.filter((o) => o.trim())
                .length > 0 ? (
                (field.field_options as string[])
                  .filter((o) => o.trim())
                  .map((opt) => {
                    const selected: string[] =
                      form.custom_fields[field.id] || [];
                    return (
                      <div
                        key={opt}
                        className="flex items-center gap-2.5 p-3 rounded-md bg-muted/30 border border-border/40"
                      >
                        <Checkbox
                          id={`${field.id}-${opt}`}
                          checked={selected.includes(opt)}
                          onCheckedChange={(v) => {
                            const updated = v
                              ? [...selected, opt]
                              : selected.filter((x) => x !== opt);
                            setForm((p: any) => ({
                              ...p,
                              custom_fields: {
                                ...p.custom_fields,
                                [field.id]: updated,
                              },
                            }));
                          }}
                        />
                        <label
                          htmlFor={`${field.id}-${opt}`}
                          className="text-sm font-medium cursor-pointer"
                        >
                          {opt}
                        </label>
                      </div>
                    );
                  })
              ) : (
                <div className="flex items-center gap-2.5 p-3 rounded-md bg-muted/30 border border-border/40">
                  <Checkbox
                    checked={!!form.custom_fields[field.id]}
                    onCheckedChange={(v) =>
                      setForm((p: any) => ({
                        ...p,
                        custom_fields: { ...p.custom_fields, [field.id]: v },
                      }))
                    }
                  />
                  <span className="text-sm font-medium">Yes</span>
                </div>
              )}
            </div>
          )}
        </div>
      ))}

      <button
        type="submit"
        disabled={isPending}
        className="w-full h-12 text-sm font-bold bg-primary text-primary-foreground rounded-md hover:opacity-90 active:scale-[0.98] transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-primary/20 mt-2"
      >
        {isPending ? "Submitting…" : "Submit Registration"}
      </button>
    </form>
  );
};

const RegisteredListModal = ({
  eventId,
  open,
  onOpenChange,
}: {
  eventId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) => {
  const [registrations, setRegistrations] = useState<
    { name: string; status: string }[]
  >([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchList = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `${SUPABASE_URL}/functions/v1/public-registrations?event_id=${eventId}`,
        { headers: { apikey: SUPABASE_KEY } },
      );
      const json = await res.json();
      if (json.registrations) {
        setRegistrations(json.registrations);
        setTotal(json.total);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (v) fetchList();
      }}
    >
      <DialogTrigger asChild>
        <button className="flex-1 sm:flex-none flex items-center justify-center gap-2 text-sm font-semibold py-3.5 px-5 rounded-md border border-border/50 bg-background hover:bg-muted transition-colors">
          <Users className="h-4 w-4" /> View Registered
        </button>
      </DialogTrigger>
      <DialogContent className="max-h-[80vh] overflow-y-auto rounded-md border-border/30">
        <DialogHeader>
          <DialogTitle className="text-xl">
            Registered Attendees ({total})
          </DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : registrations.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No registrations yet.
          </p>
        ) : (
          <div className="space-y-2">
            {registrations.map((r, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-md bg-muted/40 hover:bg-muted/70 px-4 py-3 transition-colors border border-gray-300/40"
              >
                <SmartText text={r.name} className="text-sm font-semibold" />
                <span
                  className={`text-[11px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full ${r.status === "approved" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}
                >
                  {r.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

const PublicEvent = () => {
  const params = useParams();
  const slug = params?.slug as string;
  const { data: event, isLoading, error } = usePublicEvent(slug || "");
  const { data: customFields } = useCustomFormFields(event?.id || "");
  const [registerOpen, setRegisterOpen] = useState(false);
  const [registeredListOpen, setRegisteredListOpen] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [successRegData, setSuccessRegData] = useState<any>(null);
  const [trxWarning, setTrxWarning] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [seatInfo, setSeatInfo] = useState<{
    total: number;
    occupied: number;
    remaining: number;
  } | null>(null);
  const [now, setNow] = useState(new Date());
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    guest_count: 0,
    transaction_id: "",
    custom_fields: {} as Record<string, any>,
  });

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!event?.id || !event.seat_limit || event.seat_limit <= 0) return;
    const fetchSeats = async () => {
      try {
        const res = await fetch(
          `${SUPABASE_URL}/functions/v1/public-registrations?event_id=${event.id}&count_only=true`,
          { headers: { apikey: SUPABASE_KEY } },
        );
        const json = await res.json();
        const occupied = json.occupied_seats ?? 0;
        setSeatInfo({
          total: event.seat_limit!,
          occupied,
          remaining: Math.max(0, event.seat_limit! - occupied),
        });
      } catch {}
    };
    fetchSeats();
    const interval = setInterval(fetchSeats, 15000);
    return () => clearInterval(interval);
  }, [event?.id, event?.seat_limit, success]);

  const handleRegister = async () => {
    if (!event) return;
    setSubmitting(true);
    setTrxWarning(null);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: SUPABASE_KEY },
        body: JSON.stringify({
          event_id: event.id,
          name: form.name,
          phone: form.phone || null,
          email: form.email || null,
          guest_count: form.guest_count,
          transaction_id: form.transaction_id || null,
          custom_fields:
            Object.keys(form.custom_fields).length > 0
              ? form.custom_fields
              : null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Registration failed");
      if (json.trx_id_warning) setTrxWarning(json.trx_id_warning);
      setSuccess(json.registration_number);
      setSuccessRegData({
        id: json.registration_id,
        name: form.name,
        email: form.email,
        phone: form.phone,
        registration_number: json.registration_number,
        guest_count: form.guest_count,
        status: "pending",
        created_at: new Date().toISOString(),
      });
      setForm({
        name: "",
        phone: "",
        email: "",
        guest_count: 0,
        transaction_id: "",
        custom_fields: {},
      });
    } catch (err: any) {
      toast({
        title: "Registration failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const shareEvent = () => {
    navigator.clipboard.writeText(window.location.href);
    toast({ title: "Link copied!" });
  };

  if (isLoading)
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );

  if (error || !event)
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center gap-5">
        <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center">
          <CalendarDays className="h-7 w-7 text-muted-foreground" />
        </div>
        <div>
          <h1 className="text-xl font-bold mb-1">Event Not Found</h1>
          <p className="text-sm text-muted-foreground max-w-xs">
            This event may have been removed or not yet published.
          </p>
        </div>
        <Button variant="outline" size="sm" asChild className="rounded-full">
          <Link href="/">
            <ArrowLeft className="mr-2 h-3.5 w-3.5" />
            Back to Home
          </Link>
        </Button>
      </div>
    );

  const deadlinePassed = (() => {
    if (!event.registration_deadline) return false;
    const dl = new Date(event.registration_deadline);
    if (dl.getHours() === 0 && dl.getMinutes() === 0 && dl.getSeconds() === 0)
      dl.setHours(23, 59, 59, 999);
    return dl < now;
  })();

  const seatsFull = seatInfo ? seatInfo.remaining <= 0 : false;
  const canRegister =
    event.status !== "closed" &&
    (!deadlinePassed || event.allow_late_registration) &&
    !seatsFull;
  const bannerSrc =
    event.banner_url ||
    ((event as any).show_default_banner ? defaultBanner : null);

  return (
    <div className="min-h-screen bg-muted/30">
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/30">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Home</span>
          </Link>
          <div className="flex items-center gap-1">
            <Link
              href="/find-ticket"
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg hover:bg-muted transition-all"
            >
              <Search className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Find Ticket</span>
            </Link>
            <button
              onClick={shareEvent}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg hover:bg-muted transition-all"
            >
              <Share2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Share</span>
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {bannerSrc && (
          <div className="rounded-xl overflow-hidden bg-background shadow-sm border border-border/20">
            <img
              src={bannerSrc}
              alt={event.title}
              className="w-full object-cover"
              style={{
                maxHeight: "340px",
                minHeight: "200px",
                objectPosition: "center",
              }}
            />
          </div>
        )}

        <div className="rounded-md bg-background shadow-sm border border-neutral-300 p-5 sm:p-6 space-y-5">
          <div className="space-y-2.5">
            {event.price != null && event.price > 0 && (
              <span className="inline-flex items-center bg-primary/10 text-primary text-xs font-bold px-3 py-1 rounded-full border border-primary/20">
                ৳ {event.price} entry fee
              </span>
            )}
            <h1 className="text-5xl font-black leading-none text-foreground">
              <SmartText text={event.title} />
            </h1>
          </div>

          <div className="h-px bg-border/40" />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {event.venue && (
              <MetaCard icon={MapPin} label="Venue" value={event.venue} />
            )}
            {event.registration_deadline && (
              <MetaCard
                icon={Clock}
                label={deadlinePassed ? "Registration" : "Deadline"}
                value={
                  deadlinePassed
                    ? "Closed"
                    : format(
                        new Date(event.registration_deadline),
                        "d MMM yyyy · h:mm a",
                      )
                }
                danger={deadlinePassed}
              />
            )}
            {seatInfo && (
              <MetaCard
                icon={Users}
                label="Availability"
                value={
                  seatsFull
                    ? "Seats full"
                    : `${seatInfo.remaining} / ${seatInfo.total} seats left`
                }
                danger={seatsFull}
                accent={!seatsFull}
              />
            )}
            {event.organizer_contact_email && (
              <MetaCard
                icon={Mail}
                label="Email"
                value={event.organizer_contact_email}
              />
            )}
            {event.organizer_contact_phone && (
              <MetaCard
                icon={Phone}
                label="Phone"
                value={event.organizer_contact_phone}
              />
            )}
          </div>

          <div className="h-px bg-border/40" />

          <div className="flex flex-col sm:flex-row gap-3">
            <Dialog
              open={registerOpen}
              onOpenChange={(o) => {
                setRegisterOpen(o);
                if (!o) {
                  setSuccess(null);
                  setSuccessRegData(null);
                  setTrxWarning(null);
                }
              }}
            >
              <DialogTrigger asChild>
                <button
                  disabled={!canRegister}
                  className="flex-1 flex items-center justify-center gap-2.5 bg-primary text-primary-foreground font-bold text-sm py-3.5 px-6 rounded-md hover:opacity-90 active:scale-[0.98] transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-primary/20"
                >
                  <Ticket className="h-4 w-4" />
                  {seatsFull
                    ? "Seats Full"
                    : canRegister
                      ? "Register Now"
                      : "Registration Closed"}
                </button>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md rounded-lg border-border/30">
                <DialogHeader>
                  <DialogTitle className="text-xl text-center">
                    {success ? "You're In!" : "Register for Event"}
                  </DialogTitle>
                </DialogHeader>
                {success ? (
                  <SuccessView
                    regNumber={success}
                    regData={successRegData}
                    event={event}
                    trxWarning={trxWarning}
                    onClose={() => {
                      setRegisterOpen(false);
                      setSuccess(null);
                      setSuccessRegData(null);
                      setTrxWarning(null);
                    }}
                  />
                ) : (
                  <RegistrationForm
                    event={event}
                    customFields={customFields || []}
                    form={form}
                    setForm={setForm}
                    onSubmit={handleRegister}
                    isPending={submitting}
                  />
                )}
              </DialogContent>
            </Dialog>

            {event.show_registered_list && (
              <RegisteredListModal
                eventId={event.id}
                open={registeredListOpen}
                onOpenChange={setRegisteredListOpen}
              />
            )}
          </div>
        </div>

        {event.description && (
          <div className="rounded-md bg-amber-400/20 shadow-sm border border-gray-300 p-5 sm:p-6 space-y-4">
            <h2 className="text-lg font-bold text-foreground">
              <CornerBox>About</CornerBox> This Event:
            </h2>
            <div
              className="prose prose-sm max-w-none text-muted-foreground [&_h1]:text-foreground [&_h2]:text-foreground [&_strong]:text-foreground [&_a]:text-primary"
              style={{
                fontFamily: /[\u0980-\u09FF]/.test(event.description)
                  ? '"Shurjo", sans-serif'
                  : '"Manrope", sans-serif',
              }}
              dangerouslySetInnerHTML={{ __html: event.description }}
            />
          </div>
        )}

        {event.instructions && (
          <div className="rounded-md bg-green-300/20 shadow-sm border border-gray-300 overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-primary via-primary/60 to-primary/10" />
            <div className="p-5 sm:p-6 space-y-4">
              <h2 className="text-lg font-bold text-foreground">
                Instructions & <CornerBox color="#0000FF">Rules</CornerBox>:
              </h2>
              <div
                className="prose prose-sm max-w-none text-muted-foreground [&_h1]:text-foreground [&_h2]:text-foreground [&_strong]:text-foreground [&_a]:text-primary"
                style={{
                  fontFamily: /[\u0980-\u09FF]/.test(event.instructions)
                    ? '"Shurjo", sans-serif'
                    : '"Manrope", sans-serif',
                }}
                dangerouslySetInnerHTML={{ __html: event.instructions }}
              />
            </div>
          </div>
        )}

        <div className="text-center py-4">
          <p className="text-xs text-muted-foreground">
            Powered by{" "}
            <span className="font-semibold text-foreground">Regixo</span>
          </p>
          <p className="text-xs text-muted-foreground">
            Created by{" "}
            <a
              href="https://www.facebook.com/motochowdhury2nd"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-foreground"
            >
              Mottalib
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default PublicEvent;
