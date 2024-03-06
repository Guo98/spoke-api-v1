import { getFedexToken, updateFedexStatus } from "../fedex.js";
import { getToken, trackUPSPackage } from "../ups.js";
import { getYubikeyShipmentInfo } from "../../utils/yubikey.js";
import { sendRollingNotification } from "../emails/offboard.js";

async function getOrders(db, client, entity, res) {
  let db_container = client;

  if (client === "public") {
    db_container = "Mock";
  }
  const querySpec = {
    query: entity
      ? "SELECT * FROM Received r WHERE r.client = @client AND r.entity = @entity"
      : "SELECT * FROM Received r WHERE r.client = @client",
    parameters: entity
      ? [
          {
            name: "@client",
            value: client === "public" ? "Public" : client,
          },
          {
            name: "@entity",
            value: entity,
          },
        ]
      : [
          {
            name: "@client",
            value: client === "public" ? "Public" : client,
          },
        ],
  };

  let fedex_token = "";
  const fedex_token_resp = await getFedexToken();

  if (fedex_token_resp.status === 200) {
    fedex_token =
      fedex_token_resp.data.token_type +
      " " +
      fedex_token_resp.data.access_token;
  }

  let ups_token = "";
  const ups_token_resp = await getToken();

  if (ups_token_resp.status === 200) {
    ups_token =
      ups_token_resp.data.token_type + " " + ups_token_resp.data.access_token;
  }

  try {
    console.log(
      `getOrders(${client}) => Getting all orders from container: ${db_container}`
    );
    let ordersRes = await db.getAllOrders(db_container);

    if (entity) {
      ordersRes = ordersRes.filter(
        (order) => order.entity === req.params.entity
      );
    }

    let fedex_items = [];

    for await (let order of ordersRes) {
      delete order._rid;
      delete order._self;
      delete order._etag;
      delete order._attachments;
      delete order._ts;

      const del_result = await orderItemsDelivery(db, order, client, ups_token);
      if (del_result.length > 0) {
        fedex_items = fedex_items.concat(del_result);
      }
    }
    console.log(
      `getOrders(${client}) => Finished getting all orders from container: ${db_container}`
    );

    console.log(
      `getOrders(${client}) => Getting all in progress orders for company: ${client}`
    );
    let inProgRes = await db.find(querySpec);
    for await (let order of inProgRes) {
      delete order._rid;
      delete order._self;
      delete order._etag;
      delete order._attachments;
      delete order._ts;

      const del_result = await orderItemsDelivery(
        db,
        order,
        "Received",
        ups_token
      );

      if (del_result.length > 0) {
        fedex_items = fedex_items.concat(del_result);
      }
    }
    if (fedex_items.length > 0) {
      await updateFedexStatus(fedex_token, fedex_items, db, client);
    }
    console.log(
      `getOrders(${client}) => Finished getting all in progress orders for company: ${client}`
    );

    let updt_orders_res = await db.getAllOrders(db_container);
    let updt_ip_res = await db.find(querySpec);
    if (entity) {
      updt_orders_res = updt_orders_res.filter(
        (order) => order.entity === req.params.entity
      );
      updt_ip_res = updt_ip_res.filter(
        (order) => order.entity === req.params.entity
      );
    }

    for await (let order of updt_orders_res) {
      delete order._rid;
      delete order._self;
      delete order._etag;
      delete order._attachments;
      delete order._ts;
    }

    for await (let order of updt_ip_res) {
      delete order._rid;
      delete order._self;
      delete order._etag;
      delete order._attachments;
      delete order._ts;
    }
    res.json({
      data: { in_progress: updt_ip_res, completed: updt_orders_res },
    });

    try {
      inProgRes.forEach(async (ip_order) => {
        const return_box_index = ip_order.items.findIndex((item) =>
          item.name.includes("Return Box")
        );

        if (return_box_index > -1) {
          if (!ip_order.items[return_box_index].delivery_status) {
            let rolling_deadline = new Date(ip_order.date);
            rolling_deadline.setDate(rolling_deadline.getDate() + 14);

            const today_date = new Date();

            if (
              !ip_order.items[return_box_index].date_reminder_sent &&
              ip_order.shipping_status !== "Completed" &&
              today_date.getTime() > rolling_deadline.getTime() &&
              ip_order.items[return_box_index].tracking_number !== "" &&
              ip_order.items[return_box_index - 1].delivery_status ===
                "Delivered"
            ) {
              const send_email = await sendRollingNotification(
                ip_order.client,
                ip_order.full_name,
                ip_order.email,
                ip_order.address.addressLine +
                  ", " +
                  ip_order.address.city +
                  ", " +
                  ip_order.address.subdivision +
                  " " +
                  ip_order.address.postalCode +
                  ", " +
                  ip_order.address.country
              );

              let updated_order = { ...ip_order };

              updated_order.items[return_box_index].date_reminder_sent =
                new Date().toISOString().split("T")[0];
              console.log(
                `getOrders(${client}) => Sent rolling notification for ${updated_order.orderNo}`
              );
              const update_date = await db.updateOrderByContainer(
                "Received",
                ip_order.id,
                ip_order.full_name,
                updated_order.items
              );
            }
          }
        }
      });

      ordersRes.forEach(async (ip_order) => {
        const return_box_index = ip_order.items.findIndex((item) =>
          item.name.includes("Return Box")
        );

        if (return_box_index > -1) {
          if (!ip_order.items[return_box_index].delivery_status) {
            let rolling_deadline = new Date(ip_order.date);
            rolling_deadline.setDate(rolling_deadline.getDate() + 14);

            const today_date = new Date();

            if (
              !ip_order.items[return_box_index].date_reminder_sent &&
              ip_order.shipping_status !== "Completed" &&
              today_date.getTime() > rolling_deadline.getTime() &&
              ip_order.items[return_box_index].tracking_number !== "" &&
              ip_order.items[return_box_index - 1].delivery_status ===
                "Delivered"
            ) {
              const send_email = await sendRollingNotification(
                ip_order.client,
                ip_order.full_name,
                ip_order.email,
                ip_order.address.addressLine +
                  ", " +
                  ip_order.address.city +
                  ", " +
                  ip_order.address.subdivision +
                  " " +
                  ip_order.address.postalCode +
                  ", " +
                  ip_order.address.country
              );

              let updated_order = { ...ip_order };

              updated_order.items[return_box_index].date_reminder_sent =
                new Date().toISOString().split("T")[0];
              console.log(
                `getOrders(${client}) => Sent rolling notification for ${updated_order.orderNo}`
              );
              const update_date = await db.updateOrderByContainer(
                db_container,
                ip_order.id,
                ip_order.full_name,
                updated_order.items
              );
            }
          }
        }
      });
    } catch (e) {
      console.log(
        `getOrders(${client}) => Error in checking for 2 weeks past notice orders:`,
        e
      );
    }
  } catch (e) {
    console.log(`getOrders(${client}) => Error in getting all orders: ${e}`);
    if (!res.headersSent)
      res.status(500).json({ status: "Error in getting info" });
  }
}

