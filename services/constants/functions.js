export const functions = [
  {
    name: "searchCDW",
    description: "Gets the item links from CDW for an item",
    parameters: {
      type: "object",
      properties: {
        search_text: {
          type: "string",
          description:
            'The device. E.g. "macbook pro 13" m2" or "dell xps 15"".',
        },
      },
      required: ["search_text"],
    },
  },
  {
    name: "getProductDesc",
    description: "Get the item description of an item from a link",
    parameters: {
      type: "object",
      properties: {
        link: {
          type: "string",
          description: "Link that best matches item requested",
        },
      },
      required: ["link"],
    },
  },
  {
    name: "returnItemInfo",
    description:
      "Returns the price, stock level and url of item in a formatted response",
    parameters: {
      type: "object",
      properties: {
        price: {
          type: "string",
          description: 'Price of the item, e.g. "$1999.99"',
        },
        stock_level: {
          type: "string",
          description: 'Stock level of the item, e.g. "In Stock"',
        },
        url_link: {
          type: "string",
          description: "Url link to the item",
        },
      },
      required: ["price", "stock_level", "url_link"],
    },
  },
];
