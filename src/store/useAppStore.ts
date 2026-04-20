import { create } from 'zustand'

export interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  createdAt: string
}

export interface Conversation {
  id: string
  title: string
  summary?: string | null
  createdAt: string
  updatedAt: string
  messages: Message[]
}

export interface MemoryItem {
  id: string
  category: string
  key: string
  value: string
  createdAt: string
  updatedAt: string
}

interface AppState {
  // 对话
  conversations: Conversation[]
  currentConversation: Conversation | null
  isLoadingConversations: boolean

  // 消息
  isLoadingMessages: boolean
  isSendingMessage: boolean

  // 记忆
  memories: MemoryItem[]
  isLoadingMemories: boolean

  // UI状态
  showMemoryPanel: boolean
  showSidebar: boolean

  // Actions
  setConversations: (conversations: Conversation[]) => void
  setCurrentConversation: (conversation: Conversation | null) => void
  setIsLoadingConversations: (v: boolean) => void
  setIsLoadingMessages: (v: boolean) => void
  setIsSendingMessage: (v: boolean) => void
  setMemories: (memories: MemoryItem[]) => void
  setIsLoadingMemories: (v: boolean) => void
  toggleMemoryPanel: () => void
  toggleSidebar: () => void
  setShowSidebar: (v: boolean) => void

  // 复合Actions
  fetchConversations: () => Promise<void>
  fetchConversation: (id: string) => Promise<void>
  fetchMemories: () => Promise<void>
  sendMessage: (message: string) => Promise<string | null>
  createConversation: () => Promise<string | null>
  deleteConversation: (id: string) => Promise<void>
  deleteMemory: (id: string) => Promise<void>
  updateMemory: (id: string, data: Partial<MemoryItem>) => Promise<void>
  addMemory: (data: { category: string; key: string; value: string }) => Promise<void>
}

export const useAppStore = create<AppState>((set, get) => ({
  conversations: [],
  currentConversation: null,
  isLoadingConversations: false,
  isLoadingMessages: false,
  isSendingMessage: false,
  memories: [],
  isLoadingMemories: false,
  showMemoryPanel: false,
  showSidebar: true,

  setConversations: (conversations) => set({ conversations }),
  setCurrentConversation: (conversation) => set({ currentConversation: conversation }),
  setIsLoadingConversations: (v) => set({ isLoadingConversations: v }),
  setIsLoadingMessages: (v) => set({ isLoadingMessages: v }),
  setIsSendingMessage: (v) => set({ isSendingMessage: v }),
  setMemories: (memories) => set({ memories }),
  setIsLoadingMemories: (v) => set({ isLoadingMemories: v }),
  toggleMemoryPanel: () => set((s) => ({ showMemoryPanel: !s.showMemoryPanel })),
  toggleSidebar: () => set((s) => ({ showSidebar: !s.showSidebar })),
  setShowSidebar: (v) => set({ showSidebar: v }),

  fetchConversations: async () => {
    set({ isLoadingConversations: true })
    try {
      const res = await fetch('/api/conversations')
      const data = await res.json()
      set({ conversations: Array.isArray(data) ? data : [], isLoadingConversations: false })
    } catch {
      set({ isLoadingConversations: false })
    }
  },

  fetchConversation: async (id) => {
    set({ isLoadingMessages: true })
    try {
      const res = await fetch(`/api/conversations/${id}`)
      const data = await res.json()
      set({ currentConversation: data, isLoadingMessages: false })
    } catch {
      set({ isLoadingMessages: false })
    }
  },

  fetchMemories: async () => {
    set({ isLoadingMemories: true })
    try {
      const res = await fetch('/api/memories')
      const data = await res.json()
      set({ memories: Array.isArray(data) ? data : [], isLoadingMemories: false })
    } catch {
      set({ isLoadingMemories: false })
    }
  },

  sendMessage: async (message) => {
    const { currentConversation } = get()
    set({ isSendingMessage: true })

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          conversationId: currentConversation?.id || null,
        }),
      })

      const data = await res.json()

      if (data.error) {
        set({ isSendingMessage: false })
        return null
      }

      // 更新对话列表和当前对话
      await get().fetchConversations()
      if (data.conversationId) {
        await get().fetchConversation(data.conversationId)
      }

      // 延迟刷新记忆（给后台提取时间）
      setTimeout(() => get().fetchMemories(), 2000)

      set({ isSendingMessage: false })
      return data.reply
    } catch {
      set({ isSendingMessage: false })
      return null
    }
  },

  createConversation: async () => {
    try {
      const res = await fetch('/api/conversations', { method: 'POST' })
      const data = await res.json()
      await get().fetchConversations()
      if (data.id) {
        await get().fetchConversation(data.id)
      }
      return data.id
    } catch {
      return null
    }
  },

  deleteConversation: async (id) => {
    try {
      await fetch(`/api/conversations/${id}`, { method: 'DELETE' })
      const { currentConversation } = get()
      if (currentConversation?.id === id) {
        set({ currentConversation: null })
      }
      await get().fetchConversations()
    } catch {
      // ignore
    }
  },

  deleteMemory: async (id) => {
    try {
      await fetch(`/api/memories/${id}`, { method: 'DELETE' })
      set((s) => ({ memories: s.memories.filter((m) => m.id !== id) }))
    } catch {
      // ignore
    }
  },

  updateMemory: async (id, data) => {
    try {
      await fetch(`/api/memories/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      await get().fetchMemories()
    } catch {
      // ignore
    }
  },

  addMemory: async (data) => {
    try {
      await fetch('/api/memories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      await get().fetchMemories()
    } catch {
      // ignore
    }
  },
}))
