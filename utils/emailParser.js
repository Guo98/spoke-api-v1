import mockData from "./mock.json" assert { type: "json" };
import { trackingRegex } from "../utils/constants.js";

// need to check name and address
/**
 *
 * @param {base64 string} emailBody
 * @param {string} name
 * @param {string} address
 */
function getTrackingNumber(emailBody, supplier, name, address) {
  const fedexRegEx = "";
  const upsRegEx = "";

  const decodedMessage = atob(
    mockData.data.replace(/-/g, "+").replace(/_/g, "/")
  );
  const fedexRegex = new RegExp("/trknbr=d{12}/");
  //"\b([0-9]{12}|100d{31}|d{15}|d{18}|96d{20}|96d{32})\b"
  // console.log("fedex regex ::::: ", fedexRegex.exec(decodedMessage));
  if (name) {
    const nameCheck = decodedMessage.indexOf(name);
  }
  const dellTrack = trackingRegex.dell.exec(decodedMessage)[0].split("=")[1];
  console.log("regex exec :::::: ", dellTrack);
  console.log("what is here :::::::: ", decodedMessage[17548]);
  return dellTrack;
}

export { getTrackingNumber };
