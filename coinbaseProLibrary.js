/*
*   The official coinbase-pro library (https://www.npmjs.com/package/coinbase-pro) has been deprecated as of January 16th, 2020. 
*   The coinbase-pro library still works but it doesn't support all of the API endpoints being used by this project. As a work 
*   around, this file will create a library that supports those other methods needed for this bot to run. 
*/

const crypto = require("crypto");
const axios = require("axios");

/**
 * Class: This class creates an easy way to create methods to call API endpoints. It stores
 * the needed information upon construction and provides a method to sign messages. Which
 * can then be used to create more endpoint calling methods.
 */
class coinbaseProLib {
    /**
     * Summary: constructs an instance of this class that can be used to make the API endpoint calls
     * 
     * @param {string} apiKey 
     * @param {string} apiSecret 
     * @param {string} apiPassphrase 
     * @param {string} apiURI 
     */
    constructor(apiKey, apiSecret, apiPassphrase, apiURI) {
        this.apiKey = apiKey;
        this.apiSecret = apiSecret;
        this.apiPassphrase = apiPassphrase;
        this.apiURI = apiURI;
    }

    /**
     * Creates the CB-ACCESS-SIGN header needed for executing a coinbase pro REST API endpoint call.
     * 
     * @param {string} method 
     * @param {string} requestPath 
     * @param {string} body 
     */
    async signMessage(method, requestPath, body) {
        try {
            if (method == null || requestPath == null) {
                throw new Error("Error in signMessage method, method or requestPath is null!");
            }
    
            const timestamp = Date.now() / 1000;
    
            let what;
    
            if (body == null) {
                what = timestamp + method + requestPath;
            } else {
                what = timestamp + method + requestPath + JSON.stringify(body);
            }
    
            // decode the base64 secret
            const key = Buffer.from(this.apiSecret, 'base64');
    
            // create a sha256 hmac with the secret
            const hmac = crypto.createHmac('sha256', key);
    
            // sign the require message with the hmac
            // and finally base64 encode the result
            const result = hmac.update(what).digest('base64');

            return result;
        } catch (err) {
            const message = "Error occured in signMessage method.";
            const errorMsg = new Error(err);
            console.log({ message, errorMsg, err });
        }
    }

    /**
     * Calls the endpoint /profiles to get a list of the avaiable portfolio (profile) IDs for the account
     * Check the documentation for more information on this endpoint.
     * 
     * Since this library has been suffering from the occasional 401 unauthorized response, it will re-attempt methods 3 times when this occurs.
     * Re-attempts: 3
     */
    async getProfiles() {
        let attempts = 0;
        let completed = false;
        while (attempts < 3 && completed === false) {
            try {
                const method = "GET";
                const requestPath = "/profiles";
                const body = null;
                const timestamp = Date.now() / 1000;
    
                const sign = await this.signMessage(method, requestPath, body);
    
                const headers = {
                    "CB-ACCESS-KEY": this.apiKey,
                    "CB-ACCESS-SIGN": sign,
                    "CB-ACCESS-TIMESTAMP": timestamp,
                    "CB-ACCESS-PASSPHRASE": this.apiPassphrase
                };
    
                const fullpath = this.apiURI + requestPath;
    
                const result = await axios.get(fullpath, {headers});
    
                return result.data;
            } catch (err) {
                if (err.response.status === 401) {
                    attempts++;
                    console.log("Error 401 occurred in getProfiles method, re-attempting execution. Attempts: " + attempts);
                } else {
                    const message = "Error occured in getProfiles method.";
                    const errorMsg = new Error(err);
                    console.log({ message, errorMsg, err });
                    completed = true;
                }
            }
        }
    }

    /**
     * Calls the /profiles/transfer endpoint that will let you transfer some currency from one profile to another.
     * The fromProfileID must be the profile linked to the API key provided, this is where the funds are sourced.
     * Check the coinbase pro api docs for more information on the restrictions around this endpoint.
     * 
     * @param {string} fromProfileID 
     * @param {string} toProfileID 
     * @param {string} currency 
     * @param {string} amount 
     * 
     * Since this library has been suffering from the occasional 401 unauthorized response, it will re-attempt methods 3 times when this occurs.
     * Re-attempts: 3
     */
    async profileTransfer(fromProfileID, toProfileID, currency, amount) {
        let attempts = 0;
        let completed = false;
        while (attempts < 3 && completed === false) {
            try {
                const method = "POST";
                const requestPath = "/profiles/transfer";
                const body = {
                    from: fromProfileID,
                    to: toProfileID,
                    currency,
                    amount,
                };
    
                const timestamp = Date.now() / 1000;
    
                const sign = await this.signMessage(method, requestPath, body);
    
                const headers = {
                    "CB-ACCESS-KEY": this.apiKey,
                    "CB-ACCESS-SIGN": sign,
                    "CB-ACCESS-TIMESTAMP": timestamp,
                    "CB-ACCESS-PASSPHRASE": this.apiPassphrase
                };
    
                const fullpath = this.apiURI + requestPath;
    
                const result = await axios.post(fullpath, body, {headers});
    
                return result.data;
            } catch (err) {
                if (err.response.status === 401) {
                    attempts++;
                    console.log("Error 401 occurred in profileTransfer method, re-attempting execution. Attempts: " + attempts);
                } else {
                    const message = "Error occured in profileTransfer method.";
                    const errorMsg = new Error(err);
                    console.log({ message, errorMsg, err });
                }
            }
        }
    }
}

module.exports = coinbaseProLib;