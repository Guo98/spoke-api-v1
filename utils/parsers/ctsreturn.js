import { load } from "cheerio";

export async function completeCTSReturn(body) {
  const decodedMessage = atob(body.replace(/-/g, "+").replace(/_/g, "/"));
  const $ = load(decodedMessage);

  const emailPatterns = {
    orderno: /Order No:\s(\d+)/,
    client: /Client:\s([\w\s]+)/,
    user: /User:\s([\w\s]+)/,
    device: /Device Returned:\s(.+?)Device Serial #: /,
    serial: /Device Serial #: ([\w\d]+)/,
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
  });

  console.log("rewturn info ::::::::::: ", returnInfo);
}
