const MAX_DELIVERY_RADIUS_METERS = 50_000;

function isValidPoint(point) {
  return (
    point &&
    Number.isFinite(point.latitude) &&
    Number.isFinite(point.longitude) &&
    point.latitude >= -90 &&
    point.latitude <= 90 &&
    point.longitude >= -180 &&
    point.longitude <= 180
  );
}

function isValidDeliveryArea(area) {
  return (
    area?.enabled === true &&
    Number.isFinite(area.radiusMeters) &&
    area.radiusMeters > 0 &&
    area.radiusMeters <= MAX_DELIVERY_RADIUS_METERS
  );
}

function distanceInMeters(from, to) {
  const toRadians = (degrees) => (degrees * Math.PI) / 180;
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

function isWithinDeliveryArea(area, storeLocation, deliveryLocation) {
  if (area?.enabled !== true) return true;
  if (
    !isValidDeliveryArea(area) ||
    !isValidPoint(storeLocation) ||
    !isValidPoint(deliveryLocation)
  )
    return false;

  return distanceInMeters(storeLocation, deliveryLocation) <= area.radiusMeters;
}

module.exports = {
  MAX_DELIVERY_RADIUS_METERS,
  distanceInMeters,
  isValidPoint,
  isWithinDeliveryArea,
};
