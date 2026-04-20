import { db } from '@/lib/db'

// 确保默认用户存在
export async function ensureDefaultUser() {
  let user = await db.user.findFirst()
  if (!user) {
    user = await db.user.create({
      data: { name: '默认用户' },
    })
  }
  return user
}

// 构建记忆prompt - 注入所有记忆
export async function buildMemoryPrompt(userId: string) {
  const memories = await db.memory.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
  })

  if (memories.length === 0) {
    return {
      prompt: `你是一个智能助手，拥有跨对话的记忆能力。你可以记住用户告诉你的信息，在后续对话中主动运用这些记忆来提供更个性化的服务。

当前你还没有关于这个用户的记忆，请在对话中自然地了解用户信息。`,
    }
  }

  const categoryLabels: Record<string, string> = {
    profile: '👤 用户画像',
    preference: '偏好与习惯',
    goal: '🎯 目标与计划',
    project: '📋 项目信息',
    insight: '💡 洞察与观点',
    fact: '📌 事实记录',
  }

  const categorized: Record<string, string[]> = {}
  for (const m of memories) {
    if (!categorized[m.category]) categorized[m.category] = []
    categorized[m.category].push(`- ${m.key}: ${m.value}`)
  }

  let memorySection = ''
  for (const [cat, items] of Object.entries(categorized)) {
    const label = categoryLabels[cat] || cat
    memorySection += `\n${label}:\n${items.join('\n')}\n`
  }

  return {
    prompt: `你是一个拥有跨对话记忆能力的智能助手。以下是你记住的关于用户的信息：

${memorySection}
重要指令：
1. 在回复时，主动运用上述记忆信息，让用户感受到你"记得"他们
2. 如果用户的问题与记忆中的信息相关，自然地引用相关记忆
3. 不要生硬地罗列记忆，而是自然地融入对话中
4. 如果发现记忆中有过时或错误的信息，可以主动确认更新
5. 当用户告诉你新的个人信息、偏好、目标时，这些信息值得被记住`,
  }
}

// 从对话中提取记忆
export async function extractMemoriesFromMessage(
  userId: string,
  userMessage: string,
  assistantMessage: string
) {
  try {
    const ZAI = (await import('z-ai-web-dev-sdk')).default
    const zai = await ZAI.create()

    const extractPrompt = `分析以下对话内容，提取值得长期记住的信息。

用户说: ${userMessage}
助手回复: ${assistantMessage}

请以JSON格式返回提取的记忆，格式如下:
{
  "memories": [
    {
      "category": "profile|preference|goal|project|insight|fact",
      "key": "简短描述（如：职业、技术偏好、当前项目）",
      "value": "具体内容"
    }
  ]
}

提取规则:
- 只提取有长期价值的信息，忽略临时性、闲聊性的内容
- category分类: profile(个人画像), preference(偏好习惯), goal(目标计划), project(项目信息), insight(洞察观点), fact(事实记录)
- key要简明扼要，便于检索
- value要具体明确
- 如果没有值得记忆的信息，返回空数组
- 只返回JSON，不要其他文字`

    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: '你是一个信息提取助手，只返回JSON格式的结果。' },
        { role: 'user', content: extractPrompt },
      ],
      temperature: 0.3,
    })

    const content = completion.choices[0]?.message?.content || ''

    let jsonStr = content
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      jsonStr = jsonMatch[0]
    }

    const parsed = JSON.parse(jsonStr)
    const memories = parsed.memories || []

    for (const mem of memories) {
      if (!mem.category || !mem.key || !mem.value) continue

      const existing = await db.memory.findFirst({
        where: { userId, category: mem.category, key: mem.key },
      })

      if (existing) {
        await db.memory.update({
          where: { id: existing.id },
          data: { value: mem.value },
        })
      } else {
        await db.memory.create({
          data: {
            userId,
            category: mem.category,
            key: mem.key,
            value: mem.value,
          },
        })
      }
    }

    return memories.length
  } catch (error) {
    console.error('Memory extraction failed:', error)
    return 0
  }
}
