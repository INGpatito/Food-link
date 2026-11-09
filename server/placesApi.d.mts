import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Pool } from 'mysql2/promise';

export declare const PLACES_SCHEMA: string[];
export declare const DEMO_PLACES: unknown[];

export declare function ensurePlacesSchema(pool: Pool): Promise<void>;

export declare function seedDemoPlacesAt(
  pool: Pool,
  lat: number,
  lng: number
): Promise<{ placesCount: number; offersCount: number }>;

export declare function handlePlacesRequest(
  req: IncomingMessage,
  res: ServerResponse,
  url: URL,
  pool: Pool,
  sendJson: (res: ServerResponse, status: number, data: unknown) => void
): Promise<boolean>;
