# Shopify Migration Scripts
**This project is still under active development**

## Overview
The scripts will migrate over the following from your Shopify store, to your Swell store:

- Products
- Variants
- Orders
- Customers

Depending on the configuration of your store, you might need to modify the scripts to suit your requirements.

Swell also has native import functionality for Products and Customers, and these can be imported by CSV or JSON. To import Products or Customers, click **import** when viewing products or customers from the Swell dashboard.

## Setup Instructions
- Clone the repo
- `npm install`
- Create a Shopify Private App
    - Instructions: https://help.shopify.com/en/manual/apps/private-apps#generate-credentials-from-the-shopify-admin
- Create a `.env` file, use the `.env.template` file to create the following variables
    ```
    SWELL_API_KEY={secret_key}
    SWELL_STORE_ID=
    SHOPIFY_HOST={store_name}.myshopify.com
    SHOPIFY_API_VERSION=
    SHOPIFY_API_KEY=
    SHOPIFY_PASSWORD={shppa_...}
    ```
- Run scripts with the following command from the root directory: `npm run customers`

     Pass in the file names to run the different scripts. The correct order should be:
    1) `npm run customers`
    2) `npm run products`
    3) `npm run orders`

## Disclaimers
**Currently, Shopify limits requests to 250 records. If you need to migrate over more records, you will need to make recursive or paginated calls for each of the scripts**


### Products
- In order to switch over the image hosting from Shopify to Swell, you'll have to export the products and re-import them from your Swell store.
    1) Select **All products** from your Swell dashboard
    2) Select the checkboxes for the items you want to export
    3) Click **export** > CSV > Export
    4) Click **import** > Select the exported CSV > Ensure **Overwrite existing products** is selected > Upload. This will ensure your product images are hosted on Swell when you deactivate your Shopify store.



### Orders
- Ensure that your orders are unarchived before exporting.

### Customers
- Due to the limitations of Shopify's API, passwords cannot be migrated over.
- Credit card information is not transfered over with this script.
