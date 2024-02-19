import { Router } from "express";
import axios from "axios";
import crypto from "crypto";
import { sendSlackRequestEmail } from "../services/sendEmail.js";
import { addMarketplaceOrder } from "./orders.js";
import { checkJwt } from "../services/auth0.js";
import { slackMarketplaceRequestForm } from "../services/slack/slack_forms.js";
import { handleSlackAction } from "../services/slack/slack_actions.js";

import pkg from "@slack/bolt";
const { App } = pkg;
const router = Router();

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
});

const slack = (req, res, next) => {
  if (
    !req.headers["x-slack-request-timestamp"] ||
    Math.abs(
      Math.floor(new Date().getTime() / 1000) -
        +req.headers["x-slack-request-timestamp"]
    ) > 300
  ) {
    console.log("slack middleware request too old");
    return res.status(400).send("Request too old!");
  }

  const baseStr = `v0:${req.headers["x-slack-request-timestamp"]}:${req.rawBody}`;

  const receivedSignature = req.headers["x-slack-signature"];

  const expectedSignature = `v0=${crypto
    .createHmac("sha256", process.env.SLACK_SIGNING_SECRET)
    .update(baseStr, "utf8")
    .digest("hex")}`;

  if (expectedSignature !== receivedSignature) {
    console.log("slack() => Error: signature mismatch.");
    return res.status(400).send("Signature mismatched.");
  }

  next();
};

// C05NMSAF4F3

router.post("/message", checkJwt, async (req, res) => {
  console.log("/message => Starting route.");
  const {
    rating,
    requested_item,
    recommended_item,
    recommended_link,
    add_to_marketplace,
    requestor_email,
  } = req.body;
  try {
    let blocks = [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: rating ? "*Good Recommendation*" : "*Bad Recommendation*",
        },
      },
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: "*Requested Item:*\n" + requested_item,
          },
          {
            type: "mrkdwn",
            text: "*Recommended Item:*\n" + recommended_item,
          },
          {
            type: "mrkdwn",
            text: "*Recommended Link:*\n" + recommended_link,
          },
          {
            type: "mrkdwn",
            text: "*Submitted By:*\n" + requestor_email,
          },
        ],
      },
    ];

    if (add_to_marketplace) {
      blocks.splice(1, 0, {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "*Add to Marketplace*",
        },
      });
    }
    const result = await app.client.chat.postMessage({
      token: process.env.SLACK_BOT_TOKEN,
      channel: "C05NMSAF4F3",
      text: "New Rating",
      blocks: blocks,
    });
    console.log("/message => Successfully sent message.");
    res.json({ status: "Successful" });
  } catch (e) {
    console.log("/message => Error in sending message: ", e);
    res.status(500).json({ status: "Error" });
  }
  console.log("/message => Finished route.");
});

router.post("/slackorder", slack, async (req, res) => {
  console.log("/slackorder => Starting route.");
  try {
    const response = await slackMarketplaceRequestForm(req.body.channel_id);

    return res.json(response);
  } catch (e) {
    return res.status(500).send("Ooops");
  }
});

/*
    "client": "Test client",
    "color": "Gray",
    "notes": {
        "device": "device notes",
        "recipient": "employee notes here"
    },
    "order_type": "Deploy",
    "email": "andy@withspoke.com",
    "phone_number": "1234567890",
    "shipping_rate": "standard",
    "date": "4/5/2023",
    "status": "Received",
*/

