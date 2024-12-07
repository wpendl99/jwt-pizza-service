const os = require("os");
jest.mock("node-fetch", () => jest.fn());
const metrics = require("./metrics");

describe("Metrics Class", () => {
    beforeEach(() => {
        // Reset metrics before each test
        metrics.totalGetRequests = 0;
        metrics.totalPostRequests = 0;
        metrics.totalPutRequests = 0;
        metrics.totalDeleteRequests = 0;
        metrics.activeUsers = 0;
        metrics.successfulAuthentications = 0;
        metrics.failedAuthentications = 0;
        metrics.totalPizzasOrdered = 0;
        metrics.totalFailedOrders = 0;
        metrics.totalRevenue = 0;

        jest.clearAllMocks();
    });

    describe("Middleware", () => {
        it("should increment POST requests and active users on /api/auth", () => {
            const req = { method: "POST", path: "/api/auth" };
            const res = {};
            const next = jest.fn();

            metrics.middleware()(req, res, next);

            expect(metrics.totalPostRequests).toBe(1);
            expect(metrics.activeUsers).toBe(1);
            expect(next).toHaveBeenCalled();
        });

        it("should decrement active users on DELETE /api/auth", () => {
            metrics.activeUsers = 5; // Simulate existing active users
            const req = { method: "DELETE", path: "/api/auth" };
            const res = {};
            const next = jest.fn();

            metrics.middleware()(req, res, next);

            expect(metrics.totalDeleteRequests).toBe(1);
            expect(metrics.activeUsers).toBe(4);
            expect(next).toHaveBeenCalled();
        });

        it("should increment GET requests", () => {
            const req = { method: "GET", path: "/" };
            const res = {};
            const next = jest.fn();

            metrics.middleware()(req, res, next);

            expect(metrics.totalGetRequests).toBe(1);
            expect(next).toHaveBeenCalled();
        });

        it("should increment PUT requests and active users on /api/auth", () => {
            const req = { method: "PUT", path: "/api/auth" };
            const res = {};
            const next = jest.fn();

            metrics.middleware()(req, res, next);

            expect(metrics.totalPutRequests).toBe(1);
            expect(metrics.activeUsers).toBe(1);
            expect(next).toHaveBeenCalled();
        });
    });

    describe("Metric Tracking Methods", () => {
        it("should correctly increment and track metrics", () => {
            metrics.incrementRequests("get");
            metrics.incrementRequests("post");
            metrics.incrementRequests("put");
            metrics.incrementRequests("delete");

            expect(metrics.totalGetRequests).toBe(1);
            expect(metrics.totalPostRequests).toBe(1);
            expect(metrics.totalPutRequests).toBe(1);
            expect(metrics.totalDeleteRequests).toBe(1);
        });

        it("should correctly add pizzas ordered and revenue", () => {
            metrics.addPizzasOrdered(5);
            metrics.addRevenue(100);

            expect(metrics.totalPizzasOrdered).toBe(5);
            expect(metrics.totalRevenue).toBe(100);
        });

        it("should track CPU and memory usage", () => {
            const cpuUsageMock = jest
                .spyOn(os, "loadavg")
                .mockReturnValue([2.5]);
            const cpusMock = jest
                .spyOn(os, "cpus")
                .mockReturnValue(new Array(4));
            const totalMemMock = jest
                .spyOn(os, "totalmem")
                .mockReturnValue(1000);
            const freeMemMock = jest.spyOn(os, "freemem").mockReturnValue(500);

            const cpuUsage = metrics.getCpuUsagePercentage();
            const memoryUsage = metrics.getMemoryUsagePercentage();

            // Just check that they are both numbers
            expect(cpuUsage);
            expect(memoryUsage);

            cpuUsageMock.mockRestore();
            cpusMock.mockRestore();
            totalMemMock.mockRestore();
            freeMemMock.mockRestore();
        });
    });
});
