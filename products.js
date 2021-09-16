const axios = require('axios');
require('dotenv').config();
const swell = require('swell-node');

swell.init(process.env.SWELL_STORE_ID, process.env.SWELL_API_KEY);

var productList = [];
var singleProductListFormat;
var variantsProductListFormat;
var singleProductList;
var variantsProductList;
var swellParentsList;


async function getProducts (){
  try {
    //TODO: recursive call to get all products
    const response = await axios.get(`https://${process.env.SHOPIFY_HOST}/admin/api/${process.env.SHOPIFY_API_VERSION}/products.json`, {
        headers: {
            'Content-Type': 'application/json',
            'X-Shopify-Access-Token': process.env.SHOPIFY_PASSWORD
        },
        limit: 250,
    });

    productList = response.data.products;
    variantsProductList =  productList.filter((val, index) => val.variants.length > 1); //Products with variants
    singleProductList = productList.filter((val, index) => val.variants.length == 1); //Single products
    singleProductList.forEach((element, index) => {
     //Product has no variants => Create single product
        element.price = element.variants[0].price;
        element.sku = element.variants[0].sku;
        element.shopify_id = element.variants[0].product_id;
        element.stock_level = element.inventory_quantity;
        delete element.variants; //Remove variants?
      
    });

    
  variantsProductList.forEach(val => {
    val.options.forEach(varValue => {
      varValue.shopify_id = varValue.product_id,
      delete varValue.id;
      delete varValue.product_id;
      varValue.variant = true
    });
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
        stock_level: data.stock_level,
        shipment_weight: data.weight,
        type: 'standard',
        delivery: 'shipment'
      }
    }));


    variantsProductListFormat = variantsProductList.map(data => ({
      url: '/products', data: {
        name: data.title,
        shopify_id: data.id,
        description: data.body_html,
        slug: data.handle,
        hasVariants: true,
        sku: data.sku,
        type: 'standard',
      }
    }));
    // return singleProductListFormat;
} catch (e) {
    console.log(e)
}
}


async function createSwellProducts(list1, list2){
  try{
    await swell.post('/:batch', list1);
    await swell.post('/:batch', list2);
  } catch(e){
    console.log(e)
  }
}

async function getSwellParents(){
  try{
    swellParentsList = await swell.get('/products', {
      limit: 1000,
      where: {
        hasVariants: true
      }
    });
  } catch(e){
    console.log(e);
  }
}

 function getProductId(shopify_id){
  for (var i = 0; i < swellParentsList.results.length; i++){
    if (swellParentsList.results[i].shopify_id == shopify_id){
      return swellParentsList.results[i].id;
    }
  }
}

async function createVariants(){
  try{

    await getSwellParents();

    var variantsList = [];

    //Combine variants and concat
    for (var i = 0; i < variantsProductList.length; i++){
      variantsList.push(variantsProductList[i].variants);
    }
    var concatList = variantsList.flat();

    concatList.forEach(element => {
      var parentProductId =  getProductId(element.product_id);
      element.parent_id =  parentProductId;
    });
    
    var req = concatList.map(data => ({
      url: '/products:variants', data: {
        parent_id: data.parent_id,
        $restore: true,
        shopify_id: data.id,
        name: data.title,
        price: data.price,
        sku: data.sku,
        shipment_weight: data.weight,
        shopify_id: data.id,
        stock_level: data.inventory_quantity,
      }
    }));

   await swell.post('/:batch', req);
    process.exit();
  } catch(e){
    console.log(e);
  }
}

// getProducts().then(() => {
//    createSwellProducts(singleProductListFormat, variantsProductListFormat);
//   createVariants();
// });

module.exports.main = async function main(){
  await getProducts();
  await createSwellProducts(singleProductListFormat, variantsProductListFormat);
  await createVariants();
}



