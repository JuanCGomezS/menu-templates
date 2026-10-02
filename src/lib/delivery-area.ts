export const MAX_DELIVERY_RADIUS_METERS = 50_000;

export type DeliveryPoint = { latitude: number; longitude: number };
export type DeliveryArea = { enabled?: boolean; radiusMeters?: number };

export function isValidDeliveryPoint(
  point: Partial<DeliveryPoint> | null | undefined,
): point is DeliveryPoint {
  const latitude = point?.latitude;
  const longitude = point?.longitude;
  return (
    typeof latitude === "number" &&
    typeof longitude === "number" &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

export function isValidDeliveryArea(area: DeliveryArea | null | undefined) {
  const radiusMeters = area?.radiusMeters;
  return (
    area?.enabled === true &&
    typeof radiusMeters === "number" &&
    Number.isFinite(radiusMeters) &&
    radiusMeters > 0 &&
    radiusMeters <= MAX_DELIVERY_RADIUS_METERS
  );
}

export function distanceInMeters(from: DeliveryPoint, to: DeliveryPoint) {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const earthRadiusMeters = 6_371_000;
  const latitudeDelta = toRadians(to.latitude - from.latitude);
  const longitudeDelta = toRadians(to.longitude - from.longitude);
  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(toRadians(from.latitude)) *
      Math.cos(toRadians(to.latitude)) *
      Math.sin(longitudeDelta / 2) ** 2;
  return 2 * earthRadiusMeters * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function isWithinDeliveryArea(
  area: DeliveryArea | null | undefined,
  storeLocation: Partial<DeliveryPoint> | null | undefined,
  deliveryLocation: Partial<DeliveryPoint> | null | undefined,
) {
  if (area?.enabled !== true) return true;
  if (
    !isValidDeliveryArea(area) ||
    !isValidDeliveryPoint(storeLocation) ||
    !isValidDeliveryPoint(deliveryLocation)
  )
    return false;

  return (
    distanceInMeters(storeLocation, deliveryLocation) <=
    (area.radiusMeters as number)
  );
}
