import { orders } from "../../routes/orders.js";

export async function getOrderInfo(client, order_no, channel_id) {
  const response = {
    response_type: "in_channel",
    channel: channel_id,
    text: "Order #" + order_no + "\n",
  };
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
        const order = received_orders[received_filter];
        response.text = response.text + `Name: ${order.full_name}`;
      } else {
        const client_orders = await orders.getAllOrders(
          client === "public" ? "Mock" : client
        );

        // console.log("client orders >>>>>>>>> ", client_orders);
        console.log("parsed int >>>>>>>>>>>>>> ", parseInt(order_no));

        const client_orders_filter = client_orders.findIndex((order) => {
          console.log(
            "checking order no ????????????? ",
            order.orderNo === parseInt(order_no)
          );
          return order.orderNo === parseInt(order_no);
        });

        console.log("client orders filter ==========>", client_orders_filter);
        if (client_orders_filter > -1) {
          const order = received_orders[received_filter];
          response.text = response.text + `Name: ${order.full_name}`;
        } else {
          response.text =
            response.text + "Sorry, couldn't retrieve order info.\n";
        }
      }
    } catch (e) {
      response.text = response.text + "Sorry, couldn't retrieve order info.\n";
    }
  }

  return response;
}
