import type { BookingTask, TaskSummary } from '../types';

export function summarizeTasks(tasks: BookingTask[]): TaskSummary {
  const done = tasks.filter((task) => task.status === 'done').length;
  const blocked = tasks.filter((task) => task.status === 'blocked').length;
  const openTasks = tasks
    .filter((task) => task.status === 'open')
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  return {
    total: tasks.length,
    done,
    open: openTasks.length,
    blocked,
    nextTask: openTasks[0]
  };
}
