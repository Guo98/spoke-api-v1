function createMissingMappingRow(
  client,
  device_name,
  serial_no,
  name,
  order_no
) {
  const today_date = new Date();
  today_date.toLocaleString("en-US", { timeZone: "America/New_York" });

  return [
    {
      userEnteredValue: {
        stringValue:
          today_date.getMonth() +
          1 +
          "/" +
          today_date.getDate() +
          "/" +
          today_date.getFullYear(),
      },
    },
    {
      userEnteredValue: {
        stringValue: client,
      },
    },
    {
      userEnteredValue: {
        stringValue: device_name,
      },
    },
    {
      userEnteredValue: {
        stringValue: serial_no,
      },
    },
    {
      userEnteredValue: {
        stringValue: name,
      },
    },
    {
      userEnteredValue: {
        numberValue: order_no,
      },
    },
  ];
}

function createConsolidatedRow(
  orderNo,
  client,
  name,
  email,
  item,
  price,
  address,
  phone,
  note,
  variant,
  supplier,
  quantity
) {
  const todayDate = new Date();
  todayDate.toLocaleString("en-US", { timeZone: "America/New_York" });
  return [
    {
      userEnteredValue: {
        numberValue: orderNo,
      },
    },
    {
      userEnteredValue: {
        stringValue:
          todayDate.getMonth() +
          1 +
          "/" +
          todayDate.getDate() +
          "/" +
          todayDate.getFullYear(),
      },
    },
    {
      userEnteredValue: {
        stringValue: client,
      },
    },
    {
      userEnteredValue: {
        stringValue: name,
      },
    },
    {
      userEnteredValue: {
        stringValue: item,
      },
    },
    {
      userEnteredValue: {
        numberValue: quantity,
      },
    },
    {
      userEnteredValue: {
        numberValue: price,
      },
      userEnteredFormat: {
        numberFormat: { type: "CURRENCY" },
      },
    },
    {
      userEnteredValue: {
        stringValue: "",
      },
    },
    {
      userEnteredValue: {
        stringValue: "",
      },
    },
    {
      userEnteredValue: {
        stringValue: "",
      },
    },
    {
      userEnteredValue: {
        stringValue: "",
      },
    },
    {
      userEnteredValue: {
        stringValue:
          address.addressLine +
          ", " +
          address.city +
          ", " +
          address.subdivision +
          " " +
          address.postalCode +
          ", " +
          address.country,
      },
    },
    {
      userEnteredValue: {
        stringValue: email,
      },
    },
    {
      userEnteredValue: {
        stringValue: phone,
      },
    },
    {
      userEnteredValue: {
        stringValue: "",
      },
    },
    {
      userEnteredValue: {
        stringValue: note,
      },
    },
    {
      userEnteredValue: {
        stringValue: "Order Received",
      },
    },
    {
      userEnteredValue: {
        stringValue: variant?.length > 0 ? JSON.stringify(variant) : "",
      },
    },
    {
      userEnteredValue: {
        stringValue: supplier,
      },
    },
  ];
}

function createAdminDeploy(
  client,
  name,
  item,
  serial_number,
  address,
  shipping_opt,
  email,
  phone,
  note,
  requestor_email,
  warehouse,
  addons
) {
  const todayDate = new Date();
  todayDate.toLocaleString("en-US", { timeZone: "America/New_York" });
  return [
    {
      userEnteredValue: {
        stringValue: "",
      },
    },
    {
      userEnteredValue: {
        formulaValue: `=DATE(${todayDate.getFullYear()}, ${
          todayDate.getMonth() + 1
        }, ${todayDate.getDate()})`,
      },
    },
    {
      userEnteredValue: {
        stringValue: client,
      },
    },
    {
      userEnteredValue: {
        stringValue: name,
      },
    },
    {
      userEnteredValue: {
        stringValue: item,
      },
    },
    {
      userEnteredValue: {
        stringValue: serial_number,
      },
    },
    {
      userEnteredValue: {
        stringValue:
          address.al1 +
          ", " +
          (address.al2 !== "" ? address.al2 : "") +
          address.city +
          ", " +
          address.state +
          " " +
          address.postal_code +
          ", " +
          address.country_code,
      },
    },
    {
      userEnteredValue: {
        stringValue: shipping_opt,
      },
    },
    {
      userEnteredValue: {
        stringValue: email,
      },
    },
    {
      userEnteredValue: {
        stringValue: phone,
      },
    },
    {
      userEnteredValue: {
        stringValue: note,
      },
    },
    {
      userEnteredValue: {
        stringValue: requestor_email,
      },
    },
    {
      userEnteredValue: {
        stringValue: warehouse,
      },
    },
    {
      userEnteredValue: {
        stringValue: JSON.stringify(addons),
      },
    },
  ];
}

function createOffboardRow(
  order_no,
  client,
  recipient_name,
  recipient_email,
  item,
  type,
  shipping_address,
  phone_num,
  requestor_email,
  note,
  device_condition,
  activation_key = ""
) {
  const todayDate = new Date();
  todayDate.toLocaleString("en-US", { timeZone: "America/New_York" });
  return [
    {
      userEnteredValue: {
        numberValue: order_no,
      },
    },
    {
      userEnteredValue: {
        stringValue: "",
      },
    },
    {
      userEnteredValue: {
        formulaValue: `=DATE(${todayDate.getFullYear()}, ${
          todayDate.getMonth() + 1
        }, ${todayDate.getDate()})`,
      },
    },
    {
      userEnteredValue: {
        stringValue: client,
      },
    },
    {
      userEnteredValue: {
        stringValue: "Open",
      },
    },
    {
      userEnteredValue: {
        stringValue: recipient_name,
      },
    },
    {
      userEnteredValue: {
        stringValue: recipient_email,
      },
    },
    {
      userEnteredValue: {
        stringValue: item,
      },
    },
    {
      userEnteredValue: {
        stringValue: "",
      },
    },
    {
      userEnteredValue: {
        stringValue: "",
      },
    },
    {
      userEnteredValue: {
        stringValue: type,
      },
    },
    {
      userEnteredValue: {
        stringValue: "Ground",
      },
    },
    {
      userEnteredValue: {
        stringValue: shipping_address,
      },
    },
    {
      userEnteredValue: {
        stringValue: phone_num,
      },
    },
    {
      userEnteredValue: {
        stringValue: "",
      },
    },
    {
      userEnteredValue: {
        stringValue: "",
      },
    },
    {
      userEnteredValue: {
        stringValue: "",
      },
    },
    {
      userEnteredValue: {
        stringValue: "",
      },
    },
    {
      userEnteredValue: {
        stringValue: "",
      },
    },
    {
      userEnteredValue: {
        stringValue: "",
      },
    },
    {
      userEnteredValue: {
        stringValue: "",
      },
    },
    {
      userEnteredValue: {
        stringValue: "",
      },
    },
    {
      userEnteredValue: {
        stringValue: "",
      },
    },
    {
      userEnteredValue: {
        stringValue: requestor_email,
      },
    },
    {
      userEnteredValue: {
        stringValue: note,
      },
    },
    {
      userEnteredValue: {
        stringValue: device_condition,
      },
    },
    {
      userEnteredValue: {
        stringValue: activation_key,
      },
    },
  ];
}

export {
  createConsolidatedRow,
  createAdminDeploy,
  createOffboardRow,
  createMissingMappingRow,
};
