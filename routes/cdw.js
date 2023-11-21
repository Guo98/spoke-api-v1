import { Router } from "express";
import axios from "axios";
import { ClientCredentials } from "simple-oauth2";
import { cdwBasicAuth } from "../services/basicAuth.js";
import { addNewDocument } from "./orders.js";
import { checkJwt } from "../services/auth0.js";
import { cdwUpdateOrder } from "./orders.js";
import { autoAddNewSerialNumber } from "./inventory.js";
import { createAftershipCSV } from "../services/aftership.js";
import { sendAftershipCSV } from "../services/sendEmail.js";

const router = Router();

const cdw_config = {
  client: {
    id: process.env.CDW_API_KEY,
    secret: process.env.CDW_API_SECRET,
  },
  auth: {
    tokenHost: process.env.CDW_TOKEN_HOST,
    tokenPath: process.env.CDW_TOKEN_PATH,
  },
};

const client_title_case = {
  ALMA: "Alma",
  "AUTOMOX INC": "Automox",
};

const cdw_carrier = {
  UPSN: "UPS",
  RPSI: "FedEx",
};

router.post("/cdw/order", async (req, res) => {
  console.log("/cdw/order => Starting route.");
  if (
    !req.headers.authorization ||
    req.headers.authorization.indexOf("Basic") === -1
  ) {
    console.log("/cdw/order => Unauthorized (Missing auth).");
    res.status(401).json({ status: "Unauthorized" });
  }

  const isAuthenticated = await cdwBasicAuth(req.headers.authorization);

  if (isAuthenticated) {
    console.log("/cdw/order => Route authenticated.");
    const { date } = req.body;

    let update_order_obj = {
      client: "",
      order_no: "",
      serial_number: "",
      tracking_number: "",
      part_number: "",
      courier: "",
      supplier_order_no: "",
      price: "",
      purchase_date: "",
    };

    if (req.body.records) {
      console.log("/cdw/order => Mutliple records sent.");
      req.body.records.forEach((record) => {
        if (record.cdw_item_type === "Notebook/Mobile Devices") {
          console.log("/cdw/order => Found laptop order in multiple records.");
          update_order_obj.client = record.po_customer_name;
          update_order_obj.order_no = record.po_number;
          update_order_obj.serial_number = record.serial_number;
          update_order_obj.tracking_number = record.cdw_tracking_no;
          update_order_obj.part_number = record.cdw_part_no;
          if (cdw_carrier[record.cdw_shipping_carrier]) {
            update_order_obj.courier = cdw_carrier[record.cdw_shipping_carrier];
          } else {
            update_order_obj.courier = record.cdw_shipping_carrier;
          }
          update_order_obj.supplier_order_no = record.cdw_order_no;
          update_order_obj.price = record.purchase_price;
          update_order_obj.purchase_date = record.purchase_date;
        }
      });
    } else {
      if (req.body.cdw_item_type === "Notebook/Mobile Devices") {
        console.log("/cdw/order => Received a laptop order.");
        update_order_obj.client = req.body.po_customer_name;
        update_order_obj.order_no = req.body.po_number;
        update_order_obj.serial_number = req.body.serial_number;
        update_order_obj.tracking_number = req.body.cdw_tracking_no;
        update_order_obj.part_number = req.body.cdw_part_no;
        if (cdw_carrier[req.body.cdw_shipping_carrier]) {
          update_order_obj.courier = cdw_carrier[req.body.cdw_shipping_carrier];
        } else {
          update_order_obj.courier = req.body.cdw_shipping_carrier;
        }
        update_order_obj.supplier_order_no = req.body.cdw_order_no;
        update_order_obj.price = req.body.purchase_price;
        update_order_obj.purchase_date = req.body.purchase_date;
      }
    }

    console.log("/cdw/order => Adding request body to CDW container.");
    const addresult = await addNewDocument("CDW", req.body);
    console.log("/cdw/order => Added request body to CDW container.");

    console.log(
      "/cdw/order => Updating order " +
        update_order_obj.order_no +
        " with info from cdw."
    );
    const updateRes = await cdwUpdateOrder(
      client_title_case[update_order_obj.client],
      update_order_obj.order_no,
      update_order_obj.serial_number,
      update_order_obj.tracking_number,
      update_order_obj.part_number,
      update_order_obj.courier,
      date
    );
    console.log("/cdw/order => Update res here:", updateRes);
    // aftserhip

    if (updateRes !== "") {
      console.log("/cdw/order => Successfully updated order.");
      console.log(
        "/cdw/order => Adding serial number to inventory for part number:",
        update_order_obj.part_number
      );
      const updateInvRes = await autoAddNewSerialNumber(
        client_title_case[update_order_obj.client],
        update_order_obj.part_number,
        {
          sn: update_order_obj.serial_number,
          status: "Shipping",
          condition: "New",
          first_name: updateRes.first_name,
          last_name: updateRes.last_name,
          full_name: updateRes.full_name,
          supplier: "CDW",
          supplier_order_no: update_order_obj.supplier_order_no,
          price: update_order_obj.price,
          purchase_date: update_order_obj.purchase_date,
          user_history: [updateRes.full_name],
        }
      );
      console.log(
        "/cdw/order => Finished adding serial number to inventory.",
        updateInvRes
      );
    } else {
      console.log("/cdw/order => Error in updating order.");
    }
    if (updateRes && updateRes !== "") {
      console.log(
        `/cdw/order/${update_order_obj.order_no} => Starting sending aftership email steps.`
      );
      let aftershipArray = [
        {
          email:
            client_title_case[update_order_obj.client] === "Alma"
              ? '"' + updateRes.email + ',it-team@helloalma.com"'
              : client_title_case[update_order_obj.client] === "Roivant"
              ? '"' + updateRes.email + ',ronald.estime@roivant.com"'
              : updateRes.email,
          title: updateRes.order_no,
          customer_name: updateRes.full_name,
          order_number: updateRes.item_name,
          tracking_number: update_order_obj.tracking_number,
        },
      ];

      if (aftershipArray.length > 0) {
        console.log(
          `/cdw/order/${update_order_obj.order_no} => Sending Aftership CSV file.`
        );
        const base64csv = createAftershipCSV(aftershipArray);
        try {
          await sendAftershipCSV(base64csv, updateRes.order_no);
          console.log(
            `/cdw/order/${update_order_obj.order_no} => Successfully finished sendAftershipCSV().`
          );
        } catch (e) {
          console.log(
            `/cdw/order/${update_order_obj.order_no} => Error in sendAftershipCSV() function: ${e}`
          );
        }
      }
    }

    console.log("/cdw/order => Finished updating CDW order.");
    if (!res.headersSent) res.send("Hello World");
  } else {
    res.status(401).json({ status: "Unauthorized" });
  }
  console.log("/cdw/order => Finished route.");
});

