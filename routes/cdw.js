import { Router } from "express";
import axios from "axios";
import { ClientCredentials } from "simple-oauth2";
import { cdwBasicAuth } from "../services/basicAuth.js";
import { addNewDocument } from "./orders.js";
import { checkJwt } from "../services/auth0.js";
import { cdwUpdateOrder } from "./orders.js";
import { autoAddNewSerialNumber } from "./inventory.js";
import { order_to_inventory } from "../utils/mappings/inventory.js";

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
    const {
      po_customer_name,
      po_number,
      cdw_order_no,
      serial_number,
      cdw_tracking_no,
      cdw_shipping_carrier,
      cdw_part_no,
      date,
    } = req.body;

    const addresult = await addNewDocument("CDW", req.body);

    const updateRes = await cdwUpdateOrder(
      client_title_case[po_customer_name],
      po_number,
      serial_number,
      cdw_tracking_no,
      cdw_part_no,
      cdw_shipping_carrier,
      date
    );

    if (updateRes !== "") {
      console.log("/cdw/order => Successfully updated order.");

      const updateInvRes = await autoAddNewSerialNumber(
        client_title_case[po_customer_name],
        order_to_inventory[updateRes.item_name],
        {
          sn: serial_number,
          status: "Shipping",
          condition: "New",
          first_name: updateRes.first_name,
          last_name: updateRes.last_name,
          full_name: updateRes.full_name,
          supplier: "CDW",
          supplier_order_no: cdw_order_no,
        }
      );
    } else {
      console.log("/cdw/order => Error in updating order.");
    }

    console.log("/cdw/order => Finished updateing CDW order.");
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
