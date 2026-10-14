import { useEffect, useRef, useState } from "react";
import type { Circle, Map as LeafletMap, Marker } from "leaflet";
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
  radiusMeters?: number;
  onChange?: (location: MapLocation) => void;
  logoUrl?: string;
  className?: string;
  title: string;
};

export default function LocationMap({
  location,
  editable = false,
  radiusMeters,
  onChange,
  logoUrl,
  className = "h-72 w-full",
  title,
}: Props) {
  const elementRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const circleRef = useRef<Circle | null>(null);
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
      circleRef.current = null;
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
      circleRef.current?.remove();
      circleRef.current = null;
      return;
    }

    const point: [number, number] = [location.latitude, location.longitude];
    const markerContent = document.createElement("span");
    markerContent.className = "store-map-marker__content";
    markerContent.setAttribute("aria-hidden", "true");
    if (logoUrl) {
      const image = document.createElement("img");
      image.src = logoUrl;
      image.alt = "";
      image.className = "store-map-marker__image";
      image.addEventListener("error", () => image.remove());
      markerContent.append(image);
    }
    const markerIcon = L.divIcon({
      className: "store-map-marker",
      html: markerContent,
      iconSize: [42, 42],
      iconAnchor: [21, 21],
    });
    if (markerRef.current) {
      markerRef.current.setLatLng(point);
      markerRef.current.setIcon(markerIcon);
    } else {
      const marker = L.marker(point, {
        draggable: editable,
        icon: markerIcon,
      }).addTo(map);
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
    if (Number.isFinite(radiusMeters) && radiusMeters && radiusMeters > 0) {
      if (circleRef.current) {
        circleRef.current.setLatLng(point);
        circleRef.current.setRadius(radiusMeters);
      } else {
        circleRef.current = L.circle(point, {
          radius: radiusMeters,
          color: "#ea580c",
          fillColor: "#fb923c",
          fillOpacity: 0.14,
          weight: 2,
        }).addTo(map);
      }
      map.fitBounds(circleRef.current.getBounds(), { padding: [24, 24] });
    } else {
      circleRef.current?.remove();
      circleRef.current = null;
      map.setView(point, 16);
    }
  }, [editable, location, logoUrl, mapReady, radiusMeters]);

  if (failed) {
    return (
      <div
        className={`${className} grid place-items-center bg-slate-100 p-4 text-center text-sm text-slate-600`}
      >
        No se pudo cargar el mapa. Inténtalo de nuevo.
      </div>
    );
  }

  return (
    <>
      <style>{`.store-map-marker { background: transparent; border: 0; } .store-map-marker__content { position: relative; display: block; width: 42px; height: 42px; } .store-map-marker__content::before { position: absolute; inset: 50% auto auto 50%; width: 10px; height: 10px; border-radius: 999px; background: #ea580c; content: ""; transform: translate(-50%,-50%); } .store-map-marker__image { position: absolute; z-index: 1; inset: 0; display: block; width: 100%; height: 100%; object-fit: contain; object-position: center; }`}</style>
      <div ref={elementRef} className={className} aria-label={title} />
    </>
  );
}
