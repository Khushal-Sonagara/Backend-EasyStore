const mongoose = require('mongoose');

const productSchema=new mongoose.Schema({
    name:String,
    price:String,
    category:String,
    userId:String,
    company:String,
    quantity:Number
});

module.exports=mongoose.model("Product",productSchema);

