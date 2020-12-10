const express = require('express');
const app = express();
const port = process.env.PORT || 3001;

const axios = require('axios');

const nodemailer = require('nodemailer');
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.gmail_user_name,
    pass: process.env.gmail_app_password
  }
});

const all_http_headers = {
    "Content-type": "application/json",
    "Accept": "application/json"
}

app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', ['https://maropost-web-app-3.onrender.com', 'http://maropost-web-app-3.onrender.com']);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Authorization, Accept');
    res.setHeader('Access-Control-Allow-Credentials', true);
    return next();
});

app.use(express.json());

// const { createLogger, transports, format } = require('winston');

// const logger = createLogger({
//   format: format.combine(
//     format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
//     format.printf(info => `${info.timestamp} ${info.level}: ${info.message}`)
//   ),
//   transports: [
//     new transports.File({
//       filename: 'temp-logs.txt',
//       json: false,
//       maxsize: 5242880,
//       maxFiles: 5,
//     }),
//     new transports.Console(),
//   ]
// });

app.post('/send-order-to-melprints', async function(req,res) {

  console.log("string as argument one", req)

  let pks_event = req.query.event;
  let pks_mode = req.query.mode;

  console.log(pks_event);
  console.log(pks_mode);
    
  let buyer_first_name = (req.body.buyer_first_name !== undefined) ? req.body.buyer_first_name : ''; 
  let buyer_last_name = (req.body.buyer_last_name !== undefined) ? req.body.buyer_last_name : ''; 
  let buyer_email = (req.body.buyer_email !== undefined) ? req.body.buyer_email : ''; 
  let buyer_phone_number = (req.body.buyer_phone !== undefined) ? req.body.buyer_phone : ''; 
  let shipping_line_1 = (req.body.shpping_address_1 !== undefined) ? req.body.shpping_address_1 : ''; 
  let shipping_line_2 = (req.body.shpping_address_2 !== undefined) ? req.body.shpping_address_2 : ''; 
  let shipping_city = (req.body.shipping_city !== undefined) ? req.body.shipping_city : ''; 
  let shipping_state = (req.body.shipping_state !== undefined) ? req.body.shipping_state : ''; 
  let shipping_zip = (req.body.shipping_zip !== undefined) ? req.body.shipping_zip : ''; 
  let shipping_country = (req.body.shiping_country !== undefined) ? req.body.shiping_country : ''; 
  let ship_method = (req.body.buyer_phone !== undefined) ? req.body.buyer_phone : 'usps_media'; 
  let product_quantity = (req.body.quantity !== undefined) ? req.body.quantity : 0;

  let array_of_PKS_product_names = [
    ''
  ];

  switch (req.body.product_name) {
    case 'Keto Ckbk Shipping (EKC)':
      var product_SKU = 'jl_essential_keto_cookbook';
      break;
    default:
      var product_SKU = '';
  }

  
  let post_data = {
      'APIKey': process.env.APIKey,
      'sandbox': 'yes',
      'Order': {
          'deliveryContact': {
              'firstName': buyer_first_name,
              'lastName': buyer_last_name,
              'email': buyer_email,
              'phone': buyer_phone_number,
              'addressLine1': shipping_line_1,
              'addressLine2': shipping_line_2,
              'city': shipping_city,
              'state': shipping_state,
              'zip': shipping_zip,
              'country': shipping_country
          }
      },
      'shipMethod': ship_method,
      'LineItems': {
          'productSku': product_SKU,
          'productQty': product_quantity
      }
  }

  let confirmation_email_body = {
    'product': product_SKU,
    'subject': 'Order successfully posted to MelPrints',
    'body': 'The order for ' & buyer_first_name & ' of ' & product_SKU & ' has been posted successfully to Melprints.'
  }
  
  let post_order_to_MelPrints = async (body) => {
      if (body) {
        return post_to_MelPrints(body,send_confirmation_email,confirmation_email_body);
      } else {
        return 'Missing Body Data.';
      }
  }

  if ( pks_event !== 'sales' || pks_mode !== 'test') {
    console.log('This was not a sales event or it was not live.');
  } else if ( productSku == '') {
    console.log('Unknown or blank product SKU.');
  } else if ( product_quantity < 1) {
    console.log('Insufficient Quantity.');
  } else if ( empty(buyer_first_name) || empty(buyer_last_name) || empty(buyer_email) || empty(shipping_line_1) || empty(shipping_city) || empty(shipping_country)) {
    console.log('Missing vital shipping information');
  } else {
    res.send(post_order_to_MelPrints(post_data));
  };

});

const post_to_MelPrints = (body, callback_function,callback_function_body) => {
  let melprints_API_URL = process.env.MelPrints_API_URL;

  let axios_Object_Data = {
      method: 'post',
      url: melprints_API_URL,
      headers: all_http_headers,
      data: body
  };

  return axios(axios_Object_Data)
  .then( async response => {
    const jsonResponse = await response;
      const data = jsonResponse.data;
      const response_code = jsonResponse.status;
      console.log(response_code);
      console.log(data);
      console.log("end of log from app.js response");
      if (response_code >= 200 && response_code < 300 ) {
        callback_function(callback_function_body);
      };
      return data;
  })
  .catch( error => {
      return new OperationResult(null, error);
  });

};

let send_confirmation_email = (confirmation_email_body) => {

  var mailOptions = {
    from: process.env.gmail_user_name,
    to: 'hidohebhi@gmail.com',
    subject: confirmation_email_body.subject,
    text: confirmation_email_body.body
  };
  
  transporter.sendMail(mailOptions, function(error, info){
    if (error) {
      console.log(error);
    } else {
      console.log('Email sent: ' + info.response);
    }
  });

};

class OperationResult {
    
    /**
     * Constructor
     * 
     * @param {object|null} apiResponse
     * @param {string|null} errorMessage
     */
    constructor(apiResponse = null, errorMessage = null) {
      if (!apiResponse) {
        this.isSuccess = false;
        this.errorMessage = errorMessage;
      }
      else {
        const statusCode = apiResponse.status
        const body = (apiResponse.data) ? apiResponse.data : null
        this.data = body;
        this.errorMessage = (this.errorMessage) ? this.errorMessage : (body && body.error) ? body.error : '';
        if (statusCode >= 200 && statusCode < 300) {
          this.isSuccess = (this.errorMessage.length == 0);
        }
        else {
          this.isSuccess = false;
          if (!this.errorMessage) {
            if (body.message) {
              this.errorMessage = body.message;
            }
            else if (statusCode >= 500) {
              this.errorMessage = statusCode + ': MelPrints experienced a server error and could not complete your request.';
            }
            else if (statusCode >= 400) {
              this.errorMessage = statusCode + ': Either your authToken or one (or more) of your function arguments are invalid.';
            }
            else if (statusCode >= 300) {
              this.errorMessage = statusCode + ': This MelPrints API function is currently unavailable.';
            }
            else {
              this.errorMessage = statusCode + ': Unexpected final response from MelPrints.';
            }
          }
        }
      }
    }
}



// [add 10 minute delay]

// [function to send email on error]

// [Also - need other file to capture shipping confirmations?]

// [capture custom field for phone number - with new conditional]

// [create full array for product_name]

// [for app.post, send back to somewhere else other than PKS? Send confirmation email?]

app.listen(port, () => console.log(`PKS-MelPrints Integration listening on port ${port}!`));
