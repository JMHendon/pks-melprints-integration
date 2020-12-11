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

/** All Headers **/
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', ['https://maropost-web-app-3.onrender.com', 'http://maropost-web-app-3.onrender.com']);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Authorization, Accept');
    res.setHeader('Access-Control-Allow-Credentials', true);
    return next();
});

/** PKS USES URL Encoded Format - This app will not read straight JSON **/
app.use(express.urlencoded({ extended: true }));

/** If we want to send orders directly from PKS to MelPrints - Currently set up only for EKC F+S, but could be set for others. For now, will do this through Maropost then back through separate app below. **/
app.post('/send-order-to-melprints', async function(req,res) {

  let pks_event = req.body.event;
  let pks_mode = req.body.mode;
    
  let buyer_first_name = (req.body.buyer_first_name !== undefined) ? req.body.buyer_first_name : ''; 
  let buyer_last_name = (req.body.buyer_last_name !== undefined) ? req.body.buyer_last_name : ''; 
  let buyer_email = (req.body.buyer_email !== undefined) ? req.body.buyer_email : ''; 
  let buyer_phone_number = (req.body['custom_shipping-phone-number'] !== undefined) ? req.body['custom_shipping-phone-number'] : ''; 
  let shipping_line_1 = (req.body.shipping_address_1 !== undefined) ? req.body.shipping_address_1 : ''; 
  let shipping_line_2 = (req.body.shipping_address_2 !== undefined) ? req.body.shipping_address_2 : ''; 
  let shipping_city = (req.body.shipping_city !== undefined) ? req.body.shipping_city : ''; 
  let shipping_state = (req.body.shipping_state !== undefined) ? req.body.shipping_state : ''; 
  let shipping_zip = (req.body.shipping_zip !== undefined) ? req.body.shipping_zip : ''; 
  let shipping_country = (req.body.shipping_country !== undefined) ? req.body.shipping_country : ''; 
  let product_quantity = (req.body.quantity !== undefined) ? req.body.quantity : 1;

  if (shipping_country === 'US' || !shipping_country) {
    var ship_method = 'usps_media';
  } else {
    var ship_method = 'intl_door_to_door';
  }

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
        },
      'shipMethod': ship_method,
      'LineItems': [
        {
          'productSku': product_SKU,
          'productQty': product_quantity
        }
      ]
    }
  }

  let confirmation_email_data = {
    'email_recipient': 'hidohebhi@gmail.com',
    'product': product_SKU,
    'subject': 'Order successfully posted to MelPrints',
    'body_of_email': 'The order for ' + buyer_first_name + ' of ' + product_SKU + ' has been posted successfully to Melprints.'
  }
  
  let post_order_to_MelPrints = async (body) => {
      if (body) {
        return post_to_MelPrints(body,send_confirmation_email,confirmation_email_data);
      } else {
        return 'Missing Body Data.';
      }
  }

  if ( pks_event !== 'sales' || pks_mode !== 'test') {
    console.log('This was not a sales event or it was not live.');
  } else if ( product_SKU == '') {
    console.log('Unknown or blank product SKU.');
  } else if ( product_quantity < 1) {
    console.log('Insufficient Quantity.');
  } else if ( !buyer_first_name || !buyer_last_name || !buyer_email || !shipping_line_1 || !shipping_city || !shipping_zip || !shipping_country ) {
    console.log(`${buyer_first_name} - ${buyer_last_name} - ${buyer_email} - ${shipping_line_1} - ${shipping_city} - ${shipping_zip} - ${shipping_country}`);
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

  let axios_Object_Data2 = {
    method: 'post',
    url: 'https://webhook.site/76f30f3d-e7f0-4471-85f4-7891aa4ca43b',
    headers: all_http_headers,
    data: body
};
  axios(axios_Object_Data2);

  return axios(axios_Object_Data)
  .then( async response => {
    const jsonResponse = await response;
      const response_code = jsonResponse.status;
      if (response_code >= 200 && response_code < 300 ) {
        callback_function(callback_function_body);
      };
      return response_code;
  })
  .catch( error => {
      return new OperationResult(null, error);
  });

};

