// Pharmacy demand prediction data layer.
// NOTE: This runs fully in-app with seeded, deterministic sample data so the
// dashboard works without a database. When Neon + the AI Gateway are connected,
// the same shapes can be served from the DB and the forecast can be produced by
// an AI model instead of the statistical model below.

export type Category =
  | "Analgesics"
  | "Antibiotics"
  | "Cardiovascular"
  | "Respiratory"
  | "Diabetes"
  | "Vitamins"

export type Medicine = {
  id: string
  name: string
  category: Category
  unitPrice: number
  currentStock: number
  reorderPoint: number
  leadTimeDays: number
  supplier: string
}

export type DailyPoint = {
  date: string // ISO yyyy-mm-dd
  units: number
}

export type ForecastPoint = {
  date: string
  predicted: number
  lower: number
  upper: number
}

export type RiskLevel = "critical" | "low" | "healthy" | "overstock"

export type MedicineForecast = {
  medicine: Medicine
  history: DailyPoint[]
  forecast: ForecastPoint[]
  // Aggregates used across the dashboard
  avgDailyDemand: number
  predicted30d: number
  predictedRevenue30d: number
  trendPct: number // percent change of next 30d vs prior 30d
  daysOfStock: number
  risk: RiskLevel
  recommendedOrder: number
  confidence: number // 0-1
}

// ---------------------------------------------------------------------------
// Seeded deterministic RNG so charts are stable across renders.
// ---------------------------------------------------------------------------
function mulberry32(seed: number) {
  return function () {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function hashString(s: string) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

const MEDICINES: Array<
  Omit<Medicine, "currentStock"> & {
    baseDemand: number
    trend: number // long term daily growth factor
    weekendFactor: number
    seasonalAmp: number // seasonal swing strength 0-1
    seasonalPhase: number // 0-1 offset within the ~120d cycle
    stockCover: number // multiplier of base demand currently in stock
  }
> = [
  { id: "med-001", name: "Paracetamol 500mg", category: "Analgesics", unitPrice: 0.12, reorderPoint: 1800, leadTimeDays: 4, supplier: "MediCore Distribution", baseDemand: 210, trend: 0.0006, weekendFactor: 0.82, seasonalAmp: 0.35, seasonalPhase: 0.1, stockCover: 9 },
  { id: "med-002", name: "Ibuprofen 400mg", category: "Analgesics", unitPrice: 0.18, reorderPoint: 1200, leadTimeDays: 5, supplier: "MediCore Distribution", baseDemand: 150, trend: 0.0004, weekendFactor: 0.88, seasonalAmp: 0.25, seasonalPhase: 0.2, stockCover: 5 },
  { id: "med-003", name: "Amoxicillin 250mg", category: "Antibiotics", unitPrice: 0.34, reorderPoint: 900, leadTimeDays: 7, supplier: "Pharma Wholesale Ltd", baseDemand: 95, trend: 0.001, weekendFactor: 0.7, seasonalAmp: 0.55, seasonalPhase: 0.0, stockCover: 3 },
  { id: "med-004", name: "Azithromycin 500mg", category: "Antibiotics", unitPrice: 0.62, reorderPoint: 500, leadTimeDays: 8, supplier: "Pharma Wholesale Ltd", baseDemand: 48, trend: 0.0012, weekendFactor: 0.72, seasonalAmp: 0.6, seasonalPhase: 0.05, stockCover: 2.2 },
  { id: "med-005", name: "Atorvastatin 20mg", category: "Cardiovascular", unitPrice: 0.28, reorderPoint: 1400, leadTimeDays: 6, supplier: "Global Health Supply", baseDemand: 175, trend: 0.0009, weekendFactor: 0.95, seasonalAmp: 0.08, seasonalPhase: 0.4, stockCover: 11 },
  { id: "med-006", name: "Amlodipine 5mg", category: "Cardiovascular", unitPrice: 0.21, reorderPoint: 1300, leadTimeDays: 6, supplier: "Global Health Supply", baseDemand: 160, trend: 0.0007, weekendFactor: 0.96, seasonalAmp: 0.07, seasonalPhase: 0.3, stockCover: 7 },
  { id: "med-007", name: "Salbutamol Inhaler", category: "Respiratory", unitPrice: 3.4, reorderPoint: 400, leadTimeDays: 9, supplier: "RespiCare Inc", baseDemand: 55, trend: 0.0008, weekendFactor: 0.85, seasonalAmp: 0.5, seasonalPhase: 0.55, stockCover: 4 },
  { id: "med-008", name: "Montelukast 10mg", category: "Respiratory", unitPrice: 0.45, reorderPoint: 600, leadTimeDays: 7, supplier: "RespiCare Inc", baseDemand: 70, trend: 0.0006, weekendFactor: 0.9, seasonalAmp: 0.45, seasonalPhase: 0.5, stockCover: 6 },
  { id: "med-009", name: "Metformin 500mg", category: "Diabetes", unitPrice: 0.16, reorderPoint: 1600, leadTimeDays: 5, supplier: "Global Health Supply", baseDemand: 190, trend: 0.0011, weekendFactor: 0.97, seasonalAmp: 0.06, seasonalPhase: 0.2, stockCover: 8 },
  { id: "med-010", name: "Insulin Glargine", category: "Diabetes", unitPrice: 12.5, reorderPoint: 220, leadTimeDays: 10, supplier: "Global Health Supply", baseDemand: 28, trend: 0.0013, weekendFactor: 0.98, seasonalAmp: 0.05, seasonalPhase: 0.1, stockCover: 2.5 },
  { id: "med-011", name: "Vitamin D3 1000IU", category: "Vitamins", unitPrice: 0.09, reorderPoint: 2000, leadTimeDays: 4, supplier: "NutriSource", baseDemand: 230, trend: 0.0005, weekendFactor: 1.05, seasonalAmp: 0.65, seasonalPhase: 0.6, stockCover: 14 },
  { id: "med-012", name: "Vitamin C 1000mg", category: "Vitamins", unitPrice: 0.11, reorderPoint: 1500, leadTimeDays: 4, supplier: "NutriSource", baseDemand: 185, trend: 0.0004, weekendFactor: 1.08, seasonalAmp: 0.7, seasonalPhase: 0.62, stockCover: 6 },
]

const HISTORY_DAYS = 120
const FORECAST_DAYS = 30
const SEASON_CYCLE = 120 // length of the seasonal cycle in days

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10)
}

