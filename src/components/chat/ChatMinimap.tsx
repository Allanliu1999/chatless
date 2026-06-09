"use client";

import { useMemo, useRef, useCallback, useState, useEffect } from "react";
import type { Message } from "@/types/chat";

interface ChatMinimapProps {
  messages: Message[];
  onScrollToIndex: (index: number) => void;
  /** 总消息条目数（含版本化分组） */
  totalItems: number;
}

/**
 * 聊天消息缩略图（Minimap）
 * 
 * 参考 VS Code 滚动条缩略图，在聊天区域右侧显示消息概览色带。
 * - 默认半透明窄条 (8px)，hover 时展开至 ~36px
 * - 每条消息渲染为一个色块：用户消息 → 蓝色，AI消息 → 灰色，图片/文档 → 高亮
 * - 点击色块跳转到对应消息
 * - 鼠标拖拽可快速滚动
 */
export function ChatMinimap({ messages, onScrollToIndex, totalItems }: ChatMinimapProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ y: number; index: number } | null>(null);

  // 构建色块映射
  const blocks = useMemo(() => {
    if (!messages || messages.length === 0) return [];
    return messages.map((msg) => ({
      id: msg.id,
      role: msg.role,
      hasImage: !!(msg as any).images && (msg as any).images.length > 0,
      hasDocument: !!msg.document_reference,
      hasKnowledge: !!msg.knowledge_base_reference,
    }));
  }, [messages]);

  // 根据角色和附件类型决定颜色
  const getBlockColor = (block: typeof blocks[0]): string => {
    if (block.hasImage) return "bg-purple-400 dark:bg-purple-500";
    if (block.hasDocument || block.hasKnowledge) return "bg-emerald-400 dark:bg-emerald-500";
    if (block.role === "user") return "bg-blue-400 dark:bg-blue-500";
    return "bg-gray-300 dark:bg-gray-600"; // assistant
  };

  const getBlockHeight = (): string => {
    if (!totalItems || totalItems === 0) return "0";
    // 每个块至少 3px, 最多不超过容器高度比例
    return `${Math.max(3, Math.min(12, 200 / totalItems))}px`;
  };

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!containerRef.current || totalItems === 0) return;
      const rect = containerRef.current.getBoundingClientRect();
      const y = e.clientY - rect.top;
      const ratio = Math.max(0, Math.min(1, y / rect.height));
      const index = Math.floor(ratio * totalItems);
      onScrollToIndex(Math.min(index, totalItems - 1));
    },
    [onScrollToIndex, totalItems]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (totalItems === 0) return;
      setIsDragging(true);
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const y = e.clientY - rect.top;
      const ratio = Math.max(0, Math.min(1, y / rect.height));
      dragStartRef.current = { y: e.clientY, index: Math.floor(ratio * totalItems) };
      onScrollToIndex(Math.min(Math.floor(ratio * totalItems), totalItems - 1));
    },
    [onScrollToIndex, totalItems]
  );

  // 全局 mouse move / up 实现拖拽滚动
  useEffect(() => {
    if (!isDragging) return;

    const onMove = (e: MouseEvent) => {
      if (!containerRef.current || totalItems === 0) return;
      const rect = containerRef.current.getBoundingClientRect();
      const y = e.clientY - rect.top;
      const ratio = Math.max(0, Math.min(1, y / rect.height));
      const index = Math.floor(ratio * totalItems);
      onScrollToIndex(Math.min(index, totalItems - 1));
    };

    const onUp = () => {
      setIsDragging(false);
      dragStartRef.current = null;
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [isDragging, onScrollToIndex, totalItems]);

  if (totalItems === 0) return null;

  const blockH = getBlockHeight();

  return (
    <div
      ref={containerRef}
      className={cn(
        "fixed right-1 top-1/2 -translate-y-1/2 z-40 rounded-full transition-all duration-200 cursor-pointer select-none",
        "flex flex-col gap-[1px] overflow-hidden",
        isHovered || isDragging
          ? "w-9 bg-white/80 dark:bg-gray-800/80 shadow-md border border-slate-200/60 dark:border-slate-700/60 p-1.5"
          : "w-2 bg-white/20 dark:bg-gray-800/20 hover:bg-white/40 dark:hover:bg-gray-800/40 p-0.5"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => { if (!isDragging) setIsHovered(false); }}
      onClick={handleClick}
      onMouseDown={handleMouseDown}
      style={{ maxHeight: "60vh" }}
    >
      {blocks.map((block, idx) => (
        <div
          key={block.id}
          className={cn(
            "rounded-sm flex-shrink-0 transition-all",
            getBlockColor(block),
            isHovered || isDragging ? "opacity-80 hover:opacity-100" : "opacity-50"
          )}
          style={{ height: blockH }}
          title={`#${idx + 1} ${block.role === "user" ? "用户" : "AI"}${block.hasImage ? " 📷" : ""}${block.hasDocument ? " 📄" : ""}`}
        />
      ))}
    </div>
  );
}

// 内联 cn 工具（避免导入 @/lib/utils 依赖问题）
function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(" ");
}
