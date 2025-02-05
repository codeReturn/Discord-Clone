const { validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const mongoose = require('mongoose');

const HttpError = require('../models/http-error');
const User = require('../models/user');
const Server = require('../models/server');
const Request = require('../models/request');
const Reset = require('../models/reset');
const ResetEmail = require('../models/resetemail');

const nodemailer = require("nodemailer");
const { v4: uuidv4 } = require('uuid');

let ioInstance;

function initialize(io) {
    ioInstance = io;
}

// helpers
const getExpirationDuration = (expiresIn) => {
  const timeValue = parseInt(expiresIn.slice(0, -1));
  const timeUnit = expiresIn.slice(-1);

  switch (timeUnit) {
    case 's':
      return timeValue * 1000; 
    case 'm':
      return timeValue * 60 * 1000; 
    case 'h':
      return timeValue * 60 * 60 * 1000; 
    case 'd':
      return timeValue * 24 * 60 * 60 * 1000; 
    case 'w':
      return timeValue * 7 * 24 * 60 * 60 * 1000; 
    case 'y':
      return timeValue * 365 * 24 * 60 * 60 * 1000;
    default:
      throw new Error('Invalid expiresIn value');
  }
};

const mailFrontURL = 'http://localhost:3000';
const mailConfiguration = {
  host: "mail.san-company.com",
  port: 465,
  secure: true, 
  auth: {
    user: "demo@san-company.com",
    pass: "@Morph123", 
  },
}
const profileVerificationURL = 'http://localhost:5000/networkserver/api/users/profileverification'
const emailVerificationURL = 'http://localhost:5000/networkserver/api/users/emailverification'
const frontendURL = 'http://localhost:3000'
// helpers end

const signup = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(
      new HttpError('Invalid inputs passed, please check your data.', 422)
    );
  }

  const { username, name, email, password, server } = req.body;

  let existingUser;
  try {
    existingUser = await User.findOne({ username: username });
  } catch (err) {
    const error = new HttpError(
      'Signing up failed, please try again later.',
      500
    );
    return next(error);
  }

  if (existingUser) {
    const error = new HttpError(
      'Username already exist!',
      422
    );
    return next(error);
  }

  let existingEmail;
  try {
    existingEmail = await User.findOne({ email: email });
  } catch (err) {
    const error = new HttpError(
      'Signing up failed, please try again later.',
      500
    );
    return next(error);
  }

  if (existingEmail) {
    const error = new HttpError(
      'Email already exist!',
      422
    );
    return next(error);
  }

  if (password.length < 6) {
    const error = new HttpError(
      'Password must be at least 6 characters long.',
      400
    );
    return next(error);
  }

  const usernameRegex = /^[a-zA-Z0-9]+$/;
  if (!usernameRegex.test(username)) {
    const error = new HttpError(
      'Username must only contain letters and numbers (no spaces or special characters).',
      400
    );
    return next(error);
  }

  let hashedPassword;
  try {
    hashedPassword = await bcrypt.hash(password, 12);
  } catch (err) {
    const error = new HttpError(
      'Could not create user, please try again.',
      500
    );
    return next(error);
  }

  if(server) {
    let fetchServer;
    try {
      fetchServer = await Server.findById(server)
      if(fetchServer) {
        if (!fetchServer.joined.includes(username)) {
          fetchServer.joined.push(username);
  
          for (let room of fetchServer.rooms) {
              for (let channel of room.channels) {
                  if (channel.readed && !channel.readed.includes(username)) {
                      channel.readed.push(username);  
                  }
              }
          }
        }
  
        fetchServer.markModified('rooms');
        fetchServer.markModified('joined');
        await fetchServer.save();
      }
    } catch (err) {
      const error = new HttpError(
        "Error while fetching server.",
        500
      );
      return next(error);
    }
  }

  const formatLink = uuidv4();

  const createdUser = new User({
    username,
    name,
    email,
    password: hashedPassword,
    verification_link: formatLink,
    badges: ['supporter']
  });

  try {
    let mailOptions = {
      from: 'demo@san-company.com',
      to: email,
      subject: 'Egg Messanger - Profile Verification',
      html: `<h3>Egg Messenger | Profile Verification</h3><hr /><b>Hi ${email},</b> <p>We received a request to verify your profile. If you did not initiate this request, please ignore this email.</p> <p>If you want to proceed with profile verification, click the link below:</p> <b><a href="${profileVerificationURL}/${formatLink}">Finish verification</a></b>`
    };
  
    let transporter = nodemailer.createTransport(mailConfiguration);
  
    transporter.sendMail(mailOptions, function(err, info){
      if (err) {
        const error = new HttpError(
          err,
          500
        );
        return next(error);
      } 
  
      console.log('Email sent: ' + info.response);
    });

    await createdUser.save();
  } catch (err) {
    console.log(err)
    const error = new HttpError(
      'Signing up failed, please try again later.',
      500
    );
    return next(error);
  }

  res.status(201).json({ message: 'success'});
};

