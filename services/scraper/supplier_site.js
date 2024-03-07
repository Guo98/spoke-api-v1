import axios from "axios";
import { load } from "cheerio";
import { Configuration, OpenAIApi } from "openai";
import { GPTTokens } from "gpt-tokens";

import { scrape_functions } from "../constants/functions.js";

const configuration = new Configuration({
  apiKey: process.env.OPENAI_KEY,
});

const openai = new OpenAIApi(configuration);

async function scrape_supplier_site(supplier_url) {
  let messages = [];
  let sku = "";

  let completion_tokens = 4097 - 400;
  if (supplier_url.includes("www.cdw.com")) {
    let html = await axios.request({
      url: supplier_url,
      method: "get",
      headers: { "Content-Type": "text/html" },
    });

    messages = [
      {
        role: "system",
        content: "Given html, scrape it for item information.",
      },
      {
        role: "user",
        content:
          "Scrape the following html for item name, specs, price, and color. " +
          html.data
            .replace(/<\/?("[^"]*"|'[^']*'|[^>])*(>|$)/g, "")
            .replace(/(\r\n|\n|\r)/gm, "")
            .slice(0, 5000),
      },
    ];

    const usage_info = new GPTTokens({ model: "gpt-3.5-turbo-0613", messages });

    completion_tokens = completion_tokens - usage_info.usedTokens;
  } else if (supplier_url.includes("www.insight.com")) {
    let url_splits = supplier_url.split("/");
    const product_index = url_splits.findIndex((p) => p === "product");

    if (product_index > -1) {
      sku = url_splits[product_index + 1];
      let insight_api_result = await axios.get(
        "https://www.insight.com/api/product-search/search?q=" +
          sku +
          "&qsrc=h&country=US&instockOnly=false&lang=en_US&locale=en_US&rows=50&start=0&salesOrg=2400&userSegment=CES"
      );

      messages = [
        {
          role: "system",
          content:
            "Given data, get item info from data that best matches the url given: " +
            supplier_url,
        },
        {
          role: "user",
          content:
            "Scrape the data for device name, specs, price, and color. " +
            JSON.stringify(insight_api_result.data.products),
        },
      ];

      const usage_info = new GPTTokens({
        model: "gpt-3.5-turbo-0613",
        messages,
      });
      completion_tokens = completion_tokens - usage_info.usedTokens;
    }
  }

  if (messages.length > 0) {
    const response = await openai.createChatCompletion({
      model: "gpt-3.5-turbo-0613",
      messages,
      temperature: 0.5,
      max_tokens: completion_tokens,
      functions: scrape_functions,
      function_call: "auto",
    });

    if (response.data.choices[0].finish_reason === "function_call") {
      const func_name = response.data.choices[0].message?.function_call?.name;

      const ret_args = JSON.parse(
        response.data.choices[0].message?.function_call?.arguments
      );

      if (func_name === "returnItemInfo") {
        let return_response = returnItemInfo(ret_args);
        if (return_response.supplier.toLowerCase() === "insight") {
          return_response.sku = sku;
        }

        return return_response;
      } else {
        return null;
      }
    } else {
      return null;
    }
  }
}

function returnItemInfo(args) {
  return args;
}

export { scrape_supplier_site };
