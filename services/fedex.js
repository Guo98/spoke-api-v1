import axios from "axios";
import qs from "qs";

async function getFedexToken() {
  const data = {
    grant_type: "client_credentials",
    client_id: process.env.FEDEX_API_KEY,
    client_secret: process.env.FEDEX_SECRET_KEY,
  };

  const options = {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    data: qs.stringify(data),
    url: process.env.FEDEX_URL + "/oauth/token",
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

async function validateAddress(body) {
  let streetLines = [body.addr1];
  if (body.addr2 !== "") {
    streetLines.push(body.addr2);
  }
  const postdata = {
    addressesToValidate: [
      {
        address: {
          streetLines: streetLines,
          city: body.city,
          stateOrProvinceCode: body.state,
          postalCode: body.zipcode,
          countryCode: body.country,
        },
      },
    ],
  };

  const result = await getFedexToken()
    .then((data) => {
      if (data.status && data.status === 200) {
        const options = {
          method: "POST",
          headers: {
            "content-type": "application/json",
            Authorization: `Bearer ${data.data && data.data.access_token}`,
          },
          data: JSON.stringify(postdata),
          url: process.env.FEDEX_URL + "/address/v1/addresses/resolve",
        };
        return axios(options);
      } else {
        throw new Error("Token not generated");
      }
    })
    .then((nextData) => {
      if (
        nextData.data.output.resolvedAddresses[0].customerMessages.length > 0 &&
        nextData.data.output.resolvedAddresses[0].customerMessages[0].code !==
          "STANDARDIZED.ADDRESS.NOTFOUND"
      ) {
        throw new Error("Invalid Address");
      } else if (
        nextData.status &&
        nextData.status === 200 &&
        nextData.data.output.resolvedAddresses.length > 0 &&
        nextData.data.output.resolvedAddresses[0].classification !== "UNKNOWN"
      ) {
        return { status: 200, data: nextData };
      } else {
        throw new Error("Invalid Address");
      }
    })
    .catch((err) => {
      console.log("err :::::::::: ", err.response.data);
      return { status: 500, data: "Couldn't validate address." };
    });

  return result;
}

async function trackPackage(tracking_number, token) {
  console.log(`trackPackage(${tracking_number}) => Starting function.`);
  const postdata = {
    includeDetailedScans: true,
    trackingInfo: [
      {
        trackingNumberInfo: {
          trackingNumber: tracking_number,
        },
      },
    ],
  };

  const options = {
    method: "POST",
    headers: {
      "content-type": "application/json",
      Authorization: token,
    },
    data: JSON.stringify(postdata),
    url: process.env.FEDEX_URL + "/track/v1/trackingnumbers",
  };
  const result = await axios(options)
    .then((trackResp) => {
      console.log(
        "tracking result ::::::::::::::: ",
        trackResp.data.output.completeTrackResults[0].trackResults[0]
      );
      const trackingStatus =
        trackResp.data.output.completeTrackResults[0].trackResults[0]
          .latestStatusDetail.description;
      console.log(
        `trackPackage(${tracking_number}) => Got tracking result:`,
        trackingStatus
      );
      return { status: 200, data: trackingStatus };
    })
    .catch((err) => {
      console.log(
        `trackPackage(${tracking_number}) => Error in getting tracking info:`,
        err
      );
      return {
        status: 500,
        data: "Error",
      };
    });
  console.log(`trackPackage(${tracking_number}) => Finished function.`);
  return result;
}

const updateFedexStatus = async (fedex_token, fedex_orders, ordersDB) => {
  let post_data = {
    includeDetailedScans: true,
    trackingInfo: fedex_orders.map((fo) => {
      return {
        trackingNumberInfo: {
          trackingNumber: fo.tracking_no,
        },
      };
    }),
  };

  const options = {
    method: "POST",
    headers: {
      "content-type": "application/json",
      Authorization: fedex_token,
    },
    data: JSON.stringify(post_data),
    url: process.env.FEDEX_URL + "/track/v1/trackingnumbers",
  };

  const result = await axios(options)
    .then((trackResp) => {
      return trackResp.data.output.completeTrackResults;
    })
    .catch((err) => {
      console.log(
        `trackPackage(${tracking_number}) => Error in getting tracking info:`,
        err
      );
      return [];
    });

  let index = 0;
  let current_order = fedex_orders[0];
  for await (let item of fedex_orders) {
    if (result[index].trackResults[0]?.latestStatusDetail?.description) {
      current_order.items[item.item_index].delivery_status =
        result[index].trackResults[0].latestStatusDetail.description;
    }

    if (index < fedex_orders.length) {
      if (
        index + 1 === fedex_orders.length ||
        item.orderNo !== fedex_orders[index + 1].orderNo
      ) {
        try {
          await ordersDB.updateOrderByContainer(
            current_order.containerId,
            current_order.id,
            current_order.full_name,
            current_order.items
          );
        } catch (e) {
          console.log(
            "updateFedexStatus() => Error in updating delivery status:",
            e
          );
        }

        current_order = fedex_orders[index + 1];
      }
    }
    index++;
  }
};

export { validateAddress, getFedexToken, trackPackage, updateFedexStatus };
