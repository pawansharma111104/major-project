import { useEffect, useRef, Fragment } from "react";
import { MapContainer, TileLayer, Marker, Popup, Tooltip, useMap, CircleMarker } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { calculateDistance, formatDistance } from "@/lib/geo";

interface SoldierLocation {
  id: string;
  codename: string;
  latitude: number;
  longitude: number;
  status: string;
  lastSeen?: Date;
}

interface MapViewProps {
  trackerLocation: { latitude: number; longitude: number };
  soldiers: SoldierLocation[];
}

// Fix Leaflet's default icon paths (works with Vite)
const iconRetinaUrl = new URL("../../../node_modules/leaflet/dist/images/marker-icon-2x.png", import.meta.url).href;
const iconUrl = new URL("../../../node_modules/leaflet/dist/images/marker-icon.png", import.meta.url).href;
const shadowUrl = new URL("../../../node_modules/leaflet/dist/images/marker-shadow.png", import.meta.url).href;

L.Icon.Default.mergeOptions({
  iconRetinaUrl,
  iconUrl,
  shadowUrl,
});

function FitBounds({ positions }: { positions: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (!map) return;
    if (positions.length === 0) return;
    try {
      const bounds = L.latLngBounds(positions.map((p) => [p[0], p[1]] as [number, number]));
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    } catch {}
  }, [map, positions]);
  return null;
}

