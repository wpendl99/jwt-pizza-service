const mysql = require("mysql2/promise");
const { DB } = require("./database");
const jwt = require("jsonwebtoken");
const config = require("../config.js");
const { StatusCodeError } = require("../endpointHelper.js");

let testDB;

beforeAll(async () => {
    testDB = DB;

    // Modify the database name for the test environment
    const connection = await mysql.createConnection({
        host: config.db.connection.host,
        user: config.db.connection.user,
        password: config.db.connection.password,
    });

    await connection.query(
        `CREATE DATABASE IF NOT EXISTS test_${config.db.connection.database}`
    );
    await connection.query(`USE test_${config.db.connection.database}`);
    await connection.end();

    // Update the configuration to point to the test database
    config.db.connection.database = `test_${config.db.connection.database}`;

    // Initialize the test database
    await testDB.initializeDatabase();
});

afterAll(async () => {
    // Clean up the test database after all tests
    const connection = await mysql.createConnection({
        host: config.db.connection.host,
        user: config.db.connection.user,
        password: config.db.connection.password,
    });

    await connection.query(
        `DROP DATABASE IF EXISTS ${config.db.connection.database}`
    );
    await connection.end();
});

describe("DB Tests", () => {
    test("should add a menu item", async () => {
        const newItem = {
            title: "Pizza",
            description: "Cheese pizza",
            image: "pizza.jpg",
            price: 9.99,
        };
        const result = await testDB.addMenuItem(newItem);

        expect(result).toHaveProperty("id");
        expect(result.title).toBe("Pizza");
    });

    test("should get all menu items", async () => {
        // Add a menu item to the test database
        const newItem = {
            title: "PizzaPizza",
            description: "Cheese pizza",
            image: "pizza.jpg",
            price: 9.99,
        };
        await testDB.addMenuItem(newItem);
        const items = await testDB.getMenu();

        expect(items).toBeInstanceOf(Array);
        expect(items).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    title: "PizzaPizza",
                    description: "Cheese pizza",
                    image: "pizza.jpg",
                    price: 9.99,
                }),
            ])
        );
    });

    test("should add a new user", async () => {
        const user = {
            name: "John Doe",
            email: "john@example.com",
            password: "password123",
            roles: [{ role: "admin" }],
        };
        const addedUser = await testDB.addUser(user);

        expect(addedUser).toHaveProperty("id");
        expect(addedUser.name).toBe("John Doe");
        expect(addedUser.password).toBeUndefined();
    });

    test("should get a user by email and password", async () => {
        const user = {
            name: "Jane Doe",
            email: "jane@example.com",
            password: "securepassword",
            roles: [{ role: "user" }],
        };

        await testDB.addUser(user);

        const fetchedUser = await testDB.getUser(user.email, user.password);

        expect(fetchedUser).toHaveProperty("id");
        expect(fetchedUser.email).toBe(user.email);
        expect(fetchedUser.roles).toEqual(
            expect.arrayContaining([expect.objectContaining({ role: "user" })])
        );
    });

    test("should fail to get user with incorrect password", async () => {
        const user = {
            name: "Jared Doe",
            email: "jared@example.com",
            password: "securepassword",
            roles: [{ role: "user" }],
        };
        const badPassword = "badpassword";

        await testDB.addUser(user);

        await expect(testDB.getUser(user.email, badPassword)).rejects.toThrow(
            StatusCodeError
        );
    });

    test("shouldn't update a user if given nothing", async () => {
        const user = {
            name: "Julia Doe",
            email: "julia@example.com",
            password: "securepassword",
            roles: [{ role: "user" }],
        };

        await testDB.addUser(user);

        const result = await testDB.getUser(user.email, user.password);
        const userID = result.id;

        // This fails because the database code sucks and still attempts to get the user even with no email or password
        // But in my defense, I only knew that because I know how the code works... :)
        await expect(testDB.updateUser(userID, null, null)).rejects.toThrow(
            StatusCodeError
        );
    });

    test("should update a user's email and password", async () => {
        const user = {
            name: "Jack Doe",
            email: "jake@example.com",
            password: "securepassword",
            roles: [{ role: "user" }],
        };
        const newEmail = "jake@email.com";
        const newPassword = "newpassword";

        await testDB.addUser(user);

        const result = await testDB.getUser(user.email, user.password);
        const userID = result.id;

        const updatedUser = await testDB.updateUser(
            userID,
            newEmail,
            newPassword
        );

        expect(updatedUser).toEqual(
            expect.objectContaining({
                id: userID,
                email: newEmail,
            })
        );
        await expect(
            testDB.getUser(newEmail, newPassword)
        ).resolves.toBeDefined();
    });

    test("should add a diner order", async () => {
        let user = {
            name: "Jerry Doe",
            email: "jerry@example.com",
            password: "password123",
            roles: [{ role: "user" }],
        };
        await testDB.addUser(user);

        user = await testDB.getUser(user.email, user.password);

        const newOrder = {
            franchiseId: 1,
            storeId: 1,
            items: [
                { menuId: 1, description: "Cheese Pizza", price: 9.99 },
                { menuId: 2, description: "Soda", price: 2.99 },
            ],
        };

        const result = await testDB.addDinerOrder(user, newOrder);

        expect(result).toHaveProperty("id");
        expect(result.items).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    description: "Cheese Pizza",
                    price: 9.99,
                }),
                expect.objectContaining({
                    description: "Soda",
                    price: 2.99,
                }),
            ])
        );
    });

    test("should get all orders for a user", async () => {
        let user = {
            name: "James Doe",
            email: "james@example.com",
            password: "securepassword",
            roles: [{ role: "user" }],
        };
        await testDB.addUser(user);
        user = await testDB.getUser(user.email, user.password);

        const newOrder1 = {
            franchiseId: 1,
            storeId: 1,
            items: [
                { menuId: 1, description: "Ham Pizza", price: 10.99 },
                { menuId: 2, description: "Water", price: 3.99 },
            ],
        };

        const newOrder2 = {
            franchiseId: 1,
            storeId: 1,
            items: [
                { menuId: 1, description: "Cheese Pizza", price: 9.99 },
                { menuId: 2, description: "Soda", price: 2.99 },
            ],
        };

        await testDB.addDinerOrder(user, newOrder1);
        await testDB.addDinerOrder(user, newOrder2);

        const orders = await testDB.getOrders(user);
        expect(orders).toHaveProperty("orders");
        expect(orders.dinerId).toBe(user.id);
        expect(orders.orders).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    franchiseId: 1,
                    storeId: 1,
                    items: expect.arrayContaining([
                        expect.objectContaining({
                            description: "Ham Pizza",
                            price: 10.99,
                        }),
                        expect.objectContaining({
                            description: "Water",
                            price: 3.99,
                        }), // Ensure "Water" is correct
                    ]),
                }),
                expect.objectContaining({
                    franchiseId: 1,
                    storeId: 1,
                    items: expect.arrayContaining([
                        expect.objectContaining({
                            description: "Cheese Pizza",
                            price: 9.99,
                        }),
                        expect.objectContaining({
                            description: "Soda",
                            price: 2.99,
                        }),
                    ]),
                }),
            ])
        );
    });

    test("should create a franchise with admins", async () => {
        const admin = {
            name: "Admin User",
            email: "admin@example.com",
            password: "adminpassword",
            roles: [{ role: "admin" }],
        };
        await testDB.addUser(admin);

        const newFranchise = {
            name: "Franchise A",
            admins: [{ email: "admin@example.com" }],
        };

        const franchise = await testDB.createFranchise(newFranchise);

        expect(franchise).toHaveProperty("id");
        expect(franchise.admins[0].email).toBe("admin@example.com");
    });

    test("should fail to create a franchise with a non-user", async () => {
        const newFranchise = {
            name: "Franchise B",
            admins: [{ email: "notauser@example.com" }],
        };

        await expect(testDB.createFranchise(newFranchise)).rejects.toThrow(
            StatusCodeError
        );
    });

    test("should delete a franchise", async () => {
        const franchise = {
            name: "Test Franchise",
            admins: [],
        };
        const createdFranchise = await testDB.createFranchise(franchise);

        await expect(
            testDB.deleteFranchise(createdFranchise.id)
        ).resolves.not.toThrow();
    });

    test("should retrieve franchises for a user", async () => {
        let user = {
            name: "Joe Doe",
            email: "joe@example.com",
            password: "password123",
            roles: [{ role: "franchisee", object: "Franchise A" }],
        };
        await testDB.addUser(user);

        user = await testDB.getUser(user.email, user.password);

        const franchises = await testDB.getUserFranchises(user.id);
        expect(franchises).toBeInstanceOf(Array);
    });

    test("should return an empty array for a user with no franchises", async () => {
        let user = {
            name: "Jill Doe",
            email: "jill@example.com",
            password: "password123",
            roles: [{ role: "user" }],
        };
        await testDB.addUser(user);

        user = await testDB.getUser(user.email, user.password);

        const franchises = await testDB.getUserFranchises(user.id);
        expect(franchises).toEqual([]);
    });

    test("should get franchises with authenticated admin user", async () => {
        const admin = {
            name: "Admin Franchise User",
            email: "adminfranchise@example.com",
            password: "adminpassword",
            roles: [{ role: "admin" }],
        };
        await testDB.addUser(admin);

        const newFranchise = {
            name: "Franchise D",
            admins: [{ email: "adminfranchise@example.com" }],
        };

        await testDB.createFranchise(newFranchise);

        const user = await testDB.getUser(admin.email, admin.password);

        user.isRole = function (roleName) {
            return roleName;
        };

        const franchises = await testDB.getFranchises(user);
        expect(franchises).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    name: "Franchise D",
                }),
            ])
        );
    });

    test("should get franchises with authenticated user", async () => {
        const admin = {
            name: "Admin Franchise User 2",
            email: "adminfranchise2@example.com",
            password: "adminpassword",
            roles: [{ role: "admin" }],
        };
        await testDB.addUser(admin);

        const newFranchise = {
            name: "Franchise E",
            admins: [{ email: "adminfranchise@example.com" }],
        };

        await testDB.createFranchise(newFranchise);

        const user = await testDB.getUser(admin.email, admin.password);

        user.isRole = function () {
            return false;
        };

        const franchises = await testDB.getFranchises(user);
        expect(franchises).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    name: "Franchise D",
                }),
            ])
        );
    });

    test("should create a store for a franchise", async () => {
        const franchise = { name: "Franchise B", admins: [] };
        const createdFranchise = await testDB.createFranchise(franchise);

        const store = { name: "Store 1" };
        const createdStore = await testDB.createStore(
            createdFranchise.id,
            store
        );

        expect(createdStore).toHaveProperty("id");
        expect(createdStore.name).toBe("Store 1");
    });

    test("should delete a store", async () => {
        const franchise = { name: "Franchise C", admins: [] };
        const createdFranchise = await testDB.createFranchise(franchise);

        const store = { name: "Store 2" };
        const createdStore = await testDB.createStore(
            createdFranchise.id,
            store
        );

        await expect(
            testDB.deleteStore(createdFranchise.id, createdStore.id)
        ).resolves.not.toThrow();
    });

    test("should log in a user and check login status", async () => {
        let user = {
            name: "Judy Doe",
            email: "judy@example.com",
            password: "securepassword",
            roles: [{ role: "user" }],
        };
        await testDB.addUser(user);

        user = await testDB.getUser(user.email, user.password);

        const token = jwt.sign(user, config.jwtSecret);
        await testDB.loginUser(user.id, token);

        const isLoggedIn = await testDB.isLoggedIn(token);
        expect(isLoggedIn).toBe(true);
    });

    test("should log out a user", async () => {
        let user = {
            name: "Jenny Doe",
            email: "jenny@example.com",
            password: "securepassword",
            roles: [{ role: "user" }],
        };
        await testDB.addUser(user);

        user = await testDB.getUser(user.email, user.password);

        const token = jwt.sign(user, config.jwtSecret);
        await testDB.loginUser(user.id, token);

        await testDB.logoutUser(token);

        const isLoggedIn = await testDB.isLoggedIn(token);
        expect(isLoggedIn).toBe(false);
    });

    test("expects getTokenSignature to return '' with invalid token", async () => {
        const token = "test";
        const signature = testDB.getTokenSignature(token);
        expect(signature).toBe("");
    });

    // Add more tests for other functions as needed
});
