"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RenderMSValue } from "@/components/page-speed/lh-categories/table/RenderTableValue";
import { TableItem } from "@/lib/schema";

type TaskSummaryData = {
  label: string;
  diagnostics: TableItem[];
  mainThreadTasks: TableItem[];
};

type TaskSummaryCardProps = {
  metrics: TaskSummaryData[];
};

type TaskSummaryStats = {
  label: string;
  totalTasks: number;
  totalTaskTime: number;
  numTasksOver10ms: number;
  numTasksOver25ms: number;
  numTasksOver50ms: number;
  numTasksOver100ms: number;
  numTasksOver500ms: number;
  averageTaskDuration: number;
  longestTaskDuration: number;
};

export function TaskSummaryCard({ metrics }: TaskSummaryCardProps) {
  const stats: TaskSummaryStats[] = metrics.map(({ label, diagnostics, mainThreadTasks }) => {
    // Get diagnostics data (usually a single item with aggregated stats)
    const diagnosticsItem = diagnostics[0] || {};
    const totalTasks = typeof diagnosticsItem.numTasks === 'number' ? diagnosticsItem.numTasks : mainThreadTasks.length;
    const totalTaskTime = typeof diagnosticsItem.totalTaskTime === 'number' 
      ? diagnosticsItem.totalTaskTime 
      : mainThreadTasks.reduce((sum, task) => {
          const duration = typeof task.duration === 'number' ? task.duration : 0;
          return sum + duration;
        }, 0);
    
    const numTasksOver10ms = typeof diagnosticsItem.numTasksOver10ms === 'number' ? diagnosticsItem.numTasksOver10ms : 0;
    const numTasksOver25ms = typeof diagnosticsItem.numTasksOver25ms === 'number' ? diagnosticsItem.numTasksOver25ms : 0;
    const numTasksOver50ms = typeof diagnosticsItem.numTasksOver50ms === 'number' ? diagnosticsItem.numTasksOver50ms : 0;
    const numTasksOver100ms = typeof diagnosticsItem.numTasksOver100ms === 'number' ? diagnosticsItem.numTasksOver100ms : 0;
    const numTasksOver500ms = typeof diagnosticsItem.numTasksOver500ms === 'number' ? diagnosticsItem.numTasksOver500ms : 0;

    // Calculate from main-thread-tasks if available
    const taskDurations = mainThreadTasks
      .map(task => typeof task.duration === 'number' ? task.duration : 0)
      .filter(d => d > 0);
    
    const averageTaskDuration = taskDurations.length > 0
      ? taskDurations.reduce((sum, d) => sum + d, 0) / taskDurations.length
      : totalTasks > 0 ? totalTaskTime / totalTasks : 0;
    
    const longestTaskDuration = taskDurations.length > 0
      ? Math.max(...taskDurations)
      : 0;

    return {
      label,
      totalTasks,
      totalTaskTime,
      numTasksOver10ms,
      numTasksOver25ms,
      numTasksOver50ms,
      numTasksOver100ms,
      numTasksOver500ms,
      averageTaskDuration,
      longestTaskDuration,
    };
  });

  const validStats = stats.filter(s => s.totalTasks > 0);

  if (!validStats.length) {
    return null;
  }

  const showReportColumn = validStats.length > 1;

  return (
    <Card className="md:col-span-2 lg:col-span-3">
      <CardHeader>
        <CardTitle>Task Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table className="table-auto min-w-full">
            <TableHeader>
              <TableRow>
                {showReportColumn && <TableHead className="min-w-24 whitespace-nowrap px-3">Report</TableHead>}
                <TableHead className="min-w-28 whitespace-nowrap px-3">Total Tasks</TableHead>
                <TableHead className="min-w-24 whitespace-nowrap px-3">Total Time</TableHead>
                <TableHead className="min-w-28 whitespace-nowrap px-3">Avg Duration</TableHead>
                <TableHead className="min-w-28 whitespace-nowrap px-3">Longest Task</TableHead>
                <TableHead className="min-w-20 whitespace-nowrap px-3 text-center">&gt;10ms</TableHead>
                <TableHead className="min-w-20 whitespace-nowrap px-3 text-center">&gt;25ms</TableHead>
                <TableHead className="min-w-20 whitespace-nowrap px-3 text-center">&gt;50ms</TableHead>
                <TableHead className="min-w-24 whitespace-nowrap px-3 text-center">&gt;100ms</TableHead>
                <TableHead className="min-w-24 whitespace-nowrap px-3 text-center">&gt;500ms</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {validStats.map((stat) => (
                <TableRow key={stat.label}>
                  {showReportColumn && <TableCell className="font-medium px-3">{stat.label || 'Unknown'}</TableCell>}
                  <TableCell className="px-3">{stat.totalTasks}</TableCell>
                  <TableCell className="px-3"><RenderMSValue value={stat.totalTaskTime} /></TableCell>
                  <TableCell className="px-3"><RenderMSValue value={stat.averageTaskDuration} /></TableCell>
                  <TableCell className="px-3"><RenderMSValue value={stat.longestTaskDuration} /></TableCell>
                  <TableCell className="px-3 text-center">{stat.numTasksOver10ms}</TableCell>
                  <TableCell className="px-3 text-center">{stat.numTasksOver25ms}</TableCell>
                  <TableCell className="px-3 text-center">{stat.numTasksOver50ms}</TableCell>
                  <TableCell className="px-3 text-center">{stat.numTasksOver100ms}</TableCell>
                  <TableCell className="px-3 text-center">{stat.numTasksOver500ms}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

