const { asyncHandler, StatusCodeError } = require("./endpointHelper");

describe("StatusCodeError", () => {
    it("should create an error with a message and status code", () => {
        const message = "An error occurred";
        const statusCode = 404;
        const error = new StatusCodeError(message, statusCode);

        expect(error.message).toBe(message);
        expect(error.statusCode).toBe(statusCode);
        expect(error).toBeInstanceOf(Error);
    });
});

describe("asyncHandler", () => {
    it("should execute the function passed to it", async () => {
        const mockFn = jest.fn().mockResolvedValue("test");
        const req = {};
        const res = {};
        const next = jest.fn();

        const wrappedFn = asyncHandler(mockFn);
        await wrappedFn(req, res, next);

        expect(mockFn).toHaveBeenCalledWith(req, res, next);
        expect(mockFn).toHaveBeenCalledTimes(1);
        expect(next).not.toHaveBeenCalled();
    });

    it("should call next with the error if the function throws an error", async () => {
        const error = new Error("Test error");
        const mockFn = jest.fn().mockRejectedValue(error);
        const req = {};
        const res = {};
        const next = jest.fn();

        const wrappedFn = asyncHandler(mockFn);
        await wrappedFn(req, res, next);

        expect(next).toHaveBeenCalledWith(error);
    });

    it("should handle StatusCodeError correctly and call next with the error", async () => {
        const error = new StatusCodeError("Not found", 404);
        const mockFn = jest.fn().mockRejectedValue(error);
        const req = {};
        const res = {};
        const next = jest.fn();

        const wrappedFn = asyncHandler(mockFn);
        await wrappedFn(req, res, next);

        expect(next).toHaveBeenCalledWith(error);
        expect(next).toHaveBeenCalledTimes(1);
        expect(mockFn).toHaveBeenCalledWith(req, res, next);
    });
});
