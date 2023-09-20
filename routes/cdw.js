import { Router } from "express";
import axios from "axios";
import { ClientCredentials } from "simple-oauth2";
import { cdwBasicAuth } from "../services/basicAuth.js";
import { addNewDocument } from "./orders.js";
import { checkJwt } from "../services/auth0.js";
import { cdwUpdateOrder } from "./orders.js";
import { autoAddNewSerialNumber } from "./inventory.js";
import { order_to_inventory } from "../utils/mappings/inventory.js";
import { createAftershipCSV } from "../services/aftership.js";
import { sendAftershipCSV } from "../services/sendEmail.js";

const router = Router();

const cdw_config = {
  client: {
    id: "OXyKcWEtuePLxIqmBc6OPwbX6BVm5bb0",
    secret: "IcKAzU3PYWFfrjoQ",
  },
  auth: {
    tokenHost: "https://pre-prod-apihub.cdw.com",
    tokenPath: "/v2/oauth/ClientCredentialAcessToken",
  },
};

const client_title_case = {
  ALMA: "Alma",
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
    };

    if (req.body.records) {
      req.body.records.forEach((record) => {
        if (record.cdw_item_type === "Notebook/Mobile Devices") {
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
        }
      });
    } else {
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
    }

    const addresult = await addNewDocument("CDW", req.body);

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

      const updateInvRes = await autoAddNewSerialNumber(
        client_title_case[update_order_obj.client],
        updateRes.item_name,
        {
          sn: update_order_obj.serial_number,
          status: "Shipping",
          condition: "New",
          first_name: updateRes.first_name,
          last_name: updateRes.last_name,
          full_name: updateRes.full_name,
          supplier: "CDW",
          supplier_order_no: update_order_obj.supplier_order_no,
        }
      );
    } else {
      console.log("/cdw/order => Error in updating order.");
    }
    if (updateRes !== "") {
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
          sendAftershipCSV(base64csv, orderNum);
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

router.post("/placeorder/:supplier", async (req, res) => {
  const { appr_number, cdw_part_number, unit_price, customer_id } = req.body;
  const client = new ClientCredentials(cdw_config);
  const order_body = {
    orderHeader: {
      customerId: customer_id,
      orderDate: "2023-09-07",
      currency: "USD",
      orderAmount: "100",
      orderId: appr_number,
      shipTo: {
        firstName: "Andy",
        lastName: "Guo",
        address1: "1 Lewis St",
        street: "1 Lewis St",
        city: "Hartford",
        state: "CT",
        postalCode: "06103",
        country: "USA",
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
    console.log("access token ::::::::::::: ", accessToken.token);

    const options = {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Authorization:
          accessToken.token.token_type + " " + accessToken.token.access_token,
      },
      url: "https://pre-prod-apihub.cdw.com/b2b/customer/inbapi/v1/CustomerOrder",
      data: JSON.stringify(order_body),
    };

    const order_resp = await axios.request(options);

    console.log("order resp >>>>>>>>>>> ", order_resp);
  } catch (e) {
    console.log("Error in getting access token", e);
  }

  res.send("Hello World");
});

export default router;
