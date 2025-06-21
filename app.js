if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}
const express = require("express");
const app = express();
const mongoose = require("mongoose");
const path = require("path");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const ExpressError = require("./utils/ExpressError.js");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const flash = require("connect-flash");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const User = require("./models/user.js");

const listingRouter = require("./routes/listing.js");
const reviewRouter = require("./routes/review.js");
const userRouter = require("./routes/user.js");

// const MONGO_URL = "mongodb://127.0.0.1:27017/Wanderlust";

const dbUrl = process.env.ATLASDB_URL;

app.use(methodOverride("_method"));

main()
  .then(() => {
    console.log("Connected to MongoDB");
  })
  .catch((err) => {
    console.error("Error connecting to MongoDB", err);
  });

async function main() {
  await mongoose.connect(dbUrl);
}

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({ extended: true }));
app.engine("ejs", ejsMate);
app.use(express.static(path.join(__dirname, "public")));

// app.get("/", (req, res) => {
//   res.send("Hello World");
// });

const store = MongoStore.create({
  mongoUrl: dbUrl,
  crypto: {
    secret: process.env.SECRET, // used to encrypt session data
  },
  touchAfter: 24 * 3600, // time period in seconds after which session will be updated
});

store.on("error", function (e) {
  console.log("Session Store Error in MongoDB session store", e);
});

const sessionOptions = {
  store: store,
  secret: process.env.SECRET, // used to encrypt session data
  resave: false,
  saveUninitialized: true,
  cookie: {
    httpOnly: true,
    expires: Date.now() + 1000 * 60 * 60 * 24 * 7, // 7 days
    maxAge: 1000 * 60 * 60 * 24 * 7, //1000 * 60 * 60 * 24   --->   1 day
  },
};

app.get("/", (req, res) => {
  res.redirect("/listings");
});

app.use(session(sessionOptions));
app.use(flash()); // need to use flash before routes

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use((req, res, next) => {
  res.locals.success = req.flash("success");
  res.locals.error = req.flash("error");
  res.locals.currUser = req.user; // make currentUser available in all templates
  next();
});

// app.get("/demouser", async (req, res) => {
//   let fakeUser = new User({
//     email: "delta@gmail.com",
//     username: "demouser",
//   });
//   let registeredUser = await User.register(fakeUser, "helloWorld");
//   res.send(registeredUser);
// });

app.use("/listings", listingRouter);
app.use("/listings/:id/reviews", reviewRouter);
app.use("/", userRouter);

// Error handling middleware
app.use((err, req, res, next) => {
  let { statusCode = 500, message = "Some Error Occured!" } = err;
  res.status(statusCode).render("error.ejs", { message });
});

app.listen(8080, () => {
  console.log("Server is running on port 8080");
});
