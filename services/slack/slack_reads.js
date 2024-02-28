import { orders } from "../../routes/orders.js";

export async function getOrderInfo(client, order_no, channel_id) {
  let response = {
    response_type: "in_channel",
    channel: channel_id,
    text: "Order #" + order_no + "\n",
  };
  let order = null;
  if (isNaN(order_no)) {
    response.text = "Please enter order number as just a number.";
  } else {
    try {
      const received_orders = await orders.getAllReceived();

      const received_filter = received_orders.findIndex(
        (order) =>
          order.orderNo === parseInt(order_no) && order.client === client
      );

      if (received_filter > -1) {
        order = received_orders[received_filter];
        //response.text = response.text + `Name: ${order.full_name}`;
      } else {
        const client_orders = await orders.getAllOrders(
          client === "public" ? "Mock" : client
        );

        const client_orders_filter = client_orders.findIndex(
          (order) => order.orderNo === parseInt(order_no)
        );

        if (client_orders_filter > -1) {
          order = client_orders[client_orders_filter];
          //response.text = response.text + `Name: ${order.full_name}`;
        } else {
          response.text =
            response.text + "Sorry, couldn't retrieve order info.\n";
        }
      }
    } catch (e) {
      response.text = response.text + "Sorry, couldn't retrieve order info.\n";
    }
  }

  if (order !== null) {
    response.blocks = [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: "*Order \\#*" + order_no,
          emoji: true,
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Name:* ${order.full_name}\n*Date Requested:* ${order.date}\n\n*Order Items*`,
        },
      },
      {
        type: "divider",
      },
    ];

    order.items.forEach((item, index) => {
      let tracking_link = "";
      let track_num = "";
      if (item.tracking_number !== "") {
        const courier = item.courier.toLowerCase();
        track_num = item.tracking_number[0];

        if (courier.includes("ups")) {
          tracking_link =
            "https://wwwapps.ups.com/tracking/tracking.cgi?tracknum=" +
            track_num;
        } else if (courier.includes("fedex")) {
          tracking_link =
            "https://www.fedex.com/fedextrack/?trknbr=" + track_num;
        } else if (courier.includes("usps")) {
          tracking_link =
            "https://tools.usps.com/go/TrackConfirmAction_input?strOrigTrackNum=" +
            track_num;
        } else if (courier.includes("dhl")) {
          tracking_link =
            "http://www.dhl.com/en/express/tracking.html?AWB=" +
            track_num +
            "&brand=DHL";
        }
      }
      response.blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*${item.name}*\n${
            track_num !== ""
              ? `*Tracking Number*: ${track_num}\n Tracking Link: ${tracking_link}`
              : ""
          }`,
        },
      });
      if (index !== order.items.length - 1) {
        response.blocks.push({
          type: "divider",
        });
      }
    });
  }

  return response;
}

function determineMissingReturn(order) {
  const return_box_index = order.items.findIndex((item) =>
    item.name.toLowerCase().includes("return box")
  );

  if (return_box_index > -1) {
    if (
      !order.items[return_box_index].delivery_status &&
      order.items[return_box_index - 1].delivery_status === "Delivered"
    ) {
      let return_blk = [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*Order Number:* ${order.orderNo}\n *Name:* ${
              order.full_name
            }\n *Date Requested:* ${order.date}\n ${
              order.items[return_box_index].date_reminder_sent
                ? `*Reminder Sent:* ${order.items[return_box_index].date_reminder_sent}\n`
                : "\n"
            }`,
          },
        },
        {
          type: "divider",
        },
      ];

      return return_blk;
    }
  }

  return [];
}

export async function getOutstandingReturns(client, channel_id) {
  let response = {
    response_type: "in_channel",
    channel: channel_id,
    text: "Outstanding Returns\n",
  };

  let outstanding_returns = [];

  try {
    const received_orders = await orders.getAllReceived();

    received_orders.forEach((order) => {
      if (order.client === client) {
        const return_blk = determineMissingReturn(order);

        if (return_blk.length > 0) {
          outstanding_returns = [...outstanding_returns, ...return_blk];
        }
      }
    });
  } catch (e) {
    console.log(
      `getOutstandingReturns(${client}) => Error in getting received orders:`,
      e
    );
  }

  try {
    const client_orders = await orders.getAllOrders(
      client === "public" ? "Mock" : client
    );

    client_orders.forEach((order) => {
      const return_blk = determineMissingReturn(order);

      if (return_blk.length > 0) {
        outstanding_returns = [...outstanding_returns, ...return_blk];
      }
    });
  } catch (e) {
    console.log(
      `getOutstandingReturns(${client}) => Error in getting client orders:`,
      e
    );
  }

  if (outstanding_returns.length > 0) {
    response.blocks = [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: "Outstanding Returns",
          emoji: true,
        },
      },
      {
        type: "divider",
      },
      ...outstanding_returns,
    ];
  } else {
    response.text = response.text + "No returns outstanding.";
  }

  return response;
}
