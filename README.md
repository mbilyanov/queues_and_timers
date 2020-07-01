# Queues and Timers
A case study for asynchronous queue handling.

# Intro
While building our historical-data backend, we came across a typical problem, ***Queues***. After some research we decided that the modules and packages designed to provide this functionality are slightly too complicated for our purpose. We had already built a solid ***Interval*** module that was designed to handle the timing of our API requests, we only needed to implement a custom queue system that will meet our needs and play nice with our *interval* module.

We came across this nice caste study: [Queue Implementation in Javascript + printer network + promise sequential asynchronous task](https://www.youtube.com/watch?v=e7q2ovWtf-g)

And with the help of [Elson Correia](https://github.com/ECorreia45), the original author of the case study above, we were quick to implement our own solution.

# The Idea
The idea here is the following:

* We need a set of queues designed to handle tasks with different properties. Each of those queues are required to have an identifier as they would be hosting specific types of tasks. These different properties are labelled as `5m`, `15m`, `1h`, `4h`, `1d` representing different time-frames. So there will be a range of tasks to be associated with the `5m` property, with the `15m` property and so on. A quick hint, these are different time-frames, as in 5 minute, 15 minute etc.

* One important characteristic of these queues is that they will be all populated by a different external/asynchronous event. For example every 5 minutes, the `5m` container will be populated and then it is 'ok' to start consuming the tasks in that queue. The cycle keeps running and every 5 minutes the process is repeated.

* Every 15 minutes, the `5m` container is populated, together with the `15m` container. Then both queues are consumed. The cycle keeps running and every 15 minutes the process is repeated.

* Every 1h, the `5m` container is populated, together with the `15m`, followed by the `1h` container. Then all of these 3 queues are consumed. The cycle keep running and every 1 hour the process is repeated.

* Every 4h, the `5m` container is populated, together with the `15m`, followed by the `1h` container and finally the `4h` container is populated. Once again, once the population process is complete, all 4 queues are consumed. The cycle keep running and every 4 hours the process is repeated.

* Every 1d (24h), the `5m` container is populated, together with the `15m`, followed by the `1h` container, followed by the 4h container and finally the `24h` container is populated. Once again, once the population process is complete, all 5 queues are consumed. The cycle keep running and every 24 hours the process is repeated.

Already confused? :) Apologies for the repetition but this was a vital in the heat of explaining the specifications of our problem. The following illustration should put things in a bit of a more visual context.

<p align="center">
  <img width="400" alt="Osculating Circle" src="https://github.com/mbilyanov/queues_and_timers/blob/master/assets/intervals.png">
  <p align="center"><font size="2">Figure 1. Each task property displayed with their respective interval frequencies.</font></p>
</p>

# The Problem
For now the interval handling is not an issue. Remember? - we already have an interval module taking care of that. Then what is the initial problem?

The initial problem to be solved is to get 5 different async events to selectively populate the queues within the bundle and trigger the consumption of all the populated queues.

So for example, in its simplest form, only the `5m` queue will be populated and consumed at hours such as `21:05` or `21:10`. When the clock hits `21:15`, there will be two queues to be populated: `5m` and `15m`. At `21:30` there will be once again only 2 queues to be populated. At `22:00` there will be 3 queues: `5m`, `15m` and `1h`. So on and so on, you get the idea :) A classical time-series data gathering puzzle, I guess.

# The Queue Structure
Initially we thought it would be a smart move to handle tasks with different properties in their individual queues and those queues will be a part of a bigger queue:
```javascript
RequestNetwork [
    RequestHandler_5m ['task_5m_a', 'task_5m_b', 'task_5m_c', ...],
    RequestHandler_15m ['task_15m_a', 'task_15m_b', 'task_15m_c', ...],
    RequestHandler_1h ['task_1h_a', 'task_1h_b', 'task_1h_c', ...],
    RequestHandler_4h ['task_4h_a', 'task_4h_b', 'task_4h_c', ...],
    RequestHandler_1d ['task_1d_a', 'task_1d_b', 'task_1d_c', ...],
]
```
Each queue was to hold 20 jobs. Actually, there are no job limits in this example, so the task count doesn't really matter here. However, there is one fact, every day, at (00:00+UTC:00) there will be a bottleneck as all of the five tasks will be queued and consumed. That would be 100 tasks in total going into the queue.

# The Solutions
The solution was far more simpler than the one proposed above (thanks to @ECorreia45 for his help and guidance).

We ended up implemented a single queue and handling the different tasks based on attributes attached to the actual task objects. Any failed tasks simply got pushed back to the end of the queue and processed later.

With the task properties, such as `{maxRetries: 5}` it was possible to achieve a more granular control over each category. For example, assigning different retry limits per category provided us with a better control when things came to handling errors and retries. It only makes sense to retry once or twice for a task that runs every 5 minute and have a larger retry count for a task that is executed once in 24 hours. So in general terms, a queue creation would be achieved through the following bit of code:
```javascript
try {
    console.log('Submittin to group [5m]');
    asset_list
        .forEach((n) => {
            assetRequester.submit(n, '5m', {maxRetries: 1});
        });
}catch(e){
    console.log('CRITICAL_FAILURE: Submission failed for group [5m].');
}
```
And the code for the consecutive queue consumption is below:
```javascript
(async () => {
    try{
        let response = await assetRequester.processQueue();
        console.log(JSON.stringify(response));
    }catch(e){
        console.log(`CRITICAL_FAILURE: ${e}`);
    };
})();
```
Once this process runs, it is possible to add new tasks to the already running queue.
```javascript
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
    });
```
There is one important bit that should be mentioned here (in case you have browsed through the source code). The reason behind the use of an `await` during the consumption of the queue, is simply due to the fact that there is an API call involved when fetching the data from the remote resource and that had a rate limit, resulting in a potential bans if too many requests were made in a short time. Luckily the application we are building does not require low latency and is using REST requests to fetch historical data anyway, for that reason, taking things slow was not an issue :)

However, it is important to emphasize that the above solution is also applicable in low latency scenarios and there are other potential optimization steps such as load balancing or servers running on different IPs.

Thanks for reading :)

# Run
To run, use the following.

`npx babel-node ./src/index.js && printf "done\n"`

# Credits
* *This project is based on the following case-study by "Before Semicolon":
[Queue Implementation in Javascript + printer network + promise sequential asynchronous task](https://youtu.be/e7q2ovWtf-g)*.
* *This project is shared as part of the work we do at [https://www.tradekit.io/](https://www.tradekit.io/)*.
