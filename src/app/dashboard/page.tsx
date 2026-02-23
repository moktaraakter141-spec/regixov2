"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  useEvents,
  useDashboardStats,
  type Event,
  generateSlug,
} from "@/hooks/useEvents";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Plus,
  CalendarDays,
  Users,
  CheckCircle,
  Clock,
  MoreVertical,
  Pencil,
  Copy,
  Trash2,
  ExternalLink,
  Eye,
  EyeOff,
  ClipboardList,
  Search,
  Menu,
  ArrowRight,
  TrendingUp,
  Sparkles,
} from "lucide-react";
import { Moon, Sun } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { useTheme } from "next-themes";
import { TemplateSelector } from "@/components/events/TemplateSelector";
import { Sidebar } from "@/components/Sidebar";

const statusConfig: Record<
  string,
  { label: string; dotClass: string; bgClass: string }
> = {
  draft: {
    label: "Draft",
    dotClass: "bg-muted-foreground",
    bgClass: "bg-muted text-muted-foreground",
  },
  published: {
    label: "Live",
    dotClass: "bg-primary",
    bgClass: "bg-accent text-accent-foreground",
  },
  closed: {
    label: "Closed",
    dotClass: "bg-destructive",
    bgClass: "bg-destructive/10 text-destructive",
  },
};

