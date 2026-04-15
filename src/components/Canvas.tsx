import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import debounce from 'lodash/debounce';
import { Settings, Book, FileText, Clock, Hash, StickyNote, Image as ImageIcon } from 'lucide-react';
import GridLayout, { Layout } from 'react-grid-layout';
import { db } from '@/lib/db';
import { Card } from './Card';
import { 
  OutlineCard, 
  NotesCard, 
  TimeLimitCard, 
  CodexCard,
  ImageCard
} from './cards/CardContents';
import { SnowflakeCard, SettingsCard } from './cards/ExtraCards';
import { CardData, CardType, GRID_COLS, ROW_HEIGHT, DEFAULT_W, DEFAULT_H } from '@/types';
import { Button, buttonVariants } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

import '/node_modules/react-grid-layout/css/styles.css';
import '/node_modules/react-resizable/css/styles.css';

const ToolbarButton: React.FC<{ icon: React.ReactNode; label: string; onClick: () => void }> = ({ icon, label, onClick }) => (
  <Tooltip>
    <TooltipTrigger
      className={cn(
        buttonVariants({ variant: "ghost", size: "icon" }),
        "w-10 h-10 rounded-full hover:bg-[#2a2b2f] text-gray-400 hover:text-white transition-all"
      )}
      onClick={onClick}
    >
      {icon}
    </TooltipTrigger>
    <TooltipContent side="bottom" className="bg-[#1a1b1e] border-[#2a2b2f] text-gray-300 text-[10px] uppercase tracking-widest">
      {label}
    </TooltipContent>
  </Tooltip>
);

const GL = GridLayout as any;