router.post("/slackactions", slack, async (req, res) => {
  console.log("/slackactions => req.body", req.body);

  const payload = JSON.parse(req.body.payload);
  const resp_url = payload.response_url;
  const userId = payload.user.id;
  let response = {
    response_type: "in_channel",
    text: `Thank you for your request <@${userId}>!\n`,
    mrkdwn: true,
  };
  await handleSlackAction(payload, resp_url);
  // const inputKeys = [
  //   { key: "client_input", new_key: "client", field_name: "Client" },
  //   { key: "item_name_input", new_key: "device_type", field_name: "Item Name" },
  //   {
  //     key: "item_color_input",
  //     new_key: "color",
  //     field_name: "Item Color",
  //   },
  //   {
  //     key: "item_quantity_input",
  //     new_key: "quantity",
  //     field_name: "Item Quantity",
  //   },
  //   {
  //     key: "req_specs_input",
  //     new_key: "specs",
  //     field_name: "Required Specs",
  //   },
  //   {
  //     key: "recipient_name_input",
  //     new_key: "recipient_name",
  //     field_name: "Recipient Name",
  //   },
  //   {
  //     key: "recipient_addr_input",
  //     new_key: "address",
  //     field_name: "Recipient Address",
  //   },
  //   {
  //     key: "recipient_email_input",
  //     new_key: "email",
  //     field_name: "Recipient Email",
  //   },
  //   {
  //     key: "recipient_pn_input",
  //     new_key: "phone_number",
  //     field_name: "Recipient Phone Number",
  //   },
  //   { key: "ref_url_input", new_key: "ref_url", field_name: "Reference URL" },
  //   { key: "notes_input", new_key: "notes", field_name: "Notes" },
  // ];
  // let orderObj = {};
  // if (payload.actions[0].value !== "submit") {
  //   response.text = "Requested canceled.";
  // } else {
  //   Object.keys(payload.state.values).forEach((objKey, index) => {
  //     const input = payload.state.values[objKey];
  //     const inputMapping = inputKeys[index];
  //     orderObj[inputMapping.new_key] = input[inputMapping.key].value;

  //     response.text =
  //       response.text +
  //       `*${inputMapping.field_name}:*\n${input[inputMapping.key].value}\n`;
  //     console.log("/slackactions => orderobj: ", JSON.stringify(orderObj));
  //   });

  //   orderObj.date = new Date().toLocaleDateString("en-US");
  //   orderObj.notes = { device: orderObj.notes };

  //   await addMarketplaceOrder(orderObj);
  // }

  // axios
  //   .post(resp_url, response)
  //   .then((resp) => {
  //     console.log("/slackactions => Posted to response url.");
  //   })
  //   .catch((err) => {
  //     console.log(
  //       "/slackactions => Error in posting response url. Error:",
  //       err
  //     );
  //   });

  res.send("Ok");
  if (payload.actions[0].value === "submit") {
    await sendSlackRequestEmail(orderObj);
  }
});

router.post("/slackoptions", slack, async (req, res) => {
  console.log("/slackoptions => req.body", req.body);
  console.log("/slackoptions => payload", req.body.payload);
  res.json({
    options: [
      {
        text: {
          type: "plain_text",
          text: "*this is plain_text text*",
        },
        value: "value-0",
      },
      {
        text: {
          type: "plain_text",
          text: "*this is plain_text text*",
        },
        value: "value-1",
      },
      {
        text: {
          type: "plain_text",
          text: "*this is plain_text text*",
        },
        value: "value-2",
      },
    ],
  });
});

