# Email Invoices After Checkout
Learn how you can email invoices to your customers after checking out with Rapyd in a single integration offering.

## What do you need to start
- Rapyd Account (https://dashboard.rapyd.net/sign-up)
- Mailgun Account [https://login.mailgun.com/login/](https://signup.mailgun.com/)
- Node.js and npm
## How to run the sample application
- Log in to your Rapyd account
- Make sure you are using the panel in "sandbox" mode (switch in the bottom left part of the panel)
- Go to the "Developers" tab. You will find your API keys there. Copy them to the version of your sample application of your choice
- Go to the ["API Keys"](https://app.mailgun.com/app/account/security/api_keys) page in Mailgun and grab your API key, sending domain, and sender email from there
- Create a `.env` file at the root of your project and paste the following env variables in it:
```env
RAPYD_ACCESS_KEY=
RAPYD_SECRET_KEY=
MAILGUN_API_KEY=
MAILGUN_DOMAIN=
MAILGUN_SENDER_EMAIL=
```
- Add your recipient email in the the "Authorized Recipients" list on the [Domains page](https://app.mailgun.com/app/sending/domains) > your sending domain in Mailgun OR make sure to use the email associated with your Mailgun account when testing the application
- Run the application with the `npm start` command

## Get Support 
- https://community.rapyd.net 
- https://support.rapyd.net 
