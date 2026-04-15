export type CardType = 'outline' | 'snowflake' | 'timelimit' | 'notes' | 'codex' | 'settings' | 'image';

export interface SnowflakeNode {
  id: string;
  content: string;
  children?: SnowflakeNode[]; // Usually 3 children as per request
}

export interface OutlineItem {
  id: string;
  title: string;
  content: string;
  status: 'todo' | 'in-progress' | 'done';
  isExpanded?: boolean;
}

export interface CardSettings {
  // Outline card
  outlineItems?: OutlineItem[];

  // Time limit card
  wordGoal?: number;
  timeLimit?: number; // in minutes
  startTime?: number;
  isDangerous?: boolean;
  
  // Codex card
  triggerWords?: string[];
  category?: string;
  
  // Snowflake card
  snowflakeRoot?: SnowflakeNode;
  
  // Snowflake card
  level?: number;
  parentId?: string;

  // Image card
  imageUrl?: string;
  zoom?: number;
  panX?: number;
  panY?: number;
}

export interface CardData {
  id: string;
  type: CardType;
  title: string;
  content: string;
  x: number; // Grid X
  y: number; // Grid Y
  w: number; // Grid Width
  h: number; // Grid Height
  zIndex: number;
  settings?: CardSettings;
  isLocked?: boolean;
  createdAt: number;
  updatedAt: number;
}

export const GRID_COLS = 12;
export const ROW_HEIGHT = 100;
export const DEFAULT_W = 3;
export const DEFAULT_H = 4;
