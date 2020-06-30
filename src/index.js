// This project is based on the following case-study by "Before Semicolon":
// "Queue Implementation in Javascript + printer network + promise sequential asynchronous task."
// https://youtu.be/e7q2ovWtf-g

import { queryMockTickers, sleep } from './modules/utils.mjs';

// Queue {{{1
class Queue {
    #list = [];
    #capacity = null;

    constructor(capacity) {
        this.#capacity = Math.max(Number(capacity), 0) || null;
    }

    get size() {
        return this.#list.length;
    }

    get isEmpty() {
        return this.size === 0;
    }

    get isFull() {
        return this.#capacity !== null && this.size === this.#capacity;
    }

    enqueue(item) {
        if (this.#capacity === null || this.size < this.#capacity) {
            return this.#list.push(item);
        }

        return this.size;
    }

    dequeue() {
        return this.#list.shift();
    }

    peek() {
        return this.#list[0];
    }

    print() {
        console.log(this.#list);
    }
}
//}}}1

// RequestHandler {{{1
class RequestHandler extends Queue {
    // TODO: MaxRetries and retrying will be implemented.
    #isBusy = false;
    #callCounter = 0;

    // This is the dynamic container that will store things like retry counters etc.
    //      fields:5m:XRP/EUR
    #fields = {};

    // This is the final object that will be returned once the whole quueue is
    // consumed. The data structure template is described below:
    //      consumed:states:hasErrors:true
    //      consumed:requests:5m:failed_tasks:XRP/EUR
    #consumed = {'states': {'hasErrors': false}, 'requests': {}};

    constructor(name=null) {
        super(100);

        this.name = name == null ? 'printer_' + Math.floor(Math.random() * 10000) : 'printer_' + name;
        this.id = Math.floor(Math.random() * 10000);
        console.log(`created printer with NAME: ${this.name} and ID: ${this.id}`);
    }

