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
    icon: AlertTriangle,
    color: "destructive" as const,
  },
  {
    id: "needMedical",
    label: "Need Medical Assistance",
    icon: Heart,
    color: "destructive" as const,
  },
  {
    id: "requestBackup",
    label: "Requesting Backup",
    icon: Users,
    color: "default" as const,
  },
  {
    id: "allClear",
    label: "All Clear",
    icon: CheckCircle2,
    color: "default" as const,
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
  const watchIdRef = useRef<number | null>(null);
  const { toast } = useToast();

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
    <div className="min-h-screen bg-background p-4 pb-20">
      {/* Header */}
      <div className="max-w-4xl mx-auto mb-4">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="default" className="text-sm">
                  {soldier.codename}
                </Badge>
                <Badge
                  variant={wsConnected ? "default" : "destructive"}
                  className="text-xs gap-1"
                  data-testid="badge-connection-status"
                >
                  <Signal className="h-3 w-3" />
                  {wsConnected ? "Connected" : "Disconnected"}
                </Badge>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onLogout}
                data-testid="button-logout"
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </CardHeader>
        </Card>
      </div>

      <div className="max-w-4xl mx-auto space-y-4">
        {/* GPS Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              GPS Tracking
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="gps-toggle" className="text-base">
                GPS Transmission
              </Label>
              <Switch
                id="gps-toggle"
                checked={gpsEnabled}
                onCheckedChange={setGpsEnabled}
                data-testid="switch-gps"
              />
            </div>

            {currentLocation && (
              <div className="p-4 bg-muted rounded-md font-mono text-sm space-y-1">
                <div data-testid="text-latitude">
                  LAT: {currentLocation.latitude.toFixed(6)}°
                </div>
                <div data-testid="text-longitude">
                  LON: {currentLocation.longitude.toFixed(6)}°
                </div>
                {currentLocation.accuracy && (
                  <div className="text-xs text-muted-foreground">
                    Accuracy: ±{Math.round(currentLocation.accuracy)}m
                  </div>
                )}
              </div>
            )}

            {!gpsEnabled && (
              <p className="text-sm text-muted-foreground">
                Enable GPS to start transmitting your location
              </p>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Radio className="h-5 w-5" />
              Quick Action Messages
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {QUICK_ACTIONS.map((action) => (
                <Button
                  key={action.id}
                  variant={action.color}
                  className="h-24 flex-col gap-2 text-base"
                  onClick={() => sendQuickAction(action.id, action.label)}
                  data-testid={`button-action-${action.id}`}
                >
                  <action.icon className="h-6 w-6" />
                  {action.label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Activity Feed */}
        {sentMessages.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent Messages</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {sentMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 bg-muted rounded-md text-sm"
                    data-testid={`message-${idx}`}
                  >
                    <span>{msg.type}</span>
                    <span className="text-xs text-muted-foreground">
                      {msg.time}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
