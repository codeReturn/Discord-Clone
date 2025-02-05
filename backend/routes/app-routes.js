const express = require('express');
const { check } = require('express-validator');

const appController = require('../controllers/app-controllers');
const checkAuth = require('../middleware/check-auth');

const fileUpload = require('../middleware/file-upload');
const imageUpload = require('../middleware/image-upload');

const router = express.Router();

router.post('/handlechatmessage', checkAuth, fileUpload.array('files', 4), appController.handleChatMessage);

router.get('/getchats', checkAuth, appController.getChats);

router.get('/getchat/:id', checkAuth, appController.getChat);

router.get('/leavechat/:id', checkAuth, appController.leaveChat);

router.get('/getinvites/:id', checkAuth, appController.getInvites);

router.post('/sendinvites', checkAuth, appController.sendInvites);

router.post('/handlecreategroup', checkAuth, appController.createGroup);

router.post('/createserver', checkAuth, imageUpload.single('image'), appController.createServer);

router.get('/getservers', checkAuth, appController.getServers);

router.get('/getserver/:id', checkAuth, appController.getServer);

router.post('/handleservermessage', checkAuth, fileUpload.array('files', 4), appController.handleServerMessage);

router.post('/handleserverstatus', checkAuth, appController.handleServerStatus);

router.get('/getserverinvites/:id', checkAuth, appController.getServerInvites);

router.post('/sendserverinvites', checkAuth, appController.sendServerInvites);

router.post('/searchserver', checkAuth, appController.searchServer);

router.post('/addserverroom', checkAuth, appController.addServerRoom);

router.post('/addserverchannel', checkAuth, appController.addServerChannel);

router.post('/updateserverroom', checkAuth, appController.updateServerRoom);

router.post('/deleteserverroom', checkAuth, appController.deleteServerRoom);

router.post('/deleteroomchannel', checkAuth, appController.deleteRoomChannel);

router.post('/updateroomchannel', checkAuth, appController.updateRoomChannel);

router.get('/getbestservers', appController.getBestServers);

router.get('/getuser/:username', checkAuth, appController.getUser);

router.post('/addadmins', checkAuth, appController.addAdmins);

router.post('/deleteadmin', checkAuth, appController.deleteAdmin);

router.post('/deleteusermessage', checkAuth, appController.deleteUserMessage);

router.post('/updateusermessage', checkAuth, appController.updateUserMessage);

router.post('/deleteservermessage', checkAuth, appController.deleteServerMessage);

router.post('/updateservermessage', checkAuth, appController.updateServerMessage);

router.post('/updateservermenagment', checkAuth, appController.updateServerMenagment);

router.post('/updateservermenagmentdelete', checkAuth, appController.updateServerMenagmentDelete);

module.exports = router;
