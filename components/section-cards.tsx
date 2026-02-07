import { IconTrendingUp, IconPhone, IconCoin, IconCurrencyDollar } from "@tabler/icons-react"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { Agent, DashboardStats } from "@/lib/types"

export function SectionCards({ stats, agents }: { stats: DashboardStats; agents: Agent[] }) {
  return (
    <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Total Calls</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {stats.total_calls.toLocaleString()}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <IconTrendingUp />
              All time
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Calls handled across all agents <IconPhone className="size-4" />
          </div>
          <div className="text-muted-foreground">
            {agents.length} agent{agents.length !== 1 ? "s" : ""} active
          </div>
        </CardFooter>
      </Card>
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Calls Today</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {stats.calls_today.toLocaleString()}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <IconTrendingUp />
              Today
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Calls handled today <IconTrendingUp className="size-4" />
          </div>
          <div className="text-muted-foreground">
            Across all agents
          </div>
        </CardFooter>
      </Card>
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Token Usage</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {stats.total_tokens >= 1000000
              ? `${(stats.total_tokens / 1000000).toFixed(2)}M`
              : stats.total_tokens >= 1000
                ? `${(stats.total_tokens / 1000).toFixed(1)}K`
                : stats.total_tokens.toLocaleString()}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <IconTrendingUp />
              Total
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Total tokens consumed <IconCoin className="size-4" />
          </div>
          <div className="text-muted-foreground">
            Across all agents
          </div>
        </CardFooter>
      </Card>
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Money Spent</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            ${stats.total_money_spent.toFixed(2)}
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <IconTrendingUp />
              Total
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Total spending <IconCurrencyDollar className="size-4" />
          </div>
          <div className="text-muted-foreground">
            {agents.map((a) => `${a.name}: $${a.money_spent.toFixed(2)}`).join(" / ")}
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
