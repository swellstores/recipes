const axios = require('axios');
require('dotenv').config();
const swell = require('swell-node');

swell.init(process.env.SWELL_STORE_ID, process.env.SWELL_API_KEY);

var ordersList;

async function getOrders(){
    try {
        const response = await axios.get(`https://${process.env.SHOPIFY_HOST}/admin/api/${process.env.SHOPIFY_API_VERSION}/orders.json`, {
            headers: {
                'Content-Type': 'application/json',
                'X-Shopify-Access-Token': process.env.SHOPIFY_PASSWORD
            },
            limit: 250,
        });

        ordersList = response.data.orders;
        console.log(ordersList[0].line_items)
    } catch(e){
        console.log(e)
    }


}

async function createOrders(list){
    var swellCustomer;
    var swellProduct;
    
    //find swell customer based on shopify_id field
    list.forEach(async element => {
        console.log(element.customer.id);
        var res = await swell.get('/accounts', {
            where: {
                shopify_id: element.customer.id.toString()
            }
        });
        console.log(res);
        swellCustomer = res.results[0].id;
        element.swellCustomer = swellCustomer; //Set swell customer

        //find swell products based on shopify_id
        

    });
  
}

getOrders().then(() => createOrders(ordersList));

