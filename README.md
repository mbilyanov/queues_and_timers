# queues_and_timers
A case study for asynchronous queue handling.

# The Idea
The idea here is the following:

* Create a container for queues. Each of those has a name as it is designated for specific events. These are `5m`, `15m`, `1h`, `4h`, `1d` for different time-frames.

* The queues are populated by different external/asynchronous events. For example every 5 minutes, the `5m` container is populated and then it is ok to start consuming the tasks in that queue. (That task keeps running and every 5 minutes the process is repeated.)

* Every 15 minutes, the `5m` container is populated, together with the `15m` containers. Then both queues are consumed. (This task keeps running and every 15 minutes the process is repeated.)

* Every 1h, the `5m` container is populated, together with the `15m`, followed by the `1h` container. The all 3 queues are consumed. (This task keep running and every 1 hour the process is repeated.)

* Every 4h, the `5m` container is populated, together with the `15m`, followed by the `1h` container and finally the `4h` container is populated. Once again, once the population process is complete, all 4 queues are consumed. (This task keep running and every 4 hours the process is repeated.)

* Every 1d (24h), the `5m` container is populated, together with the `15m`, followed by the `1h` container, followed by the 4h container and finally the `24h` container is populated. Once again, once the population process is complete, all 5 queues are consumed. (This task keep running and every 24 hours the process is repeated.)

# The Problem
For now the interval handling is not an issue. Then what is the initial problem?

* The initial problem to be solved is to get 5 different async events to selectively populate the queues within the bundle and trigger the consumption of all the populated queues.

So for example, in the simplest case only the `5m` queue will be filled and
consumed every 5 minutes.

# The Queue Structure
```javascript
RequestNetwork [
    RequestHandler_5m ['task_5m_a', 'task_5m_b', 'task_5m_c', ...],
    RequestHandler_15m ['task_15m_a', 'task_15m_b', 'task_15m_c', ...],
    RequestHandler_1h ['task_1h_a', 'task_1h_b', 'task_1h_c', ...],
    RequestHandler_4h ['task_4h_a', 'task_4h_b', 'task_4h_c', ...],
    RequestHandler_1d ['task_1d_a', 'task_1d_b', 'task_1d_c', ...],
]
```
Each queue will hold 20 jobs. There are no job limits.

# Possible solutions
Since sometimes it will be 'ok' the consume the whole `RequestNetwork` with all
other 4 handlers empty, there might be a saturation level required to indicate
that the `RequestNetwork` is ready. Every process adding to the network will
check if the saturation level is satisfied, once that is done, the whole
network will be consumed.

For example, the saturation level that needs to be satisfied to trigger the consumption of the
`RequestNetwork` every 5 minutes will be 20.

Similarly, the saturation level needed to be satisfied to trigger the consumption of the
`RequestNetwork` every 15 minutes would be 40 (20 tasks for the `5m`
`RequestHandler` and 20 tasks for the `15m` `RequestHandler` and so on and so
on.

# Run
To run, use the following.

`npx babel-node ./src/index.js && printf "done\n"`

# Credits
*This project is based on the following case-study by "Before Semicolon":
[Queue Implementation in Javascript + printer network + promise sequential asynchronous task.](https://youtu.be/e7q2ovWtf-g)*
