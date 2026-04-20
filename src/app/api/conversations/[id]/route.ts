import { db } from '@/lib/db'
import { ensureDefaultUser } from '@/lib/memory'

// 获取单个对话详情（含消息）
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await ensureDefaultUser()
    const { id } = await params

    const conversation = await db.conversation.findFirst({
      where: { id, userId: user.id },
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
      },
    })
    if (!conversation) {
      return Response.json({ error: '对话不存在' }, { status: 404 })
    }
    return Response.json(conversation)
  } catch (error) {
    console.error('Get conversation error:', error)
    return Response.json({ error: '获取对话详情失败' }, { status: 500 })
  }
}

// 删除对话
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await ensureDefaultUser()
    const { id } = await params

    // 验证对话属于当前用户
    const existing = await db.conversation.findFirst({
      where: { id, userId: user.id },
    })
    if (!existing) {
      return Response.json({ error: '对话不存在或无权操作' }, { status: 403 })
    }

    await db.conversation.delete({ where: { id } })
    return Response.json({ success: true })
  } catch (error) {
    console.error('Delete conversation error:', error)
    return Response.json({ error: '删除对话失败' }, { status: 500 })
  }
}
