const mongoose = require("mongoose");

const eventSchema = mongoose.Schema({
    name:String,
    date:String,
    venue:String,
    time:String,
    category:String,
    userId:String,
    club:String
});
module.exports = mongoose.model("events",eventSchema);