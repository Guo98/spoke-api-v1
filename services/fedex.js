import axios from "axios";
import qs from "qs";

async function getToken() {
  const data = {
    grant_type: "client_credentials",
    client_id: process.env.FEDEX_API_KEY,
    client_secret: process.env.FEDEX_SECRET_KEY
  };

  const options = {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    data: qs.stringify(data),
    url: process.env.FEDEX_URL + "/oauth/token"
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
          countryCode: body.country
        }
      }
    ]
  };

  const result = await getToken()
    .then(data => {
      if (data.status && data.status === 200) {
        const options = {
          method: "POST",
          headers: {
            "content-type": "application/json",
            Authorization: `Bearer ${data.data && data.data.access_token}`
          },
          data: JSON.stringify(postdata),
          url: process.env.FEDEX_URL + "/address/v1/addresses/resolve"
        };
        return axios(options);
      } else {
        throw new Error("Token not generated");
      }
    })
    .then(nextData => {
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
    .catch(err => {
      console.log("err :::::::::: ", err.response.data);
      return { status: 500, data: "Couldn't validate address." };
    });

  return result;
}

export { validateAddress, getToken };
