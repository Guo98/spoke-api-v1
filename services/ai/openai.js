import { Configuration, OpenAIApi } from "openai";
import { functions, bechtle_functions } from "../constants/functions.js";

const configuration = new Configuration({
  apiKey: process.env.OPENAI_KEY,
});

const openai = new OpenAIApi(configuration);

const function_mapping = [functions, bechtle_functions];

export async function openaiCall(
  messages,
  tokens,
  temperature,
  function_index
) {
  try {
    const response = await openai.createChatCompletion({
      model: "gpt-3.5-turbo-0613",
      messages: messages,
      temperature: temperature,
      max_tokens: tokens,
      functions: function_mapping[function_index],
      function_call: "auto",
    });

    return response;
  } catch (e) {
    console.log("openaiCall() => Error in calling openai:", e);
    return null;
  }
}
