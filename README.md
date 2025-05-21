# Wanderlust

Wanderlust is a Node.js/Express web application for listing, viewing, creating, editing, and deleting travel accommodation listings (like AirBnB). It uses MongoDB for data storage, EJS for templating, and Bootstrap for styling.

## Features

- View all listings with images, prices, and locations
- Add new listings with title, description, image URL, price, country, and location
- Edit existing listings (with confirmation prompt on save)
- Delete listings (with confirmation prompt)
- Responsive UI using Bootstrap
- Data validation with Mongoose

## Tech Stack

- **Backend:** Node.js, Express.js
- **Database:** MongoDB, Mongoose
- **Frontend:** EJS, Bootstrap 5
- **Other:** method-override, ejs-mate

## Folder Structure

```
MAJOR PROJECT/
├── app.js
├── models/
│   └── listing.js
├── init/
│   ├── data.js
│   └── index.js
├── public/
│   └── css/
│       └── style.css
├── views/
│   ├── layouts/
│   │   └── boilerplate.ejs
│   └── listings/
│       ├── index.ejs
│       ├── new.ejs
│       ├── edit.ejs
│       └── show.ejs
├── .gitignore
└── package.json
```

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/)
- [MongoDB](https://www.mongodb.com/try/download/community)

### Installation

1. **Clone the repository:**
   ```bash
   git clone <your-repo-url>
   cd "MAJOR PROJECT"
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start MongoDB** (if not running):
   ```bash
   mongod
   ```

4. **Seed the database with sample data:**
   ```bash
   node init/index.js
   ```

5. **Start the server:**
   ```bash
   node app.js
   ```
   The app will run at [http://localhost:3000](http://localhost:3000).

## Usage

- Visit `/listings` to see all listings.
- Click "Create New Listing" to add a new one.
- Click a listing card to view details, edit, or delete.
- Edit and delete actions are protected with confirmation prompts.

## Customization

- **Styling:** Edit `public/css/style.css` or use your own Bootstrap theme.
- **Sample Data:** Modify `init/data.js` for your own listings.
- **Views:** Update EJS files in `views/listings/` for custom UI.

## Notes

- Images are referenced by URL. To use local images, place them in `public/images` and update the image path accordingly.
- The project uses [method-override](https://www.npmjs.com/package/method-override) to support PUT and DELETE HTTP verbs in forms.

## License

This project is for educational/demo purposes.

---

**Happy Coding!**
