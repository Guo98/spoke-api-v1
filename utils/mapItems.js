import { suppliers, euCodes } from "./constants.js";
import { createYubikeyShipment } from "./yubikey.js";
// import { createRecord } from "../services/airtable.js";

function determineFLYRRegion(country) {
  if (country === "USA") {
    return "FLYR USA";
  } else if (country === "POL") {
    return "FLYR Poland";
  } else if (euCodes.indexOf(country) > -1) {
    return "FLYR EU";
  } else {
    return "FLYR Misc";
  }
}

function determineFloEntity(country) {
  if (country === "GBR") {
    return "United Kingdom";
  } else if (country === "NLD") {
    return "Netherlands";
  } else if (country === "LTU") {
    return "Lithuania";
  } else {
    return "";
  }
}

async function mapLineItems(customerInfo) {
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
        if (customerInfo?.address?.country) {
          customerInfo.entity = determineFLYRRegion(
            customerInfo?.address?.country
          );
        }
        break;
      case "bowery":
        customerInfo.client = "Bowery";
        break;
      case "hiddenroad":
        customerInfo.client = "Hidden Road";
        break;
      default:
        break;
    }
  }
  if (customerInfo?.items.length > 0) {
    for (const item of customerInfo.items) {
      if (suppliers[item.name]) {
        if (item.name === "Offboarding" || item.name === "Returning") {
          item.supplier = suppliers[item.name];
          customerInfo.client = customerInfo.note;

          customerInfo.items.push({
            name: item.name + " - (Return Box)",
            price: 0,
            variant: [],
            quantity: 1,
            supplier: "CTS",
          });
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
          lowerCaseName.indexOf("chromebook") > -1 ||
          lowerCaseName.indexOf("xps") > -1 ||
          lowerCaseName.indexOf("precision") > -1 ||
          lowerCaseName.indexOf("latitude") > -1
        ) {
          item.type = "laptop";
        }
      }
      item.tracking_number = "";
      item.delivery_company = "";
      if (item.name.toLowerCase().indexOf("pribas eu") > -1) {
        customerInfo.entity = "Pribas EU";
        customerInfo.client = "FLYR";
      } else if (item.name.toLowerCase().indexOf("flyr") > -1) {
        customerInfo.client = "FLYR";
        if (customerInfo?.address?.country) {
          customerInfo.entity = determineFLYRRegion(
            customerInfo?.address?.country
          );
        }
      } else if (item.name.toLowerCase().indexOf("bowery") > -1) {
        customerInfo.client = "Bowery";
      } else if (item.name.toLowerCase().indexOf("nursedash") > -1) {
        customerInfo.client = "NurseDash";
      } else if (item.name.toLowerCase().indexOf("alma") > -1) {
        customerInfo.client = "Alma";
      } else if (item.name.toLowerCase().indexOf("automox") > -1) {
        customerInfo.client = "Automox";
      } else if (item.name.toLowerCase().indexOf("flo") > -1) {
        customerInfo.client = "Flo Health";
        if (customerInfo?.address?.country) {
          customerInfo.entity = determineFloEntity(
            customerInfo?.address?.country
          );
        }
      } else if (item.name.toLowerCase().indexOf("roivant") > -1) {
        customerInfo.client = "Roivant";
      } else if (item.name.toLowerCase().indexOf("sona") > -1) {
        customerInfo.client = "Sona";
      }

      // if (item.name.toLowerCase().includes("yubikey 5c")) {
      //   const yubikeyBody = {
      //     firstname: customerInfo.firstName,
      //     lastname: customerInfo.lastName,
      //     email: customerInfo.email,
      //     phone_number: customerInfo.phone,
      //     address: customerInfo.address,
      //     quantity: item.quantity,
      //   };
      //   try {
      //     console.log(
      //       "mapLineItems() => Creating yubikey shipment:",
      //       yubikeyBody
      //     );
      //     const shipmentId = await createYubikeyShipment(yubikeyBody);

      //     if (shipmentId !== "") {
      //       item.shipment_id = shipmentId;
      //     }
      //     console.log("mapLineItems() => Finished creating yubikey shipment.");
      //   } catch (e) {
      //     console.log(
      //       "mapLineItems() => Error in creating yubikey shipment for: ",
      //       yubikeyBody
      //     );
      //     console.log(
      //       "mapLineItems() => Error in creating yubikey shipment: ",
      //       e
      //     );
      //   }
      // }
    }
  }
  customerInfo.full_name =
    customerInfo?.firstName + " " + customerInfo?.lastName;
  return customerInfo;
}

export { mapLineItems };

/**
 *   address.addressLine +
          ", " +
          address.city +
          ", " +
          address.subdivision +
          " " +
          address.postalCode +
          ", " +
          address.country
 */
