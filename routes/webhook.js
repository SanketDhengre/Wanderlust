const express = require("express");
const router = express.Router();
const webhooksController = require("../controllers/webhooks.js");

// Parse JSON body while capturing raw buffer for HMAC signature verification
router.post(
  "/cloudinary",
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf.toString();
    },
  }),
  webhooksController.cloudinaryWebhook
);

module.exports = router;

