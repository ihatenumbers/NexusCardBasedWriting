import React from 'react';
import { X, CheckCircle2, Circle, PlayCircle, ChevronRight, ChevronDown, Plus, Trash2, Image as ImageIcon, Upload } from 'lucide-react';
import { Editor } from '../Editor';
import { DebouncedInput } from '../DebouncedInput';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { OutlineItem } from '@/types';

interface CardContentProps {
  title: string;
  content: string;
  onUpdate: (updates: { title?: string; content?: string; settings?: any }) => void;
  isActive: boolean;
  settings?: any;
  triggerWords?: { word: string; cardId: string }[];
  onTriggerClick?: (cardId: string) => void;
}

export const OutlineCard: React.FC<CardContentProps> = ({ onUpdate, isActive, settings, triggerWords, onTriggerClick }) => {
  const [localItems, setLocalItems] = React.useState<OutlineItem[]>(settings?.outlineItems || []);

  // Sync local items when external settings change (e.g. from DB)
  React.useEffect(() => {
    setLocalItems(settings?.outlineItems || []);
  }, [settings?.outlineItems]);

  const addItem = () => {
    const newItem: OutlineItem = {
      id: crypto.randomUUID(),
      title: `New Item ${localItems.length + 1}`,
      content: '',
      status: 'todo',
      isExpanded: true
    };
    const newItems = [...localItems, newItem];
    setLocalItems(newItems);
    onUpdate({ settings: { ...settings, outlineItems: newItems } });
  };

  const updateItem = (id: string, updates: Partial<OutlineItem>) => {
    const newItems = localItems.map(item => item.id === id ? { ...item, ...updates } : item);
    setLocalItems(newItems);
    onUpdate({ settings: { ...settings, outlineItems: newItems } });
  };

  const deleteItem = (id: string) => {
    const newItems = localItems.filter(item => item.id !== id);
    setLocalItems(newItems);
    onUpdate({ settings: { ...settings, outlineItems: newItems } });
  };

  const getStatusIcon = (status: OutlineItem['status']) => {
    switch (status) {
      case 'todo': return <Circle size={16} className="text-gray-500" />;
      case 'in-progress': return <PlayCircle size={16} className="text-blue-400" />;
      case 'done': return <CheckCircle2 size={16} className="text-green-500" />;
    }
  };

  const cycleStatus = (id: string, currentStatus: OutlineItem['status']) => {
    const statuses: OutlineItem['status'][] = ['todo', 'in-progress', 'done'];
    const nextStatus = statuses[(statuses.indexOf(currentStatus) + 1) % statuses.length];
    updateItem(id, { status: nextStatus });
  };

  const progress = localItems.length > 0 
    ? Math.round((localItems.filter(i => i.status === 'done').length / localItems.length) * 100) 
    : 0;

  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-end">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
            onClick={addItem}
          >
            <Plus size={16} />
          </Button>
        </div>
        
        {localItems.length > 0 && (
          <div className="w-full h-1 bg-[#1a1b1e] rounded-full overflow-hidden">
            <div 
              className="h-full bg-green-500 transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 flex flex-col gap-1">
        {localItems.map((item) => (
          <div 
            key={item.id}
            className={cn(
              "flex flex-col gap-1 p-2 rounded-md transition-all duration-200 group",
              item.isExpanded ? "bg-[#1a1b1e]/30" : "hover:bg-[#1a1b1e]/20"
            )}
          >
            <div className="flex items-center gap-3">
              <button 
                onClick={() => cycleStatus(item.id, item.status)}
                className="shrink-0 hover:scale-110 transition-transform"
              >
                {getStatusIcon(item.status)}
              </button>

              <DebouncedInput
                value={item.title}
                onDebouncedChange={(val) => updateItem(item.id, { title: val })}
                placeholder="Task description..."
                className={cn(
                  "bg-transparent border-none text-sm p-0 h-auto focus-visible:ring-0 flex-1",
                  item.status === 'done' ? "text-gray-500 line-through" : "text-gray-300"
                )}
              />

              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => updateItem(item.id, { isExpanded: !item.isExpanded })}
                  className={cn(
                    "p-1 rounded hover:bg-[#2a2b2f] transition-colors",
                    item.isExpanded ? "text-blue-400" : "text-gray-500"
                  )}
                >
                  {item.isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6 text-red-400/50 hover:text-red-400 hover:bg-red-500/10"
                  onClick={() => deleteItem(item.id)}
                >
                  <Trash2 size={12} />
                </Button>
              </div>
            </div>

            {item.isExpanded && (
              <div className="pl-9 pb-2">
                <Editor
                  content={item.content}
                  onChange={(val) => updateItem(item.id, { content: val })}
                  isActive={isActive}
                  placeholder="Additional notes..."
                  triggerWords={triggerWords}
                  onTriggerClick={onTriggerClick}
                />
              </div>
            )}
          </div>
        ))}

        {localItems.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-gray-600 border-2 border-dashed border-[#2a2b2f] rounded-xl">
            <Plus size={24} className="mb-2 opacity-20" />
            <p className="text-[10px] uppercase tracking-widest opacity-40">Empty Outline</p>
            <Button 
              variant="link" 
              className="text-blue-400 text-xs mt-1"
              onClick={addItem}
            >
              Add your first item
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export const NotesCard: React.FC<CardContentProps> = ({ content, onUpdate, isActive, triggerWords, onTriggerClick }) => {
  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="flex-1">
        <Editor
          content={content}
          onChange={(val) => onUpdate({ content: val })}
          isActive={isActive}
          placeholder="Quick notes, ideas, snippets..."
          triggerWords={triggerWords}
          onTriggerClick={onTriggerClick}
        />
      </div>
    </div>
  );
};

export const TimeLimitCard: React.FC<CardContentProps> = ({ content, onUpdate, isActive, settings, triggerWords, onTriggerClick }) => {
  const [timeLeft, setTimeLeft] = React.useState(settings?.timeLimit ? settings.timeLimit * 60 : 0);
  const [isStarted, setIsStarted] = React.useState(false);
  const [wordCount, setWordCount] = React.useState(0);
  const timerRef = React.useRef<NodeJS.Timeout | null>(null);

  React.useEffect(() => {
    setWordCount(content.trim() ? content.trim().split(/\s+/).length : 0);
  }, [content]);

  const startTimer = () => {
    if (isStarted) return;
    setIsStarted(true);
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          handleTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const [message, setMessage] = React.useState<string | null>(null);

  const handleTimeUp = () => {
    if (settings?.isDangerous && wordCount < (settings?.wordGoal || 0)) {
      onUpdate({ content: '' });
      setMessage('Time up! Goal not reached. Text cleared.');
    } else {
      setMessage('Time up! Session complete.');
    }
    setIsStarted(false);
    setTimeout(() => setMessage(null), 5000);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleTimerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value);
    if (!isNaN(val) && val >= 0) {
      setTimeLeft(val * 60);
      onUpdate({ settings: { ...settings, timeLimit: val } });
    }
  };

  const handleGoalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value);
    if (!isNaN(val) && val >= 0) {
      onUpdate({ settings: { ...settings, wordGoal: val } });
    }
  };

  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="flex flex-col items-center justify-center py-4 gap-4">
        {!isStarted ? (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-blue-500/10 rounded-xl px-4 py-3 border border-blue-500/20">
              <input
                type="number"
                value={Math.floor(timeLeft / 60)}
                onChange={handleTimerChange}
                className="w-16 bg-transparent border-none text-3xl font-bold font-mono text-blue-400 focus:ring-0 p-0 text-center no-drag"
              />
              <span className="text-sm text-blue-500/50 font-mono font-bold">MIN</span>
            </div>

            <div className="flex items-center gap-2 bg-purple-500/10 rounded-xl px-4 py-3 border border-purple-500/20">
              <input
                type="number"
                value={settings?.wordGoal || 500}
                onChange={handleGoalChange}
                className="w-20 bg-transparent border-none text-3xl font-bold font-mono text-purple-400 focus:ring-0 p-0 text-center no-drag"
              />
              <span className="text-sm text-purple-500/50 font-mono font-bold">WORDS</span>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <div className={cn(
              "px-6 py-4 rounded-2xl text-4xl font-bold font-mono border",
              timeLeft < 30 
                ? "bg-red-500/20 text-red-400 border-red-500/30 animate-pulse" 
                : "bg-blue-500/20 text-blue-400 border-blue-500/30"
            )}>
              {formatTime(timeLeft)}
            </div>
            <div className="px-6 py-4 rounded-2xl text-4xl font-bold font-mono border bg-purple-500/20 text-purple-400 border-purple-500/30">
              {wordCount}/{settings?.wordGoal || 500}
            </div>
          </div>
        )}
      </div>
      
      {message && (
        <div className="bg-red-500/20 text-red-400 text-[10px] p-2 rounded border border-red-500/30 text-center animate-bounce">
          {message}
        </div>
      )}

      {!isStarted && !message && (
        <div className="bg-[#1a1b1e] p-3 rounded-lg border border-[#2a2b2f] flex flex-col gap-2">
          <button 
            onClick={startTimer}
            className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-sm font-medium transition-colors"
          >
            Start Writing Session
          </button>
        </div>
      )}

      <div className="flex-1">
        <Editor
          content={content}
          onChange={(val) => {
            if (isStarted) onUpdate({ content: val });
          }}
          isActive={isActive && isStarted}
          placeholder={isStarted ? "Write or lose it!" : "Start the timer to write..."}
        />
      </div>
      
      <div className="text-[10px] text-gray-500 flex justify-between">
        <span>Words: {wordCount} / {settings?.wordGoal || 500}</span>
        {settings?.isDangerous && <span className="text-red-500 font-bold">DANGEROUS MODE</span>}
      </div>
    </div>
  );
};

export const CodexCard: React.FC<CardContentProps> = ({ content, onUpdate, isActive, settings, triggerWords, onTriggerClick }) => {
  const [newWord, setNewWord] = React.useState('');

  const addWord = () => {
    if (!newWord.trim()) return;
    const words = settings?.triggerWords || [];
    if (!words.includes(newWord.trim())) {
      onUpdate({ settings: { ...settings, triggerWords: [...words, newWord.trim()] } });
    }
    setNewWord('');
  };

  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-2">
          {settings?.triggerWords?.map((word: string, i: number) => (
            <span key={i} className="group flex items-center gap-1 px-2 py-0.5 bg-purple-500/20 text-purple-400 text-[10px] rounded-full border border-purple-500/30">
              {word}
              <button 
                onClick={() => onUpdate({ settings: { ...settings, triggerWords: settings.triggerWords.filter((w: string) => w !== word) } })}
                className="opacity-0 group-hover:opacity-100 hover:text-white transition-opacity"
              >
                <X size={8} />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <Input 
            value={newWord}
            onChange={(e) => setNewWord(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addWord()}
            placeholder="Add trigger word..."
            className="h-6 text-[10px] bg-[#1a1b1e] border-[#2a2b2f] no-drag"
          />
          <Button 
            size="sm" 
            className="h-6 px-2 text-[10px]" 
            onClick={addWord}
          >
            Add
          </Button>
        </div>
      </div>
      <div className="flex-1">
        <Editor
          content={content}
          onChange={(val) => onUpdate({ content: val })}
          isActive={isActive}
          placeholder="Lore, descriptions, traits..."
          triggerWords={triggerWords}
          onTriggerClick={onTriggerClick}
        />
      </div>
    </div>
  );
};

export const ImageCard: React.FC<CardContentProps> = ({ onUpdate, settings }) => {
  const [isDragging, setIsDragging] = React.useState(false);
  const [pan, setPan] = React.useState({ x: settings?.panX || 0, y: settings?.panY || 0 });
  const [zoom, setZoom] = React.useState(settings?.zoom || 1);
  const [isPanning, setIsPanning] = React.useState(false);
  const [startPan, setStartPan] = React.useState({ x: 0, y: 0 });
  const containerRef = React.useRef<HTMLDivElement>(null);

  const handleFile = (file: File) => {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        onUpdate({ settings: { ...settings, imageUrl: e.target?.result as string, zoom: 1, panX: 0, panY: 0 } });
        setZoom(1);
        setPan({ x: 0, y: 0 });
      };
      reader.readAsDataURL(file);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    handleFile(file);
  };

  const onWheel = (e: WheelEvent) => {
    if (!settings?.imageUrl) return;
    e.preventDefault();
    e.stopPropagation();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(prev => {
      const newZoom = Math.min(Math.max(prev * delta, 0.1), 10);
      onUpdate({ settings: { ...settings, zoom: newZoom } });
      return newZoom;
    });
  };

  React.useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.addEventListener('wheel', onWheel, { passive: false });
      return () => container.removeEventListener('wheel', onWheel);
    }
  }, [settings?.imageUrl, onUpdate, settings]);

  const onMouseDown = (e: React.MouseEvent) => {
    if (!settings?.imageUrl) return;
    e.stopPropagation();
    setIsPanning(true);
    setStartPan({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!isPanning) return;
    e.stopPropagation();
    const newPan = { x: e.clientX - startPan.x, y: e.clientY - startPan.y };
    setPan(newPan);
  };

  const onMouseUp = (e: React.MouseEvent) => {
    if (isPanning) {
      e.stopPropagation();
      setIsPanning(false);
      onUpdate({ settings: { ...settings, panX: pan.x, panY: pan.y } });
    }
  };

  return (
    <div 
      ref={containerRef}
      className={cn(
        "relative w-full h-full flex items-center justify-center overflow-hidden rounded-lg border-2 border-dashed transition-colors no-drag",
        isDragging ? "border-blue-500 bg-blue-500/10" : "border-transparent bg-[#1a1b1e]/50"
      )}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={onDrop}
    >
      {settings?.imageUrl ? (
        <div 
          className="w-full h-full cursor-grab active:cursor-grabbing flex items-center justify-center"
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
        >
          <img 
            src={settings.imageUrl} 
            alt="Uploaded" 
            className="pointer-events-none select-none"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              maxWidth: 'none',
              maxHeight: 'none'
            }}
            referrerPolicy="no-referrer"
          />
        </div>
      ) : (
        <label 
          className="flex flex-col items-center gap-3 cursor-pointer group"
        >
          <div className="p-4 rounded-full bg-[#2a2b2f] group-hover:bg-[#3a3b3f] transition-colors">
            <Upload className="text-gray-400 group-hover:text-white" size={24} />
          </div>
          <div className="text-center">
            <p className="text-xs font-medium text-gray-300">Drop image here</p>
            <p className="text-[10px] text-gray-500 mt-1">or click to browse</p>
          </div>
          <input 
            type="file" 
            className="hidden" 
            accept="image/*" 
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} 
          />
        </label>
      )}
    </div>
  );
};
