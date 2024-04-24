const mongoose = require('mongoose');

const cartSchema = new mongoose.Schema({
    product: [{
        productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' }, 
        quantity: Number
    }],
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        unique: true
    }
});

module.exports = mongoose.model("Cart", cartSchema);