router.post("/placeorder/:supplier", checkJwt, async (req, res) => {
  const {
    order_number,
    cdw_part_number,
    unit_price,
    customer_id,
    customer_addr,
    order_client,
    first_name,
    last_name,
    id,
    full_name_key,
  } = req.body;
  const { supplier } = req.params;
  console.log(`/placeorder/${supplier} => Starting path.`);
  const client = new ClientCredentials(cdw_config);

  let todays_date = new Date();
  todays_date = todays_date.toISOString().split("T")[0];

  const order_body = {
    orderHeader: {
      customerId: customer_id,
      orderDate: todays_date,
      currency: "USD",
      orderAmount: unit_price,
      orderId: order_number,
      shipTo: {
        firstName: first_name,
        lastName: last_name,
        address1: "ALMA Withspoke",
        street: customer_addr.addressLine,
        city: customer_addr.city,
        state: customer_addr.subdivision,
        postalCode: customer_addr.postalCode,
        country: "US",
      },
    },
    orderLines: [
      {
        lineNumber: "1",
        quantity: 1,
        unitPrice: unit_price,
        uom: "EA",
        cdwPartNumber: cdw_part_number,
      },
    ],
  };
  try {
    const accessToken = await client.getToken();
    console.log(`/placeorder/${supplier} => Successfully got token.`);
    const options = {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Authorization:
          accessToken.token.token_type + " " + accessToken.token.access_token,
      },
      url: process.env.CDW_TOKEN_HOST + "/b2b/customer/inbapi/v1/CustomerOrder",
      data: order_body,
    };

    console.log(
      `/placeorder/${supplier} => Passing through options: `,
      options
    );

    const order_resp = await axios.request(options);

    if (order_resp.data?.statusCode === "RECEIVED") {
      console.log(
        `/placeorder/${supplier} => Successfully placed order: `,
        order_resp.data
      );
      res.json({
        status: "Successful",
        data: { order_ref: order_resp.data.orderLines[0].CDWOrderReference },
      });
    } else {
      console.log(
        `/placeorder/${supplier} => No RECEIVED status in order response: `,
        order_resp.data
      );
      res.status(500).json({ status: "Error" });
    }
    if (!res.headersSent) res.json({ status: "Successful" });
  } catch (e) {
    console.log(
      `/placeorder/${supplier} => Error in getting access token: `,
      e
    );
    res.status(500).json({ status: "Error" });
  }

  console.log(`/placeorder/${supplier} => Finished path.`);
});

export default router;
