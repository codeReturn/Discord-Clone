const express = require('express');
const { check } = require('express-validator');

const usersController = require('../controllers/users-controllers');
const checkAuth = require('../middleware/check-auth');
const imageUpload = require('../middleware/image-upload');

const router = express.Router();

router.post(
    '/signup',
    [
      check('username')
        .not()
        .isEmpty(),
      check('email')
        .normalizeEmail()
        .isEmail(),
      check('name')
        .not()
        .isEmpty(),
      check('password').isLength({ min: 6 })
    ],
    usersController.signup
);
  
router.post('/login', usersController.login);

router.get('/getuserinfo', checkAuth, usersController.getUserInfo);

router.post('/searchuser', checkAuth, usersController.searchUser);

router.post('/sendrequest', checkAuth, usersController.sendRequest);

router.get('/getinvitations', checkAuth, usersController.getInvitations);

router.post('/handlerequestoptions', checkAuth, usersController.handleRequestOptions);

router.get('/getfriends', checkAuth, usersController.getFriends);

router.post('/updateprofile', checkAuth, imageUpload.single('image'), usersController.updateProfile);

router.post('/resetpassword', [
  check('email')
  .normalizeEmail()
  .isEmail()
], usersController.resetPassword);

router.post(
  '/resetpasswordupdate',
  [
    check('newpassword').isLength({ min: 6 }),
    check('repeatpassword').isLength({ min: 6 })
  ],
  usersController.resetPasswordUpdate
);

router.get('/getlink/:link', usersController.getLink);

router.get('/profileverification/:link', usersController.profileVerification);

router.post('/updatepassword', checkAuth, usersController.updatePassword);

router.post('/updateemail', checkAuth, usersController.updateEmail);

router.get('/emailverification/:link', usersController.emailVerification);

module.exports = router;
