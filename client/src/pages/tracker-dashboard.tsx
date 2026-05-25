"use client";

import { useState, useEffect, useRef } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { Button } from "@/components/ui/button";

import { Badge } from "@/components/ui/badge";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

import {
  LogOut,
  Signal,
  Radio,
  Target,
  Map,
  List,
  Eye,
  AlertTriangle,
  Clock,
  Users,
  Wifi,
  Shield,
  Activity,
  Zap,
  Plane,
} from "lucide-react";

import { useToast } from "@/hooks/use-toast";

import RadarView from "@/components/radar-view";

import MapView from "@/components/map-view";

import SoldierListView from "@/components/soldier-list-view";

import DroneVerificationModal from "@/components/drone-verification-modal";

import SurveillanceView from "@/components/surveillance-view";

import { decryptMessage } from "@/lib/crypto";

import type { WSMessage } from "@shared/schema";

interface SoldierData {
  id: string;

  codename: string;

  latitude: number;

  longitude: number;

  status: string;

  lastSeen: Date;
}

interface DroneData {
  id: string;

  codename: string;

  latitude: number;

  longitude: number;

  battery?: number;

  status: string;

  lastSeen: Date;
}

interface Alert {
  id: number;

  type:
    | "critical"
    | "warning"
    | "info";

  message: string;

  timestamp: Date;
}

