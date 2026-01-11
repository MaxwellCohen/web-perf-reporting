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
    <Card>
      <CardHeader>
        <CardTitle>Task Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              {showReportColumn && <TableHead>Report</TableHead>}
              <TableHead>Total Tasks</TableHead>
              <TableHead>Total Time</TableHead>
              <TableHead>Avg Duration</TableHead>
              <TableHead>Longest Task</TableHead>
              <TableHead>&gt;10ms</TableHead>
              <TableHead>&gt;25ms</TableHead>
              <TableHead>&gt;50ms</TableHead>
              <TableHead>&gt;100ms</TableHead>
              <TableHead>&gt;500ms</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {validStats.map((stat) => (
              <TableRow key={stat.label}>
                {showReportColumn && <TableCell className="font-medium">{stat.label || 'Unknown'}</TableCell>}
                <TableCell>{stat.totalTasks}</TableCell>
                <TableCell><RenderMSValue value={stat.totalTaskTime} /></TableCell>
                <TableCell><RenderMSValue value={stat.averageTaskDuration} /></TableCell>
                <TableCell><RenderMSValue value={stat.longestTaskDuration} /></TableCell>
                <TableCell>{stat.numTasksOver10ms}</TableCell>
                <TableCell>{stat.numTasksOver25ms}</TableCell>
                <TableCell>{stat.numTasksOver50ms}</TableCell>
                <TableCell>{stat.numTasksOver100ms}</TableCell>
                <TableCell>{stat.numTasksOver500ms}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

