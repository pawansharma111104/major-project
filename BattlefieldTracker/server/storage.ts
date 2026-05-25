import {
  type Soldier,
  type InsertSoldier,
  type LocationUpdate,
  type InsertLocationUpdate,
  type Message,
  type InsertMessage,
  type DroneVerification,
  type InsertDroneVerification,
  soldiers,
  locationUpdates,
  messages,
  droneVerifications,
} from "@shared/schema";
import { randomUUID } from "crypto";
import { db } from "../db";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  // Soldiers
  getSoldier(id: string): Promise<Soldier | undefined>;
  getSoldierByCodename(codename: string): Promise<Soldier | undefined>;
  createSoldier(soldier: InsertSoldier): Promise<Soldier>;
  updateSoldierStatus(id: string, status: string): Promise<void>;

  // Location Updates
  createLocationUpdate(update: InsertLocationUpdate): Promise<LocationUpdate>;
  getLatestLocations(): Promise<Array<LocationUpdate & { codename: string }>>;
  getSoldierLocation(soldierId: string): Promise<LocationUpdate | undefined>;

  // Messages
  createMessage(message: InsertMessage): Promise<Message>;
  getRecentMessages(limit?: number): Promise<Array<Message & { codename: string }>>;

  // Drone Verifications
  createDroneVerification(verification: InsertDroneVerification): Promise<DroneVerification>;
  updateDroneVerification(
    id: string,
    status: string,
    confidenceScore?: number
  ): Promise<void>;
  getDroneVerification(id: string): Promise<DroneVerification | undefined>;
}

export class MemStorage implements IStorage {
  private soldiers: Map<string, Soldier>;
  private locationUpdates: Map<string, LocationUpdate>;
  private messages: Map<string, Message>;
  private droneVerifications: Map<string, DroneVerification>;

  constructor() {
    this.soldiers = new Map();
    this.locationUpdates = new Map();
    this.messages = new Map();
    this.droneVerifications = new Map();
  }

  async getSoldier(id: string): Promise<Soldier | undefined> {
    return this.soldiers.get(id);
  }

  async getSoldierByCodename(codename: string): Promise<Soldier | undefined> {
    return Array.from(this.soldiers.values()).find(
      (soldier) => soldier.codename === codename
    );
  }

  async createSoldier(insertSoldier: InsertSoldier): Promise<Soldier> {
    const id = randomUUID();
    const soldier: Soldier = {
      ...insertSoldier,
      id,
      role: insertSoldier.role || "soldier",
      status: "offline",
      lastSeen: new Date(),
      createdAt: new Date(),
    };
    this.soldiers.set(id, soldier);
    return soldier;
  }

  async updateSoldierStatus(id: string, status: string): Promise<void> {
    const soldier = this.soldiers.get(id);
    if (soldier) {
      this.soldiers.set(id, { ...soldier, status, lastSeen: new Date() });
    }
  }

  async createLocationUpdate(
    insertUpdate: InsertLocationUpdate
  ): Promise<LocationUpdate> {
    const id = randomUUID();
    const update: LocationUpdate = {
      ...insertUpdate,
      id,
      accuracy: insertUpdate.accuracy || null,
      timestamp: new Date(),
    };
    this.locationUpdates.set(id, update);
    return update;
  }

  async getLatestLocations(): Promise<Array<LocationUpdate & { codename: string }>> {
    const soldierLocations = new Map<string, LocationUpdate>();

    // Get most recent location for each soldier
    Array.from(this.locationUpdates.values())
      .sort((a, b) => (b.timestamp?.getTime() || 0) - (a.timestamp?.getTime() || 0))
      .forEach((update) => {
        if (!soldierLocations.has(update.soldierId)) {
          soldierLocations.set(update.soldierId, update);
        }
      });

    // Add codenames
    return Array.from(soldierLocations.values()).map((update) => {
      const soldier = this.soldiers.get(update.soldierId);
      return {
        ...update,
        codename: soldier?.codename || "Unknown",
      };
    });
  }

  async getSoldierLocation(soldierId: string): Promise<LocationUpdate | undefined> {
    return Array.from(this.locationUpdates.values())
      .filter((update) => update.soldierId === soldierId)
      .sort((a, b) => (b.timestamp?.getTime() || 0) - (a.timestamp?.getTime() || 0))[0];
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const id = randomUUID();
    const message: Message = {
      ...insertMessage,
      id,
      timestamp: new Date(),
      acknowledged: false,
    };
    this.messages.set(id, message);
    return message;
  }

  async getRecentMessages(
    limit: number = 50
  ): Promise<Array<Message & { codename: string }>> {
    return Array.from(this.messages.values())
      .sort((a, b) => (b.timestamp?.getTime() || 0) - (a.timestamp?.getTime() || 0))
      .slice(0, limit)
      .map((message) => {
        const soldier = this.soldiers.get(message.soldierId);
        return {
          ...message,
          codename: soldier?.codename || "Unknown",
        };
      });
  }

