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

        this.name = name == null ? 'requester_' + Math.floor(Math.random() * 10000) : name;
        this.id = Math.floor(Math.random() * 10000);
        console.log(`INFO: Created a RequestHandler with NAME: ${this.name} and ID: ${this.id}`);
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
            console.log(`Requesting [${asset}:${timeframe}] ...`);
            task = await queryMockTickers(asset);
            console.log(`SUCCESS: Ticker data received for asset [${asset}], with a timeframe of [${timeframe}]. <QUEUE_SIZE: ${this.size}>`);
            // console.log('__db__WRITE: monogodb');
            //console.log(JSON.stringify(task));
        }catch(e){
            task = null;

            if(retryCounter != 0){
                console.log(`FAIL: Ticker data request for [${asset}], with a timeframe of [${timeframe}], has failed! <QUEUE_SIZE: ${this.size}>`);
                const prevRetryCounter = retryCounter;
                retryCounter -= 1;
                this.#fields[timeframe][asset]['retry_counter'] = retryCounter;

                // The next value of the retry counter will be pulled from the
                // 'fields' container.
                console.log(`The following task [${asset}:${timeframe}] will be retried later. <RETRY_COUNTER: (${prevRetryCounter})->(${retryCounter})>`);

                // Invoke the submitter, the failed task will be added to the
                // end of the queue.
                this.submit(asset, timeframe, specs);

                // DEBUG: This is to check if the failed task is re-added to
                // the queue so that it can be retried.
                this.print()
            }else{
                console.log(`Retry limit reached for task [${asset}:${timeframe}] after ${specs.maxRetries} retries. Aborting any pending requests.`);
                this.#consumed.requests[timeframe]['failed_tasks'].push(asset);

                if(!this.#consumed.states.hasErrors){
                    this.#consumed.states.hasErrors = true;
                }
            }
        }
        // Queue is consumed, we are done.
        if (this.isEmpty) {
            const suffix = this.#consumed.states.hasErrors ? 'error(s)' : 'no error(s)';
            console.log(`Queue [${this.name}] is completed with ${suffix}.`);
            this.#isBusy = false;

            return this.#consumed;
        // There are remaining queue items, moving on to the next task.
        } else {
            console.log('> Picking up NEXT task.');
            return await this.processQueue();
        }
    };

    submit = (asset, timeframe, specs) => {
        if (this.isFull) {
            console.log('ERROR: Queue is full!');
        } else {
            let current_size;
            current_size = this.enqueue({'asset': asset, 'timeframe': timeframe, 'specs': specs});
            console.log(`INFO: Task [${asset}:${timeframe}] has been submitted to queue [${this.name}], with the following specs: ${JSON.stringify(specs)} <QUEUE_SIZE: ${current_size}>`);
        }
    };
}
// }}}1

/* The basic bits that are working. */

// const asset_list = ['BTC/EUR', 'ETH/EUR', 'ZEC/EUR', 'LTC/EUR', 'XMR/EUR', 'DASH/EUR', 'EOS/EUR', 'ETC/EUR', 'XLM/EUR', 'XRP/EUR', 'BTC/USD', 'ETH/USD', 'ZEC/USD', 'LTC/USD', 'XMR/USD', 'DASH/USD', 'EOS/USD', 'ETC/USD', 'XLM/USD', 'XRP/USD'];

// Shorter version of the asset list. This is for test purposes.
// const asset_list = ['BTS/EUR', 'ETH/EUR'];

// An asset list but with a deliberate typo in one of the asset names, so that
// we can trigger an error/retry cycle.
const asset_list = ['BTC/EUR', 'ETH/EUR', 'ZEX/EUR', 'LTC/EUR'];

const assetRequester = new RequestHandler('asset_requester');

// Initial submissions.
// This is our first group, all 20 assets submitted for a 5 minute time frame
// lookup.
try {
    console.log('Submittin to group [5m]');
    asset_list
        .forEach((n) => {
            assetRequester.submit(n, '5m', {maxRetries: 1});
        });
}catch(e){
    console.log('CRITICAL_FAILURE: Submission failed for group [5m].');
}

// ASYNC task consumer starts working immediately.
// The submission to group '5m' is immediate and we start the queue consumption
// immediately with that group.
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

// Test async sequential submission (for group: 15m).
// After a short delay, we keep submitting to that queue, but this time the
// group signature for the tasks is '15m'. Another 20 tasks get added to
// the queue here.
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
    .finally(/*() => { assetRequester.print()}*/);

// Test async sequential submission (for group 1h).
// After a short delay, we keep submitting to that queue, but this time the
// group signature for the tasks is '1h'. Another 20 tasks get added to
// the queue here.
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
    .finally(/*() => { assetRequester.print()}*/);

// Test async sequential submission (4h).
// After a short delay, we keep submitting to that queue, but this time the
// group signature for the tasks is '4h'. Another 20 tasks get added to
// the queue here.
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
    .finally(/*() => { assetRequester.print()}*/);

// Test async sequential submission (1d).
// After a short delay, we keep submitting to that queue, but this time the
// group signature for the tasks is '1d'. Another 20 tasks get added to
// the queue here.
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
    .finally(/*() => { assetRequester.print()}*/);

// vim: fdm=marker ts=4
