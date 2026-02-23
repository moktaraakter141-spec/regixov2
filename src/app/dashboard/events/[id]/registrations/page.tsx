"use client";

import { useState, useMemo, Fragment } from "react";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import {
  useEvent,
  useEventRegistrations,
  useCustomFormFields,
  type Registration,
} from "@/hooks/useEvents";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { type LucideIcon } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Search,
  Download,
  CheckCircle,
  XCircle,
  Clock,
  MoreVertical,
  Users,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Plus,
  AlertTriangle,
  Star,
  FileText,
  TrendingUp,
  Hash,
} from "lucide-react";

type ExtendedRegistration = Registration & {
  rejection_reason?: string | null;
  tag?: string | null;
  custom_fields?: Record<string, any> | null;
};

const statusConfig: Record<
  string,
  { label: string; class: string; icon: LucideIcon }
> = {
  pending: {
    label: "Pending",
    class:
      "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
    icon: Clock,
  },
  approved: {
    label: "Approved",
    class:
      "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
    icon: CheckCircle,
  },
  rejected: {
    label: "Rejected",
    class: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    icon: XCircle,
  },
};

const TAG_OPTIONS = [
  { value: "none", label: "No Tag" },
  { value: "special_guest", label: "Special Guest" },
  { value: "organizer", label: "Organizer" },
  { value: "vip", label: "VIP" },
];

const renderCustomValue = (value: any): string => {
  if (value === null || value === undefined || value === "") return "—";
  if (Array.isArray(value)) return value.filter(Boolean).join(", ") || "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
};

