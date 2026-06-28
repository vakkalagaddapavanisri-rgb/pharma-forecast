"use client"

import { Area, AreaChart, CartesianGrid, Line, ReferenceLine, XAxis, YAxis } from "recharts"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import type { MedicineForecast } from "@/lib/pharmacy-data"

const chartConfig = {
  actual: { label: "Actual demand", color: "var(--chart-2)" },
  predicted: { label: "Predicted demand", color: "var(--chart-1)" },
  band: { label: "Confidence range", color: "var(--chart-1)" },
} satisfies ChartConfig

function formatDay(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

export function ForecastChart({ data }: { data: MedicineForecast }) {
  // Merge history + forecast into a single continuous series.
  const historyTail = data.history.slice(-45)
  const merged = [
    ...historyTail.map((p) => ({
      date: p.date,
      actual: p.units,
      predicted: null as number | null,
      band: null as [number, number] | null,
    })),
    ...data.forecast.map((p) => ({
      date: p.date,
      actual: null as number | null,
      predicted: p.predicted,
      band: [p.lower, p.upper] as [number, number],
    })),
  ]

  const firstForecastDate = data.forecast[0]?.date

  return (
    <ChartContainer config={chartConfig} className="h-[320px] w-full">
      <AreaChart data={merged} margin={{ left: 4, right: 8, top: 8, bottom: 0 }}>
        <defs>
          <linearGradient id="fillActual" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-actual)" stopOpacity={0.25} />
            <stop offset="95%" stopColor="var(--color-actual)" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={28}
          tickFormatter={formatDay}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={36}
          tickFormatter={(v) => `${v}`}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              labelFormatter={(_, payload) => formatDay(payload?.[0]?.payload?.date ?? "")}
              indicator="line"
            />
          }
        />
        {firstForecastDate && (
          <ReferenceLine
            x={firstForecastDate}
            stroke="var(--muted-foreground)"
            strokeDasharray="4 4"
            label={{ value: "Today", position: "insideTopRight", fontSize: 11, fill: "var(--muted-foreground)" }}
          />
        )}
        {/* Confidence band */}
        <Area
          dataKey="band"
          stroke="none"
          fill="var(--color-band)"
          fillOpacity={0.12}
          isAnimationActive={false}
          connectNulls
        />
        <Area
          dataKey="actual"
          type="monotone"
          stroke="var(--color-actual)"
          strokeWidth={2}
          fill="url(#fillActual)"
          connectNulls
        />
        <Line
          dataKey="predicted"
          type="monotone"
          stroke="var(--color-predicted)"
          strokeWidth={2}
          strokeDasharray="5 4"
          dot={false}
          connectNulls
        />
      </AreaChart>
    </ChartContainer>
  )
}
