export function serializeTask<T extends { start?: Date; end?: Date }>(task: T): T {
  return {
    ...task,
    data: null, // ignore neseted data
    start: task.start instanceof Date ? task.start.toISOString() : task.start,
    end: task.end instanceof Date ? task.end.toISOString() : task.end,
  };
}
