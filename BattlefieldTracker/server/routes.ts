import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { loginSchema, insertSoldierSchema } from "@shared/schema";
import bcrypt from "bcryptjs";

// WebSocket connection tracking
const connections = new Map<
  string,
  { ws: WebSocket; userId: string; codename: string; role: string }
>();

// Recent server debug logs (keeps a small buffer for runtime inspection)
const recentLogs: string[] = [];
function pushLog(msg: string) {
  try {
    const ts = new Date().toISOString();
    recentLogs.push(`${ts} ${msg}`);
    if (recentLogs.length > 200) recentLogs.shift();
  } catch {}
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Authentication routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const data = insertSoldierSchema.parse(req.body);

      // Check if codename already exists
      const existing = await storage.getSoldierByCodename(data.codename);
      if (existing) {
        return res.status(400).json({ error: "Codename already exists" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(data.password, 10);

      // Create soldier
      const soldier = await storage.createSoldier({
        ...data,
        password: hashedPassword,
      });

      res.json({
        id: soldier.id,
        codename: soldier.codename,
        role: soldier.role,
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const data = loginSchema.parse(req.body);

      const soldier = await storage.getSoldierByCodename(data.codename);
      if (!soldier) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const validPassword = await bcrypt.compare(data.password, soldier.password);
      if (!validPassword) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      // Update status to online
      await storage.updateSoldierStatus(soldier.id, "online");

      res.json({
        id: soldier.id,
        codename: soldier.codename,
        role: soldier.role,
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Location routes
  app.post("/api/locations", async (req, res) => {
    try {
      const { insertLocationUpdateSchema } = await import("@shared/schema");
      const data = insertLocationUpdateSchema.parse(req.body);
      
      // Verify soldier exists
      const soldier = await storage.getSoldier(data.soldierId);
      if (!soldier) {
        return res.status(404).json({ error: "Soldier not found" });
      }
      
      const location = await storage.createLocationUpdate(data);
      // Broadcast this location to all connected trackers as well (if any)
      try {
        const broadcastMessage = {
          type: "locationUpdate",
          data: { ...location, codename: soldier.codename },
        };

        const trackers = Array.from(connections.entries()).filter(([, c]) => c.role === "tracker").map(([id, c]) => ({ id, codename: c.codename }));
        const bmsg = `API POST /api/locations broadcasting locationUpdate for ${soldier.codename} to ${trackers.length} trackers`;
        console.log(bmsg);
        pushLog(bmsg);

        for (const [, conn] of connections.entries()) {
          if (conn.role === "tracker" && conn.ws.readyState === WebSocket.OPEN) {
            try {
              conn.ws.send(JSON.stringify(broadcastMessage));
            } catch (err) {
              console.error("Failed to send WS to tracker (POST broadcast)", err);
            }
          }
        }
      } catch (e) {
        console.error("Error broadcasting POST location", e);
      }
      res.json(location);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/locations/latest", async (req, res) => {
    try {
      const locations = await storage.getLatestLocations();
      res.json(locations);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Message routes
  app.post("/api/messages", async (req, res) => {
    try {
      const { insertMessageSchema } = await import("@shared/schema");
      const data = insertMessageSchema.parse(req.body);
      
      // Verify soldier exists
      const soldier = await storage.getSoldier(data.soldierId);
      if (!soldier) {
        return res.status(404).json({ error: "Soldier not found" });
      }
      
      const message = await storage.createMessage(data);
      res.json(message);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/messages", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const messages = await storage.getRecentMessages(limit);
      res.json(messages);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Debug endpoints to inspect runtime state
  app.get("/api/debug/connections", (_req, res) => {
    try {
      const list = Array.from(connections.entries()).map(([id, conn]) => ({
        id,
        userId: conn.userId,
        codename: conn.codename,
        role: conn.role,
        readyState: conn.ws.readyState,
      }));
      res.json(list);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/debug/locations", async (_req, res) => {
    try {
      const locations = await storage.getLatestLocations();
      res.json(locations);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/debug/logs', (_req, res) => {
    try {
      res.json(recentLogs.slice(-200));
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Debug: trigger a synthetic broadcast for testing tracker clients
  app.post('/api/debug/broadcast', async (req, res) => {
    try {
      const { soldierId, latitude, longitude, accuracy } = req.body;
      if (!soldierId || typeof latitude !== 'number' || typeof longitude !== 'number') {
        return res.status(400).json({ error: 'soldierId, latitude, longitude required' });
      }

      const location = await storage.createLocationUpdate({ soldierId, latitude, longitude, accuracy });
      const soldier = await storage.getSoldier(soldierId);

      const broadcastMessage = {
        type: 'locationUpdate',
        data: { ...location, codename: soldier?.codename || 'Unknown' },
      };

      const trackers = Array.from(connections.entries()).filter(([, c]) => c.role === 'tracker').map(([id, c]) => ({ id, codename: c.codename }));
      const bmsg = `Debug broadcast for ${soldier?.codename || soldierId} to ${trackers.length} trackers`;
      console.log(bmsg);
      pushLog(bmsg);

      for (const [, conn] of connections.entries()) {
        if (conn.role === 'tracker' && conn.ws.readyState === WebSocket.OPEN) {
          try {
            conn.ws.send(JSON.stringify(broadcastMessage));
          } catch (e) {
            console.error('Failed to send debug broadcast', e);
          }
        }
      }

      res.json({ ok: true, broadcastTo: trackers.length });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Drone verification routes
  app.post("/api/verifications", async (req, res) => {
    try {
      const { insertDroneVerificationSchema } = await import("@shared/schema");
      const data = insertDroneVerificationSchema.parse(req.body);
      
      // Verify soldier exists
      const soldier = await storage.getSoldier(data.soldierId);
      if (!soldier) {
        return res.status(404).json({ error: "Soldier not found" });
      }
      
      const verification = await storage.createDroneVerification(data);
      res.json(verification);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  const httpServer = createServer(app);

  // WebSocket server setup
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

  wss.on("connection", (ws: WebSocket) => {
    console.log("New WebSocket connection");
    let connectionId: string | null = null;

    ws.on("message", async (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());
        // Debug log incoming websocket messages
        try {
          console.log("WS recv:", message.type, message.data?.soldierId ?? message.data?.userId ?? null);
        } catch (e) {
          console.log("WS recv: (unavailable data)");
        }

        switch (message.type) {
          case "register":
            // Validate register payload before creating a connection entry
            if (!message.data || !message.data.userId || !message.data.role) {
              console.warn("WS register received with invalid payload, ignoring", message.data);
              pushLog(`Ignored invalid register payload: ${JSON.stringify(message.data)}`);
              break;
            }

            // Register user connection
            connectionId = `${message.data.userId}-${Date.now()}`;
            connections.set(connectionId, {
              ws,
              userId: message.data.userId,
              codename: message.data.codename,
              role: message.data.role,
            });
            const regMsg = `Registered ${message.data.codename} (${message.data.role}) -> connectionId=${connectionId}`;
            console.log(regMsg);
            pushLog(regMsg);
            // Debug: print current connections summary
            try {
              const summary = Array.from(connections.entries()).map(([id, c]) => ({ id, codename: c.codename, role: c.role }));
              console.log("Connections:", summary);
              pushLog(`Connections: ${JSON.stringify(summary)}`);
            } catch {}
            break;

          case "locationUpdate":
            // Save location to database
            const location = await storage.createLocationUpdate(message.data);

            // Try to resolve soldier info
            const soldierRecord = await storage.getSoldier(message.data.soldierId);
            if (soldierRecord) {
              // Update soldier status
              await storage.updateSoldierStatus(soldierRecord.id, "online");
            }

            // Always broadcast location updates to trackers so UI remains responsive
            const broadcastMessage = {
              type: "locationUpdate",
              data: { ...location, codename: soldierRecord?.codename || "Unknown" },
            };

            // Debug: show who will receive this broadcast
            try {
              const trackers = Array.from(connections.entries())
                .filter(([, c]) => c.role === "tracker")
                .map(([id, c]) => ({ id, codename: c.codename }));
              const bmsg = `Broadcasting locationUpdate for ${soldierRecord?.codename || message.data.soldierId} to ${trackers.length} trackers: ${JSON.stringify(trackers)}`;
              console.log(bmsg);
              pushLog(bmsg);
            } catch {}

            for (const [, conn] of connections.entries()) {
              if (conn.role === "tracker" && conn.ws.readyState === WebSocket.OPEN) {
                try {
                  conn.ws.send(JSON.stringify(broadcastMessage));
                } catch (e) {
                  console.error("Failed to send WS to tracker", e);
                  pushLog(`Failed to send WS to tracker: ${String(e)}`);
                }
              }
            }
            break;

          case "message":
            // Save message to database
            const savedMessage = await storage.createMessage(message.data);

            // Get soldier info
            const messageSoldier = await storage.getSoldier(message.data.soldierId);
            if (messageSoldier) {
              // Update soldier status based on message type
              if (message.data.messageType === "engagedEnemy") {
                await storage.updateSoldierStatus(messageSoldier.id, "engaged");
              } else if (message.data.messageType === "needMedical") {
                await storage.updateSoldierStatus(messageSoldier.id, "needsAssistance");
              }

              // Broadcast to all trackers
              const broadcastMessage = {
                type: "message",
                data: { ...savedMessage, codename: messageSoldier.codename },
              };

              connections.forEach((conn) => {
                if (conn.role === "tracker" && conn.ws.readyState === WebSocket.OPEN) {
                  conn.ws.send(JSON.stringify(broadcastMessage));
                }
              });
            }
            break;

          case "droneVerification":
            // Save verification request
            const verification = await storage.createDroneVerification(message.data);

            // Simulate drone verification process (2-3 seconds)
            setTimeout(async () => {
              // Randomly simulate success/failure (70% success rate)
              const isVerified = Math.random() > 0.3;
              const status = isVerified ? "verified" : "failed";
              const confidenceScore = isVerified ? 0.85 + Math.random() * 0.15 : Math.random() * 0.5;

              await storage.updateDroneVerification(
                verification.id,
                status,
                confidenceScore
              );

              // Get soldier info
              const verificationSoldier = await storage.getSoldier(message.data.soldierId);
              if (verificationSoldier) {
                // Send result back to tracker
                const resultMessage = {
                  type: "droneVerification",
                  data: {
                    ...verification,
                    verificationStatus: status,
                    confidenceScore,
                    codename: verificationSoldier.codename,
                  },
                };

                connections.forEach((conn) => {
                  if (conn.role === "tracker" && conn.ws.readyState === WebSocket.OPEN) {
                    conn.ws.send(JSON.stringify(resultMessage));
                  }
                });
              }
            }, 2000 + Math.random() * 1000); // 2-3 seconds
            break;
        }
      } catch (error) {
        console.error("WebSocket message error:", error);
      }
    });

    ws.on("close", () => {
      if (connectionId) {
        const conn = connections.get(connectionId);
        if (conn) {
          const dmsg = `Disconnected ${conn.codename} (${conn.role}) -> connectionId=${connectionId}`;
          console.log(dmsg);
          pushLog(dmsg);
          // Update soldier status to offline
          storage.updateSoldierStatus(conn.userId, "offline").catch(console.error);
        }
        connections.delete(connectionId);
      }
    });

    ws.on("error", (error) => {
      console.error("WebSocket error:", error);
    });
  });

  return httpServer;
}
