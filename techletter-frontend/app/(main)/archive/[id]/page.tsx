export default function ArchiveDetailPage({ params }: { params: { id: string } }) {
  return (
    <div>
      <h1>Archive Detail {params.id}</h1>
    </div>
  )
}