const login = async (req, res, next) => {
  const { username, password, rememberme } = req.body;

  let existingUser;

  try {
    existingUser = await User.findOne({ username: username });
  } catch (err) {
    const error = new HttpError(
      'Logging in failed, please try again later.',
      500
    );
    return next(error);
  }

  if (!existingUser) {
    const error = new HttpError(
      'Invalid credentials, could not log you in.',
      403
    );
    return next(error);
  }

  let isValidPassword = false;
  try {
    isValidPassword = await bcrypt.compare(password, existingUser.password);
  } catch (err) {
    const error = new HttpError(
      'Could not log you in, please check your credentials and try again.',
      500
    );
    return next(error);
  }

  if (!isValidPassword) {
    const error = new HttpError(
      'Invalid credentials, could not log you in.',
      403
    );
    return next(error);
  }

  // if(existingUser.verification === false) {
    // const error = new HttpError(
      // 'Profile is not verified.',
      // 500
    // );
    // return next(error);
  // }

  let token;
  let expirationDate;

  try {
    if(rememberme === true) {
      const expiresIn = '1y'; 

      token = jwt.sign(
        { userId: existingUser.id, username: existingUser.username },
        process.env.SECRET || '',
        { expiresIn: expiresIn }
      );

      const durationInMilliseconds = getExpirationDuration(expiresIn);
      expirationDate = new Date(new Date().getTime() + durationInMilliseconds);
    } else {
      const expiresIn = '1h'; 

      token = jwt.sign(
        { userId: existingUser.id, username: existingUser.username },
        process.env.SECRET || '',
        { expiresIn: expiresIn }
      );

      const durationInMilliseconds = getExpirationDuration(expiresIn);
      expirationDate = new Date(new Date().getTime() + durationInMilliseconds);
    }

  } catch (err) {
    const error = new HttpError(
      'Logging in failed, please try again later.',
      500
    );
    return next(error);
  }

  res.json({
    userId: existingUser.id,
    username: existingUser.username,
    token: token,
    expirationDate: expirationDate.toISOString(),
    message: 'success'
  });
};

const getUserInfo = async (req, res, next) => {
  const userId = req.userData.userId;

  let user;
  try {
    user = await User.findOne({'_id': userId}, '-password');
  } catch (err) {
    const error = new HttpError(
      'Error while fetching user!',
      500
    );
    return next(error);
  }

  return res.json({ user });
}

const searchUser = async (req, res, next) => {
  const { username } = req.body;

  if (!username) {
    return res.status(200).json({ users: [], message: 'success' });
  }

  let user;
  try {
    user = await User.findById(req.userData.userId);
  } catch (err) {
    return next(new HttpError('Error while fetching user', 500));
  }

  if (!user) {
    return next(new HttpError('User does not exist', 404));
  }

  let fetchUsers;
  try {
    fetchUsers = await User.find(
      { username: { $regex: username, $options: 'i' } },
      '-password'  
    );
  } catch (err) {
    return next(new HttpError('Error while searching for users', 500));
  }

  if (fetchUsers.length === 0) {
    return next(new HttpError('No users found with the given username.', 404));
  }

  fetchUsers = fetchUsers.filter((u) => u._id.toString() !== req.userData.userId.toString());

  const updatedUsers = await Promise.all(
    fetchUsers.map(async (u) => {
      let friendStatus = '';

      if (user.friends.includes(u.username)) {
        friendStatus = 'friends';
      } else {
        const request = await Request.findOne({
          $or: [
            { from: user.username, to: u.username },
            { from: u.username, to: user.username }
          ],
          status: false
        });

        if (request) {
          friendStatus = 'pending';
        }

        if(username === user.username) {
          friendStatus = 'invalid'
        }
      }

      return {
        ...u.toObject(),
        friendStatus 
      };
    })
  );

  res.status(200).json({ users: updatedUsers, message: 'success' });
};


