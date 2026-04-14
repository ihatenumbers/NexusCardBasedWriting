import Dexie, { type Table } from 'dexie';
import { CardType } from '../types';

export interface CardData {
  id: string;
  type: CardType;
  title: string;
  content: string;
  x: number;
  y: number;
  w: number;
  h: number;
  zIndex: number;
  settings?: any;
  createdAt: number;
  updatedAt: number;
}

export interface GlobalSettings {
  id: string;
  gridCols: number;
  rowHeight: number;
  theme: string;
}

export class NexusDatabase extends Dexie {
  cards!: Table<CardData>;
  settings!: Table<GlobalSettings>;

  constructor() {
    super('NexusWriteDB');
    this.version(2).stores({
      cards: 'id, type, title, createdAt, updatedAt',
      settings: 'id'
    });
  }
}

export const db = new NexusDatabase();
