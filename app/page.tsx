import { Dashboard } from "@/components/dashboard/dashboard"
import { getForecasts } from "@/lib/pharmacy-data"

export default function Page() {
  const forecasts = getForecasts()
  return <Dashboard forecasts={forecasts} />
}
