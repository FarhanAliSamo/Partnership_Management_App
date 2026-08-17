import { CREATE_TABLES, INDEXES } from './schema';

export function createTablesStatement(): string {
  return CREATE_TABLES;
}

export function indexStatement(): string {
  return INDEXES;
}