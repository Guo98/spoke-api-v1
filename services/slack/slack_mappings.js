export const slack_channel_ids = {
  C052PJMB8G0: "Alma",
};

export const slack_team_ids = {
  T023LRP68AU: "public",
  T06LTS7RPBJ: "Alma",
};

export const slack_clients = ["Alma", "FLYR", "Bowery", "Sona", "Mock"];

const recipient_keys = [
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

export const return_input_keys = [
  {
    key: "select_return_type",
    new_key: "return_type",
    field_name: "Return Type",
  },
  {
    key: "return_device_type_input",
    new_key: "return_device_type",
    field_name: "Return Device Type",
  },
  {
    key: "condition_input",
    new_key: "return_condition",
    field_name: "Return Device Condition",
  },
  {
    key: "activation_key_input",
    new_key: "activation_key",
    field_name: "Activation Key",
  },
  ...recipient_keys,
];

export const marketplace_input_keys = [
  { key: "static_select-action", new_key: "item", field_name: "Items" },
  {
    key: "return-box-checkbox",
    new_key: "return_box",
    field_name: "Inlude Return Box",
  },
  ...recipient_keys,
  {
    key: "static_select_shipping",
    new_key: "shipping",
    field_name: "Shipping",
  },
];

export const recipient_form_inputs = [
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
      action_id: "notes_input",
    },
    label: {
      type: "plain_text",
      text: "Notes",
      emoji: true,
    },
  },
];