const EventRegistrations = () => {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: event, isLoading: eventLoading } = useEvent(id || "");
  const { data: registrations, isLoading: regsLoading } = useEventRegistrations(
    id || "",
  );
  const { data: customFieldDefs } = useCustomFormFields(id || "");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const pageSize = 20;

  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<{
    ids: string[];
    bulk: boolean;
  }>({ ids: [], bulk: false });
  const [rejectionReason, setRejectionReason] = useState("");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addForm, setAddForm] = useState({
    name: "",
    phone: "",
    email: "",
    transaction_id: "",
    status: "approved",
  });

  const extRegs = (registrations || []) as ExtendedRegistration[];

  const filtered = useMemo(
    () =>
      extRegs.filter((r) => {
        const q = search.toLowerCase();
        const customFieldMatch = (() => {
          if (!search || !r.custom_fields) return false;
          return Object.values(r.custom_fields).some((val) => {
            if (val === null || val === undefined) return false;
            if (Array.isArray(val))
              return val.some((v) => String(v).toLowerCase().includes(q));
            return String(val).toLowerCase().includes(q);
          });
        })();
        const matchesSearch =
          !search ||
          r.name.toLowerCase().includes(q) ||
          r.email?.toLowerCase().includes(q) ||
          r.phone?.toLowerCase().includes(q) ||
          r.registration_number?.toLowerCase().includes(q) ||
          r.transaction_id?.toLowerCase().includes(q) ||
          customFieldMatch;
        return (
          matchesSearch && (statusFilter === "all" || r.status === statusFilter)
        );
      }),
    [extRegs, search, statusFilter],
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginatedRows = useMemo(
    () => filtered.slice((safePage - 1) * pageSize, safePage * pageSize),
    [filtered, safePage],
  );

  const counts = useMemo(
    () => ({
      total: extRegs.length,
      pending: extRegs.filter((r) => r.status === "pending").length,
      approved: extRegs.filter((r) => r.status === "approved").length,
      rejected: extRegs.filter((r) => r.status === "rejected").length,
    }),
    [extRegs],
  );

  const duplicateTrxIds = useMemo(() => {
    const trxMap: Record<string, string[]> = {};
    extRegs.forEach((r) => {
      if (r.transaction_id?.trim()) {
        const key = r.transaction_id.trim().toLowerCase();
        if (!trxMap[key]) trxMap[key] = [];
        trxMap[key].push(r.id);
      }
    });
    const dupes = new Set<string>();
    Object.values(trxMap).forEach((ids) => {
      if (ids.length > 1) ids.forEach((id) => dupes.add(id));
    });
    return dupes;
  }, [extRegs]);

  const amountData = useMemo(() => {
    const price = Number(event?.price) || 0;
    if (price === 0) return null;
    return {
      price,
      totalCollected: counts.approved * price,
      totalExpected: counts.total * price,
    };
  }, [event, counts]);

  const updateStatusMutation = useMutation({
    mutationFn: async ({
      ids,
      status,
      rejection_reason,
    }: {
      ids: string[];
      status: string;
      rejection_reason?: string;
    }) => {
      const updateData: any = { status };
      if (status === "rejected" && rejection_reason)
        updateData.rejection_reason = rejection_reason;
      if (status !== "rejected") updateData.rejection_reason = null;
      const { error } = await supabase
        .from("registrations")
        .update(updateData)
        .in("id", ids);
      if (error) throw error;
    },
    onSuccess: (_, { ids, status }) => {
      queryClient.invalidateQueries({ queryKey: ["registrations", id] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      queryClient.invalidateQueries({ queryKey: ["event-reg-counts"] });
      toast({ title: `${ids.length} registration(s) ${status}` });
      setSelected(new Set());
    },
    onError: () => toast({ title: "Failed to update", variant: "destructive" }),
  });

  const updateTagMutation = useMutation({
    mutationFn: async ({ regId, tag }: { regId: string; tag: string }) => {
      const { error } = await supabase
        .from("registrations")
        .update({ tag: tag === "none" ? null : tag || null })
        .eq("id", regId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["registrations", id] });
      toast({ title: "Tag updated" });
    },
  });

  const addRegistrantMutation = useMutation({
    mutationFn: async () => {
      if (!event || !addForm.name.trim()) throw new Error("Name required");
      const regNumber = `REG-${Date.now().toString(36).toUpperCase()}`;
      const { error } = await supabase.from("registrations").insert({
        event_id: event.id,
        name: addForm.name.trim(),
        phone: addForm.phone || null,
        email: addForm.email || null,
        transaction_id: addForm.transaction_id || null,
        registration_number: regNumber,
        status: addForm.status,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["registrations", id] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      queryClient.invalidateQueries({ queryKey: ["event-reg-counts"] });
      toast({ title: "Registrant added" });
      setAddDialogOpen(false);
      setAddForm({
        name: "",
        phone: "",
        email: "",
        transaction_id: "",
        status: "approved",
      });
    },
    onError: (err: any) =>
      toast({
        title: "Failed to add",
        description: err.message,
        variant: "destructive",
      }),
  });

  const handleRejectConfirm = () => {
    updateStatusMutation.mutate({
      ids: rejectTarget.ids,
      status: "rejected",
      rejection_reason: rejectionReason,
    });
    setRejectDialogOpen(false);
    setRejectionReason("");
  };

  const openRejectDialog = (ids: string[]) => {
    setRejectTarget({ ids, bulk: ids.length > 1 });
    setRejectionReason("");
    setRejectDialogOpen(true);
  };

  const handleSelect = (regId: string, checked: boolean) => {
    const next = new Set(selected);
    if (checked) next.add(regId);
    else next.delete(regId);
    setSelected(next);
  };

  const stopEnter = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") e.preventDefault();
  };

  const exportCSV = () => {
    if (!filtered.length) return;
    const customHeaders = (customFieldDefs || []).map((f) => f.field_name);
    const headers = [
      "Registration #",
      "Name",
      "Email",
      "Phone",
      "Status",
      "Transaction ID",
      "Tag",
      "Rejection Reason",
      "Registered At",
      ...customHeaders,
    ];
    const rows = filtered.map((r) => {
      const customValues = (customFieldDefs || []).map((field) =>
        renderCustomValue(
          (r as ExtendedRegistration).custom_fields?.[field.id],
        ),
      );
      return [
        r.registration_number || "",
        r.name,
        r.email || "",
        r.phone || "",
        r.status,
        r.transaction_id || "",
        (r as ExtendedRegistration).tag || "",
        (r as ExtendedRegistration).rejection_reason || "",
        new Date(r.created_at).toLocaleString(),
        ...customValues,
      ];
    });
    const csv = [headers, ...rows]
      .map((row) =>
        row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","),
      )
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${event?.title || "registrations"}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (eventLoading || regsLoading)
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );

  if (!event)
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Event not found</p>
        <Button variant="outline" onClick={() => router.push("/dashboard")}>
          Back to Dashboard
        </Button>
      </div>
    );

  const hasCustomFields = (customFieldDefs || []).length > 0;

  const ActionMenu = ({ reg }: { reg: ExtendedRegistration }) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {reg.status !== "approved" && (
          <DropdownMenuItem
            onClick={() =>
              updateStatusMutation.mutate({ ids: [reg.id], status: "approved" })
            }
          >
            <CheckCircle className="mr-2 h-4 w-4 text-emerald-600" /> Approve
          </DropdownMenuItem>
        )}
        {reg.status !== "rejected" && (
          <DropdownMenuItem onClick={() => openRejectDialog([reg.id])}>
            <XCircle className="mr-2 h-4 w-4 text-red-600" /> Reject
          </DropdownMenuItem>
        )}
        {reg.status !== "pending" && (
          <DropdownMenuItem
            onClick={() =>
              updateStatusMutation.mutate({ ids: [reg.id], status: "pending" })
            }
          >
            <Clock className="mr-2 h-4 w-4" /> Set Pending
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const CustomFieldsPanel = ({ reg }: { reg: ExtendedRegistration }) => {
    if (!hasCustomFields || !reg.custom_fields) return null;
    const entries = (customFieldDefs || [])
      .map((field) => ({
        name: field.field_name,
        value: renderCustomValue(reg.custom_fields?.[field.id]),
      }))
      .filter((e) => e.value !== "—");
    if (entries.length === 0) return null;
    return (
      <div className="space-y-1">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          Custom Fields
        </p>
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {entries.map((e) => (
            <div key={e.name} className="text-xs">
              <span className="text-muted-foreground">{e.name}: </span>
              <span className="font-medium">{e.value}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // বাকি JSX হুবহু একই থাকবে, শুধু navigate() → router.push() বদলাতে হবে
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4">
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0"
            onClick={() => router.push("/dashboard")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-semibold truncate">{event.title}</h1>
            <p className="text-xs text-muted-foreground">
              Registration Management
            </p>
          </div>
          <Button
            size="sm"
            className="shrink-0 sm:hidden"
            onClick={() => setAddDialogOpen(true)}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-5 space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {[
            {
              label: "Total",
              value: counts.total,
              icon: Users,
              accent: "bg-blue-50 dark:bg-blue-950/30",
              iconColor: "text-blue-500",
            },
            {
              label: "Pending",
              value: counts.pending,
              icon: Clock,
              accent: "bg-amber-50 dark:bg-amber-950/30",
              iconColor: "text-amber-500",
            },
            {
              label: "Approved",
              value: counts.approved,
              icon: CheckCircle,
              accent: "bg-emerald-50 dark:bg-emerald-950/30",
              iconColor: "text-emerald-500",
            },
            {
              label: "Rejected",
              value: counts.rejected,
              icon: XCircle,
              accent: "bg-red-50 dark:bg-red-950/30",
              iconColor: "text-red-500",
            },
          ].map((s) => (
            <div
              key={s.label}
              className={`rounded-xl border p-3.5 ${s.accent}`}
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-muted-foreground">
                  {s.label}
                </p>
                <s.icon className={`h-3.5 w-3.5 ${s.iconColor}`} />
              </div>
              <p className="text-2xl font-bold tracking-tight">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Seats + Revenue */}
        <div className="flex flex-wrap gap-2.5">
          {event.seat_limit && event.seat_limit > 0 && (
            <div className="flex-1 min-w-[140px] rounded-xl border bg-muted/30 p-3.5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-muted-foreground">
                  Seats Left
                </p>
                <Users className="h-3.5 w-3.5 text-primary" />
              </div>
              <p className="text-2xl font-bold tracking-tight">
                {Math.max(
                  0,
                  event.seat_limit - (counts.pending + counts.approved),
                )}
                <span className="text-sm font-normal text-muted-foreground ml-1">
                  / {event.seat_limit}
                </span>
              </p>
            </div>
          )}
          {amountData && (
            <div className="flex-[2] min-w-[200px] rounded-xl border bg-muted/30 p-3.5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-muted-foreground">
                  Revenue
                </p>
                <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
              </div>
              <div className="flex items-end gap-4 flex-wrap">
                <div>
                  <p className="text-[10px] text-muted-foreground">Collected</p>
                  <p className="text-xl font-bold text-emerald-600">
                    ৳{amountData.totalCollected.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Expected</p>
                  <p className="text-lg font-semibold">
                    ৳{amountData.totalExpected.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">
                    Per Ticket
                  </p>
                  <p className="text-sm text-muted-foreground">
                    ৳{amountData.price}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search name, email, phone, trxId, custom fields..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9 h-10"
          />
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-2">
          <Select
            value={statusFilter}
            onValueChange={(v) => {
              setStatusFilter(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[110px] h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2 ml-auto">
            {filtered.length > 0 && (
              <div
                className="flex items-center gap-1.5 px-1 cursor-pointer"
                onClick={() => {
                  if (selected.size === filtered.length) {
                    setSelected(new Set());
                  } else {
                    setSelected(new Set(filtered.map((r) => r.id)));
                  }
                }}
              >
                <Checkbox
                  checked={
                    selected.size === filtered.length && filtered.length > 0
                  }
                  className="pointer-events-none"
                />
                <span className="text-xs text-muted-foreground">
                  {filtered.length}
                </span>
              </div>
            )}
            {selected.size > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" className="h-9">
                    <CheckCircle className="mr-1.5 h-3.5 w-3.5" /> Actions (
                    {selected.size})
                    <ChevronDown className="ml-1 h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem
                    onClick={() =>
                      updateStatusMutation.mutate({
                        ids: [...selected],
                        status: "approved",
                      })
                    }
                  >
                    <CheckCircle className="mr-2 h-4 w-4 text-emerald-600" />{" "}
                    Approve all
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => openRejectDialog([...selected])}
                  >
                    <XCircle className="mr-2 h-4 w-4 text-red-600" /> Reject all
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <Button
              variant="outline"
              size="sm"
              className="h-9 hidden sm:flex"
              onClick={() => setAddDialogOpen(true)}
            >
              <Plus className="mr-1 h-4 w-4" /> Add
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-9">
                  <Download className="h-4 w-4 sm:mr-1" />
                  <span className="hidden sm:inline">Export</span>
                  <ChevronDown className="ml-1 h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem
                  onClick={exportCSV}
                  disabled={!filtered.length}
                >
                  <FileText className="mr-2 h-4 w-4" /> Export CSV
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {duplicateTrxIds.size > 0 && (
          <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 px-4 py-3">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800 dark:text-amber-300">
              <strong>{duplicateTrxIds.size}</strong> registrations have
              duplicate transaction IDs.
            </p>
          </div>
        )}

        {/* Mobile Cards */}
        <div className="sm:hidden space-y-1.5">
          {paginatedRows.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground text-sm rounded-xl border bg-muted/20">
              {extRegs.length === 0
                ? "No registrations yet"
                : "No results match your filters"}
            </div>
          ) : (
            paginatedRows.map((reg) => {
              const sc = statusConfig[reg.status] || statusConfig.pending;
              const isDupe = duplicateTrxIds.has(reg.id);
              const isOpen = expandedCard === reg.id;
              return (
                <div
                  key={reg.id}
                  className={`rounded-xl border overflow-hidden transition-colors ${selected.has(reg.id) ? "border-primary/50 bg-primary/5" : "bg-card"} ${isDupe ? "border-amber-300" : ""}`}
                >
                  <div
                    className="flex items-center gap-2.5 px-3.5 py-3 cursor-pointer select-none"
                    onClick={() => setExpandedCard(isOpen ? null : reg.id)}
                  >
                    <div onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selected.has(reg.id)}
                        onCheckedChange={(checked) =>
                          handleSelect(reg.id, !!checked)
                        }
                      />
                    </div>
                    <div className="flex items-center gap-1 min-w-0 flex-1">
                      <Hash className="h-3 w-3 text-muted-foreground shrink-0" />
                      <span
                        className={`text-xs font-mono truncate ${isDupe ? "text-amber-600 font-semibold" : "text-muted-foreground"}`}
                      >
                        {reg.transaction_id || "No TrxID"}
                        {isDupe && " ⚠️"}
                      </span>
                    </div>
                    <span className="font-medium text-sm truncate max-w-[100px] shrink-0">
                      {reg.name}
                    </span>
                    <Badge
                      variant="secondary"
                      className={`${sc.class} text-xs shrink-0`}
                    >
                      {sc.label}
                    </Badge>
                    <div
                      className="flex items-center gap-1 shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {reg.status !== "approved" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() =>
                            updateStatusMutation.mutate({
                              ids: [reg.id],
                              status: "approved",
                            })
                          }
                        >
                          <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                        </Button>
                      )}
                      {reg.status !== "rejected" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => openRejectDialog([reg.id])}
                        >
                          <XCircle className="h-3.5 w-3.5 text-red-500" />
                        </Button>
                      )}
                    </div>
                    <ChevronDown
                      className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                    />
                  </div>
                  {isOpen && (
                    <div className="border-t bg-muted/20 px-3.5 pb-3.5 pt-3 space-y-3">
                      <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-xs">
                        {reg.email && (
                          <div className="col-span-2">
                            <span className="text-muted-foreground">
                              Email{" "}
                            </span>
                            <span className="break-all">{reg.email}</span>
                          </div>
                        )}
                        {reg.phone && (
                          <div>
                            <span className="text-muted-foreground">
                              Phone{" "}
                            </span>
                            <span>{reg.phone}</span>
                          </div>
                        )}
                        <div>
                          <span className="text-muted-foreground">Date </span>
                          <span>
                            {new Date(reg.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-muted-foreground">Reg# </span>
                          <span className="font-mono">
                            {reg.registration_number || "—"}
                          </span>
                        </div>
                      </div>
                      {reg.rejection_reason && reg.status === "rejected" && (
                        <p className="text-xs text-destructive border-l-2 border-destructive pl-2 py-0.5">
                          {reg.rejection_reason}
                        </p>
                      )}
                      <CustomFieldsPanel reg={reg} />
                      <div className="flex items-center gap-2">
                        <Select
                          value={reg.tag || "none"}
                          onValueChange={(val) =>
                            updateTagMutation.mutate({
                              regId: reg.id,
                              tag: val,
                            })
                          }
                        >
                          <SelectTrigger className="h-7 flex-1 text-xs">
                            <SelectValue placeholder="No tag" />
                          </SelectTrigger>
                          <SelectContent>
                            {TAG_OPTIONS.map((t) => (
                              <SelectItem key={t.value} value={t.value}>
                                {t.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <ActionMenu reg={reg} />
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Desktop Table */}
        <div className="hidden sm:block rounded-xl border overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="w-10">
                    <Checkbox
                      checked={
                        filtered.length > 0 &&
                        filtered.every((r) => selected.has(r.id))
                      }
                      onCheckedChange={(checked) =>
                        setSelected(
                          checked
                            ? new Set(filtered.map((r) => r.id))
                            : new Set(),
                        )
                      }
                    />
                  </TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wide text-foreground">
                    TrxID
                  </TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wide text-foreground">
                    Name
                  </TableHead>
                  <TableHead className="hidden md:table-cell font-semibold text-xs uppercase tracking-wide text-foreground">
                    Email
                  </TableHead>
                  <TableHead className="hidden lg:table-cell font-semibold text-xs uppercase tracking-wide text-foreground">
                    Phone
                  </TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wide text-foreground">
                    Status
                  </TableHead>
                  <TableHead className="hidden xl:table-cell font-semibold text-xs uppercase tracking-wide text-foreground">
                    Reg #
                  </TableHead>
                  <TableHead className="hidden lg:table-cell font-semibold text-xs uppercase tracking-wide text-foreground">
                    Tag
                  </TableHead>
                  <TableHead className="hidden md:table-cell font-semibold text-xs uppercase tracking-wide text-foreground">
                    Date
                  </TableHead>
                  {hasCustomFields && <TableHead className="w-8"></TableHead>}
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedRows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={hasCustomFields ? 11 : 10}
                      className="text-center py-16 text-muted-foreground"
                    >
                      {extRegs.length === 0
                        ? "No registrations yet"
                        : "No results match your filters"}
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedRows.map((reg) => {
                    const sc = statusConfig[reg.status] || statusConfig.pending;
                    const isDupe = duplicateTrxIds.has(reg.id);
                    const isExpanded = expandedRow === reg.id;
                    const hasRegCustomFields =
                      hasCustomFields &&
                      reg.custom_fields &&
                      (customFieldDefs || []).some((f) => {
                        const v = reg.custom_fields?.[f.id];
                        return v !== null && v !== undefined && v !== "";
                      });
                    return (
                      <Fragment key={reg.id}>
                        <TableRow
                          className={`transition-colors ${isDupe ? "bg-amber-50/60 dark:bg-amber-950/10" : ""} ${selected.has(reg.id) ? "bg-primary/5" : ""} ${hasRegCustomFields ? "cursor-pointer" : ""}`}
                          onClick={() =>
                            hasRegCustomFields &&
                            setExpandedRow(isExpanded ? null : reg.id)
                          }
                        >
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={selected.has(reg.id)}
                              onCheckedChange={(c) => handleSelect(reg.id, !!c)}
                            />
                          </TableCell>
                          <TableCell className="max-w-[140px]">
                            <span
                              className={`truncate block font-mono text-xs ${isDupe ? "text-amber-600 font-semibold" : "text-muted-foreground"}`}
                            >
                              {reg.transaction_id || "—"}
                              {isDupe && " ⚠️"}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              <span className="font-medium text-sm">
                                {reg.name}
                              </span>
                              {reg.tag && (
                                <Badge
                                  variant="outline"
                                  className="text-[9px] px-1.5 py-0 h-4"
                                >
                                  <Star className="h-2.5 w-2.5 mr-0.5" />
                                  {TAG_OPTIONS.find((t) => t.value === reg.tag)
                                    ?.label || reg.tag}
                                </Badge>
                              )}
                            </div>
                            {reg.rejection_reason &&
                              reg.status === "rejected" && (
                                <p className="text-[10px] text-destructive mt-0.5 truncate max-w-[160px]">
                                  {reg.rejection_reason}
                                </p>
                              )}
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                            {reg.email || "—"}
                          </TableCell>
                          <TableCell className="hidden lg:table-cell text-muted-foreground text-sm">
                            {reg.phone || "—"}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="secondary"
                              className={`${sc.class} text-xs`}
                            >
                              {sc.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden xl:table-cell font-mono text-xs text-muted-foreground">
                            {reg.registration_number || "—"}
                          </TableCell>
                          <TableCell
                            className="hidden lg:table-cell"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Select
                              value={reg.tag || "none"}
                              onValueChange={(val) =>
                                updateTagMutation.mutate({
                                  regId: reg.id,
                                  tag: val,
                                })
                              }
                            >
                              <SelectTrigger className="h-7 w-[110px] text-xs">
                                <SelectValue placeholder="No tag" />
                              </SelectTrigger>
                              <SelectContent>
                                {TAG_OPTIONS.map((t) => (
                                  <SelectItem key={t.value} value={t.value}>
                                    {t.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                            {new Date(reg.created_at).toLocaleDateString()}
                          </TableCell>
                          {hasCustomFields && (
                            <TableCell onClick={(e) => e.stopPropagation()}>
                              {hasRegCustomFields && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() =>
                                    setExpandedRow(isExpanded ? null : reg.id)
                                  }
                                >
                                  <ChevronDown
                                    className={`h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
                                  />
                                </Button>
                              )}
                            </TableCell>
                          )}
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <ActionMenu reg={reg} />
                          </TableCell>
                        </TableRow>
                        {isExpanded && hasRegCustomFields && (
                          <TableRow className="bg-muted/20 hover:bg-muted/20">
                            <TableCell
                              colSpan={hasCustomFields ? 11 : 10}
                              className="py-3 px-6"
                            >
                              <CustomFieldsPanel reg={reg} />
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
          {filtered.length > pageSize && (
            <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/20">
              <p className="text-xs text-muted-foreground">
                {(safePage - 1) * pageSize + 1}–
                {Math.min(safePage * pageSize, filtered.length)} of{" "}
                {filtered.length}
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  disabled={safePage <= 1}
                  onClick={() => setPage(safePage - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(
                    (p) =>
                      p === 1 ||
                      p === totalPages ||
                      Math.abs(p - safePage) <= 1,
                  )
                  .reduce<(number | "...")[]>((acc, p, idx, arr) => {
                    if (idx > 0 && p - (arr[idx - 1] as number) > 1)
                      acc.push("...");
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((p, i) =>
                    p === "..." ? (
                      <span
                        key={`e-${i}`}
                        className="px-1 text-xs text-muted-foreground"
                      >
                        …
                      </span>
                    ) : (
                      <Button
                        key={p}
                        variant={p === safePage ? "default" : "outline"}
                        size="icon"
                        className="h-8 w-8 text-xs"
                        onClick={() => setPage(p as number)}
                      >
                        {p}
                      </Button>
                    ),
                  )}
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  disabled={safePage >= totalPages}
                  onClick={() => setPage(safePage + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>

        {filtered.length > pageSize && (
          <div className="flex sm:hidden items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {(safePage - 1) * pageSize + 1}–
              {Math.min(safePage * pageSize, filtered.length)} of{" "}
              {filtered.length}
            </p>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                disabled={safePage <= 1}
                onClick={() => setPage(safePage - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                disabled={safePage >= totalPages}
                onClick={() => setPage(safePage + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </main>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="sm:max-w-md" onKeyDown={stopEnter}>
          <DialogHeader>
            <DialogTitle>
              Reject Registration{rejectTarget.ids.length > 1 ? "s" : ""}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Label>Reason for rejection (optional)</Label>
            <Textarea
              placeholder="e.g. Invalid transaction ID, duplicate entry..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              onKeyDown={(e) => e.stopPropagation()}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setRejectDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleRejectConfirm}
            >
              Reject
              {rejectTarget.ids.length > 1
                ? ` (${rejectTarget.ids.length})`
                : ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-md" onKeyDown={stopEnter}>
          <DialogHeader>
            <DialogTitle>Add Registrant Manually</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Name *</Label>
              <Input
                value={addForm.name}
                onChange={(e) =>
                  setAddForm((p) => ({ ...p, name: e.target.value }))
                }
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Phone</Label>
                <Input
                  value={addForm.phone}
                  onChange={(e) =>
                    setAddForm((p) => ({ ...p, phone: e.target.value }))
                  }
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  type="text"
                  inputMode="email"
                  autoComplete="email"
                  value={addForm.email}
                  onChange={(e) =>
                    setAddForm((p) => ({ ...p, email: e.target.value }))
                  }
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <Label>Status</Label>
              <Select
                value={addForm.status}
                onValueChange={(v) => setAddForm((p) => ({ ...p, status: v }))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Transaction ID</Label>
              <Input
                value={addForm.transaction_id}
                onChange={(e) =>
                  setAddForm((p) => ({ ...p, transaction_id: e.target.value }))
                }
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setAddDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => addRegistrantMutation.mutate()}
              disabled={addRegistrantMutation.isPending}
            >
              {addRegistrantMutation.isPending ? "Adding..." : "Add Registrant"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EventRegistrations;
