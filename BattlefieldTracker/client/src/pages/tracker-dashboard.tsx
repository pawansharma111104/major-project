import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LogOut, Signal, Bell } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import RadarView from "@/components/radar-view";
import MapView from "@/components/map-view";
import SoldierListView from "@/components/soldier-list-view";
import DroneVerificationModal from "@/components/drone-verification-modal";
import { decryptMessage } from "@/lib/crypto";
import type { LocationUpdate, Message, WSMessage } from "@shared/schema";

interface TrackerDashboardProps {
  soldier: { id: string; codename: string; role: string };
  websocket: WebSocket | null;
  onLogout: () => void;
}

interface SoldierData {
  id: string;
  codename: string;
  latitude: number;
  longitude: number;
  status: string;
  lastSeen: Date;
}

export default function TrackerDashboard({
  soldier,
  websocket,
  onLogout,
}: TrackerDashboardProps) {
  const [wsConnected, setWsConnected] = useState(false);
  const [soldiers, setSoldiers] = useState<SoldierData[]>([]);
  const [trackerLocation, setTrackerLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [selectedView, setSelectedView] = useState<"radar" | "map" | "list">("radar");
  const [verificationModal, setVerificationModal] = useState<{
    isOpen: boolean;
    soldier: SoldierData | null;
    status: "idle" | "pending" | "verified" | "failed" | null;
  }>({
    isOpen: false,
    soldier: null,
    status: null,
  });
  const { toast } = useToast();

  // Get tracker's own location and fetch initial soldier data
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setTrackerLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          // Fallback to default location if GPS unavailable
          setTrackerLocation({
            latitude: 40.7128,
            longitude: -74.006,
          });
        }
      );
    } else {
      setTrackerLocation({
        latitude: 40.7128,
        longitude: -74.006,
      });
    }

    // Fetch initial soldier locations
    fetch("/api/locations/latest")
      .then((res) => res.json())
      .then((locations) => {
        const soldierData: SoldierData[] = locations.map((loc: any) => ({
          id: loc.soldierId,
          codename: loc.codename,
          latitude: loc.latitude,
          longitude: loc.longitude,
          status: "online",
          lastSeen: new Date(loc.timestamp),
        }));
        setSoldiers(soldierData);
      })
      .catch((error) => {
        console.error("Failed to fetch initial locations:", error);
      });
  }, []);

  // WebSocket connection management
  useEffect(() => {
    if (websocket) {
      setWsConnected(websocket.readyState === WebSocket.OPEN);

      const handleOpen = () => setWsConnected(true);
      const handleClose = () => setWsConnected(false);
      
      const handleMessage = (event: MessageEvent) => {
        try {
          const message: WSMessage = JSON.parse(event.data);
          // Debug log incoming messages on tracker
          try {
            // eslint-disable-next-line no-console
            console.log("WS incoming:", message.type, message.data);
          } catch {}

          switch (message.type) {
            case "locationUpdate":
              setSoldiers((prev) => {
                const existing = prev.find((s) => s.id === message.data.soldierId);
                const updated: SoldierData = {
                  id: message.data.soldierId,
                  codename: message.data.codename,
                  latitude: message.data.latitude,
                  longitude: message.data.longitude,
                  status: existing?.status || "online",
                  lastSeen: new Date(),
                };

                if (existing) {
                  return prev.map((s) => (s.id === message.data.soldierId ? updated : s));
                }
                return [...prev, updated];
              });
              break;

            case "message":
              const decrypted = decryptMessage(message.data.encryptedContent);
              toast({
                title: `Alert from ${message.data.codename}`,
                description: decrypted,
                variant: message.data.messageType.includes("enemy") || message.data.messageType.includes("medical") ? "destructive" : "default",
              });

              // Update soldier status based on message type
              setSoldiers((prev) =>
                prev.map((s) =>
                  s.id === message.data.soldierId
                    ? {
                        ...s,
                        status: message.data.messageType === "engagedEnemy"
                          ? "engaged"
                          : message.data.messageType === "needMedical"
                          ? "needsAssistance"
                          : s.status,
                      }
                    : s
                )
              );
              break;

            case "soldierStatus":
              setSoldiers((prev) =>
                prev.map((s) =>
                  s.id === message.data.soldierId
                    ? { ...s, status: message.data.status }
                    : s
                )
              );
              break;

            case "droneVerification":
              if (verificationModal.soldier?.id === message.data.soldierId) {
                setVerificationModal((prev) => ({
                  ...prev,
                  status: message.data.verificationStatus as any,
                }));

                setTimeout(() => {
                  toast({
                    title: message.data.verificationStatus === "verified" ? "Verification Successful" : "Verification Failed",
                    description: `Soldier ${message.data.codename} ${message.data.verificationStatus === "verified" ? "verified" : "could not be verified"}`,
                    variant: message.data.verificationStatus === "verified" ? "default" : "destructive",
                  });
                }, 100);
              }
              break;
          }
        } catch (error) {
          console.error("Failed to parse WebSocket message:", error);
        }
      };

      websocket.addEventListener("open", handleOpen);
      websocket.addEventListener("close", handleClose);
      websocket.addEventListener("message", handleMessage);

      return () => {
        websocket.removeEventListener("open", handleOpen);
        websocket.removeEventListener("close", handleClose);
        websocket.removeEventListener("message", handleMessage);
      };
    }
  }, [websocket, toast, verificationModal.soldier]);

  const handleRequestVerification = (soldierId: string) => {
    const soldier = soldiers.find((s) => s.id === soldierId);
    if (soldier) {
      setVerificationModal({
        isOpen: true,
        soldier,
        status: "idle",
      });
    }
  };

  const handleInitiateVerification = (soldierId: string) => {
    if (!websocket || websocket.readyState !== WebSocket.OPEN) {
      toast({
        title: "Connection Error",
        description: "Not connected to server",
        variant: "destructive",
      });
      return;
    }

    setVerificationModal((prev) => ({ ...prev, status: "pending" }));

    const soldier = soldiers.find((s) => s.id === soldierId);
    if (soldier) {
      websocket.send(
        JSON.stringify({
          type: "droneVerification",
          data: {
            soldierId,
            requestedBy: "tracker", // In production, use actual tracker ID
            droneCoordinates: {
              lat: soldier.latitude,
              lng: soldier.longitude,
            },
          },
        })
      );
    }
  };

  if (!trackerLocation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="text-lg font-semibold mb-2">Initializing Tracker...</div>
          <div className="text-sm text-muted-foreground">Getting GPS location</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-bold">Tactical Tracker</h1>
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
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs gap-1">
                <Bell className="h-3 w-3" />
                {soldiers.length} Active
              </Badge>
              <Button
                variant="ghost"
                size="icon"
                onClick={onLogout}
                data-testid="button-logout"
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-4">
        <Tabs value={selectedView} onValueChange={(v: any) => setSelectedView(v)}>
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-3 mb-4">
            <TabsTrigger value="radar" data-testid="tab-radar">
              Radar
            </TabsTrigger>
            <TabsTrigger value="map" data-testid="tab-map">
              Map
            </TabsTrigger>
            <TabsTrigger value="list" data-testid="tab-list">
              List
            </TabsTrigger>
          </TabsList>

          <TabsContent value="radar">
            <Card>
              <CardContent className="p-6">
                <RadarView trackerLocation={trackerLocation} soldiers={soldiers} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="map">
            <Card className="min-h-[600px]">
              <CardContent className="p-6">
                <MapView trackerLocation={trackerLocation} soldiers={soldiers} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="list">
            <SoldierListView
              trackerLocation={trackerLocation}
              soldiers={soldiers}
              onRequestVerification={handleRequestVerification}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Drone Verification Modal */}
      <DroneVerificationModal
        isOpen={verificationModal.isOpen}
        onClose={() =>
          setVerificationModal({ isOpen: false, soldier: null, status: null })
        }
        soldier={verificationModal.soldier}
        onInitiateVerification={handleInitiateVerification}
        verificationStatus={verificationModal.status}
      />
    </div>
  );
}