function seasonalMultiplier(dayIndex: number, amp: number, phase: number) {
  const t = (dayIndex / SEASON_CYCLE + phase) * Math.PI * 2
  return 1 + amp * Math.sin(t)
}

function buildHistory(
  spec: (typeof MEDICINES)[number],
  rand: () => number,
): DailyPoint[] {
  const points: DailyPoint[] = []
  const today = new Date()
  for (let i = HISTORY_DAYS - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    const dayIndex = HISTORY_DAYS - 1 - i
    const dow = d.getDay()
    const weekend = dow === 0 || dow === 6 ? spec.weekendFactor : 1
    const trend = 1 + spec.trend * dayIndex
    const season = seasonalMultiplier(dayIndex, spec.seasonalAmp, spec.seasonalPhase)
    const noise = 0.85 + rand() * 0.3
    const units = Math.max(0, Math.round(spec.baseDemand * weekend * trend * season * noise))
    points.push({ date: isoDate(d), units })
  }
  return points
}

// Holt-style level + trend with weekly seasonality and a seasonal cycle term.
function buildForecast(
  spec: (typeof MEDICINES)[number],
  history: DailyPoint[],
): ForecastPoint[] {
  const recent = history.slice(-28)
  const recentAvg = recent.reduce((s, p) => s + p.units, 0) / recent.length

  // Estimate residual volatility for confidence bands.
  const variance =
    recent.reduce((s, p) => s + (p.units - recentAvg) ** 2, 0) / recent.length
  const std = Math.sqrt(variance)

  const forecast: ForecastPoint[] = []
  const today = new Date()
  for (let i = 1; i <= FORECAST_DAYS; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() + i)
    const dayIndex = HISTORY_DAYS - 1 + i
    const dow = d.getDay()
    const weekend = dow === 0 || dow === 6 ? spec.weekendFactor : 1
    const trend = 1 + spec.trend * dayIndex
    const season = seasonalMultiplier(dayIndex, spec.seasonalAmp, spec.seasonalPhase)
    const base = spec.baseDemand * weekend * trend * season
    const predicted = Math.max(0, Math.round(base))
    // Bands widen slightly with the horizon.
    const horizonFactor = 1 + i / FORECAST_DAYS
    const band = std * 1.28 * horizonFactor
    forecast.push({
      date: isoDate(d),
      predicted,
      lower: Math.max(0, Math.round(predicted - band)),
      upper: Math.round(predicted + band),
    })
  }
  return forecast
}

