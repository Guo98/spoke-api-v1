import axios from "axios";
import parser from "parse-address";
import { parse } from "dotenv";

async function autocompleteAddress(address) {
  const validateUrl =
    process.env.GEO_URL +
    "autocomplete?text=" +
    address +
    "&format=json&apiKey=" +
    process.env.GEO_API_KEY;

  const options = {
    method: "GET",
    url: validateUrl
  };

  const result = await axios(options)
    .then(data => {
      if (data.status && data.status === 200) {
        return { status: 200, data: data.data };
      } else {
        return { status: 500, data: data.data };
      }
    })
    .catch(err => {
      return { status: 500, data: err };
    });

  return result;
}

async function validateAddress(address) {
  const validateUrl =
    process.env.GEO_URL +
    "search?text=" +
    address +
    "&apiKey=" +
    process.env.GEO_API_KEY;

  const options = {
    method: "GET",
    url: validateUrl
  };
  const parsed = parser.parseLocation(address);
  // console.log("parsed address :::::: ", parsed);
  const result = await axios(options)
    .then(data => {
      if (data.status && data.status === 200) {
        const features = data.data.features[0];
        // console.log("addres obj :::::: ", features);
        if (features.properties.country === "United States") {
          if (features.properties.rank.confidence > 0.9) {
            let addressLine2 = "";
            const splitAddr = address.split(",");
            if (parsed.sec_unit_type && parsed.sec_unit_num) {
              addressLine2 = parsed.sec_unit_type + " " + parsed.sec_unit_num;
            } else if (splitAddr.length === 6) {
              addressLine2 = splitAddr[1];
            }
            const addressObj = {
              address_line1: features.properties.address_line1,
              address_line2: addressLine2,
              city: features.properties.city,
              zipCode: features.properties.postcode,
              state: features.properties.state_code,
              country: features.properties.country_code.toUpperCase()
            };
            return { status: 200, data: addressObj };
          } else {
            return { status: 500, data: "not a confident full match" };
          }
        } else {
          return { status: 500, data: "not in the united states" };
        }
      } else {
        return { status: 500, data: data.data };
      }
    })
    .catch(err => {
      return { status: 500, data: err };
    });

  return result;
}

export { autocompleteAddress, validateAddress };
