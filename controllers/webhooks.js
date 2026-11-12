const Listing = require("../models/listing");
const { cloudinary } = require("../cloudConfig");

module.exports.cloudinaryWebhook = async (req, res) => {
  try {
    const timestamp = req.headers["x-cld-timestamp"];
    const signature = req.headers["x-cld-signature"];

    // Validate signature when Cloudinary sends signature headers
    if (timestamp && signature) {
      const isValid = cloudinary.utils.verifyNotificationSignature(
        req.rawBody || JSON.stringify(req.body),
        parseInt(timestamp, 10),
        signature
      );

      if (!isValid) {
        console.warn("[Cloudinary Webhook] Invalid signature received.");
        return res.status(401).json({ error: "Invalid signature" });
      }
    }

    const {
      notification_type,
      public_id,
      secure_url,
      moderation_status,
      eager,
    } = req.body;

    console.log(`[Cloudinary Webhook] Received "${notification_type}" notification for asset: ${public_id}`);

    // 1. Handle AI Moderation events
    if (moderation_status) {
      if (moderation_status === "rejected") {
        const updated = await Listing.findOneAndUpdate(
          { "image.filename": public_id },
          { status: "Rejected" },
          { new: true }
        );
        if (updated) {
          console.log(`[Cloudinary Webhook] Listing "${updated.title}" marked as Rejected by moderation.`);
        }
      } else if (moderation_status === "approved") {
        const updated = await Listing.findOneAndUpdate(
          { "image.filename": public_id },
          { status: "Verified" },
          { new: true }
        );
        if (updated) {
          console.log(`[Cloudinary Webhook] Listing "${updated.title}" marked as Verified.`);
        }
      }
    }

    // 2. Handle Eager / Async transformations (e.g., optimized WebP/thumbnails)
    if (eager && eager.length > 0 && eager[0].secure_url) {
      const optimizedUrl = eager[0].secure_url;
      await Listing.findOneAndUpdate(
        { "image.filename": public_id },
        { "image.url": optimizedUrl }
      );
      console.log(`[Cloudinary Webhook] Updated listing with optimized image URL: ${optimizedUrl}`);
    }

    // 3. Acknowledge with 200 OK so Cloudinary marks it delivered
    return res.status(200).json({ status: "success", received: true, public_id });
  } catch (err) {
    console.error("[Cloudinary Webhook Error]:", err);
    return res.status(500).json({ error: "Webhook processing error" });
  }
};

