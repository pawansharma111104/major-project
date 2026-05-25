import {
  calculateBearing,
  calculateDistance,
} from "@/lib/geo";

interface SoldierLocation {
  id: string;
  codename: string;
  latitude: number;
  longitude: number;
  status: string;
}

interface DroneData {
  id: string;
  codename: string;
  latitude: number;
  longitude: number;
  status: string;
}

interface RadarViewProps {
  trackerLocation: {
    latitude: number;
    longitude: number;
  };

  soldiers: SoldierLocation[];

  drones: DroneData[];
}

export default function RadarView({
  trackerLocation,
  soldiers,
  drones,
}: RadarViewProps) {
  const maxRange = 500;

  const radarSize = 400;

  const center =
    radarSize / 2;

  // SOLDIERS
  const nearbySoldiers =
    soldiers
      .map((soldier) => {
        const distance =
          calculateDistance(
            trackerLocation.latitude,
            trackerLocation.longitude,
            soldier.latitude,
            soldier.longitude
          );

        const bearing =
          calculateBearing(
            trackerLocation.latitude,
            trackerLocation.longitude,
            soldier.latitude,
            soldier.longitude
          );

        return {
          ...soldier,
          distance,
          bearing,
        };
      })
      .filter(
        (s) =>
          s.distance <= maxRange
      );

  // DRONES
  const nearbyDrones =
    drones
      .map((drone) => {
        const distance =
          calculateDistance(
            trackerLocation.latitude,
            trackerLocation.longitude,
            drone.latitude,
            drone.longitude
          );

        const bearing =
          calculateBearing(
            trackerLocation.latitude,
            trackerLocation.longitude,
            drone.latitude,
            drone.longitude
          );

        return {
          ...drone,
          distance,
          bearing,
        };
      })
      .filter(
        (d) =>
          d.distance <= maxRange
      );

  const polarToCartesian = (
    distance: number,
    bearing: number
  ) => {
    const scale =
      (distance /
        maxRange) *
      (radarSize / 2 - 40);

    const angleRad =
      ((bearing - 90) *
        Math.PI) /
      180;

    const x =
      center +
      scale *
        Math.cos(angleRad);

    const y =
      center +
      scale *
        Math.sin(angleRad);

    return { x, y };
  };

  const statusColors: Record<
    string,
    string
  > = {
    online:
      "hsl(142, 70%, 50%)",

    engaged:
      "hsl(0, 72%, 55%)",

    needsAssistance:
      "hsl(38, 92%, 55%)",

    offline:
      "hsl(222, 10%, 45%)",
  };

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="relative">
        <svg
          width={radarSize}
          height={radarSize}
          className="bg-card rounded-xl border border-border shadow-lg"
        >
          {/* RADAR BG */}
          <defs>
            <radialGradient
              id="radarGradient"
              cx="50%"
              cy="50%"
              r="50%"
            >
              <stop
                offset="0%"
                stopColor="hsl(185, 70%, 50%)"
                stopOpacity="0.05"
              />

              <stop
                offset="100%"
                stopColor="hsl(185, 70%, 50%)"
                stopOpacity="0"
              />
            </radialGradient>
          </defs>

          <circle
            cx={center}
            cy={center}
            r={
              radarSize / 2 - 20
            }
            fill="url(#radarGradient)"
          />

          {/* RINGS */}
          {[100, 200, 300, 400, 500].map(
            (range) => (
              <circle
                key={range}
                cx={center}
                cy={center}
                r={
                  (range /
                    maxRange) *
                  (radarSize /
                    2 -
                    40)
                }
                fill="none"
                stroke="hsl(var(--border))"
                strokeDasharray="4 4"
              />
            )
          )}

          {/* TRACKER */}
          <circle
            cx={center}
            cy={center}
            r="6"
            fill="hsl(var(--primary))"
          />

          {/* SOLDIERS */}
          {nearbySoldiers.map(
            (soldier) => {
              const { x, y } =
                polarToCartesian(
                  soldier.distance,
                  soldier.bearing
                );

              const color =
                statusColors[
                  soldier.status
                ] ||
                statusColors.online;

              return (
                <g
                  key={
                    soldier.id
                  }
                >
                  <circle
                    cx={x}
                    cy={y}
                    r="12"
                    fill={
                      color
                    }
                    opacity="0.2"
                  />

                  <circle
                    cx={x}
                    cy={y}
                    r="5"
                    fill={
                      color
                    }
                  />

                  <text
                    x={x}
                    y={y - 15}
                    textAnchor="middle"
                    className="fill-foreground text-[10px] font-mono"
                  >
                    {
                      soldier.codename
                    }
                  </text>
                </g>
              );
            }
          )}

          {/* DRONES */}
          {nearbyDrones.map(
            (drone) => {
              const { x, y } =
                polarToCartesian(
                  drone.distance,
                  drone.bearing
                );

              return (
                <g
                  key={
                    drone.id
                  }
                >
                  <circle
                    cx={x}
                    cy={y}
                    r="18"
                    fill="rgba(34,211,238,0.15)"
                  />

                  <polygon
                    points={`
                      ${x},${y - 10}
                      ${x - 8},${y + 8}
                      ${x + 8},${y + 8}
                    `}
                    fill="#22d3ee"
                    stroke="#67e8f9"
                    strokeWidth="2"
                  />

                  <text
                    x={x}
                    y={y - 20}
                    textAnchor="middle"
                    className="fill-cyan-400 text-[10px] font-mono font-semibold"
                  >
                    {
                      drone.codename
                    }
                  </text>
                </g>
              );
            }
          )}
        </svg>
      </div>
    </div>
  );
}