const express = require("express");
const router = express.Router();
const User = require("../models/user.js");
const wrapAsync = require("../utils/wrapAsync.js");
const passport = require("passport");
const { saveRedirectUrl } = require("../middleware.js");
const usersController = require("../controllers/users.js");

router
  .route("/signup")
  .get(usersController.renderSignupForm) // Use the renderSignupForm controller function
  .post(wrapAsync(usersController.signup)); // Use the signup controller function

router
  .route("/login")
  .get(usersController.renderLoginForm) // Use the renderLoginForm controller function
  .post(
    saveRedirectUrl, // Save the redirect URL before authentication
    passport.authenticate("local", {
      failureFlash: true,
      failureRedirect: "/login",
    }),
    usersController.login // Use the login controller function
  );

router.get("/logout", usersController.logout); // Use the logout controller function

module.exports = router;