const sendRequest = async (req, res, next) => {
  const { username } = req.body;

  if (!username) {
    return next(new HttpError('Error username empty', 500));
  }

  let user;
  try {
    user = await User.findById(req.userData.userId);
  } catch (err) {
    return next(new HttpError('Error while fetching user', 500));
  }

  if (!user) {
    return next(new HttpError('User does not exist', 404));
  }

  let fetchUsername;
  try {
    fetchUsername = await User.findOne({ username: username });
  } catch (err) {
    return next(new HttpError('User does not exist', 404));
  }

  if(!fetchUsername) {
    return next(new HttpError('User does not exist', 404));
  }

  if(user.friends.includes(username)){
    return next(new HttpError('Already in list!', 404));
  }

  const createdRequest = new Request({
    from: user.username,
    to: fetchUsername.username
  })

  try {
    await createdRequest.save();

    const userToReturn = await User.findOne({ username: user.username }, '-password -_id');
    const notificationObj = { 
      _id: createdRequest._id,      
      ...userToReturn.toObject() 
    };

    ioInstance && ioInstance.to("user:" + fetchUsername.username).emit("newRequest", notificationObj);
    ioInstance && ioInstance.to("user:" + fetchUsername.username).emit("playNotification", {
      status: true
    });

  } catch (err) {
    console.error(err);
    return next(new HttpError('Error sending request', 500));
  }

  res.status(201).json({ message: 'success', sendedTo: fetchUsername.username });
}

const getInvitations = async (req, res, next) => {
  let user;
  try {
    user = await User.findById(req.userData.userId);
  } catch (err) {
    return next(new HttpError('Error while fetching user', 500));
  }

  if (!user) {
    return next(new HttpError('User does not exist', 404));
  }

  let requests;
  try {
    requests = await Request.find({ to: user.username });
  } catch (err) {
    return next(new HttpError('Error while fetching invitations', 500));
  }

  if (requests.length === 0) {
    return res.status(200).json({ invitations: [], message: 'success' });
  }

  const invitationDetails = await Promise.all(
    requests.map(async (request) => {
      const userToReturn = await User.findOne({ username: request.from }, '-password -_id');

      return { 
        _id: request._id,      
        ...userToReturn.toObject() 
      };
    })
  );

  return res.status(200).json({ invitations: invitationDetails, message: 'success' });
};

const handleRequestOptions = async (req, res, next) => {
  const { id, type } = req.body;

  let user;
  try {
    user = await User.findById(req.userData.userId);
  } catch (err) {
    return next(new HttpError('Error while fetching user', 500));
  }

  if (!user) {
    return next(new HttpError('User does not exist', 404));
  }

  const objectId = new mongoose.Types.ObjectId(id); 

  let fetchRequest;
  try {
    fetchRequest = await Request.findOne({ _id: objectId });
  } catch (err) {
    return next(new HttpError('Error while fetching request', 500));
  }

  if (!fetchRequest) {
    return next(new HttpError('Request does not exist', 404));
  }

  if (fetchRequest.to !== user.username) {
    return next(new HttpError('You do not have access', 403)); 
  }

  if (type === 'remove') {
    try {
      await Request.findByIdAndDelete(id);
    } catch (err) {
      console.log(err)
      return next(new HttpError('Error while deleting request', 500));
    }
  } else if (type === 'accept') {
    try {
      const fromUser = await User.findOne({ username: fetchRequest.from });
      const toUser = user;
    
      if (!fromUser.friends.includes(toUser.username)) {
        fromUser.friends.push(toUser.username);
        await User.updateOne(
          { username: fetchRequest.from }, 
          { $set: { friends: fromUser.friends } }
        );
      }
    
      if (!toUser.friends.includes(fromUser.username)) {
        toUser.friends.push(fromUser.username);
        await User.updateOne(
          { username: toUser.username },
          { $set: { friends: toUser.friends } }
        );
      }
    
      ioInstance && ioInstance.to("user:" + fetchRequest.from).emit("newFriend", toUser);
      ioInstance && ioInstance.to("user:" + fetchRequest.to).emit("newFriend", fromUser);
    
      await Request.findByIdAndDelete(objectId);
    } catch (err) {
      console.error('Error while accepting the request:', err);
      return next(new HttpError('Error while accepting the request', 500));
    }    
  }

  res.status(200).json({ message: 'success' });
};

