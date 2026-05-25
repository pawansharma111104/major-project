import { drizzle } from "drizzle-orm/neon-serverless";
import { neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import * as schema from "../shared/schema";

neonConfig.webSocketConstructor = ws;

export const db = process.env.DATABASE_URL 
  ? drizzle(process.env.DATABASE_URL, { schema })
  : null as any;