const resultState2 = {
  type: "block_actions",
  user: {
    id: "U03LK1CPU8G",
    username: "andy",
    name: "andy",
    team_id: "T023LRP68AU",
  },
  api_app_id: "A052R045TBQ",
  token: "k6lF4wZuPjjtqm70AIBQ6Qh3",
  container: {
    type: "message",
    message_ts: "1682043910.192159",
    channel_id: "D03L7TX0BHP",
    is_ephemeral: false,
  },
  trigger_id: "5158803129777.2122873212368.c609db5d2f955c57564ba5c235e5f7a4",
  team: { id: "T023LRP68AU", domain: "spoke-technology" },
  enterprise: null,
  is_enterprise_install: false,
  channel: { id: "D03L7TX0BHP", name: "directmessage" },
  message: {
    type: "message",
    subtype: "bot_message",
    text: "Hello, World!",
    ts: "1682043910.192159",
    bot_id: "B054039ST9R",
    blocks: [
      {
        type: "header",
        block_id: "eRP4",
        text: { type: "plain_text", text: "New request", emoji: true },
      },
      {
        type: "input",
        block_id: "lB8k/",
        label: { type: "plain_text", text: "Item Name", emoji: true },
        optional: false,
        dispatch_action: false,
        element: {
          type: "plain_text_input",
          action_id: "item_name_input",
          dispatch_action_config: { trigger_actions_on: ["on_enter_pressed"] },
        },
      },
      {
        type: "input",
        block_id: "xBc",
        label: { type: "plain_text", text: "Requested Specs", emoji: true },
        optional: false,
        dispatch_action: false,
        element: {
          type: "plain_text_input",
          action_id: "req_specs_input",
          dispatch_action_config: { trigger_actions_on: ["on_enter_pressed"] },
        },
      },
      {
        type: "input",
        block_id: "s6VG",
        label: { type: "plain_text", text: "Recipient Name", emoji: true },
        optional: false,
        dispatch_action: false,
        element: {
          type: "plain_text_input",
          action_id: "recipient_name_input",
          dispatch_action_config: { trigger_actions_on: ["on_enter_pressed"] },
        },
      },
      {
        type: "input",
        block_id: "lJpx",
        label: { type: "plain_text", text: "Recipient Address", emoji: true },
        optional: false,
        dispatch_action: false,
        element: {
          type: "plain_text_input",
          action_id: "recipient_addr_input",
          dispatch_action_config: { trigger_actions_on: ["on_enter_pressed"] },
        },
      },
      {
        type: "input",
        block_id: "u+Ce",
        label: { type: "plain_text", text: "Recipient Email", emoji: true },
        optional: false,
        dispatch_action: false,
        element: {
          type: "plain_text_input",
          action_id: "recipient_email_input",
          dispatch_action_config: { trigger_actions_on: ["on_enter_pressed"] },
        },
      },
      {
        type: "input",
        block_id: "yqL",
        label: {
          type: "plain_text",
          text: "Recipient Phone Number",
          emoji: true,
        },
        optional: false,
        dispatch_action: false,
        element: {
          type: "plain_text_input",
          action_id: "recipient_pn_input",
          dispatch_action_config: { trigger_actions_on: ["on_enter_pressed"] },
        },
      },
      {
        type: "input",
        block_id: "BvuBP",
        label: { type: "plain_text", text: "Reference URL", emoji: true },
        optional: false,
        dispatch_action: false,
        element: {
          type: "plain_text_input",
          action_id: "ref_url_input",
          dispatch_action_config: { trigger_actions_on: ["on_enter_pressed"] },
        },
      },
      {
        type: "input",
        block_id: "aZxg",
        label: { type: "plain_text", text: "Notes", emoji: true },
        optional: false,
        dispatch_action: false,
        element: {
          type: "plain_text_input",
          action_id: "notes_input",
          dispatch_action_config: { trigger_actions_on: ["on_enter_pressed"] },
        },
      },
      {
        type: "actions",
        block_id: "actionblock789",
        elements: [
          {
            type: "button",
            action_id: "YkZIQ",
            text: { type: "plain_text", text: "Submit", emoji: true },
            style: "primary",
            value: "submit",
          },
        ],
      },
    ],
  },
  state: {
    values: {
      "lB8k/": { item_name_input: { type: "plain_text_input", value: null } },
      xBc: { req_specs_input: { type: "plain_text_input", value: null } },
      s6VG: { recipient_name_input: { type: "plain_text_input", value: null } },
      lJpx: { recipient_addr_input: { type: "plain_text_input", value: null } },
      "u+Ce": {
        recipient_email_input: { type: "plain_text_input", value: null },
      },
      yqL: { recipient_pn_input: { type: "plain_text_input", value: null } },
      BvuBP: { ref_url_input: { type: "plain_text_input", value: null } },
      aZxg: { notes_input: { type: "plain_text_input", value: null } },
    },
  },
  response_url:
    "https://hooks.slack.com/actions/T023LRP68AU/5169866150336/Psy0TmQkSjqDQoYH80X4b2xS",
  actions: [
    {
      action_id: "YkZIQ",
      block_id: "actionblock789",
      text: { type: "plain_text", text: "Submit", emoji: true },
      value: "submit",
      style: "primary",
      type: "button",
      action_ts: "1682043913.561467",
    },
  ],
};

export default router;
