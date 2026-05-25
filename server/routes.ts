import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import {
  loginSchema,
  insertSoldierSchema,
} from "@shared/schema";

import bcrypt from "bcryptjs";

// WebSocket connection tracking
const connections = new Map<
  string,
  {
    ws: WebSocket;
    userId: string;
    codename: string;
    role: string;
  }
>();

// Recent server debug logs
const recentLogs: string[] =
  [];

function pushLog(
  msg: string
) {
  try {
    const ts =
      new Date().toISOString();

    recentLogs.push(
      `${ts} ${msg}`
    );

    if (
      recentLogs.length >
      200
    )
      recentLogs.shift();
  } catch {}
}

export async function registerRoutes(
  app: Express
): Promise<Server> {
  // AUTH REGISTER
  app.post(
    "/api/auth/register",
    async (req, res) => {
      try {
        const data =
          insertSoldierSchema.parse(
            req.body
          );

        const existing =
          await storage.getSoldierByCodename(
            data.codename
          );

        if (existing) {
          return res
            .status(400)
            .json({
              error:
                "Codename already exists",
            });
        }

        const hashedPassword =
          await bcrypt.hash(
            data.password,
            10
          );

        const soldier =
          await storage.createSoldier(
            {
              ...data,
              password:
                hashedPassword,
            }
          );

        res.json({
          id: soldier.id,
          codename:
            soldier.codename,
          role:
            soldier.role,
        });
      } catch (
        error: any
      ) {
        res
          .status(400)
          .json({
            error:
              error.message,
          });
      }
    }
  );

  // AUTH LOGIN
  app.post(
    "/api/auth/login",
    async (req, res) => {
      try {
        const data =
          loginSchema.parse(
            req.body
          );

        const soldier =
          await storage.getSoldierByCodename(
            data.codename
          );

        if (!soldier) {
          return res
            .status(401)
            .json({
              error:
                "Invalid credentials",
            });
        }

        const validPassword =
          await bcrypt.compare(
            data.password,
            soldier.password
          );

        if (
          !validPassword
        ) {
          return res
            .status(401)
            .json({
              error:
                "Invalid credentials",
            });
        }

        await storage.updateSoldierStatus(
          soldier.id,
          "online"
        );

        res.json({
          id: soldier.id,
          codename:
            soldier.codename,
          role:
            soldier.role,
        });
      } catch (
        error: any
      ) {
        res
          .status(400)
          .json({
            error:
              error.message,
          });
      }
    }
  );

  // LOCATION ROUTES
  app.post(
    "/api/locations",
    async (req, res) => {
      try {
        const {
          insertLocationUpdateSchema,
        } = await import(
          "@shared/schema"
        );

        const data =
          insertLocationUpdateSchema.parse(
            req.body
          );

        const soldier =
          await storage.getSoldier(
            data.soldierId
          );

        if (!soldier) {
          return res
            .status(404)
            .json({
              error:
                "Soldier not found",
            });
        }

        const location =
          await storage.createLocationUpdate(
            data
          );

        try {
          const broadcastMessage =
            {
              type: "locationUpdate",
              data: {
                ...location,
                codename:
                  soldier.codename,
              },
            };

          for (const [
            ,
            conn,
          ] of connections.entries()) {
            if (
              conn.role ===
                "tracker" &&
              conn.ws
                .readyState ===
                WebSocket.OPEN
            ) {
              try {
                conn.ws.send(
                  JSON.stringify(
                    broadcastMessage
                  )
                );
              } catch (
                err
              ) {
                console.error(
                  err
                );
              }
            }
          }
        } catch (e) {
          console.error(e);
        }

        res.json(location);
      } catch (
        error: any
      ) {
        res
          .status(400)
          .json({
            error:
              error.message,
          });
      }
    }
  );

  // GET LATEST LOCATIONS
  app.get(
    "/api/locations/latest",
    async (
      req,
      res
    ) => {
      try {
        const locations =
          await storage.getLatestLocations();

        res.json(
          locations
        );
      } catch (
        error: any
      ) {
        res
          .status(500)
          .json({
            error:
              error.message,
          });
      }
    }
  );

  // MESSAGE ROUTES
  app.post(
    "/api/messages",
    async (req, res) => {
      try {
        const {
          insertMessageSchema,
        } = await import(
          "@shared/schema"
        );

        const data =
          insertMessageSchema.parse(
            req.body
          );

        const soldier =
          await storage.getSoldier(
            data.soldierId
          );

        if (!soldier) {
          return res
            .status(404)
            .json({
              error:
                "Soldier not found",
            });
        }

        const message =
          await storage.createMessage(
            data
          );

        res.json(
          message
        );
      } catch (
        error: any
      ) {
        res
          .status(400)
          .json({
            error:
              error.message,
          });
      }
    }
  );

  // HTTP SERVER
  const httpServer =
    createServer(app);

  // WEBSOCKET SERVER
  const wss =
    new WebSocketServer(
      {
        server:
          httpServer,
        path: "/ws",
      }
    );

  wss.on(
    "connection",
    (
      ws: WebSocket
    ) => {
      console.log(
        "New WebSocket connection"
      );

      let connectionId:
        | string
        | null = null;

      ws.on(
        "message",
        async (
          data: Buffer
        ) => {
          try {
            const message =
              JSON.parse(
                data.toString()
              );

            console.log(
              "WS recv:",
              message.type
            );

            switch (
              message.type
            ) {
              // REGISTER
              case "register":
                if (
                  !message.data ||
                  !message.data
                    .userId ||
                  !message.data
                    .role
                ) {
                  console.warn(
                    "Invalid register payload"
                  );

                  break;
                }

                connectionId = `${message.data.userId}-${Date.now()}`;

                connections.set(
                  connectionId,
                  {
                    ws,

                    userId:
                      message
                        .data
                        .userId,

                    codename:
                      message
                        .data
                        .codename,

                    role:
                      message
                        .data
                        .role,
                  }
                );

                console.log(
                  `Registered ${message.data.codename}`
                );

                break;

              // SOLDIER LOCATION
              case "locationUpdate":
                const location =
                  await storage.createLocationUpdate(
                    message.data
                  );

                const soldierRecord =
                  await storage.getSoldier(
                    message
                      .data
                      .soldierId
                  );

                if (
                  soldierRecord
                ) {
                  await storage.updateSoldierStatus(
                    soldierRecord.id,
                    "online"
                  );
                }

                const broadcastMessage =
                  {
                    type: "locationUpdate",
                    data: {
                      ...location,
                      codename:
                        soldierRecord?.codename ||
                        "Unknown",
                    },
                  };

                for (const [
                  ,
                  conn,
                ] of connections.entries()) {
                  if (
                    conn.role ===
                      "tracker" &&
                    conn.ws
                      .readyState ===
                      WebSocket.OPEN
                  ) {
                    try {
                      conn.ws.send(
                        JSON.stringify(
                          broadcastMessage
                        )
                      );
                    } catch (
                      e
                    ) {
                      console.error(
                        e
                      );
                    }
                  }
                }

                break;


              case "droneVideoFrame":
  const videoFrameMessage = {
    type: "droneVideoFrame",

    data: {
      droneId:
        message.data.droneId,

      codename:
        message.data.codename,

      frame:
        message.data.frame,

      timestamp:
        message.data.timestamp,
    },
  };

  // DEBUG
  try {
    const trackers =
      Array.from(
        connections.entries()
      )
        .filter(
          ([, c]) =>
            c.role ===
            "tracker"
        )
        .map(
          ([id, c]) => ({
            id,
            codename:
              c.codename,
          })
        );

    const dbg = `Broadcasting droneVideoFrame from ${message.data.codename} to ${trackers.length} trackers`;

    console.log(dbg);

    pushLog(dbg);
  } catch {}

  // SEND TO TRACKERS
  for (const [, conn] of connections.entries()) {
    if (
      conn.role ===
        "tracker" &&
      conn.ws.readyState ===
        WebSocket.OPEN
    ) {
      try {
        conn.ws.send(
          JSON.stringify(
            videoFrameMessage
          )
        );
      } catch (e) {
        console.error(
          "Failed video WS",
          e
        );

        pushLog(
          `Failed video WS: ${String(
            e
          )}`
        );
      }
    }
  }

  break;
  

              // DRONE LOCATION
              case "droneLocationUpdate":
                const droneBroadcastMessage =
                  {
                    type: "droneLocationUpdate",

                    data: {
                      droneId:
                        message
                          .data
                          .droneId,

                      codename:
                        message
                          .data
                          .codename,

                      latitude:
                        message
                          .data
                          .latitude,

                      longitude:
                        message
                          .data
                          .longitude,

                      battery:
                        message
                          .data
                          .battery,

                      status:
                        message
                          .data
                          .status ||
                        "active",
                    },
                  };

                try {
                  const trackers =
                    Array.from(
                      connections.entries()
                    )
                      .filter(
                        (
                          [
                            ,
                            c,
                          ]
                        ) =>
                          c.role ===
                          "tracker"
                      )
                      .map(
                        ([
                          id,
                          c,
                        ]) => ({
                          id,
                          codename:
                            c.codename,
                        })
                      );

                  const bmsg = `Broadcasting droneLocationUpdate for ${message.data.codename} to ${trackers.length} trackers`;

                  console.log(
                    bmsg
                  );

                  pushLog(
                    bmsg
                  );
                } catch {}

                for (const [
                  ,
                  conn,
                ] of connections.entries()) {
                  if (
                    conn.role ===
                      "tracker" &&
                    conn.ws
                      .readyState ===
                      WebSocket.OPEN
                  ) {
                    try {
                      conn.ws.send(
                        JSON.stringify(
                          droneBroadcastMessage
                        )
                      );
                    } catch (
                      e
                    ) {
                      console.error(
                        "Failed drone WS",
                        e
                      );

                      pushLog(
                        `Failed drone WS: ${String(
                          e
                        )}`
                      );
                    }
                  }
                }

                break;

              // MESSAGE
              case "message":
                const savedMessage =
                  await storage.createMessage(
                    message.data
                  );

                const messageSoldier =
                  await storage.getSoldier(
                    message
                      .data
                      .soldierId
                  );

                if (
                  messageSoldier
                ) {
                  if (
                    message
                      .data
                      .messageType ===
                    "engagedEnemy"
                  ) {
                    await storage.updateSoldierStatus(
                      messageSoldier.id,
                      "engaged"
                    );
                  } else if (
                    message
                      .data
                      .messageType ===
                    "needMedical"
                  ) {
                    await storage.updateSoldierStatus(
                      messageSoldier.id,
                      "needsAssistance"
                    );
                  }

                  const broadcastMessage =
                    {
                      type: "message",

                      data: {
                        ...savedMessage,
                        codename:
                          messageSoldier.codename,
                      },
                    };

                  connections.forEach(
                    (
                      conn
                    ) => {
                      if (
                        conn.role ===
                          "tracker" &&
                        conn.ws
                          .readyState ===
                          WebSocket.OPEN
                      ) {
                        conn.ws.send(
                          JSON.stringify(
                            broadcastMessage
                          )
                        );
                      }
                    }
                  );
                }

                break;
            }
          } catch (
            error
          ) {
            console.error(
              "WebSocket message error:",
              error
            );
          }
        }
      );

      ws.on(
        "close",
        () => {
          if (
            connectionId
          ) {
            const conn =
              connections.get(
                connectionId
              );

            if (conn) {
              console.log(
                `Disconnected ${conn.codename}`
              );

              storage
                .updateSoldierStatus(
                  conn.userId,
                  "offline"
                )
                .catch(
                  console.error
                );
            }

            connections.delete(
              connectionId
            );
          }
        }
      );

      ws.on(
        "error",
        (
          error
        ) => {
          console.error(
            "WebSocket error:",
            error
          );
        }
      );
    }
  );

  return httpServer;
}