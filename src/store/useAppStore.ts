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
  createdAt: string
  updatedAt: string
  messages: Message[]
}

export interface MemoryFolder {
  id: string
  name: string
  icon: string
  color: string
  sortOrder: number
  createdAt: string
  updatedAt: string
  _count?: { memories: number }
}

export interface MemoryItem {
  id: string
  category: string
  key: string
  value: string
  folderId: string | null
  source?: string | null
  createdAt: string
  updatedAt: string
  folder?: MemoryFolder | null
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

  // 文件夹
  folders: MemoryFolder[]
  activeFolderId: string | 'all' | 'unsorted'

  // UI状态
  showMemoryPanel: boolean
  showSidebar: boolean

  // Setters
  setConversations: (conversations: Conversation[]) => void
  setCurrentConversation: (conversation: Conversation | null) => void
  setIsLoadingConversations: (v: boolean) => void
  setIsLoadingMessages: (v: boolean) => void
  setIsSendingMessage: (v: boolean) => void
  setMemories: (memories: MemoryItem[]) => void
  setIsLoadingMemories: (v: boolean) => void
  setFolders: (folders: MemoryFolder[]) => void
  setActiveFolderId: (id: string | 'all' | 'unsorted') => void
  toggleMemoryPanel: () => void
  toggleSidebar: () => void
  setShowSidebar: (v: boolean) => void

  // 对话 Actions
  fetchConversations: () => Promise<void>
  fetchConversation: (id: string) => Promise<void>
  sendMessage: (message: string) => Promise<string | null>
  deleteConversation: (id: string) => Promise<void>

  // 记忆 Actions
  fetchMemories: () => Promise<void>
  deleteMemory: (id: string) => Promise<void>
  updateMemory: (id: string, data: Partial<MemoryItem>) => Promise<void>
  addMemory: (data: { category: string; key: string; value: string; folderId?: string | null }) => Promise<void>
  moveMemoryToFolder: (memoryId: string, folderId: string | null) => Promise<void>

  // 文件夹 Actions
  fetchFolders: () => Promise<void>
  createFolder: (data: { name: string; icon?: string; color?: string }) => Promise<void>
  updateFolder: (id: string, data: Partial<MemoryFolder>) => Promise<void>
  deleteFolder: (id: string) => Promise<void>
}

export const useAppStore = create<AppState>((set, get) => ({
  conversations: [],
  currentConversation: null,
  isLoadingConversations: false,
  isLoadingMessages: false,
  isSendingMessage: false,
  memories: [],
  isLoadingMemories: false,
  folders: [],
  activeFolderId: 'all',
  showMemoryPanel: false,
  showSidebar: true,

  setConversations: (conversations) => set({ conversations }),
  setCurrentConversation: (conversation) => set({ currentConversation: conversation }),
  setIsLoadingConversations: (v) => set({ isLoadingConversations: v }),
  setIsLoadingMessages: (v) => set({ isLoadingMessages: v }),
  setIsSendingMessage: (v) => set({ isSendingMessage: v }),
  setMemories: (memories) => set({ memories }),
  setIsLoadingMemories: (v) => set({ isLoadingMemories: v }),
  setFolders: (folders) => set({ folders }),
  setActiveFolderId: (id) => set({ activeFolderId: id }),
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

  fetchFolders: async () => {
    try {
      const res = await fetch('/api/folders')
      const data = await res.json()
      set({ folders: Array.isArray(data) ? data : [] })
    } catch {
      // ignore
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

      await get().fetchConversations()
      if (data.conversationId) {
        await get().fetchConversation(data.conversationId)
      }

      // 延迟刷新记忆
      setTimeout(() => {
        get().fetchMemories()
        get().fetchFolders()
      }, 2000)

      set({ isSendingMessage: false })
      return data.reply
    } catch {
      set({ isSendingMessage: false })
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
      await get().fetchFolders()
    } catch {
      // ignore
    }
  },

  moveMemoryToFolder: async (memoryId, folderId) => {
    try {
      await fetch(`/api/memories/${memoryId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderId }),
      })
      await get().fetchMemories()
      await get().fetchFolders()
    } catch {
      // ignore
    }
  },

  createFolder: async (data) => {
    try {
      await fetch('/api/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      await get().fetchFolders()
    } catch {
      // ignore
    }
  },

  updateFolder: async (id, data) => {
    try {
      await fetch(`/api/folders/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      await get().fetchFolders()
    } catch {
      // ignore
    }
  },

  deleteFolder: async (id) => {
    try {
      await fetch(`/api/folders/${id}`, { method: 'DELETE' })
      await get().fetchFolders()
      await get().fetchMemories()
    } catch {
      // ignore
    }
  },
}))
