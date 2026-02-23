"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useEvent, useCustomFormFields, generateSlug } from "@/hooks/useEvents";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  ArrowLeft,
  Save,
  Send,
  Eye,
  EyeOff,
  CalendarIcon,
  AlertCircle,
  Plus,
  Trash2,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import TiptapEditor from "@/components/events/TiptapEditor";
import BannerUpload from "@/components/events/BannerUpload";
import CustomFieldsBuilder, {
  type CustomField,
} from "@/components/events/CustomFieldsBuilder";
import EventPreview from "@/components/events/EventPreview";
import { useIsMobile } from "@/hooks/use-mobile";

// ─── Types ───────────────────────────────────────────────────────────────────

interface FormErrors {
  title?: string;
  venue?: string;
  organizer_contact_email?: string;
  seat_limit?: string;
  price?: string;
  guest_limit?: string;
}

interface PaymentMethodEntry {
  method: string;
  number: string;
}

interface FormState {
  title: string;
  description: string;
  banner_url: string | null;
  venue: string;
  organizer_contact_email: string;
  organizer_contact_phone: string;
  seat_limit: string | number;
  price: string | number;
  registration_deadline: string;
  guest_limit: string | number;
  allow_late_registration: boolean;
  instructions: string;
  show_registered_list: boolean;
  payment_method_entries: PaymentMethodEntry[];
  payment_instruction: string;
  show_phone_field: boolean;
  show_email_field: boolean;
  require_name: boolean;
  require_transaction_id: boolean;
  payment_number: string;
  payment_methods: string[];
  show_default_banner: boolean;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const AVAILABLE_METHODS = ["bKash", "Nagad", "Rocket", "Upay"];

const initialForm: FormState = {
  title: "",
  description: "",
  banner_url: null,
  venue: "",
  organizer_contact_email: "",
  organizer_contact_phone: "",
  seat_limit: "",
  price: "",
  registration_deadline: "",
  guest_limit: "",
  allow_late_registration: false,
  instructions: "",
  show_registered_list: false,
  payment_method_entries: [],
  payment_instruction: "",
  show_phone_field: true,
  show_email_field: true,
  require_name: true,
  require_transaction_id: true,
  payment_number: "",
  payment_methods: [],
  show_default_banner: false,
};

// ─── Helper Functions ─────────────────────────────────────────────────────────

function validateForm(form: FormState): FormErrors {
  const errors: FormErrors = {};
  if (!(form.title || "").trim()) errors.title = "Event title is required";
  else if (form.title.length > 200)
    errors.title = "Title must be under 200 characters";
  if (
    form.organizer_contact_email &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.organizer_contact_email)
  ) {
    errors.organizer_contact_email = "Invalid email address";
  }
  if (
    form.seat_limit !== "" &&
    form.seat_limit !== null &&
    form.seat_limit !== undefined
  ) {
    if (Number(form.seat_limit) < 1) errors.seat_limit = "Must be at least 1";
  }
  if (form.price !== "" && form.price !== null && Number(form.price) < 0)
    errors.price = "Price cannot be negative";
  if (
    form.guest_limit !== "" &&
    form.guest_limit !== null &&
    Number(form.guest_limit) < 0
  )
    errors.guest_limit = "Cannot be negative";
  return errors;
}

function buildPaymentCompat(entries: PaymentMethodEntry[]) {
  const methods = entries.map((e) => e.method);
  const numberMap: Record<string, string> = {};
  entries.forEach((e) => {
    numberMap[e.method] = e.number;
  });
  const numberJson = entries.length > 0 ? JSON.stringify(numberMap) : "";
  return { payment_methods: methods, payment_number: numberJson };
}

function parsePaymentEntries(
  methods: string[],
  numberRaw: string,
): PaymentMethodEntry[] {
  if (!methods || methods.length === 0) return [];
  let numberMap: Record<string, string> = {};
  if (numberRaw) {
    const trimmed = numberRaw.trim();
    if (trimmed.startsWith("{")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (typeof parsed === "object" && parsed !== null) numberMap = parsed;
      } catch {
        if (methods[0]) numberMap[methods[0]] = trimmed;
      }
    } else {
      if (methods[0]) numberMap[methods[0]] = trimmed;
    }
  }
  return methods.map((m) => ({ method: m, number: numberMap[m] || "" }));
}

