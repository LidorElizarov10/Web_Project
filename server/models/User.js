const mongoose = require("mongoose");

// Schema = מבנה של מסמך
const UserSchema = new mongoose.Schema({
  username: String,
  password: String
});

// יצוא המודל
module.exports = mongoose.model("User", UserSchema);
