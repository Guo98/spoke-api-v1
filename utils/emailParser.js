import mockData from "./mock.json" assert { type: "json" };

function getTrackingNumber(emailBody) {
  const fedexRegEx = "";
  const upsRegEx = "";

  const decodedMessage = atob(
    mockData.data.replace(/-/g, "+").replace(/_/g, "/")
  );
  const fedexRegex = new RegExp("/trknbr=d{12}/");
  //"\b([0-9]{12}|100d{31}|d{15}|d{18}|96d{20}|96d{32})\b"
  // console.log("fedex regex ::::: ", fedexRegex.exec(decodedMessage));

  const dellTrack = /trknbr=(\d{12}|\d{15})/
    .exec(decodedMessage)[0]
    .split("=")[1];
  console.log("regex exec :::::: ", dellTrack);
  console.log("what is here :::::::: ", decodedMessage[17548]);
}

export { getTrackingNumber };
