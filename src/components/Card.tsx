import React, { useState, useRef, forwardRef } from 'react';
import { MoreVertical, GripVertical, X, Copy } from 'lucide-react';
import { Card as ShadcnCard } from '@/components/ui/card';
import { ContextMenu } from './ContextMenu';
import { CardData, CardType } from '@/types';
import { cn } from '@/lib/utils';
import { DebouncedInput } from './DebouncedInput';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  data: CardData;
  onDelete: (id: string) => void;
  onDuplicate: (card: CardData) => void;
  onUpdate: (id: string, updates: Partial<CardData>) => void;
  onCardFocus: (id: string) => void;
  isActive: boolean;
  children: React.ReactNode;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(({
  data,
  onDelete,
  onDuplicate,
  onUpdate,
  onCardFocus,
  isActive,
  children,
  style,
  className,
  onMouseDown,
  onMouseUp,
  onTouchEnd,
  ...props
}, ref) => {
  const [showContextMenu, setShowContextMenu] = useState<{ x: number; y: number } | null>(null);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowContextMenu({ x: e.clientX, y: e.clientY });
  };

  const contextMenuItems = [
    {
      label: 'Duplicate Card',
      icon: <Copy size={14} />,
      onClick: () => onDuplicate(data),
    },
    {
      label: 'Delete Card',
      icon: <X size={14} />,
      onClick: () => onDelete(data.id),
      variant: 'destructive' as const,
    },
  ];

  const getCardHeaderColor = (type: CardType) => {
    switch (type) {
      case 'outline': return 'bg-blue-600/20 border-blue-500/30';
      case 'snowflake': return 'bg-cyan-600/20 border-cyan-500/30';
      case 'timelimit': return 'bg-red-600/20 border-red-500/30';
      case 'notes': return 'bg-yellow-600/20 border-yellow-500/30';
      case 'codex': return 'bg-purple-600/20 border-purple-500/30';
      case 'settings': return 'bg-gray-600/20 border-gray-500/30';
      default: return 'bg-[#1a1b1e] border-[#2a2b2f]';
    }
  };

  const getCardBorderColor = (type: CardType) => {
    switch (type) {
      case 'outline': return 'border-blue-500/50';
      case 'snowflake': return 'border-cyan-500/50';
      case 'timelimit': return 'border-red-500/50';
      case 'notes': return 'border-yellow-500/50';
      case 'codex': return 'border-purple-500/50';
      case 'settings': return 'border-gray-500/50';
      default: return 'border-[#2a2b2f]';
    }
  };

  const getCardDotColor = (type: CardType) => {
    switch (type) {
      case 'outline': return 'bg-blue-500';
      case 'snowflake': return 'bg-cyan-500';
      case 'timelimit': return 'bg-red-500';
      case 'notes': return 'bg-yellow-500';
      case 'codex': return 'bg-purple-500';
      case 'settings': return 'bg-gray-500';
      default: return 'bg-gray-400';
    }
  };

  return (
    <div
      ref={ref}
      style={{ ...style, zIndex: data.zIndex }}
      className={cn(
        "transition-shadow duration-200",
        isActive ? "shadow-2xl ring-1 ring-blue-500/50" : "shadow-lg",
        className
      )}
      onMouseDown={(e) => {
        onCardFocus(data.id);
        onMouseDown?.(e);
      }}
      onMouseUp={onMouseUp}
      onTouchEnd={onTouchEnd}
      {...props}
    >
      <ShadcnCard
        className={cn(
          "w-full h-full bg-[#151619] flex flex-col overflow-hidden group border-t-2",
          getCardBorderColor(data.type)
        )}
      >
        {/* Header / Drag Handle */}
        <div
          className={cn(
            "drag-handle h-8 flex items-center justify-between px-3 border-b cursor-grab active:cursor-grabbing shrink-0 transition-colors",
            getCardHeaderColor(data.type)
          )}
          onContextMenu={handleContextMenu}
        >
          <div className="flex items-center gap-2 flex-1 overflow-hidden">
            <div className={cn("w-2 h-2 rounded-full shrink-0", getCardDotColor(data.type))} />
            <DebouncedInput
              value={data.title}
              onDebouncedChange={(val) => onUpdate(data.id, { title: val })}
              placeholder={data.type.toUpperCase()}
              className="bg-transparent border-none text-[10px] font-bold text-gray-300 p-0 h-auto focus-visible:ring-0 uppercase tracking-widest w-full no-drag"
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
            />
          </div>
          <div className="flex items-center gap-1">
            <button
              onMouseDown={(e) => {
                e.stopPropagation();
                onCardFocus(data.id);
              }}
              onClick={(e) => {
                e.stopPropagation();
                handleContextMenu(e);
              }}
              onTouchStart={(e) => {
                e.stopPropagation();
                onCardFocus(data.id);
                handleContextMenu(e as any);
              }}
              className="p-1 hover:bg-[#2a2b2f] rounded transition-colors text-gray-500 no-drag"
            >
              <MoreVertical size={14} />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div 
          className="flex-1 overflow-y-auto p-2 custom-scrollbar no-drag"
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
        >
          {children}
        </div>
      </ShadcnCard>

      {showContextMenu && (
        <ContextMenu
          x={showContextMenu.x}
          y={showContextMenu.y}
          onClose={() => setShowContextMenu(null)}
          items={contextMenuItems}
        />
      )}
    </div>
  );
});

Card.displayName = 'Card';
