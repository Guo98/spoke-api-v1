export const prompts = {
  search: {
    role: "system",
    content:
      "Given an item name search CDW for product links. Given the links, match the link with the item name.",
  },
  recommendations: {
    role: "system",
    content:
      "For the user inputted item, recommend a replacement item that is in stock from the given list.",
  },
};
