import { Link } from "@/bolt-ui/components/bolt-router-link"
import { useBoltDashboardActions } from "@/bolt-ui/components/bolt-router-link-provider"
import { Badge } from "@/bolt-ui/components/ui/badge"
import { Button } from "@/bolt-ui/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/bolt-ui/components/ui/card"
import { Progress } from "@/bolt-ui/components/ui/progress"
import { useBoltDashboardData } from "@/bolt-ui/lib/dashboard-data"
import { cn } from "@/bolt-ui/lib/utils"
import { useAuthStore } from "@/bolt-ui/store/auth-shim"
import { formatDistanceToNow } from "date-fns"
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle,
  ChevronRight,
  Clock,
  FileHeart,
  LayoutDashboard,
  Monitor,
  ScanLine,
  Sparkles,
  TrendingUp,
  Upload,
  Zap,
} from "lucide-react"
import type { ReactNode } from "react"
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

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

const GLASS_CARD =
  "border border-white/10 bg-card/55 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.28)]"

function displayName(name?: string) {
  if (!name) return "Doctor"
  return name.split(" ").slice(0, 2).join(" ")
}

function formatTodayLabel() {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

function timeGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return "Good Morning"
  if (hour < 17) return "Good Afternoon"
  return "Good Evening"
}

function KpiCard({
  caption,
  captionClassName,
  icon,
  iconClassName,
  label,
  progress,
  value,
}: {
  caption?: ReactNode
  captionClassName?: string
  icon: ReactNode
  iconClassName: string
  label: string
  progress?: number
  value: string | number
}) {
  return (
    <Card className={cn(GLASS_CARD, "py-0")}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
            <p className="mt-1 text-3xl font-bold tracking-tight">{value}</p>
            {progress !== undefined ? (
              <Progress value={progress} className="mt-3 h-1.5 bg-white/5" />
            ) : caption ? (
              <div className={cn("mt-2 text-xs", captionClassName ?? "text-muted-foreground")}>{caption}</div>
            ) : null}
          </div>
          <div className={cn("flex size-11 shrink-0 items-center justify-center rounded-xl border", iconClassName)}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function QuickAction({
  description,
  href,
  icon,
  label,
  onClick,
}: {
  description: string
  href?: string
  icon: ReactNode
  label: string
  onClick?: () => void
}) {
  const content = (
    <>
      <div className="flex size-10 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
    </>
  )

  if (href) {
    return (
      <Link
        className="group flex items-center gap-3 rounded-xl border border-white/10 bg-card/40 p-4 transition-all hover:border-primary/30 hover:bg-card/70"
        to={href}
      >
        {content}
      </Link>
    )
  }

  return (
    <button
      className="group flex w-full items-center gap-3 rounded-xl border border-white/10 bg-card/40 p-4 text-left transition-all hover:border-primary/30 hover:bg-card/70"
      onClick={onClick}
      type="button"
    >
      {content}
    </button>
  )
}

export function DashboardPage() {
  const { user } = useAuthStore()
  const actions = useBoltDashboardActions()
  const { DIAGNOSIS_DISTRIBUTION, MOCK_ACTIVITY, MOCK_ECG_CASES, MOCK_STATS, MONTHLY_CASES } = useBoltDashboardData()
  const recentCases = MOCK_ECG_CASES.slice(0, 5)
  const criticalCount = MOCK_STATS.criticalCases

  return (
    <div className="space-y-7 pb-2">
      {/* Executive Command Center Hero */}
      <section
        className={cn(
          GLASS_CARD,
          "relative overflow-hidden rounded-2xl border-primary/20 bg-gradient-to-br from-primary/10 via-card/70 to-card/40 p-6 sm:p-8",
        )}
      >
        <div className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 left-1/3 size-48 rounded-full bg-chart-2/10 blur-3xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <LayoutDashboard className="size-4 text-primary" />
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
                Executive Medical Command Center
              </p>
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Welcome back, {displayName(user?.name)}
              </h1>
              <p className="mt-1 text-base text-muted-foreground">
                {timeGreeting()} • {formatTodayLabel()}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge className="border-chart-2/30 bg-chart-2/10 text-chart-2" variant="outline">
                System Online
              </Badge>
              <Badge className="border-chart-2/30 bg-chart-2/10 text-chart-2" variant="outline">
                AI Engine Online
              </Badge>
              <Badge className="border-primary/30 bg-primary/10 text-primary" variant="outline">
                Enterprise Clinical Operations
              </Badge>
            </div>
          </div>
          <Button className="shrink-0 shadow-lg shadow-primary/20" onClick={actions.onUploadEcg} size="lg">
            <Upload className="size-4" />
            Upload ECG
          </Button>
        </div>
      </section>

      {/* Critical Alert Banner */}
      {criticalCount > 0 ? (
        <div className="flex flex-col gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-destructive/30 bg-destructive/15">
              <AlertTriangle className="size-5 text-destructive" />
            </div>
            <div>
              <p className="text-sm font-semibold text-destructive">Critical Alert — Immediate Clinical Review Required</p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {criticalCount} critical ECG {criticalCount === 1 ? "case requires" : "cases require"} immediate attention.
              </p>
            </div>
          </div>
          <Button onClick={actions.onViewAllCases} size="sm" variant="destructive">
            Review Critical Cases
            <ArrowRight className="size-4" />
          </Button>
        </div>
      ) : null}

      {/* Premium KPI Cards */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          caption={
            <span className="inline-flex items-center gap-1">
              <TrendingUp className="size-3" /> +{MOCK_STATS.casesThisMonth} this month
            </span>
          }
          captionClassName="text-chart-2"
          icon={<FileHeart className="size-5 text-primary" />}
          iconClassName="border-primary/20 bg-primary/10"
          label="Total Cases"
          value={MOCK_STATS.totalCases}
        />
        <KpiCard
          caption="Awaiting clinical review"
          icon={<Clock className="size-5 text-chart-5" />}
          iconClassName="border-chart-5/20 bg-chart-5/10"
          label="Pending Reviews"
          value={MOCK_STATS.pendingReviews}
        />
        <KpiCard
          caption="Immediate attention required"
          captionClassName="text-destructive"
          icon={<AlertTriangle className="size-5 text-destructive" />}
          iconClassName="border-destructive/20 bg-destructive/10"
          label="Critical Cases"
          value={MOCK_STATS.criticalCases}
        />
        <KpiCard
          caption={`${MOCK_STATS.avgConfidence}% model confidence`}
          icon={<Sparkles className="size-5 text-chart-2" />}
          iconClassName="border-chart-2/20 bg-chart-2/10"
          label="AI Accuracy"
          progress={MOCK_STATS.avgConfidence}
          value={`${MOCK_STATS.avgConfidence}%`}
        />
      </section>

      {/* Quick Actions */}
      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Quick Actions</h2>
          <p className="text-sm text-muted-foreground">Launch core clinical workflows from the command center.</p>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <QuickAction
            description="Capture and analyze a new ECG study"
            icon={<Upload className="size-4" />}
            label="Upload ECG"
            onClick={actions.onUploadEcg}
          />
          <QuickAction
            description="Hospital-grade clinical workstation"
            href="/ecg-workspace"
            icon={<ScanLine className="size-4" />}
            label="Open Workspace"
          />
          <QuickAction
            description="Professional calibrated ECG viewer"
            href="/ecg-viewer"
            icon={<FileHeart className="size-4" />}
            label="ECG Pro Viewer"
          />
          <QuickAction
            description="Bedside live ECG monitoring"
            href="/ecg-live-monitor"
            icon={<Monitor className="size-4" />}
            label="Live Monitor"
          />
        </div>
      </section>

      {/* Analytics Row */}
      <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className={cn(GLASS_CARD, "xl:col-span-2 py-0")}>
          <CardHeader className="border-b border-white/5 pb-4">
            <CardTitle className="text-lg">Monthly Analytics</CardTitle>
            <CardDescription>ECG case volume and critical findings over the past 6 months</CardDescription>
          </CardHeader>
          <CardContent className="pb-6 pt-4">
            <div className="h-56">
              <ResponsiveContainer height="100%" width="100%">
                <AreaChart data={MONTHLY_CASES} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <defs>
                    <linearGradient id="premiumCasesGrad" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="premiumCriticalGrad" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-destructive)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="var(--color-destructive)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
                  <XAxis axisLine={false} dataKey="month" tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }} tickLine={false} />
                  <YAxis axisLine={false} tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      background: "color-mix(in oklch, var(--color-card) 92%, transparent)",
                      backdropFilter: "blur(12px)",
                      border: "1px solid var(--color-border)",
                      borderRadius: "0.75rem",
                      fontSize: "12px",
                    }}
                  />
                  <Area
                    dataKey="cases"
                    fill="url(#premiumCasesGrad)"
                    name="Total Cases"
                    stroke="var(--color-primary)"
                    strokeWidth={2.5}
                    type="monotone"
                  />
                  <Area
                    dataKey="critical"
                    fill="url(#premiumCriticalGrad)"
                    name="Critical"
                    stroke="var(--color-destructive)"
                    strokeWidth={2}
                    type="monotone"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className={cn(GLASS_CARD, "py-0")}>
          <CardHeader className="border-b border-white/5 pb-4">
            <CardTitle className="text-lg">Findings Chart</CardTitle>
            <CardDescription>Distribution by primary diagnosis</CardDescription>
          </CardHeader>
          <CardContent className="pb-6 pt-4">
            <div className="h-40">
              <ResponsiveContainer height="100%" width="100%">
                <PieChart>
                  <Pie cx="50%" cy="50%" data={DIAGNOSIS_DISTRIBUTION} dataKey="value" innerRadius={42} outerRadius={68}>
                    {DIAGNOSIS_DISTRIBUTION.map((entry) => (
                      <Cell key={entry.name} fill={entry.fill} stroke="transparent" />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "color-mix(in oklch, var(--color-card) 92%, transparent)",
                      backdropFilter: "blur(12px)",
                      border: "1px solid var(--color-border)",
                      borderRadius: "0.75rem",
                      fontSize: "11px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 space-y-2">
              {DIAGNOSIS_DISTRIBUTION.map((item) => (
                <div className="flex items-center justify-between text-xs" key={item.name}>
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="size-2.5 shrink-0 rounded-full" style={{ background: item.fill }} />
                    <span className="truncate text-muted-foreground">{item.name}</span>
                  </div>
                  <span className="font-semibold">{item.value}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Recent Cases + Activity */}
      <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card className={cn(GLASS_CARD, "overflow-hidden py-0 xl:col-span-2")}>
          <CardHeader className="flex-row items-center justify-between space-y-0 border-b border-white/5 pb-4">
            <div>
              <CardTitle className="text-lg">Recent Cases</CardTitle>
              <CardDescription>Latest ECG analyses across your clinical queue</CardDescription>
            </div>
            <Button asChild className="text-xs" size="sm" variant="ghost">
              <Link to="/history">
                View all
                <ChevronRight className="size-3" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-white/5">
              {recentCases.map((item) => (
                <Link
                  className="flex items-center gap-3 px-5 py-4 transition-colors hover:bg-white/[0.03]"
                  key={item.id}
                  to={`/cases/${item.id}`}
                >
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10">
                    <FileHeart className="size-4 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-semibold">{item.patientInfo.name}</span>
                      <Badge
                        className={cn(
                          "h-4 shrink-0 px-1.5 py-0 text-[10px]",
                          PRIORITY_COLORS[item.priority as keyof typeof PRIORITY_COLORS],
                        )}
                        variant="outline"
                      >
                        {item.priority}
                      </Badge>
                    </div>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{item.id}</span>
                      <span className="text-white/20">·</span>
                      <span>{item.parameters.rhythm}</span>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {STATUS_ICON[item.status as keyof typeof STATUS_ICON]}
                    <span className="text-xs capitalize text-muted-foreground">{item.status}</span>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className={cn(GLASS_CARD, "overflow-hidden py-0")}>
          <CardHeader className="border-b border-white/5 pb-4">
            <CardTitle className="text-lg">Recent Activity</CardTitle>
            <CardDescription>Live platform and clinical workflow events</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-white/5">
              {MOCK_ACTIVITY.slice(0, 6).map((event) => (
                <div className="px-5 py-4" key={event.id}>
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md border border-white/10 bg-white/5">
                      <Zap className="size-3.5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs leading-relaxed">
                        <span className="font-semibold">{event.user}</span>{" "}
                        <span className="text-muted-foreground">{event.action}</span>{" "}
                        <span className="font-medium">{event.target}</span>
                      </p>
                      <p className="mt-1 text-[10px] text-muted-foreground">
                        {formatDistanceToNow(new Date(event.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Premium Upload CTA */}
      <Card className="overflow-hidden border-primary/25 bg-gradient-to-r from-primary/15 via-card/60 to-card/40 py-0 backdrop-blur-xl">
        <CardContent className="flex flex-col items-center justify-between gap-5 p-6 sm:flex-row">
          <div className="flex items-center gap-4">
            <div className="flex size-14 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10 shadow-inner">
              <Upload className="size-7 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold tracking-tight">Upload a New ECG</h3>
              <p className="text-sm text-muted-foreground">AI-powered analysis and clinical routing in under 30 seconds</p>
            </div>
          </div>
          <Button asChild className="shadow-lg shadow-primary/20" size="lg">
            <Link to="/upload">
              Upload ECG
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
