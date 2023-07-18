import axios from "axios";
import { validateAddress } from "../services/address.js";

/**client,
    device_type,
    specs,
    color,
    notes: { device, recipient },
    order_type,
    recipient_name,
    address,
    email,
    phone_number,
    shipping_rate,
    requestor_email,

   address_line1: features.properties.address_line1,
              address_line2: addressLine2,
              city: features.properties.city,
              zipCode: features.properties.postcode,
              state:
                features.properties.state_code || features.properties.state,
              country:  


                address.addressLine +
          ", " +
          address.city +
          ", " +
          address.subdivision +
          " " +
          address.postalCode +
          ", " +
          address.country
    */

export async function checkYubikeyQuantity() {
  let getOpts = {
    method: "GET",
    url: process.env.YUBIKEY_API_URL + "/v1/shippablekeys",
    headers: {
      Authorization: "Bearer " + process.env.YUBIKEY_KEY,
    },
  };
  try {
    const keysResp = await axios.request(getOpts);

    if (keysResp.data.result_set && keysResp.data.result_set[0]) {
      if (keysResp.data.result_set[0].total_keys_available > 2) {
        return true;
      } else {
        return false;
      }
    } else {
      return false;
    }
  } catch (e) {
    console.log("checkYubikeyQuantity() => Error in getting quantity:", e);
    return false;
  }
}

export async function createYubikeyShipment(body) {
  const { firstname, lastname, address, email, phone_number } = body;
  const areThereKeys = await checkYubikeyQuantity();

  if (areThereKeys) {
    if (!email.includes("automox")) {
      throw new Error("Not part of automox");
    }
    try {
      const postResp = await axios.post(
        process.env.YUBIKEY_API_URL + "/v1/shipments_exact",
        {
          channelpartner_id: 1,
          delivery_type: 1,
          country_code_2: "US",
          recipient: "Automox",
          recipient_email: email,
          recipient_firstname: firstname,
          recipient_lastname: lastname,
          recipient_telephone: phone_number,
          street_line1: address.addressLine,
          street_line2: "",
          city: address.city,
          region: address.subdivision,
          postal_code: address.postalCode,
          shipment_items: [
            {
              product_id: 29,
              inventory_product_id: 29,
              shipment_product_quantity: 2,
            },
          ],
        },
        {
          headers: {
            authorization: "Bearer " + process.env.YUBIKEY_KEY,
            "Content-Type": "application/json",
          },
        }
      );
      console.log(
        "createYubikeyShipment() => Successfully ordered:",
        postResp.data
      );

      return postResp.data.shipment_id;
    } catch (err) {
      console.log("createYubikeyShipment() => Error in ordering keys:", err);
      return "";
    }
  } else {
    console.log(
      "createYubikeyShipment() => No keys left. Please inform Automox."
    );
    return "";
  }
}

export async function getYubikeyShipmentInfo(shipment_id) {
  let getOpts = {
    method: "GET",
    url: process.env.YUBIKEY_API_URL + "/v1/shipments_exact/" + shipment_id,
    headers: {
      Authorization: "Bearer " + process.env.YUBIKEY_KEY,
    },
  };
  try {
    const resp = await axios.request(getOpts);
    console.log("resp ::::::::::: ", resp);
  } catch (e) {
    console.log(
      "getYubikeyShipmentInfo() => Error in getting shipment info:",
      e
    );
  }
}
