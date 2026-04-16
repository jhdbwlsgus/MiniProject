export default function EditNewsPage({ params }: { params: { id: string } }) {
  return (
    <div>
      <h1>Edit News {params.id}</h1>
    </div>
  )
}