export default function TagPage({ params }: { params: { slug: string } }) {
  return (
    <div>
      <h1>Tag {params.slug}</h1>
    </div>
  )
}