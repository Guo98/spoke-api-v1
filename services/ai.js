import { Configuration, OpenAIApi } from "openai";
import { load } from "cheerio";
import axios from "axios";
import { functions } from "./constants/functions.js";
import { prompts } from "./constants/prompts.js";

const configuration = new Configuration({
  apiKey: process.env.OPENAI_KEY,
});

export async function checkStock(item_name) {
  const openai = new OpenAIApi(configuration);
  const response = await openai.createChatCompletion({
    model: "gpt-4",
    messages: [
      prompts.search,
      { role: "user", content: "Search CDW for: " + item_name },
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
        model: "gpt-4",
        messages: [
          prompts.search,
          { role: "user", content: "Search CDW for: " + item_name },
          {
            role: "function",
            name: "searchCDW",
            content: JSON.stringify(links.splice(0, 5)),
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
          let formattedResponse = returnItemInfo(
            retArgs.price,
            retArgs.stock_level,
            retArgs.url_link,
            retArgs.product_name
          );
          if (!retArgs.stock_level.toLowerCase().includes("in stock")) {
            const recresponse = await openai.createChatCompletion({
              model: "gpt-4",
              messages: [
                prompts.recommendations,
                {
                  role: "function",
                  name: "searchCDW",
                  content: JSON.stringify(links.splice(0, 5)),
                },
                {
                  role: "user",
                  content:
                    "Return the recommended item in a formatted response.",
                },
              ],
              temperature: 0.3,
              max_tokens: 500,
              functions: functions,
              function_call: "auto",
            });

            if (recresponse.data.choices[0].finish_reason === "function_call") {
              const recFuncName =
                recresponse.data.choices[0].message?.function_call?.name;

              const recArgs = JSON.parse(
                recresponse.data.choices[0].message?.function_call?.arguments
              );

              if (recFuncName === "formattedRecommendations") {
                formattedResponse.recommendation = formattedRecommendations(
                  recArgs.price,
                  recArgs.url_link,
                  recArgs.product_desc,
                  recArgs.product_name,
                  recArgs.stock_level
                );
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

async function searchCDW(search_text) {
  let cheerioHtml = null;
  const openai = new OpenAIApi(configuration);
  const html = await axios.request({
    url: "https://www.cdw.com/search/?key=" + search_text,
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

  links.each((index, element) => {
    const linkElement = $(element);
    productLinks.push({
      name: linkElement.text(),
      link: "https://www.cdw.com" + linkElement.attr("href"),
      price: $(prices[index]).text(),
      availability: $(stockLevel[index]).text(),
    });
  });

  return productLinks;
}

function returnItemInfo(price, stock_level, url_link, product_name) {
  return {
    price,
    stock_level,
    url_link,
    product_name,
  };
}

function formattedRecommendations(
  price,
  url_link,
  product_desc,
  product_name,
  stock_level
) {
  return {
    price,
    url_link,
    product_desc,
    product_name,
    stock_level,
  };
}