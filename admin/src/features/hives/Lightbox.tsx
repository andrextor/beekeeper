import { skipToken, useQuery } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { ErrorState } from '../../components/ui/ErrorState'
import { IconButton } from '../../components/ui/IconButton'
import { Skeleton } from '../../components/ui/Skeleton'
import { type Photo, signedUrlStaleTime, signPhoto } from '../../lib/admin-api'
import { formatDate, formatDateTime } from '../../lib/format'

export function photoAlt(photo: Photo): string {
  return photo.caption ?? `Foto del ${formatDate(photo.taken_at)}`
}

/** The full image, signed only when opened. A native dialog gives the focus trap and Esc. */
export function Lightbox({ photo, onClose }: { photo: Photo | null; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const full = useQuery({
    queryKey: ['admin-photo', photo?.storage_path],
    queryFn: photo ? () => signPhoto(photo.storage_path) : skipToken,
    staleTime: signedUrlStaleTime,
  })

  useEffect(() => {
    const element = dialog.current
    if (!element) return
    if (photo && !element.open) element.showModal()
    if (!photo && element.open) element.close()
  }, [photo])

  const inspectedAt = photo?.inspections?.inspected_at

  return (
    <dialog
      ref={dialog}
      onClose={onClose}
      aria-label={photo ? photoAlt(photo) : 'Foto'}
      className="glass m-auto w-[min(100vw-2rem,64rem)] rounded-card p-0 text-text backdrop:bg-black/70 backdrop:backdrop-blur-sm"
    >
      {photo && (
        <div className="flex flex-col">
          <div className="flex items-center justify-between gap-3 p-2 pl-4">
            <p className="text-sm text-muted">{formatDateTime(photo.taken_at)}</p>
            <IconButton icon={X} label="Cerrar" onClick={() => dialog.current?.close()} />
          </div>
          {full.isError ? (
            <ErrorState onRetry={() => full.refetch()} />
          ) : full.data ? (
            <img
              src={full.data}
              alt={photoAlt(photo)}
              className="max-h-[75vh] w-full bg-black object-contain"
            />
          ) : (
            <Skeleton className="aspect-[4/3] w-full rounded-none" />
          )}
          {(photo.caption || inspectedAt) && (
            <div className="flex flex-col gap-1 p-4">
              {photo.caption && <p>{photo.caption}</p>}
              {inspectedAt && (
                <p className="text-sm text-muted">De la revisión del {formatDate(inspectedAt)}</p>
              )}
            </div>
          )}
        </div>
      )}
    </dialog>
  )
}
