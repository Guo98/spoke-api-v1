import { Configuration, OpenAIApi } from "openai";
import { load } from "cheerio";
import axios from "axios";
import { returnItemInfo, formatMultipleRecommendations } from "./functions.js";
import { functions } from "../constants/functions.js";
import { prompts } from "../constants/prompts.js";

const configuration = new Configuration({
  apiKey: process.env.OPENAI_KEY,
});

const openai = new OpenAIApi(configuration);

async function getRecommendations(links, item_name, specs) {
  const response = await openai.createChatCompletion({
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
          "Recommend replacements for " +
          item_name +
          " " +
          specs +
          " that ideally are in stock in a formatted response from the list.",
      },
    ],
    temperature: 0.5,
    max_tokens: 1000,
    functions: functions,
    function_call: "auto",
  });

  if (response.data.choices[0].finish_reason === "function_call") {
    const functionName = response.data.choices[0].message?.function_call?.name;

    const args = JSON.parse(
      response.data.choices[0].message?.function_call?.arguments
    );

    if (functionName === "formatMultipleRecommendations") {
      const recommendations = formatMultipleRecommendations(
        args.recommendations
      );

      return recommendations;
    } else {
      return [];
    }
  } else {
    return [];
  }
}

export async function checkItemStock(product_link, item_name, specs, supplier) {
  let search_text = item_name.toLowerCase().includes("apple")
    ? item_name + " " + specs
    : item_name;

  let productInfo = {};
  let product_links = [];
  let return_response = {};

  if (supplier !== "insight") {
    productInfo = await scrapeLink(product_link, supplier);
  } else {
    const insight_search = await searchInsight(search_text, product_link);
    productInfo = insight_search.info;
    product_links = insight_search.links;
  }

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

  if (
    productInfo === {} ||
    (productInfo.availability &&
      !productInfo.availability.toLowerCase().includes("in stock"))
  ) {
    if (supplier !== "insight") {
      product_links = await searchCDW(search_text);
    }

    const recommendations = await getRecommendations(
      product_links,
      item_name,
      specs
    );

    if (recommendations.length > 0) {
      return_response.recommendations = recommendations;
    }
    return return_response;
  } else {
    return return_response;
  }
}

export async function newCheckStock(
  item_name,
  specs,
  supplier = "cdw",
  others
) {
  const search_text = item_name.toLowerCase().includes("apple")
    ? item_name + " " + specs
    : item_name;
  let links = [];
  if (supplier === "cdw") {
    links = await searchCDW(search_text);
  } else if (supplier === "insight") {
    links = await searchInsight(search_text);
  }

  if (links.length > 0) {
    try {
      const temp_links = [...links];
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
              JSON.stringify(temp_links.splice(0, 10)),
          },
          {
            role: "user",
            content: `Match specs: ${specs} for item: ${item_name} to one in the list and return the info in a formatted response.`,
          },
        ],
        temperature: 0.3,
        max_tokens: 1000,
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
            !formattedResponse.stock_level.toLowerCase().includes("in stock") ||
            others
          ) {
            const recommendations = await getRecommendations(
              links,
              item_name,
              specs
            );

            if (recommendations.length > 0) {
              formattedResponse.recommendations = recommendations;
            }
            return formattedResponse;
          } else {
            return formattedResponse;
          }
        }
      }
    } catch (e) {
      console.log("Error :::::::::::::::: ", e.response.data);
    }
  }
}

function getInsightProductLink(product) {
  return (
    "https://www.insight.com/en_US/shop/product/" +
    encodeURIComponent(product.sku) +
    "/" +
    product.manufacturerName.toLowerCase() +
    "/" +
    encodeURIComponent(product.sku) +
    "/" +
    product.description
      .replace(/-/g, " ")
      .replace(/["]/g, " ")
      .replace(/ +(?= )/g, "")
      .replace(/\s+/g, "-") +
    "/"
  );
}

async function searchInsight(search_text, sku = "") {
  let insight_api_result = await axios.get(
    "https://www.insight.com/api/product-search/search?q=" +
      search_text +
      (!search_text.toLowerCase().includes("apple") &&
        "&selectedFacet=CategoryPath_en_US_ss_lowest_s%3ALaptops") +
      "&qsrc=h&country=US&instockOnly=false&lang=en_US&locale=en_US&rows=50&start=0&salesOrg=2400&userSegment=CES"
  );

  let links = insight_api_result.data.products;
  if (sku === "") {
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
      l.product_link = getInsightProductLink(l);
    });

    return links;
  } else {
    const filtered_links = links.filter((l) => l.sku === sku);
    if (filtered_links.length > 0) {
      return {
        info: {
          availability:
            filtered_links[0].availability === "AVAILABLE"
              ? "In Stock"
              : filtered_links[0].availability,
          price: filtered_links[0].listPrice,
          name: filtered_links[0].description,
          image_source: filtered_links[0].image,
          product_link: getInsightProductLink(filtered_links[0]),
        },
        links,
      };
    } else {
      return { info: {}, links };
    }
  }
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

async function scrapeLink(product_link, supplier) {
  if (supplier === "cdw") {
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
}
