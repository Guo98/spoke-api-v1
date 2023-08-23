export const prompts = {
  search: {
    role: "system",
    content:
      "Given an item name search CDW for product links. With the links, try to match the item name to the correct product link from CDW. If the link doesn't exist, return not found.",
  },
  recommendations: {
    role: "system",
    content:
      "Recommend 3 replacement items that are in stock from the given list.",
  },
};
