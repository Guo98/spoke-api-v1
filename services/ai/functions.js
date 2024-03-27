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

      const messages = [
        {
          role: "system",
          content:
            "Given a list of devices, best match the requested device to the list and then return the info of the device in a formatted response (NOT THE INDEX).",
        },
        {
          role: "assistant",
          content:
            "Here is the list of devices from the search criteria: " +
            JSON.stringify(product_details.splice(0, 10)),
        },
        {
          role: "user",
          content: `Check if specs: ${specs.replace(
            '"',
            " inch"
          )} for item: ${item_name} and color: ${color} is available.`,
        },
      ];

      const openai_resp = await openaiCall(messages, 750, 0.5, 0);

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
          console.log(
            "selectBestMatch() => Matched the device to one in the product family."
          );
          let formattedResponse = returnItemInfo(args);

          return formattedResponse;
        }
      }
    }
  } else {
    console.log("selectBestMatch() => Matched device to a single product.");
    const messages = [
      {
        role: "system",
        content:
          "Given the device info, return the info in a formatted response.",
      },
      {
        role: "assistant",
        content: "Here is the device info: " + product_list[index],
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

        return formattedResponse;
      }
    }
  }
  console.log("selectBestMatch() => Finished function.");
  return null;
}
