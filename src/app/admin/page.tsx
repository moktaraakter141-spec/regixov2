"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Shield,
  Users,
  CalendarDays,
  BarChart3,
  Settings,
  FileText,
  Menu,
  Moon,
  Sun,
  Search,
  MoreVertical,
  Download,
  Trash2,
  Plus,
  Ban,
  CheckCircle,
  ShieldCheck,
  ShieldOff,
  TrendingUp,
  ClipboardList,
  Clock,
  AlertCircle,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";
import { useTheme } from "next-themes";
import { Sidebar } from "@/components/Sidebar";
import CustomFieldsBuilder, {
  type CustomField,
} from "@/components/events/CustomFieldsBuilder";
import { cn } from "@/lib/utils";

// ─── Constants ────────────────────────────────────────────────────────────────

const ADMIN_NAV_ITEMS = [
  { icon: BarChart3, label: "Overview", tab: "overview" },
  { icon: Users, label: "Users", tab: "users" },
  { icon: Settings, label: "Site Settings", tab: "settings" },
  { icon: FileText, label: "Templates", tab: "templates" },
];

const PIE_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--success))",
  "hsl(var(--destructive))",
  "hsl(var(--warning))",
  "hsl(var(--muted-foreground))",
];

const PAYMENT_METHODS = ["bKash", "Nagad", "Rocket", "Upay"];

// ─── Types ────────────────────────────────────────────────────────────────────

interface PaymentMethodEntry {
  method: string;
  number: string;
}

// Matches EventForm's FormState (minus event-only fields)
interface TemplateForm {
  title: string;
  description: string;
  venue: string;
  organizer_contact_email: string;
  organizer_contact_phone: string;
  price: string;
  seat_limit: string;
  guest_limit: string;
  instructions: string;
  allow_late_registration: boolean;
  show_registered_list: boolean;
  payment_method_entries: PaymentMethodEntry[];
  payment_instruction: string;
  show_phone_field: boolean;
  show_email_field: boolean;
  require_name: boolean;
  require_transaction_id: boolean;
}

