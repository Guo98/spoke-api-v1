export default function determineTrackingNumber(message, orderNum) {
  const trackingPatterns = {
    UPS: /\b1Z[A-HJ-NP-Z0-9]{16}\b/g,
    FedEx: /\b(\d{12}|\d{15})\b/g,
  };
  if (message.match(trackingPatterns.FedEx)) {
    const matches = message.match(trackingPatterns.FedEx);
    console.log(
      `determineTrackingNumber(${orderNum}) => Matched to FedEx: `,
      matches
    );
    if (matches.length > 0) {
      return {
        courier: "FedEx",
        tracking_number: matches[0],
      };
    }
  } else if (message.match(trackingPatterns.UPS)) {
    const matches = message.match(trackingPatterns.UPS);
    console.log(
      `determineTrackingNumber(${orderNum}) => Matched to UPS: `,
      matches
    );
    if (matches.length > 0) {
      return {
        courier: "UPS",
        tracking_number: matches[0],
      };
    }
  } else {
    return undefined;
  }
}
