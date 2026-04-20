'use client'

import { ConversationSidebar } from '@/components/sidebar/ConversationSidebar'
import { ChatArea } from '@/components/chat/ChatArea'
import { MemoryPanel } from '@/components/memory/MemoryPanel'
import { useAppStore } from '@/store/useAppStore'
import { Menu, Brain } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useEffect } from 'react'

export default function Home() {
  const { showSidebar, showMemoryPanel, setShowSidebar, toggleMemoryPanel, fetchMemories } = useAppStore()

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
      <div className="flex-1 flex flex-col min-w-0 h-full relative">
        {/* 没有侧边栏时的顶部按钮 */}
        {!showSidebar && (
          <div className="absolute top-3 left-3 z-10 flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="bg-background shadow-md border h-9 w-9"
              onClick={() => setShowSidebar(true)}
            >
              <Menu className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* 没有记忆面板时的浮动按钮 */}
        {!showMemoryPanel && (
          <div className="absolute top-3 right-3 z-10">
            <Button
              variant="outline"
              size="sm"
              className="gap-2 shadow-md"
              onClick={toggleMemoryPanel}
            >
              <Brain className="h-4 w-4" />
              记忆
            </Button>
          </div>
        )}

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
