const mongoose = require('mongoose');

const saleSchema = new mongoose.Schema({
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    soldQuantity: {
        type: Number,
        required: true
    },
    saleDate: {
        type: Date,
        default: Date.now
    },
    saleTime: {
        type: String,
        required: true
    },
    name:{
        type : String,
        required:true 
    },
    phoneNumber:{
        type :String ,
        required:true
    },
    email:{
        type:String,
        required:true
    }
});


module.exports=mongoose.model("Sale",saleSchema);