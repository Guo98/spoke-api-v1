import { suppliers } from "./constants.js";
import { createRecord } from "../services/airtable.js";

function mapLineItems(customerInfo) {
  console.log("order in here ::::: ", customerInfo);
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
      console.log("item name ??????? ", item.name);
      if (suppliers[item.name]) {
        if (
          typeof suppliers[item.name] === "object" &&
          suppliers[item.name] !== null
        ) {
          Object.assign(item, suppliers[item.name]);
          if (!customerInfo.client)
            customerInfo.client = suppliers[item.name].company;
          createRecord(customerInfo, item);
        } else {
          item.supplier = suppliers[item.name];
        }
      } else {
        item.supplier = "unknown";
      }
    });
  }
  console.log("updated customer info ::::: ", customerInfo);
  return customerInfo;
}

export { mapLineItems };