const getFriends = async (req, res, next) => {
    let user;
    try {
      user = await User.findById(req.userData.userId);
    } catch (err) {
      return next(new HttpError('Error while fetching user', 500));
    }
  
    if (!user) {
      return next(new HttpError('User does not exist', 404));
    }
  
    const friendUsernames = user.friends;
    
    let validFriends;
    try {
      const friendsDetails = await Promise.all(
        friendUsernames.map(async (username) => {
          const friend = await User.findOne({ username: username }).select('-password'); 
          if (!friend) {
            return null; 
          }
          return friend; 
        })
      );
  
     validFriends = friendsDetails.filter(friend => friend !== null);
  
    } catch (err) {
      return next(new HttpError('Error while fetching friend details', 500));
    }

    return res.status(200).json({ friends: validFriends });
};

const updateProfile = async (req, res, next) => {
  const { name, description, model } = req.body;
  let avatarUrl = null;

  if (req.file) {
    avatarUrl = req.file.path; 
  }

  let user;
  try {
    user = await User.findById(req.userData.userId, '-password');
  } catch (err) {
    const error = new HttpError('Error while fetching user!', 500);
    return next(error);
  }

  if (!user) {
    const error = new HttpError('User not found!', 404);
    return next(error);
  }

  const update = {
    name: name,
    description: description,
    model: model,
  };

  if (avatarUrl) {
    update.avatar = avatarUrl;  
  }

  try {
    const filter = { _id: req.userData.userId };
    await User.findOneAndUpdate(filter, update);
  } catch (err) {
    const error = new HttpError("Error while updating profile info", 500);
    return next(error);
  }

  res.status(200).json({ message: 'success' });
};

const resetPassword = async (req, res, next) => {
  const { ObjectId } = require('mongodb');

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new HttpError(
      'Invalid data!',
      422
    );
    return next(error);
  }

  const { email } = req.body;

  let user;
  try {
    user = await User.findOne({ email: email })
  } catch (err) {
    const error = new HttpError(
      'Profile not found!',
      500
    );
    return next(error);
  }

  if(!user){
    const error = new HttpError(
      'Profile not found!',
      500
    );
    return next(error);
  }
  
  const resetId = new ObjectId();
  const createdReset = new Reset({
    _id: resetId,
    email,
    link: resetId,
    date: new Date().getTime()
  });  

  let mailOptions = {
    from: 'demo@san-company.com',
    to: email,
    subject: 'Egg Messanger - Reset Password',
    html: `<h3>Egg Messanger | Reset Password</h3> <hr /> <b>Hi ${email},</b> <p>You have been request to change your password on your account. If you didn't make this request, please disregard this email.</p> <p>Session expire: 1hour.</p> <b>${mailFrontURL}/resetpasswordupdate/${resetId}</b>`
  };

  let transporter = nodemailer.createTransport(mailConfiguration);

  transporter.sendMail(mailOptions, function(err, info){
    if (err) {
      const error = new HttpError(
        err,
        500
      );
      return next(error);
    } 

    console.log('Email sent: ' + info.response);
  });

  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();
    await createdReset.save({ session: sess });
    await sess.commitTransaction();
  } catch (err) {
    const error = new HttpError(
      'Error sending reset email!',
      500
    );
    return next(error);
  }

  res.status(200).json({ message: 'success' })
}

