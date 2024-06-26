import axios from "axios";

export async function searchBechtle(product_name, specs, color, location) {
  let search_code = "";
  if (location === "Netherlands") {
    search_code = "nl-en";
  } else if (location === "Poland") {
    search_code = "pl-en";
  }
  let product_desc_links = [];

  if (search_code !== "") {
    let bechtle_search = await axios.get(
      "https://www.bechtle.com/api/find/entries?seo_name=hardware%2Fmobile-computing%2Fnotebooks--10007004--c&size=50&query=" +
        product_name +
        " " +
        specs +
        "&localization=" +
        search_code
    );

    bechtle_search.data.list_items.forEach((item) => {
      if (item.SingleProductView) {
        let specs_line = "";

        if (item.SingleProductView.topFeatures) {
          Object.keys(item.SingleProductView.topFeatures).forEach(
            (key, index) => {
              if (index === 0) {
                specs_line = item.SingleProductView.topFeatures[key];
              } else {
                specs_line =
                  specs_line + ", " + item.SingleProductView.topFeatures[key];
              }
            }
          );
        }
        product_desc_links.push({
          product_name: item.SingleProductView.name,
          stock_level:
            item.SingleProductView.availability_view.delivery_hint_text,
          product_description: item.SingleProductView.description,
          sku: item.SingleProductView.manufacturer_product_id,
          image_source: item.SingleProductView.thumbnail_path,
          price: item.SingleProductView.price.brutto,
          specs: specs_line,
          currency: item.SingleProductView.price.currency_id,
          url_link:
            "https://www.bechtle.com" + item.SingleProductView.details_url,
        });
      } else if (item.ProductFamilyView) {
        product_desc_links.push({
          product_name: item.ProductFamilyView.name,
          details_url: item.ProductFamilyView.details_url,
          product_description: item.ProductFamilyView.description,
          image_source: item.ProductFamilyView.thumbnail_path,
        });
      }
    });
  }
  // console.log("bechtle result ::::::::::::::: ", product_desc_links);
  /**
   * https://www.bechtle.com/finder/_next/data/VEHNEF4Lwr2p-9GR2Jon-/nl-en/finder/product-family/apple-macbook-air-2020-with-m1-chip--3168--f.json?query=macbook&slug=apple-macbook-air-2020-with-m1-chip--3168--f
   */

  return product_desc_links;
}
