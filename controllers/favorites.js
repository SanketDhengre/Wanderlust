const Listing = require("../models/listing");
const User = require("../models/user");
const Favorite = require("../models/favorite");

module.exports.toggleFavorite = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    // Find existing favorite
    let favorite = await Favorite.findOne({ user: userId, listing: id });

    if (favorite) {
      // Remove favorite
      await Favorite.deleteOne({ _id: favorite._id });
      await User.findByIdAndUpdate(userId, { $pull: { favorites: id } });
      res.json({ success: true, favorited: false });
    } else {
      // Create favorite
      favorite = new Favorite({ user: userId, listing: id });
      await favorite.save();
      await User.findByIdAndUpdate(userId, { $push: { favorites: id } });
      res.json({ success: true, favorited: true });
    }
  } catch (error) {
    console.error("Favorite toggle error:", error);
    res.status(500).json({ success: false, error: "Server error" });
  }
};

module.exports.getFavorites = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId).populate({
      path: "favorites",
      populate: {
        path: "owner",
        model: "User",
      },
    });
    res.json({ favorites: user.favorites });
  } catch (error) {
    console.error("Get favorites error:", error);
    res.status(500).json({ success: false, error: "Server error" });
  }
};
