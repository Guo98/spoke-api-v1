import { orders } from "../../routes/orders.js";

export async function getOrderInfo(client, order_no, channel_id) {
  const response = {
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
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Name:* ${order.full_name}\n\n*Order Items*`,
        },
      },
      {
        type: "divider",
      },
    ];

    order.items.forEach((item) => {
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
              ? `*Tracking Number*: ${track_num} - ${tracking_link}`
              : ""
          }`,
        },
      });
    });
  }

  return response;
}
