"use client"

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"

const chartConfig = {
  predicted: { label: "Predicted 30d units", color: "var(--chart-1)" },
} satisfies ChartConfig

export function CategoryChart({
  data,
}: {
  data: { category: string; predicted: number }[]
}) {
  return (
    <ChartContainer config={chartConfig} className="h-[260px] w-full">
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }}>
        <CartesianGrid horizontal={false} strokeDasharray="3 3" />
        <XAxis type="number" tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
        <YAxis
          type="category"
          dataKey="category"
          tickLine={false}
          axisLine={false}
          width={96}
          tick={{ fontSize: 12 }}
        />
        <ChartTooltip
          content={<ChartTooltipContent indicator="line" />}
        />
        <Bar dataKey="predicted" fill="var(--color-predicted)" radius={[0, 6, 6, 0]} barSize={22} />
      </BarChart>
    </ChartContainer>
  )
}
