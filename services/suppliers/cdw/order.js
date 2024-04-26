import { ClientCredentials } from "simple-oauth2";
import axios from "axios";

const cdw_config = {
  client: {
    id: process.env.CDW_API_KEY,
    secret: process.env.CDW_API_SECRET,
  },
  auth: {
    tokenHost: process.env.CDW_TOKEN_HOST,
    tokenPath: process.env.CDW_TOKEN_PATH,
  },
};

async function placeCDWOrder2(order_body) {
  console.log(`placeCDWOrder() => Starting function.`);
  const client = new ClientCredentials(cdw_config);

  try {
    const accessToken = await client.getToken();
    console.log(`placeCDWOrder() => Successfully got token.`);
    const options = {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Authorization:
          accessToken.token.token_type + " " + accessToken.token.access_token,
      },
      url: process.env.CDW_TOKEN_HOST + "/b2b/customer/inbapi/v1/CustomerOrder",
      data: order_body,
    };

    console.log(`placeCDWOrder() => Passing through options: `, options);

    const order_resp = await axios.request(options);

    if (order_resp.data?.statusCode === "RECEIVED") {
      console.log(
        `placeCDWOrder() => Successfully placed order: `,
        order_resp.data
      );

      return order_resp.data.orderLines[0].CDWOrderReference;
    } else {
      console.log(
        `placeCDWOrder() => No RECEIVED status in order response: `,
        order_resp.data
      );
      return "";
    }
  } catch (e) {
    console.log(`placeCDWOrder() => Error in getting access token: `, e);
    return "Error";
  }
}

async function placeCDWOrder(order_body) {
  console.log(`placeCDWOrder() => Starting function.`);
  //const client = new ClientCredentials(cdw_config);

  try {
    // const accessToken = await client.getToken();

    console.log(`placeCDWOrder() => Placing order.`);
    const options = {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "subscription-key": process.env.CDW_API_SUBSCRIPTION_KEY,
      },
      url: process.env.CDW_TOKEN_HOST + "/b2b/v1/customers/orders",
      data: order_body,
    };

    console.log(`placeCDWOrder() => Passing through options: `, options);

    const order_resp = await axios.request(options);

    if (order_resp.data?.statusCode === "RECEIVED") {
      console.log(
        `placeCDWOrder() => Successfully placed order: `,
        order_resp.data
      );

      return order_resp.data.orderLines[0].CDWOrderReference;
    } else {
      console.log(
        `placeCDWOrder() => No RECEIVED status in order response: `,
        order_resp.data
      );
      return "";
    }
  } catch (e) {
    console.log(`placeCDWOrder() => Error in getting access token: `, e);
    return "Error";
  }
}

export { placeCDWOrder };
