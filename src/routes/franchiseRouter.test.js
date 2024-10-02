const request = require("supertest");
const express = require("express");
const franchiseRouter = require("./franchiseRouter");
const { DB, Role } = require("../database/database.js");
const { authRouter } = require("./authRouter");
const { StatusCodeError } = require("../endpointHelper");

jest.mock("../database/database.js");
jest.mock("./authRouter.js");

const app = express();
app.use(express.json());
app.use("/api/franchise", franchiseRouter);

describe("Franchise Router", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("GET /api/franchise", () => {
        test("should return all franchises", async () => {
            const franchises = [
                {
                    id: 1,
                    name: "pizzaPocket",
                    stores: [{ id: 1, name: "SLC" }],
                },
            ];
            DB.getFranchises.mockResolvedValue(franchises);

            const res = await request(app).get("/api/franchise");
            expect(res.statusCode).toBe(200);
            expect(res.body).toEqual(franchises);
            expect(DB.getFranchises).toHaveBeenCalled();
        });
    });

    describe("GET /api/franchise/:userId", () => {
        test("should return user franchises for authenticated user", async () => {
            const userFranchises = [
                {
                    id: 2,
                    name: "pizzaPocket",
                    stores: [{ id: 4, name: "SLC" }],
                },
            ];
            const mockUser = {
                id: 1,
                isRole: jest.fn().mockReturnValue(false),
            };
            authRouter.authenticateToken.mockImplementation(
                (req, res, next) => {
                    req.user = mockUser;
                    next();
                }
            );
            DB.getUserFranchises.mockResolvedValue(userFranchises);

            const res = await request(app)
                .get("/api/franchise/1")
                .set("Authorization", "Bearer tttttt");
            expect(res.statusCode).toBe(200);
            expect(res.body).toEqual(userFranchises);
            expect(DB.getUserFranchises).toHaveBeenCalledWith(1);
        });
    });

    describe("POST /api/franchise", () => {
        test("should create a new franchise for admin", async () => {
            const mockUser = { isRole: jest.fn().mockReturnValue(true) };
            const newFranchise = {
                name: "pizzaPocket",
                admins: [{ email: "f@jwt.com" }],
            };
            const createdFranchise = {
                id: 1,
                name: "pizzaPocket",
                admins: [
                    { email: "f@jwt.com", id: 4, name: "pizza franchisee" },
                ],
            };
            authRouter.authenticateToken.mockImplementation(
                (req, res, next) => {
                    req.user = mockUser;
                    next();
                }
            );
            DB.createFranchise.mockResolvedValue(createdFranchise);

            const res = await request(app)
                .post("/api/franchise")
                .set("Authorization", "Bearer tttttt")
                .send(newFranchise);
            expect(res.statusCode).toBe(200);
            expect(res.body).toEqual(createdFranchise);
            expect(DB.createFranchise).toHaveBeenCalledWith(newFranchise);
        });

        test("should return 403 if user is not admin", async () => {
            const mockUser = { isRole: jest.fn().mockReturnValue(false) };
            authRouter.authenticateToken.mockImplementation(
                (req, res, next) => {
                    req.user = mockUser;
                    next();
                }
            );

            const res = await request(app)
                .post("/api/franchise")
                .set("Authorization", "Bearer tttttt")
                .send({ name: "pizzaPocket" });
            expect(res.statusCode).toBe(403);
            expect(res.body).toEqual({});
        });
    });

    describe("DELETE /api/franchise/:franchiseId", () => {
        test("should return 403 if user is not admin", async () => {
            const mockUser = { isRole: jest.fn().mockReturnValue(false) };
            authRouter.authenticateToken.mockImplementation(
                (req, res, next) => {
                    req.user = mockUser;
                    next();
                }
            );

            const res = await request(app)
                .delete("/api/franchise/1")
                .set("Authorization", "Bearer tttttt");
            expect(res.statusCode).toBe(500);
            expect(res.body).toEqual({});
        });
    });

    describe("POST /api/franchise/:franchiseId/store", () => {
        test("should create a new store for admin", async () => {
            const mockUser = { id: 1, isRole: jest.fn().mockReturnValue(true) };
            const newStore = { name: "SLC" };
            const createdStore = { id: 1, franchiseId: 1, name: "SLC" };
            const franchise = { id: 1, admins: [{ id: 1 }] };

            authRouter.authenticateToken.mockImplementation(
                (req, res, next) => {
                    req.user = mockUser;
                    next();
                }
            );
            DB.getFranchise.mockResolvedValue(franchise);
            DB.createStore.mockResolvedValue(createdStore);

            const res = await request(app)
                .post("/api/franchise/1/store")
                .set("Authorization", "Bearer tttttt")
                .send(newStore);
            expect(res.statusCode).toBe(200);
            expect(res.body).toEqual(createdStore);
            expect(DB.createStore).toHaveBeenCalledWith(1, newStore);
        });

        test("should return 403 if user is not admin or franchise admin", async () => {
            const mockUser = {
                id: 2,
                isRole: jest.fn().mockReturnValue(false),
            };
            const franchise = { id: 1, admins: [{ id: 1 }] };

            authRouter.authenticateToken.mockImplementation(
                (req, res, next) => {
                    req.user = mockUser;
                    next();
                }
            );
            DB.getFranchise.mockResolvedValue(franchise);

            const res = await request(app)
                .post("/api/franchise/1/store")
                .set("Authorization", "Bearer tttttt")
                .send({ name: "SLC" });
            expect(res.statusCode).toBe(403);
            expect(res.body).toEqual({});
        });
    });

    describe("DELETE /api/franchise/:franchiseId/store/:storeId", () => {
        test("should delete a store for admin or franchise admin", async () => {
            const mockUser = { id: 1, isRole: jest.fn().mockReturnValue(true) };
            const franchise = { id: 1, admins: [{ id: 1 }] };

            authRouter.authenticateToken.mockImplementation(
                (req, res, next) => {
                    req.user = mockUser;
                    next();
                }
            );
            DB.getFranchise.mockResolvedValue(franchise);
            DB.deleteStore.mockResolvedValue();

            const res = await request(app)
                .delete("/api/franchise/1/store/1")
                .set("Authorization", "Bearer tttttt");
            expect(res.statusCode).toBe(200);
            expect(res.body).toEqual({ message: "store deleted" });
            expect(DB.deleteStore).toHaveBeenCalledWith(1, 1);
        });

        test("should return 403 if user is not admin or franchise admin", async () => {
            const mockUser = {
                id: 2,
                isRole: jest.fn().mockReturnValue(false),
            };
            const franchise = { id: 1, admins: [{ id: 1 }] };

            authRouter.authenticateToken.mockImplementation(
                (req, res, next) => {
                    req.user = mockUser;
                    next();
                }
            );
            DB.getFranchise.mockResolvedValue(franchise);

            const res = await request(app)
                .delete("/api/franchise/1/store/1")
                .set("Authorization", "Bearer tttttt");
            expect(res.statusCode).toBe(403);
            expect(res.body).toEqual({});
        });
    });
});
