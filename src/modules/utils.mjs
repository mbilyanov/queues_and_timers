// @private randomNumber(min, max) {{{1
function randomNumber(min, max){
    return Math.random() * (max - min) + min;
}
//}}}1

// @private Mock Ticker Object {{{1
const mockTickers = {
    get BTC_EUR() {
        let symbol = 'BTC/EUR';
        let timestamp = new Date().getTime();
        let last = randomNumber(2891.47, 3037.63);
        return { symbol, timestamp, last };
    },
    get ETH_EUR() {
        let symbol = 'ETH/EUR';
        let timestamp = new Date().getTime();
        let last = randomNumber(87.74, 97.44);
        return { symbol, timestamp, last };
    },
    get ZEC_EUR() {
        let symbol = 'ZEC/EUR';
        let timestamp = new Date().getTime();
        let last = randomNumber(35.59, 43.71);
        return { symbol, timestamp, last };
    },
    get LTC_EUR() {
        let symbol = 'LTC/EUR';
        let timestamp = new Date().getTime();
        let last = randomNumber(27.47, 28.93);
        return { symbol, timestamp, last };
    },
    get XMR_EUR() {
        let symbol = 'XMR/EUR';
        let timestamp = new Date().getTime();
        let last = randomNumber(36.82, 39.18);
        return { symbol, timestamp, last };
    },
    get DASH_EUR() {
        let symbol = 'DASH/EUR';
        let timestamp = new Date().getTime();
        let last = randomNumber(51.74, 58.23);
        return { symbol, timestamp, last };
    },
    get EOS_EUR() {
        let symbol = 'EOS/EUR';
        let timestamp = new Date().getTime();
        let last = randomNumber(1.67, 2.19);
        return { symbol, timestamp, last };
    },
    get ETC_EUR() {
        let symbol = 'ETC/EUR';
        let timestamp = new Date().getTime();
        let last = randomNumber(2.97, 3.42);
        return { symbol, timestamp, last };
    },
    get XLM_EUR() {
        let symbol = 'XLM/EUR';
        let timestamp = new Date().getTime();
        let last = randomNumber(0.06472, 0.07126);
        return { symbol, timestamp, last };
    },
    get XRP_EUR() {
        let symbol = 'XRP/EUR';
        let timestamp = new Date().getTime();
        let last = randomNumber(0.2597, 0.2669);
        return { symbol, timestamp, last };
    },
    get BTC_USD() {
        let symbol = 'BTC/USD';
        let timestamp = new Date().getTime();
        let last = randomNumber(3891.47, 4037.63);
        return { symbol, timestamp, last };
    },
    get ETH_USD() {
        let symbol = 'ETH/USD';
        let timestamp = new Date().getTime();
        let last = randomNumber(97.74, 117.44);
        return { symbol, timestamp, last };
    },
    get ZEC_USD() {
        let symbol = 'ZEC/USD';
        let timestamp = new Date().getTime();
        let last = randomNumber(45.59, 53.71);
        return { symbol, timestamp, last };
    },
    get LTC_USD() {
        let symbol = 'LTC/USD';
        let timestamp = new Date().getTime();
        let last = randomNumber(37.47, 48.93);
        return { symbol, timestamp, last };
    },
    get XMR_USD() {
        let symbol = 'XMR/USD';
        let timestamp = new Date().getTime();
        let last = randomNumber(46.82, 59.18);
        return { symbol, timestamp, last };
    },
    get DASH_USD() {
        let symbol = 'DASH/USD';
        let timestamp = new Date().getTime();
        let last = randomNumber(61.74, 78.23);
        return { symbol, timestamp, last };
    },
    get EOS_USD() {
        let symbol = 'EOS/USD';
        let timestamp = new Date().getTime();
        let last = randomNumber(2.67, 3.19);
        return { symbol, timestamp, last };
    },
    get ETC_USD() {
        let symbol = 'ETC/USD';
        let timestamp = new Date().getTime();
        let last = randomNumber(3.97, 4.42);
        return { symbol, timestamp, last };
    },
    get XLM_USD() {
        let symbol = 'XLM/USD';
        let timestamp = new Date().getTime();
        let last = randomNumber(0.08472, 0.09126);
        return { symbol, timestamp, last };
    },
    get XRP_USD() {
        let symbol = 'XRP/USD';
        let timestamp = new Date().getTime();
        let last = randomNumber(0.2897, 0.2969);
        return { symbol, timestamp, last };
    }
};
//}}}1

/* ES6 EXPORTS */

// @public queryMockTickers(symbol) {{{1
export const queryMockTickers = (symbol) => {
    let _symbol = symbol.replace('/', '_');
    console.log('__CALLED__');
    // Promisify the request.
    return new Promise((resolve, reject) => {
        try {
            // Emulate an asynchronous fetch.
            setTimeout(() => {
                let result;
                try {
                    result = mockTickers[_symbol];
                    if(result==undefined){
                        let message = `Ticker [${_symbol}] is NOT found.`;
                        let error = {};
                        error['exception'] = new Error(message, 'TickerNotFound');
                        error['symbol'] = _symbol;
                        reject(error);
                    }else{
                        resolve(result);
                    }
                } catch (error) {
                    reject(error);
                }
            }, randomNumber(2000, 8000));
        } catch(error) {
            reject(error);
        }
    });
}
//}}}1

// @public sleep {{{1
export const sleep = (ms) => {
    return new Promise (function(resolve, reject) {
        setTimeout(function(){
            console.log('[DELAYED_PROCESS] completed.');
            resolve('data_stream');
        }, ms);
    });
}
// }}}1

// vim: fdm=marker ts=4
