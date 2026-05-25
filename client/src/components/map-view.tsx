import {
  useEffect,
  useRef,
  Fragment,
} from "react";

import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Tooltip,
  useMap,
  CircleMarker,
  ZoomControl,
} from "react-leaflet";

import L from "leaflet";

import "leaflet/dist/leaflet.css";

import {
  calculateDistance,
  formatDistance,
} from "@/lib/geo";

interface SoldierLocation {
  id: string;
  codename: string;
  latitude: number;
  longitude: number;
  status: string;
  lastSeen?: Date;
}

interface DroneData {
  id: string;
  codename: string;
  latitude: number;
  longitude: number;
  battery?: number;
  status: string;
}

interface MapViewProps {
  trackerLocation: {
    latitude: number;
    longitude: number;
  };

  soldiers: SoldierLocation[];

  drones: DroneData[];
}

// FIX LEAFLET ICONS
const iconRetinaUrl = new URL(
  "../../../node_modules/leaflet/dist/images/marker-icon-2x.png",
  import.meta.url
).href;

const iconUrl = new URL(
  "../../../node_modules/leaflet/dist/images/marker-icon.png",
  import.meta.url
).href;

const shadowUrl = new URL(
  "../../../node_modules/leaflet/dist/images/marker-shadow.png",
  import.meta.url
).href;

L.Icon.Default.mergeOptions({
  iconRetinaUrl,
  iconUrl,
  shadowUrl,
});

function FitBounds({
  positions,
}: {
  positions: [number, number][];
}) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    if (
      positions.length === 0
    )
      return;

    try {
      const bounds =
        L.latLngBounds(
          positions.map(
            (p) =>
              [
                p[0],
                p[1],
              ] as [
                number,
                number
              ]
          )
        );

      map.fitBounds(bounds, {
        padding: [50, 50],
        maxZoom: 15,
      });
    } catch {}
  }, []);

  return null;
}

