# Wanderlust - A Full-Stack Vacation Rental Platform

Wanderlust is a robust and feature-rich full-stack web application inspired by Airbnb. It allows users to discover, list, and review vacation rental properties around the world. The platform is built with a modern technology stack, following best practices in web development, including the MVC architectural pattern, RESTful routing, and secure user authentication.

## Table of Contents

- [Live Demo](#live-demo)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Directory Structure](#directory-structure)
- [Key Concepts Implemented](#key-concepts-implemented)
- [Setup and Installation](#setup-and-installation)
- [Environment Variables](#environment-variables)

## Live Demo

Project Link: https://wanderlust-bgd8.onrender.com/listings

## Features

- **User Authentication**: Secure user registration and login system using Passport.js.
- **Persistent Sessions**: User sessions are stored in MongoDB, ensuring users remain logged in even after server restarts.
- **CRUD Operations for Listings**: Authenticated users can Create, Read, Update, and Delete their own property listings.
- **Image Uploads**: Seamless image uploads for listings, hosted on Cloudinary for fast and reliable delivery.
- **Reviews and Ratings**: Users can post reviews with comments and a star rating (1-5) on listings.
- **Authorization**:
  - Only logged-in users can create listings or post reviews.
  - Only the owner of a listing can edit or delete it.
  - Only the author of a review can delete it.
- **Server-Side Validation**: Robust validation for listing and review data using Joi to ensure data integrity.
- **Flash Messaging**: Provides users with contextual feedback (e.g., "Successfully created listing!", "You must be logged in!").
- **RESTful Routing**: Clean, predictable, and well-structured API endpoints.
- **Responsive Design**: A user-friendly interface that works on various devices (assuming frontend is designed to be responsive).

## Tech Stack

| Category          | Technology                                                                                             |
| ----------------- | ------------------------------------------------------------------------------------------------------ |
| **Backend**       | Node.js, Express.js                                                                                    |
| **Database**      | MongoDB (with Mongoose ODM), MongoDB Atlas for cloud hosting                                           |
| **View Engine**   | EJS (Embedded JavaScript), with `ejs-mate` for layouts                                                 |
| **Authentication**| Passport.js (with `passport-local` strategy)                                                           |
| **Session Store** | `express-session` with `connect-mongo` for persistent sessions                                         |
| **Image Hosting** | Cloudinary for cloud-based image storage and delivery                                                  |
| **File Uploads**  | Multer and `multer-storage-cloudinary`                                                                 |
| **Validation**    | Joi for schema validation                                                                              |
| **Utilities**     | `method-override` for PUT/DELETE requests from forms, `dotenv` for environment variables               |

## Architecture

This project follows the **Model-View-Controller (MVC)** architectural pattern to organize the codebase, promoting separation of concerns and maintainability.

-   **Model**: Manages the data and business logic. It interacts directly with the MongoDB database. The Mongoose schemas (`listing.js`, `review.js`, `user.js`) define the structure of the data.

-   **View**: Represents the user interface. The EJS files (`.ejs`) in the `views` directory are responsible for rendering the HTML that is sent to the client's browser.

-   **Controller**: Acts as an intermediary between the Model and the View. It handles user requests, processes input, interacts with the Model to fetch or save data, and then renders the appropriate View. The route handlers in the `routes` directory (`listing.js`, `review.js`, `user.js`) serve as the controllers.

The request-response cycle is further managed by a chain of **Express middleware**, which handles tasks like authentication, authorization, validation, and error handling before the request reaches the main controller logic.

## Directory Structure

```
.
├── app.js                  # Main application entry point
├── cloudConfig.js          # Cloudinary configuration
├── middleware.js           # Custom middleware (auth, validation, etc.)
├── schema.js               # Joi validation schemas
├── .env                    # Environment variables (not committed)
├── package.json
├── models/
│   ├── listing.js          # Mongoose schema for listings
│   ├── review.js           # Mongoose schema for reviews
│   └── user.js             # Mongoose schema for users (for Passport)
├── public/
│   ├── css/
│   └── js/
├── routes/
│   ├── listing.js          # Routes for listings (Controller)
│   ├── review.js           # Routes for reviews (Controller)
│   └── user.js             # Routes for users (auth) (Controller)
├── utils/
│   └── ExpressError.js     # Custom error class
└── views/
    ├── includes/           # Partials (navbar, footer, flash)
    ├── layouts/            # EJS-Mate layout file (boilerplate.ejs)
    ├── listings/           # Views for listings (index, show, new, edit)
    ├── users/              # Views for login and signup
    └── error.ejs           # Generic error page
```

## Key Concepts Implemented

-   **RESTful API Design**: The application uses HTTP methods (GET, POST, PUT, DELETE) and structured URLs for resource manipulation.
-   **Middleware-centric Approach**: Core functionalities like authentication (`isLoggedIn`), authorization (`isOwner`, `isReviewAuthor`), and data validation (`validateListing`) are implemented as modular, reusable middleware.
-   **Data Relationships**: One-to-many relationships are established between Users and Listings, and between Listings and Reviews using Mongoose's `ref`.
-   **Environment Variable Management**: Securely manages sensitive information like database connection strings and API keys using a `.env` file.
-   **Centralized Error Handling**: A single, robust error-handling middleware catches all errors (including custom `ExpressError` instances) and sends a formatted response.
-   **Session Management**: `express-session` and `connect-mongo` are used to create secure and persistent user sessions.

## Setup and Installation

Follow these steps to run the project locally:

1.  **Clone the repository:**
    ```sh
    git clone <your-repository-url>
    cd <repository-folder>
    ```

2.  **Install dependencies:**
    ```sh
    npm install
    ```

3.  **Set up Environment Variables:**
    Create a `.env` file in the root directory and add the necessary variables. See the Environment Variables section below for details.

4.  **Start the server:**
    ```sh
    npm start
    ```
    (Assuming you have a `start` script like `"start": "node app.js"` in your `package.json`)

    The application should now be running on `http://localhost:8080`.

## Environment Variables

You need to create a `.env` file in the root of the project and add the following key-value pairs.

```env
# MongoDB Atlas connection string
ATLASDB_URL=mongodb+srv://<user>:<password>@<cluster-url>/Wanderlust?retryWrites=true&w=majority

# A secret key for signing the session ID cookie
SECRET=yoursupersecretcode

# Cloudinary Credentials
CLOUD_NAME=<your_cloudinary_cloud_name>
CLOUD_API_KEY=<your_cloudinary_api_key>
CLOUD_API_SECRET=<your_cloudinary_api_secret>
```

---


