import { db } from '@/lib/db'
import { ensureDefaultUser, buildMemoryPrompt, extractMemoriesFromMessage } from '@/lib/memory'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { message, conversationId } = body

    if (!message || typeof message !== 'string') {
      return Response.json({ error: '消息内容不能为空' }, { status: 400 })
    }

    const user = await ensureDefaultUser()

    let conversation
    if (conversationId) {
      conversation = await db.conversation.findUnique({
        where: { id: conversationId },
        include: { messages: { orderBy: { createdAt: 'asc' } } },
      })
    }

    if (!conversation) {
      conversation = await db.conversation.create({
        data: {
          userId: user.id,
          title: message.slice(0, 30) + (message.length > 30 ? '...' : ''),
        },
        include: { messages: true },
      })
    }

    await db.message.create({
      data: {
        conversationId: conversation.id,
        role: 'user',
        content: message,
      },
    })

    const systemPrompt = await buildMemoryPrompt(user.id)

    const chatMessages = [
      { role: 'system' as const, content: systemPrompt },
      ...conversation.messages.map((m: { role: string; content: string }) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user' as const, content: message },
    ]

    const ZAI = (await import('z-ai-web-dev-sdk')).default
    const zai = await ZAI.create()

    const completion = await zai.chat.completions.create({
      messages: chatMessages,
      temperature: 0.7,
    })

    const assistantContent = completion.choices[0]?.message?.content || '抱歉，我无法生成回复。'

    await db.message.create({
      data: {
        conversationId: conversation.id,
        role: 'assistant',
        content: assistantContent,
      },
    })

    // 异步提取记忆
    extractMemoriesFromMessage(user.id, message, assistantContent).catch((err) =>
      console.error('Background memory extraction failed:', err)
    )

    return Response.json({
      conversationId: conversation.id,
      reply: assistantContent,
    })
  } catch (error) {
    console.error('Chat API error:', error)
    return Response.json({ error: '服务器错误，请稍后重试' }, { status: 500 })
  }
}
