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

      const delResult = await orderItemsDelivery(db, order, client, ups_token);

      if (delResult.status === 200 && delResult.data !== "No Change") {
        order = { ...delResult.data };
      } else if (
        delResult.status === 200 &&
        delResult.fedex_items &&
        delResult.fedex_items.length > 0
      ) {
        fedex_items = [...fedex_items, ...delResult.fedex_items];
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

      const delResult = await orderItemsDelivery(
        db,
        order,
        "Received",
        ups_token
      );
      if (delResult.status === 200 && delResult.data !== "No Change") {
        order = { ...delResult.data };
      } else if (
        delResult.status === 200 &&
        delResult.fedex_items &&
        delResult.fedex_items.length > 0
      ) {
        fedex_items = [...fedex_items, ...delResult.fedex_items];
      }
    }
    if (fedex_items.length > 0) {
      await updateFedexStatus(fedex_token, fedex_items.splice(0, 30), db);
    }
    console.log(
      `getOrders(${client}) => Finished getting all in progress orders for company: ${client}`
    );
    res.json({ data: { in_progress: inProgRes, completed: ordersRes } });

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

const orderItemsDelivery = async (db, order, containerId, ups_token) => {
  console.log(
    `orderItemDelivery(${order.client}) => Starting function:`,
    order.id
  );

  if (order.shipping_status !== "Completed") {
    let change = false;
    let fedex_items = [];
    let index = 0;

    for await (const item of order.items) {
      if (item.courier) {
        if (item.courier.toLowerCase() === "fedex") {
          if (
            item.tracking_number?.length > 0 &&
            item.delivery_status !== "Delivered"
          ) {
            fedex_items.push({
              order_no: order.orderNo,
              full_name: order.full_name,
              item_index: index,
              tracking_no: item.tracking_number[0],
              id: order.id,
              items: order.items,
              containerId,
            });
          }
        } else if (item.courier.toLowerCase() === "ups") {
          if (
            item.tracking_number?.length > 0 &&
            item.delivery_status !== "Delivered"
          ) {
            const deliveryResult = await trackUPSPackage(
              item.tracking_number[0].trim(),
              ups_token
            );
            if (deliveryResult.status === 200) {
              change = true;
              item.delivery_status = deliveryResult.data;
            }
          }
        }
      }
      if (item.name.toLowerCase().includes("yubikey 5c nfc (automox)")) {
        if (item.shipment_id) {
          const yubiShipping = await getYubikeyShipmentInfo(item.shipment_id);
          if (yubiShipping) {
            change = true;
            if (
              yubiShipping.tracking_number &&
              item.delivery_status !== "Delivered"
            ) {
              if (item.tracking_number === "") {
                item.tracking_number = [yubiShipping.tracking_number];
                item.courier = yubiShipping.courier;
                item.delivery_status = yubiShipping.delivery_description;
              } else if (
                item.delivery_status !== yubiShipping.delivery_description
              ) {
                item.delivery_status = yubiShipping.delivery_description;
              }
            } else {
              item.delivery_status = yubiShipping.delivery_description;
            }
          }
        }
      }

      index++;
    }

    if (change) {
      try {
        console.log(
          `orderItemDelivery(${order.client}) => Updating shipping status:`,
          order.id
        );
        const updateDelivery = await db.updateOrderByContainer(
          containerId,
          order.id,
          order.full_name,
          order.items
        );
        console.log(
          `orderItemDelivery(${order.client}) => Finished updating shipping status:`,
          order.id
        );
        return { status: 200, data: updateDelivery, fedex_items: fedex_items };
      } catch (e) {
        console.log(
          `orderItemDelivery(${order.client}) => Error in updating delivery status of order:`,
          order.id
        );
        return { status: 500, data: "Error" };
      }
    } else {
      return { status: 200, data: "No Change", fedex_items: fedex_items };
    }
  } else {
    return { status: 200, data: "No Change" };
  }
};

export { getOrders };
