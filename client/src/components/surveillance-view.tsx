import {
  useState,
  useEffect,
} from "react";

import {
  Button,
} from "@/components/ui/button";

import {
  Badge,
} from "@/components/ui/badge";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

import {
  Eye,
  Plane,
  Upload,
  Camera,
  Scan,
  Crosshair,
  Activity,
  Clock,
  Wifi,
  Shield,
  AlertTriangle,
} from "lucide-react";

interface DroneData {
  id: string;

  codename: string;

  latitude: number;

  longitude: number;

  battery?: number;

  status: string;
}

interface SurveillanceViewProps {
  drones?: DroneData[];

  liveDroneFrames?: Record<
    string,
    {
      frame: string;
      timestamp: number;
      codename: string;
    }
  >;

  selectedDroneFeed?: string | null;

  setSelectedDroneFeed?: (
    id: string
  ) => void;
}

interface Detection {
  id: number;

  type: string;

  confidence: number;

  status:
    | "safe"
    | "warning"
    | "threat";
}

export default function SurveillanceView({
  drones = [],

  liveDroneFrames = {},

  selectedDroneFeed = null,

  setSelectedDroneFeed,
}: SurveillanceViewProps) {
  const [
    selectedImage,
    setSelectedImage,
  ] = useState<
    string | null
  >(null);

  const [
    analysisMode,
    setAnalysisMode,
  ] = useState<
    "live" | "upload"
  >("live");

  const [
    detections,
    setDetections,
  ] = useState<
    Detection[]
  >([]);

  const [
    scanActive,
    setScanActive,
  ] = useState(false);

  const activeFeed =
    selectedDroneFeed
      ? liveDroneFrames[
          selectedDroneFeed
        ]
      : null;

  // SIMULATED AI ANALYSIS
  useEffect(() => {
    if (
      !activeFeed &&
      !selectedImage
    )
      return;

    setScanActive(true);

    const timeout =
      setTimeout(() => {
        setDetections([
          {
            id: 1,
            type:
              "Human Activity",
            confidence: 92,
            status:
              "safe",
          },

          {
            id: 2,
            type:
              "Vehicle Signature",
            confidence: 81,
            status:
              "warning",
          },

          {
            id: 3,
            type:
              "Heat Source",
            confidence: 74,
            status:
              "threat",
          },
        ]);

        setScanActive(
          false
        );
      }, 1800);

    return () =>
      clearTimeout(
        timeout
      );
  }, [
    activeFeed,
    selectedImage,
  ]);

  const getThreatBadge = (
    status: string
  ) => {
    switch (
      status
    ) {
      case "safe":
        return "badge-online";

      case "warning":
        return "badge-warning";

      case "threat":
        return "badge-critical";

      default:
        return "";
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/30">
            <Eye className="h-5 w-5 text-primary" />
          </div>

          <div>
            <h3 className="text-sm font-mono font-semibold uppercase tracking-wider">
              Surveillance Scanner
            </h3>

            <p className="text-xs text-muted-foreground">
              AI-powered threat detection
            </p>
          </div>
        </div>

        <Badge className="badge-tactical badge-online gap-2">
          <Wifi className="h-3 w-3" />

          LIVE
        </Badge>
      </div>

      {/* MODES */}
     {/* LIVE MODE ONLY */}
<div className="space-y-4">
  {/* DRONE SELECTOR */}
  <Card className="card-tactical">
    <CardHeader className="pb-3">
      <CardTitle className="flex items-center gap-2 text-sm font-mono uppercase tracking-wider">
        <Plane className="h-4 w-4 text-cyan-400" />

        Active UAV Streams
      </CardTitle>
    </CardHeader>

    <CardContent>
      {drones.length ===
      0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No active drones
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {drones.map(
            (
              drone
            ) => (
              <Button
                key={
                  drone.id
                }
                variant={
                  selectedDroneFeed ===
                  drone.id
                    ? "default"
                    : "outline"
                }
                className={`h-auto p-4 flex flex-col items-start gap-2 ${
                  selectedDroneFeed ===
                  drone.id
                    ? "bg-cyan-500 text-black"
                    : ""
                }`}
                onClick={() =>
                  setSelectedDroneFeed?.(
                    drone.id
                  )
                }
              >
                <div className="flex items-center gap-2">
                  <Plane className="h-4 w-4" />

                  <span className="font-mono text-xs">
                    {
                      drone.codename
                    }
                  </span>
                </div>

                <div className="flex items-center gap-2 text-[10px] opacity-80">
                  <Activity className="h-3 w-3" />

                  {drone.status}
                </div>
              </Button>
            )
          )}
        </div>
      )}
    </CardContent>
  </Card>

  {/* LIVE FEED */}
  <Card className="card-tactical overflow-hidden">
    <CardHeader className="data-panel-header">
      <div className="flex items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-sm font-mono uppercase tracking-wider">
          <Camera className="h-4 w-4 text-primary" />

          Live Feed
        </CardTitle>

        {activeFeed && (
          <Badge className="badge-tactical badge-online gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />

            STREAMING
          </Badge>
        )}
      </div>
    </CardHeader>

    <CardContent className="p-0">
      <div className="relative bg-black aspect-video overflow-hidden">
        {activeFeed ? (
          <>
            <img
              src={
                activeFeed.frame
              }
              alt="Drone Feed"
              className="w-full h-full object-cover"
            />

            {/* HUD */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-4 left-4 w-10 h-10 border-t-2 border-l-2 border-primary" />

              <div className="absolute top-4 right-4 w-10 h-10 border-t-2 border-r-2 border-primary" />

              <div className="absolute bottom-4 left-4 w-10 h-10 border-b-2 border-l-2 border-primary" />

              <div className="absolute bottom-4 right-4 w-10 h-10 border-b-2 border-r-2 border-primary" />

              <div className="absolute top-1/2 left-1/2 w-16 h-16 -translate-x-1/2 -translate-y-1/2">
                <Crosshair className="w-full h-full text-primary opacity-70" />
              </div>

              <div className="absolute top-4 left-1/2 -translate-x-1/2">
                <Badge className="bg-black/70 border border-primary/40 text-primary font-mono">
                  UAV:
                  {" "}
                  {
                    activeFeed.codename
                  }
                </Badge>
              </div>

              <div className="absolute bottom-4 right-4 bg-black/70 px-3 py-1 rounded border border-primary/30 text-xs font-mono text-primary flex items-center gap-2">
                <Clock className="h-3 w-3" />

                {new Date(
                  activeFeed.timestamp
                ).toLocaleTimeString()}
              </div>

              {scanActive && (
                <div className="absolute inset-0">
                  <div className="absolute top-0 left-0 w-full h-1 bg-primary animate-pulse" />

                  <div className="absolute inset-0 bg-primary/5 animate-pulse" />
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
            <Plane className="h-14 w-14 mb-4 opacity-30" />

            <p className="font-mono text-sm uppercase tracking-wider">
              Waiting for UAV Feed
            </p>
          </div>
        )}
      </div>
    </CardContent>
  </Card>

  {/* AI DETECTIONS */}
  <Card className="card-tactical">
    <CardHeader className="pb-3">
      <CardTitle className="flex items-center gap-2 text-sm font-mono uppercase tracking-wider">
        <Scan className="h-4 w-4 text-primary" />

        AI Threat Analysis
      </CardTitle>
    </CardHeader>

    <CardContent className="space-y-3">
      {scanActive ? (
        <div className="flex items-center justify-center py-10">
          <div className="flex items-center gap-3 text-primary font-mono text-sm">
            <div className="spinner-tactical" />

            ANALYZING LIVE FEED...
          </div>
        </div>
      ) : detections.length >
        0 ? (
        detections.map(
          (
            detection
          ) => (
            <div
              key={
                detection.id
              }
              className="p-4 rounded-lg border border-border bg-muted/30 flex items-center justify-between"
            >
              <div>
                <div className="font-mono text-sm">
                  {
                    detection.type
                  }
                </div>

                <div className="text-xs text-muted-foreground mt-1">
                  Confidence:
                  {" "}
                  {
                    detection.confidence
                  }
                  %
                </div>
              </div>

              <Badge
                className={`badge-tactical ${getThreatBadge(
                  detection.status
                )}`}
              >
                {
                  detection.status
                }
              </Badge>
            </div>
          )
        )
      ) : (
        <div className="text-center py-8 text-muted-foreground font-mono text-sm">
          No detections yet
        </div>
      )}
    </CardContent>
  </Card>
</div>
    </div>
  );
}