const Dashboard = () => {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { theme, setTheme } = useTheme();
  const { data: events, isLoading: eventsLoading } = useEvents();
  const { data: stats } = useDashboardStats();

  const { data: regCounts } = useQuery({
    queryKey: ["event-reg-counts", user?.id],
    queryFn: async () => {
      const { data: userEvents } = await supabase
        .from("events")
        .select("id")
        .eq("organizer_id", user!.id);
      if (!userEvents?.length) return {};
      const eventIds = userEvents.map((e) => e.id);
      const { data: regs } = await supabase
        .from("registrations")
        .select("event_id, status")
        .in("event_id", eventIds)
        .in("status", ["pending", "approved"]);
      const counts: Record<string, number> = {};
      regs?.forEach((r) => {
        counts[r.event_id] = (counts[r.event_id] || 0) + 1;
      });
      return counts;
    },
    enabled: !!user,
  });

  const { data: isAdmin } = useQuery({
    queryKey: ["is-admin", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("is_admin");
      if (error) throw error;
      return data as boolean;
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (isAdmin) router.replace("/admin");
  }, [isAdmin, router]);

  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<
    "all" | "draft" | "published" | "closed"
  >("all");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [templateSelectorOpen, setTemplateSelectorOpen] = useState(false);

  const filteredEvents = useMemo(() => {
    if (!events) return [];
    return events.filter((e) => {
      const matchesSearch =
        !search || e.title.toLowerCase().includes(search.toLowerCase());
      const matchesTab = activeTab === "all" || e.status === activeTab;
      return matchesSearch && matchesTab;
    });
  }, [events, search, activeTab]);

  const deleteMutation = useMutation({
    mutationFn: async (eventId: string) => {
      const { error } = await supabase
        .from("events")
        .delete()
        .eq("id", eventId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      toast({ title: "Event deleted" });
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: async (event: Event) => {
      const { id, created_at, updated_at, slug, ...rest } = event;
      const { error } = await supabase.from("events").insert({
        ...rest,
        title: `${event.title} (Copy)`,
        status: "draft" as const,
        slug: generateSlug(event.title + " copy"),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      toast({ title: "Event duplicated as draft" });
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: string;
      status: "published" | "closed" | "draft";
    }) => {
      const { error } = await supabase
        .from("events")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      toast({ title: "Event status updated" });
    },
  });

  const copyLink = (slug: string | null) => {
    if (!slug) return;
    navigator.clipboard.writeText(`${window.location.origin}/e/${slug}`);
    toast({ title: "Link copied to clipboard!" });
  };

  const tabCounts = useMemo(() => {
    if (!events) return { all: 0, draft: 0, published: 0, closed: 0 };
    return {
      all: events.length,
      draft: events.filter((e) => e.status === "draft").length,
      published: events.filter((e) => e.status === "published").length,
      closed: events.filter((e) => e.status === "closed").length,
    };
  }, [events]);

  return (
    <div className="min-h-screen flex bg-background">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 min-w-0">
        <header className="sticky top-0 z-30 flex items-center h-16 px-4 sm:px-6 border-b bg-background/80 backdrop-blur-sm">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden mr-3 text-muted-foreground hover:text-foreground"
          >
            <Menu className="h-5 w-5" />
          </button>
          <h2
            className="text-lg font-semibold"
            style={{ fontFamily: "'DM Serif Display', serif" }}
          >
            Dashboard
          </h2>
          <div className="ml-auto flex items-center gap-2">
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
            <Button
              onClick={() => setTemplateSelectorOpen(true)}
              size="sm"
              className="gap-1.5 shadow-sm"
            >
              <Plus className="h-4 w-4" /> New Event
            </Button>
          </div>
        </header>

        <main className="mx-auto p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1200px]">
          <div className="flex overflow-x-auto snap-x snap-mandatory gap-3 sm:gap-4 pb-2 lg:grid lg:grid-cols-4 lg:overflow-visible [&::-webkit-scrollbar]:hidden">
            {[
              {
                icon: CalendarDays,
                value: stats?.totalEvents ?? 0,
                label: "Total Events",
              },
              {
                icon: Users,
                value: stats?.totalRegistrations ?? 0,
                label: "Registrations",
                highlight: true,
              },
              {
                icon: CheckCircle,
                value: stats?.approvedRegistrations ?? 0,
                label: "Approved",
              },
              {
                icon: Clock,
                value: stats?.pendingRegistrations ?? 0,
                label: "Pending",
              },
            ].map((s) => (
              <div
                key={s.label}
                className="snap-start shrink-0 w-40 sm:w-48 lg:w-auto"
              >
                <StatCard {...s} />
              </div>
            ))}
          </div>

          <div className="space-y-4">
            <div className="flex-col sm:flex-row sm:items-center gap-3 flex items-center justify-center">
              <div className="flex items-center gap-0.5 rounded-lg border p-1 bg-card">
                {(["all", "draft", "published", "closed"] as const).map(
                  (tab) => (
                    <button
                      key={tab}
                      onClick={() => {
                        setActiveTab(tab);
                        setSearch("");
                      }}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${activeTab === tab ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}
                    >
                      {tab === "all"
                        ? "All"
                        : tab === "published"
                          ? "Live"
                          : tab.charAt(0).toUpperCase() + tab.slice(1)}
                      <span className="ml-1 opacity-70">{tabCounts[tab]}</span>
                    </button>
                  ),
                )}
              </div>
              <div className="relative flex-1 w-full sm:max-w-xs sm:ml-auto">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search events..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-9 bg-card"
                />
              </div>
            </div>

            {eventsLoading ? (
              <div className="flex items-center justify-center py-20">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            ) : filteredEvents.length === 0 && events?.length === 0 ? (
              <Card className="border-dashed border-2">
                <CardContent className="flex flex-col items-center justify-center py-16 text-center px-6">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 mb-4">
                    <Sparkles className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-1">
                    Create your first event
                  </h3>
                  <p className="text-sm text-muted-foreground max-w-sm mb-5">
                    Set up an event, customize the form, and share the link.
                  </p>
                  <Button
                    onClick={() => router.push("/events/new")}
                    className="gap-2"
                  >
                    <Plus className="h-4 w-4" /> Get Started{" "}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ) : filteredEvents.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Search className="h-8 w-8 text-muted-foreground/30 mb-2" />
                  <p className="text-sm text-muted-foreground">
                    No events match your search
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="border bg-card overflow-hidden rounded-lg">
                <div className="hidden sm:grid grid-cols-[1fr_100px_120px_100px_44px] items-center gap-3 px-5 py-3 border-b bg-muted/50 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  <span>Event</span>
                  <span>Status</span>
                  <span>Deadline</span>
                  <span className="text-right">Venue</span>
                  <span />
                </div>
                {filteredEvents.map((event, i) => {
                  const sc = statusConfig[event.status] || statusConfig.draft;
                  return (
                    <div
                      key={event.id}
                      className={`group flex sm:grid sm:grid-cols-[1fr_100px_120px_100px_44px] items-center gap-3 px-5 py-3.5 hover:bg-muted/30 transition-colors cursor-pointer ${i < filteredEvents.length - 1 ? "border-b" : ""}`}
                      onClick={() =>
                        router.push(`/events/${event.id}/registrations`)
                      }
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate group-hover:text-primary transition-colors">
                          {event.title}
                          {event.seat_limit &&
                            event.seat_limit > 0 &&
                            (() => {
                              const occupied = regCounts?.[event.id] || 0;
                              const remaining = Math.max(
                                0,
                                event.seat_limit - occupied,
                              );
                              return (
                                <span
                                  className={`ml-2 text-[10px] font-medium px-1.5 py-0.5 rounded-full ${remaining <= 0 ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}
                                >
                                  {remaining <= 0
                                    ? "Full"
                                    : `${remaining}/${event.seat_limit} seats`}
                                </span>
                              );
                            })()}
                        </p>
                        <p className="text-xs text-muted-foreground truncate sm:hidden mt-0.5">
                          {event.venue || "No venue"} ·{" "}
                          {new Date(event.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="hidden sm:block">
                        <Badge
                          variant="secondary"
                          className={`text-[10px] px-2 py-0.5 ${sc.bgClass}`}
                        >
                          <span
                            className={`inline-block h-1.5 w-1.5 rounded-full mr-1.5 ${sc.dotClass}`}
                          />
                          {sc.label}
                        </Badge>
                      </div>
                      <span className="hidden sm:block text-xs text-muted-foreground">
                        {(event as any).registration_deadline
                          ? new Date(
                              (event as any).registration_deadline,
                            ).toLocaleDateString("en", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })
                          : "—"}
                      </span>
                      <span className="hidden sm:block text-xs text-muted-foreground text-right truncate">
                        {event.venue || "—"}
                      </span>
                      <Badge
                        variant="secondary"
                        className={`sm:hidden text-[10px] px-2 py-0.5 shrink-0 ${sc.bgClass}`}
                      >
                        {sc.label}
                      </Badge>
                      <div
                        className="shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground"
                            >
                              <MoreVertical className="h-4 w-4 text-foreground" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem
                              onClick={() =>
                                router.push(`/events/${event.id}/edit`)
                              }
                            >
                              <Pencil className="mr-2 h-4 w-4" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                router.push(`/events/${event.id}/registrations`)
                              }
                            >
                              <ClipboardList className="mr-2 h-4 w-4" />{" "}
                              Registrations
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {event.status === "draft" && (
                              <DropdownMenuItem
                                onClick={() =>
                                  toggleStatusMutation.mutate({
                                    id: event.id,
                                    status: "published",
                                  })
                                }
                              >
                                <Eye className="mr-2 h-4 w-4" /> Publish
                              </DropdownMenuItem>
                            )}
                            {event.status === "published" && (
                              <DropdownMenuItem
                                onClick={() =>
                                  toggleStatusMutation.mutate({
                                    id: event.id,
                                    status: "closed",
                                  })
                                }
                              >
                                <EyeOff className="mr-2 h-4 w-4" /> Close
                              </DropdownMenuItem>
                            )}
                            {event.status === "closed" && (
                              <DropdownMenuItem
                                onClick={() =>
                                  toggleStatusMutation.mutate({
                                    id: event.id,
                                    status: "published",
                                  })
                                }
                              >
                                <Eye className="mr-2 h-4 w-4" /> Re-publish
                              </DropdownMenuItem>
                            )}
                            {event.slug && (
                              <>
                                <DropdownMenuItem
                                  onClick={() =>
                                    window.open(`/e/${event.slug}`, "_blank")
                                  }
                                >
                                  <Eye className="mr-2 h-4 w-4" /> Preview
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => copyLink(event.slug)}
                                >
                                  <ExternalLink className="mr-2 h-4 w-4" /> Copy
                                  Link
                                </DropdownMenuItem>
                              </>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => duplicateMutation.mutate(event)}
                            >
                              <Copy className="mr-2 h-4 w-4" /> Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => deleteMutation.mutate(event.id)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </main>
      </div>

      <TemplateSelector
        open={templateSelectorOpen}
        onClose={() => setTemplateSelectorOpen(false)}
        onSelect={(template) => {
          router.push(
            template ? `/events/new?template=${template.id}` : "/events/new",
          );
        }}
      />
    </div>
  );
};

const StatCard = ({
  icon: Icon,
  value,
  label,
  highlight,
}: {
  icon: typeof CalendarDays;
  value: number;
  label: string;
  highlight?: boolean;
}) => (
  <Card
    className={`group hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 overflow-hidden ${highlight ? "border-primary/30" : ""}`}
  >
    <CardContent className="p-4 sm:p-5 relative">
      {highlight && (
        <div className="absolute inset-0 bg-primary/5 pointer-events-none" />
      )}
      <div className="mb-3 relative flex justify-between">
        <div
          className={`flex h-9 w-9 items-center justify-center rounded-lg transition-transform group-hover:scale-110 ${highlight ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
        >
          <Icon className="h-4 w-4" />
        </div>
        <TrendingUp className="h-3.5 w-3.5 text-muted-foreground/30" />
      </div>
      <p className="text-2xl sm:text-3xl font-bold tracking-tight relative">
        {value}
      </p>
      <p className="text-xs text-muted-foreground mt-0.5 relative">{label}</p>
    </CardContent>
  </Card>
);

export default Dashboard;
