import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  MapPin,
  Radio,
  AlertTriangle,
  Heart,
  Users,
  CheckCircle2,
  LogOut,
  Signal,
  Navigation,
  Shield,
  Clock,
  Activity,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { encryptMessage } from "@/lib/crypto";

interface SoldierDashboardProps {
  soldier: { id: string; codename: string; role: string };
  websocket: WebSocket | null;
  onLogout: () => void;
}

const QUICK_ACTIONS = [
  {
    id: "engagedEnemy",
    label: "Engaged with Enemy",
    shortLabel: "ENGAGED",
    icon: AlertTriangle,
    color: "critical" as const,
    description: "Report active combat situation",
  },
  {
    id: "needMedical",
    label: "Need Medical Assistance",
    shortLabel: "MEDICAL",
    icon: Heart,
    color: "critical" as const,
    description: "Request medical support",
  },
  {
    id: "requestBackup",
    label: "Requesting Backup",
    shortLabel: "BACKUP",
    icon: Users,
    color: "warning" as const,
    description: "Request additional units",
  },
  {
    id: "allClear",
    label: "All Clear",
    shortLabel: "CLEAR",
    icon: CheckCircle2,
    color: "success" as const,
    description: "Confirm area secured",
  },
];

export default function SoldierDashboard({
  soldier,
  websocket,
  onLogout,
}: SoldierDashboardProps) {
  const [gpsEnabled, setGpsEnabled] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{
    latitude: number;
    longitude: number;
    accuracy?: number;
  } | null>(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [sentMessages, setSentMessages] = useState<Array<{
    type: string;
    time: string;
  }>>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const watchIdRef = useRef<number | null>(null);
  const { toast } = useToast();

  // Update time
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (websocket) {
      setWsConnected(websocket.readyState === WebSocket.OPEN);

      const handleOpen = () => setWsConnected(true);
      const handleClose = () => setWsConnected(false);

      websocket.addEventListener("open", handleOpen);
      websocket.addEventListener("close", handleClose);

      return () => {
        websocket.removeEventListener("open", handleOpen);
        websocket.removeEventListener("close", handleClose);
      };
    }
  }, [websocket]);

  useEffect(() => {
    if (gpsEnabled) {
      if ("geolocation" in navigator) {
        watchIdRef.current = navigator.geolocation.watchPosition(
          (position) => {
            const location = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
            };
            setCurrentLocation(location);

            // Send location update via WebSocket
            if (websocket && websocket.readyState === WebSocket.OPEN) {
              websocket.send(
                JSON.stringify({
                  type: "locationUpdate",
                  data: {
                    soldierId: soldier.id,
                    ...location,
                  },
                })
              );
                // Debug log when soldier sends location
                try {
                  // eslint-disable-next-line no-console
                  console.log("WS send: locationUpdate", location);
                } catch {}
            }
          },
          (error) => {
            toast({
              title: "GPS Error",
              description: error.message,
              variant: "destructive",
            });
            setGpsEnabled(false);
          },
          {
            enableHighAccuracy: true,
            maximumAge: 5000,
            timeout: 10000,
          }
        );
      } else {
        toast({
          title: "GPS Not Supported",
          description: "Your device does not support GPS",
          variant: "destructive",
        });
        setGpsEnabled(false);
      }
    } else {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    }

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [gpsEnabled, websocket, soldier.id, toast]);

  const sendQuickAction = (actionType: string, label: string) => {
    if (!websocket || websocket.readyState !== WebSocket.OPEN) {
      toast({
        title: "Connection Error",
        description: "Not connected to server",
        variant: "destructive",
      });
      return;
    }

    const message = {
      type: "message",
      data: {
        soldierId: soldier.id,
        messageType: actionType,
        encryptedContent: encryptMessage(label),
      },
    };

    websocket.send(JSON.stringify(message));

    // Debug log when sending quick-action messages
    try {
      // eslint-disable-next-line no-console
      console.log("WS send: message", message);
    } catch {}
    setSentMessages((prev) => [
      { type: label, time: new Date().toLocaleTimeString() },
      ...prev.slice(0, 4),
    ]);

    toast({
      title: "Message Sent",
      description: label,
    });
  };

  return (
    <div className="min-h-screen bg-background tactical-grid p-4 pb-24 dark">
      {/* Header */}
      <div className="max-w-2xl mx-auto mb-6">
        <Card className="card-tactical">
          <CardHeader className="pb-3 pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/30">
                  <Shield className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <Badge variant="default" className="badge-tactical bg-primary text-primary-foreground mb-1">
                    {soldier.codename}
                  </Badge>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
                    <Clock className="h-3 w-3" />
                    <span className="tabular-nums">{currentTime.toLocaleTimeString("en-US", { hour12: false })}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  variant={wsConnected ? "outline" : "destructive"}
                  className={`badge-tactical gap-1.5 ${wsConnected ? "badge-online" : "badge-critical"}`}
                  data-testid="badge-connection-status"
                >
                  <Signal className={`h-3 w-3 ${wsConnected ? "animate-pulse" : ""}`} />
                  {wsConnected ? "LIVE" : "DOWN"}
                </Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onLogout}
                  className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-9 w-9"
                  data-testid="button-logout"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>
      </div>

      <div className="max-w-2xl mx-auto space-y-4">
        {/* GPS Status */}
        <Card className="card-tactical">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-mono uppercase tracking-wider">
              <Navigation className="h-4 w-4 text-primary" />
              GPS Tracking Module
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-border/50">
              <div className="flex items-center gap-3">
                <div className={`status-dot ${gpsEnabled ? "status-dot-online" : "status-dot-offline"}`} />
                <Label htmlFor="gps-toggle" className="text-sm font-mono">
                  Position Broadcast
                </Label>
              </div>
              <Switch
                id="gps-toggle"
                checked={gpsEnabled}
                onCheckedChange={setGpsEnabled}
                data-testid="switch-gps"
              />
            </div>

            {currentLocation ? (
              <div className="p-4 bg-muted/30 rounded-lg border border-border/50 font-mono text-sm space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Latitude</div>
                    <div className="text-foreground tabular-nums" data-testid="text-latitude">
                      {currentLocation.latitude.toFixed(6)}°
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Longitude</div>
                    <div className="text-foreground tabular-nums" data-testid="text-longitude">
                      {currentLocation.longitude.toFixed(6)}°
                    </div>
                  </div>
                </div>
                {currentLocation.accuracy && (
                  <div className="pt-2 border-t border-border/50 flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Accuracy</span>
                    <span className="text-xs text-primary">±{Math.round(currentLocation.accuracy)}m</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-6 text-center bg-muted/30 rounded-lg border border-border/50">
                <MapPin className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  {gpsEnabled ? "Acquiring position..." : "Enable GPS to broadcast location"}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="card-tactical">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-mono uppercase tracking-wider">
              <Radio className="h-4 w-4 text-primary" />
              Quick Action Signals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {QUICK_ACTIONS.map((action) => (
                <Button
                  key={action.id}
                  variant="outline"
                  className={`h-auto py-5 flex-col gap-2 action-button transition-all duration-300 border-border/60 ${
                    action.color === "critical" 
                      ? "hover:bg-destructive/10 hover:border-destructive/50 hover:text-destructive" 
                      : action.color === "warning"
                      ? "hover:bg-yellow-500/10 hover:border-yellow-500/50 hover:text-yellow-500"
                      : "hover:bg-green-500/10 hover:border-green-500/50 hover:text-green-500"
                  }`}
                  onClick={() => sendQuickAction(action.id, action.label)}
                  data-testid={`button-action-${action.id}`}
                >
                  <action.icon className={`h-6 w-6 ${
                    action.color === "critical" ? "text-destructive" :
                    action.color === "warning" ? "text-yellow-500" : "text-green-500"
                  }`} />
                  <span className="text-[10px] font-mono uppercase tracking-wider">{action.shortLabel}</span>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Activity Feed */}
        {sentMessages.length > 0 && (
          <Card className="card-tactical">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-mono uppercase tracking-wider">
                <Activity className="h-4 w-4 text-primary" />
                Recent Transmissions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {sentMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border/50 text-sm"
                    data-testid={`message-${idx}`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="status-dot status-dot-online" />
                      <span className="font-mono text-xs">{msg.type}</span>
                    </div>
                    <span className="text-[10px] font-mono text-muted-foreground tabular-nums">
                      {msg.time}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Footer */}
      {/* <div className="fixed bottom-0 left-0 right-0 h-14 footer-tactical">
        <div className="h-full flex items-center justify-between px-4 max-w-2xl mx-auto text-[10px] font-mono text-muted-foreground">
          <div className="flex items-center gap-2">
            <Shield className="h-3 w-3 text-primary" />
            <span>AEGIS v2.4.1</span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-1.5 h-1.5 rounded-full ${wsConnected ? "bg-green-500 animate-pulse" : "bg-destructive"}`} />
            <span className={wsConnected ? "text-green-500" : "text-destructive"}>
              {wsConnected ? "ENCRYPTED" : "DISCONNECTED"}
            </span>
          </div>
        </div>
      </div> */}
    </div>
  );
}
