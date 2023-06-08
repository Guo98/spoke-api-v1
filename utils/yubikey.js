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
        console.log("product ids ::::::::: ", keysResp.data.result_set[0]);
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
  const { recipient_name, address, email, phone_number } = body;
  const areThereKeys = await checkYubikeyQuantity();

  if (areThereKeys) {
    const splitRecipientName = recipient_name.split(" ");

    const splitAddress = await validateAddress(address, "system");

    if (splitAddress.status === undefined || splitAddress.status !== 200) {
      throw new Error("Error parsing address");
    }

    return axios
      .post(
        process.env.YUBIKEY_API_URL + "/v1/shipments_exact",
        {
          channelpartner_id: 1,
          delivery_type: 1,
          country_code_2: "US",
          recipient: "Automox",
          recipient_email: email,
          recipient_firstname:
            splitRecipientName.length > 2
              ? splitRecipientName[0] + " " + splitRecipientName[1]
              : splitRecipientName[0],
          recipient_lastname:
            splitRecipientName.length > 2
              ? splitRecipientName[2]
              : splitRecipientName[1],
          recipient_telephone: phone_number,
          street_line1: splitAddress.address_line1,
          street_line2: splitAddress.address_line2
            ? splitAddress.address_line2
            : "",
          city: splitAddress.city,
          region: splitAddress.state,
          postal_code: splitAddress.zipCode,
          shipment_items: [
            {
              product_id: 29,
              inventory_product_id: 29,
              shipment_product_quantity: 0,
            },
          ],
        },
        { headers: { authorization: "", "Content-Type": "application/json" } }
      )
      .then((res) => {})
      .catch((err) => {
        console.log("err");
      });
  } else {
    console.log(
      "createYubikeyShipment() => No keys left. Please inform Automox."
    );
  }
}