/** App for Putting PKS Contact Info (like Address) into Maropost */
app.post('/pks-order-to-maropost-update-or-create-contact', async function (req, res) {

  let pks_event = req.body.event;
  let pks_mode = req.body.mode;
    
  let buyer_first_name = (req.body.buyer_first_name !== undefined) ? req.body.buyer_first_name : ''; 
  let buyer_last_name = (req.body.buyer_last_name !== undefined) ? req.body.buyer_last_name : ''; 
  let buyer_email = (req.body.buyer_email !== undefined) ? req.body.buyer_email : ''; 
  let buyer_phone_number = (req.body['custom_shipping-phone-number'] !== undefined) ? req.body['custom_shipping-phone-number'] : ''; 
  let shipping_address1 = (req.body.shipping_address_1 !== undefined) ? req.body.shipping_address_1 : ''; 
  let shipping_address2 = (req.body.shipping_address_2 !== undefined) ? req.body.shipping_address_2 : ''; 
  let shipping_city = (req.body.shipping_city !== undefined) ? req.body.shipping_city : ''; 
  let shipping_state = (req.body.shipping_state !== undefined) ? req.body.shipping_state : ''; 
  let shipping_zip = (req.body.shipping_zip !== undefined) ? req.body.shipping_zip : ''; 
  let shipping_country = (req.body.shipping_country !== undefined) ? req.body.shipping_country : '';
  
  let billing_address1 = (req.body.billing_address_1 !== undefined) ? req.body.billing_address_1 : ''; 
  let billing_address2 = (req.body.billing_address_2 !== undefined) ? req.body.billing_address_2 : ''; 
  let billing_city = (req.body.billing_city !== undefined) ? req.body.billing_city : ''; 
  let billing_state = (req.body.billing_state !== undefined) ? req.body.billing_state : ''; 
  let billing_zip = (req.body.billing_zip !== undefined) ? req.body.billing_zip : ''; 
  let billing_country = (req.body.billing_country !== undefined) ? req.body.billing_country : ''; 

  let contact_info = {
    'first_name': buyer_first_name,
    'last_name': buyer_last_name,
    'email': buyer_email,
    'custom_field': {
      'phone': buyer_phone_number,
      'shipping_address1': shipping_address1,
      'shipping_address2': shipping_address2,
      'shipping_city': shipping_city,
      'shipping_state': shipping_state,
      'shipping_zip': shipping_zip,
      'shipping_country': shipping_country,
      'billing_address1': billing_address1,
      'billing_address2': billing_address2,
      'billing_city': billing_city,
      'billing_state': billing_state,
      'billing_zip': billing_zip,
      'billing_country': billing_country
    }
  };

  console.log(contact_info);

  async function add_or_update_response () {
    
    console.log(add_or_update_response);
  };

  let result = await await add_or_update_contact_in_maropost(buyer_email,contact_info);

  if (result.isSuccess) {
    let myReports = result.data;
    return res.send(myReports);
  } else {
    return "Request Failed";
  }

  
})

/** Function to Add or Update Contact in Maropost - Depending on if Exists **/

const add_or_update_contact_in_maropost = async (email_address, contact_data_object) => {
  
  const delayed_get_and_update_function = async () => {
    let contact_info_object = await get_contact_info(email_address);
    console.log(contact_info_object);
    let contact_ID = contact_info_object.data.id;
    console.log(contact_ID);

    if (contact_ID) {
      return update_contact_in_maropost(contact_ID,contact_data_object);    
    } else {
      return add_contact_to_maropost(contact_data_object);
    }
  }
  
  return delayed_get_and_update_function();

}

/** General Function to Get Contact Info By Email **/

const get_contact_info = async (email_address) => {
  let mp_get_contact_info_url = 'https://api.maropost.com/accounts/2264/contacts/email.json?contact[email]=' + email_address + '&auth_token='+process.env.mp_auth_token;

  let axios_get_contact_input_data = {
    method: 'get',
    url: mp_get_contact_info_url,
    headers: all_http_headers
  };

  return axios(axios_get_contact_input_data)
  .then( async response => {
    const jsonResponse = await response;
    console.log(jsonResponse);
    console.log(jsonResponse.data);
    console.log(jsonResponse.data.id);
    return jsonResponse;
  })
  .catch( error => {
      return new OperationResult(null, error);
  });

}

/** General Function to Add Contact to Maropost (without specifying list) **/

const add_contact_to_maropost = (contact_data_object) => {
    
  let mp_add_contact_url = 'https://api.maropost.com/accounts/2264/contacts.json?auth_token='+process.env.mp_auth_token;

  let axios_Object_Data = {
      method: 'post',
      url: mp_add_contact_url,
      headers: all_http_headers,
      data: contact_data_object
  };

  return axios(axios_Object_Data)
  .then( async response => {
    const jsonResponse = await response;
      console.log(jsonResponse);
      console.log(jsonResponse.data);
      return jsonResponse;
  })
  .catch( error => {
      return new OperationResult(null, error);
  });

}

/** General Function to Update Contact in Maropost (without specifying list) **/

const update_contact_in_maropost = (uid,contact_data_object) => {
    
  let mp_update_contact_url = 'https://api.maropost.com/accounts/2264/contacts/' + uid + '.json?auth_token='+process.env.mp_auth_token;

  let axios_Object_Data = {
      method: 'put',
      url: mp_update_contact_url,
      headers: all_http_headers,
      data: contact_data_object
  };

  console.log(axios_Object_Data);

  return axios(axios_Object_Data)
  .then( async response => {
    const jsonResponse = await response;
      console.log(jsonResponse);
      console.log(jsonResponse.data);
      return jsonResponse;
  })
  .catch( error => {
      return new OperationResult(null, error);
  });

}










/** Sends emails from Jeremy@Nourishing.group **/
let send_confirmation_email = (email_data) => {

  var mailOptions = {
    from: process.env.gmail_user_name,
    to: email_data.email_recipient,
    subject: email_data.subject,
    text: email_data.body_of_email
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



// [function to send email on error]

// [Also - need other file to capture shipping confirmations - or could do it here]

// [create full list for product_name - of other products]

app.listen(port, () => console.log(`PKS-MelPrints Integration listening on port ${port}!`));