export default function TrackerDashboard({
  soldier,
  websocket,
  onLogout,
}: {
  soldier: {
    id: string;
    codename: string;
    role: string;
  };

  websocket: WebSocket | null;

  onLogout: () => void;
}) {
  const [wsConnected, setWsConnected] =
    useState(false);

  const [soldiers, setSoldiers] =
    useState<SoldierData[]>(
      []
    );

  const [drones, setDrones] =
    useState<DroneData[]>([]);

  const [alerts, setAlerts] =
    useState<Alert[]>([]);

    const [
  liveDroneFrames,
  setLiveDroneFrames,
] = useState<
  Record<
    string,
    {
      frame: string;
      timestamp: number;
      codename: string;
    }
  >
>({});

const [
  selectedDroneFeed,
  setSelectedDroneFeed,
] = useState<string | null>(
  null
);

  const [
    trackerLocation,
    setTrackerLocation,
  ] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  const [
    currentTime,
    setCurrentTime,
  ] = useState(new Date());

  const alertRef =
    useRef<HTMLDivElement>(
      null
    );

  const [
    selectedView,
    setSelectedView,
  ] = useState<
    | "radar"
    | "map"
    | "list"
    | "surveillance"
  >("radar");

  const [
    verificationModal,
    setVerificationModal,
  ] = useState<{
    isOpen: boolean;
    soldier: SoldierData | null;
  }>({
    isOpen: false,
    soldier: null,
  });

  const { toast } =
    useToast();

  // CLOCK
  useEffect(() => {
    const interval =
      setInterval(
        () =>
          setCurrentTime(
            new Date()
          ),
        1000
      );

    return () =>
      clearInterval(
        interval
      );
  }, []);

  // INITIAL GPS
  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setTrackerLocation({
          latitude:
            pos.coords
              .latitude,

          longitude:
            pos.coords
              .longitude,
        });
      }
    );
  }, []);

  // WEBSOCKET
  useEffect(() => {
    if (!websocket) {
      setWsConnected(false);

      return;
    }

    setWsConnected(
      websocket.readyState ===
        WebSocket.OPEN
    );

    websocket.onopen = () => {
      setWsConnected(true);
    };

    websocket.onclose = () => {
      setWsConnected(false);
    };

    websocket.onerror = () => {
      setWsConnected(false);
    };

    websocket.onmessage = (
      event
    ) => {
      const message: WSMessage =
        JSON.parse(
          event.data
        );

      // SOLDIER LOCATION
      if (
        message.type ===
        "locationUpdate"
      ) {
        setSoldiers(
          (prev) => {
            const existing =
              prev.find(
                (s) =>
                  s.id ===
                  message
                    .data
                    .soldierId
              );

            const updated =
              {
                id: message
                  .data
                  .soldierId,

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

                status:
                  message
                    .data
                    .status ||
                  "online",

                lastSeen:
                  new Date(),
              };

            return existing
              ? prev.map(
                  (
                    s
                  ) =>
                    s.id ===
                    updated.id
                      ? {
                          ...s,
                          ...updated,
                        }
                      : s
                )
              : [
                  ...prev,
                  updated,
                ];
          }
        );
      }

      // DRONE LOCATION
      if (message.type === "droneLocationUpdate") {
        setDrones(
          (prev) => {
            const existing =
              prev.find(
                (d) =>
                  d.id ===
                  message
                    .data
                    .droneId
              );

            const updated =
              {
                id: message
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

                lastSeen:
                  new Date(),
              };

            return existing
              ? prev.map(
                  (
                    d
                  ) =>
                    d.id ===
                    updated.id
                      ? updated
                      : d
                )
              : [
                  ...prev,
                  updated,
                ];
          }
        );
      }
      // DRONE VIDEO FRAME
if (
  message.type ===
  "droneVideoFrame"
) {
  setLiveDroneFrames(
    (prev) => ({
      ...prev,

      [message.data.droneId]:
        {
          frame:
            message
              .data
              .frame,

          timestamp:
            message
              .data
              .timestamp,

          codename:
            message
              .data
              .codename,
        },
    })
  );

  // AUTO SELECT FIRST DRONE
  setSelectedDroneFeed(
    (prev) =>
      prev ||
      message.data
        .droneId
  );
}
      // MESSAGE EVENTS
      if (
        message.type ===
        "message"
      ) {
        const text =
          decryptMessage(
            message
              .data
              .encryptedContent
          );

        toast({
          title:
            message.data
              .codename,

          description:
            text,
        });

        // LIVE STATUS UPDATE
        setSoldiers((prev) =>
          prev.map((s) => {
            if (
              s.id !==
              message.data
                .soldierId
            ) {
              return s;
            }

            let updatedStatus =
              s.status;

            switch (
              message.data
                .messageType
            ) {
              case "engagedEnemy":
                updatedStatus =
                  "engaged";
                break;

              case "needMedical":
                updatedStatus =
                  "needsAssistance";
                break;

              case "needBackup":
                updatedStatus =
                  "needsAssistance";
                break;

              case "allClear":
                updatedStatus =
                  "online";
                break;

              default:
                break;
            }

            return {
              ...s,
              status:
                updatedStatus,
            };
          })
        );

        const addAlert = (
          type:
            | "critical"
            | "warning"
            | "info",
          msg: string
        ) => {
          setAlerts(
            (
              prev
            ) => [
              {
                id: Date.now(),
                type,
                message:
                  msg,
                timestamp:
                  new Date(),
              },
              ...prev,
            ]
          );
        };

        if (
          message.data
            .messageType ===
          "engagedEnemy"
        ) {
          addAlert(
            "critical",
            `Enemy engagement by ${message.data.codename}`
          );
        }

        if (
          message.data
            .messageType ===
          "needMedical"
        ) {
          addAlert(
            "critical",
            `Medical emergency: ${message.data.codename}`
          );
        }

        if (
          message.data
            .messageType ===
          "needBackup"
        ) {
          addAlert(
            "warning",
            `Backup requested by ${message.data.codename}`
          );
        }

        if (
          message.data
            .messageType ===
          "allClear"
        ) {
          addAlert(
            "info",
            `${message.data.codename} reports all clear`
          );
        }
      }
    };

    return () => {
      websocket.onopen =
        null;

      websocket.onclose =
        null;

      websocket.onmessage =
        null;

      websocket.onerror =
        null;
    };
  }, [
    websocket,
    toast,
  ]);

  const criticalAlerts =
    alerts.filter(
      (a) =>
        a.type ===
        "critical"
    ).length;

  const onlineSoldiers =
    soldiers.filter(
      (s) =>
        s.status !==
        "offline"
    ).length;
    
  if (
    !trackerLocation
  ) {
    return (
      <div className="min-h-screen bg-background tactical-grid flex items-center justify-center dark">
        <div className="spinner-tactical w-10 h-10" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background tactical-grid dark">
      {/* HEADER */}
      <header className="sticky top-0 z-50 header-tactical">
        <div className="flex items-center justify-between px-4 lg:px-6 h-14 max-w-[1600px] mx-auto">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />

              <span className="text-sm font-mono font-bold tracking-wider">
                COMMAND CENTER
              </span>
            </div>

            <div className="hidden md:flex items-center gap-2 text-xs font-mono text-muted-foreground px-3 py-1.5 bg-muted/50 rounded-md border border-border/50">
              <Clock className="h-3 w-3 text-primary" />

              <span className="tabular-nums">
                {currentTime.toLocaleTimeString(
                  "en-US",
                  {
                    hour12:
                      false,
                  }
                )}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="badge-tactical border-primary/40 text-primary gap-1.5"
            >
              <Radio className="h-3 w-3" />

              {
                soldier.codename
              }
            </Badge>

            <Badge
              variant={
                wsConnected
                  ? "outline"
                  : "destructive"
              }
              className={`badge-tactical gap-1.5 ${
                wsConnected
                  ? "badge-online"
                  : "badge-critical"
              }`}
            >
              <Signal className="h-3 w-3" />

              {wsConnected
                ? "ONLINE"
                : "OFFLINE"}
            </Badge>

            <Button
              variant="ghost"
              size="icon"
              onClick={
                onLogout
              }
              className="text-muted-foreground hover:text-destructive"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="p-4 lg:p-6 space-y-4 lg:space-y-6 max-w-[1600px] mx-auto pb-20">
        {/* STATS */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 lg:gap-4">
          <div className="data-panel rounded-lg p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Users className="h-4 w-4" />

              <span className="text-[10px] font-mono uppercase tracking-wider">
                Active Units
              </span>
            </div>

            <p className="text-3xl font-mono font-bold text-primary">
              {
                onlineSoldiers
              }
            </p>
          </div>

          <div className="data-panel rounded-lg p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Plane className="h-4 w-4 text-cyan-400" />

              <span className="text-[10px] font-mono uppercase tracking-wider">
                UAVs
              </span>
            </div>

            <p className="text-3xl font-mono font-bold text-cyan-400">
              {drones.length}
            </p>
          </div>

          <div className="data-panel rounded-lg p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <AlertTriangle className="h-4 w-4" />

              <span className="text-[10px] font-mono uppercase tracking-wider">
                Critical
              </span>
            </div>

            <p className="text-3xl font-mono font-bold text-destructive">
              {
                criticalAlerts
              }
            </p>
          </div>

          <div className="data-panel rounded-lg p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Wifi className="h-4 w-4" />

              <span className="text-[10px] font-mono uppercase tracking-wider">
                Connection
              </span>
            </div>

            <p className="text-3xl font-mono font-bold text-green-500">
              {wsConnected
                ? "LIVE"
                : "DOWN"}
            </p>
          </div>

          <div className="data-panel rounded-lg p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Activity className="h-4 w-4" />

              <span className="text-[10px] font-mono uppercase tracking-wider">
                Alerts
              </span>
            </div>

            <p className="text-3xl font-mono font-bold text-yellow-500">
              {
                alerts.length
              }
            </p>
          </div>
        </div>

        {/* ALERTS */}
        <Card className="card-tactical overflow-hidden">
          <CardHeader className="data-panel-header py-3 px-4">
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />

              <span className="text-sm font-mono uppercase tracking-wider">
                Active Alerts
              </span>
            </CardTitle>
          </CardHeader>

          <CardContent className="p-0">
            <div
              ref={
                alertRef
              }
              className="max-h-[180px] overflow-y-auto tactical-scrollbar"
            >
              {alerts.length ===
              0 ? (
                <div className="p-8 text-center">
                  <p className="text-sm font-mono text-muted-foreground">
                    All systems
                    nominal
                  </p>
                </div>
              ) : (
                alerts.map(
                  (a) => (
                    <div
                      key={
                        a.id
                      }
                      className={`p-4 flex items-center justify-between ${
                        a.type ===
                        "critical"
                          ? "alert-critical"
                          : "alert-warning"
                      }`}
                    >
                      <span className="text-sm font-mono">
                        {
                          a.message
                        }
                      </span>

                      <span className="text-[10px] font-mono text-muted-foreground">
                        {a.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                  )
                )
              )}
            </div>
          </CardContent>
        </Card>

        {/* TABS */}
        <Tabs
          value={
            selectedView
          }
          onValueChange={(
            v
          ) =>
            setSelectedView(
              v as typeof selectedView
            )
          }
        >
          <TabsList className="grid grid-cols-4 bg-card border border-border p-1 h-auto rounded-lg">
            <TabsTrigger
              value="radar"
              className="tab-tactical py-3 gap-2"
            >
              <Target className="h-4 w-4" />

              <span className="hidden sm:inline text-xs font-mono uppercase">
                Radar
              </span>
            </TabsTrigger>

            <TabsTrigger
              value="map"
              className="tab-tactical py-3 gap-2"
            >
              <Map className="h-4 w-4" />

              <span className="hidden sm:inline text-xs font-mono uppercase">
                Map
              </span>
            </TabsTrigger>

            <TabsTrigger
              value="list"
              className="tab-tactical py-3 gap-2"
            >
              <List className="h-4 w-4" />

              <span className="hidden sm:inline text-xs font-mono uppercase">
                List
              </span>
            </TabsTrigger>

            <TabsTrigger
              value="surveillance"
              className="tab-tactical py-3 gap-2"
            >
              <Eye className="h-4 w-4" />

              <span className="hidden sm:inline text-xs font-mono uppercase">
                Scan
              </span>
            </TabsTrigger>
          </TabsList>

          <div className="mt-4">
            <TabsContent
              value="radar"
              className="m-0"
            >
              <Card className="card-tactical overflow-hidden">
                <CardContent className="p-4 lg:p-6">
                  <RadarView
                    trackerLocation={
                      trackerLocation
                    }
                    soldiers={
                      soldiers
                    }
                    drones={
                      drones
                    }
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent
              value="map"
              className="m-0"
            >
              <Card className="card-tactical overflow-hidden">
                <CardContent className="p-4 lg:p-6">
                  <MapView
                    trackerLocation={
                      trackerLocation
                    }
                    soldiers={
                      soldiers
                    }
                    drones={
                      drones
                    }
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent
              value="list"
              className="m-0"
            >
              <Card className="card-tactical overflow-hidden">
                <CardContent className="p-4 lg:p-6">
                  <SoldierListView
                    trackerLocation={
                      trackerLocation
                    }
                    soldiers={
                      soldiers
                    }
                    onRequestVerification={(
                      id
                    ) => {
                      const selected =
                        soldiers.find(
                          (
                            s
                          ) =>
                            s.id ===
                            id
                        );

                      setVerificationModal(
                        {
                          isOpen: true,
                          soldier:
                            selected ||
                            null,
                        }
                      );
                    }}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent
              value="surveillance"
              className="m-0"
            >
              <Card className="card-tactical overflow-hidden">
                <CardContent className="p-4 lg:p-6">
                  <SurveillanceView
  drones={drones}
  liveDroneFrames={
    liveDroneFrames
  }
  selectedDroneFeed={
    selectedDroneFeed
  }
  setSelectedDroneFeed={
    setSelectedDroneFeed
  }
/>
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </Tabs>
      </main>

      {/* MODAL */}
      <DroneVerificationModal
        isOpen={
          verificationModal.isOpen
        }
        onClose={() =>
          setVerificationModal(
            {
              isOpen: false,
              soldier:
                null,
            }
          )
        }
        soldier={
          verificationModal.soldier
        }
        onInitiateVerification={() => {}}
        verificationStatus="idle"
      />
    </div>
  );
}