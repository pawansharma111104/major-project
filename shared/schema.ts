import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, real, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Soldiers table - stores soldier authentication and profile data
export const soldiers = pgTable("soldiers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  codename: text("codename").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("soldier"), // soldier or tracker
  status: text("status").notNull().default("offline"), // online, offline, engaged, needsAssistance
  lastSeen: timestamp("last_seen").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Location updates table - stores GPS coordinates with timestamps
export const locationUpdates = pgTable("location_updates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  soldierId: varchar("soldier_id").notNull().references(() => soldiers.id, { onDelete: "cascade" }),
  latitude: real("latitude").notNull(),
  longitude: real("longitude").notNull(),
  accuracy: real("accuracy"),
  timestamp: timestamp("timestamp").defaultNow(),
});

// Messages table - stores encrypted quick-action messages
export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  soldierId: varchar("soldier_id").notNull().references(() => soldiers.id, { onDelete: "cascade" }),
  messageType: text("message_type").notNull(), // engagedEnemy, needMedical, requestBackup, allClear
  encryptedContent: text("encrypted_content").notNull(),
  timestamp: timestamp("timestamp").defaultNow(),
  acknowledged: boolean("acknowledged").default(false),
});

// Drone verifications table - stores face verification results
export const droneVerifications = pgTable("drone_verifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  soldierId: varchar("soldier_id").notNull().references(() => soldiers.id, { onDelete: "cascade" }),
  requestedBy: varchar("requested_by").notNull(), // tracker who initiated verification
  droneCoordinates: jsonb("drone_coordinates").$type<{ lat: number; lng: number }>(),
  verificationStatus: text("verification_status").notNull().default("pending"), // pending, verified, failed, alert
  confidenceScore: real("confidence_score"),
  timestamp: timestamp("timestamp").defaultNow(),
  completedAt: timestamp("completed_at"),
});

// Zod schemas for validation
export const insertSoldierSchema = createInsertSchema(soldiers)
  .pick({
    codename: true,
    password: true,
    role: true,
  })
  .extend({
    codename: z.string().min(3, "Codename must be at least 3 characters"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    role: z.string().default("soldier"),
  });

export const insertLocationUpdateSchema = createInsertSchema(locationUpdates)
  .pick({
    soldierId: true,
    latitude: true,
    longitude: true,
    accuracy: true,
  })
  .extend({
    soldierId: z.string().min(1, "Soldier ID required"),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    accuracy: z.number().optional(),
  });

export const insertMessageSchema = createInsertSchema(messages)
  .pick({
    soldierId: true,
    messageType: true,
    encryptedContent: true,
  })
  .extend({
    soldierId: z.string().min(1, "Soldier ID required"),
    messageType: z.string().min(1, "Message type required"),
    encryptedContent: z.string().min(1, "Content required"),
  });

export const insertDroneVerificationSchema = createInsertSchema(droneVerifications)
  .pick({
    soldierId: true,
    requestedBy: true,
    droneCoordinates: true,
  })
  .extend({
    soldierId: z.string().min(1, "Soldier ID required"),
    requestedBy: z.string().min(1, "Requester ID required"),
    droneCoordinates: z.object({
      lat: z.number(),
      lng: z.number(),
    }),
  });

// TypeScript types
export type Soldier = typeof soldiers.$inferSelect;
export type InsertSoldier = z.infer<typeof insertSoldierSchema>;

export type LocationUpdate = typeof locationUpdates.$inferSelect;
export type InsertLocationUpdate = z.infer<typeof insertLocationUpdateSchema>;

export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;

export type DroneVerification = typeof droneVerifications.$inferSelect;
export type InsertDroneVerification = z.infer<typeof insertDroneVerificationSchema>;

// Extend login schema to support both codename/password
export const loginSchema = z.object({
  codename: z.string().min(3, "Codename must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export type LoginCredentials = z.infer<typeof loginSchema>;

// Real-time WebSocket message types
export type WSMessage = 
  | { type: "locationUpdate"; data: LocationUpdate & { codename: string } }
  | { type: "message"; data: Message & { codename: string } }
  | { type: "soldierStatus"; data: { soldierId: string; codename: string; status: string } }
  | { type: "droneVerification"; data: DroneVerification & { codename: string } };
