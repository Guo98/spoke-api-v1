import { Configuration, OpenAIApi } from "openai";
import { load } from "cheerio";
import axios from "axios";
import request from "request";
import { wrapper } from "axios-cookiejar-support";
import { CookieJar } from "tough-cookie";
import { returnItemInfo, formatMultipleRecommendations } from "./functions.js";
import { functions } from "../constants/functions.js";
import { prompts } from "../constants/prompts.js";

const configuration = new Configuration({
  apiKey: process.env.OPENAI_KEY,
});

const openai = new OpenAIApi(configuration);

const jar = new CookieJar();
const client = wrapper(axios.create({ jar }));

export async function checkItemStock(product_link, item_name, specs) {
  const productInfo = await scrapeLink(product_link);
  let return_response = {};
  const openairesp = await openai.createChatCompletion({
    model: "gpt-3.5-turbo-0613",
    messages: [
      {
        role: "system",
        content:
          "Given item info return in a formatted response. Parse out specs from the item name.",
      },
      {
        role: "user",
        content: "Here is the item info: " + JSON.stringify(productInfo),
      },
    ],
    temperature: 0.5,
    max_tokens: 3000,
    functions: functions,
    function_call: "auto",
  });

  if (openairesp.data.choices[0].finish_reason === "function_call") {
    const funcName = openairesp.data.choices[0].message?.function_call?.name;

    const retargs = JSON.parse(
      openairesp.data.choices[0].message?.function_call?.arguments
    );

    if (funcName === "returnItemInfo") {
      return_response = returnItemInfo(retargs);
    }
  }

  if (!productInfo.availability.toLowerCase().includes("in stock")) {
    let search_text = item_name.toLowerCase().includes("apple")
      ? item_name + " " + specs
      : item_name;

    const product_links = await searchCDW(search_text);

    const response = await openai.createChatCompletion({
      model: "gpt-3.5-turbo-0613",
      messages: [
        prompts.recommendations,
        {
          role: "assistant",
          content:
            "Here is the list of related products from the search: " +
            JSON.stringify(product_links.splice(0, 10)),
        },
        {
          role: "user",
          content:
            "Give me in stock recommendations for " +
            item_name +
            " " +
            specs +
            " that in a formatted response.",
        },
      ],
      temperature: 0.5,
      max_tokens: 2000,
      functions: functions,
      function_call: "auto",
    });

    if (response.data.choices[0].finish_reason === "function_call") {
      const functionName =
        response.data.choices[0].message?.function_call?.name;

      const args = JSON.parse(
        response.data.choices[0].message?.function_call?.arguments
      );

      if (functionName === "formatMultipleRecommendations") {
        return_response.recommendations = formatMultipleRecommendations(
          args.recommendations
        );

        return return_response;
      }
    }
  } else {
    return return_response;
  }
}