const resetPasswordUpdate = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new HttpError(
      'Invalid data!',
      422
    );
    return next(error);
  }

  const { newpassword, repeatpassword, link } = req.body;

  let checklink;
  try {
    checklink = await Reset.findOne({'link': link})
  } catch (err) {
    console.log(err)
  }

  if(!checklink){
    const error = new HttpError(
      'No results!',
      500
    );
    return next(error);   
  }

  let db_date = parseInt(checklink.date) + 1000 * 60 * 60;
  let date_now = new Date().getTime();

  if(date_now > db_date || checklink.status === 1){
    const error = new HttpError(
      'The session has ended or is over!',
      500
    );
    return next(error);      
  }

  let hashedPassword;
  try {
    hashedPassword = await bcrypt.hash(newpassword, 12);
  } catch (err) {
    const error = new HttpError(
      'Error while formating password',
      500
    );
    return next(error);
  }


  if(newpassword === repeatpassword){
    const filter = { email: checklink.email };
    const update = { password: hashedPassword};

    let user;
    let reset;

    try {
      user = await User.findOneAndUpdate(filter, update);
      reset = await Reset.findOneAndUpdate({link: link}, {status: 1})
    } catch (err) {
      console.log(err)
      const error = new HttpError(
        'Error while updating user settings!',
        500
      );
      return next(error);
    }
  
    return res.json({ message: 'updated' });
  } else {
    const error = new HttpError(
      'Error while updating!',
      500
    );
    return next(error);      
  }
};