export default function MapView({ trackerLocation, soldiers }: MapViewProps) {
  const mapRef = useRef<any | null>(null);
  // keep refs to marker instances so we can animate their movement smoothly
  const markerRefs = useRef<Record<string, any>>({});

  const positions: [number, number][] = soldiers.map((s) => [s.latitude, s.longitude]);

  const statusColors: Record<string, string> = {
    online: "green",
    engaged: "red",
    needsAssistance: "orange",
    offline: "gray",
  };

  function fmtCoord(lat: number, lon: number) {
    return `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
  }

  // create a small div icon for soldiers with a colored dot and initials
  function createSoldierIcon(s: SoldierLocation) {
    const color = statusColors[s.status] || "blue";
    const initials = (s.codename || "?")
      .split(" ")
      .map((p) => p[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

    const html = `
      <div style="display:flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:18px;background:${color};color:white;font-size:12px;font-weight:600;border:2px solid white;box-shadow:0 0 4px rgba(0,0,0,0.3)">
        ${initials}
      </div>
    `;

    return L.divIcon({ html, className: "", iconSize: [34, 34], iconAnchor: [17, 17] });
  }

  // Choose initial center and zoom
  const initialCenter: [number, number] = [trackerLocation.latitude, trackerLocation.longitude];

  // Ensure the map invalidates its size and recenters when the trackerLocation
  // or soldiers list changes. This fixes cases where the map appears blank
  // because the container size changed after Leaflet initialized.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    try {
      // Invalidate size immediately and after a short delay to handle CSS/layout changes
      map.invalidateSize();
      if (
        Array.isArray(initialCenter) &&
        Number.isFinite(initialCenter[0]) &&
        Number.isFinite(initialCenter[1])
      ) {
        map.setView(initialCenter);
      }
    } catch (e) {}

    const t = setTimeout(() => {
      try {
        map.invalidateSize();
      } catch (e) {}
    }, 250);

    return () => clearTimeout(t);
  }, [trackerLocation.latitude, trackerLocation.longitude, soldiers.length]);

  // Animate markers when soldier positions change to give a smooth movement
  useEffect(() => {
    // For each soldier, if we have a marker reference, animate from current to new position
    soldiers.forEach((s) => {
      const marker = markerRefs.current[s.id];
      if (!marker) return;

      try {
        const current = marker.getLatLng();
        const target = L.latLng(s.latitude, s.longitude);

        // if distance is tiny, just set directly
        if (current.equals(target)) return;

        const duration = 600; // ms
        const start = performance.now();

        const step = (now: number) => {
          const t = Math.min(1, (now - start) / duration);
          const lat = current.lat + (target.lat - current.lat) * t;
          const lng = current.lng + (target.lng - current.lng) * t;
          marker.setLatLng([lat, lng]);
          if (t < 1) requestAnimationFrame(step);
        };

        requestAnimationFrame(step);
      } catch (e) {
        // fallback: set location directly
        try {
          marker.setLatLng([s.latitude, s.longitude]);
        } catch {}
      }
    });
  }, [soldiers]);

  // Auto-center map on first soldier (helpful to locate soldiers quickly)
  useEffect(() => {
    if (!mapRef.current) return;
    if (soldiers.length === 0) return;
    try {
      const s = soldiers[0];
      mapRef.current.setView([s.latitude, s.longitude], 14);
    } catch (e) {}
  }, [soldiers.length]);

  // Keep marker icons in sync (color/status/initials)
  useEffect(() => {
    soldiers.forEach((s) => {
      const marker = markerRefs.current[s.id];
      if (!marker) return;
      try {
        marker.setIcon(createSoldierIcon(s));
      } catch (e) {}
    });
  }, [soldiers]);

  // Make soldiers highly visible: add CircleMarker markers and
  // auto-open and bring-to-front the first soldier's popup when present.
  useEffect(() => {
    // bring markers to front and open popup for first soldier
    if (!mapRef.current) return;
    if (soldiers.length === 0) return;

    const first = soldiers[0];
    const firstMarker = markerRefs.current[first.id];
    try {
      // bring all markers to front so they are visible above other overlays
      for (const id of Object.keys(markerRefs.current)) {
        const m = markerRefs.current[id];
        try {
          if (m && typeof m.bringToFront === "function") m.bringToFront();
        } catch {}
      }

      if (firstMarker) {
        // center and open popup to make it obvious
        try {
          mapRef.current.setView([first.latitude, first.longitude], 15);
        } catch {}
        try {
          if (typeof firstMarker.openPopup === "function") firstMarker.openPopup();
        } catch {}
      }
    } catch (e) {}
  }, [soldiers]);

  return (
    <div className="relative h-full min-h-[500px] bg-muted/30 rounded-lg border border-border overflow-hidden">
      <MapContainer
        center={initialCenter}
        zoom={13}
        // Provide an explicit fallback height so the map remains visible
        // even if parent containers have collapsed heights during layout.
        style={{ height: "500px", minHeight: "500px", width: "100%" }}
        whenCreated={(mapInstance: any) => {
          // store ref
          mapRef.current = mapInstance;

          // debug logging to help diagnose invisible tiles
          // eslint-disable-next-line no-console
          console.log("Map created", {
            size: mapInstance.getSize?.(),
            center: mapInstance.getCenter?.(),
            panes: Object.keys(mapInstance.getPanes ? mapInstance.getPanes() : {}),
          });

          // Force tile pane to be on top and transparent background in case a dev overlay
          // or other UI is covering it. This is a runtime fix for development.
          try {
            const panes = mapInstance.getPanes && mapInstance.getPanes();
            if (panes && panes.tilePane) {
              panes.tilePane.style.zIndex = '1000002';
              panes.tilePane.style.background = 'transparent';
              panes.tilePane.style.pointerEvents = 'auto';
              // also make overlay pane visible above dev overlays
              if (panes.overlayPane) {
                panes.overlayPane.style.zIndex = '1000003';
              }
            }
          } catch (e) {
            // eslint-disable-next-line no-console
            console.debug('Failed to style panes', e);
          }

          // Invalidate size immediately and shortly after to force a reflow
          try {
            mapInstance.invalidateSize && mapInstance.invalidateSize();
            setTimeout(() => {
              try {
                mapInstance.invalidateSize && mapInstance.invalidateSize();
              } catch {}
            }, 300);
          } catch (e) {}
        }}
        data-testid="map-container"
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        {/* Tracker marker */}
        <Marker position={[trackerLocation.latitude, trackerLocation.longitude]}>
          <Popup>
            <div className="font-mono">Tracker Position</div>
            <div className="text-xs">{trackerLocation.latitude.toFixed(6)}°, {trackerLocation.longitude.toFixed(6)}°</div>
          </Popup>
          <Tooltip direction="right" offset={[8, 0]} permanent>
            {fmtCoord(trackerLocation.latitude, trackerLocation.longitude)}
          </Tooltip>
        </Marker>

        {/* Soldier markers (visible CircleMarker + Marker) */}
        {soldiers.map((s) => (
          <Fragment key={s.id}>
            <CircleMarker
              center={[s.latitude, s.longitude]}
              radius={10}
              pathOptions={{
                color: "#ffffff",
                weight: 2,
                fillColor: statusColors[s.status] || "blue",
                fillOpacity: 0.95,
              }}
            />

            <Marker
              position={[s.latitude, s.longitude]}
              ref={(el) => {
                // react-leaflet marker instance has getLatLng; store it for animation
                if (el && (el as any).getLatLng) {
                  markerRefs.current[s.id] = el as any;
                } else {
                  delete markerRefs.current[s.id];
                }
              }}
            >
              <Popup>
                <div className="font-semibold">{s.codename}</div>
                <div className="text-xs">{s.latitude.toFixed(6)}°, {s.longitude.toFixed(6)}°</div>
                <div className="text-xs">Status: {s.status}</div>
                <div className="text-xs">{formatDistance(calculateDistance(trackerLocation.latitude, trackerLocation.longitude, s.latitude, s.longitude))}</div>
              </Popup>
              <Tooltip direction="right" offset={[8, 0]} permanent>
                {fmtCoord(s.latitude, s.longitude)}
              </Tooltip>
            </Marker>
          </Fragment>
        ))}

        <FitBounds positions={[...positions, [trackerLocation.latitude, trackerLocation.longitude]]} />
      </MapContainer>

      {/* Floating quick-controls: center map on a soldier or tracker */}
      <div className="absolute top-4 right-4 bg-white/90 dark:bg-black/70 p-2 rounded shadow max-h-56 overflow-auto text-xs w-40">
        <div className="font-semibold mb-1">Quick Center</div>
        <button
          className="block w-full text-left px-2 py-1 rounded hover:bg-muted/20"
          onClick={() => {
            const m = mapRef.current;
            if (m) m.setView([trackerLocation.latitude, trackerLocation.longitude], 15);
          }}
        >
          Center Tracker
        </button>
        <div className="h-px my-1 bg-border/50" />
        {soldiers.map((s) => (
          <button
            key={s.id}
            className="block w-full text-left px-2 py-1 rounded hover:bg-muted/20"
            onClick={() => {
              const m = mapRef.current;
              if (m) m.setView([s.latitude, s.longitude], 16);
            }}
          >
            {s.codename}
          </button>
        ))}
      </div>
    </div>
  );
}
