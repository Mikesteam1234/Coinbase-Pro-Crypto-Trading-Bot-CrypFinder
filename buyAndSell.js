/**
 * Halts the program from running temporarily to prevent it from hitting API call limits
 * 
 * @param {number} ms -> the number of miliseconds to wait 
 */
function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
} 

/**
 * 
 * @param {*} btcSize 
 * @param {*} accountIds 
 * @param {*} updatedPositionInfo 
 * @param {*} currentPrice 
 * @param {*} orderPriceDelta 
 * @param {*} authedClient 
 * @param {*} coinbaseLibObject 
 * @param {*} productPair 
 * @param {*} product2 
 */
async function sellPosition(btcSize, accountIds, updatedPositionInfo, currentPrice, orderPriceDelta, authedClient, coinbaseLibObject, productPair, product2) {
    try {
        const priceToSell = currentPrice - (currentPrice * orderPriceDelta);

        const orderParams = {
            side: "sell",
            price: priceToSell.toFixed(2), 
            size: btcSize.toFixed(8),
            product_id: productPair,
        };

        const order = await authedClient.placeOrder(orderParams);
        const orderID = order.id;

        //Loop to wait for order to be filled:
        for (let i = 0; i < 10 && updatedPositionInfo.positionExists === true; ++i) {
            await sleep(6000);
            const orderDetails = await authedClient.getOrder(orderID);

            if (orderDetails.status === "done") {
                if (orderDetails.done_reason !== "filled") {
                    throw new Error("Sell order did not complete due to being filled? done_reason: " + orderDetails.done_reason);
                } else {
                    updatedPositionInfo.positionExists = false;

                    let profit = parseFloat(orderDetails.executed_value) - parseFloat(orderDetails.fill_fees) - updatedPositionInfo.positionAcquiredCost;

                    if (profit > 0) {
                        const transferAmount = (profit * .4).toFixed(2);
                        const currency = product2;

                        //transfer funds to depositProfileID
                        const transferResult = await coinbaseLibObject.profileTransfer(accountIds.tradeProfileID, accountIds.depositProfileID, currency, transferAmount);
                        
                        console.log(transferResult);
                    } else {
                        throw new Error("Sell was not profitable, terminating program. profit: " + profit);
                    }
                }
            }

            if (updatedPositionInfo.positionExists === true) {
                const cancelOrder = await authedClient.cancelOrder(orderID);
                if (cancelOrder !== orderID) {
                    throw new Error("Attempted to cancel failed order but it did not work. cancelOrderReturn: " + cancelOrder + "orderID: " + orderID);
                }
            }
        }
    } catch (err) {
        const message = "Error occured in sellPosition method.";
        const errorMsg = new Error(err);
        console.log({ message, errorMsg, err });
    }
}

/**
 * 
 * @param {*} usdBalance 
 * @param {*} updatedPositionInfo 
 * @param {*} takerFee 
 * @param {*} currentPrice 
 * @param {*} orderPriceDelta 
 * @param {*} authedClient 
 * @param {*} productPair 
 */
async function buyPosition(usdBalance, updatedPositionInfo, takerFee, currentPrice, orderPriceDelta, authedClient, productPair) {
    try {
        const amountToSpend = usdBalance - (usdBalance * takerFee);
        const priceToBuy = currentPrice + (currentPrice * orderPriceDelta);
        const orderSize = amountToSpend / priceToBuy;

        const orderParams = {
            side: "buy",
            price: priceToBuy.toFixed(2), 
            size: orderSize.toFixed(8), 
            product_id: productPair,
        };

        const order = await authedClient.placeOrder(orderParams);
        const orderID = order.id;

        //Loop to wait for order to be filled:
        for (let i = 0; i < 10 && updatedPositionInfo.positionExists === false; ++i) {
            await sleep(6000);
            const orderDetails = await authedClient.getOrder(orderID);

            if (orderDetails.status === "done") {
                if (orderDetails.done_reason !== "filled") {
                    throw new Error("Buy order did not complete due to being filled? done_reason: " + orderDetails.done_reason);
                } else {
                    updatedPositionInfo.positionExists = true;
                    updatedPositionInfo.positionAcquiredPrice = parseFloat(orderDetails.executed_value) / parseFloat(orderDetails.filled_size);
                    updatedPositionInfo.positionAcquiredCost = parseFloat(orderDetails.executed_value)  + parseFloat(orderDetails.fill_fees);
                }
            }
        }

        if (updatedPositionInfo.positionExists === false) {
            const cancelOrder = await authedClient.cancelOrder(orderID);
            if (cancelOrder !== orderID) {
                throw new Error("Attempted to cancel failed order but it did not work. cancelOrderReturn: " + cancelOrder + "orderID: " + orderID);
            }
        }
    } catch (err) {
        const message = "Error occured in buyPosition method.";
        const errorMsg = new Error(err);
        console.log({ message, errorMsg, err });
    }
}

module.exports = {
    sellPosition,
    buyPosition,
}