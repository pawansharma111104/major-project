import { calculateBearing, calculateDistance } from "@/lib/geo";

interface SoldierLocation {
  id: string;
  codename: string;
  latitude: number;
  longitude: number;
  status: string;
}

interface RadarViewProps {
  trackerLocation: { latitude: number; longitude: number };
  soldiers: SoldierLocation[];
}

export default function RadarView({ trackerLocation, soldiers }: RadarViewProps) {
  const maxRange = 500; // 500m max range for radar view
  const radarSize = 400;
  const center = radarSize / 2;

  // Filter soldiers within 500m
  const nearbySoldiers = soldiers
    .map((soldier) => {
      const distance = calculateDistance(
        trackerLocation.latitude,
        trackerLocation.longitude,
        soldier.latitude,
        soldier.longitude
      );
      const bearing = calculateBearing(
        trackerLocation.latitude,
        trackerLocation.longitude,
        soldier.latitude,
        soldier.longitude
      );
      return { ...soldier, distance, bearing };
    })
    .filter((s) => s.distance <= maxRange);

  // Convert polar coordinates (distance, bearing) to cartesian (x, y)
  const polarToCartesian = (distance: number, bearing: number) => {
    const scale = (distance / maxRange) * (radarSize / 2 - 30);
    const angleRad = ((bearing - 90) * Math.PI) / 180;
    const x = center + scale * Math.cos(angleRad);
    const y = center + scale * Math.sin(angleRad);
    return { x, y };
  };

  const statusColors: Record<string, string> = {
    online: "#22c55e",
    engaged: "#ef4444",
    needsAssistance: "#f59e0b",
    offline: "#9ca3af",
  };

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <svg
        width={radarSize}
        height={radarSize}
        className="bg-card rounded-lg border border-border"
        data-testid="svg-radar"
      >
        {/* Concentric circles */}
        {[100, 200, 300, 400, 500].map((range) => (
          <circle
            key={range}
            cx={center}
            cy={center}
            r={(range / maxRange) * (radarSize / 2 - 30)}
            fill="none"
            stroke="hsl(var(--border))"
            strokeWidth="1"
            strokeDasharray="4 4"
          />
        ))}

        {/* Cardinal direction lines */}
        <line
          x1={center}
          y1={30}
          x2={center}
          y2={radarSize - 30}
          stroke="hsl(var(--border))"
          strokeWidth="1"
          strokeDasharray="2 2"
        />
        <line
          x1={30}
          y1={center}
          x2={radarSize - 30}
          y2={center}
          stroke="hsl(var(--border))"
          strokeWidth="1"
          strokeDasharray="2 2"
        />

        {/* Direction labels */}
        <text
          x={center}
          y={20}
          textAnchor="middle"
          className="fill-muted-foreground text-xs font-mono"
        >
          N
        </text>
        <text
          x={radarSize - 15}
          y={center + 4}
          textAnchor="middle"
          className="fill-muted-foreground text-xs font-mono"
        >
          E
        </text>
        <text
          x={center}
          y={radarSize - 10}
          textAnchor="middle"
          className="fill-muted-foreground text-xs font-mono"
        >
          S
        </text>
        <text
          x={15}
          y={center + 4}
          textAnchor="middle"
          className="fill-muted-foreground text-xs font-mono"
        >
          W
        </text>

        {/* Center (tracker position) */}
        <circle cx={center} cy={center} r="6" fill="hsl(var(--primary))" />
        <circle
          cx={center}
          cy={center}
          r="12"
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth="2"
        />

        {/* Soldier markers */}
        {nearbySoldiers.map((soldier) => {
          const { x, y } = polarToCartesian(soldier.distance, soldier.bearing);
          const color = statusColors[soldier.status] || statusColors.online;

          return (
            <g key={soldier.id} data-testid={`soldier-marker-${soldier.id}`}>
              <circle cx={x} cy={y} r="8" fill={color} opacity="0.8" />
              <circle cx={x} cy={y} r="8" fill="none" stroke={color} strokeWidth="2" />
              <text
                x={x}
                y={y - 15}
                textAnchor="middle"
                className="fill-foreground text-xs font-semibold"
              >
                {soldier.codename}
              </text>
              <text
                x={x}
                y={y + 25}
                textAnchor="middle"
                className="fill-muted-foreground text-xs font-mono"
              >
                {Math.round(soldier.distance)}m
              </text>
            </g>
          );
        })}

        {/* Range labels */}
        {[100, 200, 300, 400, 500].map((range, idx) => (
          <text
            key={range}
            x={center + 10}
            y={center - (range / maxRange) * (radarSize / 2 - 30) + 4}
            className="fill-muted-foreground text-xs font-mono"
          >
            {range}m
          </text>
        ))}
      </svg>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 justify-center text-sm">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: statusColors.online }} />
          <span>Online</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: statusColors.engaged }} />
          <span>Engaged</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: statusColors.needsAssistance }} />
          <span>Needs Help</span>
        </div>
      </div>
    </div>
  );
}
