import axios from "axios";
import { load } from "cheerio";
import { Configuration, OpenAIApi } from "openai";

import { scrape_functions } from "../constants/functions.js";

const configuration = new Configuration({
  apiKey: process.env.OPENAI_KEY,
});

const openai = new OpenAIApi(configuration);

async function scrape_supplier_site(supplier_url) {
  let html = await axios.request({
    url: supplier_url,
    method: "get",
    headers: { "Content-Type": "text/html" },
  });
  //   const $ = load(html.data);
  console.log("html data :::::::::: ", html.data);
  const response = await openai.createChatCompletion({
    model: "gpt-3.5-turbo-0613",
    messages: [
      {
        role: "system",
        content: "Given html, scrape it for device information.",
      },
      {
        role: "user",
        content:
          "Scrape the following html for device name, specs, price, and color. " +
          html.data.replace(/<\/?("[^"]*"|'[^']*'|[^>])*(>|$)/g, ""),
      },
    ],
    temperature: 0.5,
    max_tokens: 1000,
    functions: scrape_functions,
    function_call: "auto",
  });

  if (response.data.choices[0].finish_reason === "function_call") {
    const func_name = response.data.choices[0].message?.function_call?.name;

    const ret_args = JSON.parse(
      response.data.choices[0].message?.function_call?.arguments
    );

    if (func_name === "returnItemInfo") {
      const return_response = returnItemInfo(ret_args);
      return return_response;
    } else {
      return null;
    }
  } else {
    return null;
  }
}

function returnItemInfo(args) {
  return args;
}

export { scrape_supplier_site };