export const Canvas: React.FC = () => {
  const dbCards = useLiveQuery(() => db.cards.toArray()) || [];
  const globalSettings = useLiveQuery(() => db.settings.get('main')) || {
    id: 'main',
    gridCols: GRID_COLS,
    rowHeight: ROW_HEIGHT,
    theme: 'dark'
  };

  // Ensure default settings exist
  useEffect(() => {
    const initSettings = async () => {
      const existing = await db.settings.get('main');
      if (!existing) {
        await db.settings.add({
          id: 'main',
          gridCols: GRID_COLS,
          rowHeight: ROW_HEIGHT,
          theme: 'dark'
        });
      }
    };
    initSettings();
  }, []);

  const [localCards, setLocalCards] = useState<CardData[]>([]);
  const [history, setHistory] = useState<CardData[][]>([]);
  const [future, setFuture] = useState<CardData[][]>([]);
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const isInteracting = useRef(false);

  // Sync local state with DB only when DB cards change and we aren't actively editing
  useEffect(() => {
    if (dbCards.length > 0 && !isInteracting.current) {
      setLocalCards(dbCards);
    }
  }, [dbCards]);

  useEffect(() => {
    if (!containerRef.current) return;
    const debouncedSetWidth = debounce((width: number) => {
      setContainerWidth(width);
    }, 100);

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        debouncedSetWidth(entry.contentRect.width);
      }
    });
    observer.observe(containerRef.current);
    return () => {
      observer.disconnect();
      debouncedSetWidth.cancel();
    };
  }, []);

  const cols = useMemo(() => {
    if (containerWidth < 480) return 4;
    if (containerWidth < 768) return 8;
    return globalSettings.gridCols;
  }, [containerWidth, globalSettings.gridCols]);

  const layout = useMemo(() => localCards.map(card => ({
    i: card.id,
    x: card.x,
    y: card.y,
    w: card.w,
    h: card.h,
  })), [localCards, cols]);

  const saveHistory = useCallback(() => {
    setHistory(prev => [...prev, JSON.parse(JSON.stringify(localCards))].slice(-50));
    setFuture([]);
  }, [localCards]);

  const undo = useCallback(async () => {
    if (history.length === 0) return;
    
    const previous = history[history.length - 1];
    const current = JSON.parse(JSON.stringify(localCards));
    
    setFuture(prev => [current, ...prev]);
    setHistory(prev => prev.slice(0, -1));
    
    // Sync DB with previous state
    const currentIds = new Set(current.map((c: any) => c.id));
    const previousIds = new Set(previous.map((c: any) => c.id));
    
    for (const id of Array.from(currentIds)) {
      if (!previousIds.has(id)) await db.cards.delete(id);
    }
    for (const card of previous) {
      await db.cards.put(card);
    }
    
    setLocalCards(previous);
  }, [history, localCards]);

  const redo = useCallback(async () => {
    if (future.length === 0) return;
    
    const next = future[0];
    const current = JSON.parse(JSON.stringify(localCards));
    
    setHistory(prev => [...prev, current]);
    setFuture(prev => prev.slice(1));
    
    // Sync DB with next state
    const currentIds = new Set(current.map((c: any) => c.id));
    const nextIds = new Set(next.map((c: any) => c.id));
    
    for (const id of Array.from(currentIds)) {
      if (!nextIds.has(id)) await db.cards.delete(id);
    }
    for (const card of next) {
      await db.cards.put(card);
    }
    
    setLocalCards(next);
  }, [future, localCards]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isInput = ['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName) || 
                     (e.target as HTMLElement).isContentEditable;
      
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (isInput) return;
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        if (isInput) return;
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  const addCard = async (type: CardType, initialSettings?: any) => {
    saveHistory();
    const id = crypto.randomUUID();
    
    // Find a free spot
    const maxY = localCards.length > 0 ? Math.max(...localCards.map(c => c.y + c.h)) : 0;

    const newCard: CardData = {
      id,
      type,
      title: `New ${type.charAt(0).toUpperCase() + type.slice(1)}`,
      content: '',
      x: 0,
      y: maxY,
      w: DEFAULT_W,
      h: DEFAULT_H,
      zIndex: localCards.length + 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      settings: initialSettings || (
                type === 'outline' ? { outlineItems: [{ id: crypto.randomUUID(), title: 'Chapter 1', content: '', status: 'todo', isExpanded: true }] } :
                type === 'timelimit' ? { timeLimit: 25, wordGoal: 500, isDangerous: false } : 
                type === 'snowflake' ? { snowflakeRoot: { id: 'virtual-root', content: '', children: [{ id: crypto.randomUUID(), content: '' }] } } : 
                type === 'codex' ? { triggerWords: [] } : 
                type === 'image' ? { zoom: 1, panX: 0, panY: 0 } : {}
      )
    };
    
    setLocalCards(prev => [...prev, newCard]);
    await db.cards.add(newCard);
    setActiveCardId(id);
  };

  const handleGlobalDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    const imageFiles = files.filter(f => f.type.startsWith('image/'));

    for (const file of imageFiles) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const imageUrl = event.target?.result as string;
        await addCard('image', { imageUrl, zoom: 1, panX: 0, panY: 0 });
      };
      reader.readAsDataURL(file);
    }
  };

  const onLayoutChange = useCallback((newLayout: any[]) => {
    setLocalCards(prev => {
      let hasChanges = false;
      const next = prev.map(card => {
        const item = newLayout.find(l => l.i === card.id);
        if (item && (card.x !== item.x || card.y !== item.y || card.w !== item.w || card.h !== item.h)) {
          hasChanges = true;
          return { ...card, x: item.x, y: item.y, w: item.w, h: item.h, updatedAt: Date.now() };
        }
        return card;
      });
      return hasChanges ? next : prev;
    });
  }, []);

  const onInteractionStart = useCallback(() => {
    isInteracting.current = true;
    saveHistory();
  }, [saveHistory]);

  const onInteractionStop = useCallback(async (newLayout: any[]) => {
    // 1. Update local state one last time with the final layout
    const finalCards = localCards.map(card => {
      const item = newLayout.find(l => l.i === card.id);
      if (item) {
        return { ...card, x: item.x, y: item.y, w: item.w, h: item.h, updatedAt: Date.now() };
      }
      return card;
    });
    
    setLocalCards(finalCards);

    // 2. Persist to DB
    await db.cards.bulkPut(finalCards);
    
    // 3. Small delay before allowing DB sync to prevent race conditions with useLiveQuery
    setTimeout(() => {
      isInteracting.current = false;
    }, 500);
  }, [localCards]);

  // Debounced DB sync
  const persistToDb = useMemo(
    () => debounce(async (id: string, updates: Partial<CardData>) => {
      await db.cards.update(id, {
        ...updates,
        updatedAt: Date.now(),
      });
    }, 500),
    []
  );

  const updateCard = useCallback((id: string, updates: Partial<CardData>) => {
    // Only save history for non-content/title updates or debounce it
    // For now, let's save history for any update but maybe we should be more selective
    // Actually, title/content updates are debounced, so we can save history here
    saveHistory();
    
    // 1. Update local state immediately (Zero Latency)
    setLocalCards(prev => prev.map(c => c.id === id ? { ...c, ...updates, updatedAt: Date.now() } : c));
    
    // 2. Persist to DB in background
    persistToDb(id, updates);
  }, [persistToDb]);

  const deleteCard = async (id: string) => {
    saveHistory();
    setLocalCards(prev => prev.filter(c => c.id !== id));
    await db.cards.delete(id);
    if (activeCardId === id) setActiveCardId(null);
  };

  const duplicateCard = async (card: CardData) => {
    saveHistory();
    const id = crypto.randomUUID();
    const newCard: CardData = {
      ...card,
      id,
      x: card.x + 1, // Offset slightly
      y: card.y + 1,
      zIndex: localCards.length + 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      title: `${card.title} (Copy)`,
      settings: JSON.parse(JSON.stringify(card.settings || {})) // Deep copy settings
    };

    setLocalCards(prev => [...prev, newCard]);
    await db.cards.add(newCard);
    setActiveCardId(id);
  };

  const focusCard = async (id: string) => {
    setActiveCardId(id);
    const maxZ = Math.max(...localCards.map(c => c.zIndex), 0);
    setLocalCards(prev => prev.map(c => c.id === id ? { ...c, zIndex: maxZ + 1 } : c));
    await db.cards.update(id, { zIndex: maxZ + 1 });

    // Scroll the card into view
    setTimeout(() => {
      const element = document.getElementById(`card-${id}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 50);
  };

  const triggerWords = useMemo(() => {
    const words: { word: string; cardId: string }[] = [];
    localCards.forEach(card => {
      if (card.type === 'codex' && card.settings?.triggerWords) {
        card.settings.triggerWords.forEach((word: string) => {
          words.push({ word, cardId: card.id });
        });
      }
    });
    return words;
  }, [localCards]);

  const renderCardContent = useCallback((card: CardData) => {
    const props = {
      title: card.title,
      content: card.content,
      settings: card.settings,
      isActive: activeCardId === card.id,
      onUpdate: (updates: any) => updateCard(card.id, updates),
      triggerWords: card.type !== 'codex' ? triggerWords : [],
      onTriggerClick: (id: string) => focusCard(id),
    };

    switch (card.type) {
      case 'outline': return <OutlineCard {...props} />;
      case 'notes': return <NotesCard {...props} />;
      case 'timelimit': return <TimeLimitCard {...props} />;
      case 'codex': return <CodexCard {...props} />;
      case 'snowflake': return <SnowflakeCard {...props} />;
      case 'image': return <ImageCard {...props} />;
      case 'settings': return <SettingsCard {...props} />;
      default: return null;
    }
  }, [activeCardId, updateCard, triggerWords, focusCard]);

  const handleDragStop = useCallback((layout: any[]) => {
    onInteractionStop(layout);
  }, [onInteractionStop]);

  const handleResizeStop = useCallback((layout: any[]) => {
    onInteractionStop(layout);
  }, [onInteractionStop]);

  const renderedCards = useMemo(() => localCards.map((card) => (
    <div key={card.id} id={`card-${card.id}`}>
      <Card
        data={card}
        onDelete={deleteCard}
        onDuplicate={duplicateCard}
        onUpdate={updateCard}
        onCardFocus={focusCard}
        isActive={activeCardId === card.id}
        className="h-full"
      >
        {renderCardContent(card)}
      </Card>
    </div>
  )), [localCards, activeCardId, deleteCard, duplicateCard, updateCard, focusCard, renderCardContent]);

  return (
    <TooltipProvider>
      <div 
        className="relative w-full h-screen bg-[#0a0b0d] overflow-y-auto overflow-x-hidden custom-scrollbar"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleGlobalDrop}
      >
        {/* Grid Background */}
        <div 
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: `linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)`,
            backgroundSize: `${100 / globalSettings.gridCols}% ${globalSettings.rowHeight}px`
          }}
        />

        {/* Toolbar */}
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[5000] flex items-center gap-2 px-4 py-2 bg-[#151619]/80 backdrop-blur-md border border-[#2a2b2f] rounded-full shadow-2xl">
          <ToolbarButton icon={<FileText size={18} />} label="Outline" onClick={() => addCard('outline')} />
          <ToolbarButton icon={<Hash size={18} />} label="Snowflake" onClick={() => addCard('snowflake')} />
          <ToolbarButton icon={<Clock size={18} />} label="Time Session" onClick={() => addCard('timelimit')} />
          <ToolbarButton icon={<StickyNote size={18} />} label="Notes" onClick={() => addCard('notes')} />
          <ToolbarButton icon={<ImageIcon size={18} />} label="Image" onClick={() => addCard('image')} />
          <ToolbarButton icon={<Book size={18} />} label="Codex" onClick={() => addCard('codex')} />
          <div className="w-px h-6 bg-[#2a2b2f] mx-1" />
          <ToolbarButton icon={<Settings size={18} />} label="Settings" onClick={() => addCard('settings')} />
        </div>

        {/* Cards Canvas */}
        <div ref={containerRef} className="px-4 md:px-10 pt-24 pb-20 min-h-full">
          {GL && containerWidth > 0 && (
            <GL
              className="layout"
              layout={layout}
              cols={cols}
              rowHeight={globalSettings.rowHeight}
              width={containerWidth}
              onLayoutChange={onLayoutChange}
              onDragStart={onInteractionStart}
              onDragStop={handleDragStop}
              onResizeStart={onInteractionStart}
              onResizeStop={handleResizeStop}
              draggableHandle=".drag-handle"
              draggableCancel=".no-drag"
              margin={[20, 20]}
              compactType="vertical"
              isBounded={true}
              useCSSTransforms={true}
              measureBeforeMount={true}
              isDraggable={true}
              isResizable={true}
              preventCollision={false}
            >
              {renderedCards}
            </GL>
          )}
        </div>

        {/* Empty State */}
        {localCards.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-600 pointer-events-none">
            <div className="mb-4 opacity-20">
              <Book size={64} />
            </div>
            <p className="text-sm font-medium tracking-widest uppercase opacity-40">Start your journey</p>
            <p className="text-xs mt-2 opacity-30">Add a card from the toolbar above</p>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
};
