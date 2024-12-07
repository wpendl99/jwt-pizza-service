import { sleep, check, group, fail } from "k6";
import http from "k6/http";

export const options = {
    cloud: {
        distribution: {
            "amazon:us:ashburn": {
                loadZone: "amazon:us:ashburn",
                percent: 100,
            },
        },
        apm: [],
    },
    thresholds: {},
    scenarios: {
        Basic_Purchase: {
            executor: "ramping-vus",
            gracefulStop: "30s",
            stages: [
                { target: 8, duration: "30s" },
                { target: 15, duration: "1m" },
                { target: 0, duration: "15s" },
            ],
            gracefulRampDown: "30s",
            exec: "basic_Purchase",
        },
    },
};

export function basic_Purchase() {
    let response;

    group("Buy Pizza - https://pendlpizza.com/", function () {
        // Load website
        response = http.get("https://pendlpizza.com/", {
            headers: {
                accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
                "accept-encoding": "gzip, deflate, br, zstd",
                "accept-language": "en-US,en;q=0.9",
                "cache-control": "max-age=0",
                "if-modified-since": "Tue, 29 Oct 2024 21:58:12 GMT",
                "if-none-match": '"e85621f4c659883cdb5199128c93ff61"',
                priority: "u=0, i",
                "sec-ch-ua":
                    '"Chromium";v="130", "Google Chrome";v="130", "Not?A_Brand";v="99"',
                "sec-ch-ua-mobile": "?0",
                "sec-ch-ua-platform": '"macOS"',
                "sec-fetch-dest": "document",
                "sec-fetch-mode": "navigate",
                "sec-fetch-site": "same-origin",
                "sec-fetch-user": "?1",
                "upgrade-insecure-requests": "1",
            },
        });
        sleep(2);

        const vars = {};

        // Login
        response = http.put(
            "https://pizza-service.pendlpizza.com/api/auth",
            '{"email":"dum@dum.com","password":"dum"}',
            {
                headers: {
                    accept: "*/*",
                    "accept-encoding": "gzip, deflate, br, zstd",
                    "accept-language": "en-US,en;q=0.9",
                    "content-type": "application/json",
                    origin: "https://pendlpizza.com",
                    priority: "u=1, i",
                    "sec-ch-ua":
                        '"Chromium";v="130", "Google Chrome";v="130", "Not?A_Brand";v="99"',
                    "sec-ch-ua-mobile": "?0",
                    "sec-ch-ua-platform": '"macOS"',
                    "sec-fetch-dest": "empty",
                    "sec-fetch-mode": "cors",
                    "sec-fetch-site": "same-site",
                },
            }
        );

        // Assert status code
        if (
            !check(response, {
                "status equals 200 for login": (response) =>
                    response.status.toString() === "200",
            })
        ) {
            console.log(response.body);
            fail("Login was not 200");
        }

        vars.authToken = response.json().token;

        sleep(1);

        // Get menu
        response = http.get(
            "https://pizza-service.pendlpizza.com/api/order/menu",
            {
                headers: {
                    accept: "*/*",
                    "accept-encoding": "gzip, deflate, br, zstd",
                    "accept-language": "en-US,en;q=0.9",
                    "content-type": "application/json",
                    authorization: `Bearer ${vars.authToken}`,
                    origin: "https://pendlpizza.com",
                    priority: "u=1, i",
                    "sec-ch-ua":
                        '"Chromium";v="130", "Google Chrome";v="130", "Not?A_Brand";v="99"',
                    "sec-ch-ua-mobile": "?0",
                    "sec-ch-ua-platform": '"macOS"',
                    "sec-fetch-dest": "empty",
                    "sec-fetch-mode": "cors",
                    "sec-fetch-site": "same-site",
                },
            }
        );

        // Get stores
        response = http.get(
            "https://pizza-service.pendlpizza.com/api/franchise",
            {
                headers: {
                    accept: "*/*",
                    "accept-encoding": "gzip, deflate, br, zstd",
                    "accept-language": "en-US,en;q=0.9",
                    "content-type": "application/json",
                    authorization: `Bearer ${vars.authToken}`,
                    origin: "https://pendlpizza.com",
                    priority: "u=1, i",
                    "sec-ch-ua":
                        '"Chromium";v="130", "Google Chrome";v="130", "Not?A_Brand";v="99"',
                    "sec-ch-ua-mobile": "?0",
                    "sec-ch-ua-platform": '"macOS"',
                    "sec-fetch-dest": "empty",
                    "sec-fetch-mode": "cors",
                    "sec-fetch-site": "same-site",
                },
            }
        );
        sleep(2);

        // Order pizza
        response = http.post(
            "https://pizza-service.pendlpizza.com/api/order",
            '{"items":[{"menuId":2,"description":"Pepperoni","price":0.0042},{"menuId":3,"description":"Margarita","price":0.0042}],"storeId":"2","franchiseId":1}',
            {
                headers: {
                    accept: "*/*",
                    "accept-encoding": "gzip, deflate, br, zstd",
                    "accept-language": "en-US,en;q=0.9",
                    "content-type": "application/json",
                    authorization: `Bearer ${vars.authToken}`,
                    origin: "https://pendlpizza.com",
                    priority: "u=1, i",
                    "sec-ch-ua":
                        '"Chromium";v="130", "Google Chrome";v="130", "Not?A_Brand";v="99"',
                    "sec-ch-ua-mobile": "?0",
                    "sec-ch-ua-platform": '"macOS"',
                    "sec-fetch-dest": "empty",
                    "sec-fetch-mode": "cors",
                    "sec-fetch-site": "same-site",
                },
            }
        );

        // Assert status code
        if (
            !check(response, {
                "status equals 200 for order": (response) =>
                    response.status.toString() === "200",
            })
        ) {
            console.log(response.body);
            fail("Order was not 200");
        }

        // Extract JWT from response
        vars.jwtToken = response.json().body.jwt;
        sleep(1.4);

        // Verify JWT Token
        response = http.post(
            "https://pizza-factory.cs329.click/api/order/verify",
            JSON.stringify({ jwt: vars.jwtToken }),
            {
                headers: {
                    accept: "*/*",
                    "accept-encoding": "gzip, deflate, br, zstd",
                    "accept-language": "en-US,en;q=0.9",
                    "content-type": "application/json",
                    authorization: `Bearer ${vars.authToken}`,
                    origin: "https://pendlpizza.com",
                    priority: "u=1, i",
                    "sec-ch-ua":
                        '"Chromium";v="130", "Google Chrome";v="130", "Not?A_Brand";v="99"',
                    "sec-ch-ua-mobile": "?0",
                    "sec-ch-ua-platform": '"macOS"',
                    "sec-fetch-dest": "empty",
                    "sec-fetch-mode": "cors",
                    "sec-fetch-site": "cross-site",
                },
            }
        );
    });
}
