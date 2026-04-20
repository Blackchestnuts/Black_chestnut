import { db } from '@/lib/db'
import { ensureDefaultUser } from '@/lib/memory'

// 初始化 - 确保默认用户存在
export async function GET() {
  try {
    const user = await ensureDefaultUser()
    const memoryCount = await db.memory.count({ where: { userId: user.id } })
    const conversationCount = await db.conversation.count({ where: { userId: user.id } })
    return Response.json({
      user: { id: user.id, name: user.name, occupation: user.occupation },
      stats: { memoryCount, conversationCount },
    })
  } catch (error) {
    console.error('Init error:', error)
    return Response.json({ error: '初始化失败' }, { status: 500 })
  }
}
