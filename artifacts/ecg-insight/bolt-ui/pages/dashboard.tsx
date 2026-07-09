import { Link } from "@/bolt-ui/components/bolt-router-link"
import {
  Activity,
  Upload,
  Clock,
  AlertTriangle,
  TrendingUp,
  FileHeart,
  ArrowRight,
  CheckCircle,
  ChevronRight,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/bolt-ui/components/ui/card"
import { Button } from "@/bolt-ui/components/ui/button"
import { Badge } from "@/bolt-ui/components/ui/badge"
import { Progress } from "@/bolt-ui/components/ui/progress"
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
} from "recharts"
import { useAuthStore } from "@/bolt-ui/store/auth-shim"
import { useBoltDashboardData } from "@/bolt-ui/lib/dashboard-data"
import { formatDistanceToNow } from "date-fns"
import { cn } from "@/bolt-ui/lib/utils"

const PRIORITY_COLORS = {
  critical: "text-destructive bg-destructive/10 border-destructive/20",
  urgent: "text-chart-5 bg-chart-5/10 border-chart-5/20",
  routine: "text-chart-2 bg-chart-2/10 border-chart-2/20",
}

const STATUS_ICON = {
  completed: <CheckCircle className="size-3.5 text-chart-2" />,
  reviewing: <Clock className="size-3.5 text-chart-5" />,
  pending: <Clock className="size-3.5 text-muted-foreground" />,
  analyzing: <Activity className="size-3.5 text-primary" />,
  reviewed: <CheckCircle className="size-3.5 text-chart-2" />,
}

export function DashboardPage() {
  const { user } = useAuthStore()
  const { MOCK_ECG_CASES, MOCK_ACTIVITY, MOCK_STATS, MONTHLY_CASES, DIAGNOSIS_DISTRIBUTION } = useBoltDashboardData()
  const recentCases = MOCK_ECG_CASES.slice(0, 4)

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="scroll-m-20 text-2xl font-bold tracking-tight">
            Welcome back, {user?.name?.split(" ").slice(0, 2).join(" ")}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>
        <Button asChild>
          <Link to="/upload">
            <Upload className="size-4" />
            Upload ECG
          </Link>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border border-border">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Cases</p>
                <p className="text-2xl font-bold mt-0.5">{MOCK_STATS.totalCases}</p>
                <p className="text-xs text-chart-2 mt-1 flex items-center gap-1">
                  <TrendingUp className="size-3" /> +{MOCK_STATS.casesThisMonth} this month
                </p>
              </div>
              <div className="size-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <FileHeart className="size-4.5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Pending Reviews</p>
                <p className="text-2xl font-bold mt-0.5">{MOCK_STATS.pendingReviews}</p>
                <p className="text-xs text-muted-foreground mt-1">Awaiting review</p>
              </div>
              <div className="size-9 rounded-lg bg-chart-5/10 flex items-center justify-center">
                <Clock className="size-4.5 text-chart-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Critical Cases</p>
                <p className="text-2xl font-bold mt-0.5">{MOCK_STATS.criticalCases}</p>
                <p className="text-xs text-destructive mt-1">Immediate attention</p>
              </div>
              <div className="size-9 rounded-lg bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="size-4.5 text-destructive" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground">AI Accuracy</p>
                <p className="text-2xl font-bold mt-0.5">{MOCK_STATS.avgConfidence}%</p>
                <Progress value={MOCK_STATS.avgConfidence} className="h-1.5 mt-2" />
              </div>
              <div className="size-9 rounded-lg bg-chart-2/10 flex items-center justify-center">
                <Activity className="size-4.5 text-chart-2" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Monthly Cases Chart */}
        <Card className="lg:col-span-2 border border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Monthly Cases</CardTitle>
            <CardDescription>ECG analyses over the past 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={MONTHLY_CASES} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="casesGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="criticalGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-destructive)" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="var(--color-destructive)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--color-card)",
                      border: "1px solid var(--color-border)",
                      borderRadius: "0.5rem",
                      fontSize: "12px",
                    }}
                  />
                  <Area type="monotone" dataKey="cases" stroke="var(--color-primary)" fill="url(#casesGrad)" strokeWidth={2} name="Total Cases" />
                  <Area type="monotone" dataKey="critical" stroke="var(--color-destructive)" fill="url(#criticalGrad)" strokeWidth={2} name="Critical" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Diagnosis Distribution */}
        <Card className="border border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Findings</CardTitle>
            <CardDescription>Distribution by diagnosis</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-32">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={DIAGNOSIS_DISTRIBUTION} dataKey="value" cx="50%" cy="50%" innerRadius={30} outerRadius={55}>
                    {DIAGNOSIS_DISTRIBUTION.map((entry) => (
                      <Cell key={entry.name} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "var(--color-card)",
                      border: "1px solid var(--color-border)",
                      borderRadius: "0.5rem",
                      fontSize: "11px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-1.5 mt-2">
              {DIAGNOSIS_DISTRIBUTION.map((d) => (
                <div key={d.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="size-2 rounded-full shrink-0" style={{ background: d.fill }} />
                    <span className="text-muted-foreground truncate max-w-[120px]">{d.name}</span>
                  </div>
                  <span className="font-medium">{d.value}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent Cases */}
        <Card className="lg:col-span-2 border border-border">
          <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-base">Recent Cases</CardTitle>
              <CardDescription className="text-xs">Latest ECG analyses</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild className="text-xs">
              <Link to="/history">View all <ChevronRight className="size-3" /></Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {recentCases.map((c) => (
                <Link
                  key={c.id}
                  to={`/cases/${c.id}`}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors"
                >
                  <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <FileHeart className="size-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">{c.patientInfo.name}</span>
                      <Badge
                        variant="outline"
                        className={cn("text-[10px] px-1.5 py-0 h-4 shrink-0", PRIORITY_COLORS[c.priority as keyof typeof PRIORITY_COLORS])}
                      >
                        {c.priority}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground">{c.id}</span>
                      <span className="text-muted-foreground/50">·</span>
                      <span className="text-xs text-muted-foreground">{c.parameters.rhythm}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {STATUS_ICON[c.status as keyof typeof STATUS_ICON]}
                    <span className="text-xs text-muted-foreground capitalize">{c.status}</span>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Activity Feed */}
        <Card className="border border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Activity</CardTitle>
            <CardDescription className="text-xs">Recent platform activity</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {MOCK_ACTIVITY.slice(0, 5).map((event) => (
                <div key={event.id} className="px-4 py-3">
                  <p className="text-xs">
                    <span className="font-medium">{event.user}</span>{" "}
                    <span className="text-muted-foreground">{event.action}</span>{" "}
                    <span className="font-medium">{event.target}</span>
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {formatDistanceToNow(new Date(event.createdAt), { addSuffix: true })}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Upload Card */}
      <Card className="border border-primary/20 bg-primary/5">
        <CardContent className="flex flex-col sm:flex-row items-center justify-between gap-4 p-6">
          <div className="flex items-center gap-4">
            <div className="size-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Upload className="size-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">Upload a New ECG</h3>
              <p className="text-sm text-muted-foreground">Get AI-powered analysis in under 30 seconds</p>
            </div>
          </div>
          <Button asChild>
            <Link to="/upload">
              Upload ECG <ArrowRight className="size-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
