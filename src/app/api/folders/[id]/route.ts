import { db } from '@/lib/db'

// 更新文件夹
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, icon, color, sortOrder } = body

    const folder = await db.memoryFolder.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(icon !== undefined && { icon }),
        ...(color !== undefined && { color }),
        ...(sortOrder !== undefined && { sortOrder }),
        updatedAt: new Date(),
      },
    })
    return Response.json(folder)
  } catch (error) {
    console.error('Update folder error:', error)
    return Response.json({ error: '更新文件夹失败' }, { status: 500 })
  }
}

// 删除文件夹（记忆的folderId会被设为null）
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    // 先将文件夹内的记忆设为未分类
    await db.memory.updateMany({
      where: { folderId: id },
      data: { folderId: null },
    })
    await db.memoryFolder.delete({ where: { id } })
    return Response.json({ success: true })
  } catch (error) {
    console.error('Delete folder error:', error)
    return Response.json({ error: '删除文件夹失败' }, { status: 500 })
  }
}
