const axios = require('axios');
require('dotenv').config();
const swell = require('swell-node');

swell.init(process.env.SWELL_STORE_ID, process.env.SWELL_API_KEY);

var productList = [];
var singleProductListFormat;
var variantsProductListFormat;
var singleProductList;
var variantsProductList;


async function getProducts (){
  try {
    //TODO: recursive call to get all customers
    const response = await axios.get(`https://${process.env.SHOPIFY_HOST}/admin/api/${process.env.SHOPIFY_API_VERSION}/products.json`, {
        headers: {
            'Content-Type': 'application/json',
            'X-Shopify-Access-Token': process.env.SHOPIFY_PASSWORD
        },
        limit: 250,
    });

    productList = response.data.products;
    variantsProductList =  productList.filter((val, index) => val.variants.length > 1);
    singleProductList = productList.filter((val, index) => val.variants.length == 1);
    productList.forEach((element, index) => {
      if (element.variants.length == 1){ //Product has no variants => Create single product
        element.price = element.variants[0].price
        element.sku = element.variants[0].sku
        element.shopify_id = element.variants[0].product_id
        delete element.variants //Remove variants?
      } 
    });

 var optionsArray;
  variantsProductList.forEach(val => {
    val.options.forEach(varValue => {
      varValue.shopify_id = varValue.product_id,
      varValue.variant = true,
      optionsArray = varValue.values.reduce((s,a ) => {
        s.push({name: a});
        return s ;
      }, []);
      varValue.values = optionsArray;

    });
    console.log(val.options);
  });

    singleProductListFormat = singleProductList.map(data => ({
      url: '/products', data: {
        $restore: true,
        name: data.title,
        price: data.price,
        shopify_id: data.shopify_id,
        description: data.body_html,
        slug: data.handle,
        price: data.price,
        sku: data.sku,
      }
    }));

    variantsProductListFormat = variantsProductList.map(data => ({
      url: '/products', data: {
        name: data.title,
        description: data.body_html,
        slug: data.handle,
        price: data.variants[0].price,
        sku: data.sku,
        options: data.options
      }
    }));
    return singleProductListFormat;
} catch (e) {
    console.log(e)
}
}

async function createSwellProducts(list1, list2){
  try{
    await swell.post('/:batch', list1);
    await swell.post('/:batch', list2);
    process.exit();
  } catch(e){
    console.log(e)
  }
}

getProducts().then(() => {
  createSwellProducts(singleProductListFormat, variantsProductListFormat)
});



