import { inventory } from "../../routes/inventory.js";
import { slack_channel_ids, recipient_form_inputs } from "./slack_mappings.js";

export async function slackMarketplaceRequestForm(channel_id) {
  const client = slack_channel_ids[channel_id]
    ? slack_channel_ids[channel_id]
    : "public";
  const marketplace_items = await inventory.getAll("MarketplaceInventory");
  let available_items = [];

  marketplace_items.forEach((market, m_index) => {
    if (market.client === client) {
      if (market.type !== "accessories") {
        market.brands.forEach((brand, b_index) => {
          brand.types.forEach((line, l_index) => {
            let option_group = {
              label: {
                type: "plain_text",
                text: "[" + brand.brand + "] " + line.type,
              },
              options: [],
            };
            line.specs.forEach((spec, s_index) => {
              option_group.options.push({
                text: {
                  type: "plain_text",
                  text: spec.spec.replaceAll(",", " |"),
                },
                value: `${m_index}:${b_index}:${l_index}:${s_index}`,
              });
            });
            if (line.specs.length > 0) {
              available_items.push(option_group);
            }
          });
        });
      } else {
        let option_group = {
          label: {
            type: "plain_text",
            text: "Accessories",
          },
          options: [],
        };
        market.items.forEach((item, i_index) => {
          option_group.options.push({
            text: {
              type: "plain_text",
              text: item.name,
            },
            value: `${m_index}:${i_index}`,
          });
        });
      }
    }
  });

  const response = {
    response_type: "in_channel",
    channel: channel_id,
    text: "New Marketplace Request",
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
          type: "static_select",
          placeholder: {
            type: "plain_text",
            text: "Select an item",
            emoji: true,
          },
          option_groups: available_items,
          action_id: "static_select-action",
        },
        label: {
          type: "plain_text",
          text: "Items",
          emoji: true,
        },
      },
      ...recipient_form_inputs,
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
            value: "submit_request",
          },
          {
            type: "button",
            text: {
              type: "plain_text",
              text: "Cancel",
            },
            value: "cancel",
          },
        ],
      },
    ],
  };

  return response;
}

export async function slackReturnForm(channel_id) {
  const client = slack_channel_ids[channel_id]
    ? slack_channel_ids[channel_id]
    : "public";

  const response = {
    response_type: "in_channel",
    channel: channel_id,
    text: "Return Request",
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: "Start a return",
          emoji: true,
        },
      },
      {
        type: "input",
        element: {
          type: "static_select",
          placeholder: {
            type: "plain_text",
            text: "Select a return type",
            emoji: true,
          },
          options: [
            {
              text: {
                type: "plain_text",
                text: "Returning",
                emoji: true,
              },
              value: "Returning",
            },
            {
              text: {
                type: "plain_text",
                text: "Offboarding",
                emoji: true,
              },
              value: "Offboarding",
            },
          ],
          action_id: "select_return_type",
        },
        label: {
          type: "plain_text",
          text: "Return Type",
          emoji: true,
        },
      },
      {
        type: "input",
        element: {
          type: "plain_text_input",
          action_id: "return_device_type_input",
        },
        label: {
          type: "plain_text",
          text: "Return Device Type",
          emoji: true,
        },
      },
      {
        type: "input",
        element: {
          type: "plain_text_input",
          action_id: "condition_input",
        },
        label: {
          type: "plain_text",
          text: "Return Device Condition",
          emoji: true,
        },
      },
      {
        type: "input",
        element: {
          type: "plain_text_input",
          action_id: "activation_key_input",
        },
        label: {
          type: "plain_text",
          text: "Activation Key",
          emoji: true,
        },
      },
      ...recipient_form_inputs,
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
            value: "submit_return",
          },
          {
            type: "button",
            text: {
              type: "plain_text",
              text: "Cancel",
            },
            value: "cancel",
          },
        ],
      },
    ],
  };

  return response;
}
