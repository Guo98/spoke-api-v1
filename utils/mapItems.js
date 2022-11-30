import { suppliers } from "./constants.js";
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
