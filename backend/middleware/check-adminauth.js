const jwt = require('jsonwebtoken');

const HttpError = require('../models/http-error');
const User = require('../models/user');

module.exports = (req, res, next) => {
  if (req.method === 'OPTIONS') {
    return next();
  }

  let user;
  try {
    const token = req.headers.authorization.split(' ')[1]; // Authorization: 'Bearer TOKEN'
    if (!token) {
      throw new Error('adm # Authentication failed!');
    }
    const decodedToken = jwt.verify(token, process.env.SECRET);
    
    user = User.findById(decodedToken.userId);
    if(user.rank === 0){
       throw new Error('adm # Admin authentication failed!');
    }

    req.userData = { userId: decodedToken.userId };
    next();
  } catch (err) {
    const error = new HttpError('Authentication failed!', 403);
    return next(error);
  }
};
