import { suppliers, euCodes } from "./constants.js";
// import { createRecord } from "../services/airtable.js";

function mapLineItems(customerInfo) {
  if (customerInfo?.discount?.appliedCoupon) {
    switch (customerInfo.discount.appliedCoupon?.code) {
      case "intersectpower":
        customerInfo.client = "Intersect Power";
        break;
      case "smalldooradmin":
        customerInfo.client = "SmallDoor";
        break;
      case "nursedashadmin":
        customerInfo.client = "NurseDash";
        break;
      case "flyrlabs":
        customerInfo.client = "FLYR";
        if (customerInfo?.address?.country === "USA") {
          customerInfo.entity = "FLYR USA";
        } else if (customerInfo?.address?.country === "POL") {
          customerInfo.entity = "FLYR Poland";
        } else if (euCodes.indexOf(customerInfo?.address?.country) > -1) {
          customerInfo.entity = "FLYR EU";
        } else {
          customerInfo.entity = "FLYR Misc";
        }
        break;
      case "bowery":
        customerInfo.client = "Bowery";
        break;
      default:
        break;
    }
  }
  if (customerInfo?.items.length > 0) {
    customerInfo.items.forEach((item) => {
      if (suppliers[item.name]) {
        if (item.name === "Offboarding") {
          item.supplier = suppliers[item.name];
          customerInfo.client = customerInfo.note;
        } else if (
          typeof suppliers[item.name] === "object" &&
          suppliers[item.name] !== null
        ) {
          Object.assign(item, suppliers[item.name]);
          if (!customerInfo.client)
            customerInfo.client = suppliers[item.name].company;
        } else {
          item.supplier = suppliers[item.name];
        }
      } else {
        item.supplier = "unknown";
        const lowerCaseName = item.name.toLowerCase();
        if (
          lowerCaseName.indexOf("macbook") > -1 ||
          lowerCaseName.indexOf("lenovo") > -1 ||
          lowerCaseName.indexOf("asus") > -1 ||
          lowerCaseName.indexOf("chromebook") > -1
        ) {
          item.type = "laptop";
        }
      }
      item.tracking_number = "";
      item.delivery_company = "";
    });
  }
  customerInfo.full_name =
    customerInfo?.firstName + " " + customerInfo?.lastName;
  return customerInfo;
}

export { mapLineItems };
