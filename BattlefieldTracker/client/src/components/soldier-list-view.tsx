import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, Clock } from "lucide-react";
import { calculateDistance, formatDistance } from "@/lib/geo";
import { formatDistanceToNow } from "date-fns";

interface SoldierLocation {
  id: string;
  codename: string;
  latitude: number;
  longitude: number;
  status: string;
  lastSeen?: Date;
}

interface SoldierListViewProps {
  trackerLocation: { latitude: number; longitude: number };
  soldiers: SoldierLocation[];
  onRequestVerification: (soldierId: string) => void;
}

export default function SoldierListView({
  trackerLocation,
  soldiers,
  onRequestVerification,
}: SoldierListViewProps) {
  const soldiersWithDistance = soldiers
    .map((soldier) => ({
      ...soldier,
      distance: calculateDistance(
        trackerLocation.latitude,
        trackerLocation.longitude,
        soldier.latitude,
        soldier.longitude
      ),
    }))
    .sort((a, b) => a.distance - b.distance);

  const statusVariants: Record<string, "default" | "destructive" | "secondary"> = {
    online: "default",
    engaged: "destructive",
    needsAssistance: "destructive",
    offline: "secondary",
  };

  return (
    <div className="space-y-4 p-4" data-testid="soldier-list">
      {soldiersWithDistance.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            No soldiers currently tracked
          </CardContent>
        </Card>
      ) : (
        soldiersWithDistance.map((soldier) => (
          <Card key={soldier.id} data-testid={`soldier-card-${soldier.id}`}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold">{soldier.codename}</h3>
                    <Badge
                      variant={statusVariants[soldier.status] || "default"}
                      className="capitalize"
                      data-testid={`status-${soldier.id}`}
                    >
                      <div className="h-2 w-2 rounded-full bg-current mr-1" />
                      {soldier.status}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Shield className="h-4 w-4" />
                      <span className="font-mono">
                        {formatDistance(soldier.distance)}
                      </span>
                    </div>
                    {soldier.lastSeen && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span className="text-xs">
                          {formatDistanceToNow(soldier.lastSeen, { addSuffix: true })}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="text-xs text-muted-foreground font-mono">
                    {soldier.latitude.toFixed(6)}°, {soldier.longitude.toFixed(6)}°
                  </div>
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onRequestVerification(soldier.id)}
                  data-testid={`button-verify-${soldier.id}`}
                >
                  Verify
                </Button>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