function classifyRisk(daysOfStock: number, leadTimeDays: number): RiskLevel {
  if (daysOfStock <= leadTimeDays) return "critical"
  if (daysOfStock <= leadTimeDays * 2) return "low"
  if (daysOfStock >= 45) return "overstock"
  return "healthy"
}

export function getForecasts(): MedicineForecast[] {
  return MEDICINES.map((spec) => {
    const rand = mulberry32(hashString(spec.id))
    const history = buildHistory(spec, rand)
    const forecast = buildForecast(spec, history)

    const avgDailyDemand =
      history.slice(-30).reduce((s, p) => s + p.units, 0) / 30

    const predicted30d = forecast.reduce((s, p) => s + p.predicted, 0)
    const prior30d = history.slice(-30).reduce((s, p) => s + p.units, 0)
    const trendPct = prior30d > 0 ? ((predicted30d - prior30d) / prior30d) * 100 : 0

    const currentStock = Math.round(spec.baseDemand * spec.stockCover)
    const daysOfStock = avgDailyDemand > 0 ? currentStock / avgDailyDemand : 999
    const risk = classifyRisk(daysOfStock, spec.leadTimeDays)

    // Recommend ordering enough to cover lead time + a 21-day buffer.
    const target = avgDailyDemand * (spec.leadTimeDays + 21)
    const recommendedOrder = Math.max(0, Math.round(target - currentStock))

    // Confidence inversely tied to volatility relative to mean.
    const recent = history.slice(-28)
    const mean = recent.reduce((s, p) => s + p.units, 0) / recent.length
    const std = Math.sqrt(
      recent.reduce((s, p) => s + (p.units - mean) ** 2, 0) / recent.length,
    )
    const cv = mean > 0 ? std / mean : 1
    const confidence = Math.max(0.55, Math.min(0.97, 1 - cv))

    const medicine: Medicine = {
      id: spec.id,
      name: spec.name,
      category: spec.category,
      unitPrice: spec.unitPrice,
      currentStock,
      reorderPoint: spec.reorderPoint,
      leadTimeDays: spec.leadTimeDays,
      supplier: spec.supplier,
    }

    return {
      medicine,
      history,
      forecast,
      avgDailyDemand,
      predicted30d,
      predictedRevenue30d: predicted30d * spec.unitPrice,
      trendPct,
      daysOfStock,
      risk,
      recommendedOrder,
      confidence,
    }
  })
}

export const CATEGORIES: Category[] = [
  "Analgesics",
  "Antibiotics",
  "Cardiovascular",
  "Respiratory",
  "Diabetes",
  "Vitamins",
]

export const RISK_LABELS: Record<RiskLevel, string> = {
  critical: "Reorder now",
  low: "Order soon",
  healthy: "Healthy",
  overstock: "Overstock",
}