    async processQueue() {
        this.#isBusy = true;
        let task;
        let retryCounter;

        const queueItem = this.dequeue();
        const asset = queueItem.asset;
        const timeframe = queueItem.timeframe;
        const specs = queueItem.specs;

        // Populate the 'consumed' container.
        // (example) consumed:requests:5m:failed_tasks:['XRP/EUR', 'BTX/USD']
        if(!(timeframe in this.#consumed.requests)){
            this.#consumed.requests[timeframe] = { 'failed_tasks': []};
        }

        // Populate the 'fields' container.
        // (example) fields:5m
        if(!(timeframe in this.#fields)){
            this.#fields[timeframe] = {};
        }

        // fields:5m:XRP/EUR:retry_counter:2
        if(!(asset in this.#fields[timeframe])){
            this.#fields[timeframe][asset] = {'retry_counter': specs.maxRetries};

            // The retry_counter is initialized here.
            retryCounter = specs.maxRetries;
        }else{
            // If already present, we use the dynamic value NOT the value that
            // comes through the specs.
            retryCounter = this.#fields[timeframe][asset]['retry_counter'];
        }

        try{
            // Actual ticker fetcher will support different time frames.
            task = await queryMockTickers(asset);
            //console.log(`SUCCESS: Ticker data received. [${asset}], [${timeframe}], __QUEUE_SIZE__: ${this.size}`);
            //console.log('__db__WRITE: monogodb');
            //console.log(JSON.stringify(task));
        }catch(e){
            task = null;
            //console.log(`FAIL: Ticker data failed. [${asset}], [${timeframe}], __QUEUE_SIZE__: ${this.size}`);

            if(retryCounter != 0){
                console.log(`retry ... for [${asset}] ... <${retryCounter}>`);
                retryCounter -= 1;
                this.#fields[timeframe][asset]['retry_counter'] = retryCounter;

                // The next value of the retry counter will be pulled from the
                // 'fields' container.
                console.log(`updated _retryCounter ... <${retryCounter}>`);
                this.submit(asset, timeframe, specs);
            }else{
                console.log(`Retry limit reached after ${specs.maxRetries} retries. Aborting any pending requests for [${asset}, ${timeframe}].`);
                this.#consumed.requests[timeframe]['failed_tasks'].push(asset);

                if(!this.#consumed.states.hasErrors){
                    this.#consumed.states.hasErrors = true;
                }
            }
        }
        // Queue is consumed, we are done.
        if (this.isEmpty) {
            console.log('... done ...');
            this.#isBusy = false;

            return this.#consumed;
        } else {
            console.log('... next ...');
            return await this.processQueue();
        }
    };

    submit = (asset, timeframe, specs) => {
        if (this.isFull) {
            console.log('ERROR: Queue is full!');
        } else {
            let current_size;
            current_size = this.enqueue({'asset': asset, 'timeframe': timeframe, 'specs': specs});
            // console.log(`__TASK__: ${asset}, ${timeframe}, ${specs}, queue submission executed, __QUEUE_SIZE__: ${current_size}`);
        }
    };
}
// }}}1

// RequestBundle {{{1
//
// RequestBundle.submit('5m', '20');
// RequestBundle.submit('15m', '40');
// RequestBundle.submit('1h', '60');
// RequestBundle.submit('4h', '80');
// RequestBundle.submit('1d', '100');
//
// every request will check the current level and elevate that if it is lower
// than the target. For example, when the '5m' task accesses the contaoiner, it
// will set the level to 20, later, when the '15m' task modifies the container,
// it will check and find 20 as the current level, this will be elevated to 40,
// so on and so on.
//
// The last taks that goes in there, will trigger the consumption of all queue
// containers.
//
// We need to make sure that the invervals run sequentially, 5m, 15m, 1h etc.
// or we will have to handle that in the container.
//
// We should be able to the intervals run sequentially.
//
// //
class RequestBundle extends Queue {
    #printers = [
        new RequestHandler('5m'),
        new RequestHandler('15m'),
        new RequestHandler('1h'),
        new RequestHandler('4h'),
        new RequestHandler('1d')
    ];

    submit(doc) {
        return new Promise((res) => {
            const freePrinter = this.#printers.reduce((acc, p) => {
                if (p.size < acc.size) {
                    acc = p;
                }

                return acc;
            }, this.#printers[0]);

            if (freePrinter.isFull) {
                this.enqueue(() => this.print(doc).then((id) => res(id)));
            } else {
                freePrinter.print(doc).then(() => {
                    res(freePrinter.id);
                    if (this.size) {
                        const nextDoc = this.dequeue();
                        nextDoc();
                    }
                });
            }
        });
    }
}
// }}}1

/* The basic bits that are working. */

//const asset_list = ['BTC/EUR', 'ETH/EUR', 'ZEC/EUR', 'LTC/EUR', 'XMR/EUR', 'DASH/EUR', 'EOS/EUR', 'ETC/EUR', 'XLM/EUR', 'XRP/EUR', 'BTC/USD', 'ETH/USD', 'ZEC/USD', 'LTC/USD', 'XMR/USD', 'DASH/USD', 'EOS/USD', 'ETC/USD', 'XLM/USD', 'XRP/USD'];
const asset_list = ['BTS/EUR', 'ETH/EUR'];

const assetRequester = new RequestHandler('asset_requester');

// Initial submissions.
try {
    console.log('Submittin to group [5m]');
    asset_list
        .forEach((n) => {
            assetRequester.submit(n, '5m', {maxRetries: 1});
        });
}catch(e){
    console.log('CRITICAL_FAILURE: Submission failed for group [5m].');
}

assetRequester.print();

// ASYNC task consumer starts working immediately.
(async () => {
    try{
        console.log('__LOCK_INTERVAL__');
        let response = await assetRequester.processQueue();
        console.log(JSON.stringify(response));
        console.log('__UNLOCK_INTERVAL__');
    }catch(e){
        console.log(`CRITICAL_FAILURE: ${e}`);
        console.log('__UNLOCK_INTERVAL__');
    };
})();

// Test async sequential submission (15m).
sleep(1000)
    .then((message) => {
        console.log('Submittin to group [15m]');
        asset_list
            .forEach((n) => {
                assetRequester.submit(n, '15m', {maxRetries: 2});
            })
    })
    .catch((err) => {
        console.log(`CRITICAL_FAILURE: Submission failed for group [15M].\n${err}`);
    })
    .finally(() => { assetRequester.print() });

// Test async sequential submission (1h).
sleep(1000)
    .then((message) => {
        console.log('Submittin to group [1h]');
        asset_list
            .forEach((n) => {
                assetRequester.submit(n, '1h', {maxRetries: 3});
            })
    })
    .catch((err) => {
        console.log(`CRITICAL_FAILURE: Submission failed for group [1h].\n${err}`);
    })
    .finally(() => { assetRequester.print() });

// Test async sequential submission (4h).
sleep(1000)
    .then((message) => {
        console.log('Submittin to group [4h]');
        asset_list
            .forEach((n) => {
                assetRequester.submit(n, '4h', {maxRetries: 4});
            })
    })
    .catch((err) => {
        console.log(`CRITICAL_FAILURE: Submission failed for group [4h].\n${err}`);
    })
    .finally(() => { assetRequester.print() });

// Test async sequential submission (1d).
sleep(1000)
    .then((message) => {
        console.log('Submittin to group [1d]');
        asset_list
            .forEach((n) => {
                assetRequester.submit(n, '1d', {maxRetries: 5});
            })
    })
    .catch((err) => {
        console.log(`CRITICAL_FAILURE: Submission failed for group [1d].\n${err}`);
    })
    .finally(() => { assetRequester.print() });

/* Some old experiements */

//const rb = new RequestBundle();

/*
console.log('[1.start] This task relies on the response being received ... (working)');

// (async () => {
//     // Approach (1)
//     sleep(3000).then((message)=>{
//         console.log(`[1.end] result: ${message}`);
//         console.log('[1.end] Done.');
//     });
//     // Approach (2)
//     //let response = await sleep(3000)
//     // let response = await sleep(30000);
//     // console.log(`[1]result: ${response}`);
//     // console.log('[1] Done.');
// })();

console.log('[2.start] This task relies on the response being received ... (working)');

sleep(7000).then((message)=>{
    console.log(`[2.end] result: ${message}`);
    console.log('[2.end] Done.');
});

console.log('[3.start] Some other task running.');
console.log('[3.end] Done.');
*/

// vim: fdm=marker ts=4