const initialTemplateForm: TemplateForm = {
  title: "",
  description: "",
  venue: "",
  organizer_contact_email: "",
  organizer_contact_phone: "",
  price: "",
  seat_limit: "",
  guest_limit: "",
  instructions: "",
  allow_late_registration: false,
  show_registered_list: false,
  payment_method_entries: [],
  payment_instruction: "",
  show_phone_field: true,
  show_email_field: true,
  require_name: true,
  require_transaction_id: true,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildPaymentCompat(entries: PaymentMethodEntry[]) {
  const methods = entries.map((e) => e.method);
  const numberMap: Record<string, string> = {};
  entries.forEach((e) => {
    numberMap[e.method] = e.number;
  });
  return {
    payment_methods: methods,
    payment_number: entries.length > 0 ? JSON.stringify(numberMap) : "",
  };
}

function generateInstruction(entries: PaymentMethodEntry[], price: string) {
  if (entries.length === 0) return "";
  const priceStr = price ? `৳${price}` : "the required amount";
  const lines = entries
    .filter((e) => e.number.trim())
    .map((e) => `${e.method}: ${e.number.trim()}`);
  if (lines.length === 0) return "";
  return `Send ${priceStr} to the respective number below (Send Money). Use your full name as reference.\n${lines.join("\n")}`;
}

// ─── Main Component ───────────────────────────────────────────────────────────

const AdminDashboard = () => {
  const { user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { theme, setTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  // ── Queries ──────────────────────────────────────────────────────────────

  const { data: isAdmin, isLoading: adminLoading } = useQuery({
    queryKey: ["is-admin", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("is_admin");
      if (error) throw error;
      return data as boolean;
    },
    enabled: !!user,
  });

  const { data: adminStats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [
        { count: userCount },
        { count: eventCount },
        { count: regCount },
        { data: regs },
        { data: events },
      ] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("events").select("*", { count: "exact", head: true }),
        supabase
          .from("registrations")
          .select("*", { count: "exact", head: true }),
        supabase.from("registrations").select("status, created_at, event_id"),
        supabase.from("events").select("status, created_at"),
      ]);
      const statusCounts = { pending: 0, approved: 0, rejected: 0 };
      (regs || []).forEach((r) => {
        if (r.status in statusCounts)
          statusCounts[r.status as keyof typeof statusCounts]++;
      });
      const eventStatusCounts = { draft: 0, published: 0, closed: 0 };
      (events || []).forEach((e) => {
        if (e.status in eventStatusCounts)
          eventStatusCounts[e.status as keyof typeof eventStatusCounts]++;
      });
      const now = new Date();
      const trend: Record<string, number> = {};
      for (let i = 29; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        trend[d.toISOString().slice(0, 10)] = 0;
      }
      (regs || []).forEach((r) => {
        const day = r.created_at.slice(0, 10);
        if (day in trend) trend[day]++;
      });
      const trendData = Object.entries(trend).map(([date, count]) => ({
        date: new Date(date).toLocaleDateString("en", {
          month: "short",
          day: "numeric",
        }),
        registrations: count,
      }));
      return {
        totalUsers: userCount || 0,
        totalEvents: eventCount || 0,
        totalRegistrations: regCount || 0,
        statusCounts,
        eventStatusCounts,
        trendData,
      };
    },
    enabled: !!isAdmin,
  });

  const { data: users } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*, max_seat_limit")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!isAdmin,
  });

  const { data: userRoles } = useQuery({
    queryKey: ["admin-user-roles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("*");
      if (error) throw error;
      return data;
    },
    enabled: !!isAdmin,
  });

  const { data: siteSettings } = useQuery({
    queryKey: ["site-settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("site_settings").select("*");
      if (error) throw error;
      return Object.fromEntries((data || []).map((s) => [s.key, s.value]));
    },
    enabled: !!isAdmin,
  });

  const { data: templates } = useQuery({
    queryKey: ["event-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("event_templates")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!isAdmin,
  });

  // ── Local State ──────────────────────────────────────────────────────────

  const [settingsForm, setSettingsForm] = useState<Record<string, string>>({});
  const [userSearch, setUserSearch] = useState("");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [adminConfirmOpen, setAdminConfirmOpen] = useState(false);
  const [adminAction, setAdminAction] = useState<{
    userId: string;
    hasRole: boolean;
  } | null>(null);
  const [suspendDialogOpen, setSuspendDialogOpen] = useState(false);
  const [suspendTarget, setSuspendTarget] = useState<{
    userId: string;
    action: "banned" | "suspended";
  } | null>(null);
  const [suspendDays, setSuspendDays] = useState("7");
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [seatLimitDialogOpen, setSeatLimitDialogOpen] = useState(false);
  const [seatLimitEmail, setSeatLimitEmail] = useState("");
  const [seatLimitValue, setSeatLimitValue] = useState("500");
  const [templateForm, setTemplateForm] =
    useState<TemplateForm>(initialTemplateForm);
  const [templateCustomFields, setTemplateCustomFields] = useState<
    CustomField[]
  >([]);
  const [showTrxWarning, setShowTrxWarning] = useState(false);

  useEffect(() => {
    if (siteSettings)
      setSettingsForm(
        Object.fromEntries(
          Object.entries(siteSettings).map(([k, v]) => [k, v ?? ""]),
        ),
      );
  }, [siteSettings]);

  const updateTemplate = (key: keyof TemplateForm, value: any) =>
    setTemplateForm((prev) => ({ ...prev, [key]: value }));

  const isFreeTemplate =
    !templateForm.price || Number(templateForm.price) === 0;

  const addPaymentMethod = (method: string) => {
    if (templateForm.payment_method_entries.find((e) => e.method === method))
      return;
    const newEntries = [
      ...templateForm.payment_method_entries,
      { method, number: "" },
    ];
    setTemplateForm((prev) => ({
      ...prev,
      payment_method_entries: newEntries,
    }));
  };

  const removePaymentMethod = (method: string) => {
    const newEntries = templateForm.payment_method_entries.filter(
      (e) => e.method !== method,
    );
    setTemplateForm((prev) => ({
      ...prev,
      payment_method_entries: newEntries,
      payment_instruction: generateInstruction(newEntries, prev.price),
    }));
  };

  const updatePaymentNumber = (method: string, number: string) => {
    const newEntries = templateForm.payment_method_entries.map((e) =>
      e.method === method ? { ...e, number } : e,
    );
    setTemplateForm((prev) => ({
      ...prev,
      payment_method_entries: newEntries,
      payment_instruction: generateInstruction(newEntries, prev.price),
    }));
  };

  const closeTemplateDialog = () => {
    setTemplateDialogOpen(false);
    setTemplateForm(initialTemplateForm);
    setTemplateCustomFields([]);
    setShowTrxWarning(false);
  };

  // ── Mutations ────────────────────────────────────────────────────────────

  const updateSettingsMutation = useMutation({
    mutationFn: async () => {
      for (const [key, value] of Object.entries(settingsForm)) {
        const { data: existing } = await supabase
          .from("site_settings")
          .select("id")
          .eq("key", key)
          .maybeSingle();
        if (existing) {
          await supabase.from("site_settings").update({ value }).eq("key", key);
        } else {
          await supabase.from("site_settings").insert({ key, value });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["site-settings"] });
      toast({ title: "Settings saved" });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.functions.invoke("delete-user", {
        body: { userId },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
      setDeleteConfirmOpen(false);
      toast({ title: "User permanently deleted" });
    },
    onError: () => {
      toast({
        title: "Cannot delete — user may have events or registrations",
        variant: "destructive",
      });
    },
  });

  const toggleRoleMutation = useMutation({
    mutationFn: async ({
      userId,
      role,
      hasRole,
    }: {
      userId: string;
      role: "admin" | "organizer";
      hasRole: boolean;
    }) => {
      if (hasRole) {
        const { error } = await supabase
          .from("user_roles")
          .delete()
          .eq("user_id", userId)
          .eq("role", role);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("user_roles")
          .insert({ user_id: userId, role });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-user-roles"] });
      setAdminConfirmOpen(false);
      setAdminAction(null);
      toast({ title: "Role updated" });
    },
  });

  const updateUserStatusMutation = useMutation({
    mutationFn: async ({
      userId,
      status,
    }: {
      userId: string;
      status: string;
    }) => {
      const { error } = await supabase
        .from("profiles")
        .update({
          status,
          ...(status === "suspended" && {
            suspended_until: new Date(
              Date.now() + parseInt(suspendDays) * 86400000,
            ).toISOString(),
          }),
          ...(status !== "suspended" && { suspended_until: null }),
        } as any)
        .eq("id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setSuspendDialogOpen(false);
      setSuspendTarget(null);
      toast({ title: "User status updated" });
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("event_templates")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event-templates"] });
      toast({ title: "Template deleted" });
    },
  });

  const updateSeatLimitMutation = useMutation({
    mutationFn: async ({ email, limit }: { email: string; limit: number }) => {
      if (limit < 1 || limit > 10000)
        throw new Error("Limit must be between 1 and 10000");
      const { data: profile, error: findError } = await supabase
        .from("profiles")
        .select("id")
        .eq("contact_email", email.trim())
        .maybeSingle();
      if (findError) throw findError;
      if (!profile) throw new Error("No user found with this email");
      const { error } = await supabase
        .from("profiles")
        .update({ max_seat_limit: limit } as any)
        .eq("id", profile.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setSeatLimitDialogOpen(false);
      setSeatLimitEmail("");
      setSeatLimitValue("500");
      toast({ title: "Seat limit updated" });
    },
    onError: (e: any) => {
      toast({ title: e.message || "Failed to update", variant: "destructive" });
    },
  });

  const createTemplateMutation = useMutation({
    mutationFn: async () => {
      if (!templateForm.title.trim()) throw new Error("Title required");
      const compat = buildPaymentCompat(templateForm.payment_method_entries);
      const { error } = await supabase.from("event_templates").insert({
        title: templateForm.title.trim(),
        description: templateForm.description || null,
        venue: templateForm.venue || null,
        price: templateForm.price ? parseFloat(templateForm.price) : 0,
        guest_limit: templateForm.guest_limit
          ? parseInt(templateForm.guest_limit)
          : 0,
        seat_limit: templateForm.seat_limit
          ? parseInt(templateForm.seat_limit)
          : null,
        instructions: templateForm.instructions || null,
        allow_late_registration: templateForm.allow_late_registration,
        show_registered_list: templateForm.show_registered_list,
        organizer_contact_email: templateForm.organizer_contact_email || null,
        organizer_contact_phone: templateForm.organizer_contact_phone || null,
        payment_methods:
          compat.payment_methods.length > 0 ? compat.payment_methods : null,
        payment_number: compat.payment_number || null,
        payment_instruction: templateForm.payment_instruction || null,
        require_transaction_id: templateForm.require_transaction_id,
        require_name: templateForm.require_name,
        show_phone_field: templateForm.show_phone_field,
        show_email_field: templateForm.show_email_field,
        custom_fields:
          templateCustomFields.length > 0
            ? templateCustomFields.map((f, i) => ({
                field_name: f.field_name,
                field_type: f.field_type,
                is_required: f.is_required,
                field_options: f.field_options,
                sort_order: i,
              }))
            : null,
        created_by: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event-templates"] });
      closeTemplateDialog();
      toast({ title: "Template created" });
    },
    onError: (e: any) => {
      toast({
        title: e.message || "Failed to create template",
        variant: "destructive",
      });
    },
  });

  // ── Derived ───────────────────────────────────────────────────────────────

  const filteredUsers = useMemo(() => {
    if (!users) return [];
    if (!userSearch) return users;
    const q = userSearch.toLowerCase();
    return users.filter(
      (u) =>
        u.full_name?.toLowerCase().includes(q) ||
        u.contact_email?.toLowerCase().includes(q),
    );
  }, [users, userSearch]);

  const getRoles = (userId: string) =>
    userRoles?.filter((r) => r.user_id === userId).map((r) => r.role) || [];

  const exportUsersCSV = () => {
    if (!filteredUsers.length) return;
    const headers = ["Name", "Email", "Phone", "Roles", "Status", "Created"];
    const rows = filteredUsers.map((u) => [
      u.full_name || "",
      u.contact_email || "",
      u.contact_phone || "",
      getRoles(u.id).join(", "),
      u.status || "active",
      new Date(u.created_at).toLocaleDateString(),
    ]);
    const csv = [headers, ...rows]
      .map((r) => r.map((c) => `"${c}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `users-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const regStatusPieData = adminStats
    ? [
        { name: "Pending", value: adminStats.statusCounts.pending },
        { name: "Approved", value: adminStats.statusCounts.approved },
        { name: "Rejected", value: adminStats.statusCounts.rejected },
      ].filter((d) => d.value > 0)
    : [];

  const eventStatusBarData = adminStats
    ? [
        { name: "Draft", count: adminStats.eventStatusCounts.draft },
        { name: "Published", count: adminStats.eventStatusCounts.published },
        { name: "Closed", count: adminStats.eventStatusCounts.closed },
      ]
    : [];

  const availableToAdd = PAYMENT_METHODS.filter(
    (m) => !templateForm.payment_method_entries.find((e) => e.method === m),
  );

  // ── Guards ────────────────────────────────────────────────────────────────

  if (adminLoading)
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );

  if (!isAdmin)
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background gap-4">
        <Shield className="h-12 w-12 text-muted-foreground" />
        <h1 className="text-xl font-bold">Access Denied</h1>
        <p className="text-muted-foreground">
          You need super admin privileges to access this page.
        </p>
        <Button variant="outline" onClick={() => router.push("/dashboard")}>
          Go to Dashboard
        </Button>
      </div>
    );

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex bg-background">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-foreground/40 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        navItems={ADMIN_NAV_ITEMS}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        title="Admin Panel"
        titleIcon={Shield}
      />

      <div className="flex-1 min-w-0 flex flex-col min-h-screen overflow-y-auto">
        <header className="sticky top-0 z-30 flex items-center h-14 px-4 sm:px-6 border-b bg-background/80 backdrop-blur-sm shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden mr-3 text-muted-foreground hover:text-foreground"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            <h2
              className="text-lg font-semibold"
              style={{ fontFamily: "'DM Serif Display', serif" }}
            >
              {ADMIN_NAV_ITEMS.find((n) => n.tab === activeTab)?.label ||
                "Super Admin"}
            </h2>
          </div>
          <div className="ml-auto">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-5xl w-full space-y-6">
            {/* ===== OVERVIEW ===== */}
            {activeTab === "overview" && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[
                    {
                      icon: Users,
                      label: "Total Users",
                      value: adminStats?.totalUsers ?? 0,
                      bg: "bg-primary/10",
                      color: "text-primary",
                    },
                    {
                      icon: CalendarDays,
                      label: "Total Events",
                      value: adminStats?.totalEvents ?? 0,
                      bg: "bg-accent",
                      color: "text-accent-foreground",
                    },
                    {
                      icon: ClipboardList,
                      label: "Total Registrations",
                      value: adminStats?.totalRegistrations ?? 0,
                      bg: "bg-secondary",
                      color: "text-secondary-foreground",
                    },
                  ].map(({ icon: Icon, label, value, bg, color }) => (
                    <Card key={label}>
                      <CardContent className="flex items-center gap-4 p-5">
                        <div
                          className={`flex h-11 w-11 items-center justify-center rounded-xl ${bg}`}
                        >
                          <Icon className={`h-5 w-5 ${color}`} />
                        </div>
                        <div>
                          <p className="text-3xl font-bold">{value}</p>
                          <p className="text-xs text-muted-foreground">
                            {label}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-primary" />{" "}
                        Registration Trend (30 days)
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-52">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={adminStats?.trendData || []}>
                            <CartesianGrid
                              strokeDasharray="3 3"
                              stroke="hsl(var(--border))"
                            />
                            <XAxis
                              dataKey="date"
                              tick={{ fontSize: 10 }}
                              stroke="hsl(var(--muted-foreground))"
                            />
                            <YAxis
                              tick={{ fontSize: 10 }}
                              stroke="hsl(var(--muted-foreground))"
                            />
                            <Tooltip
                              contentStyle={{
                                background: "hsl(var(--card))",
                                border: "1px solid hsl(var(--border))",
                                borderRadius: 8,
                                fontSize: 12,
                              }}
                            />
                            <Area
                              type="monotone"
                              dataKey="registrations"
                              stroke="hsl(var(--primary))"
                              fill="hsl(var(--primary) / 0.15)"
                              strokeWidth={2}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <BarChart3 className="h-4 w-4 text-primary" />{" "}
                        Registration Status
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-52 flex items-center justify-center">
                        {regStatusPieData.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={regStatusPieData}
                                cx="50%"
                                cy="50%"
                                outerRadius={80}
                                dataKey="value"
                                label={({ name, value }) => `${name}: ${value}`}
                                labelLine={false}
                                fontSize={11}
                              >
                                {regStatusPieData.map((_, i) => (
                                  <Cell
                                    key={i}
                                    fill={PIE_COLORS[i % PIE_COLORS.length]}
                                  />
                                ))}
                              </Pie>
                              <Tooltip />
                            </PieChart>
                          </ResponsiveContainer>
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            No registration data
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <CalendarDays className="h-4 w-4 text-primary" /> Events
                      by Status
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={eventStatusBarData}>
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="hsl(var(--border))"
                          />
                          <XAxis
                            dataKey="name"
                            tick={{ fontSize: 12 }}
                            stroke="hsl(var(--muted-foreground))"
                          />
                          <YAxis
                            tick={{ fontSize: 12 }}
                            stroke="hsl(var(--muted-foreground))"
                            allowDecimals={false}
                          />
                          <Tooltip
                            contentStyle={{
                              background: "hsl(var(--card))",
                              border: "1px solid hsl(var(--border))",
                              borderRadius: 8,
                              fontSize: 12,
                            }}
                          />
                          <Bar
                            dataKey="count"
                            fill="hsl(var(--primary))"
                            radius={[6, 6, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* ===== USERS ===== */}
            {activeTab === "users" && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <div className="relative flex-1 w-full sm:max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name or email..."
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <div className="flex gap-2 ml-auto">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSeatLimitDialogOpen(true)}
                      className="gap-1.5"
                    >
                      <Plus className="h-4 w-4" /> Custom Seat Limit
                    </Button>
                    <Badge variant="secondary" className="text-xs">
                      {filteredUsers.length} users
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={exportUsersCSV}
                      className="gap-1.5"
                    >
                      <Download className="h-4 w-4" /> CSV
                    </Button>
                  </div>
                </div>
                <Card>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead className="hidden sm:table-cell">
                            Phone
                          </TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Roles</TableHead>
                          <TableHead className="hidden md:table-cell">
                            Max Seats
                          </TableHead>
                          <TableHead className="hidden md:table-cell">
                            Joined
                          </TableHead>
                          <TableHead className="w-10"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredUsers.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={8}
                              className="text-center py-8 text-muted-foreground"
                            >
                              No users found
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredUsers.map((u) => {
                            const roles = getRoles(u.id);
                            const isSelf = u.id === user?.id;
                            const userStatus = u.status || "active";
                            const isBanned = userStatus === "banned";
                            const isSuspended = userStatus === "suspended";
                            return (
                              <TableRow
                                key={u.id}
                                className={isBanned ? "opacity-60" : ""}
                              >
                                <TableCell className="font-medium">
                                  {u.full_name || "—"}
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground max-w-[180px] truncate">
                                  {u.contact_email || "—"}
                                </TableCell>
                                <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                                  {u.contact_phone || "—"}
                                </TableCell>
                                <TableCell>
                                  {isBanned ? (
                                    <Badge
                                      variant="destructive"
                                      className="text-[10px] px-1.5"
                                    >
                                      Banned
                                    </Badge>
                                  ) : isSuspended ? (
                                    <Badge
                                      variant="outline"
                                      className="text-[10px] px-1.5 border-orange-400 text-orange-600"
                                    >
                                      Suspended
                                    </Badge>
                                  ) : (
                                    <Badge
                                      variant="secondary"
                                      className="text-[10px] px-1.5"
                                    >
                                      Active
                                    </Badge>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <div className="flex flex-wrap gap-1">
                                    {roles.map((r) => (
                                      <Badge
                                        key={r}
                                        variant={
                                          r === "admin"
                                            ? "default"
                                            : "secondary"
                                        }
                                        className="text-[10px] px-1.5"
                                      >
                                        {r === "admin" ? "Admin" : "Organizer"}
                                      </Badge>
                                    ))}
                                    {roles.length === 0 && (
                                      <span className="text-xs text-muted-foreground">
                                        Organizer
                                      </span>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell className="hidden md:table-cell text-xs font-medium">
                                  {(u as any).max_seat_limit ?? 300}
                                </TableCell>
                                <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                                  {new Date(u.created_at).toLocaleDateString()}
                                </TableCell>
                                <TableCell>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8"
                                      >
                                        <MoreVertical className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem
                                        onClick={() => {
                                          setAdminAction({
                                            userId: u.id,
                                            hasRole: roles.includes("admin"),
                                          });
                                          setAdminConfirmOpen(true);
                                        }}
                                      >
                                        {roles.includes("admin") ? (
                                          <>
                                            <ShieldOff className="mr-2 h-4 w-4" />{" "}
                                            Remove Admin
                                          </>
                                        ) : (
                                          <>
                                            <ShieldCheck className="mr-2 h-4 w-4" />{" "}
                                            Make Admin
                                          </>
                                        )}
                                      </DropdownMenuItem>
                                      {!isSelf && (
                                        <>
                                          <DropdownMenuSeparator />
                                          {userStatus === "active" && (
                                            <>
                                              <DropdownMenuItem
                                                onClick={() => {
                                                  setSuspendTarget({
                                                    userId: u.id,
                                                    action: "banned",
                                                  });
                                                  setSuspendDialogOpen(true);
                                                }}
                                              >
                                                <Ban className="mr-2 h-4 w-4 text-destructive" />{" "}
                                                Ban User
                                              </DropdownMenuItem>
                                              <DropdownMenuItem
                                                onClick={() => {
                                                  setSuspendTarget({
                                                    userId: u.id,
                                                    action: "suspended",
                                                  });
                                                  setSuspendDialogOpen(true);
                                                }}
                                              >
                                                <Clock className="mr-2 h-4 w-4 text-orange-500" />{" "}
                                                Suspend User
                                              </DropdownMenuItem>
                                            </>
                                          )}
                                          {(isBanned || isSuspended) && (
                                            <DropdownMenuItem
                                              onClick={() =>
                                                updateUserStatusMutation.mutate(
                                                  {
                                                    userId: u.id,
                                                    status: "active",
                                                  },
                                                )
                                              }
                                            >
                                              <CheckCircle className="mr-2 h-4 w-4 text-green-600" />{" "}
                                              Restore User
                                            </DropdownMenuItem>
                                          )}
                                          <DropdownMenuSeparator />
                                          <DropdownMenuItem
                                            className="text-destructive focus:text-destructive"
                                            onClick={() => {
                                              setUserToDelete(u.id);
                                              setDeleteConfirmOpen(true);
                                            }}
                                          >
                                            <Trash2 className="mr-2 h-4 w-4" />{" "}
                                            Delete User
                                          </DropdownMenuItem>
                                        </>
                                      )}
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </TableCell>
                              </TableRow>
                            );
                          })
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </Card>
              </div>
            )}

            {/* ===== SETTINGS ===== */}
            {activeTab === "settings" && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Site Configuration
                  </CardTitle>
                  <CardDescription>
                    Manage homepage content and platform defaults
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form
                    className="space-y-5"
                    onSubmit={(e) => {
                      e.preventDefault();
                      updateSettingsMutation.mutate();
                    }}
                  >
                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                        Landing Page
                      </h3>
                      <div>
                        <Label>Hero Heading</Label>
                        <Input
                          value={settingsForm.hero_heading || ""}
                          onChange={(e) =>
                            setSettingsForm((p) => ({
                              ...p,
                              hero_heading: e.target.value,
                            }))
                          }
                          className="mt-1"
                          placeholder="Create & Manage Events Effortlessly"
                        />
                      </div>
                      <div>
                        <Label>Hero Description</Label>
                        <Textarea
                          value={settingsForm.hero_description || ""}
                          onChange={(e) =>
                            setSettingsForm((p) => ({
                              ...p,
                              hero_description: e.target.value,
                            }))
                          }
                          className="mt-1"
                          rows={3}
                          placeholder="A short description..."
                        />
                      </div>
                      <div>
                        <Label>Footer Text</Label>
                        <Input
                          value={settingsForm.footer_text || ""}
                          onChange={(e) =>
                            setSettingsForm((p) => ({
                              ...p,
                              footer_text: e.target.value,
                            }))
                          }
                          className="mt-1"
                          placeholder="© 2026 Regixo. All rights reserved."
                        />
                      </div>
                    </div>
                    <div className="border-t pt-5 space-y-4">
                      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                        Seat Limits
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Default: 300 seats. Organizers requesting &gt;300 will
                        see contact info. Max: 1000.
                      </p>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Default Seat Limit</Label>
                          <Input
                            type="number"
                            value={settingsForm.default_seat_limit || "300"}
                            onChange={(e) =>
                              setSettingsForm((p) => ({
                                ...p,
                                default_seat_limit: e.target.value,
                              }))
                            }
                            className="mt-1"
                            min={1}
                            max={1000}
                          />
                        </div>
                        <div>
                          <Label>Max Seat Limit</Label>
                          <Input
                            type="number"
                            value={settingsForm.max_seat_limit || "1000"}
                            onChange={(e) =>
                              setSettingsForm((p) => ({
                                ...p,
                                max_seat_limit: e.target.value,
                              }))
                            }
                            className="mt-1"
                            min={1}
                            max={10000}
                          />
                        </div>
                      </div>
                      <div>
                        <Label>Contact Info (shown when limit &gt; 300)</Label>
                        <Input
                          value={settingsForm.contact_info || ""}
                          onChange={(e) =>
                            setSettingsForm((p) => ({
                              ...p,
                              contact_info: e.target.value,
                            }))
                          }
                          className="mt-1"
                          placeholder="Email or phone for limit increase requests"
                        />
                      </div>
                    </div>
                    <Button
                      type="submit"
                      disabled={updateSettingsMutation.isPending}
                      className="mt-2"
                    >
                      {updateSettingsMutation.isPending
                        ? "Saving..."
                        : "Save Settings"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}

            {/* ===== TEMPLATES ===== */}
            {activeTab === "templates" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-semibold">Event Templates</h3>
                    <p className="text-sm text-muted-foreground">
                      Create reusable templates organizers can use
                    </p>
                  </div>
                  <Button
                    size="sm"
                    className="gap-1.5"
                    onClick={() => setTemplateDialogOpen(true)}
                  >
                    <Plus className="h-4 w-4" /> New Template
                  </Button>
                </div>
                {!templates || templates.length === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                      <FileText className="h-10 w-10 text-muted-foreground/50 mb-3" />
                      <p className="text-sm text-muted-foreground">
                        No templates yet. Create one to get started.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {templates.map((t) => (
                      <Card
                        key={t.id}
                        className="hover:shadow-md transition-shadow"
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-sm truncate">
                                {t.title}
                              </p>
                              {t.description && (
                                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                  {t.description}
                                </p>
                              )}
                              <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                                {t.venue && <span>📍 {t.venue}</span>}
                                {(t.price ?? 0) > 0 && <span>৳{t.price}</span>}
                                {(t as any).seat_limit && (
                                  <span>{(t as any).seat_limit} seats</span>
                                )}
                              </div>
                              {(t as any).payment_methods?.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {(t as any).payment_methods.map(
                                    (m: string) => (
                                      <Badge
                                        key={m}
                                        variant="outline"
                                        className="text-[10px] px-1.5"
                                      >
                                        {m}
                                      </Badge>
                                    ),
                                  )}
                                </div>
                              )}
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 shrink-0"
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={() =>
                                    deleteTemplateMutation.mutate(t.id)
                                  }
                                >
                                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* ===== DIALOGS ===== */}

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes the user's profile and roles.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() =>
                userToDelete && deleteUserMutation.mutate(userToDelete)
              }
            >
              Delete Profile
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={adminConfirmOpen} onOpenChange={setAdminConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {adminAction?.hasRole ? "Remove Admin Role" : "Grant Admin Role"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {adminAction?.hasRole
                ? "This will revoke super admin privileges."
                : "This grants full admin access including user management and site settings."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                adminAction &&
                toggleRoleMutation.mutate({
                  userId: adminAction.userId,
                  role: "admin",
                  hasRole: adminAction.hasRole,
                })
              }
            >
              {adminAction?.hasRole ? "Remove Admin" : "Make Admin"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={suspendDialogOpen} onOpenChange={setSuspendDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {suspendTarget?.action === "banned" ? "Ban User" : "Suspend User"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {suspendTarget?.action === "banned"
                ? "User will be permanently banned. You can restore them later."
                : "User will be temporarily suspended. Choose the duration below."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {suspendTarget?.action === "suspended" && (
            <div className="px-6 pb-2">
              <Label className="text-sm">Suspend for</Label>
              <select
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={suspendDays}
                onChange={(e) => setSuspendDays(e.target.value)}
              >
                <option value="1">1 day</option>
                <option value="3">3 days</option>
                <option value="7">7 days</option>
                <option value="14">14 days</option>
                <option value="30">30 days</option>
              </select>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (!suspendTarget) return;
                updateUserStatusMutation.mutate({
                  userId: suspendTarget.userId,
                  status: suspendTarget.action,
                });
              }}
            >
              {suspendTarget?.action === "banned" ? "Ban User" : "Suspend User"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ===== TEMPLATE CREATION DIALOG ===== */}
      <Dialog
        open={templateDialogOpen}
        onOpenChange={(open) => {
          if (!open) closeTemplateDialog();
          else setTemplateDialogOpen(true);
        }}
      >
        <DialogContent className="sm:max-w-2xl max-h-[90vh] p-0">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle>Create Event Template</DialogTitle>
            <DialogDescription>
              Build a ready-to-use template with all event details pre-filled.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh]">
            <form
              className="space-y-5 p-6 pt-4"
              onSubmit={(e) => {
                e.preventDefault();
                createTemplateMutation.mutate();
              }}
            >
              {/* Basic Info */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Basic Information
                </h3>
                <div>
                  <Label>Title *</Label>
                  <Input
                    value={templateForm.title}
                    onChange={(e) => updateTemplate("title", e.target.value)}
                    className="mt-1"
                    placeholder="e.g. Tech Workshop 2026"
                    required
                  />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea
                    value={templateForm.description}
                    onChange={(e) =>
                      updateTemplate("description", e.target.value)
                    }
                    className="mt-1"
                    rows={3}
                    placeholder="Detailed event description..."
                  />
                </div>
                <div>
                  <Label>Venue</Label>
                  <Input
                    value={templateForm.venue}
                    onChange={(e) => updateTemplate("venue", e.target.value)}
                    className="mt-1"
                    placeholder="Event venue name & address"
                  />
                </div>
              </div>

              <Separator />

              {/* Venue & Contact */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Organizer Contact
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Contact Email</Label>
                    <Input
                      type="email"
                      value={templateForm.organizer_contact_email}
                      onChange={(e) =>
                        updateTemplate(
                          "organizer_contact_email",
                          e.target.value,
                        )
                      }
                      className="mt-1"
                      placeholder="contact@example.com"
                    />
                  </div>
                  <div>
                    <Label>Contact Phone</Label>
                    <Input
                      value={templateForm.organizer_contact_phone}
                      onChange={(e) =>
                        updateTemplate(
                          "organizer_contact_phone",
                          e.target.value,
                        )
                      }
                      className="mt-1"
                      placeholder="+880..."
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Capacity & Pricing */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Capacity & Pricing
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label>Seat Limit</Label>
                    <Input
                      type="number"
                      value={templateForm.seat_limit}
                      onChange={(e) =>
                        updateTemplate("seat_limit", e.target.value)
                      }
                      className="mt-1"
                      placeholder="300"
                      min={0}
                    />
                  </div>
                  <div>
                    <Label>Guest Limit</Label>
                    <Input
                      type="number"
                      value={templateForm.guest_limit}
                      onChange={(e) =>
                        updateTemplate("guest_limit", e.target.value)
                      }
                      className="mt-1"
                      placeholder="0"
                      min={0}
                    />
                  </div>
                  <div>
                    <Label>Price (৳)</Label>
                    <Input
                      type="number"
                      value={templateForm.price}
                      onChange={(e) => updateTemplate("price", e.target.value)}
                      className="mt-1"
                      placeholder="0"
                      min={0}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Registration Settings */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Registration Settings
                </h3>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-medium">
                      Allow Late Registration
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Allow registrations after the deadline
                    </p>
                  </div>
                  <Switch
                    checked={templateForm.allow_late_registration}
                    onCheckedChange={(v) =>
                      updateTemplate("allow_late_registration", v)
                    }
                  />
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-medium">Show Registered List</p>
                    <p className="text-xs text-muted-foreground">
                      Publicly display the list of registered attendees
                    </p>
                  </div>
                  <Switch
                    checked={templateForm.show_registered_list}
                    onCheckedChange={(v) =>
                      updateTemplate("show_registered_list", v)
                    }
                  />
                </div>
              </div>

              <Separator />

              {/* Default Registration Fields */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Default Registration Fields
                </h3>
                {[
                  {
                    key: "require_name",
                    label: "Full Name",
                    desc: "Require name on registration form",
                    disabled: true,
                  },
                  {
                    key: "show_phone_field",
                    label: "Phone Number",
                    desc: "Show phone field on registration form",
                    disabled: false,
                  },
                  {
                    key: "show_email_field",
                    label: "Email Address",
                    desc: "Show email field on registration form",
                    disabled: false,
                  },
                ].map(({ key, label, desc, disabled }) => (
                  <div
                    key={key}
                    className={cn(
                      "flex items-center justify-between rounded-lg border p-3",
                      disabled && "bg-muted/30",
                    )}
                  >
                    <div>
                      <p className="text-sm font-medium">{label}</p>
                      <p className="text-xs text-muted-foreground">{desc}</p>
                    </div>
                    <Switch
                      checked={
                        templateForm[key as keyof TemplateForm] as boolean
                      }
                      disabled={disabled}
                      onCheckedChange={(v) =>
                        updateTemplate(key as keyof TemplateForm, v)
                      }
                    />
                  </div>
                ))}
              </div>

              <Separator />

              {/* Payment Info */}
              <div
                className={cn(
                  "space-y-3",
                  isFreeTemplate && "opacity-50 pointer-events-none",
                )}
              >
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  Payment Information
                  {isFreeTemplate && (
                    <Badge
                      variant="secondary"
                      className="text-xs font-normal normal-case"
                    >
                      Free event — N/A
                    </Badge>
                  )}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {isFreeTemplate
                    ? "Set a price above to configure payment."
                    : "প্রতিটা payment method এর জন্য আলাদা number দিন।"}
                </p>

                {templateForm.payment_method_entries.length > 0 && (
                  <div className="space-y-2">
                    {templateForm.payment_method_entries.map((entry) => (
                      <div
                        key={entry.method}
                        className="flex items-center gap-2"
                      >
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
                  <Label>Payment Instructions</Label>
                  <p className="text-xs text-muted-foreground mb-1">
                    Auto-generated. You can edit it.
                  </p>
                  <Textarea
                    value={templateForm.payment_instruction}
                    onChange={(e) =>
                      updateTemplate("payment_instruction", e.target.value)
                    }
                    className="mt-1"
                    rows={3}
                    placeholder="Select payment methods and enter numbers to auto-generate..."
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <p className="text-sm font-medium">
                        Require Transaction ID
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Ask registrants to provide payment transaction ID
                      </p>
                    </div>
                    <Switch
                      checked={
                        !isFreeTemplate && templateForm.require_transaction_id
                      }
                      disabled={isFreeTemplate}
                      onCheckedChange={(v) => {
                        if (!v) setShowTrxWarning(true);
                        else {
                          setShowTrxWarning(false);
                          updateTemplate("require_transaction_id", true);
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
                            updateTemplate("require_transaction_id", false);
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
              </div>

              <Separator />

              {/* Instructions */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Instructions & Rules
                </h3>
                <Textarea
                  value={templateForm.instructions}
                  onChange={(e) =>
                    updateTemplate("instructions", e.target.value)
                  }
                  rows={4}
                  placeholder="Rules, dress code, what to bring, notes for attendees..."
                />
              </div>

              <Separator />

              {/* Custom Fields */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                      Custom Registration Fields
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Extra fields registrants will fill out
                    </p>
                  </div>
                  {templateCustomFields.length > 0 && (
                    <Badge variant="secondary" className="text-xs font-normal">
                      {templateCustomFields.length} field
                      {templateCustomFields.length > 1 ? "s" : ""}
                    </Badge>
                  )}
                </div>
                <CustomFieldsBuilder
                  fields={templateCustomFields}
                  onChange={setTemplateCustomFields}
                />
              </div>

              <Separator />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={closeTemplateDialog}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createTemplateMutation.isPending}
                >
                  {createTemplateMutation.isPending
                    ? "Creating..."
                    : "Create Template"}
                </Button>
              </DialogFooter>
            </form>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Custom Seat Limit Dialog */}
      <Dialog open={seatLimitDialogOpen} onOpenChange={setSeatLimitDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Set Custom Seat Limit</DialogTitle>
            <DialogDescription>
              Grant a user a higher seat limit by their email address.
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              updateSeatLimitMutation.mutate({
                email: seatLimitEmail,
                limit: Number(seatLimitValue),
              });
            }}
          >
            <div>
              <Label>User Email</Label>
              <Input
                type="email"
                value={seatLimitEmail}
                onChange={(e) => setSeatLimitEmail(e.target.value)}
                className="mt-1"
                placeholder="user@example.com"
                required
              />
            </div>
            <div>
              <Label>Max Seat Limit</Label>
              <Input
                type="number"
                value={seatLimitValue}
                onChange={(e) => setSeatLimitValue(e.target.value)}
                className="mt-1"
                min={1}
                max={10000}
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                Default is 300. Set higher for special users.
              </p>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setSeatLimitDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={updateSeatLimitMutation.isPending}
              >
                {updateSeatLimitMutation.isPending
                  ? "Updating..."
                  : "Update Limit"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDashboard;
