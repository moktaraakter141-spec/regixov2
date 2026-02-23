"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import {
  useEvents,
  useDashboardStats,
  useRegistrationTrends,
  type Event,
} from "@/hooks/useEvents";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CalendarDays,
  Users,
  Menu,
  BarChart3,
  TrendingUp,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Moon,
  Sun,
  Percent,
} from "lucide-react";
import { useState, useMemo } from "react";
import { useTheme } from "next-themes";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { Sidebar } from "@/components/Sidebar";

const PIE_COLORS = [
  "hsl(47, 95%, 55%)",
  "hsl(152, 69%, 40%)",
  "hsl(228, 60%, 55%)",
  "hsl(0, 84%, 60%)",
  "hsl(280, 60%, 55%)",
];

const Analytics = () => {
  const { user } = useAuth();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { data: events } = useEvents();
  const { data: stats } = useDashboardStats();
  const { data: trends } = useRegistrationTrends();

  const [sidebarOpen, setSidebarOpen] = useState(false);

  const revenueData = useMemo(() => {
    if (!trends || !events)
      return { total: 0, byEvent: [] as { name: string; revenue: number }[] };
    const eventMap = new Map(events.map((e) => [e.id, e]));
    let total = 0;
    const byEvent: Record<
      string,
      { name: string; revenue: number; count: number }
    > = {};

    trends.forEach((r) => {
      const event = eventMap.get(r.event_id);
      if (!event) return;
      const price = Number(event.price) || 0;
      if (r.status === "approved") {
        total += price;
        if (!byEvent[r.event_id])
          byEvent[r.event_id] = {
            name: event.title.slice(0, 25),
            revenue: 0,
            count: 0,
          };
        byEvent[r.event_id].revenue += price;
        byEvent[r.event_id].count += 1;
      }
    });

    return {
      total,
      byEvent: Object.values(byEvent)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 6),
    };
  }, [trends, events]);

  const statusDistribution = useMemo(() => {
    if (!trends) return [];
    const counts: Record<string, number> = {};
    trends.forEach((r) => {
      counts[r.status] = (counts[r.status] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
    }));
  }, [trends]);

  const dailyTrend = useMemo(() => {
    if (!trends) return [];
    const byDay: Record<string, number> = {};
    trends.forEach((r) => {
      const day = new Date(r.created_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      byDay[day] = (byDay[day] || 0) + 1;
    });
    return Object.entries(byDay).map(([day, count]) => ({ day, count }));
  }, [trends]);

  const eventPerformance = useMemo(() => {
    if (!trends || !events) return [];
    const countMap: Record<string, number> = {};
    trends.forEach((r) => {
      countMap[r.event_id] = (countMap[r.event_id] || 0) + 1;
    });
    return events
      .map((e) => ({
        name: e.title.slice(0, 20),
        registrations: countMap[e.id] || 0,
      }))
      .sort((a, b) => b.registrations - a.registrations)
      .slice(0, 8);
  }, [trends, events]);

  const conversionRate = useMemo(() => {
    if (!trends || trends.length === 0) return 0;
    const approved = trends.filter((r) => r.status === "approved").length;
    return Math.round((approved / trends.length) * 100);
  }, [trends]);

  const topEvents = useMemo(() => {
    if (!events || !trends) return [];
    const countMap: Record<string, { total: number; approved: number }> = {};
    trends.forEach((r) => {
      if (!countMap[r.event_id])
        countMap[r.event_id] = { total: 0, approved: 0 };
      countMap[r.event_id].total++;
      if (r.status === "approved") countMap[r.event_id].approved++;
    });
    return events
      .map((e) => ({
        ...e,
        totalRegs: countMap[e.id]?.total || 0,
        approvedRegs: countMap[e.id]?.approved || 0,
        revenue: (countMap[e.id]?.approved || 0) * (Number(e.price) || 0),
      }))
      .sort((a, b) => b.totalRegs - a.totalRegs)
      .slice(0, 5);
  }, [events, trends]);

  const chartTooltipStyle = {
    background: "hsl(var(--card))",
    border: "1px solid hsl(var(--border))",
    borderRadius: "8px",
    fontSize: "12px",
    color: "hsl(var(--card-foreground))",
  };

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
            Analytics
          </h2>
          <div className="ml-auto">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              aria-label="Toggle dark mode"
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
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
                icon: DollarSign,
                value: `৳${revenueData.total.toLocaleString()}`,
                label: "Total Revenue",
              },
              {
                icon: Percent,
                value: `${conversionRate}%`,
                label: "Approval Rate",
                trend: (conversionRate >= 50 ? "up" : "down") as "up" | "down",
              },
            ].map((s) => (
              <div
                key={s.label}
                className="snap-start shrink-0 w-40 sm:w-48 lg:w-auto"
              >
                <MetricCard {...s} />
              </div>
            ))}
          </div>

          <div className="grid lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium">
                  Registration Trend
                </CardTitle>
              </CardHeader>
              <CardContent>
                {dailyTrend.length > 0 ? (
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={dailyTrend}>
                        <defs>
                          <linearGradient
                            id="colorTrend"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="5%"
                              stopColor="hsl(47, 95%, 55%)"
                              stopOpacity={0.3}
                            />
                            <stop
                              offset="95%"
                              stopColor="hsl(47, 95%, 55%)"
                              stopOpacity={0}
                            />
                          </linearGradient>
                        </defs>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="hsl(var(--border))"
                        />
                        <XAxis
                          dataKey="day"
                          tick={{
                            fontSize: 11,
                            fill: "hsl(var(--muted-foreground))",
                          }}
                        />
                        <YAxis
                          allowDecimals={false}
                          tick={{
                            fontSize: 11,
                            fill: "hsl(var(--muted-foreground))",
                          }}
                        />
                        <Tooltip contentStyle={chartTooltipStyle} />
                        <Area
                          type="monotone"
                          dataKey="count"
                          stroke="hsl(47, 95%, 55%)"
                          fill="url(#colorTrend)"
                          strokeWidth={2}
                          name="Registrations"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-16">
                    No registration data yet.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium">
                  Status Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                {statusDistribution.length > 0 ? (
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={statusDistribution}
                          cx="50%"
                          cy="45%"
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={4}
                          dataKey="value"
                        >
                          {statusDistribution.map((_, idx) => (
                            <Cell
                              key={idx}
                              fill={PIE_COLORS[idx % PIE_COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Legend wrapperStyle={{ fontSize: "12px" }} />
                        <Tooltip contentStyle={chartTooltipStyle} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-16">
                    No data yet.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium">
                  Event Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                {eventPerformance.length > 0 ? (
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={eventPerformance} layout="vertical">
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="hsl(var(--border))"
                        />
                        <XAxis
                          type="number"
                          allowDecimals={false}
                          tick={{
                            fontSize: 11,
                            fill: "hsl(var(--muted-foreground))",
                          }}
                        />
                        <YAxis
                          dataKey="name"
                          type="category"
                          width={110}
                          tick={{
                            fontSize: 11,
                            fill: "hsl(var(--muted-foreground))",
                          }}
                        />
                        <Tooltip contentStyle={chartTooltipStyle} />
                        <Bar
                          dataKey="registrations"
                          fill="hsl(47, 95%, 55%)"
                          radius={[0, 4, 4, 0]}
                          name="Registrations"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-16">
                    No event data yet.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium">
                  Revenue by Event
                </CardTitle>
              </CardHeader>
              <CardContent>
                {revenueData.byEvent.length > 0 ? (
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={revenueData.byEvent}>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="hsl(var(--border))"
                        />
                        <XAxis
                          dataKey="name"
                          tick={{
                            fontSize: 10,
                            fill: "hsl(var(--muted-foreground))",
                          }}
                          interval={0}
                          angle={-20}
                          textAnchor="end"
                          height={50}
                        />
                        <YAxis
                          tick={{
                            fontSize: 11,
                            fill: "hsl(var(--muted-foreground))",
                          }}
                        />
                        <Tooltip
                          contentStyle={chartTooltipStyle}
                          formatter={(val: any) =>
                            `৳${Number(val).toLocaleString()}`
                          }
                        />
                        <Bar
                          dataKey="revenue"
                          fill="hsl(152, 69%, 40%)"
                          radius={[4, 4, 0, 0]}
                          name="Revenue (৳)"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-16">
                    No revenue data yet.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium">
                Top Events
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {topEvents.length > 0 ? (
                <div className="overflow-x-auto w-full [&::-webkit-scrollbar]:hidden">
                  <div className="px-4 sm:px-6 pb-4 pt-2">
                    <table className="w-full text-sm min-w-[500px]">
                      <thead>
                        <tr className="border-b text-left text-xs text-muted-foreground uppercase tracking-wider">
                          <th className="pb-3 font-medium">Event</th>
                          <th className="pb-3 font-medium text-center">
                            Status
                          </th>
                          <th className="pb-3 font-medium text-right">
                            Registrations
                          </th>
                          <th className="pb-3 font-medium text-right">
                            Approved
                          </th>
                          <th className="pb-3 font-medium text-right">
                            Revenue
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {topEvents.map((e) => (
                          <tr
                            key={e.id}
                            className="border-b last:border-0 hover:bg-muted/30 cursor-pointer transition-colors"
                            onClick={() =>
                              router.push(`/events/${e.id}/registrations`)
                            }
                          >
                            <td className="py-3 font-medium truncate max-w-[200px]">
                              {e.title}
                            </td>
                            <td className="py-3 text-center">
                              <Badge
                                variant="secondary"
                                className="text-[10px]"
                              >
                                {e.status === "published"
                                  ? "Live"
                                  : e.status.charAt(0).toUpperCase() +
                                    e.status.slice(1)}
                              </Badge>
                            </td>
                            <td className="py-3 text-right tabular-nums">
                              {e.totalRegs}
                            </td>
                            <td className="py-3 text-right tabular-nums">
                              {e.approvedRegs}
                            </td>
                            <td className="py-3 text-right tabular-nums font-medium">
                              ৳{e.revenue.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No events yet.
                </p>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
};

const MetricCard = ({
  icon: Icon,
  value,
  label,
  highlight,
  trend,
}: {
  icon: typeof CalendarDays;
  value: number | string;
  label: string;
  highlight?: boolean;
  trend?: "up" | "down";
}) => (
  <Card
    className={`group hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 overflow-hidden ${highlight ? "border-primary/30" : ""}`}
  >
    <CardContent className="p-4 sm:p-5 relative">
      {highlight && (
        <div className="absolute inset-0 bg-primary/5 pointer-events-none" />
      )}
      <div className="flex items-start justify-between mb-3 relative">
        <div
          className={`flex h-9 w-9 items-center justify-center rounded-lg transition-transform group-hover:scale-110
          ${highlight ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
        >
          <Icon className="h-4 w-4" />
        </div>
        {trend === "up" && <ArrowUpRight className="h-4 w-4 text-green-500" />}
        {trend === "down" && (
          <ArrowDownRight className="h-4 w-4 text-destructive" />
        )}
        {!trend && (
          <TrendingUp className="h-3.5 w-3.5 text-muted-foreground/30" />
        )}
      </div>
      <p className="text-2xl sm:text-3xl font-bold tracking-tight relative">
        {value}
      </p>
      <p className="text-xs text-muted-foreground mt-0.5 relative">{label}</p>
    </CardContent>
  </Card>
);

export default Analytics;
