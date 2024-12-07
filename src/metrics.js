const config = require("./config.js");
const os = require("os");

class Metrics {
    constructor() {
        this.totalGetRequests = 0;
        this.totalPostRequests = 0;
        this.totalPutRequests = 0;
        this.totalDeleteRequests = 0;
        this.activeUsers = 0;
        this.successfulAuthentications = 0;
        this.failedAuthentications = 0;
        this.totalPizzasOrdered = 0;
        this.totalFailedOrders = 0;
        this.totalRevenue = 0;

        // This will periodically send metrics to Grafana every 10 seconds
        const timer = setInterval(() => {
            this.sendAllMetricsToGrafana();
        }, 10000);
        timer.unref();

        // Timer to log out 1 user every 10 minutes due to inactivity
        const userTimer = setInterval(() => {
            if (this.activeUsers > 0) {
                this.activeUsers--;
            } else if (this.activeUsers < 0) {
                this.activeUsers = 0;
            }
        }, 300000);
        userTimer.unref();
    }

    middleware() {
        return (req, res, next) => {
            if (req.method === "POST") {
                this.incrementRequests("post");
                if (req.path === "/api/auth") {
                    this.incrementActiveUsers();
                }
            } else if (req.method === "PUT") {
                this.incrementRequests("put");
                if (req.path === "/api/auth") {
                    this.incrementActiveUsers();
                }
            } else if (req.method === "GET") {
                this.incrementRequests("get");
            } else if (req.method === "DELETE") {
                this.incrementRequests("delete");
                if (req.path === "/api/auth") {
                    this.decrementActiveUsers();
                }
            }
            next();
        };
    }

    incrementRequests(type) {
        if (type === "get") {
            this.totalGetRequests++;
        } else if (type === "post") {
            this.totalPostRequests++;
        } else if (type === "put") {
            this.totalPutRequests++;
        } else if (type === "delete") {
            this.totalDeleteRequests++;
        }
    }

    incrementActiveUsers() {
        this.activeUsers++;
    }

    decrementActiveUsers() {
        this.activeUsers--;
    }

    incrementSuccessfulAuthentications() {
        this.successfulAuthentications++;
    }

    incrementFailedAuthentications() {
        this.failedAuthentications++;
    }

    addPizzasOrdered(pizzaCount) {
        this.totalPizzasOrdered += pizzaCount;
    }

    incrementFailedOrders() {
        this.totalFailedOrders++;
    }

    addRevenue(amount) {
        this.totalRevenue += amount;
    }

    getCpuUsagePercentage() {
        const cpuUsage = os.loadavg()[0] / os.cpus().length;
        return cpuUsage.toFixed(2) * 100;
    }

    getMemoryUsagePercentage() {
        const totalMemory = os.totalmem();
        const freeMemory = os.freemem();
        const usedMemory = totalMemory - freeMemory;
        const memoryUsage = (usedMemory / totalMemory) * 100;
        return memoryUsage.toFixed(2);
    }

    trackLatency(latency) {
        // console.log(`Latency: ${latency}ms`);
        this.sendMetricToGrafana("request", "latency", "value", latency);
    }

    pizzaLatency(latency) {
        // console.log(`Pizza Latency: ${latency}ms`);
        this.sendMetricToGrafana("order", "latency", "value", latency);
    }

    sendAllMetricsToGrafana() {
        this.sendMetricToGrafana(
            "request",
            "get",
            "total",
            this.totalGetRequests
        );
        this.sendMetricToGrafana(
            "request",
            "post",
            "total",
            this.totalPostRequests
        );
        this.sendMetricToGrafana(
            "request",
            "put",
            "total",
            this.totalPutRequests
        );
        this.sendMetricToGrafana(
            "request",
            "delete",
            "total",
            this.totalDeleteRequests
        );
        this.sendMetricToGrafana(
            "system",
            "cpu",
            "usage",
            this.getCpuUsagePercentage()
        );
        this.sendMetricToGrafana(
            "system",
            "memory",
            "usage",
            this.getMemoryUsagePercentage()
        );
        this.sendMetricToGrafana("user", "active", "count", this.activeUsers);
        this.sendMetricToGrafana(
            "auth",
            "successful",
            "count",
            this.successfulAuthentications
        );
        this.sendMetricToGrafana(
            "auth",
            "failed",
            "count",
            this.failedAuthentications
        );
        this.sendMetricToGrafana(
            "order",
            "pizza",
            "count",
            this.totalPizzasOrdered
        );
        this.sendMetricToGrafana(
            "order",
            "failed",
            "count",
            this.totalFailedOrders
        );
        this.sendMetricToGrafana(
            "order",
            "revenue",
            "amount",
            this.totalRevenue
        );
    }

    sendMetricToGrafana(metricPrefix, httpMethod, metricName, metricValue) {
        const metric = `${metricPrefix},source=${config.metrics.source},method=${httpMethod} ${metricName}=${metricValue}`;

        fetch(`${config.metrics.url}`, {
            method: "post",
            body: metric,
            headers: {
                Authorization: `Bearer ${config.metrics.userId}:${config.metrics.apiKey}`,
            },
        })
            .then((response) => {
                if (!response.ok) {
                    console.error("Failed to push metrics data to Grafana");
                } else {
                    // console.log(`Pushed ${metric}`);
                }
            })
            .catch((error) => {
                console.error("Error pushing metrics:", error);
            });
    }
}

const metrics = new Metrics();
module.exports = metrics;
