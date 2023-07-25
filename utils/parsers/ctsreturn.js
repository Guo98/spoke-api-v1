import { load } from "cheerio";

export async function completeCTSReturn(body, ordersDB) {
  console.log("completeCTSReturn() => Starting function.");
  const decodedMessage = atob(body.replace(/-/g, "+").replace(/_/g, "/"));
  const $ = load(decodedMessage);

  const emailPatterns = {
    orderno: /Order No:\s(\d+)/,
    client: /Client:\s([\w\s]+)User: /,
    user: /User:\s([\w\s]+)Device Returned: /,
    device: /Device Returned:\s(.+?)Device Serial #: /,
    serial: /Device Serial #: ([\w\d]+)Specs: /,
    specs: /Specs:\s(.+)$/,
  };

  const returnInfo = {};

  $("p").each((i, ptag) => {
    const text = $(ptag).text();

    const orderMatch = text.match(emailPatterns.orderno);
    if (orderMatch) {
      returnInfo.orderno = orderMatch[1];
    }

    const clientMatch = text.match(emailPatterns.client);
    if (clientMatch) {
      returnInfo.client = clientMatch[1];
    }

    const userMatch = text.match(emailPatterns.user);
    if (userMatch) {
      returnInfo.user = userMatch[1];
    }

    const deviceMatch = text.match(emailPatterns.device);
    if (deviceMatch) {
      returnInfo.device = deviceMatch[1];
    }

    const serialMatch = text.match(emailPatterns.serial);
    if (serialMatch) {
      returnInfo.serial = serialMatch[1];
    }

    const specsMatch = text.match(emailPatterns.specs);
    if (specsMatch) {
      returnInfo.specs = specsMatch[1];
    }
  });

  console.log("completeCTSReturn() => Got return info:", returnInfo);

  const containerId = determineContainerID(returnInfo.client);
  console.log(
    `completeCTSReturn(${returnInfo.client}) => Got database container:`,
    containerId
  );
  const allOrders = await ordersDB.getAllOrders(containerId);

  for await (const order of allOrders) {
    if (order.orderNo.toString() === returnInfo.orderno) {
      console.log(
        `completeCTSReturn(${returnInfo.client}) => Matched order:`,
        order.orderNo
      );
      if (
        order.items[0].name === "Offboarding" ||
        order.items[0].name === "Returning"
      ) {
        order.items[0].laptop_name = returnInfo.device;
        order.items[0].serial_number = returnInfo.serial;
        try {
          console.log(
            `completeCTSReturn(${returnInfo.client}) => Updating order: ${order.orderNo} with serial number: ${returnInfo.serial}`
          );
          await ordersDB.updateOrderByContainer(
            containerId,
            order.id,
            order.full_name,
            order.items
          );
          console.log(
            `completeCTSReturn(${returnInfo.client}) => Finished updating order: ${order.orderNo} with serial number: ${returnInfo.serial}`
          );
        } catch (e) {
          console.log(
            `completeCTSReturn(${returnInfo.client}) => Error in updating DB with serial number:`,
            e
          );
        }
      }

      break;
    }
  }
  console.log("completeCTSReturn() => Finished function.");
}

function determineContainerID(client) {
  if (client) {
    if (client.toLowerCase().includes("alma")) {
      return "Alma";
    } else if (client.toLowerCase().includes("automox")) {
      return "Automox";
    } else if (client.toLowerCase().includes("bowery")) {
      return "Bowery";
    } else if (client.toLowerCase().includes("flyr")) {
      return "FLYR";
    } else if (client.toLowerCase().includes("roivant")) {
      return "Roivant";
    } else if (client.toLowerCase().includes("nurse")) {
      return "NurseDash";
    } else {
      return "";
    }
  } else {
    return "";
  }
}
