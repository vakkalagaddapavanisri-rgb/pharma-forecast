"use client"

import { useMemo, useState } from "react"
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Boxes,
  CalendarClock,
  Pill,
  Search,
  Sparkles,
  TrendingUp,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"
import {
  CATEGORIES,
  RISK_LABELS,
  type MedicineForecast,
  type RiskLevel,
} from "@/lib/pharmacy-data"
import { ForecastChart } from "./forecast-chart"
import { CategoryChart } from "./category-chart"

const RISK_STYLES: Record<RiskLevel, string> = {
  critical: "bg-destructive/10 text-destructive border-destructive/20",
  low: "bg-chart-3/15 text-chart-3 border-chart-3/25",
  healthy: "bg-chart-4/15 text-chart-4 border-chart-4/25",
  overstock: "bg-muted text-muted-foreground border-border",
}

function currency(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })
}

function num(n: number) {
  return Math.round(n).toLocaleString("en-US")
}

export function Dashboard({ forecasts }: { forecasts: MedicineForecast[] }) {
  const [category, setCategory] = useState<string>("all")
  const [query, setQuery] = useState("")
  const [selectedId, setSelectedId] = useState<string>(forecasts[0]?.medicine.id ?? "")

  const filtered = useMemo(() => {
    return forecasts.filter((f) => {
      const matchCat = category === "all" || f.medicine.category === category
      const matchQuery = f.medicine.name.toLowerCase().includes(query.toLowerCase())
      return matchCat && matchQuery
    })
  }, [forecasts, category, query])

  const selected =
    forecasts.find((f) => f.medicine.id === selectedId) ?? filtered[0] ?? forecasts[0]

  // KPI aggregates across full catalog.
  const kpis = useMemo(() => {
    const totalPredicted = forecasts.reduce((s, f) => s + f.predicted30d, 0)
    const totalRevenue = forecasts.reduce((s, f) => s + f.predictedRevenue30d, 0)
    const priorPredicted = forecasts.reduce(
      (s, f) => s + f.history.slice(-30).reduce((a, p) => a + p.units, 0),
      0,
    )
    const growth = priorPredicted > 0 ? ((totalPredicted - priorPredicted) / priorPredicted) * 100 : 0
    const reorderCount = forecasts.filter((f) => f.risk === "critical" || f.risk === "low").length
    const avgConfidence =
      forecasts.reduce((s, f) => s + f.confidence, 0) / forecasts.length
    return { totalPredicted, totalRevenue, growth, reorderCount, avgConfidence }
  }, [forecasts])

  const categoryData = useMemo(() => {
    return CATEGORIES.map((c) => ({
      category: c,
      predicted: forecasts
        .filter((f) => f.medicine.category === c)
        .reduce((s, f) => s + f.predicted30d, 0),
    })).sort((a, b) => b.predicted - a.predicted)
  }, [forecasts])

  const reorderList = useMemo(
    () =>
      [...forecasts]
        .filter((f) => f.risk === "critical" || f.risk === "low")
        .sort((a, b) => a.daysOfStock - b.daysOfStock),
    [forecasts],
  )

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:flex">
        <div className="flex items-center gap-2.5 px-6 py-5">
          <div className="flex size-9 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
            <Pill className="size-5" />
          </div>
          <div className="leading-tight">
            <p className="text-sm font-semibold">MediForecast</p>
            <p className="text-xs text-sidebar-foreground/60">Demand Intelligence</p>
          </div>
        </div>

        <nav className="mt-2 flex flex-col gap-1 px-3 text-sm">
          {[
            { icon: Activity, label: "Overview", active: true },
            { icon: TrendingUp, label: "Forecasts" },
            { icon: Boxes, label: "Inventory" },
            { icon: AlertTriangle, label: "Reorder Alerts" },
            { icon: CalendarClock, label: "Suppliers" },
          ].map((item) => (
            <button
              key={item.label}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-left transition-colors",
                item.active
                  ? "bg-sidebar-accent text-sidebar-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
              )}
            >
              <item.icon className="size-4" />
              {item.label}
              {item.label === "Reorder Alerts" && kpis.reorderCount > 0 && (
                <span className="ml-auto rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-semibold text-sidebar-primary-foreground">
                  {kpis.reorderCount}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="mt-auto m-3 rounded-lg border border-sidebar-border/60 bg-sidebar-accent/40 p-3">
          <div className="flex items-center gap-2 text-xs font-medium">
            <Sparkles className="size-3.5 text-sidebar-primary" />
            AI Forecast Model
          </div>
          <p className="mt-1.5 text-xs text-sidebar-foreground/60">
            Trend + seasonality model. Connect the AI Gateway for model-driven predictions.
          </p>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-x-hidden">
        {/* Header */}
        <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur">
          <div className="flex flex-col gap-4 px-5 py-4 md:flex-row md:items-center md:justify-between md:px-8">
            <div>
              <h1 className="text-lg font-semibold tracking-tight text-balance">
                Medicine Demand Prediction
              </h1>
              <p className="text-sm text-muted-foreground">
                30-day forecast across {forecasts.length} products
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search medicines"
                  className="h-9 w-44 rounded-md border border-input bg-card pl-8 pr-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="h-9 w-[160px]">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </header>

        <div className="space-y-6 p-5 md:p-8">
          {/* KPI cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              icon={TrendingUp}
              label="Predicted demand (30d)"
              value={`${num(kpis.totalPredicted)} units`}
              delta={kpis.growth}
              hint="vs previous 30 days"
            />
            <KpiCard
              icon={Boxes}
              label="Projected revenue (30d)"
              value={currency(kpis.totalRevenue)}
              delta={kpis.growth}
              hint="based on unit pricing"
            />
            <KpiCard
              icon={AlertTriangle}
              label="Need reordering"
              value={`${kpis.reorderCount} products`}
              hint="below safe stock threshold"
              tone={kpis.reorderCount > 0 ? "warn" : "default"}
            />
            <KpiCard
              icon={Sparkles}
              label="Avg. forecast confidence"
              value={`${Math.round(kpis.avgConfidence * 100)}%`}
              hint="model certainty score"
            />
          </div>

          {/* Forecast + category */}
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <Card className="xl:col-span-2">
              <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
                <div>
                  <CardTitle className="text-base">Demand forecast</CardTitle>
                  <CardDescription>
                    Historical sales and predicted demand with confidence range
                  </CardDescription>
                </div>
                <Select value={selected?.medicine.id} onValueChange={setSelectedId}>
                  <SelectTrigger className="h-9 w-[180px]">
                    <SelectValue placeholder="Select medicine">
                      {selected?.medicine.name}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {forecasts.map((f) => (
                      <SelectItem key={f.medicine.id} value={f.medicine.id}>
                        {f.medicine.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardHeader>
              <CardContent>
                {selected && <ForecastChart data={selected} />}
                {selected && (
                  <div className="mt-4 grid grid-cols-2 gap-4 border-t border-border pt-4 sm:grid-cols-4">
                    <MiniStat label="Avg daily demand" value={`${num(selected.avgDailyDemand)} u`} />
                    <MiniStat
                      label="Next 30d"
                      value={`${num(selected.predicted30d)} u`}
                      delta={selected.trendPct}
                    />
                    <MiniStat label="Days of stock" value={`${Math.round(selected.daysOfStock)} d`} />
                    <MiniStat label="Confidence" value={`${Math.round(selected.confidence * 100)}%`} />
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Demand by category</CardTitle>
                <CardDescription>Predicted units over next 30 days</CardDescription>
              </CardHeader>
              <CardContent>
                <CategoryChart data={categoryData} />
              </CardContent>
            </Card>
          </div>

          {/* Reorder alerts */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Reorder recommendations</CardTitle>
              <CardDescription>
                Products projected to fall below safe stock within their supplier lead time
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6">Medicine</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Stock</TableHead>
                    <TableHead className="text-right">Days left</TableHead>
                    <TableHead className="text-right">Lead time</TableHead>
                    <TableHead className="text-right pr-6">Suggested order</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reorderList.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                        All products are sufficiently stocked.
                      </TableCell>
                    </TableRow>
                  )}
                  {reorderList.map((f) => (
                    <TableRow key={f.medicine.id} className="cursor-pointer" onClick={() => setSelectedId(f.medicine.id)}>
                      <TableCell className="pl-6">
                        <div className="font-medium">{f.medicine.name}</div>
                        <div className="text-xs text-muted-foreground">{f.medicine.supplier}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn("font-medium", RISK_STYLES[f.risk])}>
                          {RISK_LABELS[f.risk]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{num(f.medicine.currentStock)}</TableCell>
                      <TableCell className="text-right tabular-nums">{Math.round(f.daysOfStock)}</TableCell>
                      <TableCell className="text-right tabular-nums">{f.medicine.leadTimeDays}d</TableCell>
                      <TableCell className="text-right pr-6 font-semibold tabular-nums">
                        {num(f.recommendedOrder)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Catalog grid */}
          <div>
            <h2 className="mb-3 text-sm font-semibold text-muted-foreground">
              Product catalog ({filtered.length})
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((f) => {
                const stockPct = Math.min(100, (f.daysOfStock / 60) * 100)
                return (
                  <button
                    key={f.medicine.id}
                    onClick={() => setSelectedId(f.medicine.id)}
                    className={cn(
                      "rounded-lg border bg-card p-4 text-left transition-colors hover:border-primary/40",
                      selected?.medicine.id === f.medicine.id ? "border-primary/60 ring-1 ring-primary/20" : "border-border",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium leading-tight">{f.medicine.name}</p>
                        <p className="text-xs text-muted-foreground">{f.medicine.category}</p>
                      </div>
                      <Badge variant="outline" className={cn("shrink-0 font-medium", RISK_STYLES[f.risk])}>
                        {RISK_LABELS[f.risk]}
                      </Badge>
                    </div>
                    <div className="mt-4 flex items-end justify-between">
                      <div>
                        <p className="text-2xl font-semibold tabular-nums">{num(f.predicted30d)}</p>
                        <p className="text-xs text-muted-foreground">predicted units / 30d</p>
                      </div>
                      <div
                        className={cn(
                          "flex items-center gap-1 text-sm font-medium",
                          f.trendPct >= 0 ? "text-chart-4" : "text-destructive",
                        )}
                      >
                        {f.trendPct >= 0 ? (
                          <ArrowUpRight className="size-4" />
                        ) : (
                          <ArrowDownRight className="size-4" />
                        )}
                        {Math.abs(f.trendPct).toFixed(1)}%
                      </div>
                    </div>
                    <div className="mt-3">
                      <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                        <span>Stock cover</span>
                        <span>{Math.round(f.daysOfStock)} days</span>
                      </div>
                      <Progress value={stockPct} className="h-1.5" />
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

function KpiCard({
  icon: Icon,
  label,
  value,
  delta,
  hint,
  tone = "default",
}: {
  icon: React.ElementType
  label: string
  value: string
  delta?: number
  hint?: string
  tone?: "default" | "warn"
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{label}</span>
          <span
            className={cn(
              "flex size-8 items-center justify-center rounded-md",
              tone === "warn" ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary",
            )}
          >
            <Icon className="size-4" />
          </span>
        </div>
        <p className="mt-3 text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
        <div className="mt-1 flex items-center gap-2 text-xs">
          {typeof delta === "number" && (
            <span className={cn("flex items-center gap-0.5 font-medium", delta >= 0 ? "text-chart-4" : "text-destructive")}>
              {delta >= 0 ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
              {Math.abs(delta).toFixed(1)}%
            </span>
          )}
          {hint && <span className="text-muted-foreground">{hint}</span>}
        </div>
      </CardContent>
    </Card>
  )
}

function MiniStat({ label, value, delta }: { label: string; value: string; delta?: number }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="mt-0.5 flex items-center gap-1.5">
        <p className="text-lg font-semibold tabular-nums">{value}</p>
        {typeof delta === "number" && (
          <span className={cn("text-xs font-medium", delta >= 0 ? "text-chart-4" : "text-destructive")}>
            {delta >= 0 ? "+" : ""}
            {delta.toFixed(1)}%
          </span>
        )}
      </div>
    </div>
  )
}
