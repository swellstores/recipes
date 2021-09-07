require('dotenv').config();
const swell = require('swell-node');
const axios = require('axios');

swell.init(process.env.SWELL_STORE_ID, process.env.SWELL_API_KEY);

var customerList = [];
var formattedList;
var customerObjectList;

async function getCustomers() {
    try {
        //TODO: Recursive call to get all customers
        const response = await axios.get(`https://${process.env.SHOPIFY_HOST}/admin/api/${process.env.SHOPIFY_API_VERSION}/customers.json`, {
            headers: {
                'Content-Type': 'application/json',
                'X-Shopify-Access-Token': process.env.SHOPIFY_PASSWORD
            },
            limit: 250 
        });
        customerList = response.data.customers;
        formattedList = customerList.map(data => ({
            url: "/accounts", data: {
                $restore: true,
                email: data.email,
                first_name: data.first_name,
                last_name: data.last_name,
                phone: data.phone,
                shipping: {
                    address1: data.default_address.address1,
                    address2: data.default_address.address2,
                    city: data.default_address.city,
                    state: data.default_address.province,
                    zip: data.default_address.zip,
                    name: data.default_address.name,
                    country: data.default_address.country_code,
                    state: data.default_address.province_code,
                    phone: data.default_address.phone,
                },
                billing: {
                    address1: data.default_address.address1,
                    address2: data.default_address.address2,
                    city: data.default_address.city,
                    state: data.default_address.province,
                    zip: data.default_address.zip,
                    name: data.default_address.name,
                    country: data.default_address.country_code,
                    state: data.default_address.province_code,
                    phone: data.default_address.phone,
                }
            }
        }));

        customerObjectList = Object.assign({}, formattedList);
        return customerObjectList;

    } catch (e) {
        console.log(e)
    }
}

async function createSwellCustomers(list) {
    try {
        await swell.post('/:batch', list);
        process.exit();
    } catch (e) {
        console.log(e);
    }
}


getCustomers().then(() => {
    createSwellCustomers(customerObjectList);
});
