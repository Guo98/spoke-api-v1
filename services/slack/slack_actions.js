import axios from "axios";

export async function handleSlackAction(payload, resp_url) {
  console.log(`handleSlackAction() => Starting function:`, payload);
  let response = {
    response_type: "in_channel",
    text: `Thank you for your request <@${userId}>!\n`,
    mrkdwn: true,
  };
  if (payload.actions[0].type !== "static_select") {
    const inputKeys = [
      { key: "client_input", new_key: "client", field_name: "Client" },
      {
        key: "item_name_input",
        new_key: "device_type",
        field_name: "Item Name",
      },
      {
        key: "item_color_input",
        new_key: "color",
        field_name: "Item Color",
      },
      {
        key: "item_quantity_input",
        new_key: "quantity",
        field_name: "Item Quantity",
      },
      {
        key: "req_specs_input",
        new_key: "specs",
        field_name: "Required Specs",
      },
      {
        key: "recipient_name_input",
        new_key: "recipient_name",
        field_name: "Recipient Name",
      },
      {
        key: "recipient_addr_input",
        new_key: "address",
        field_name: "Recipient Address",
      },
      {
        key: "recipient_email_input",
        new_key: "email",
        field_name: "Recipient Email",
      },
      {
        key: "recipient_pn_input",
        new_key: "phone_number",
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

      orderObj.date = new Date().toLocaleDateString("en-US");
      orderObj.notes = { device: orderObj.notes };

      await addMarketplaceOrder(orderObj);
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
