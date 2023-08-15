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
        product_name: {
          type: "string",
          description: 'Name of the product, e.g. MacBook Pro 14"',
        },
        specs: {
          type: "string",
          description:
            'Specifications of the item including the screen size, cpu, memory, storage, e.g. "14", i5, 16GB RAM, 512GB SSD"',
        },
      },
      required: ["price", "stock_level", "url_link", "product_name", "specs"],
    },
  },
  {
    name: "formattedRecommendations",
    description:
      "Returns the price, product description and url of recommended item in a formatted response.",
    parameters: {
      type: "object",
      properties: {
        price: {
          type: "string",
          description: 'Price of the item, e.g. "$1999.99"',
        },
        url_link: {
          type: "string",
          description: "Url link to the item",
        },
        product_desc: {
          type: "string",
          description: "Description of the product that is being recommended",
        },
        product_name: {
          type: "string",
          description: 'Name of the product, e.g. MacBook Pro 14"',
        },
        stock_level: {
          type: "string",
          description: 'Stock level of the item, e.g. "In Stock"',
        },
        specs: {
          type: "string",
          description:
            'Specifications of the item including the screen size, cpu, memory, storage, e.g. "14", i5, 16GB RAM, 512GB SSD"',
        },
      },
      required: [
        "price",
        "url_link",
        "product_desc",
        "product_name",
        "stock_level",
        "specs",
      ],
    },
  },
];
