const axios = require('axios');
require('dotenv').config();
const swell = require('swell-node');

swell.init(process.env.SWELL_STORE_ID, process.env.SWELL_API_KEY);

var ordersList;
var reqList;
var swellCustomer;
async function getOrders() {
    console.log('getting orders!')
    try {
        const response = await axios.get(`https://${process.env.SHOPIFY_HOST}/admin/api/${process.env.SHOPIFY_API_VERSION}/orders.json`, {
            headers: {
                'Content-Type': 'application/json',
                'X-Shopify-Access-Token': process.env.SHOPIFY_PASSWORD
            },
            limit: 250,
        });
        ordersList = response.data.orders;
    } catch (e) {
        console.log(e)
        process.exit(1);
    }
    return ordersList;

}

async function setStatuses() {
    console.log('settings statuses');

    for (const order in ordersList) {

        //     //Format time
        //     var date = ordersList[order].created_at;
        //     console.log('date: ' + date)
        //     var newDate = new Date(date).toUTCString();
        //     var iso = new Date(date).toISOString().slice(0, 19) + 'Z'
        //   //  var iso = newDate.toUTCString();
        //     console.log('utc: ' + newDate);
        //     console.log('iso: ' + iso);
        //     console.log('offset: ' + new Date(date).getTimezoneOffset());
        //    // console.log(newDate.toISOString());
        //     ordersList[order].date_created = iso;

        //Set financial status
        if (ordersList[order].financial_status == 'paid') {
            ordersList[order].payment_marked = true;
            ordersList[order].paid = true;
            ordersList[order].payment_amount = ordersList[order].current_total_price
            ordersList[order].payment_balance = 0
        } else if (ordersList[order].financial_status == 'refunded') {
            ordersList[order].refund_marked = true
            ordersList[order].refunded = true;
        } else {
            ordersList[order].payment_marked = false
        }

        //Set fulfillment status
        if (ordersList[order].fulfillment_status == 'unfulfilled' || ordersList[order].fulfillment_status == null || ordersList[order].fulfillment_status == 'partial') {
            ordersList[order].status = 'pending';
        } else if (ordersList[order].fulfillment_status == 'fulfilled') {
            ordersList[order].status = 'complete';
            ordersList[order].delivered = 'true';
            ordersList[order].delivery_marked = true;
        }
    };
}

async function createOrders() {
    console.log('creating orders');

    for (const order of ordersList) {

        for (const line_item of order.line_items) {
            var items = [];

            //Check if item is variant or product
            if (line_item.variant_title == "") { //Item is not a variant
                //find swell products based on shopify_id
                var res = await swell.get('/products', {
                    limit: 1000,
                    where: {
                        shopify_id: line_item.product_id
                    }
                });
                items.push({
                    product_id: res.results[0].id,
                    price: line_item.price,
                    quantity: line_item.quantity,
                    quantity_shipment_deliverable: line_item.fulfillable_quantity,
                    quantity_deliverable: line_item.fulfillable_quantity,
                    delivery: 'shipment'
                    //TODO: Add more fields as necessary
                });
            } else { //item is a variant
                var res = await swell.get('/products:variants', {
                    limit: 1000,
                    where: {
                        shopify_id: line_item.variant_id
                    }
                });

                items.push({
                    product_id: res.results[0].parent_id,
                    price: res.results[0].price,
                    variant_id: res.results[0].id,
                    variant: {
                        parent_id: res.results[0].parent_id,
                        name: res.results[0].name,
                    },
                    quantity: line_item.quantity,
                    quantity_shipment_deliverable: line_item.fulfillable_quantity,
                    quantity_deliverable: line_item.fulfillable_quantity,
                    delivery: 'shipment'
                    //TODO: Add more fields as necessary
                });

            }

            order.line_items = items;

        };


    };


    //find swell customer based on shopify_id field
    for (const order in ordersList) {
        try {
            var res = await swell.get('/accounts', {
                limit: 1000,
                where: {
                    shopify_id: ordersList[order].customer.id
                }
            });
            //Set swell customer
            swellCustomer = res.results[0].id;
            ordersList[order].swellCustomer = swellCustomer;

        } catch (e) {
            console.log(e);
            process.exit(1);
        }
    };



}

async function postOrders() {
    await setStatuses();
    console.log('posting orders');
    //Post orders
    reqList = ordersList.map(data => ({
        url: '/orders', data: {
            account_id: data.swellCustomer,
            $restore: true,
            items: data.line_items,
            billing: {
                first_name: data.billing_address.first_name,
                last_name: data.billing_address.last_name,
                city: data.billing_address.city,
                address1: data.billing_address.address1,
                address2: data.billing_address.address2,
                country: data.billing_address.country_code,
                state: data.billing_address.province_code,
                zip: data.billing_address.zip,
                phone: data.billing_address.phone
            },
            shipping: {
                first_name: data.shipping_address.first_name,
                last_name: data.shipping_address.last_name,
                city: data.shipping_address.city,
                address1: data.shipping_address.address1,
                address2: data.shipping_address.address2,
                country: data.shipping_address.country_code,
                state: data.shipping_address.province_code,
                zip: data.shipping_address.zip,
                phone: data.shipping_address.phone
            },
            status: data.status,
            refund_marked: data.refund_marked,
            payment_total: data.payment_amount,
            paid: data.paid,
            payment_marked: data.payment_marked,
            payment_balance: data.payment_balance,
            refunded: data.refunded,
            number: data.order_number,
            sub_total: data.subtotal_price,
            grand_total: data.current_total_price,
            date_created: data.created_at,
            delivered: data.delivered,
            delivery_marked: data.delivery_marked,
            tax_total: data.total_tax,
            shipping_price: data.total_shipping_price_set.shop_money.amount,
            shopify_id: data.id,
            discount_total: data.current_total_discounts
        }
    }));


    try {
        await swell.post('/:batch', reqList);
        process.exit();
    } catch (e) {
        console.log(e)
        process.exit(1);
    }

}


module.exports.main = async function main() {
    await getOrders();
    await createOrders(ordersList);
    await postOrders();
};