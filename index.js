// import the required dependencies
require('dotenv').config({path: './.env'});
const express = require('express')
const storage = require('node-persist');
var mailgun = require('mailgun-js')({apiKey: process.env.MAILGUN_API_KEY, domain: process.env.MAILGUN_DOMAIN});

// import the utility file for making requests to the Rapyd API
const makeRequest = require('./utils').makeRequest;

storage.init()
const app = express()

// set the port
const port = 3000

// variables
const planId = "<your-plan-id>"

//set the render engine
app.set("view engine", "ejs")

// parse application/json
app.use(express.json())

//Add routes here
// Route to query the plan and return plan+product details
app.get('/', async (req, res) => {
    try {
   	 const { body: { data } } = await makeRequest('GET', `/v1/plans/${planId}`);

   	 await storage.setItem('productPrice', data.amount)

   	 res.render('product', {
   		 title: data.product.name,
   		 price: data.amount,
   		 description: data.product.description,
   		 image: data.product.images[0]
   	 })
    } catch (error) {
   	 console.log(error)
    }
})

// Route to receive client details and create a customer on Rapyd
app.post('/', async (req, res) => {
    //create a customer using the payment details from the request body
    try {
    const body = {
      name: req.body.customerDetails.name,
      email: req.body.customerDetails.email,
      phone_number: req.body.customerDetails.phone,
      payment_method: {
   	 type: 'us_debit_visa_card',
   	 fields: {
 		 number: req.body.customerDetails.cardNo,
 		 expiration_month: req.body.customerDetails.cardExpMonth,
 		 expiration_year: req.body.customerDetails.cardExpYear,
 		 cvv: req.body.customerDetails.cardCVV
   	 }
      }
    }
    const { body: { data } }  = await makeRequest('POST', '/v1/customers', body)

    await storage.setItem('customerId', data.id)
    await storage.setItem('defaultPaymentMethod', data.default_payment_method)
    await storage.setItem('customerEmail', data.email)

    res.status(200).json({ success: true })

    } catch (error) {
      console.log(error)
    }
})

// Route to create a checkout page and return the checkout ID to the client
app.get('/checkout', async (req, res) => {
    let customerId = await storage.getItem('customerId')
    let productPrice = await storage.getItem('productPrice')
    
    try {
   	 const body = {
 		 amount: productPrice,
 		 country: 'US',
 		 currency: 'USD',
 		 customer: customerId,
 		 language: 'en',
 		 expiration: 1704019927,
   	 };

   	 const { body: { data }} = await makeRequest('POST', '/v1/checkout', body);
 
   	 res.render('checkout', {
 		 checkoutId: data.id
      })
    
      } catch (error) {
   	 console.error('Error completing request', error);
      }
})

app.get('/verification', async (req, res) => {
    let customerId = await storage.getItem('customerId')
    let defaultPaymentMethod = await storage.getItem('defaultPaymentMethod')

    // Create subscription
    try {
   	 const subscriptionBody = {
 		 customer: customerId,
 		 billing: 'pay_automatically',
 		 billing_cycle_anchor: '',
 		 cancel_at_period_end: true,
 		 coupon: '',
 		 days_until_due: null,
 		 payment_method: defaultPaymentMethod,
 		 subscription_items: [
   		 {
     		 plan: planId,
     		 quantity: 1
   		 }
 		 ],
 		 tax_percent: 10.5,
 		 plan_token: ''
   	 };

   	 const { body: { data }} = await makeRequest('POST', '/v1/payments/subscriptions', subscriptionBody);

   	 await storage.setItem('subscriptionId', data.id)
  	 
   	 // create invoice
   	 try {
   		 let subscriptionId = await storage.getItem('subscriptionId')
   		 const invoiceBody = {
     		 customer: customerId,
     		 billing: 'pay_automatically',
     		 days_until_due: null,
     		 description: '',
     		 due_date: 0,
     		 metadata: {
       		 merchant_defined: true
     		 },
     		 statement_descriptor: '',
     		 subscription: subscriptionId,
     		 tax_percent: '',
     		 currency: 'USD'
   		 };
   		 const { body: { data }} = await makeRequest('POST', '/v1/invoices', invoiceBody);

   		 await storage.setItem('invoiceId', data.id)
  	 
   		 console.log(data);

   		 // create invoice items
   		 try {
       		 let customerId = await storage.getItem('customerId')
       		 let invoiceId = await storage.getItem('invoiceId')
       		 let subscriptionId = await storage.getItem('subscriptionId')

       		 const invoiceItemBody = {
         		 currency: 'USD',
         		 customer: customerId,
         		 invoice: invoiceId,
         		 plan: planId,
         		 metadata: {
           		 merchant_defined: true
         		 },
         		 amount: 1150
       		 };
       		 const { body: { data }} = await makeRequest('POST', '/v1/invoice_items', invoiceItemBody);
  		 
       		 console.log(data);
     		 } catch (error) {
       		 console.error('Error completing request', error);
     		 }
 		 } catch (error) {
   		 console.error('Error completing request', error);
 		 }
 		 } catch (error) {
   	 console.error('Error completing request', error);
      }

    // finalize invoice
    let invoiceId = await storage.getItem('invoiceId')
    try {
   	 const { body: { data }} = await makeRequest(
 		 'POST',
 		 `/v1/invoices/${invoiceId}/finalize`
   	 );
    
   	 console.log(data);

   	 res.render('verification', {
   		 authLink: data.payment.redirect_url
   	 })

      } catch (error) {
   	 console.error('Error completing request', error);
      }
})

// Retrieve invoice, line items => return line items to client
app.get('/invoice', async (req, res) => {
    let custEmail = await storage.getItem('customerEmail')

    let item
    let quantity
    let subTotal
    let tax
    let total
    let status

    // retrieve invoice
    try {
   	 let invoiceId = await storage.getItem('invoiceId')

   	 console.log(invoiceId)

   	 const { body: { data }} = await makeRequest(
 		 'GET',
 		 `/v1/invoices/${invoiceId}`
   	 );

   	 console.log(data)

   	 quantity = data.lines.length
   	 subTotal = data.subtotal
   	 tax = data.tax
   	 total = data.total
   	 status = data.status

   	 // retrieve subscription
   	 try {
   		 const subscriptionId = await storage.getItem('subscriptionId')
   		 const { body: { data }} = await makeRequest(
     		 'GET',
     		 `/v1/payments/subscriptions/${subscriptionId}`
   		 );
  	 
   		 item = data.subscription_items.data[0].plan.product.name;

   		 // console.log(data.subscription_items.data[0].plan.product)

 		 } catch (error) {
   		 console.error('Error completing request', error);
 		 }
      } catch (error) {
   	 console.error('Error completing request', error);
      }

      // send email
      let invoiceId = await storage.getItem('invoiceId')
      var data = {
      from: `Monthly Booking Services <${process.env.MAILGUN_SENDER_EMAIL}>`,
      to: custEmail,
      subject: 'Monthly Booking Services Invoice',
      html: `<h1>Monthly Booking Services</h1><h3>Your Invoice ID: ${invoiceId}</h3><p>Item: ${item}</p><p>Quantity: ${quantity}</p><p>Tax: ${tax}</p><p>Total: ${total}</p><p>Invoice status: ${status}</p>`
      };
	 
      mailgun.messages().send(data, function (error, body) {
   	 if(error){
 		 console.log(error)
   	 }
      console.log(body);
      });

      res.render('invoice', {
   	 item,
   	 quantity,
   	 subTotal,
   	 tax,
   	 total,
   	 status,
   	 custEmail
      })
})


app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
  })
