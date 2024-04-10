import { Configuration, OpenAIApi } from "openai";
import { load } from "cheerio";
import axios from "axios";

import { searchBechtle } from "./suppliers/bechtle.js";
import {
  returnItemInfo,
  formatMultipleRecommendations,
  selectBestMatch,
} from "./functions.js";
import { functions, bechtle_functions } from "../constants/functions.js";
import { prompts } from "../constants/prompts.js";
import { openaiCall } from "./openai.js";

const configuration = new Configuration({
  apiKey: process.env.OPENAI_KEY,
});

const openai = new OpenAIApi(configuration);

export async function checkBrowsing(item_name) {
  const response = await openai.createChatCompletion({
    model: "gpt-4",
    messages: [
      {
        role: "system",
        content: "Whats the most current macbook model?",
      },
    ],
    temperature: 0.5,
    max_tokens: 1000,
  });

  console.log("response ::::::::::::: ", response.data.choices);
}

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
          specs.replace('"', " inch") +
          " that are in stock in a formatted response from the list.",
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

export async function checkItemStock(
  product_link,
  item_name,
  specs,
  supplier,
  location
) {
  let search_text = item_name.toLowerCase().includes("apple")
    ? item_name + " " + specs
    : item_name;

  let productInfo = {};
  let product_links = [];
  let return_response = {};

  if (supplier !== "insight") {
    productInfo = await scrapeLink(product_link, supplier);
  } else {
    const insight_search = await searchInsight(
      item_name + " " + specs,
      product_link
    );
    productInfo = insight_search.info;
    product_links = insight_search.links;
  }

  const messages = [
    {
      role: "system",
      content:
        "Given item info return in a formatted response. Parse out specs from the item name.",
    },
    {
      role: "user",
      content: "Here is the item info: " + JSON.stringify(productInfo),
    },
  ];

  const openairesp = await openaiCall(messages, 3000, 0.5, 0);

  if (
    openairesp !== null &&
    openairesp.data.choices[0].finish_reason === "function_call"
  ) {
    const funcName = openairesp.data.choices[0].message?.function_call?.name;

    const retargs = JSON.parse(
      openairesp.data.choices[0].message?.function_call?.arguments
    );

    if (funcName === "returnItemInfo") {
      return_response = returnItemInfo(retargs);
    }
  }

  if (
    Object.keys(productInfo).length === 0 ||
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
  others,
  color,
  location
) {
  console.log("newCheckStock() => Starting function.");
  const search_text = item_name.toLowerCase().includes("apple")
    ? item_name + " " + specs
    : item_name;
  let links = [];
  if (supplier === "cdw") {
    console.log("newCheckStock() => Searching CDW.");
    links = await searchCDW(search_text);
  } else if (supplier === "insight") {
    console.log("newCheckStock() => Searching Insight.");
    links = await searchInsight(item_name + " " + specs);
  } else if (supplier === "bechtle") {
    console.log("newCheckStock() => Searching Bechtle.");
    links = await searchBechtle(item_name, specs, color, location);
  }

  if (links.length > 0) {
    console.log(
      "newCheckStock() => Got search results of length:",
      links.length
    );
    const temp_links = [...links];

    const spliced_links = temp_links.splice(0, 10);
    let messages = [
      {
        role: "system",
        content:
          "Given a list of devices, best match the requested device to the list. If it doesn't exist, get in stock recommendations for the requested device from the list.",
      },
      {
        role: "assistant",
        content:
          "Here is the list of devices: " + JSON.stringify(spliced_links),
      },
      {
        role: "user",
        content: `Match specs: ${specs.replace(
          '"',
          " inch"
        )} for item: ${item_name} and color: ${color} to one in the list and return the info in a formatted response.`,
      },
    ];
    if (supplier === "bechtle") {
      console.log("newCheckStock() => Updating messages for bechtle.");
      messages = [
        {
          role: "system",
          content:
            "Given this list of devices " +
            JSON.stringify(spliced_links) +
            ", select the device in the list that best matches the requested device: " +
            item_name +
            " " +
            specs.replace('"', " inch") +
            " " +
            color,
        },
        {
          role: "user",
          content: `Select the device that matches the requested specs.`,
        },
      ];
    }
    try {
      console.log(
        "newCheckStock() => Using openai to determine best match from list."
      );
      const response = await openaiCall(
        messages,
        500,
        0.4,
        supplier === "bechtle" ? 1 : 0
      );

      if (
        response !== null &&
        response.data.choices[0].finish_reason === "function_call"
      ) {
        console.log(
          "newCheckStock() => OpenAI successfully return a function call."
        );
        const functionName =
          response.data.choices[0].message?.function_call?.name;

        const args = JSON.parse(
          response.data.choices[0].message?.function_call?.arguments
        );

        if (functionName === "returnItemInfo") {
          console.log("newCheckStock() => Function call of returnItemInfo.");
          let formattedResponse = returnItemInfo(args);

          if (
            !formattedResponse.stock_level.toLowerCase().includes("in stock") ||
            others
          ) {
            console.log(
              "newCheckStock() => Matched device is not in stock, getting replacement recommendations."
            );
            const recommendations = await getRecommendations(
              links,
              item_name,
              specs
            );

            if (recommendations.length > 0) {
              console.log(
                "newCheckStock() => Successfully got recommendations."
              );
              formattedResponse.recommendations = recommendations;
            }
            return formattedResponse;
          } else {
            return formattedResponse;
          }
        } else if (functionName === "selectBestMatch") {
          console.log("newCheckStock() => Function call of selectBestMatch.");
          if (!isNaN(args.index) && args.index > -1) {
            const response = await selectBestMatch(
              links,
              args.index,
              color,
              specs,
              item_name
            );

            if (response !== null) {
              console.log(
                "newCheckStock() => Successfully return best match in a formatted response."
              );
              return response;
            }
          } else {
            // should run recommendations here
            console.log(
              "newCheckStock() => Couldn't find a good match for device."
            );
          }
        }
      }
    } catch (e) {
      console.log(
        "newCheckStock() => Error in OpenAI function:",
        e.response.data
      );
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
      search_text.replace('"', " inch") +
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
      delete l.callForPrice;
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
          color: "",
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
  const cdwPartNo = $(".cdw-code");
  const color = $(".extended-specs-content");

  links.each((index, element) => {
    const linkElement = $(element);

    const color_result = $(color[index])
      .children(".extended-specs-row")
      .filter(function (i, el) {
        return $(this).children(".extended-specs-key").text() === "Color:";
      })
      .text()
      .replace(/(\r\n|\n|\r)/gm, "")
      .trim()
      .replace(/\s+/g, " ")
      .replace("Color: ", "")
      .trim();

    productLinks.push({
      name: linkElement.text(),
      link: "https://www.cdw.com" + linkElement.attr("href"),
      price: $(prices[index]).text(),
      availability: $(stockLevel[index])
        .text()
        .replace(/(\r\n|\n|\r)/gm, "")
        .trim()
        .replace(/\s+/g, " ")
        .trim()
        .replace("Availability: ● ", ""),
      image_source: $(imageLinks[index]).children("img").eq(0).attr("src"),
      cdw_part_no: $(cdwPartNo[index]).text().replace("CDW#: ", ""),
      color: color_result,
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
    const cdw_part_no = $(".primary-product-part-numbers")
      .children("span")
      .eq(1)
      .children("span")
      .eq(0)
      .text();

    return {
      availability,
      price,
      name,
      image_source,
      product_link,
      cdw_part_no,
    };
  }
}