  async createDroneVerification(
    insertVerification: InsertDroneVerification
  ): Promise<DroneVerification> {
    const id = randomUUID();
    const verification: DroneVerification = {
      ...insertVerification,
      id,
      verificationStatus: "pending",
      confidenceScore: null,
      timestamp: new Date(),
      completedAt: null,
    };
    this.droneVerifications.set(id, verification);
    return verification;
  }

  async updateDroneVerification(
    id: string,
    status: string,
    confidenceScore?: number
  ): Promise<void> {
    const verification = this.droneVerifications.get(id);
    if (verification) {
      this.droneVerifications.set(id, {
        ...verification,
        verificationStatus: status,
        confidenceScore: confidenceScore || null,
        completedAt: new Date(),
      });
    }
  }

  async getDroneVerification(id: string): Promise<DroneVerification | undefined> {
    return this.droneVerifications.get(id);
  }
}

// Database storage implementation
export class DbStorage implements IStorage {
  async getSoldier(id: string): Promise<Soldier | undefined> {
    const result = await db.select().from(soldiers).where(eq(soldiers.id, id)).limit(1);
    return result[0];
  }

  async getSoldierByCodename(codename: string): Promise<Soldier | undefined> {
    const result = await db
      .select()
      .from(soldiers)
      .where(eq(soldiers.codename, codename))
      .limit(1);
    return result[0];
  }

  async createSoldier(insertSoldier: InsertSoldier): Promise<Soldier> {
    const result = await db.insert(soldiers).values(insertSoldier).returning();
    return result[0];
  }

  async updateSoldierStatus(id: string, status: string): Promise<void> {
    await db
      .update(soldiers)
      .set({ status, lastSeen: new Date() })
      .where(eq(soldiers.id, id));
  }

  async createLocationUpdate(
    insertUpdate: InsertLocationUpdate
  ): Promise<LocationUpdate> {
    const result = await db.insert(locationUpdates).values(insertUpdate).returning();
    return result[0];
  }

  async getLatestLocations(): Promise<Array<LocationUpdate & { codename: string }>> {
    // Get most recent location for each soldier
    const result = await db
      .select({
        id: locationUpdates.id,
        soldierId: locationUpdates.soldierId,
        latitude: locationUpdates.latitude,
        longitude: locationUpdates.longitude,
        accuracy: locationUpdates.accuracy,
        timestamp: locationUpdates.timestamp,
        codename: soldiers.codename,
      })
      .from(locationUpdates)
      .innerJoin(soldiers, eq(locationUpdates.soldierId, soldiers.id))
      .orderBy(desc(locationUpdates.timestamp));

    // Filter to get only the most recent for each soldier
    const latest = new Map<string, any>();
    result.forEach((row) => {
      if (!latest.has(row.soldierId)) {
        latest.set(row.soldierId, row);
      }
    });

    return Array.from(latest.values());
  }

  async getSoldierLocation(soldierId: string): Promise<LocationUpdate | undefined> {
    const result = await db
      .select()
      .from(locationUpdates)
      .where(eq(locationUpdates.soldierId, soldierId))
      .orderBy(desc(locationUpdates.timestamp))
      .limit(1);
    return result[0];
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const result = await db.insert(messages).values(insertMessage).returning();
    return result[0];
  }

  async getRecentMessages(
    limit: number = 50
  ): Promise<Array<Message & { codename: string }>> {
    const result = await db
      .select({
        id: messages.id,
        soldierId: messages.soldierId,
        messageType: messages.messageType,
        encryptedContent: messages.encryptedContent,
        timestamp: messages.timestamp,
        acknowledged: messages.acknowledged,
        codename: soldiers.codename,
      })
      .from(messages)
      .innerJoin(soldiers, eq(messages.soldierId, soldiers.id))
      .orderBy(desc(messages.timestamp))
      .limit(limit);

    return result;
  }

  async createDroneVerification(
    insertVerification: InsertDroneVerification
  ): Promise<DroneVerification> {
    const result = await db
      .insert(droneVerifications)
      .values(insertVerification)
      .returning();
    return result[0];
  }

  async updateDroneVerification(
    id: string,
    status: string,
    confidenceScore?: number
  ): Promise<void> {
    await db
      .update(droneVerifications)
      .set({
        verificationStatus: status,
        confidenceScore: confidenceScore || null,
        completedAt: new Date(),
      })
      .where(eq(droneVerifications.id, id));
  }

  async getDroneVerification(id: string): Promise<DroneVerification | undefined> {
    const result = await db
      .select()
      .from(droneVerifications)
      .where(eq(droneVerifications.id, id))
      .limit(1);
    return result[0];
  }
}

// Use database storage if DATABASE_URL is available, otherwise use in-memory
export const storage = process.env.DATABASE_URL
  ? new DbStorage()
  : new MemStorage();
