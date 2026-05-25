import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, Clock, MapPin, Navigation, Crosshair } from "lucide-react";
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "online":
        return "badge-online";
      case "engaged":
      case "needsAssistance":
        return "badge-critical";
      default:
        return "badge-offline";
    }
  };

  const getStatusDot = (status: string) => {
    switch (status) {
      case "online":
        return "status-dot-online";
      case "engaged":
      case "needsAssistance":
        return "status-dot-critical";
      default:
        return "status-dot-offline";
    }
  };

  return (
    <div className="space-y-3" data-testid="soldier-list">
      {soldiersWithDistance.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-muted/50 flex items-center justify-center border border-border/50">
            <Shield className="h-8 w-8 text-muted-foreground/50" />
          </div>
          <p className="text-sm font-mono text-muted-foreground">No soldiers currently tracked</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Units will appear when they come online</p>
        </div>
      ) : (
        <>
          {/* Summary header */}
          <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border/50">
            <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
              Active Units
            </span>
            <Badge variant="outline" className="badge-tactical badge-online">
              {soldiersWithDistance.length} TRACKED
            </Badge>
          </div>

          {/* Soldier cards */}
          {soldiersWithDistance.map((soldier) => (
            <Card 
              key={soldier.id} 
              className="soldier-card overflow-hidden"
              data-testid={`soldier-card-${soldier.id}`}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-3">
                    {/* Header row */}
                    <div className="flex items-center gap-3">
                      <div className={`status-dot ${getStatusDot(soldier.status)} animate-status-pulse`} />
                      <h3 className="text-base font-mono font-semibold text-foreground">{soldier.codename}</h3>
                      <Badge
                        className={`badge-tactical ${getStatusColor(soldier.status)} capitalize`}
                        data-testid={`status-${soldier.id}`}
                      >
                        {soldier.status}
                      </Badge>
                    </div>

                    {/* Stats grid */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-md border border-border/30">
                        <Navigation className="h-3.5 w-3.5 text-primary" />
                        <div>
                          <div className="text-[9px] text-muted-foreground uppercase tracking-wider">Distance</div>
                          <div className="text-xs font-mono text-foreground">
                            {formatDistance(soldier.distance)}
                          </div>
                        </div>
                      </div>
                      
                      {soldier.lastSeen && (
                        <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-md border border-border/30">
                          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                          <div>
                            <div className="text-[9px] text-muted-foreground uppercase tracking-wider">Last Seen</div>
                            <div className="text-xs font-mono text-foreground">
                              {formatDistanceToNow(soldier.lastSeen, { addSuffix: true })}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Coordinates */}
                    <div className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      <span className="tabular-nums">
                        {soldier.latitude.toFixed(6)}°, {soldier.longitude.toFixed(6)}°
                      </span>
                    </div>
                  </div>

                  {/* Action button */}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onRequestVerification(soldier.id)}
                    className="h-9 px-3 font-mono text-[10px] uppercase tracking-wider border-border/60 hover:bg-primary/10 hover:border-primary/50 hover:text-primary transition-all"
                    data-testid={`button-verify-${soldier.id}`}
                  >
                    <Crosshair className="h-3.5 w-3.5 mr-1.5" />
                    Verify
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </>
      )}
    </div>
  );
}
