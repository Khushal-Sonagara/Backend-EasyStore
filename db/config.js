const mongoose = require('mongoose');

mongoose.connect('mongodb+srv://22010101181:22010101181@cluster0.x97ttow.mongodb.net/easystore')
.then(() => {
   console.log('connected to atlas');
   console.log('-----------------------------------------------------------------------------------------')
});
