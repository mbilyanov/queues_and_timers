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

    constructor(name=null) {
        super(20);

        this.name = name == null ? 'printer_' + Math.floor(Math.random() * 10000) : 'printer_' + name;
        this.id = Math.floor(Math.random() * 10000);
        console.log(`created printer with NAME: ${this.name} and ID: ${this.id}`);
    }

    async processQueue() {
        this.#isBusy = true;
        let task;

        const result = {
            'errors': false,
            'message': null
        };
        const queueItem = this.dequeue();

        // We are passing in an object with a data and a function side.
        // We do not need the function for now.
        //const docCall = queueItem.fn;
        const docSignal = queueItem.sg;

        try{
            task = await queryMockTickers(queueItem.sg);
            console.log(`Ticker data received. [${queueItem.sg}], __QUEUE_SIZE__: ${this.size}`);
            console.log('__db__WRITE: monogodb');
        }catch(e){
            task = 'failed';
            console.log(`Ticker data failed. [${queueItem.sg}], __QUEUE_SIZE__: ${this.size}`);
            console.log('continue ...');
            result['errors'] = true;
        }
        // Queue is consumed, we are done.
        if (this.isEmpty) {
            console.log('... done ...');
            this.#isBusy = false;

            // Pack the last message.
            result['message'] = task;
            return result;
        } else {
            console.log('... next ...');
            return await this.processQueue();
        }
    };

    submit = (doc) => {
        if (this.isFull) {
            console.log("Printer is full");
        } else {
            let current_size;
            current_size = this.enqueue({'fn': 'BANANA', 'sg': doc});
            console.log(`__TASK__: ${doc} queue submission executed, __QUEUE_SIZE__: ${current_size}`);
        }
    };
}
// }}}1

// RequestBundle {{{1
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

const asset_list = ['BTC/EUR', 'ETH/EUR', 'ZEX/EUR', 'LTC/EUR', 'XMR/EUR', 'DASH/EUR', 'EOC/EUR', 'ETC/EUR', 'XLM/EUR', 'XRP/EUR', 'BANANA/APPLE', 'ABC/XYZ', 'FGH/TRY'];

const myPrinter_5m = new RequestHandler('5m');

try {
asset_list
    .forEach((n) => {
        myPrinter_5m.submit(n);
    });
}catch(e){
    console.log('CRITICAL_FAILUER: Submission failed.');
}

myPrinter_5m.print();

(async () => {
    try{
        let response = await myPrinter_5m.processQueue();
        console.log(JSON.stringify(response));
    }catch(e){
        console.log(`xxx ${e} xxx`);
    }
})();

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
