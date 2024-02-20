export const slack_channel_ids = {
  C052PJMB8G0: "Alma",
};

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

export const marketplace_input_keys = [
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
    key: "serial_number_input",
    new_key: "return_sn",
    field_name: "Return Device Serial Number",
  },
  {
    key: "condition_input",
    new_key: "return_condition",
    field_name: "Return Device Condition",
  },
  ...recipient_keys,
];

export const return_input_keys = [
  { key: "static_select-action", new_key: "item", field_name: "Items" },
  ...recipient_keys,
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
