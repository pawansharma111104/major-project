import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

import {
  Plane,
  Signal,
  Navigation,
  Battery,
  Shield,
  LogOut,
  Clock,
  MapPin,
  Camera,
  Video,
} from "lucide-react";

import { useToast } from "@/hooks/use-toast";

interface DroneDashboardProps {
  drone: {
    id: string;
    codename: string;
    role: string;
  };

  websocket: WebSocket | null;

  onLogout: () => void;
}

export default function DroneDashboard({
  drone,
  websocket,
  onLogout,
}: DroneDashboardProps) {
  const [gpsEnabled, setGpsEnabled] =
    useState(false);

  const [cameraEnabled, setCameraEnabled] =
    useState(false);

  const [wsConnected, setWsConnected] =
    useState(false);

  const [currentLocation, setCurrentLocation] =
    useState<{
      latitude: number;
      longitude: number;
      accuracy?: number;
    } | null>(null);

  const [batteryLevel, setBatteryLevel] =
    useState<number>(100);

  const [currentTime, setCurrentTime] =
    useState(new Date());

  const watchIdRef =
    useRef<number | null>(null);

  const videoRef =
    useRef<HTMLVideoElement | null>(
      null
    );

  const canvasRef =
    useRef<HTMLCanvasElement | null>(
      null
    );

  const streamRef =
    useRef<MediaStream | null>(
      null
    );

  const frameIntervalRef =
    useRef<NodeJS.Timeout | null>(
      null
    );

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

  // WS STATUS
  useEffect(() => {
    if (!websocket) {
      setWsConnected(false);

      return;
    }

    setWsConnected(
      websocket.readyState ===
        WebSocket.OPEN
    );

    const handleOpen = () =>
      setWsConnected(true);

    const handleClose = () =>
      setWsConnected(false);

    websocket.addEventListener(
      "open",
      handleOpen
    );

    websocket.addEventListener(
      "close",
      handleClose
    );

    return () => {
      websocket.removeEventListener(
        "open",
        handleOpen
      );

      websocket.removeEventListener(
        "close",
        handleClose
      );
    };
  }, [websocket]);

  // BATTERY
  useEffect(() => {
    const nav =
      navigator as any;

    if (nav.getBattery) {
      nav
        .getBattery()
        .then((battery: any) => {
          setBatteryLevel(
            Math.round(
              battery.level * 100
            )
          );

          battery.addEventListener(
            "levelchange",
            () => {
              setBatteryLevel(
                Math.round(
                  battery.level *
                    100
                )
              );
            }
          );
        });
    }
  }, []);

  // GPS
  useEffect(() => {
    if (!gpsEnabled) {
      if (
        watchIdRef.current !==
        null
      ) {
        navigator.geolocation.clearWatch(
          watchIdRef.current
        );

        watchIdRef.current = null;
      }

      return;
    }

    watchIdRef.current =
      navigator.geolocation.watchPosition(
        (position) => {
          const location = {
            latitude:
              position.coords
                .latitude,

            longitude:
              position.coords
                .longitude,

            accuracy:
              position.coords
                .accuracy,
          };

          setCurrentLocation(
            location
          );

          if (
            websocket &&
            websocket.readyState ===
              WebSocket.OPEN
          ) {
            websocket.send(
              JSON.stringify({
                type: "droneLocationUpdate",

                data: {
                  droneId:
                    drone.id,

                  codename:
                    drone.codename,

                  latitude:
                    location.latitude,

                  longitude:
                    location.longitude,

                  accuracy:
                    location.accuracy,

                  battery:
                    batteryLevel,

                  status:
                    "active",
                },
              })
            );
          }
        },

        (error) => {
          toast({
            title:
              "GPS Error",

            description:
              error.message,

            variant:
              "destructive",
          });

          setGpsEnabled(false);
        },

        {
          enableHighAccuracy: true,
          maximumAge: 3000,
          timeout: 10000,
        }
      );

    return () => {
      if (
        watchIdRef.current !==
        null
      ) {
        navigator.geolocation.clearWatch(
          watchIdRef.current
        );
      }
    };
  }, [
    gpsEnabled,
    websocket,
    drone,
    batteryLevel,
    toast,
  ]);

  // CAMERA STREAM
  useEffect(() => {
    if (!cameraEnabled) {
      if (
        streamRef.current
      ) {
        streamRef.current
          .getTracks()
          .forEach((track) =>
            track.stop()
          );

        streamRef.current =
          null;
      }

      if (
        frameIntervalRef.current
      ) {
        clearInterval(
          frameIntervalRef.current
        );
      }

      return;
    }

    const startCamera =
      async () => {
        try {
          const stream =
            await navigator.mediaDevices.getUserMedia(
              {
                video: {
                  facingMode:
                    "environment",

                  width: 320,

                  height: 240,
                },

                audio: false,
              }
            );

          streamRef.current =
            stream;

          if (
            videoRef.current
          ) {
            videoRef.current.srcObject =
              stream;

            await videoRef.current.play();
          }

          frameIntervalRef.current =
            setInterval(() => {
              if (
                !videoRef.current ||
                !canvasRef.current
              )
                return;

              const ctx =
                canvasRef.current.getContext(
                  "2d"
                );

              if (!ctx) return;

              canvasRef.current.width =
                320;

              canvasRef.current.height =
                240;

              ctx.drawImage(
                videoRef.current,
                0,
                0,
                320,
                240
              );

              const frame =
                canvasRef.current.toDataURL(
                  "image/jpeg",
                  0.5
                );

              if (
                websocket &&
                websocket.readyState ===
                  WebSocket.OPEN
              ) {
                websocket.send(
                  JSON.stringify({
                    type:
                      "droneVideoFrame",

                    data: {
                      droneId:
                        drone.id,

                      codename:
                        drone.codename,

                      frame,

                      timestamp:
                        Date.now(),
                    },
                  })
                );
              }
            }, 200);

          toast({
            title:
              "Camera Feed Active",

            description:
              "Live UAV stream started",
          });
        } catch (
          error
        ) {
          console.error(
            error
          );

          toast({
            title:
              "Camera Error",

            description:
              "Unable to access camera",

            variant:
              "destructive",
          });

          setCameraEnabled(
            false
          );
        }
      };

    startCamera();

    return () => {
      if (
        streamRef.current
      ) {
        streamRef.current
          .getTracks()
          .forEach((track) =>
            track.stop()
          );
      }

      if (
        frameIntervalRef.current
      ) {
        clearInterval(
          frameIntervalRef.current
        );
      }
    };
  }, [
    cameraEnabled,
    websocket,
    drone,
    toast,
  ]);

  return (
    <div className="min-h-screen bg-background tactical-grid p-4 dark">
      <div className="max-w-2xl mx-auto space-y-4">
        <video
          ref={videoRef}
          className="hidden"
          playsInline
          muted
        />

        <canvas
          ref={canvasRef}
          className="hidden"
        />

        {/* HEADER */}
        <Card className="card-tactical">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
                  <Plane className="h-5 w-5 text-cyan-400" />
                </div>

                <div>
                  <Badge className="badge-tactical bg-cyan-500 text-black mb-1">
                    {drone.codename}
                  </Badge>

                  <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
                    <Clock className="h-3 w-3" />

                    <span>
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
              </div>

              <div className="flex items-center gap-2">
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
                    ? "LIVE"
                    : "DOWN"}
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
          </CardHeader>
        </Card>

        {/* GPS */}
        <Card className="card-tactical">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-mono uppercase tracking-wider">
              <Navigation className="h-4 w-4 text-cyan-400" />

              Drone Telemetry
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* GPS */}
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-border/50">
              <div className="flex items-center gap-3">
                <div
                  className={`status-dot ${
                    gpsEnabled
                      ? "status-dot-online"
                      : "status-dot-offline"
                  }`}
                />

                <Label className="font-mono text-sm">
                  GPS Broadcast
                </Label>
              </div>

              <Switch
                checked={
                  gpsEnabled
                }
                onCheckedChange={
                  setGpsEnabled
                }
              />
            </div>

            {/* CAMERA */}
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-border/50">
              <div className="flex items-center gap-3">
                <div
                  className={`status-dot ${
                    cameraEnabled
                      ? "status-dot-online"
                      : "status-dot-offline"
                  }`}
                />

                <Label className="font-mono text-sm">
                  Live Camera Feed
                </Label>
              </div>

              <Switch
                checked={
                  cameraEnabled
                }
                onCheckedChange={
                  setCameraEnabled
                }
              />
            </div>

            {/* PREVIEW */}
            {cameraEnabled && (
              <div className="rounded-lg overflow-hidden border border-cyan-500/30 bg-black">
                <video
                  ref={
                    videoRef
                  }
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-56 object-cover"
                />
              </div>
            )}

            {currentLocation ? (
              <div className="space-y-3 p-4 bg-muted/30 rounded-lg border border-border/50">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                      Latitude
                    </div>

                    <div className="font-mono text-sm">
                      {currentLocation.latitude.toFixed(
                        6
                      )}
                      °
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                      Longitude
                    </div>

                    <div className="font-mono text-sm">
                      {currentLocation.longitude.toFixed(
                        6
                      )}
                      °
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-border/50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Battery className="h-4 w-4 text-cyan-400" />

                    <span className="text-xs font-mono">
                      {batteryLevel}%
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary" />

                    <span className="text-xs font-mono">
                      ±
                      {Math.round(
                        currentLocation.accuracy ||
                          0
                      )}
                      m
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-6 text-center bg-muted/30 rounded-lg border border-border/50">
                <Plane className="h-8 w-8 mx-auto mb-2 text-cyan-400/50" />

                <p className="text-sm text-muted-foreground">
                  {gpsEnabled
                    ? "Acquiring drone coordinates..."
                    : "Enable GPS telemetry"}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* STATUS */}
        <Card className="card-tactical">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-mono uppercase tracking-wider">
              <Shield className="h-4 w-4 text-primary" />
              UAV STATUS
            </CardTitle>
          </CardHeader>

          <CardContent>
            <div className="grid grid-cols-4 gap-3">
              <div className="data-panel rounded-lg p-4">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
                  MODE
                </div>

                <div className="text-cyan-400 font-mono text-lg font-bold">
                  ACTIVE
                </div>
              </div>

              <div className="data-panel rounded-lg p-4">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
                  SIGNAL
                </div>

                <div className="text-green-500 font-mono text-lg font-bold">
                  LIVE
                </div>
              </div>

              <div className="data-panel rounded-lg p-4">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
                  CAMERA
                </div>

                <div className="text-cyan-400 font-mono text-lg font-bold flex items-center gap-2">
                  <Video className="h-4 w-4" />
                  {cameraEnabled
                    ? "ON"
                    : "OFF"}
                </div>
              </div>

              <div className="data-panel rounded-lg p-4">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
                  BATTERY
                </div>

                <div className="text-primary font-mono text-lg font-bold">
                  {batteryLevel}%
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}