'use client'

import { ConversationSidebar } from '@/components/sidebar/ConversationSidebar'
import { ChatArea } from '@/components/chat/ChatArea'
import { MemoryPanel } from '@/components/memory/MemoryPanel'
import { useAppStore } from '@/store/useAppStore'
import { useEffect } from 'react'

export default function Home() {
  const { showSidebar, showMemoryPanel, fetchMemories } = useAppStore()

  useEffect(() => {
    fetchMemories()
  }, [fetchMemories])

  return (
    <div className="h-screen flex bg-background overflow-hidden">
      {/* 侧边栏 */}
      {showSidebar && (
        <div className="shrink-0 h-full">
          <ConversationSidebar />
        </div>
      )}

      {/* 主聊天区域 */}
      <div className="flex-1 flex flex-col min-w-0 h-full">
        <ChatArea />
      </div>

      {/* 记忆面板 */}
      {showMemoryPanel && (
        <div className="shrink-0 h-full">
          <MemoryPanel />
        </div>
      )}
    </div>
  )
}
