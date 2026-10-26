import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Camera } from 'lucide-react'
import { useState } from 'react'
import { Card } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { Pagination } from '../../components/ui/Pagination'
import { QueryError } from '../../components/ui/QueryError'
import { Skeleton } from '../../components/ui/Skeleton'
import {
  fetchPhotos,
  type Photo,
  pageCount,
  photoPageSize,
  signedUrlRefresh,
  signThumbnails,
} from '../../lib/admin-api'
import { useListParams } from '../../lib/useListParams'
import { Lightbox, photoAlt } from './Lightbox'

export function PhotosTab({ hiveId }: { hiveId: string }) {
  const { page, setPage } = useListParams()
  const [open, setOpen] = useState<Photo | null>(null)
  const photos = useQuery({
    queryKey: ['admin-photos', hiveId, page],
    queryFn: () => fetchPhotos(hiveId, page),
    placeholderData: keepPreviousData,
  })
  const paths = photos.data?.rows.map((photo) => photo.storage_path) ?? []
  const thumbnails = useQuery({
    queryKey: ['admin-photo-thumbnails', paths],
    queryFn: () => signThumbnails(paths),
    enabled: paths.length > 0,
    staleTime: signedUrlRefresh,
    refetchInterval: signedUrlRefresh,
  })

  if (photos.isPending) {
    return (
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
        {[0, 1, 2, 3, 4, 5].map((index) => (
          <Skeleton key={index} className="aspect-square" />
        ))}
      </div>
    )
  }
  if (photos.isError) return <QueryError error={photos.error} onRetry={() => photos.refetch()} />
  if (thumbnails.isError) {
    return <QueryError error={thumbnails.error} onRetry={() => thumbnails.refetch()} />
  }
  if (photos.data.total === 0) {
    return (
      <Card>
        <EmptyState icon={Camera} title="Aún no hay fotos" />
      </Card>
    )
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="sr-only">Fotos</h2>
      <ul className="stagger grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
        {photos.data.rows.map((photo) => {
          const url = thumbnails.data?.[photo.storage_path]
          return (
            <li key={photo.id}>
              <button
                type="button"
                onClick={() => setOpen(photo)}
                aria-label={`Ver ${photoAlt(photo)}`}
                className="glass block aspect-square w-full overflow-hidden rounded-control transition duration-200 hover:scale-[1.02]"
              >
                {url ? (
                  <img src={url} alt="" loading="lazy" className="size-full object-cover" />
                ) : (
                  <Skeleton className="size-full" />
                )}
              </button>
            </li>
          )
        })}
      </ul>
      <Pagination
        page={page}
        pageCount={pageCount(photos.data.total, photoPageSize)}
        onChange={setPage}
      />
      <Lightbox photo={open} onClose={() => setOpen(null)} />
    </section>
  )
}
