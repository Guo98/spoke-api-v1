import axios from "axios";
import { addMarketplaceOrder } from "../../routes/orders.js";
import { slackRecipientForm } from "./slack_forms.js";

export async function handleSlackAction(payload, resp_url) {
  console.log(`handleSlackAction() => Starting function:`, payload);
  const userId = payload.user.id;
  let response = {
    response_type: "in_channel",
    text: `Thank you for your request <@${userId}>!\n`,
    mrkdwn: true,
  };

  if (
    payload.actions[0].type !== "static_select" &&
    payload.actions[0].type !== "external_select"
  ) {
    if (payload.actions[0].value === "cancel") {
      response.text = "Requested canceled.";
    } else if (payload.actions[0].value === "submit") {
      const inputKeys = [
        { key: "static_select-action", new_key: "item", field_name: "Items" },
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
        { key: "notes_input", new_key: "notes", field_name: "Notes" },
      ];

      let orderObj = {};

      Object.keys(payload.state.values).forEach((objKey, index) => {
        const input = payload.state.values[objKey];

        const inputMapping = inputKeys[index];
        let input_value = input[inputMapping.key].value;
        if (index === 0) {
          input_value = input[inputMapping.key].selected_option;
          console.log("input value :::::::::: ", input_value);
        }
        orderObj[inputMapping.new_key] = input_value;

        response.text =
          response.text + `*${inputMapping.field_name}:*\n${input_value}\n`;
        console.log("/slackactions => orderobj: ", JSON.stringify(orderObj));
      });

      orderObj.date = new Date().toLocaleDateString("en-US");
      orderObj.notes = { device: orderObj.notes };
      // await addMarketplaceOrder(orderObj);
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
