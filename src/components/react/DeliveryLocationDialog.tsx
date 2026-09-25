import { useEffect, useRef, useState } from "react";
import type { Map as LeafletMap, Marker } from "leaflet";
import "leaflet/dist/leaflet.css";
import type { DeliveryLocation } from "../../lib/orders";

const DEFAULT_LOCATION: DeliveryLocation = {
  latitude: 4.711,
  longitude: -74.0721,
};

type Props = {
  address: string;
  initialLocation: DeliveryLocation | null;
  open: boolean;
  onClose: () => void;
  onConfirm: (location: DeliveryLocation) => void;
};

export default function DeliveryLocationDialog({
  address,
  initialLocation,
  open,
  onClose,
  onConfirm,
}: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const mapElementRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const leafletRef = useRef<typeof import("leaflet") | null>(null);
  const placeMarkerRef = useRef<
    | ((location: DeliveryLocation, invalidatePendingRequest?: boolean) => void)
    | null
  >(null);
  const locationRequestIdRef = useRef(0);
  const openRef = useRef(open);
  const [location, setLocation] = useState<DeliveryLocation>(
    initialLocation || DEFAULT_LOCATION,
  );
  const [locationSelected, setLocationSelected] = useState(
    initialLocation !== null,
  );
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState("");

  useEffect(() => {
    openRef.current = open;
    if (!open) {
      locationRequestIdRef.current += 1;
      setLocating(false);
    }

    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    if (!open || !mapElementRef.current) return;

    const startLocation = initialLocation || DEFAULT_LOCATION;
    let active = true;
    setLocation(startLocation);
    setLocationSelected(initialLocation !== null);

    void import("leaflet").then((leaflet) => {
      if (!active || !mapElementRef.current) return;

      const L = leaflet.default;
      leafletRef.current = leaflet;
      const map = L.map(mapElementRef.current, { zoomControl: false }).setView(
        [startLocation.latitude, startLocation.longitude],
        16,
      );
      mapRef.current = map;
      L.control.zoom({ position: "bottomright" }).addTo(map);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
        maxZoom: 19,
      }).addTo(map);

      const markerIcon = L.divIcon({
        className: "delivery-location-marker-wrap",
        html: '<span class="delivery-location-marker" aria-hidden="true"></span>',
        iconSize: [28, 38],
        iconAnchor: [14, 38],
      });
      const placeMarker = (
        nextLocation: DeliveryLocation,
        invalidatePendingRequest = true,
      ) => {
        if (invalidatePendingRequest) {
          locationRequestIdRef.current += 1;
          setLocating(false);
        }
        if (markerRef.current) {
          markerRef.current.setLatLng([
            nextLocation.latitude,
            nextLocation.longitude,
          ]);
        } else {
          markerRef.current = L.marker(
            [nextLocation.latitude, nextLocation.longitude],
            { draggable: true, icon: markerIcon },
          ).addTo(map);
          markerRef.current.on("dragend", () => {
            const point = markerRef.current?.getLatLng();
            if (point)
              placeMarker({ latitude: point.lat, longitude: point.lng });
          });
        }

        setLocation(nextLocation);
        setLocationSelected(true);
      };
      placeMarkerRef.current = placeMarker;
      if (initialLocation) placeMarker(initialLocation);
      map.on("click", (event) =>
        placeMarker({
          latitude: event.latlng.lat,
          longitude: event.latlng.lng,
        }),
      );
      window.setTimeout(() => map.invalidateSize(), 0);
    });

    return () => {
      active = false;
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
      leafletRef.current = null;
      placeMarkerRef.current = null;
    };
  }, [initialLocation, open]);

  const requestCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationError(
        "Tu navegador no permite usar la ubicación actual. Mueve el pin manualmente.",
      );
      return;
    }

    const requestId = ++locationRequestIdRef.current;
    setLocating(true);
    setLocationError("");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (requestId !== locationRequestIdRef.current || !openRef.current)
          return;
        const nextLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        placeMarkerRef.current?.(nextLocation, false);
        mapRef.current?.setView(
          [nextLocation.latitude, nextLocation.longitude],
          17,
        );
        setLocating(false);
      },
      () => {
        if (requestId !== locationRequestIdRef.current || !openRef.current)
          return;
        setLocationError(
          "No se pudo acceder a tu ubicación. Mueve el pin manualmente.",
        );
        setLocating(false);
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 10_000 },
    );
  };

  return (
    <dialog
      ref={dialogRef}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      aria-labelledby="delivery-location-title"
      className="m-auto w-[min(100%-1.5rem,34rem)] rounded-2xl border border-slate-200 bg-white p-0 text-slate-950 shadow-[0_24px_64px_rgba(15,23,42,0.28)] backdrop:bg-slate-950/45"
    >
      <style>{`.delivery-location-marker-wrap { background: transparent; border: 0; } .delivery-location-marker { display: block; width: 22px; height: 22px; border: 3px solid #ffffff; border-radius: 50% 50% 50% 0; background: #e05a2a; box-shadow: 0 3px 8px rgba(15,23,42,.25); transform: rotate(-45deg); }`}</style>
      <div className="border-b border-slate-100 px-5 py-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2
              id="delivery-location-title"
              className="text-lg font-bold tracking-tight"
            >
              Confirma tu punto de entrega
            </h2>
            <p className="mt-1 text-sm leading-5 text-slate-600">
              Mueve el pin al lugar exacto donde debe llegar el pedido.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-600"
            aria-label="Cerrar mapa"
          >
            <span className="material-icons-outlined" aria-hidden="true">
              close
            </span>
          </button>
        </div>
        <p className="mt-3 truncate rounded-lg bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">
          {address}
        </p>
      </div>

      <div className="relative">
        <div
          ref={mapElementRef}
          className="h-72 w-full bg-slate-100"
          aria-label="Mapa para seleccionar el punto de entrega"
        />
        <button
          type="button"
          onClick={requestCurrentLocation}
          disabled={locating}
          className="absolute left-3 top-3 z-[500] inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50 disabled:cursor-wait disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-600"
        >
          <span
            className="material-icons-outlined text-[18px]"
            aria-hidden="true"
          >
            my_location
          </span>
          {locating ? "Ubicando…" : "Usar mi ubicación"}
        </button>
      </div>

      <div className="px-5 py-4">
        {locationError && (
          <p
            role="alert"
            className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-800"
          >
            {locationError}
          </p>
        )}
        <p className="text-xs leading-5 text-slate-500">
          Al abrir, OpenStreetMap recibe la zona del punto mostrado para cargar
          el mapa, incluso si fue guardado antes. Selecciona el punto
          manualmente o usa tu ubicación actual. Al confirmar, este punto se
          comparte con la tienda para entregar tu pedido.
        </p>
        <div className="mt-4 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-600"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => onConfirm(location)}
            disabled={!locationSelected}
            className="rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-600 focus-visible:ring-offset-2"
          >
            {locationSelected ? "Guardar ubicación" : "Selecciona un punto"}
          </button>
        </div>
      </div>
    </dialog>
  );
}
