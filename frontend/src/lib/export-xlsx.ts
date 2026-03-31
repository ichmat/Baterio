import { toast } from 'sonner'

export async function exportToXlsx<T extends Record<string, unknown>>(
  data: T[],
  columns: { key: string; header: string }[],
  filename: string,
) {
  try {
    const XLSX = await import('xlsx')
    const wsData = [
      columns.map((c) => c.header),
      ...data.map((row) => columns.map((c) => row[c.key] ?? '')),
    ]
    const ws = XLSX.utils.aoa_to_sheet(wsData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Export')
    XLSX.writeFile(wb, `${filename}.xlsx`)
  } catch {
    toast.error("Erreur lors de l'export Excel")
  }
}
