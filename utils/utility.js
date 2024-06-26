function utcDateToSerial(date) {
  const dateSansTime = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );

  const fracPart = (date.getTime() - dateSansTime.getTime()) / DAY_TO_MS;
  return intPart + fracPart;
}

function areAllShipped(order) {
  let untrackedItem = false;
  order?.items.forEach((item) => {
    if (item.tracking_number === "") {
      untrackedItem = true;
    }
  });

  if (!untrackedItem) {
    order.shipping_status = "Shipped";
  }
}

const determineContainer = (client) => {
  switch (client) {
    case "public":
      return "Mock";
    case "FLYR":
      return "FLYR";
    default:
      return client;
  }
};

export { utcDateToSerial, areAllShipped, determineContainer };
