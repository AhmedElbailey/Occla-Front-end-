const express = require("express");
const app = express();

require("dotenv").config();

const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const feedRoutes = require("./routes/feed");
const authRoutes = require("./routes/auth");
const helmet = require("helmet");
const compression = require("compression");
const morgan = require("morgan");

// Receiving Data//////////////////
const bodyParser = require("body-parser");
app.use(bodyParser.json());

const multer = require("multer");

const fileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "images");
  },
  filename: (req, file, cb) => {
    crypto.randomBytes(8, (err, buffer) => {
      if (err) {
        console.log("idgenerator failed!!!!");
        next(err);
      }
      cb(null, buffer.toString("hex") + "-" + file.originalname);
    });
  },
});
const fileFilter = (req, file, cb) => {
  if (
    file.mimetype === "image/png" ||
    file.mimetype === "image/jpg" ||
    file.mimetype === "image/jpeg"
  ) {
    cb(null, true);
  } else {
    cb(null, false);
  }
};

app.use(
  multer({ storage: fileStorage, fileFilter: fileFilter }).single("image")
);
app.use("/images", express.static(path.join(__dirname, "images")));

// Initial Middlewares //////////////////////////
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,PATCH");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  next();
});

// for secured headers
app.use(helmet());
//to compress files
app.use(compression());
//to store loggings
const accessLogStream = fs.createWriteStream(
  path.join(__dirname, "access.log"),
  { flags: "a" }
);
app.use(morgan("combined", { stream: accessLogStream }));

// Routes //////////////////////////////////
app.use("/feed", feedRoutes);
app.use("/auth", authRoutes);

app.use((error, req, res, next) => {
  console.log(error);
  const message = error.message;
  const statusCode = error.statusCode || 500;
  const data = error.data || "";
  res.status(statusCode).json({ message: message, data: data });
});
///////////////////////////////////
mongoose
  .connect(process.env.MONGO_URL)
  .then((res) => {
    const server = app.listen(process.env.PORT || 8080);

    const io = require("./socket").init(server);
    io.on("connection", (socket) => {
      // console.log("Client connected!");
    });
  })
  .catch((err) => console.log(err));
