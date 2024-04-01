import axios from "axios";
import { openaiCall } from "./openai.js";

/**
 *
 * @param {*} price
 * @param {*} stock_level
 * @param {*} url_link
 * @param {*} product_name
 * @param {*} specs
 * @param {*} image_source
 * @returns
 */

export function returnItemInfo(args) {
  return args;
}

export function formatMultipleRecommendations(recommendations) {
  return recommendations;
}

export async function selectBestMatch(
  product_list,
  index,
  color,
  specs,
  item_name
) {
  console.log("selectBestMatch() => Starting function.", product_list[index]);
  let currency_sign = "";
  if (product_list[index].details_url) {
    console.log("selectBestMatch() => Matched to a product family.");
    let product_url =
      "https://www.bechtle.com/finder/_next/data/VEHNEF4Lwr2p-9GR2Jon-" +
      product_list[index].details_url;
    product_url = product_url.replace("--f", "--f.json");
    const product_resp = await axios.get(product_url);

    if (
      product_resp.data.pageProps.dehydratedQueries &&
      product_resp.data.pageProps.dehydratedQueries.queries &&
      product_resp.data.pageProps.dehydratedQueries.queries.length > 0
    ) {
      console.log(
        "selectBestMatch() => Getting all the product family products."
      );
      let product_details = [];

      product_resp.data.pageProps.dehydratedQueries.queries[0].state.data.products.forEach(
        (item, index) => {
          if (currency_sign === "") {
            if (item.price && item.price.currencyId) {
              if (item.price.currencyId === "EUR") {
                currency_sign = "€";
              }
            }
          }
          product_details.push({
            name: item.name,
            stock_level: item.availability.stockType,
            price: item.price?.gross || "",
            currency: item.price?.currencyId || "",
            specs: item.topFeatures,
            image_source: item.imagePath,
            description: item.description,
            url_link: "https://www.bechtle.com" + item.pdpUrl,
          });
        }
      );

      if (product_details.length > 10) {
        product_details.splice(0, 10);
      }

      // const messages_2 = [
      //   {
      //     role: "system",
      //     content:
      //       "Given a list of devices, match the requested device to one on the list and then return the info of the device in a formatted response. Has to be the same brand and device line. If there is no matches, return null.",
      //   },
      //   {
      //     role: "assistant",
      //     content:
      //       "Here is the list of devices from the search criteria: " +
      //       JSON.stringify(product_details.splice(0, 10)),
      //   },
      //   {
      //     role: "user",
      //     content: `Check if specs: ${specs.replace(
      //       '"',
      //       " inch"
      //     )} for item: ${item_name} and color: ${color} is available in the list. Has to be the same device brand and line. If no devices in the list match the specified device, return null.`,
      //   },
      // ];

      const messages = [
        {
          role: "system",
          content: `Given a list of devices, match the requested device to one in the list.`,
        },
        {
          role: "user",
          content: `Here is the requested device: [Device name: ${item_name}. Specs: ${specs}. Color: ${color}]. Here is the list of available devices: ${JSON.stringify(
            product_details
          )}. Return the selected device from the list in a formatted response.`,
        },
      ];
      console.log("message ::::::::::: ", messages);
      const openai_resp = await openaiCall(messages, 800, 0.3, 0);

      if (
        openai_resp !== null &&
        openai_resp.data?.choices[0].finish_reason === "function_call"
      ) {
        const function_name =
          openai_resp.data.choices[0].message?.function_call?.name;

        const args = JSON.parse(
          openai_resp.data.choices[0].message?.function_call?.arguments
        );
        if (function_name === "returnItemInfo") {
          console.log(
            "selectBestMatch() => Matched the device to one in the product family."
          );
          let formattedResponse = returnItemInfo(args);
          if (currency_sign !== "") {
            if (formattedResponse.price.includes("$")) {
              formattedResponse.price.replace("$", currency_sign);
            } else {
              formattedResponse.price = currency_sign + formattedResponse.price;
            }
          }
          return formattedResponse;
        }
      }
    }
  } else {
    console.log("selectBestMatch() => Matched device to a single product.");
    const messages_2 = [
      {
        role: "system",
        content:
          "Given the device info, return the info in a formatted response.",
      },
      {
        role: "user",
        content:
          "Return this device's info: " +
          product_list[index] +
          " in a formatted way.",
      },
    ];

    const messages = [
      {
        role: "system",
        content:
          "Return this device info in formatted way: " +
          JSON.stringify(product_list[index]),
      },
    ];

    const openai_resp = await openaiCall(messages, 500, 0.5, 0);

    if (
      openai_resp !== null &&
      openai_resp.data.choices[0].finish_reason === "function_call"
    ) {
      const function_name =
        openai_resp.data.choices[0].message?.function_call?.name;

      const args = JSON.parse(
        openai_resp.data.choices[0].message?.function_call?.arguments
      );
      if (function_name === "returnItemInfo") {
        let formattedResponse = returnItemInfo(args);
        if (currency_sign !== "") {
          if (formattedResponse.price.includes("$")) {
            formattedResponse.price.replace("$", currency_sign);
          } else {
            formattedResponse.price = currency_sign + formattedResponse.price;
          }
        }
        return formattedResponse;
      }
    }
  }
  console.log("selectBestMatch() => Finished function.");
  return null;
}
