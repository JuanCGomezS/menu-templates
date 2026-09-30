import { useEffect, useRef, useState } from "react";
import type { Map as LeafletMap, Marker } from "leaflet";
import "leaflet/dist/leaflet.css";

export type MapLocation = { latitude: number; longitude: number };

const DEFAULT_CENTER: MapLocation = { latitude: 4.711, longitude: -74.0721 };

function isValidLocation(
  location: MapLocation | null,
): location is MapLocation {
  return (
    location !== null &&
    Number.isFinite(location.latitude) &&
    Number.isFinite(location.longitude) &&
    location.latitude >= -90 &&
    location.latitude <= 90 &&
    location.longitude >= -180 &&
    location.longitude <= 180
  );
}

type Props = {
  location: MapLocation | null;
  editable?: boolean;
  onChange?: (location: MapLocation) => void;
  className?: string;
  title: string;
};

export default function LocationMap({
  location,
  editable = false,
  onChange,
  className = "h-72 w-full",
  title,
}: Props) {
  const elementRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const leafletRef = useRef<typeof import("leaflet") | null>(null);
  const locationRef = useRef(location);
  const onChangeRef = useRef(onChange);
  const [failed, setFailed] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  locationRef.current = location;
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!elementRef.current) return;
    let active = true;

    void import("leaflet")
      .then((leaflet) => {
        if (!active || !elementRef.current) return;
        const L = leaflet;
        leafletRef.current = leaflet;
        const initial = isValidLocation(locationRef.current)
          ? locationRef.current
          : DEFAULT_CENTER;
        const map = L.map(elementRef.current, { zoomControl: false }).setView(
          [initial.latitude, initial.longitude],
          isValidLocation(locationRef.current) ? 16 : 11,
        );
        mapRef.current = map;
        setMapReady(true);
        L.control.zoom({ position: "bottomright" }).addTo(map);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "&copy; OpenStreetMap contributors",
          maxZoom: 19,
        }).addTo(map);

        if (editable) {
          map.on("click", (event) =>
            onChangeRef.current?.({
              latitude: event.latlng.lat,
              longitude: event.latlng.lng,
            }),
          );
        }
        window.setTimeout(() => map.invalidateSize(), 0);
      })
      .catch(() => setFailed(true));

    return () => {
      active = false;
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
      leafletRef.current = null;
      setMapReady(false);
    };
  }, [editable]);

  useEffect(() => {
    const map = mapRef.current;
    const leaflet = leafletRef.current;
    if (!mapReady || !map || !leaflet) return;
    const L = leaflet;

    if (!isValidLocation(location)) {
      markerRef.current?.remove();
      markerRef.current = null;
      return;
    }

    const point: [number, number] = [location.latitude, location.longitude];
    if (markerRef.current) {
      markerRef.current.setLatLng(point);
    } else {
      const marker = L.marker(point, { draggable: editable }).addTo(map);
      markerRef.current = marker;
      if (editable) {
        marker.on("dragend", () => {
          const next = markerRef.current?.getLatLng();
          if (next)
            onChangeRef.current?.({
              latitude: next.lat,
              longitude: next.lng,
            });
        });
      }
    }
    map.setView(point, 16);
  }, [editable, location, mapReady]);

  if (failed) {
    return (
      <div
        className={`${className} grid place-items-center bg-slate-100 p-4 text-center text-sm text-slate-600`}
      >
        No se pudo cargar el mapa. Inténtalo de nuevo.
      </div>
    );
  }

  return <div ref={elementRef} className={className} aria-label={title} />;
}
