import axios from "axios";
import qs from "qs";

export async function getToken() {
  const formData = {
    grant_type: "client_credentials",
  };

  const options = {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      "x-merchant-id": "string",
      Authorization:
        "Basic " +
        Buffer.from(
          process.env.UPS_CLIENT_ID + ":" + process.env.UPS_CLIENT_SECRET
        ).toString("base64"),
    },
    data: qs.stringify(formData),
    url: process.env.UPS_URL + "/security/v1/oauth/token",
  };

  const result = await axios(options)
    .then((data) => {
      if (data.status && data.status === 200) {
        return { status: 200, data: data.data };
      } else {
        return { status: 500, data: data.data };
      }
    })
    .catch((err) => {
      return { status: 500, data: err };
    });

  return result;
}

export async function trackUPSPackage(tracking_number, token) {
  console.log(`trackUPSPackage(${tracking_number}) => Starting function.`);
  const query = new URLSearchParams({
    locale: "en_US",
    returnSignature: "false",
  }).toString();

  const options = {
    method: "GET",
    headers: {
      "content-type": "application/json",
      transId: "string",
      Authorization: token,
      transactionSrc: "production",
    },
    url:
      process.env.UPS_URL +
      "/api/track/v1/details/" +
      tracking_number +
      "?" +
      query,
  };
  const result = await axios
    .request(options)
    .then((resp) => {
      const shipmentDescription =
        resp.data.trackResponse.shipment[0].package[0].currentStatus
          .description;
      return { status: 200, data: shipmentDescription };
    })
    .catch((err) => {
      console.log(
        `trackUPSPackage(${tracking_number}) => Error in getting tracking info:`,
        err
      );
      return {
        status: 500,
        data: "Error",
      };
    });

  return result;
  console.log(`trackUPSPackage(${tracking_number}) => Finished function.`);
}
