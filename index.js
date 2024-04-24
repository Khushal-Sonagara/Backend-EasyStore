const express = require('express');
const cors = require('cors');
require('./db/config');
const app = express();
const User = require("./db/User");
const Product = require("./db/Product");
const Cart = require('./db/Cart');
const Sale = require('./db/Sales');
const body_parser = require('body-parser');

app.use(body_parser.json());
app.use(cors());

app.post("/register", async (req, res) => {
    let user = new User(req.body);
    let result = await user.save();
    result = result.toObject();
    delete result.password;
    res.send(result)
});

app.post("/login", async (req, res) => {
    if (req.body.password && req.body.email) {
        let user = await User.findOne(req.body).select("-password");
        if (user) {
            // let user = await User.findOne(req.body)
            res.status(200).send(user)
        } else {
            // res. sendStatus(404) 
            res.status(404).send({ statuscode: 404, result: "No User Found" })
        }
    }
    else {
        // res. sendStatus(404) 
        res.status(404).send({ statuscode: 404, result: "No User Found" })
    }
});

app.get('/users', async (req, res) => {
    try {
        const users = await User.find({}, '-password');
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.get('/users/:id', async (req, res) => {
    const userId = req.params.id;
    try {
        const user = await User.findById(userId).select('-password');
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.get("/product", async (req, res) => {
    const product = await Product.find();
    res.send(product)
});

app.get('/product/:id', async (req, res) => {
    // console.log(req.params.id);
    const prod = await Product.findById(req.params.id);
    res.send(prod);
});

app.post("/add-product", async (req, res) => {
    // console.log(req.body);
    let product = new Product(req.body);
    // console.log(product);
    product = await product.save();
    res.send(product);
});

app.put("/update-product/:productId", async (req, res) => {

    try {
        const productId = req.params.productId;
        const updateFields = req.body;
        // console.log(updateFields);
        if (!productId) {
            return res.status(400).json({ error: "productId is required" });
        }

        const updatedProduct = await Product.updateOne({ _id: productId }, updateFields, { new: true });

        if (!updatedProduct) {
            return res.status(404).json({ error: "Product not found" });
        }

        res.json(updatedProduct);
    } catch (error) {
        console.error("Error updating product:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

app.delete("/delete-product/:id", async (req, res) => {
    let product = await Product.findById(req.params.id)
    if (!product) { return res.status(400).send("no such product") }
    await product.deleteOne();
    res.send(product);
});
//------------------------------CART OPERATIONS---------------------------  

app.get('/carts/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;
        const cart = await Cart.find({ user: userId }).populate({ path: 'product.productId', model: 'Product' });
        if (!cart) {
            return res.status(404).json({ message: "Cart not found" });
        }

        // Calculate total amount
        let totalAmount = 0;
        cart.forEach(cartItem => {
            cartItem.product.forEach(item => {
                if (item.productId && item.productId.price) {
                    totalAmount += parseFloat(item.productId.price) * item.quantity;
                }
            });
        });

        // Prepare response with total amount
        const response = {
            cart,
            totalAmount
        };

        res.json(response);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/carts/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;
        const { productId, quantity } = req.body;
        let cart = await Cart.findOne({ user: userId });

        if (!cart) {
            cart = new Cart({ user: userId });
        }
        const existingProductIndex = cart.product.findIndex(item => item.productId.toString() === productId);

        if (existingProductIndex !== -1) {
            cart.product[existingProductIndex].quantity += quantity;
        } else {
            cart.product.push({ productId, quantity });
        }

        const savedCart = await cart.save();
        res.json(savedCart);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/carts/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;
        const { productId, quantity } = req.body;
        const updatedCart = await Cart.findOneAndUpdate({ user: userId }, { product: { productId, quantity } }, { new: true });
        if (!updatedCart) {
            return res.status(404).json({ message: "Cart not found" });
        }
        res.json(updatedCart);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/carts/:userId/:productId', async (req, res) => {
    try {
        const userId = req.params.userId;
        const productIdToDelete = req.params.productId;

        // Find the cart belonging to the user
        let cart = await Cart.findOne({ user: userId });

        // If the cart doesn't exist, return an error
        if (!cart) {
            return res.status(404).json({ message: "Cart not found" });
        }

        // Find the index of the product to delete
        const productIndex = cart.product.findIndex(item => String(item.productId) === productIdToDelete);

        // If the product is not found in the cart, return an error
        if (productIndex === -1) {
            return res.status(404).json({ message: "Product not found in the cart" });
        }

        // Remove the product from the product array
        cart.product.splice(productIndex, 1);

        // Save the updated cart
        const updatedCart = await cart.save();

        // Respond with the updated cart
        res.json(updatedCart);
    } catch (error) {
        // Handle any errors
        res.status(500).json({ error: error.message });
    }
});

app.delete('/carts/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;
        const deletedCart = await Cart.findOneAndDelete({ user: userId });
        if (!deletedCart) {
            return res.status(404).json({ message: "Cart not found" });
        }
        res.json({ message: "Cart deleted successfully" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/update-product-quantity', async (req, res) => {
    try {
        const cart = req.body.cart;
        for (const cartItem of cart) {
            for (const item of cartItem.product) {
                await Product.findByIdAndUpdate(item.productId, { $inc: { quantity: -item.quantity } });
            }
        }
        res.status(200).json({ message: 'Product quantities updated successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});
//------------------------------Sales-------------------------------------

app.post('/add-all-sales', async (req, res) => {
    try {
        const currentTime = new Date();
        const salesDateAndTime = []
        const saleTime = currentTime.toLocaleTimeString();
        const { cart, name, phoneNumber, email } = req.body;
        for (const cartItem of cart) {
            for (const item of cartItem.product) {
                const sale = new Sale({
                    productId: item.productId._id,
                    soldQuantity: item.quantity,
                    saleDate: currentTime,
                    saleTime: saleTime,
                    name: name,
                    phoneNumber: phoneNumber,
                    email: email
                });

                await sale.save();
                salesDateAndTime.push({
                    saleDate: currentTime,
                    saleTime: saleTime
                });
            }
        }
        await fetch("http://localhost:5000/update-product-quantity", {
            method: "POST",
            body: JSON.stringify({ cart }),
            headers: { "Content-Type": "application/json" }
        });
        res.status(201).json({ message: 'All sales records added successfully', salesDateAndTime });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.get('/sales/:id', async (req, res) => {
    const saleId = req.params.id;
    try {
        const sale = await Sale.findById(saleId).populate({ path: 'productId', model: 'Product' });
        if (!sale) {
            return res.status(404).json({ error: 'Sale not found' });
        }
        res.json(sale);
    } catch (error) {
        console.error('Error retrieving sale:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/total-sales', async (req, res) => {
    try {
        const totalSales = await Sale.aggregate([
            { $group: { _id: null, totalQuantity: { $sum: "$soldQuantity" } } }
        ]);
        res.json(totalSales);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.get('/products-sold-more', async (req, res) => {
    try {
        const productsSoldMore = await Sale.aggregate([
            { $group: { _id: "$productId", totalQuantity: { $sum: "$soldQuantity" } } },
            { $sort: { totalQuantity: -1 } },
            { $lookup: { from: 'products', localField: '_id', foreignField: '_id', as: 'product' } },
            { $unwind: '$product' }
        ]);
        res.json(productsSoldMore);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.get('/sales-week', async (req, res) => {
    try {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 7);
        const salesWeek = await Sale.find({ saleDate: { $gte: startDate } }).populate({ path: 'productId', model: 'Product' });

        let totalSales = 0;
        salesWeek.forEach(sale => {
            const totalPrice = parseFloat(sale.productId.price) * sale.soldQuantity;
            totalSales += totalPrice;
        });

        res.json({ totalSales: totalSales.toFixed(2), salesWeek });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.get('/sales-month', async (req, res) => {
    try {
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 1);
        const salesMonth = await Sale.find({ saleDate: { $gte: startDate } }).populate({ path: 'productId', model: 'Product' });

        let totalSales = 0;
        salesMonth.forEach(sale => {
            const totalPrice = parseFloat(sale.productId.price) * sale.soldQuantity;
            totalSales += totalPrice;
        });

        res.json({ totalSales: totalSales.toFixed(2), salesMonth });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.get('/sales-year', async (req, res) => {
    try {
        const startDate = new Date();
        startDate.setFullYear(startDate.getFullYear() - 1);
        const salesYear = await Sale.find({ saleDate: { $gte: startDate } }).populate({ path: 'productId', model: 'Product' });

        let totalSales = 0;
        salesYear.forEach(sale => {
            const totalPrice = parseFloat(sale.productId.price) * sale.soldQuantity;
            totalSales += totalPrice;
        });

        res.json({ totalSales: totalSales.toFixed(2), salesYear });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.get('/seven-days-sales', async (req, res) => {
    try {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 7); // Get the date 7 days ago

        const sales = await Sale.aggregate([
            {
                $match: {
                    saleDate: { $gte: startDate } // Filter sales for the last 7 days
                }
            },
            {
                $lookup: {
                    from: "products",
                    localField: "productId",
                    foreignField: "_id",
                    as: "product"
                }
            },
            {
                $unwind: "$product" // Unwind to deconstruct the product array
            },
            {
                $addFields: {
                    date: { $dateToString: { format: "%Y-%m-%d", date: "$saleDate" } }, // Rename _id to date
                    dayOfWeek: {
                        $switch: {
                            branches: [
                                { case: { $eq: [{ $dayOfWeek: "$saleDate" }, 1] }, then: "Sun" },
                                { case: { $eq: [{ $dayOfWeek: "$saleDate" }, 2] }, then: "Mon" },
                                { case: { $eq: [{ $dayOfWeek: "$saleDate" }, 3] }, then: "Tue" },
                                { case: { $eq: [{ $dayOfWeek: "$saleDate" }, 4] }, then: "Wed" },
                                { case: { $eq: [{ $dayOfWeek: "$saleDate" }, 5] }, then: "Thu" },
                                { case: { $eq: [{ $dayOfWeek: "$saleDate" }, 6] }, then: "Fri" },
                                { case: { $eq: [{ $dayOfWeek: "$saleDate" }, 7] }, then: "Sat" }
                            ],
                            default: "Unknown"
                        }
                    }
                }
            },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$saleDate" } }, // Group sales by date
                    dayOfWeek: { $first: "$dayOfWeek" },
                    totalAmount: { $sum: { $multiply: ["$soldQuantity", "$product.price"] } } // Calculate total amount for each day
                }
            },
            {
                $project: {
                    date: "$_id", // Rename _id to date
                    dayOfWeek: 1,
                    totalAmount: 1,
                    _id: 0
                }
            },
            {
                $sort: { date: 1 } // Sort by date
            }
        ]);
        res.json(sales);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.get('/sales-history', async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const option = req.query.option; // Add option query parameter

    let dateFilter = {};
    switch (option) {
        case "yesterday":
            dateFilter = { $gte: new Date(new Date() - 24 * 60 * 60 * 1000) }; // Filter for yesterday
            break;
        case "lastSevenDays":
            dateFilter = { $gte: new Date(new Date() - 7 * 24 * 60 * 60 * 1000) }; // Filter for last 7 days
            break;
        case "lastThirtyDays":
            dateFilter = { $gte: new Date(new Date() - 30 * 24 * 60 * 60 * 1000) }; // Filter for last 30 days
            break;
        case "custom":
            const startDate = req.query.startDate;
            const endDate = req.query.endDate;

            if (startDate && endDate) {
                dateFilter = { $gte: new Date(startDate), $lte: new Date(endDate) };
            } else {
                res.status(400).json({ message: "Both startDate and endDate are required for custom filter." });
                return;
            }
            break;
        default:
            break;
    }
    try {
        let query = {};
        if (Object.keys(dateFilter).length !== 0) {
            query = { saleDate: dateFilter };
        }

        const productsSoldByDate = await Sale.aggregate([
            { $match: query },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$saleDate" } },
                    sales: { $push: { _id: "$_id", productId: "$productId", soldQuantity: "$soldQuantity", name: "$name", phoneNumber: "$phoneNumber" } }
                }
            },
            {
                $project: {
                    _id: 0,
                    date: "$_id",
                    sales: 1,
                }
            },
            {
                $sort: { "date": -1 }
            },
            {
                $skip: skip
            },
            {
                $limit: limit
            }
        ]);

        for (const dateGroup of productsSoldByDate) {
            await Sale.populate(dateGroup.sales, { path: 'productId', model: 'Product' });
        }

        res.json(productsSoldByDate);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

app.listen(5000, () => {
    console.log('Server started @5000');
});
