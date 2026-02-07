"use client"

import * as React from "react"
import {
  IconChevronDown,
  IconChevronRight,
  IconPhone,
  IconPlayerPlay,
  IconUser,
  IconRobot,
} from "@tabler/icons-react"
import { format } from "date-fns"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import { ScrollArea } from "@/components/ui/scroll-area"
import type { CallHistoryEntryWithTurns } from "@/lib/types"

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${String(secs).padStart(2, "0")}`
}

function CallRow({ call }: { call: CallHistoryEntryWithTurns }) {
  const [isOpen, setIsOpen] = React.useState(false)
  const timestamp = new Date(call.timestamp)

  return (
    <>
      <TableRow
        className="cursor-pointer hover:bg-muted/50"
        onClick={() => setIsOpen(!isOpen)}
      >
        <TableCell>
          <Button variant="ghost" size="icon" className="size-6">
            {isOpen ? (
              <IconChevronDown className="size-4" />
            ) : (
              <IconChevronRight className="size-4" />
            )}
            <span className="sr-only">Toggle details</span>
          </Button>
        </TableCell>
        <TableCell className="font-medium">
          <div className="flex items-center gap-2">
            <IconPhone className="size-4 text-muted-foreground" />
            {format(timestamp, "MMM d, yyyy")}
          </div>
        </TableCell>
        <TableCell className="text-muted-foreground">
          {format(timestamp, "h:mm a")}
        </TableCell>
        <TableCell>
          <Badge variant="outline">{formatDuration(call.duration_seconds)}</Badge>
        </TableCell>
        <TableCell className="max-w-[300px] truncate text-muted-foreground">
          {call.summary}
        </TableCell>
      </TableRow>
      {isOpen && (
        <TableRow className="bg-muted/30 hover:bg-muted/30">
          <TableCell colSpan={5} className="p-0">
            <div className="px-6 py-4">
              <h4 className="mb-1 text-sm font-medium">Call Summary</h4>
              <p className="mb-4 text-sm text-muted-foreground">
                {call.summary}
              </p>
              <h4 className="mb-3 text-sm font-medium">Conversation</h4>
              <div className="flex flex-col gap-3">
                {(call.conversation || []).map((turn, index) => (
                  <div
                    key={index}
                    className={`flex gap-3 ${
                      turn.speaker === "Agent" ? "flex-row-reverse" : ""
                    }`}
                  >
                    <div
                      className={`flex size-8 shrink-0 items-center justify-center rounded-full ${
                        turn.speaker === "User"
                          ? "bg-muted"
                          : "bg-primary text-primary-foreground"
                      }`}
                    >
                      {turn.speaker === "User" ? (
                        <IconUser className="size-4" />
                      ) : (
                        <IconRobot className="size-4" />
                      )}
                    </div>
                    <div
                      className={`max-w-[80%] rounded-lg px-4 py-2.5 ${
                        turn.speaker === "User"
                          ? "bg-muted"
                          : "bg-primary/10"
                      }`}
                    >
                      <div className="mb-1 flex items-center gap-2">
                        <span className="text-xs font-medium">
                          {turn.speaker}
                        </span>
                        {turn.audio_url && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-5"
                          >
                            <IconPlayerPlay className="size-3" />
                            <span className="sr-only">Play audio</span>
                          </Button>
                        )}
                      </div>
                      <p className="text-sm">{turn.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  )
}

export function CallHistoryTable({ calls }: { calls: CallHistoryEntryWithTurns[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Call History</CardTitle>
        <CardDescription>
          Recent calls handled by your agents
        </CardDescription>
      </CardHeader>
      <CardContent>
        {calls.length === 0 ? (
          <p className="py-8 text-center text-muted-foreground">
            No call history yet. Calls will appear here once your agents start handling them.
          </p>
        ) : (
          <ScrollArea className="w-full">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10" />
                  <TableHead>Date</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Summary</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {calls.map((call) => (
                  <CallRow key={call.id} call={call} />
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}