const getLink = async (req, res, next) => {
  const { link } = req.params;

  try {
    const linkInfo = await Reset.findById(link);

    if (!linkInfo) {
      return res.status(404).json({ message: 'noresults' });
    }

    const dbDate = parseInt(linkInfo.date) + 1000 * 60 * 60; 
    const dateNow = new Date().getTime();

    if (dateNow > dbDate) {
      return res.json({ message: 'expired' });
    }

    if (linkInfo.status === 1) {
      return res.json({ message: 'finished' });
    }

    return res.json({ message: 'success' });

  } catch (err) {
    console.error('Error fetching link info:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

const profileVerification = async (req, res, next) => {
  const link = req.params.link;

  let user;
  try {
    user = await User.findOne({ verification_link: link });
  } catch (err) {
    const error = new HttpError(
      'User doesn\'t exist',
      500
    );
    return next(error);
  }

  if (!user) {
    const error = new HttpError(
      'User doesn\'t exist',
      500
    );
    return next(error);
  }

  user.verification = true;

  try {
    await user.save();
  } catch (err) {
    const error = new HttpError(
      'Error while profile verification!',
      500
    );
    return next(error);
  }

  return res.redirect(`${frontendURL}/login`);
};

const updatePassword = async (req, res, next) => {
  const { oldpassword, newpassword, repeatpassword } = req.body;

  if(!oldpassword || !newpassword || !repeatpassword){
    const error = new HttpError('All fields are required.!!', 500);
    return next(error);
  }

  if(oldpassword.length < 6 || newpassword.length < 6 || repeatpassword.length < 6) {
    const error = new HttpError('All fields must contain at least 6 characters.!', 500);
    return next(error);
  }

  let checkuser;
  try {
    checkuser = await User.findById(req.userData.userId);
  } catch (err) {
    const error = new HttpError('Error while fetching user details!', 500);
    return next(error);
  }

  if (!checkuser) {
    const error = new HttpError('User not found!', 404);
    return next(error);
  }

  let isMatch;
  try {
    isMatch = await bcrypt.compare(oldpassword, checkuser.password);
  } catch (err) {
    const error = new HttpError('Error comparing passwords', 500);
    return next(error);
  }

  if (!isMatch) {
    const error = new HttpError('Old password does not match', 401);
    return next(error);
  }

  if(newpassword !== repeatpassword) {
    const error = new HttpError('New password does not match duplicate password', 401);
    return next(error);
  }

  let hashedPassword;
  try {
    hashedPassword = await bcrypt.hash(newpassword, 12);
  } catch (err) {
    const error = new HttpError('Error hashing new password!', 500);
    return next(error);
  }

  const filter = { _id: req.userData.userId };
  const update = { password: hashedPassword };
  let status;

  try {
    await User.findOneAndUpdate(filter, update);
    status = true
  } catch (err) {
    status = false
    const error = new HttpError('Error updating user!', 500);
    return next(error);
  }

  res.json({ status: status });
};

const updateEmail = async (req, res, next) => {
  const { ObjectId } = require('mongodb');

  const { newemail } = req.body;

  if(!newemail) {
    const error = new HttpError(
      'New email is missing!',
      500
    );
    return next(error);
  }
  
  let user;
  try {
    user = await User.findById(req.userData.userId)
  } catch (err) {
    const error = new HttpError(
      'Profile not found!',
      500
    );
    return next(error);
  }

  if(!user){
    const error = new HttpError(
      'Profile not found!',
      500
    );
    return next(error);
  }

  let checkUserEmail;
  try {
    checkUserEmail = await User.findOne({ email: newemail })
  } catch (err) {
    const error = new HttpError(
      'Profile not found!',
      500
    );
    return next(error); 
  }

  if(checkUserEmail) {
    const error = new HttpError(
      'Profile already exist!',
      500
    );
    return next(error); 
  }
  
  const resetId = new ObjectId();
  const createdReset = new ResetEmail({
    _id: resetId,
    email: user.email,
    newemail: newemail,
    link: resetId,
    date: new Date().getTime()
  });  

  let mailOptions = {
    from: 'demo@san-company.com',
    to: newemail,
    subject: 'Egg Messanger - Reset Email',
    html: `<h3>Egg Messanger | Reset Email</h3> <hr /> <b>Hi ${newemail},</b> <p>You have been request to change your email on your account. If you didn't make this request, please disregard this email.</p> <p>Session expire: 1hour.</p> <b>${emailVerificationURL}/${resetId}</b>`
  };

  let transporter = nodemailer.createTransport(mailConfiguration);

  transporter.sendMail(mailOptions, function(err, info){
    if (err) {
      const error = new HttpError(
        err,
        500
      );
      return next(error);
    } 

    console.log('Email sent: ' + info.response);
  });

  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();
    await createdReset.save({ session: sess });
    await sess.commitTransaction();
  } catch (err) {
    const error = new HttpError(
      'Error sending reset email!',
      500
    );
    return next(error);
  }

  res.status(200).json({ message: 'success' })
}

const emailVerification = async (req, res, next) => {
  const { link } = req.params;

  try {
    const resetRequest = await ResetEmail.findOne({ link: link });

    if (!resetRequest) {
      return next(new HttpError("Invalid or expired verification link", 404));
    }

    const { email, newemail, status, date } = resetRequest;

    if (status !== 0) {
      return next(new HttpError("Verification request already completed", 400));
    }

    const sessionTime = parseInt(date, 10);
    if (isNaN(sessionTime) || Date.now() - sessionTime > 3600000) {
      return next(new HttpError("Verification link expired", 410));
    }

    const user = await User.findOne({ email });
    if (!user) {
      return next(new HttpError("User not found", 404));
    }

    user.email = newemail;
    await user.save();

    resetRequest.status = 1; 
    await resetRequest.save();

    return res.redirect(`${frontendURL}/login`);
  } catch (err) {
    return next(new HttpError("Error during verification", 500));
  }
};


exports.signup = signup;
exports.login = login;
exports.getUserInfo = getUserInfo;
exports.searchUser = searchUser;
exports.sendRequest = sendRequest;
exports.getInvitations = getInvitations;
exports.handleRequestOptions = handleRequestOptions;
exports.getFriends = getFriends;
exports.updateProfile = updateProfile;
exports.resetPassword = resetPassword;
exports.resetPasswordUpdate = resetPasswordUpdate;
exports.getLink = getLink;
exports.profileVerification = profileVerification;
exports.updatePassword = updatePassword;
exports.updateEmail = updateEmail;
exports.emailVerification = emailVerification;

exports.initialize = initialize;