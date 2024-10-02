const request = require("supertest");
const express = require("express");
const orderRouter = require("./orderRouter");
const { DB } = require("../database/database.js");
const { authRouter } = require("./authRouter");
const fetch = require("node-fetch");

jest.mock("../database/database.js");
jest.mock("./authRouter.js");
jest.mock("node-fetch");

const app = express();
app.use(express.json());
app.use("/api/order", orderRouter);

describe("Order Router", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("GET /api/order/menu", () => {
        test("should return the pizza menu", async () => {
            const menu = [
                {
                    id: 1,
                    title: "Veggie",
                    image: "pizza1.png",
                    price: 0.0038,
                    description: "A garden of delight",
                },
            ];
            DB.getMenu.mockResolvedValue(menu);

            const res = await request(app).get("/api/order/menu");
            expect(res.statusCode).toBe(200);
            expect(res.body).toEqual(menu);
            expect(DB.getMenu).toHaveBeenCalled();
        });
    });

    describe("PUT /api/order/menu", () => {
        test("should add an item to the menu for admin", async () => {
            const mockUser = { isRole: jest.fn().mockReturnValue(true) };
            const newItem = {
                title: "Student",
                description: "No topping, no sauce, just carbs",
                image: "pizza9.png",
                price: 0.0001,
            };
            const updatedMenu = [{ id: 1, ...newItem }];

            authRouter.authenticateToken.mockImplementation(
                (req, res, next) => {
                    req.user = mockUser;
                    next();
                }
            );

            DB.addMenuItem.mockResolvedValue();
            DB.getMenu.mockResolvedValue(updatedMenu);

            const res = await request(app)
                .put("/api/order/menu")
                .set("Authorization", "Bearer tttttt")
                .send(newItem);

            expect(res.statusCode).toBe(200);
            expect(res.body).toEqual(updatedMenu);
            expect(DB.addMenuItem).toHaveBeenCalledWith(newItem);
            expect(DB.getMenu).toHaveBeenCalled();
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
                .put("/api/order/menu")
                .set("Authorization", "Bearer tttttt")
                .send({ title: "Student" });

            expect(res.statusCode).toBe(403);
            expect(res.body).toEqual({});
        });
    });

    describe("GET /api/order", () => {
        test("should return user orders", async () => {
            const mockUser = { id: 1 };
            const orders = {
                dinerId: 1,
                orders: [
                    {
                        id: 1,
                        franchiseId: 1,
                        storeId: 1,
                        date: "2024-06-05T05:14:40.000Z",
                        items: [
                            {
                                id: 1,
                                menuId: 1,
                                description: "Veggie",
                                price: 0.05,
                            },
                        ],
                    },
                ],
                page: 1,
            };

            authRouter.authenticateToken.mockImplementation(
                (req, res, next) => {
                    req.user = mockUser;
                    next();
                }
            );

            DB.getOrders.mockResolvedValue(orders);

            const res = await request(app)
                .get("/api/order")
                .set("Authorization", "Bearer tttttt");

            expect(res.statusCode).toBe(200);
            expect(res.body).toEqual(orders);
            expect(DB.getOrders).toHaveBeenCalledWith(mockUser, undefined);
        });
    });

    describe("POST /api/order", () => {
        test("should create a new order for authenticated user", async () => {
            const mockUser = {
                id: 1,
                name: "John Doe",
                email: "john@example.com",
            };
            const newOrder = {
                franchiseId: 1,
                storeId: 1,
                items: [{ menuId: 1, description: "Veggie", price: 0.05 }],
            };
            const order = { ...newOrder, id: 1 };
            const factoryResponse = {
                jwt: "1111111111",
                reportUrl: "http://factory.example.com/report",
            };

            authRouter.authenticateToken.mockImplementation(
                (req, res, next) => {
                    req.user = mockUser;
                    next();
                }
            );

            DB.addDinerOrder.mockResolvedValue(order);
            fetch.mockResolvedValue({
                ok: true,
                json: jest.fn().mockResolvedValue(factoryResponse),
            });

            const res = await request(app)
                .post("/api/order")
                .set("Authorization", "Bearer tttttt")
                .send(newOrder);

            expect(res.statusCode).toBe(200);
            expect(res.body).toHaveProperty("order", order);

            expect(DB.addDinerOrder).toHaveBeenCalledWith(mockUser, newOrder);
        });
    });
});