export default function MapView({
  trackerLocation,
  soldiers,
  drones,
}: MapViewProps) {
  const mapRef =
    useRef<any | null>(null);

  const markerRefs =
    useRef<
      Record<string, any>
    >({});

  const positions: [
    number,
    number
  ][] = [
    ...soldiers.map(
      (s) =>
        [
          s.latitude,
          s.longitude,
        ] as [
          number,
          number
        ]
    ),

    ...drones.map(
      (d) =>
        [
          d.latitude,
          d.longitude,
        ] as [
          number,
          number
        ]
    ),
  ];

  const getStatusColor = (
    status: string = ""
  ) => {
    const normalized =
      status
        .trim()
        .toLowerCase()
        .replace(
          /\s+/g,
          ""
        );

    switch (
      normalized
    ) {
      case "online":
      case "active":
        return "#22c55e";

      case "engaged":
      case "danger":
        return "#ef4444";

      case "needsassistance":
        return "#f59e0b";

      case "offline":
        return "#6b7280";

      default:
        return "#3b82f6";
    }
  };

  function createSoldierIcon(
    s: SoldierLocation
  ) {
    const color =
      getStatusColor(
        s.status
      );

    const initials = (
      s.codename ||
      "?"
    )
      .split(" ")
      .map(
        (p) => p[0]
      )
      .join("")
      .slice(0, 2)
      .toUpperCase();

    const html = `
      <div
        style="
          position:relative;
          width:42px;
          height:42px;
          display:flex;
          align-items:center;
          justify-content:center;
        "
      >
        <div
          style="
            position:absolute;
            width:42px;
            height:42px;
            border-radius:50%;
            background:${color}55;
            animation:pulseSoldier 1.6s infinite;
          "
        ></div>

        <div
          style="
            width:34px;
            height:34px;
            border-radius:50%;
            background:${color};
            color:white;
            font-size:12px;
            font-weight:700;
            border:2px solid white;
            display:flex;
            align-items:center;
            justify-content:center;
          "
        >
          ${initials}
        </div>
      </div>
    `;

    return L.divIcon({
      html,
      className: "",
      iconSize: [42, 42],
      iconAnchor: [21, 21],
    });
  }

  function createTrackerIcon() {
    const html = `
      <div
        style="
          position: relative;
          width: 42px;
          height: 42px;
          display:flex;
          align-items:center;
          justify-content:center;
        "
      >
        <div
          style="
            position:absolute;
            width:42px;
            height:42px;
            border-radius:50%;
            background:rgba(34,197,94,0.25);
            animation:pulseTracker 2s infinite;
          "
        ></div>

        <div
          style="
            width:34px;
            height:34px;
            border-radius:50%;
            background:linear-gradient(135deg,#22c55e,#15803d);
            border:3px solid white;
            display:flex;
            align-items:center;
            justify-content:center;
            color:white;
            font-size:16px;
          "
        >
          📡
        </div>
      </div>
    `;

    return L.divIcon({
      html,
      className: "",
      iconSize: [42, 42],
      iconAnchor: [21, 21],
    });
  }

  function createDroneIcon(
    drone: DroneData
  ) {
    const html = `
      <div
        style="
          position:relative;
          width:48px;
          height:48px;
          display:flex;
          align-items:center;
          justify-content:center;
        "
      >
        <div
          style="
            position:absolute;
            width:48px;
            height:48px;
            border-radius:50%;
            background:rgba(34,211,238,0.2);
            animation:pulseTracker 2s infinite;
          "
        ></div>

        <div
          style="
            width:38px;
            height:38px;
            border-radius:50%;
            background:linear-gradient(135deg,#22d3ee,#0891b2);
            border:3px solid white;
            box-shadow:0 0 18px rgba(34,211,238,0.9);
            display:flex;
            align-items:center;
            justify-content:center;
            color:white;
            font-size:18px;
          "
        >
          ✈
        </div>
      </div>
    `;

    return L.divIcon({
      html,
      className: "",
      iconSize: [48, 48],
      iconAnchor: [24, 24],
    });
  }

  const initialCenter: [
    number,
    number
  ] = [
    trackerLocation.latitude,
    trackerLocation.longitude,
  ];

  return (
    <div className="relative h-full min-h-[500px] bg-muted/30 rounded-lg border border-border overflow-hidden">
      <MapContainer
        center={
          initialCenter
        }
        zoom={13}
        zoomControl={false}
        style={{
          height:
            "500px",
          minHeight:
            "500px",
          width: "100%",
        }}
        whenCreated={(
          mapInstance: any
        ) => {
          mapRef.current =
            mapInstance;

          try {
            mapInstance.invalidateSize();
          } catch {}
        }}
      >
        <ZoomControl position="bottomright" />

        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        {/* TRACKER */}
        <Marker
          position={[
            trackerLocation.latitude,
            trackerLocation.longitude,
          ]}
          icon={
            createTrackerIcon()
          }
        >
          <Popup>
            Tracker
          </Popup>
        </Marker>

        {/* SOLDIERS */}
        {soldiers.map(
          (s) => (
            <Fragment
              key={s.id}
            >
              <CircleMarker
                center={[
                  s.latitude,
                  s.longitude,
                ]}
                radius={14}
                pathOptions={{
                  color:
                    getStatusColor(
                      s.status
                    ),

                  fillColor:
                    getStatusColor(
                      s.status
                    ),

                  fillOpacity: 0.35,
                }}
              />

              <Marker
                position={[
                  s.latitude,
                  s.longitude,
                ]}
                icon={createSoldierIcon(
                  s
                )}
              >
                <Popup>
                  <div className="font-semibold">
                    {
                      s.codename
                    }
                  </div>

                  <div className="text-xs">
                    Status:
                    {" "}
                    {
                      s.status
                    }
                  </div>

                  <div className="text-xs">
                    {formatDistance(
                      calculateDistance(
                        trackerLocation.latitude,
                        trackerLocation.longitude,
                        s.latitude,
                        s.longitude
                      )
                    )}
                  </div>
                </Popup>

                <Tooltip
                  direction="right"
                  offset={[
                    8, 0,
                  ]}
                  permanent
                >
                  {
                    s.codename
                  }
                </Tooltip>
              </Marker>
            </Fragment>
          )
        )}

        {/* DRONES */}
        {drones.map(
          (drone) => (
            <Marker
              key={drone.id}
              position={[
                drone.latitude,
                drone.longitude,
              ]}
              icon={createDroneIcon(
                drone
              )}
            >
              <Popup>
                <div className="font-semibold">
                  {
                    drone.codename
                  }
                </div>

                <div className="text-xs">
                  UAV ACTIVE
                </div>

                <div className="text-xs">
                  Battery:
                  {" "}
                  {drone.battery ||
                    0}
                  %
                </div>
              </Popup>

              <Tooltip
                direction="top"
                offset={[
                  0, -20,
                ]}
                permanent
              >
                UAV:
                {" "}
                {
                  drone.codename
                }
              </Tooltip>
            </Marker>
          )
        )}

        <FitBounds
          positions={[
            ...positions,

            [
              trackerLocation.latitude,
              trackerLocation.longitude,
            ],
          ]}
        />
      </MapContainer>
    </div>
  );
}