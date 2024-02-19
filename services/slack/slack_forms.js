import { inventory } from "../../routes/inventory.js";

const slack_channel_ids = {
  C052PJMB8G0: "Alma",
};

export async function slackMarketplaceRequestForm(channel_id) {
  const client = slack_channel_ids[channel_id]
    ? slack_channel_ids[channel_id]
    : "public";
  const marketplace_items = await inventory.getAll("MarketplaceInventory");
  let available_items = [];

  marketplace_items.forEach((market) => {
    if (market.client === client) {
      if (market.type !== "accessories") {
        market.brands.forEach((brand) => {
          brand.types.forEach((line) => {
            line.specs.forEach((spec) => {
              const item_option = JSON.stringify(
                "[" +
                  brand.brand +
                  "] " +
                  line.type.replace('"', "") +
                  ": " +
                  spec.spec
              );
              available_items.push({
                text: {
                  type: "plain_text",
                  text: item_option,
                  emoji: true,
                },
                value: item_option,
              });
            });
          });
        });
      }
    }
  });
  console.log(
    "slackMarketplaceRequestForm() => Available items:",
    available_items
  );
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
          options: available_items,
          action_id: "static_select-action",
        },
        label: {
          type: "plain_text",
          text: "Items",
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

  return response;
}

/**
 *   const response = {
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
          type: "plain_text_input",
          action_id: "client_input",
          min_length: 1,
        },
        label: {
          type: "plain_text",
          text: "Client",
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
          options: [
            {
              text: {
                type: "plain_text",
                text: "*this is plain_text text*",
                emoji: true,
              },
              value: "value-0",
            },
            {
              text: {
                type: "plain_text",
                text: "*this is plain_text text*",
                emoji: true,
              },
              value: "value-1",
            },
            {
              text: {
                type: "plain_text",
                text: "*this is plain_text text*",
                emoji: true,
              },
              value: "value-2",
            },
          ],
          action_id: "static_select-action",
        },
        label: {
          type: "plain_text",
          text: "Items",
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
          action_id: "item_color_input",
          min_length: 1,
        },
        label: {
          type: "plain_text",
          text: "Item Color",
          emoji: true,
        },
      },
      {
        type: "input",
        element: {
          type: "plain_text_input",
          action_id: "item_quantity_input",
          min_length: 1,
        },
        label: {
          type: "plain_text",
          text: "Item Quantity",
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
 */
