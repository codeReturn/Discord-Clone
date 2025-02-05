const fs = require('fs');
const path = require('path');

const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
require('dotenv').config();

const usersRoutes = require('./routes/users-routes');
const appRoutes = require('./routes/app-routes');
const HttpError = require('./models/http-error');

const app = express();
const http = require('http').Server(app);
const initSocket = require('./socket');

const port = process.env.PORT || 5000;

app.use(bodyParser.json());

const cors = require('cors');
var corsOptions = {
    origin: 'http://localhost:3000',
    optionsSuccessStatus: 200,
    methods: "GET, PUT, PATCH, DELETE, POST",
    credentials: true
}

app.use(cors(corsOptions));

app.use('/networkserver/uploads/images', express.static(path.join('uploads', 'images')));
app.use('/networkserver/uploads/attachments', express.static(path.join('uploads', 'attachments')));
app.use('/networkserver/api/users', usersRoutes);
app.use('/networkserver/api/app', appRoutes);

app.use((req, res, next) => {
  const error = new HttpError('Could not find this route.', 404);
  throw error;
});

app.use((error, req, res, next) => {
  if (req.file) {
    fs.unlink(req.file.path, err => {
      console.log(err);
    });
  }
  if (res.headerSent) {
    return next(error);
  }
  res.status(error.code || 500);
  res.json({ message: error.message || 'An unknown error occurred!' });
});

mongoose
.connect(process.env.DB)
.then(() => {
  initSocket(http, corsOptions); 
  http.listen(port);
  console.log('Server started..')
})
.catch((err) => console.log(err));