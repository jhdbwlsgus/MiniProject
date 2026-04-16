export default function NewsDetailPage({ params }: { params: { id: string } }) {
  return (
    <div>
      <h1>News Detail {params.id}</h1>
    </div>
  )
}