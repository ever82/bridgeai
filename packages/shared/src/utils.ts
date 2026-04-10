// Shared utilities
export * from './utils/geoUtils';

export function formatDate(date: Date): string {
  return date.toISOString();
}