export async function newCheckStock(item_name, specs, supplier = "cdw") {
  const search_text = item_name.toLowerCase().includes("apple")
    ? item_name + " " + specs
    : item_name;
  let links = [];
  if (supplier === "cdw") {
    links = await searchCDW(search_text);
  } else if (supplier === "insight") {
    links = await searchInsight(search_text);
    links.forEach((l) => {
      delete l.availabilityMessage;
      delete l.alternateImage;
      delete l.searchProductId;
      delete l.manufacturerImage;
      delete l.longDescription;
      delete l.bullet5;
      delete l.bullet4;
      delete l.reviewCount;
      delete l.averageRating;
      delete l.insightPrice;
      l.product_link =
        "https://www.insight.com/en_US/shop/product/" +
        l.sku +
        "/lenovo/" +
        l.sku +
        "/" +
        l.description
          .replace(/-/g, " ")
          .replace(/["]/g, " ")
          .replace(/ +(?= )/g, "")
          .replace(/\s+/g, "-") +
        "/";
    });
  }

  if (links.length > 0) {
    try {
      const response = await openai.createChatCompletion({
        model: "gpt-3.5-turbo-0613",
        messages: [
          {
            role: "system",
            content:
              "Given a list of devices, best match the requested device to the list. If it doesn't exist, get in stock recommendations for the requested device from the list.",
          },
          {
            role: "assistant",
            content:
              "Here is the list of devices: " +
              JSON.stringify(links.splice(0, 7)),
          },
          {
            role: "user",
            content: `Find the product that best matches these specs: ${specs} for item: ${item_name}`,
          },
          {
            role: "system",
            content:
              "Given the matched info to the item and return the item's price, stock level and url in a formatted response.",
          },
        ],
        temperature: 0.3,
        max_tokens: 500,
        functions: functions,
        function_call: "auto",
      });

      if (response.data.choices[0].finish_reason === "function_call") {
        const functionName =
          response.data.choices[0].message?.function_call?.name;

        const args = JSON.parse(
          response.data.choices[0].message?.function_call?.arguments
        );

        if (functionName === "returnItemInfo") {
          let formattedResponse = returnItemInfo(args);

          if (
            !formattedResponse.stock_level.toLowerCase().includes("in stock")
          ) {
            const recresponse = await openai.createChatCompletion({
              model: "gpt-3.5-turbo-0613",
              messages: [
                prompts.recommendations,
                {
                  role: "assistant",
                  content:
                    "Here is the list of related products from the search: " +
                    JSON.stringify(links.splice(0, 7)),
                },
                {
                  role: "user",
                  content:
                    "Return the top 3 recommended items that are in stock in a formatted response.",
                },
              ],
              temperature: 0.3,
              max_tokens: 2000,
              functions: functions,
              function_call: "auto",
            });
            if (recresponse.data.choices[0].finish_reason === "function_call") {
              const recFuncName =
                recresponse.data.choices[0].message?.function_call?.name;

              const recArgs = JSON.parse(
                recresponse.data.choices[0].message?.function_call?.arguments
              );
              if (recFuncName === "formatMultipleRecommendations") {
                formattedResponse.recommendations =
                  formatMultipleRecommendations(recArgs.recommendations);

                return formattedResponse;
              }
            }
          } else {
            return formattedResponse;
          }
        }
      }
    } catch (e) {
      console.log("Error :::::::::::::::: ", e.response.request);
    }
  }
}

export async function checkStock(item_name, specs) {
  //const openai = new OpenAIApi(configuration);
  const response = await openai.createChatCompletion({
    model: "gpt-3.5-turbo-0613",
    messages: [
      prompts.search,
      {
        role: "user",
        content:
          "Search CDW for: " +
          (item_name.toLowerCase().includes("apple")
            ? item_name + " " + specs
            : item_name),
      },
    ],
    temperature: 0.5,
    max_tokens: 300,
    functions: functions,
    function_call: "auto",
  });
  if (response.data.choices[0].finish_reason === "function_call") {
    const functionName = response.data.choices[0].message?.function_call?.name;

    const args = JSON.parse(
      response.data.choices[0].message?.function_call?.arguments
    );
    if (functionName === "searchCDW") {
      const links = await searchCDW(args.search_text);
      const funcresponse = await openai.createChatCompletion({
        model: "gpt-3.5-turbo-0613",
        messages: [
          prompts.search,
          {
            role: "user",
            content:
              "Search CDW for: " +
              (item_name.toLowerCase().includes("apple")
                ? item_name + " " + specs
                : item_name),
          },
          {
            role: "function",
            name: "searchCDW",
            content: JSON.stringify(links),
          },
          {
            role: "user",
            content: `Find the product that best matches these specs: ${specs} for item: ${item_name}`,
          },
          {
            role: "system",
            content:
              "Given the matched info to the item and return the item's price, stock level and url in a formatted response.",
          },
        ],
        temperature: 0.3,
        max_tokens: 500,
        functions: functions,
        function_call: "auto",
      });

      if (funcresponse.data.choices[0].finish_reason === "function_call") {
        const retFuncName =
          funcresponse.data.choices[0].message?.function_call?.name;

        const retArgs = JSON.parse(
          funcresponse.data.choices[0].message?.function_call?.arguments
        );

        if (retFuncName === "returnItemInfo") {
          let formattedResponse = returnItemInfo(retArgs);

          if (!retArgs.stock_level.toLowerCase().includes("in stock")) {
            const recresponse = await openai.createChatCompletion({
              model: "gpt-3.5-turbo-0613",
              messages: [
                prompts.recommendations,
                {
                  role: "assistant",
                  content:
                    "Here is the list of related products from the search: " +
                    JSON.stringify(links.splice(0, 10)),
                },
                {
                  role: "user",
                  content:
                    "Return the top 3 recommended items that are in stock in a formatted response.",
                },
              ],
              temperature: 0.3,
              max_tokens: 2000,
              functions: functions,
              function_call: "auto",
            });
            if (recresponse.data.choices[0].finish_reason === "function_call") {
              const recFuncName =
                recresponse.data.choices[0].message?.function_call?.name;

              const recArgs = JSON.parse(
                recresponse.data.choices[0].message?.function_call?.arguments
              );

              if (recFuncName === "formatMultipleRecommendations") {
                formattedResponse.recommendations =
                  formatMultipleRecommendations(recArgs.recommendations);
              }
            }
          }
          return formattedResponse;
        }
      } else {
        return funcresponse;
      }
    }
  }
}

export async function getRecommendations(item_name) {
  const openai = new OpenAIApi(configuration);
  const response = await openai.createChatCompletion({
    model: "gpt-4",
    messages: [
      prompts.search,
      {
        role: "user",
        content: "Give for me item recommendations similar to " + item_name,
      },
    ],
    temperature: 0.5,
    max_tokens: 300,
    functions: functions,
    function_call: "auto",
  });

  console.log("response ::::::::: ", response.data.choices[0]);
}

async function searchInsight(search_text) {
  let insight_api_result = await axios.get(
    "https://www.insight.com/api/product-search/search?q=" +
      search_text +
      "&selectedFacet=CategoryPath_en_US_ss_lowest_s%3ALaptops&qsrc=h&country=US&instockOnly=false&lang=en_US&locale=en_US&rows=50&start=0&salesOrg=2400&userSegment=CES"
  );

  return insight_api_result.data.products;
}

async function searchCDW(search_text) {
  let cheerioHtml = null;
  const html = await axios.request({
    url: "https://www.cdw.com/search/computers/?key=" + search_text,
    method: "get",
    headers: { "Content-Type": "text/html" },
  });

  if (html.data.includes("location.href")) {
    const uri = html.data.match(/location\.href\s*=\s*["']([^"']+)["']/)[1];
    const newHtml = await axios.request({
      url: "https://www.cdw.com" + uri,
      method: "get",
      headers: { "Content-Type": "text/html" },
    });
    cheerioHtml = newHtml.data;
  } else {
    cheerioHtml = html.data;
  }
  const productLinks = [];
  const $ = load(cheerioHtml);

  const links = $(".search-result-product-url");
  const prices = $(".price-type-price");
  const stockLevel = $(".is-available");
  const imageLinks = $(".search-result-product-image");

  links.each((index, element) => {
    const linkElement = $(element);
    productLinks.push({
      name: linkElement.text(),
      link: "https://www.cdw.com" + linkElement.attr("href"),
      price: $(prices[index]).text(),
      availability: $(stockLevel[index])
        .text()
        .replace(/(\r\n|\n|\r)/gm, "")
        .trim(),
      image_source: $(imageLinks[index]).children("img").eq(0).attr("src"),
    });
  });

  return productLinks;
}

async function scrapeLink(product_link) {
  let html = await axios.request({
    url: product_link,
    method: "get",
    headers: { "Content-Type": "text/html" },
  });

  const $ = load(html.data);

  const availability = $(".short-message-block")
    .text()
    .replace(/(\r\n|\n|\r)/gm, "")
    .trim();
  const price = $(".price-type-selected").text();
  const name = $("#primaryProductNameStickyHeader").text();
  const image_source = $(".main-image").children("img").eq(0).attr("src");

  return {
    availability,
    price,
    name,
    image_source,
    product_link,
  };
}
