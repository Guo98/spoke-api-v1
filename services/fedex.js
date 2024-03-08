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

const updateFedexStatus = async (
  fedex_token,
  fedex_orders,
  ordersDB,
  client
) => {
  console.log(`updateFedexStatus(${client}) => Starting function.`);
  let fedex_orders_copy = [...fedex_orders];

  while (fedex_orders_copy.length > 0) {
    let get_status_fedex_orders = fedex_orders_copy;
    if (fedex_orders_copy.length > 30) {
      get_status_fedex_orders = fedex_orders_copy.splice(0, 30);
    } else {
      fedex_orders_copy = [];
    }

    let post_data = {
      includeDetailedScans: true,
      trackingInfo: get_status_fedex_orders.map((fo) => {
        return {
          trackingNumberInfo: {
            trackingNumber: fo.tracking_number,
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
        console.log(
          `updateFedexStatus(${client}) => Successfully got fedex tracking results.`
        );
        return trackResp.data.output.completeTrackResults;
      })
      .catch((err) => {
        console.log(
          `updateFedexStatus(${client}) => Error in getting tracking info:`,
          err.response.data
        );
        return [];
      });

    result.forEach(async (fedex_obj, index) => {
      if (
        fedex_obj.trackingNumber ===
        get_status_fedex_orders[index].tracking_number
      ) {
        if (
          fedex_obj.trackResults[0]?.latestStatusDetail?.description &&
          fedex_obj.trackResults[0]?.latestStatusDetail?.description !==
            get_status_fedex_orders[index].current_delivery_status
        ) {
          get_status_fedex_orders[index].items[
            get_status_fedex_orders[index].item_index
          ].delivery_status =
            fedex_obj.trackResults[0]?.latestStatusDetail?.description;
          try {
            console.log(
              `updateFedexStatus(${client}) => Updating order ${get_status_fedex_orders[index].order_id}`
            );
            const updateDelivery = await ordersDB.updateOrderByContainer(
              get_status_fedex_orders[index].containerId,
              get_status_fedex_orders[index].order_id,
              get_status_fedex_orders[index].order_full_name,
              get_status_fedex_orders[index].items
            );
            console.log(
              `updateFedexStatus(${client}) => Successfully updated order ${get_status_fedex_orders[index].order_id}`
            );
          } catch (e) {
            console.log(
              `updateFedexStatus(${client}) => Error in updating order ${get_status_fedex_orders[index].order_id}:`,
              e
            );
          }
        }
      }
    });
  }

  console.log(`updateFedexStatus(${client}) => Finished function.`);
};

export { validateAddress, getFedexToken, trackPackage, updateFedexStatus };
