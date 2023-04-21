import { Router } from "express";
import axios from "axios";
import { sendSlackRequestEmail } from "../services/sendEmail.js";

const router = Router();

router.post("/slackorder", async (req, res) => {
  console.log("/slackorder => Starting route.");
  try {
    const response = {
      response_type: "in_channel",
      channel: req.body.channel_id,
      text: "Hello, World!",
      blocks: [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: "New request",
            emoji: true,
          },
        },
        {
          type: "input",
          element: {
            type: "plain_text_input",
            action_id: "item_name_input",
            min_length: 1,
          },
          label: {
            type: "plain_text",
            text: "Item Name",
            emoji: true,
          },
        },
        {
          type: "input",
          element: {
            type: "plain_text_input",
            action_id: "req_specs_input",
            min_length: 1,
          },
          label: {
            type: "plain_text",
            text: "Requested Specs",
            emoji: true,
          },
        },
        {
          type: "input",
          element: {
            type: "plain_text_input",
            action_id: "recipient_name_input",
            min_length: 1,
          },
          label: {
            type: "plain_text",
            text: "Recipient Name",
            emoji: true,
          },
        },
        {
          type: "input",
          element: {
            type: "plain_text_input",
            action_id: "recipient_addr_input",
            min_length: 1,
          },
          label: {
            type: "plain_text",
            text: "Recipient Address",
            emoji: true,
          },
        },
        {
          type: "input",
          element: {
            type: "plain_text_input",
            action_id: "recipient_email_input",
            min_length: 1,
          },
          label: {
            type: "plain_text",
            text: "Recipient Email",
            emoji: true,
          },
        },
        {
          type: "input",
          element: {
            type: "plain_text_input",
            action_id: "recipient_pn_input",
            min_length: 1,
          },
          label: {
            type: "plain_text",
            text: "Recipient Phone Number",
            emoji: true,
          },
        },
        {
          type: "input",
          element: {
            type: "plain_text_input",
            action_id: "ref_url_input",
          },
          label: {
            type: "plain_text",
            text: "Reference URL",
            emoji: true,
          },
        },
        {
          type: "input",
          element: {
            type: "plain_text_input",
            action_id: "notes_input",
          },
          label: {
            type: "plain_text",
            text: "Notes",
            emoji: true,
          },
        },
        {
          type: "actions",
          block_id: "actionblock789",
          elements: [
            {
              type: "button",
              text: {
                type: "plain_text",
                text: "Submit",
              },
              style: "primary",
              value: "submit",
            },
            {
              type: "button",
              text: {
                type: "plain_text",
                text: "Close",
              },
              value: "close",
            },
          ],
        },
      ],
    };

    return res.json(response);
  } catch (e) {
    return res.status(500).send("Ooops");
  }
});

router.post("/slackactions", async (req, res) => {
  console.log("/slackactions => req.body", req.body.payload);
  const payload = JSON.parse(req.body.payload);
  const resp_url = payload.response_url;
  const userId = payload.user.id;
  let response = {
    response_type: "in_channel",
    text: `Thank you for your request <@${userId}>!\n`,
    mrkdwn: true,
  };

  const inputKeys = [
    { key: "item_name_input", new_key: "item_name", field_name: "Item Name" },
    {
      key: "req_specs_input",
      new_key: "req_specs",
      field_name: "Required Specs",
    },
    {
      key: "recipient_name_input",
      new_key: "recipient_name",
      field_name: "Recipient Name",
    },
    {
      key: "recipient_addr_input",
      new_key: "recipient_addr",
      field_name: "Recipient Address",
    },
    {
      key: "recipient_email_input",
      new_key: "recipient_email",
      field_name: "Recipient Email",
    },
    {
      key: "recipient_pn_input",
      new_key: "recipient_pn",
      field_name: "Recipient Phone Number",
    },
    { key: "ref_url_input", new_key: "ref_url", field_name: "Reference URL" },
    { key: "notes_input", new_key: "notes", field_name: "Notes" },
  ];
  let orderObj = {};
  if (payload.actions[0].value !== "submit") {
    response.text = "Requested canceled.";
  } else {
    Object.keys(payload.state.values).forEach((objKey, index) => {
      const input = payload.state.values[objKey];
      const inputMapping = inputKeys[index];
      orderObj[inputMapping.new_key] = input[inputMapping.key].value;

      response.text =
        response.text +
        `*${inputMapping.field_name}:*\n${input[inputMapping.key].value}\n`;
      console.log("/slackactions => orderobj: ", JSON.stringify(orderObj));
    });
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

  res.send("Ok");
  if (payload.actions[0].value === "submit") {
    await sendSlackRequestEmail(orderObj);
  }
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