const updateUPSItem = async (
  db,
  ups_token,
  containerId,
  item_index,
  tracking_number,
  order
) => {
  try {
    const deliveryResult = await trackUPSPackage(
      tracking_number.trim(),
      ups_token
    );

    if (
      deliveryResult.status === 200 &&
      order.items[item_index].delivery_status !== deliveryResult.data
    ) {
      order.items[item_index].delivery_status = deliveryResult.data;
      const updateDelivery = await db.updateOrderByContainer(
        containerId,
        order.id,
        order.full_name,
        order.items
      );
    }
  } catch (e) {
    console.log(
      `updateUPSItem(${order.client}) => Error in updating ups delivery status:`,
      e
    );
  }
};

const orderItemsDelivery = async (db, order, containerId, ups_token) => {
  let check_items = [];
  if (order.shipping_status !== "Completed") {
    order.items.forEach(async (item, index) => {
      if (
        item.tracking_number?.length > 0 &&
        (!item.delivery_status || item.delivery_status !== "Delivered")
      ) {
        if (item.courier) {
          if (item.courier.toLowerCase() === "fedex") {
            if (
              item.name.toLowerCase().includes("return box") &&
              (!order.items[index - 1].delivery_status ||
                order.items[index - 1].delivery_status !== "Delivered")
            ) {
            } else {
              check_items.push({
                courier: "fedex",
                tracking_number: item.tracking_number[0],
                order_full_name: order.full_name,
                order_id: order.id,
                containerId,
                item_index: index,
                current_delivery_status: item.delivery_status,
                items: order.items,
              });
            }
          } else if (item.courier.toLowerCase() === "ups") {
            await updateUPSItem(
              db,
              ups_token,
              containerId,
              index,
              item.tracking_number[0],
              order
            );
          }
        }
      }
    });
  }

  return check_items;
};

export { getOrders };
