import axios from "axios";
import { addMarketplaceOrder } from "../../routes/orders.js";
import { inventory } from "../../routes/inventory.js";
import { slack_channel_ids } from "./slack_mappings.js";
import { sendSlackRequestEmail } from "../emails/slack.js";
import { marketplace_input_keys } from "./slack_mappings.js";

export async function handleSlackAction(payload, resp_url) {
  console.log(`handleSlackAction() => Starting function:`, payload);
  const user_id = payload.user.id;
  const channel_id = payload.container.channel_id;

  const client = slack_channel_ids[channel_id]
    ? slack_channel_ids[channel_id]
    : "public";

  let response = {
    response_type: "in_channel",
    text: `Thank you for your request <@${user_id}>! Your request is processsing...\n`,
    mrkdwn: true,
  };

  if (
    payload.actions[0].type !== "static_select" &&
    payload.actions[0].type !== "external_select"
  ) {
    if (payload.actions[0].value === "cancel") {
      response.text = "Requested canceled.";
    } else if (payload.actions[0].value === "submit_request") {
      await handleMarketplaceRequest(client, payload, resp_url, user_id);
    } else if (payload.actions[0].value === "submit_return") {
      await handleReturnRequest();
    }

    axios
      .post(resp_url, response)
      .then((resp) => {
        console.log("/slackactions => Posted to response url.");
      })
      .catch((err) => {
        console.log(
          "/slackactions => Error in posting response url. Error:",
          err
        );
      });
  }
}

async function handleReturnRequest() {
  let response = {};

  return response;
}

async function handleMarketplaceRequest(client, payload, resp_url, user_id) {
  let response = {
    replace_original: true,
    text: `Thank you for your request <@${user_id}>!\n`,
    mrkdwn: true,
  };

  const inputKeys = marketplace_input_keys;

  let orderObj = {};
  let marketplace = [];
  try {
    marketplace = await inventory.getAll("MarketplaceInventory");
  } catch (e) {
    console.log(
      `handleMarketplaceRequest(${client}) => Error in pulling marketplace data:`,
      e
    );
  }

  Object.keys(payload.state.values).forEach((objKey, index) => {
    const input = payload.state.values[objKey];

    const inputMapping = inputKeys[index];
    let input_value = input[inputMapping.key].value;
    if (index === 0) {
      const market_indexes =
        input[inputMapping.key].selected_option.value.split(":");

      if (market_indexes[0]) {
        if (
          marketplace[market_indexes[0]].item_type !== "Accessories" &&
          marketplace[market_indexes[0]].client === client
        ) {
          const item_type = marketplace[market_indexes[0]];
          if (item_type.brands[market_indexes[1]]) {
            input_value =
              item_type.brands[market_indexes[1]].brand +
              " " +
              item_type.brands[market_indexes[1]].types[market_indexes[2]]
                .type +
              " " +
              item_type.brands[market_indexes[1]].types[market_indexes[2]]
                .specs[market_indexes[3]].spec;
            orderObj.device_type =
              item_type.brands[market_indexes[1]].brand +
              " " +
              item_type.brands[market_indexes[1]].types[market_indexes[2]].type;
            orderObj.specs =
              item_type.brands[market_indexes[1]].types[
                market_indexes[2]
              ].specs[market_indexes[3]].spec;
          }
        } else if (
          marketplace[market_indexes[0]].item_type === "Accessories" &&
          marketplace[market_indexes[0]].client === client
        ) {
          input_value =
            marketplace[market_indexes[0]].items[market_indexes[1]].name;
        }
      }
    }
    orderObj[inputMapping.new_key] = input_value;
    orderObj.client = client;

    response.text =
      response.text + `*${inputMapping.field_name}:*\n${input_value}\n`;
    console.log("/slackactions => orderobj: ", JSON.stringify(orderObj));
  });

  orderObj.date = new Date().toLocaleDateString("en-US");
  orderObj.notes = { device: orderObj.notes };
  await addMarketplaceOrder(orderObj);

  await sendSlackRequestEmail(orderObj);

  axios
    .post(resp_url, response)
    .then((resp) => {
      console.log("/slackactions => Posted to response url.");
    })
    .catch((err) => {
      console.log(
        "/slackactions => Error in posting response url. Error:",
        err
      );
    });
}
