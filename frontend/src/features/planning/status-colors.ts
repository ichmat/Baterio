export const STATUS_COLORS: Record<string, { bg: string; border: string }> = {
  Planned: { bg: 'bg-blue-100 dark:bg-blue-900/40', border: 'border-l-blue-500' },
  InProgress: { bg: 'bg-yellow-100 dark:bg-yellow-900/40', border: 'border-l-yellow-500' },
  Paused: { bg: 'bg-gray-100 dark:bg-gray-800', border: 'border-l-gray-400' },
  Completed: { bg: 'bg-green-100 dark:bg-green-900/40', border: 'border-l-green-500' },
}
