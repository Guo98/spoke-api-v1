export const functions = [
  {
    name: "returnItemInfo",
    description:
      "Returns the price, stock level and url of item in a formatted response",
    parameters: {
      type: "object",
      properties: {
        price: {
          type: "string",
          description:
            'Price of the item in currency format with dollar sign in front and cents, e.g. "$1999.99", "$9.99',
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
        image_source: {
          type: "string",
          description: "Url link of the image of the product",
        },
      },
      required: [
        "price",
        "stock_level",
        "url_link",
        "product_name",
        "specs",
        "image_source",
      ],
    },
  },
  {
    name: "formatMultipleRecommendations",
    description:
      "Returns the price, product description, iamge source and url of multiple recommended items in a formatted response.",
    parameters: {
      type: "object",
      properties: {
        recommendations: {
          type: "array",
          description: "List of recommended replacements as objects",
          items: {
            type: "object",
            properties: {
              price: {
                type: "string",
                description:
                  'Price of the item in currency form, e.g. "$1999.99"',
              },
              url_link: {
                type: "string",
                description: "Url link to the item",
              },
              product_desc: {
                type: "string",
                description:
                  "Description of the product that is being recommended",
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
              image_source: {
                type: "string",
                description: "Url link of the image of the product",
              },
            },
            required: [
              "price",
              "url_link",
              "product_desc",
              "product_name",
              "stock_level",
              "specs",
              "image_source",
            ],
          },
        },
      },
      required: ["recommendations"],
    },
  },
];

export const scrape_functions = [
  {
    name: "returnItemInfo",
    description:
      "Returns the price, specs (screen size, cpu, ram size, hard drive size), color, and url of item image in a formatted response",
    parameters: {
      type: "object",
      properties: {
        price: {
          type: "string",
          description:
            'Price of the item in currency format with dollar sign in front and cents, e.g. "$1999.99", "$9.99',
        },
        screen_size: {
          type: "string",
          description: 'Screen size of the item, e.g. 14"',
        },
        cpu: {
          type: "string",
          description: 'Processing unit of the device, e.g. "M2", "Intel i7"',
        },
        name: {
          type: "string",
          description: 'Name of the product, e.g. MacBook Pro 14"',
        },
        ram: {
          type: "string",
          description: 'RAM size of the device, e.g. "16GB", "8GB"',
        },
        hard_drive: {
          type: "string",
          description: 'Hard drive size of the device, e.g. "256GB", "512GB',
        },
        image_source: {
          type: "string",
          description: "Url link of the image of the product",
        },
        color: {
          type: "string",
          description: 'Color of the device, e.g. "Space Gray", "Black"',
        },
        brand: {
          type: "string",
          description: 'Device brand, e.g. "Apple", "Dell"',
        },
        stock_level: {
          type: "string",
          description: 'Stock level of the item, e.g. "In Stock"',
        },
        device_type: {
          type: "string",
          description:
            'Type of device, can either be "laptops", "desktops", or "accessories"',
        },
        device_line: {
          type: "string",
          description:
            'Which line of device is it, e.g. "Macbook Pro", "ThinkPad"',
        },
        supplier: {
          type: "string",
          description: 'Supplier of the site, e.g. "CDW", "Insight"',
        },
      },
      required: [
        "price",
        "screen_size",
        "cpu",
        "ram",
        "hard_drive",
        "image_source",
        "color",
        "name",
        "brand",
        "stock_level",
        "device_type",
        "device_line",
        "supplier",
      ],
    },
  },
];
