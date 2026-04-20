import { db } from '@/lib/db'

// 更新记忆
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { category, key, value, folderId } = body

    const memory = await db.memory.update({
      where: { id },
      data: {
        ...(category && { category }),
        ...(key && { key }),
        ...(value && { value }),
        ...(folderId !== undefined && { folderId }),
        updatedAt: new Date(),
      },
    })
    return Response.json(memory)
  } catch (error) {
    console.error('Update memory error:', error)
    return Response.json({ error: '更新记忆失败' }, { status: 500 })
  }
}

// 删除记忆
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await db.memory.delete({ where: { id } })
    return Response.json({ success: true })
  } catch (error) {
    console.error('Delete memory error:', error)
    return Response.json({ error: '删除记忆失败' }, { status: 500 })
  }
}
