import React from 'react';
import { ChevronRight, ChevronDown, Plus, Trash2 } from 'lucide-react';
import { DebouncedInput } from '../DebouncedInput';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Editor } from '../Editor';
import { SnowflakeNode } from '@/types';
import { cn } from '@/lib/utils';
import { db } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';

interface CardContentProps {
  title: string;
  content: string;
  onUpdate: (updates: { title?: string; content?: string; settings?: any }) => void;
  isActive: boolean;
  settings?: any;
  triggerWords?: { word: string; cardId: string }[];
  onTriggerClick?: (cardId: string) => void;
}

export const SnowflakeCard: React.FC<CardContentProps> = ({ onUpdate, isActive, settings, triggerWords, onTriggerClick }) => {
  // Ensure we have a virtual root container
  const getRoot = (): SnowflakeNode => {
    const rawRoot = settings?.snowflakeRoot;
    if (rawRoot && rawRoot.id === 'virtual-root') return rawRoot;
    
    // Migrate old single-root structure or initialize new
    return {
      id: 'virtual-root',
      content: '',
      children: rawRoot ? [rawRoot] : [{ id: crypto.randomUUID(), content: '' }]
    };
  };

  const [localRoot, setLocalRoot] = React.useState<SnowflakeNode>(getRoot());

  // Sync local root when external settings change
  React.useEffect(() => {
    setLocalRoot(getRoot());
  }, [settings?.snowflakeRoot]);

  const updateNode = (node: SnowflakeNode, id: string, content: string): SnowflakeNode => {
    if (node.id === id) return { ...node, content };
    if (node.children) {
      return { ...node, children: node.children.map(c => updateNode(c, id, content)) };
    }
    return node;
  };

  const expandNode = (node: SnowflakeNode, id: string): SnowflakeNode => {
    if (node.id === id) {
      if (node.children) return node;
      return {
        ...node,
        children: [
          { id: crypto.randomUUID(), content: '' },
          { id: crypto.randomUUID(), content: '' },
          { id: crypto.randomUUID(), content: '' },
        ]
      };
    }
    if (node.children) {
      return { ...node, children: node.children.map(c => expandNode(c, id)) };
    }
    return node;
  };

  const handleNodeUpdate = (id: string, content: string) => {
    const newRoot = updateNode(localRoot, id, content);
    setLocalRoot(newRoot);
    onUpdate({ settings: { ...settings, snowflakeRoot: newRoot } });
  };

  const handleExpand = (id: string) => {
    const newRoot = expandNode(localRoot, id);
    setLocalRoot(newRoot);
    onUpdate({ settings: { ...settings, snowflakeRoot: newRoot } });
  };

  const handleDeleteNode = (id: string) => {
    const process = (node: SnowflakeNode): SnowflakeNode => {
      if (!node.children) return node;
      
      const newChildren: SnowflakeNode[] = [];
      node.children.forEach(child => {
        if (child.id === id) {
          // Promote grandchildren to the current node's level
          if (child.children) {
            newChildren.push(...child.children);
          }
        } else {
          newChildren.push(process(child));
        }
      });
      
      return { ...node, children: newChildren.length > 0 ? newChildren : undefined };
    };

    const newRoot = process(localRoot);
    setLocalRoot(newRoot);
    onUpdate({ settings: { ...settings, snowflakeRoot: newRoot } });
  };

  const addTopLevelNode = () => {
    const newRoot = {
      ...localRoot,
      children: [...(localRoot.children || []), { id: crypto.randomUUID(), content: '' }]
    };
    setLocalRoot(newRoot);
    onUpdate({ settings: { ...settings, snowflakeRoot: newRoot } });
  };

  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="flex items-center justify-end">
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8 text-blue-400 hover:bg-blue-500/10"
          onClick={addTopLevelNode}
          title="Add Top-Level Node"
        >
          <Plus size={16} />
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 flex flex-col gap-4">
        {localRoot.children?.map(child => (
          <SnowflakeItem 
            key={child.id}
            node={child} 
            onUpdate={handleNodeUpdate} 
            onExpand={handleExpand}
            onRemove={handleDeleteNode}
            isActive={isActive}
            triggerWords={triggerWords}
            onTriggerClick={onTriggerClick}
            level={0}
          />
        ))}
        {(!localRoot.children || localRoot.children.length === 0) && (
          <div className="flex flex-col items-center justify-center py-8 text-gray-600 border-2 border-dashed border-[#2a2b2f] rounded-xl">
            <Plus size={24} className="mb-2 opacity-20" />
            <Button 
              variant="link" 
              className="text-blue-400 text-xs mt-1"
              onClick={addTopLevelNode}
            >
              Add your first node
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

const SnowflakeItem: React.FC<{
  node: SnowflakeNode;
  onUpdate: (id: string, content: string) => void;
  onExpand: (id: string) => void;
  onRemove: (id: string) => void;
  isActive: boolean;
  triggerWords: any;
  onTriggerClick: any;
  level: number;
}> = ({ node, onUpdate, onExpand, onRemove, isActive, triggerWords, onTriggerClick, level }) => {
  const [isExpanded, setIsExpanded] = React.useState(true);

  return (
    <div className={cn("flex flex-col gap-2", level > 0 && "ml-4 pl-4 border-l border-[#2a2b2f]")}>
      <div className="group flex flex-col gap-2 bg-[#1a1b1e]/50 p-3 rounded-lg border border-[#2a2b2f] hover:border-[#3a3b3f] transition-colors">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            {node.children && (
              <button 
                onClick={() => setIsExpanded(!isExpanded)} 
                className="text-gray-500 hover:text-white"
              >
                {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>
            )}
            <span className="text-[10px] text-gray-500 font-mono uppercase tracking-tighter">
              Node {node.id.slice(0, 4)}
            </span>
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {!node.children && (
              <Button 
                size="icon" 
                variant="ghost" 
                className="h-6 w-6 text-blue-400" 
                onClick={() => onExpand(node.id)}
              >
                <Plus size={12} />
              </Button>
            )}
            <Button 
              size="icon" 
              variant="ghost" 
              className="h-6 w-6 text-red-400" 
              onClick={() => onRemove(node.id)}
            >
              <Trash2 size={12} />
            </Button>
          </div>
        </div>
        <Editor
          content={node.content}
          onChange={(val) => onUpdate(node.id, val)}
          isActive={isActive}
          placeholder="Expand this thought..."
          triggerWords={triggerWords}
          onTriggerClick={onTriggerClick}
        />
      </div>
      {isExpanded && node.children && (
        <div className="flex flex-col gap-4 mt-2">
          {node.children.map(child => (
            <SnowflakeItem 
              key={child.id} 
              node={child} 
              onUpdate={onUpdate} 
              onExpand={onExpand}
              onRemove={onRemove}
              isActive={isActive}
              triggerWords={triggerWords}
              onTriggerClick={onTriggerClick}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const SettingsCard: React.FC<CardContentProps> = () => {
  const settings = useLiveQuery(() => db.settings.get('main')) || {
    id: 'main',
    gridCols: 12,
    rowHeight: 100,
    theme: 'dark'
  };

  const [localGridCols, setLocalGridCols] = React.useState(settings.gridCols);
  const [localRowHeight, setLocalRowHeight] = React.useState(settings.rowHeight);

  // Sync local state when DB changes
  React.useEffect(() => {
    setLocalGridCols(settings.gridCols);
    setLocalRowHeight(settings.rowHeight);
  }, [settings.gridCols, settings.rowHeight]);

  const handleSave = async () => {
    await db.settings.put({
      ...settings,
      gridCols: localGridCols,
      rowHeight: localRowHeight
    });
  };

  return (
    <div className="flex flex-col gap-6 h-full p-2">
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-gray-200 uppercase tracking-widest">Global Settings</h3>
        
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-xs text-gray-300">Auto-save to IndexedDB</Label>
            <p className="text-[10px] text-gray-500">Sync changes every 1 second</p>
          </div>
          <Switch checked={true} disabled />
        </div>

        <div className="space-y-4 pt-2 border-t border-[#2a2b2f]">
          <div className="space-y-2">
            <Label className="text-xs text-gray-300">Grid Columns</Label>
            <Input 
              type="number" 
              value={localGridCols}
              onChange={(e) => setLocalGridCols(parseInt(e.target.value) || 12)}
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              className="h-8 bg-[#1a1b1e] border-[#2a2b2f] text-xs no-drag"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-gray-300">Row Height (px)</Label>
            <Input 
              type="number" 
              value={localRowHeight}
              onChange={(e) => setLocalRowHeight(parseInt(e.target.value) || 100)}
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              className="h-8 bg-[#1a1b1e] border-[#2a2b2f] text-xs no-drag"
            />
          </div>

          <Button 
            onClick={handleSave}
            className="w-full h-8 text-xs bg-blue-600 hover:bg-blue-500"
          >
            Confirm Changes
          </Button>
        </div>
      </div>

      <div className="mt-auto pt-4 border-t border-[#2a2b2f]">
        <Button variant="destructive" className="w-full h-8 text-xs" onClick={() => {
          if(confirm('Clear all data? This cannot be undone.')) {
            db.cards.clear();
            db.settings.clear();
            window.location.reload();
          }
        }}>
          Reset All Data
        </Button>
      </div>
    </div>
  );
};
