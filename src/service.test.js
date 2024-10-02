const request = require("supertest");
const app = require("./service");

// Define a route that triggers an error
app.get("/error", (req, res, next) => {
    const error = new Error("Test error");
    error.statusCode = 400;
    next(error);
});

// Define a route that triggers an error with no status code
app.get("/error-no-status", (req, res, next) => {
    const error = new Error("No status code error");
    next(error);
});

// Mocking the authRouter and setAuthUser middleware
jest.mock("./routes/authRouter.js", () => {
    const authRouter = require("express").Router();
    authRouter.endpoints = [
        "/api/auth", // authRouter endpoints
    ];
    return {
        authRouter,
        setAuthUser: jest.fn((req, res, next) => {
            // Mocking the behavior of setAuthUser but with no real user logic
            req.user = null;
            next();
        }),
    };
});

// Mocking other routers
jest.mock("./routes/orderRouter.js", () => {
    const router = require("express").Router();
    router.endpoints = ["/order1", "/order2"]; // Mock endpoints
    return router;
});

jest.mock("./routes/franchiseRouter.js", () => {
    const router = require("express").Router();
    router.endpoints = ["/franchise1", "/franchise2"]; // Mock endpoints
    return router;
});

jest.mock("./version.json", () => ({ version: "1.0.0" }));
jest.mock("./config.js", () => ({
    factory: { url: "http://factory.url" },
    db: { connection: { host: "localhost" } },
}));

describe("Express app", () => {
    it("should set CORS headers correctly", async () => {
        const res = await request(app).get("/");
        expect(res.headers["access-control-allow-origin"]).toBe("*");
        expect(res.headers["access-control-allow-methods"]).toBe(
            "GET, POST, PUT, DELETE"
        );
        expect(res.headers["access-control-allow-headers"]).toBe(
            "Content-Type, Authorization"
        );
        expect(res.headers["access-control-allow-credentials"]).toBe("true");
    });

    it("should return the correct welcome message and version on GET /", async () => {
        const res = await request(app).get("/");
        expect(res.statusCode).toBe(200);
        expect(res.body).toEqual({
            message: "welcome to JWT Pizza",
            version: "1.0.0",
        });
    });

    it("should return version, endpoints, and config in /api/docs", async () => {
        const res = await request(app).get("/api/docs");
        expect(res.statusCode).toBe(200);
        expect(res.body).toEqual({
            version: "1.0.0",
            endpoints: [
                "/api/auth", // authRouter endpoints
                "/order1",
                "/order2", // orderRouter endpoints
                "/franchise1",
                "/franchise2", // franchiseRouter endpoints
            ],
            config: { factory: "http://factory.url", db: "localhost" },
        });
    });

    it("should return 404 for unknown endpoints", async () => {
        const res = await request(app).get("/unknown");
        expect(res.statusCode).toBe(404);
        expect(res.body).toEqual({ message: "unknown endpoint" });
    });
});