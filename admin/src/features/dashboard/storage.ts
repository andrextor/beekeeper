// Supabase free plan: 1 GB of file storage.
export const freeStorageBytes = 1024 ** 3

export type StorageTone = 'ok' | 'warning' | 'danger'

export function storageUsage(bytes: number): { percent: number; tone: StorageTone } {
  const percent = Math.min(100, (bytes / freeStorageBytes) * 100)
  const tone = percent >= 90 ? 'danger' : percent >= 70 ? 'warning' : 'ok'
  return { percent, tone }
}

const megabytes = new Intl.NumberFormat('es-CO', {
  style: 'unit',
  unit: 'megabyte',
  maximumFractionDigits: 1,
})

export function formatMegabytes(bytes: number): string {
  return megabytes.format(bytes / 1024 ** 2)
}
