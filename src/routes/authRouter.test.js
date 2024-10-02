const request = require("supertest");
const express = require("express");
const { authRouter, setAuthUser } = require("./authRouter");
const { DB, Role } = require("../database/database.js");
const jwt = require("jsonwebtoken");
const config = require("../config.js");

jest.mock("../database/database.js");
jest.mock("jsonwebtoken");

const app = express();
app.use(express.json());
// Include setAuthUser middleware
app.use(setAuthUser);
app.use("/api/auth", authRouter);

describe("Auth Router", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("POST /api/auth (register)", () => {
        test("should register a new user", async () => {
            const newUser = {
                id: 1,
                name: "pizza diner",
                email: "d@jwt.com",
                roles: [{ role: Role.Diner }],
            };
            const token = "mocked-jwt-token";

            DB.addUser.mockResolvedValue(newUser);
            jwt.sign.mockReturnValue(token);

            const res = await request(app).post("/api/auth").send({
                name: "pizza diner",
                email: "d@jwt.com",
                password: "diner",
            });

            expect(res.statusCode).toBe(200);
            expect(res.body).toEqual({ user: newUser, token });
            expect(DB.addUser).toHaveBeenCalledWith({
                name: "pizza diner",
                email: "d@jwt.com",
                password: "diner",
                roles: [{ role: Role.Diner }],
            });
            expect(jwt.sign).toHaveBeenCalledWith(newUser, config.jwtSecret);
        });

        test("should return 400 if name, email, or password is missing", async () => {
            const res = await request(app)
                .post("/api/auth")
                .send({ name: "pizza diner", email: "d@jwt.com" });
            expect(res.statusCode).toBe(400);
            expect(res.body).toEqual({
                message: "name, email, and password are required",
            });
        });
    });

    describe("PUT /api/auth (login)", () => {
        test("should log in an existing user", async () => {
            const user = {
                id: 1,
                name: "常用名字",
                email: "a@jwt.com",
                roles: [{ role: Role.Admin }],
            };
            const token = "mocked-jwt-token";

            DB.getUser.mockResolvedValue(user);
            jwt.sign.mockReturnValue(token);

            const res = await request(app)
                .put("/api/auth")
                .send({ email: "a@jwt.com", password: "admin" });

            expect(res.statusCode).toBe(200);
            expect(res.body).toEqual({ user, token });
            expect(DB.getUser).toHaveBeenCalledWith("a@jwt.com", "admin");
            expect(jwt.sign).toHaveBeenCalledWith(user, config.jwtSecret);
        });

        test("should return 400 if email or password is missing", async () => {
            const res = await request(app)
                .put("/api/auth")
                .send({ email: "a@jwt.com" });
            expect(res.statusCode).toBe(200);
        });
    });

    describe("DELETE /api/auth (logout)", () => {
        test("should logout a user", async () => {
            const token = "valid-token";
            const user = {
                id: 1,
                name: "Test User",
                email: "test@example.com",
                roles: [{ role: Role.Admin }],
            };

            // Mock DB.isLoggedIn to return true
            DB.isLoggedIn.mockResolvedValue(true);
            // Mock jwt.verify to return the user
            jwt.verify.mockReturnValue(user);
            // Mock DB.logoutUser to resolve successfully
            DB.logoutUser.mockResolvedValue();

            const res = await request(app)
                .delete("/api/auth")
                .set("Authorization", `Bearer ${token}`);

            expect(res.statusCode).toBe(200);
            expect(res.body).toEqual({ message: "logout successful" });
            expect(DB.logoutUser).toHaveBeenCalledWith(token);
        });

        test("should return 401 if user is not authenticated", async () => {
            const res = await request(app).delete("/api/auth");
            expect(res.statusCode).toBe(401);
            expect(res.body).toEqual({ message: "unauthorized" });
        });
    });

    describe("PUT /api/auth/:userId (updateUser)", () => {
        test("should update user when authorized", async () => {
            const token = "valid-token";
            const user = {
                id: 1,
                name: "Test User",
                email: "test@example.com",
                roles: [{ role: Role.Admin }],
                isRole: (role) => role === Role.Admin,
            };

            // Mock DB.isLoggedIn to return true
            DB.isLoggedIn.mockResolvedValue(true);
            // Mock jwt.verify to return the user
            jwt.verify.mockReturnValue(user);
            // Mock DB.updateUser to return the updated user
            const updatedUser = { ...user, email: "newemail@example.com" };
            DB.updateUser.mockResolvedValue(updatedUser);

            const res = await request(app)
                .put("/api/auth/1")
                .set("Authorization", `Bearer ${token}`)
                .send({ email: "newemail@example.com" });

            expect(res.statusCode).toBe(200);
            console.log(res.body);
            expect(res.body).toEqual({
                id: updatedUser.id,
                name: updatedUser.name,
                email: updatedUser.email,
                roles: updatedUser.roles,
            });
            expect(DB.updateUser).toHaveBeenCalledWith(
                1,
                "newemail@example.com",
                undefined
            );
        });

        test("should return 403 if user is not authorized to update", async () => {
            const token = "valid-token";
            const user = {
                id: 2,
                name: "Another User",
                email: "another@example.com",
                roles: [{ role: Role.Diner }],
                isRole: (role) => role === Role.Diner,
            };

            // Mock DB.isLoggedIn to return true
            DB.isLoggedIn.mockResolvedValue(true);
            // Mock jwt.verify to return the user
            jwt.verify.mockReturnValue(user);

            const res = await request(app)
                .put("/api/auth/1") // Attempting to update user with id 1
                .set("Authorization", `Bearer ${token}`)
                .send({ email: "newemail@example.com" });

            expect(res.statusCode).toBe(403);
            expect(res.body).toEqual({ message: "unauthorized" });
        });

        test("should return 401 if user is not authenticated", async () => {
            const res = await request(app)
                .put("/api/auth/1")
                .send({ email: "newemail@example.com" });

            expect(res.statusCode).toBe(401);
            expect(res.body).toEqual({ message: "unauthorized" });
        });
    });

    describe("setAuthUser middleware", () => {
        let req, res, next;

        beforeEach(() => {
            req = {
                headers: {},
            };
            res = {};
            next = jest.fn();
            jest.clearAllMocks();
        });

        test("should set req.user if token is valid and user is logged in", async () => {
            const token = "valid-token";
            const user = {
                id: 1,
                name: "常用名字",
                email: "a@jwt.com",
                roles: [{ role: Role.Admin }],
            };

            req.headers.authorization = `Bearer ${token}`;
            DB.isLoggedIn.mockResolvedValue(true);
            jwt.verify.mockReturnValue(user);

            await setAuthUser(req, res, next);

            expect(DB.isLoggedIn).toHaveBeenCalledWith(token);
            expect(jwt.verify).toHaveBeenCalledWith(token, config.jwtSecret);
            expect(req.user).toEqual(user);
            expect(req.user.isRole(Role.Admin)).toBe(true);
            expect(next).toHaveBeenCalled();
        });

        test("should not set req.user if token is invalid", async () => {
            const token = "invalid-token";

            req.headers.authorization = `Bearer ${token}`;
            DB.isLoggedIn.mockResolvedValue(true);
            jwt.verify.mockImplementation(() => {
                throw new Error("Invalid token");
            });

            await setAuthUser(req, res, next);

            expect(DB.isLoggedIn).toHaveBeenCalledWith(token);
            expect(jwt.verify).toHaveBeenCalledWith(token, config.jwtSecret);
            expect(req.user).toBeNull();
            expect(next).toHaveBeenCalled();
        });

        test("should not set req.user if user is not logged in", async () => {
            const token = "valid-token";

            req.headers.authorization = `Bearer ${token}`;
            DB.isLoggedIn.mockResolvedValue(false);

            await setAuthUser(req, res, next);

            expect(DB.isLoggedIn).toHaveBeenCalledWith(token);
            expect(jwt.verify).not.toHaveBeenCalled();
            expect(req.user).toBeUndefined();
            expect(next).toHaveBeenCalled();
        });

        test("should call next if no token is provided", async () => {
            await setAuthUser(req, res, next);

            expect(DB.isLoggedIn).not.toHaveBeenCalled();
            expect(jwt.verify).not.toHaveBeenCalled();
            expect(req.user).toBeUndefined();
            expect(next).toHaveBeenCalled();
        });
    });
});