function generateInstruction(
  entries: PaymentMethodEntry[],
  price: string | number,
) {
  if (entries.length === 0) return "";
  const priceStr = price ? `৳${price}` : "the required amount";
  const lines = entries
    .filter((e) => e.number.trim())
    .map((e) => `${e.method}: ${e.number.trim()}`);
  if (lines.length === 0) return "";
  return `Send ${priceStr} to the respective number below (Send Money). Use your full name as reference.\n${lines.join("\n")}`;
}

function buildEventData(
  form: FormState,
  userId: string,
  slug: string | null,
  status: "draft" | "published" | "closed",
) {
  const compat = buildPaymentCompat(form.payment_method_entries);
  const seatLimitVal =
    form.seat_limit === "" ||
    form.seat_limit === null ||
    form.seat_limit === undefined
      ? null
      : Number(form.seat_limit);
  const guestLimitVal =
    form.guest_limit === "" ||
    form.guest_limit === null ||
    form.guest_limit === undefined
      ? 0
      : Number(form.guest_limit);
  const priceVal =
    form.price === "" || form.price === null || form.price === undefined
      ? 0
      : Number(form.price);

  return {
    organizer_id: userId,
    title: (form.title || "").trim(),
    description: form.description || null,
    banner_url: form.banner_url || null,
    venue: (form.venue || "").trim() || null,
    organizer_contact_email:
      (form.organizer_contact_email || "").trim() || null,
    organizer_contact_phone:
      (form.organizer_contact_phone || "").trim() || null,
    seat_limit: seatLimitVal,
    price: priceVal,
    registration_deadline: form.registration_deadline || null,
    guest_limit: guestLimitVal,
    allow_late_registration: form.allow_late_registration ?? false,
    instructions: form.instructions || null,
    show_registered_list: form.show_registered_list ?? false,
    payment_methods: compat.payment_methods,
    payment_number: compat.payment_number,
    payment_instruction: (form.payment_instruction || "").trim() || null,
    show_phone_field: form.show_phone_field ?? true,
    show_email_field: form.show_email_field ?? true,
    require_name: true,
    require_transaction_id: form.require_transaction_id ?? true,
    show_default_banner: form.show_default_banner ?? false,
    status,
    slug,
  };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const FieldError = ({ message }: { message?: string }) => {
  if (!message) return null;
  return (
    <p className="flex items-center gap-1 text-xs text-destructive mt-1">
      <AlertCircle className="h-3 w-3" /> {message}
    </p>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const EventForm = () => {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();

  // ✅ BUG FIX: params থেকে id বের করা — Next.js এ params object হয়
  const id = params?.id as string | undefined;
  const templateId = searchParams.get("template");

  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isEdit = !!id;

  const { data: existingEvent, refetch: refetchEvent } = useEvent(id || "");
  const { data: existingFields, refetch: refetchFields } = useCustomFormFields(
    id || "",
  );

  // ✅ সব state গুলো component এর ভেতরে
  const [form, setForm] = useState<FormState>(initialForm);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const [showTrxWarning, setShowTrxWarning] = useState(false);
  const [editorKey, setEditorKey] = useState(0);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [autoSaving, setAutoSaving] = useState(false);
  const [dataReady, setDataReady] = useState(false);

  const isMobile = useIsMobile();
  const initializedRef = useRef<string | null>(null);
  const autoSaveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const formRef = useRef<FormState>(form);
  const existingEventRef = useRef(existingEvent);

  useEffect(() => {
    formRef.current = form;
  }, [form]);
  useEffect(() => {
    existingEventRef.current = existingEvent;
  }, [existingEvent]);

  // ✅ Edit mode এ data load
  useEffect(() => {
    if (!isEdit || !id) return;
    setDataReady(false);
    initializedRef.current = null;
    Promise.all([refetchEvent(), refetchFields()]).then(() => {
      setDataReady(true);
    });
  }, [id]); // eslint-disable-line

  // Template load
  const { data: templateData } = useQuery({
    queryKey: ["event-template", templateId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("event_templates")
        .select("*")
        .eq("id", templateId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!templateId && !isEdit,
  });

  useEffect(() => {
    if (!templateData || isEdit) return;
    const entries = parsePaymentEntries(
      (templateData as any).payment_methods || [],
      (templateData as any).payment_number || "",
    );
    setForm((prev) => ({
      ...prev,
      title: (templateData as any).title || "",
      description: (templateData as any).description || "",
      banner_url: (templateData as any).banner_url || null,
      venue: (templateData as any).venue || "",
      instructions: (templateData as any).instructions || "",
      price: (templateData as any).price ?? "",
      seat_limit: (templateData as any).seat_limit ?? "",
      payment_method_entries: entries,
      payment_instruction: (templateData as any).payment_instruction || "",
    }));
    setEditorKey((k) => k + 1);
  }, [templateData, isEdit]);

  // User profile (seat limit)
  const { data: userProfile } = useQuery({
    queryKey: ["user-profile-seat-limit", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("max_seat_limit")
        .eq("id", user!.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const maxSeatLimit = (userProfile as any)?.max_seat_limit ?? 300;
  const isFreeEvent = !form.price || Number(form.price) === 0;

  useEffect(() => {
    if (isFreeEvent) setShowTrxWarning(false);
  }, [isFreeEvent]);

  // Edit mode form populate
  useEffect(() => {
    if (!isEdit) return;
    if (!dataReady) return;
    if (!existingEvent || existingFields === undefined) return;
    if (initializedRef.current === id) return;
    initializedRef.current = id!;

    const existingEntries: PaymentMethodEntry[] =
      (existingEvent as any).payment_method_entries ||
      parsePaymentEntries(
        (existingEvent as any).payment_methods || [],
        (existingEvent as any).payment_number || "",
      );

    setForm({
      title: existingEvent.title || "",
      description: existingEvent.description || "",
      banner_url: existingEvent.banner_url || null,
      venue: existingEvent.venue || "",
      organizer_contact_email: existingEvent.organizer_contact_email || "",
      organizer_contact_phone: existingEvent.organizer_contact_phone || "",
      seat_limit:
        existingEvent.seat_limit != null ? existingEvent.seat_limit : "",
      price: existingEvent.price != null ? existingEvent.price : "",
      registration_deadline: existingEvent.registration_deadline || "",
      guest_limit:
        (existingEvent as any).guest_limit != null
          ? (existingEvent as any).guest_limit
          : "",
      allow_late_registration: existingEvent.allow_late_registration ?? false,
      instructions: existingEvent.instructions || "",
      show_registered_list: existingEvent.show_registered_list ?? false,
      payment_method_entries: existingEntries,
      payment_instruction: (existingEvent as any).payment_instruction || "",
      show_phone_field: (existingEvent as any).show_phone_field ?? true,
      show_email_field: (existingEvent as any).show_email_field ?? true,
      require_name: true,
      require_transaction_id:
        (existingEvent as any).require_transaction_id ?? true,
      payment_number: (existingEvent as any).payment_number || "",
      payment_methods: (existingEvent as any).payment_methods || [],
      show_default_banner: (existingEvent as any).show_default_banner ?? false,
    });

    setCustomFields(
      existingFields && existingFields.length > 0
        ? existingFields.map((f) => ({
            id: f.id,
            field_name: f.field_name,
            field_type: f.field_type,
            field_options: f.field_options as string[] | null,
            is_required: f.is_required ?? false,
            sort_order: f.sort_order ?? 0,
          }))
        : [],
    );
    setEditorKey((k) => k + 1);
  }, [existingEvent, existingFields, isEdit, id, dataReady]);

  // Validation
  useEffect(() => {
    const newErrors = validateForm(form);
    const filteredErrors: FormErrors = {};
    for (const key of Object.keys(newErrors) as (keyof FormErrors)[]) {
      if (touched.has(key)) filteredErrors[key] = newErrors[key];
    }
    setErrors(filteredErrors);
  }, [form, touched]);

  // Free event এ অন্তত একটা contact field চালু রাখা
  useEffect(() => {
    if (isFreeEvent && !form.show_phone_field && !form.show_email_field) {
      setForm((prev) => ({ ...prev, show_email_field: true }));
    }
  }, [isFreeEvent, form.show_phone_field, form.show_email_field]);

  // Auto save
  const autoSave = useCallback(async () => {
    if (!isEdit || !user || !id || !(formRef.current.title || "").trim())
      return;
    setAutoSaving(true);
    try {
      const eventData = buildEventData(
        formRef.current,
        user.id,
        existingEventRef.current?.slug || null,
        (existingEventRef.current?.status as any) || "draft",
      );
      const { error } = await supabase
        .from("events")
        .update(eventData)
        .eq("id", id);
      if (!error) setLastSaved(new Date());
    } catch {
    } finally {
      setAutoSaving(false);
    }
  }, [isEdit, user, id]);

  const update = (key: string, value: any) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setTouched((prev) => new Set(prev).add(key));
    if (isEdit) {
      if (autoSaveTimeout.current) clearTimeout(autoSaveTimeout.current);
      autoSaveTimeout.current = setTimeout(autoSave, 3000);
    }
  };

  // Payment handlers
  const handlePhoneToggle = (v: boolean) => {
    if (isFreeEvent && !v && !form.show_email_field) {
      toast({
        title: "কমপক্ষে একটি contact field চালু রাখুন",
        description: "Free event এ phone অথবা email এর অন্তত একটি দরকার।",
        variant: "destructive",
      });
      return;
    }
    update("show_phone_field", v);
  };

  const handleEmailToggle = (v: boolean) => {
    if (isFreeEvent && !v && !form.show_phone_field) {
      toast({
        title: "কমপক্ষে একটি contact field চালু রাখুন",
        description: "Free event এ phone অথবা email এর অন্তত একটি দরকার।",
        variant: "destructive",
      });
      return;
    }
    update("show_email_field", v);
  };

  const addPaymentMethod = (method: string) => {
    if (form.payment_method_entries.find((e) => e.method === method)) return;
    update("payment_method_entries", [
      ...form.payment_method_entries,
      { method, number: "" },
    ]);
  };

  const removePaymentMethod = (method: string) => {
    const newEntries = form.payment_method_entries.filter(
      (e) => e.method !== method,
    );
    setForm((prev) => ({
      ...prev,
      payment_method_entries: newEntries,
      payment_instruction: generateInstruction(newEntries, prev.price),
    }));
    setTouched(
      (prev) =>
        new Set([...prev, "payment_method_entries", "payment_instruction"]),
    );
    if (isEdit) {
      if (autoSaveTimeout.current) clearTimeout(autoSaveTimeout.current);
      autoSaveTimeout.current = setTimeout(autoSave, 3000);
    }
  };

  const updatePaymentNumber = (method: string, number: string) => {
    const newEntries = form.payment_method_entries.map((e) =>
      e.method === method ? { ...e, number } : e,
    );
    setForm((prev) => ({
      ...prev,
      payment_method_entries: newEntries,
      payment_instruction: generateInstruction(newEntries, prev.price),
    }));
    setTouched(
      (prev) =>
        new Set([...prev, "payment_method_entries", "payment_instruction"]),
    );
    if (isEdit) {
      if (autoSaveTimeout.current) clearTimeout(autoSaveTimeout.current);
      autoSaveTimeout.current = setTimeout(autoSave, 3000);
    }
  };

  // Save/Publish mutation
  const mutation = useMutation({
    mutationFn: async (status: "draft" | "published") => {
      if (!user) throw new Error("Not authenticated");
      const allErrors = validateForm(form);
      if (Object.keys(allErrors).length > 0) {
        setTouched(new Set(Object.keys(allErrors)));
        setErrors(allErrors);
        throw new Error("Please fix the form errors before saving");
      }
      const slug = isEdit ? existingEvent?.slug : generateSlug(form.title);
      const eventData = buildEventData(form, user.id, slug || null, status);
      let eventId = id;

      if (isEdit) {
        const { error } = await supabase
          .from("events")
          .update(eventData)
          .eq("id", id!);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("events")
          .insert(eventData)
          .select("id")
          .single();
        if (error) throw error;
        eventId = data.id;
      }

      // Custom fields
      if (isEdit) {
        await supabase
          .from("custom_form_fields")
          .delete()
          .eq("event_id", eventId!);
      }
      if (customFields.length > 0) {
        const { error } = await supabase.from("custom_form_fields").insert(
          customFields.map((f, i) => ({
            event_id: eventId!,
            field_name: f.field_name,
            field_type: f.field_type,
            field_options: f.field_options,
            is_required: f.is_required,
            sort_order: i,
          })),
        );
        if (error) throw error;
      }
      return eventId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      if (id) queryClient.invalidateQueries({ queryKey: ["event", id] });
      toast({ title: "Event saved successfully!" });
      router.push("/dashboard"); // ✅ navigate → router.push
    },
    onError: (err: any) => {
      toast({
        title: "Error saving event",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  // Loading skeleton
  const isLoadingEdit =
    isEdit &&
    (!dataReady ||
      !existingEvent ||
      existingFields === undefined ||
      initializedRef.current !== id);

  if (isLoadingEdit) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-sm">
          <div className="mx-auto flex h-14 max-w-6xl items-center px-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/dashboard")}
            >
              <ArrowLeft className="mr-1 h-4 w-4" />
            </Button>
          </div>
        </header>
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
          <div className="h-8 w-40 bg-muted animate-pulse rounded-md" />
          {[...Array(4)].map((_, i) => (
            <div key={i} className="rounded-xl border bg-card p-6 space-y-4">
              <div className="h-5 w-32 bg-muted animate-pulse rounded" />
              <div className="h-10 w-full bg-muted animate-pulse rounded" />
              <div className="h-10 w-3/4 bg-muted animate-pulse rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const deadlineDate = form.registration_deadline
    ? new Date(form.registration_deadline)
    : undefined;
  const selectedMethods = form.payment_method_entries.map((e) => e.method);
  const availableToAdd = AVAILABLE_METHODS.filter(
    (m) => !selectedMethods.includes(m),
  );

  // ─── JSX ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/dashboard")}
            >
              <ArrowLeft className="mr-1 h-4 w-4" />
            </Button>
            {autoSaving && (
              <span className="hidden sm:inline text-xs text-muted-foreground animate-pulse">
                Saving...
              </span>
            )}
            {lastSaved && !autoSaving && (
              <span className="hidden sm:inline text-xs text-muted-foreground">
                Saved {format(lastSaved, "h:mm a")}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant={showPreview ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setShowPreview((p) => !p)}
              className="h-8 px-2.5 sm:px-3 text-xs gap-1.5"
            >
              {showPreview ? (
                <EyeOff className="h-3.5 w-3.5 shrink-0" />
              ) : (
                <Eye className="h-3.5 w-3.5 shrink-0" />
              )}
              <span className="hidden sm:inline">
                {showPreview ? "Hide" : "Preview"}
              </span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={mutation.isPending || !(form.title || "").trim()}
              onClick={() => mutation.mutate("draft")}
              className="h-8 px-2.5 sm:px-3 text-xs gap-1.5"
            >
              <Save className="h-3.5 w-3.5 shrink-0" />
              <span className="hidden sm:inline">Draft</span>
            </Button>
            <Button
              size="sm"
              disabled={mutation.isPending || !(form.title || "").trim()}
              onClick={() => mutation.mutate("published")}
              className="h-8 px-2.5 sm:px-3 text-xs gap-1.5"
            >
              <Send className="h-3.5 w-3.5 shrink-0" />
              <span>Publish</span>
            </Button>
          </div>
        </div>
      </header>

      <div
        className={cn(
          "mx-auto px-4 py-6",
          showPreview && !isMobile ? "flex gap-6 max-w-6xl" : "max-w-3xl",
        )}
      >
        <div
          className={cn(
            "space-y-6",
            showPreview && !isMobile && "flex-1 min-w-0",
          )}
        >
          <h1 className="text-2xl font-bold">
            {isEdit ? "Edit Event" : "Create Event"}
          </h1>

          {/* Basic Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                Basic Information
                <Badge variant="secondary" className="text-xs font-normal">
                  Required
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="title">Event Title *</Label>
                <Input
                  id="title"
                  placeholder="Enter event title"
                  value={form.title}
                  onChange={(e) => update("title", e.target.value)}
                  className={cn("mt-1", errors.title && "border-destructive")}
                  maxLength={200}
                />
                <div className="flex justify-between">
                  <FieldError message={errors.title} />
                  <span className="text-xs text-muted-foreground mt-1">
                    {(form.title || "").length}/200
                  </span>
                </div>
              </div>

              <div>
                <Label className="mb-2 block">Event Banner</Label>
                <BannerUpload
                  value={form.banner_url}
                  onChange={(url) => update("banner_url", url)}
                />
                {!form.banner_url && (
                  <div className="flex items-center justify-between rounded-lg border p-3 mt-3">
                    <div>
                      <Label className="text-sm">Default banner দেখাও</Label>
                      <p className="text-xs text-muted-foreground">
                        চালু করলে public page এ default banner দেখাবে
                      </p>
                    </div>
                    <Switch
                      checked={form.show_default_banner}
                      onCheckedChange={(v) => update("show_default_banner", v)}
                    />
                  </div>
                )}
                {form.banner_url && (
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground mt-2">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    Custom banner upload করা আছে — default banner দেখাবে না।
                  </p>
                )}
              </div>

              <div>
                <Label className="mb-2 block">Description</Label>
                <TiptapEditor
                  key={`description-${editorKey}`}
                  content={form.description}
                  onChange={(html) => update("description", html)}
                  placeholder="Describe your event..."
                  minHeight="160px"
                />
              </div>
            </CardContent>
          </Card>

          {/* Venue & Contact */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium">
                Venue & Contact
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="venue">Venue Name</Label>
                <Input
                  id="venue"
                  placeholder="e.g. City Convention Center"
                  value={form.venue}
                  onChange={(e) => update("venue", e.target.value)}
                  className="mt-1"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="contact-email">Contact Email</Label>
                  <Input
                    id="contact-email"
                    type="email"
                    placeholder="organizer@email.com"
                    value={form.organizer_contact_email}
                    onChange={(e) =>
                      update("organizer_contact_email", e.target.value)
                    }
                    className={cn(
                      "mt-1",
                      errors.organizer_contact_email && "border-destructive",
                    )}
                  />
                  <FieldError message={errors.organizer_contact_email} />
                </div>
                <div>
                  <Label htmlFor="contact-phone">Contact Phone</Label>
                  <Input
                    id="contact-phone"
                    placeholder="+880 1XXX-XXXXXX"
                    value={form.organizer_contact_phone}
                    onChange={(e) =>
                      update("organizer_contact_phone", e.target.value)
                    }
                    className="mt-1"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Registration Settings */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium">
                Registration Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="seat-limit">
                    Seat Limit (max {maxSeatLimit})
                  </Label>
                  <Input
                    id="seat-limit"
                    type="number"
                    min={1}
                    max={maxSeatLimit}
                    placeholder="Unlimited"
                    value={form.seat_limit}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "") {
                        update("seat_limit", "");
                        return;
                      }
                      const num = Number(val);
                      update(
                        "seat_limit",
                        num > maxSeatLimit ? String(maxSeatLimit) : val,
                      );
                    }}
                    className={cn(
                      "mt-1",
                      errors.seat_limit && "border-destructive",
                    )}
                  />
                  <FieldError message={errors.seat_limit} />
                  {form.seat_limit !== "" &&
                    Number(form.seat_limit) >= maxSeatLimit && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Your seat limit is {maxSeatLimit}. Need more seats?
                        Contact at "mottalib.contact@gmail.com".
                      </p>
                    )}
                </div>
                <div>
                  <Label htmlFor="price">Price (৳)</Label>
                  <Input
                    id="price"
                    type="number"
                    min={0}
                    step="0.01"
                    placeholder="0 (Free)"
                    value={form.price}
                    onChange={(e) => update("price", e.target.value)}
                    className={cn("mt-1", errors.price && "border-destructive")}
                  />
                  <FieldError message={errors.price} />
                </div>
              </div>

              {/* Deadline */}
              <div>
                <Label>Registration Deadline</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "mt-1 w-full justify-start text-left font-normal",
                        !deadlineDate && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {deadlineDate
                        ? format(deadlineDate, "PPP p")
                        : "No deadline set"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={deadlineDate}
                      onSelect={(date) => {
                        if (date) {
                          if (deadlineDate) {
                            date.setHours(
                              deadlineDate.getHours(),
                              deadlineDate.getMinutes(),
                              0,
                              0,
                            );
                          } else {
                            date.setHours(23, 59, 59, 0);
                          }
                          update("registration_deadline", date.toISOString());
                        } else {
                          update("registration_deadline", "");
                        }
                      }}
                      disabled={(date) =>
                        date < new Date(new Date().setHours(0, 0, 0, 0))
                      }
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                    {deadlineDate && (
                      <div className="border-t px-3 py-2">
                        <Label className="text-xs text-muted-foreground">
                          Time
                        </Label>
                        <Input
                          type="time"
                          className="mt-1"
                          value={
                            deadlineDate ? format(deadlineDate, "HH:mm") : ""
                          }
                          onChange={(e) => {
                            if (deadlineDate && e.target.value) {
                              const [h, m] = e.target.value
                                .split(":")
                                .map(Number);
                              const newDate = new Date(deadlineDate);
                              newDate.setHours(h, m);
                              update(
                                "registration_deadline",
                                newDate.toISOString(),
                              );
                            }
                          }}
                        />
                      </div>
                    )}
                  </PopoverContent>
                </Popover>
                {deadlineDate && (
                  <Button
                    variant="link"
                    size="sm"
                    className="h-auto p-0 text-xs text-muted-foreground mt-1"
                    onClick={() => update("registration_deadline", "")}
                  >
                    Clear deadline
                  </Button>
                )}
              </div>

              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <Label className="text-sm">Allow late registration</Label>
                    <p className="text-xs text-muted-foreground">
                      Accept registrations after the deadline
                    </p>
                  </div>
                  <Switch
                    checked={form.allow_late_registration}
                    onCheckedChange={(v) =>
                      update("allow_late_registration", v)
                    }
                  />
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <Label className="text-sm">
                      Show registered list publicly
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Attendees can see who else is registered
                    </p>
                  </div>
                  <Switch
                    checked={form.show_registered_list}
                    onCheckedChange={(v) => update("show_registered_list", v)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Default Form Fields */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium">
                Default Registration Fields
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Toggle which default fields appear on the registration form.
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between rounded-lg border p-3 bg-muted/30">
                <div className="flex items-center gap-2 flex-wrap">
                  <Label className="text-sm">Full Name</Label>
                  <Badge
                    variant="destructive"
                    className="text-[10px] px-1.5 py-0 h-4"
                  >
                    Required
                  </Badge>
                </div>
                <Switch
                  checked={true}
                  disabled={true}
                  onCheckedChange={() => {}}
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Label className="text-sm">Phone Number</Label>
                    {form.show_phone_field && (
                      <Badge
                        variant="destructive"
                        className="text-[10px] px-1.5 py-0 h-4"
                      >
                        Required
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Show phone number field on registration form
                    {isFreeEvent && !form.show_email_field && (
                      <span className="block text-amber-500 font-medium mt-0.5">
                        Free event এ এটি বন্ধ করা যাবে না
                      </span>
                    )}
                  </p>
                </div>
                <Switch
                  checked={form.show_phone_field}
                  disabled={isFreeEvent && !form.show_email_field}
                  onCheckedChange={handlePhoneToggle}
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Label className="text-sm">Email Address</Label>
                    {form.show_email_field && (
                      <Badge
                        variant="destructive"
                        className="text-[10px] px-1.5 py-0 h-4"
                      >
                        Required
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Show email field on registration form
                    {isFreeEvent && !form.show_phone_field && (
                      <span className="block text-amber-500 font-medium mt-0.5">
                        Free event এ এটি বন্ধ করা যাবে না
                      </span>
                    )}
                  </p>
                </div>
                <Switch
                  checked={form.show_email_field}
                  disabled={isFreeEvent && !form.show_phone_field}
                  onCheckedChange={handleEmailToggle}
                />
              </div>

              {isFreeEvent && (
                <p className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md px-3 py-2">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  Free event এ phone অথবা email এর অন্তত একটি চালু রাখতে হবে।
                </p>
              )}
            </CardContent>
          </Card>

          {/* Payment Info */}
          <Card className={cn(isFreeEvent && "opacity-50 pointer-events-none")}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                Payment Information
                {isFreeEvent && (
                  <Badge variant="secondary" className="text-xs font-normal">
                    Free event — N/A
                  </Badge>
                )}
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                {isFreeEvent
                  ? "Payment section is disabled for free events."
                  : "প্রতিটা payment method এর জন্য আলাদা number দিন।"}
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {form.payment_method_entries.length > 0 && (
                <div className="space-y-2">
                  {form.payment_method_entries.map((entry) => (
                    <div key={entry.method} className="flex items-center gap-2">
                      <div className="flex items-center justify-center min-w-[64px] h-9 rounded-md bg-primary/10 text-primary text-xs font-bold border border-primary/20">
                        {entry.method}
                      </div>
                      <Input
                        placeholder={`${entry.method} number`}
                        value={entry.number}
                        onChange={(e) =>
                          updatePaymentNumber(entry.method, e.target.value)
                        }
                        className="flex-1 h-9 text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => removePaymentMethod(entry.method)}
                        className="h-9 w-9 flex items-center justify-center rounded-md border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors shrink-0"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {availableToAdd.length > 0 && (
                <div>
                  <Label className="text-xs text-muted-foreground mb-2 block">
                    Payment Method যোগ করুন
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {availableToAdd.map((method) => (
                      <Button
                        key={method}
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={isFreeEvent}
                        onClick={() => addPaymentMethod(method)}
                        className="gap-1"
                      >
                        <Plus className="h-3 w-3" /> {method}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <Label htmlFor="payment-instruction">
                  Payment Instructions
                </Label>
                <p className="text-xs text-muted-foreground mb-1">
                  Auto-generated based on your selections. You can edit it.
                </p>
                <textarea
                  id="payment-instruction"
                  placeholder={
                    isFreeEvent
                      ? "Not applicable for free events."
                      : "Payment method ও number দিলে auto-generate হবে।"
                  }
                  value={isFreeEvent ? "" : form.payment_instruction}
                  disabled={isFreeEvent}
                  onChange={(e) =>
                    update("payment_instruction", e.target.value)
                  }
                  className="mt-1 flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 min-h-[80px] resize-y disabled:cursor-not-allowed"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <Label className="text-sm">Require Transaction ID</Label>
                    <p className="text-xs text-muted-foreground">
                      Ask registrants to provide payment transaction ID
                    </p>
                  </div>
                  <Switch
                    checked={!isFreeEvent && form.require_transaction_id}
                    disabled={isFreeEvent}
                    onCheckedChange={(v) => {
                      if (!v) {
                        setShowTrxWarning(true);
                      } else {
                        setShowTrxWarning(false);
                        update("require_transaction_id", true);
                      }
                    }}
                  />
                </div>

                {showTrxWarning && (
                  <div className="rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/20 p-3 space-y-2">
                    <p className="text-xs text-amber-800 dark:text-amber-300 flex items-start gap-1.5">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                      Transaction ID বন্ধ করলে payment verify করা কঠিন হবে।
                      নিশ্চিতভাবে বন্ধ করতে চান?
                    </p>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        className="h-7 text-xs"
                        onClick={() => {
                          update("require_transaction_id", false);
                          setShowTrxWarning(false);
                        }}
                      >
                        হ্যাঁ, বন্ধ করুন
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() => setShowTrxWarning(false)}
                      >
                        না, চালু রাখুন
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Instructions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium">
                Instructions & Rules
              </CardTitle>
            </CardHeader>
            <CardContent>
              <TiptapEditor
                key={`instructions-${editorKey}`}
                content={form.instructions}
                onChange={(html) => update("instructions", html)}
                placeholder="Add any rules, guidelines, or instructions for attendees..."
              />
            </CardContent>
          </Card>

          {/* Custom Fields */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-medium">
                  Custom Registration Fields
                </CardTitle>
                {customFields.length > 0 && (
                  <Badge variant="secondary" className="text-xs font-normal">
                    {customFields.length} field
                    {customFields.length > 1 ? "s" : ""}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Registration form এ extra fields যোগ করুন।
              </p>
            </CardHeader>
            <CardContent>
              <CustomFieldsBuilder
                fields={customFields}
                onChange={setCustomFields}
              />
            </CardContent>
          </Card>

          {/* Mobile Preview */}
          {showPreview && isMobile && (
            <EventPreview
              title={form.title}
              description={form.description}
              banner_url={form.banner_url}
              venue={form.venue}
              organizer_contact_email={form.organizer_contact_email}
              organizer_contact_phone={form.organizer_contact_phone}
              price={form.price}
              registration_deadline={form.registration_deadline}
              instructions={form.instructions}
              show_phone_field={form.show_phone_field}
              show_email_field={form.show_email_field}
              seat_limit={form.seat_limit}
              payment_methods={form.payment_method_entries.map((e) => e.method)}
              payment_number={form.payment_method_entries[0]?.number || ""}
              payment_instruction={form.payment_instruction}
              custom_fields={customFields}
            />
          )}
        </div>

        {/* Desktop Preview */}
        {showPreview && !isMobile && (
          <aside className="w-[380px] shrink-0 sticky top-16 self-start">
            <EventPreview
              title={form.title}
              description={form.description}
              banner_url={form.banner_url}
              venue={form.venue}
              organizer_contact_email={form.organizer_contact_email}
              organizer_contact_phone={form.organizer_contact_phone}
              price={form.price}
              registration_deadline={form.registration_deadline}
              instructions={form.instructions}
              show_phone_field={form.show_phone_field}
              show_email_field={form.show_email_field}
              seat_limit={form.seat_limit}
              payment_methods={form.payment_method_entries.map((e) => e.method)}
              payment_number={form.payment_method_entries[0]?.number || ""}
              payment_instruction={form.payment_instruction}
              custom_fields={customFields}
            />
          </aside>
        )}
      </div>
    </div>
  );
};

export default EventForm;
