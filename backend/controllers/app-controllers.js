const { validationResult } = require('express-validator');
const mongoose = require('mongoose');

const HttpError = require('../models/http-error');
const User = require('../models/user');

const axios = require('axios');
const Chat = require('../models/chat');
const Server = require('../models/server');
const Request = require('../models/request');

const { v4: uuidv4 } = require('uuid');

let ioInstance;

function initialize(io) {
    ioInstance = io;
}

const handleChatMessage = async (req, res, next) => {
  const { username, message, id } = req.body;

  if(!username || !message) {
    return next(new HttpError('Invalid inputs data', 404));
  }

  let user;

  try {
    user = await User.findById(req.userData.userId);
    if (!user) {
      return next(new HttpError('User does not exist', 404));
    }
  } catch (err) {
    return next(new HttpError('Error while fetching user', 500));
  }

  const mentionRegex = /@(\w+)/g; 
  const mentions = [];
  let match;
  while ((match = mentionRegex.exec(message)) !== null) {
    const mentionedUser = match[1]; 
    mentions.push({
      mention: mentionedUser,
      readed: false 
    });
  }

  if (id === 'undefined') {
    const createdChat = new Chat({
      lastMessage: Date.now(),
      messages: [{ id: uuidv4(), message, author: user.username, image: user.avatar, time: Date.now(), attachments: req.files ? req.files.map(file => file.path) : [] }],
      readed: [user.username],
      joined: [user.username, username],
      mentions: mentions.length > 0 ? mentions : null
    });

    try {
      await createdChat.save();

      const chatWithInfo = {
        ...createdChat.toObject(),
        usersDetails: await Promise.all(
          createdChat.joined.map(async (username) => {
            const userDetails = await User.findOne({ username }).select('-password');
            return userDetails;
          })
        )
      };

      ioInstance && ioInstance.to("user:" + user.username).emit("newChat", chatWithInfo);
      ioInstance && ioInstance.to("user:" + username).emit("newChat", chatWithInfo);

      ioInstance && ioInstance.to("user:" + username).emit("playNotification", {
        status: true
      });
      

      return res.status(200).json({ chat: createdChat, type: 'chat' });
    } catch (err) {
      return next(new HttpError('Error while creating chat', 500));
    }
  } else {
    let fetchChat;
    try {
      fetchChat = await Chat.findById(id);

      if (!fetchChat) {
        return next(new HttpError('Chat not found', 404));
      }
    } catch (err) {
      return next(new HttpError('Error while fetching chat', 500));
    }

    try {
      const messageObj = {
        id: uuidv4(),
        message: message,
        author: user.username,
        image: user.avatar,
        time: Date.now(),
        attachments: req.files ? req.files.map(file => file.path) : [],
        mentions: mentions.length > 0 ? mentions : null
      };

      const updatedChat = await Chat.findOneAndUpdate(
        { _id: id },
        { 
          $push: { messages: messageObj },  
          $set: { 
            readed: [user.username], 
            lastMessage: new Date() 
          }
        },
        { new: true }
      );

      if (updatedChat) {
        updatedChat.joined.map((user) => {
          ioInstance && ioInstance.to("user:" + user).emit("updateChat", updatedChat);
        });

        const filterAuthor = updatedChat.joined.filter((u) => u !== user.username)
        filterAuthor.map((user) => {
          ioInstance && ioInstance.to("user:" + user).emit("playNotification", {
            status: true
          });
        })
      }

      ioInstance && ioInstance.in("chat:" + fetchChat._id).emit('newMessage', {
        id: id,
        message: messageObj
      });

      return res.status(200).json({ data: messageObj, type: 'message' });
    } catch (err) {
      return next(new HttpError('Error while updating chat', 500));
    }
  }
};


const getChats = async (req, res, next) => {
  let user;

  try {
    user = await User.findById(req.userData.userId);
    if (!user) {
      return next(new HttpError('User does not exist', 404));
    }
  } catch (err) {
    return next(new HttpError('Error while fetching user', 500));
  }

  let chats;
  try {
    chats = await Chat.find({ joined: user.username }).sort({ lastMessage: -1 });
  } catch (err) {
    return next(new HttpError('Error while fetching chats', 500));
  }

  if (chats.length === 0) {
    return res.status(200).json({ message: 'No chats found for this user' });
  }

  const chatsWithUserDetails = await Promise.all(
    chats.map(async (chat) => {
      const usersDetails = await Promise.all(
        chat.joined.map(async (username) => {
          const userDetails = await User.findOne({ username }).select('-password'); 
          return userDetails;
        })
      );

      return {
        ...chat.toObject(),
        usersDetails, 
      };
    })
  );

  res.status(200).json({ chats: chatsWithUserDetails });
};

const getChat = async (req, res, next) => {
  const { id } = req.params;

  let user;
  try {
    user = await User.findById(req.userData.userId);
    if (!user) {
      return next(new HttpError('User not found', 404)); 
    }
  } catch (err) {
    return next(new HttpError('Error while fetching user', 500)); 
  }

  let chat;
  try {
    chat = await Chat.findById(id); 

    if (!chat.joined.includes(user.username)) {
      return next(new HttpError('You do not have access to this chat', 403)); 
    }

    await Chat.updateMany(
      { 'avatars.username': user.username }, 
      { $pull: { avatars: { username: user.username } } } 
    );

    if(!chat.readed.includes(user.username)) {
      const readedList = [...chat.readed, user.username]

      await Chat.updateOne(
        { _id: id },
        { 
          $set: { readed: readedList }  
        }
      );

      ioInstance && ioInstance.to("user:" + user.username).emit("updateReaded", {
        id: chat._id, 
        user: user.username
      });
    }

    if (!chat) {
      return next(new HttpError('Chat not found', 404));
    }
  } catch (err) {
    return next(new HttpError('Error while fetching chat', 500));
  }

  res.status(200).json({ chat });
};

const leaveChat = async (req, res, next) => {
  const id = req.params.id;

  let user;
  try {
    user = await User.findById(req.userData.userId);
    if (!user) {
      return next(new HttpError('User not found', 404)); 
    }
  } catch (err) {
    return next(new HttpError('Error while fetching user', 500)); 
  }

  let fetchChat;
  try {
    fetchChat = await Chat.findById(id);
  } catch (err) {
    return next(new HttpError('Error while fetching chat', 500));
  }

  if(!fetchChat) {
    return next(new HttpError('Chat dont exist', 500));
  }

  if(!fetchChat.joined.includes(user.username)) {
    return next(new HttpError('You dont have access', 500));
  }

  try {
    const updatedChat = await Chat.findOneAndUpdate(
      { _id: id },
      { $pull: { joined: user.username } },
      { new: true } 
    );

    ioInstance && ioInstance.to("user:" + user.username).emit("leavedChat", id);

    updatedChat.joined.map((u) => {
      ioInstance && ioInstance.to("user:" + u).emit("leavedChatUpdate", {
        id: id,
        user: user.username,
        joined: updatedChat.joined,
      });
    })

    // System
    const messageObjSystem = {
      message: `${user.username} leaved chat`,
      author: 'system',
      time: Date.now(),
      attachments: []
    };

    await Chat.findOneAndUpdate(
      { _id: id },
      { 
        $push: { messages: messageObjSystem },  
        $set: { 
          readed: [], 
          lastMessage: new Date() 
        }
      },
      { new: true }
    );

    ioInstance && ioInstance.in("chat:" + fetchChat._id).emit('newMessage', {
      id: id,
      message: messageObjSystem
    });

  } catch (err) {
    return next(new HttpError('Error while leaving chat', 500));
  }

  res.status(200).json({ message: 'success' })
}

const getInvites = async (req, res, next) => {
  const id = req.params.id;

  let user;
  try {
    user = await User.findById(req.userData.userId);
    if (!user) {
      return next(new HttpError('User not found', 404));
    }
  } catch (err) {
    return next(new HttpError('Error while fetching user', 500));
  }

  let fetchChat;
  try {
    fetchChat = await Chat.findById(id);
    if (!fetchChat) {
      return next(new HttpError('Chat not found', 404));
    }
  } catch (err) {
    return next(new HttpError('Error while fetching chat', 500));
  }

  if(!fetchChat.joined.includes(user.username)) {
    return next(new HttpError('You dont have access', 500));
  }


  const userFriends = user.friends.filter(friend => !fetchChat.joined.includes(friend)); 

  res.status(200).json({ invites: userFriends });
};

const sendInvites = async (req, res, next) => {
  const { invites, chat } = req.body;

  let user;
  try {
    user = await User.findById(req.userData.userId);
    if (!user) {
      return next(new HttpError('User not found', 404));
    }
  } catch (err) {
    return next(new HttpError('Error while fetching user', 500));
  }

  let fetchChat;
  try {
    fetchChat = await Chat.findById(chat);
    if (!fetchChat) {
      return next(new HttpError('Chat not found', 404));
    }
  } catch (err) {
    return next(new HttpError('Error while fetching chat', 500));
  }

  if (!fetchChat.joined.includes(user.username)) {
    return next(new HttpError('You don\'t have access to this chat', 403));
  }

  if (fetchChat && fetchChat.type === 'chat' && Array.isArray(fetchChat.joined) && fetchChat.joined.length === 2) {
    return next(new HttpError('Maximum number of people in chat is hit', 400));
  }
  
  if (fetchChat && fetchChat.type === 'group' && Array.isArray(fetchChat.joined) && fetchChat.joined.length >= 15) {
    return next(new HttpError('Maximum number of people in group is hit', 400));
  }  
  
  const inviteUsernames = invites.map(invite => invite.value);

  const newInvites = inviteUsernames.filter(username => !fetchChat.joined.includes(username));

  if (newInvites.length > 0) {
    try {
      const updatedChat = await Chat.findOneAndUpdate(
        { _id: chat },
        { $push: { joined: { $each: newInvites } } }, 
        { new: true } 
      );

      const chatWithInfo = {
        ...updatedChat.toObject(),
        usersDetails: await Promise.all(
          updatedChat.joined.map(async (username) => {
            const userDetails = await User.findOne({ username }).select('-password');
            return userDetails;
          })
        )
      };

      updatedChat.joined.map((u) => {
        ioInstance && ioInstance.to("user:" + u).emit("newUsersToChat", chatWithInfo);
        ioInstance && ioInstance.to("user:" + u).emit("playNotification", {
          status: true
        });
      })

      // System
      const messageObjSystem = {
        message: `${user.username} invited ${newInvites.length} people to chat`,
        author: 'system',
        time: Date.now(),
        attachments: []
      };

      await Chat.findOneAndUpdate(
        { _id: chat },
        { 
          $push: { messages: messageObjSystem },
          $set: { 
            readed: [], 
            lastMessage: new Date()
          }
        },
        { new: true }
      );
  
      ioInstance && ioInstance.in("chat:" + fetchChat._id).emit('newMessage', {
        id: chat,
        message: messageObjSystem
      });

      return res.status(200).json({ message: 'success' });
    } catch (err) {
      return next(new HttpError('Error while updating the chat', 500));
    }
  } else {
    return res.status(200).json({ message: 'No available items' });
  }
};

const createGroup = async (req, res, next) => {
  const { title } = req.body;

  if(!title) {
    return next(new HttpError('Invalid inputs data', 404));
  }

  let user;

  try {
    user = await User.findById(req.userData.userId);
    if (!user) {
      return next(new HttpError('User does not exist', 404));
    }
  } catch (err) {
    return next(new HttpError('Error while fetching user', 500));
  }

  const groupObj = {
    title: title,
  }

  const createdChat = new Chat({
    lastMessage: Date.now(),
    messages: [{ message: `The group ${title} is created`, author: 'system', time: Date.now(), attachments: [] }],
    readed: [user.username],
    joined: [user.username],
    type: 'group',
    info: groupObj
  });

  try {
    await createdChat.save();

    const chatWithInfo = {
      ...createdChat.toObject(),
      usersDetails: await Promise.all(
        createdChat.joined.map(async (username) => {
          const userDetails = await User.findOne({ username }).select('-password');
          return userDetails;
        })
      )
    };

    ioInstance && ioInstance.to("user:" + user.username).emit("newChat", chatWithInfo);

    return res.status(200).json({ chat: createdChat, type: 'chat', message: 'success' });
  } catch (err) {
    console.log(err)
    return next(new HttpError('Error while creating chat', 500));
  }
}

const createServer = async (req, res, next) => {
  const { title, description, channels } = req.body;

  if(!title || !description || channels.length === 0) {
    return next(new HttpError('Invalid inputs data', 404));
  }

  if(title.length > 30) {
    return next(new HttpError('You have exceeded the maximum limit for the server title! Maximum 30 characters!', 404));
  }

  if(description.length > 150) {
    return next(new HttpError('You have exceeded the maximum limit for the server description! Maximum 150 characters!', 404));
  }

  let user;

  try {
    user = await User.findById(req.userData.userId);
    if (!user) {
      return next(new HttpError('User does not exist', 404));
    }
  } catch (err) {
    return next(new HttpError('Error while fetching user', 500));
  }

  const formatChannels = JSON.parse(channels)

  if(formatChannels.length === 0) {
    return next(new HttpError('No servers rooms are added!', 500));
  }

  if(!req.file) {
    return next(new HttpError('Image is required!', 500));
  }

  const serverObj = {
    title: title, 
    description: description, 
    image: req.file ? req.file.path : null,
    rooms: formatChannels,
    joined: [user.username],
    author: user.username
  }

  const createdServer = new Server(serverObj);

  try {
    await createdServer.save();
    ioInstance && ioInstance.to("user:" + user.username).emit("newServer", createdServer);

    return res.status(200).json({ server: createdServer,  message: 'success' });
  } catch (err) {
    console.log(err)
    return next(new HttpError('Error while creating chat', 500));
  }
}

const getServers = async (req, res, next) => {
  let user;

  try {
    user = await User.findById(req.userData.userId);
    if (!user) {
      return next(new HttpError('User does not exist', 404));
    }
  } catch (err) {
    return next(new HttpError('Error while fetching user', 500));
  }

  let servers;
  try {
    servers = await Server.find({ joined: user.username }).sort({ _id: -1 });
  } catch (err) {
    return next(new HttpError('Error while fetching servers', 500));
  }

  if (servers.length === 0) {
    return res.status(200).json({ message: 'No servers found for this user' });
  }

  res.status(200).json({ servers: servers });
};

const getServer = async (req, res, next) => {
  const id = req.params.id;

  let server;
  try {
    server = await Server.findById(id)
  } catch (err) {
    return next(new HttpError('Error while fetching server', 500));
  }

  if(!server) {
    return next(new HttpError('Error while fetching server', 500));
  }

  const serverWithInfo = {
    ...server.toObject(),
    usersDetails: await Promise.all(
      server.joined.map(async (username) => {
        const userDetails = await User.findOne({ username }).select('username description avatar friends status'); 
        return {
          username: userDetails.username,
          description: userDetails.description,
          avatar: userDetails.avatar,
          friends: userDetails.friends,
          status: userDetails.status
        };
      })
    )
  };

  res.status(200).json({ server: serverWithInfo });
}


const handleServerMessage = async (req, res, next) => {
  const { message, server, room, channel } = req.body;

  if (!server || !channel || !message) {
    return next(new HttpError('Invalid inputs data', 404));
  }

  let user;

  try {
    user = await User.findById(req.userData.userId);
    if (!user) {
      return next(new HttpError('User does not exist', 404));
    }
  } catch (err) {
    return next(new HttpError('Error while fetching user', 500));
  }

  let fetchServer;

  try {
    fetchServer = await Server.findById(server);
    if (!fetchServer) {
      return next(new HttpError('Server not found', 404));
    }
  } catch (err) {
    return next(new HttpError('Error while fetching server', 500));
  }

  const fetchRoom = fetchServer.rooms.find(r => r.id === room);

  if (!fetchRoom) {
    return next(new HttpError('Room not found', 404));
  }

  const targetChannel = fetchRoom.channels.find(c => c.id === channel);

  if (!targetChannel) {
    return next(new HttpError('Channel not found in room', 404));
  }

  const mentionRegex = /@(\w+)/g; 
  const mentions = [];
  let match;
  while ((match = mentionRegex.exec(message)) !== null) {
    const mentionedUser = match[1]; 
    mentions.push({
      mention: mentionedUser,
      readed: false 
    });
  }

  try {
    const messageObj = {
      id: uuidv4(),
      message: message,
      image: user.avatar,
      author: user.username,
      time: Date.now(),
      attachments: req.files ? req.files.map(file => file.path) : [],
      mentions: mentions.length > 0 ? mentions : null
    };

    if (!targetChannel.messages) {
      targetChannel.messages = [];
    }

    if (!targetChannel.readed) {
      targetChannel.readed = [];
    }

    targetChannel.messages.push(messageObj);
    targetChannel.readed = [user.username];

    fetchServer.markModified('rooms');
    await fetchServer.save();

    ioInstance && ioInstance.to("server:" + fetchServer._id).emit("updateChannel", {
      id: targetChannel.id,
      readed: targetChannel.readed,
      messages: targetChannel.messages
    });

    fetchServer.joined.map((user) => {
      ioInstance && ioInstance.to("user:" + user).emit("newServerUpdate", {
        server: fetchServer._id,
        room: fetchRoom.id,
        channel: targetChannel.id,
        readed: targetChannel.readed,
      });
    });

    const filterAuthor = fetchServer.joined.filter((u) => u !== user.username)
    filterAuthor.map((user) => {
      ioInstance && ioInstance.to("user:" + user).emit("playNotification", {
        status: true
      });
    })

    ioInstance && ioInstance.in(`server-${server}-channel-${channel}`).emit('newServerMessage', {
      message: messageObj
    });

    return res.status(200).json({ data: messageObj, message: 'success' });
  } catch (err) {
    console.log(err);
    return next(new HttpError('Error while saving message to channel', 500));
  }
};

const handleServerStatus = async (req, res, next) => {
  const { type, server, user } = req.body;

  if (!type || !server || !user) {
    return next(new HttpError('Invalid inputs data', 400));
  }

  let fetchUser;
  try {
    fetchUser = await User.findById(req.userData.userId);
    if (!fetchUser) {
      return next(new HttpError('User does not exist', 404));
    }
  } catch (err) {
    return next(new HttpError('Error while fetching user', 500));
  }

  let fetchServer;
  try {
    fetchServer = await Server.findById(server);
    if (!fetchServer) {
      return next(new HttpError('Server not found', 404));
    }
  } catch (err) {
    return next(new HttpError('Error while fetching server', 500));
  }

  if (fetchUser.username !== user) {
    return next(new HttpError('You don’t have access', 403)); 
  }

  if (type === 'leave') {
    const userIndex = fetchServer.joined.indexOf(user);
    if (userIndex !== -1) {
      fetchServer.joined.splice(userIndex, 1); 
    }
  } else if (type === 'join') {
      if (!fetchServer.joined.includes(user)) {
        fetchServer.joined.push(user);

        for (let room of fetchServer.rooms) {
            for (let channel of room.channels) {
                if (channel.readed && !channel.readed.includes(user)) {
                    channel.readed.push(user);  
                }
            }
        }
      }

      fetchServer.markModified('rooms');
  }

  fetchServer.markModified('joined');

  try {
    await fetchServer.save();

    const formatUser = await User.findById(req.userData.userId).select('username description avatar friends status');

    ioInstance && ioInstance.to("server:" + fetchServer._id).emit("updateServerJoined", {
      type: type,
      user: user,
      userObj: formatUser
   });

    res.status(200).json({ message: 'success' });
  } catch (err) {
    console.log(err)
    return next(new HttpError('Error while saving server', 500));
  }
};

const getServerInvites = async (req, res, next) => {
  const id = req.params.id;

  let user;
  try {
    user = await User.findById(req.userData.userId);
    if (!user) {
      return next(new HttpError('User not found', 404));
    }
  } catch (err) {
    return next(new HttpError('Error while fetching user', 500));
  }

  let fetchServer;
  try {
    fetchServer = await Server.findById(id);
    if (!fetchServer) {
      return next(new HttpError('Chat not found', 404));
    }
  } catch (err) {
    return next(new HttpError('Error while fetching chat', 500));
  }

  if(!fetchServer.joined.includes(user.username)) {
    return next(new HttpError('You dont have access', 500));
  }


  const userFriends = user.friends.filter(friend => !fetchServer.joined.includes(friend)); 

  res.status(200).json({ invites: userFriends });
};

const sendServerInvites = async (req, res, next) => {
  const { invites, server } = req.body;

  if(invites >= 10) {
    return next(new HttpError('Maximum invites is 10!', 404));
  }

  let user;
  try {
    user = await User.findById(req.userData.userId);
    if (!user) {
      return next(new HttpError('User not found', 404));
    }
  } catch (err) {
    return next(new HttpError('Error while fetching user', 500));
  }

  let fetchServer;
  try {
    fetchServer = await Server.findById(server);
    if (!fetchServer) {
      return next(new HttpError('Server not found', 404));
    }
  } catch (err) {
    return next(new HttpError('Error while fetching server', 500));
  }

  if (!fetchServer.joined.includes(user.username)) {
    return next(new HttpError('You don\'t have access to this chat', 403));
  }

  
  const inviteUsernames = invites.map(invite => invite.value);

  const newInvites = inviteUsernames.filter(username => !fetchServer.joined.includes(username));

  if (newInvites.length > 0) {
    try {
      const updatedServer = await Server.findOneAndUpdate(
        { _id: server },
        { $push: { joined: { $each: newInvites } } }, 
        { new: true } 
      );

      newInvites.map((user) => {
        ioInstance && ioInstance.to("user:" + user).emit("newServer", updatedServer);
        ioInstance && ioInstance.to("user:" + user).emit("playNotification", {
          status: true
        });
      })

      return res.status(200).json({ message: 'success' });
    } catch (err) {
      return next(new HttpError('Error while updating the chat', 500));
    }
  } else {
    return res.status(200).json({ message: 'No available items' });
  }
};

const searchServer = async (req, res, next) => {
  const { title } = req.body;

  if(!title) {
    return next(new HttpError('Title cant be empty', 500));
  }

  let servers;
  try {
    servers = await Server.find({ title: { $regex: title, $options: 'i' } })
  } catch (err) {
    return next(new HttpError('Error while fetching servers', 500));
  }

  res.status(200).json({ message: 'success', servers })
}

const addServerRoom = async (req, res, next) => {
  const { name, server } = req.body;

  if (!name) {
    return next(new HttpError('Name can\'t be empty', 500));
  }

  if(name.length > 30) {
    return next(new HttpError('You have exceeded the maximum limit for the server title! Maximum 30 characters!', 404));
  }

  let user;
  try {
    user = await User.findById(req.userData.userId);
    if (!user) {
      return next(new HttpError('User not found', 404));
    }
  } catch (err) {
    return next(new HttpError('Error while fetching user', 500));
  }

  let fetchServer;
  try {
    fetchServer = await Server.findById(server);
    if (!fetchServer) {
      return next(new HttpError('Server not found', 404));
    }
  } catch (err) {
    return next(new HttpError('Error while fetching server', 500));
  }

  if (user.username !== fetchServer.author && !fetchServer.admins.includes(user.username)) {
    return next(new HttpError('You don\'t have access!', 403));
  }

  const updateSort = fetchServer.rooms.length + 1;
  const formatId = uuidv4();

  const roomObj = {
    id: formatId,
    sort: updateSort,
    room: name,
    channels: []
  };

  fetchServer.rooms = [...fetchServer.rooms, roomObj]; 

  fetchServer.markModified('rooms');
  await fetchServer.save();

  ioInstance && ioInstance.to("server:" + fetchServer._id).emit("newRoomAdded", roomObj);

  res.status(200).json({ message: 'success', room: roomObj });
};

const addServerChannel = async (req, res, next) => {
  const { server, room, name, description } = req.body;

  if (!name) {
    return next(new HttpError('Name can\'t be empty', 500));
  }

  if(name.length > 30) {
    return next(new HttpError('You have exceeded the maximum limit for the channel title! Maximum 30 characters!', 404));
  }

  if(description.length > 150) {
    return next(new HttpError('You have exceeded the maximum limit for the channel description! Maximum 150 characters!', 404));
  }

  let user;
  try {
    user = await User.findById(req.userData.userId);
    if (!user) {
      return next(new HttpError('User not found', 404));
    }
  } catch (err) {
    return next(new HttpError('Error while fetching user', 500));
  }

  let fetchServer;
  try {
    fetchServer = await Server.findById(server);
    if (!fetchServer) {
      return next(new HttpError('Server not found', 404));
    }
  } catch (err) {
    return next(new HttpError('Error while fetching server', 500));
  }

  if (user.username !== fetchServer.author && !fetchServer.admins.includes(user.username)) {
    return next(new HttpError('You don\'t have access!', 403));
  }

  const channelObj = {
    id: uuidv4(),
    name: name,
    description: description,
    messages: [],
    readed: []
  };

  const targetRoom = fetchServer.rooms.find(r => r.id === room);

  if (!targetRoom) {
    return next(new HttpError('Room not found', 404));
  }

  targetRoom.channels.push(channelObj);

  fetchServer.markModified('rooms');
  await fetchServer.save();

  ioInstance && ioInstance.to("server:" + fetchServer._id).emit("newChannelAdded", {
    server: fetchServer._id,
    room: room,
    channel: channelObj
  });

  res.status(200).json({ message: 'success', channel: channelObj });
};

const updateServerRoom = async (req, res, next) => {
  const { server, room, name } = req.body;

  if (!server || !room || !name) {
    return next(new HttpError('Invalid data', 500));
  }

  if(name.length > 30) {
    return next(new HttpError('You have exceeded the maximum limit for the room title! Maximum 30 characters!', 404));
  }

  let user;
  try {
    user = await User.findById(req.userData.userId);
    if (!user) {
      return next(new HttpError('User not found', 404));
    }
  } catch (err) {
    return next(new HttpError('Error while fetching user', 500));
  }

  let fetchServer;
  try {
    fetchServer = await Server.findById(server);
    if (!fetchServer) {
      return next(new HttpError('Server not found', 404));
    }
  } catch (err) {
    return next(new HttpError('Error while fetching server', 500));
  }

  if (user.username !== fetchServer.author && !fetchServer.admins.includes(user.username)) {
    return next(new HttpError('You don\'t have access!', 403));
  }

  const targetRoom = fetchServer.rooms.find(r => r.id === room);
  if (!targetRoom) {
    return next(new HttpError('Room not found', 404));
  }

  targetRoom.room = name;

  fetchServer.markModified('rooms');

  try {
    await fetchServer.save();
  } catch (err) {
    return next(new HttpError('Error while saving server', 500));
  }

  ioInstance && ioInstance.to("server:" + fetchServer._id).emit("roomUpdated", {
      roomId: room,
      newName: name
  });

  res.status(200).json({ message: 'success', room: targetRoom });
};

const deleteServerRoom = async (req, res, next) => {
  const { server, room } = req.body;

  const roomId = room.id;

  if (!server || !roomId) {
      return next(new HttpError('Invalid data', 500));
  }

  let user;
  try {
      user = await User.findById(req.userData.userId);
      if (!user) {
          return next(new HttpError('User not found', 404));
      }
  } catch (err) {
      return next(new HttpError('Error while fetching user', 500));
  }

  let fetchServer;
  try {
      fetchServer = await Server.findById(server);
      if (!fetchServer) {
          return next(new HttpError('Server not found', 404));
      }
  } catch (err) {
      return next(new HttpError('Error while fetching server', 500));
  }

  if (user.username !== fetchServer.author && !fetchServer.admins.includes(user.username)) {
    return next(new HttpError('You don\'t have access!', 403));
  }

  const roomIndex = fetchServer.rooms.findIndex(r => r.id === roomId);
  if (roomIndex === -1) {
      return next(new HttpError('Room not found', 404));
  }

  fetchServer.rooms.splice(roomIndex, 1);
  fetchServer.markModified('rooms');

  try {
      await fetchServer.save();
  } catch (err) {
      return next(new HttpError('Error while saving server', 500));
  }

  ioInstance && ioInstance.to("server:" + fetchServer._id).emit("roomDeleted", { roomId: roomId });

  res.status(200).json({ message: 'success' });

}

const deleteRoomChannel = async (req, res, next) => {
  const { server, room, channel } = req.body;

  if (!server || !room || !channel) {
      return next(new HttpError('Invalid data', 500));
  }

  let user;
  try {
      user = await User.findById(req.userData.userId);
      if (!user) {
          return next(new HttpError('User not found', 404));
      }
  } catch (err) {
      return next(new HttpError('Error while fetching user', 500));
  }

  let fetchServer;
  try {
      fetchServer = await Server.findById(server);
      if (!fetchServer) {
          return next(new HttpError('Server not found', 404));
      }
  } catch (err) {
      return next(new HttpError('Error while fetching server', 500));
  }

  if (user.username !== fetchServer.author && !fetchServer.admins.includes(user.username)) {
    return next(new HttpError('You don\'t have access!', 403));
  }

  const targetRoom = fetchServer.rooms.find(r => r.id === room);
  if (!targetRoom) {
      return next(new HttpError('Room not found', 404));
  }

  const channelIndex = targetRoom.channels.findIndex(c => c.id === channel);
  if (channelIndex === -1) {
      return next(new HttpError('Channel not found', 404));
  }

  targetRoom.channels.splice(channelIndex, 1);
  fetchServer.markModified('rooms');

  try {
      await fetchServer.save();
  } catch (err) {
      return next(new HttpError('Error while saving server', 500));
  }

  ioInstance && ioInstance.to("server:" + fetchServer._id).emit("channelDeleted", {
      roomId: room,
      channelId: channel
  });

  res.status(200).json({ message: 'success' });

}

const updateRoomChannel = async (req, res, next) => {
  const { server, room, channel, name, description } = req.body;

  if (!server || !room || !channel || !name || !description) {
      return next(new HttpError('Invalid data', 500));
  }

  if(name.length > 30) {
    return next(new HttpError('You have exceeded the maximum limit for the channel title! Maximum 30 characters!', 404));
  }

  if(description.length > 150) {
    return next(new HttpError('You have exceeded the maximum limit for the channel description! Maximum 150 characters!', 404));
  }

  let user;
  try {
      user = await User.findById(req.userData.userId);
      if (!user) {
          return next(new HttpError('User not found', 404));
      }
  } catch (err) {
      return next(new HttpError('Error while fetching user', 500));
  }

  let fetchServer;
  try {
      fetchServer = await Server.findById(server);
      if (!fetchServer) {
          return next(new HttpError('Server not found', 404));
      }
  } catch (err) {
      return next(new HttpError('Error while fetching server', 500));
  }

  if (user.username !== fetchServer.author && !fetchServer.admins.includes(user.username)) {
     return next(new HttpError('You don\'t have access!', 403));
  }

  const targetRoom = fetchServer.rooms.find(r => r.id === room);
  if (!targetRoom) {
      return next(new HttpError('Room not found', 404));
  }

  const targetChannel = targetRoom.channels.find(c => c.id === channel);
  if (!targetChannel) {
      return next(new HttpError('Channel not found', 404));
  }

  targetChannel.name = name;
  targetChannel.description = description;

  fetchServer.markModified('rooms');

  try {
      await fetchServer.save();
  } catch (err) {
      return next(new HttpError('Error while saving server', 500));
  }

  ioInstance && ioInstance.to("server:" + fetchServer._id).emit("channelUpdated", {
      roomId: room,
      channelId: channel,
      name: name,
      description: description
  });

  res.status(200).json({ message: 'success' });

}

const getBestServers = async (req, res, next) => {
  let top;

  try {
    top = await Server.aggregate([
      {
        $project: {
          _id: 1,    
          title: 1,      
          image: 1,        
          description: 1,   
          joined: 1,        
          joinedLength: { $size: "$joined" } 
        }
      },
      {
        $sort: { joinedLength: -1 } 
      },
      {
        $limit: 10 
      }
    ]);
  } catch (err) {
    return next(new HttpError('Error while fetching top servers', 500));
  }

  res.status(200).json({ top });
};

const getUser = async (req, res, next) => {
  const username = req.params.username;

  let user;
  let fetchUser;
  let fetchUserServers;
  
  try {
    user = await User.findById(req.userData.userId);
    if (!user) {
      return next(new HttpError('User not found', 404));
    }

    fetchUser = await User.findOne({ username }, '-password -email');
    if (!fetchUser) {
      return next(new HttpError('User not found', 404));
    }

    fetchUserServers = await Server.find({ joined: username });

    const friendsInfoPromises = fetchUser.friends.map(async (friendUsername) => {
      return await User.findOne({ username: friendUsername }).select('-password');
    });
    
    const friendsInfo = await Promise.all(friendsInfoPromises);

    const updatedUser = async () => {
      let friendStatus = '';

      if(user.username === username) {
        friendStatus = 'invalid'
      }
    
      if (user.friends.includes(username)) {
        friendStatus = 'friends';
      } else {
        const request = await Request.findOne({
          $or: [
            { from: user.username, to: username },
            { from: username, to: user.username }
          ],
          status: false
        });
    
        if (request) {
          friendStatus = 'pending';
        }
      }
    
      return {
        ...fetchUser.toObject(),
        friendStatus
      };
    };

    const formatUpdatedUser = await updatedUser()
    const fetchUserWithInfo = {
      ...formatUpdatedUser,
      friendsInfo,
      serversInfo: fetchUserServers,
    };

    res.status(200).json({ user: fetchUserWithInfo });

  } catch (err) {
    console.log(err)
    return next(new HttpError('Error while fetching user or related data', 500));
  }
};

const addAdmins = async (req, res, next) => {
  const { server, admins } = req.body;

  let user;
  try {
      user = await User.findById(req.userData.userId);
      if (!user) {
          return next(new HttpError('User not found', 404));
      }
  } catch (err) {
      return next(new HttpError('Error while fetching user', 500));
  }

  let fetchServer;
  try {
      fetchServer = await Server.findById(server);
      if (!fetchServer) {
          return next(new HttpError('Server not found', 404));
      }
  } catch (err) {
      return next(new HttpError('Error while fetching server', 500));
  }

  if(fetchServer.author !== user.username) {
    return next(new HttpError('You dont have access', 403));
  }

  const adminInvites = admins.map(a => a.value);

  if (adminInvites.length > 0) {
    try {
      await Server.findOneAndUpdate(
        { _id: server },
        { $push: { admins: { $each: adminInvites } } }, 
        { new: true } 
      );

      ioInstance && ioInstance.in("server:" + fetchServer._id).emit('newAdmins', {
        admins: adminInvites,
      });

      return res.status(200).json({ message: 'success' });
    } catch (err) {
      return next(new HttpError('Error while updating the chat', 500));
    }
  } else {
    return res.status(200).json({ message: 'No available items' });
  }

}

const deleteAdmin = async (req, res, next) => {
  const { server, admin } = req.body;

  let user;
  try {
      user = await User.findById(req.userData.userId);
      if (!user) {
          return next(new HttpError('User not found', 404));
      }
  } catch (err) {
      return next(new HttpError('Error while fetching user', 500));
  }

  let fetchServer;
  try {
      fetchServer = await Server.findById(server);
      if (!fetchServer) {
          return next(new HttpError('Server not found', 404));
      }
  } catch (err) {
      return next(new HttpError('Error while fetching server', 500));
  }

  if(fetchServer.author !== user.username) {
    return next(new HttpError('You dont have access', 403));
  }

  fetchServer.admins = fetchServer.admins.pull(admin)

  try {
    await fetchServer.save()
  } catch (err) {
    return next(new HttpError('Error while deleting admin', 500));

  }

  res.status(200).json({ message: 'success' })
}

const deleteUserMessage = async (req, res, next) => {
  const { id, chat } = req.body;

  let user;
  try {
    user = await User.findById(req.userData.userId);
    if (!user) {
      return next(new HttpError('User not found', 404));
    }
  } catch (err) {
    return next(new HttpError('Error while fetching user', 500));
  }

  let fetchChat;
  try {
    fetchChat = await Chat.findById(chat);
    if (!fetchChat) {
      return next(new HttpError('Chat not found', 404));
    }
  } catch (err) {
    return next(new HttpError('Error while fetching chat', 500));
  }

  const currentMessage = fetchChat.messages.find(m => m.id === id);
  if (!currentMessage) {
    return next(new HttpError('Message not found', 404));
  }

  if (currentMessage.author !== user.username) {
    return next(new HttpError('You dont have access', 403));
  }

  fetchChat.messages = fetchChat.messages.filter(m => m.id !== id);

  try {
    await fetchChat.markModified('messages'); 
    await fetchChat.save();

    ioInstance && ioInstance.in("chat:" + fetchChat._id).emit('userMessageDeleted', {
      id: id,
    });

    fetchChat.joined.length > 0 && fetchChat.joined.forEach((j) => {
      ioInstance && ioInstance.to("user:" + j).emit("userMessageDeletedUser", {
        id: id,
        chat: chat
      });
    })
  } catch (err) {
    return next(new HttpError('Error while deleting message', 500));
  }

  res.status(200).json({ message: 'success' });
};

const updateUserMessage = async (req, res, next) => {
  const { chat, id, message } = req.body;

  if(!message) {
    return next(new HttpError('Message cant be empty', 500));
  }

  let user;
  try {
    user = await User.findById(req.userData.userId);
    if (!user) {
      return next(new HttpError('User not found', 404));
    }
  } catch (err) {
    return next(new HttpError('Error while fetching user', 500));
  }

  let fetchChat;
  try {
    fetchChat = await Chat.findById(chat);
    if (!fetchChat) {
      return next(new HttpError('Chat not found', 404));
    }
  } catch (err) {
    return next(new HttpError('Error while fetching chat', 500));
  }

  const currentMessage = fetchChat.messages.find(m => m.id === id);
  if (!currentMessage) {
    return next(new HttpError('Message not found', 404));
  }

  if (currentMessage.author !== user.username) {
    return next(new HttpError('You dont have access', 403));
  }

  currentMessage.message = message;
  currentMessage.edited = true;

  try {
    await fetchChat.markModified('messages'); 
    await fetchChat.save();

    ioInstance && ioInstance.in("chat:" + fetchChat._id).emit('userMessageUpdated', {
      id: id,
      message: message
    });

    fetchChat.joined.length > 0 && fetchChat.joined.forEach((j) => {
      ioInstance && ioInstance.to("user:" + j).emit("userMessageUpdatedUser", {
        id: id,
        chat: chat,
        message: message
      });
    });

  } catch (err) {
    return next(new HttpError('Error while updating message', 500));
  }

  res.status(200).json({ message: 'success' });
};

const deleteServerMessage = async (req, res, next) => {
  const { id, server, room, channel } = req.body;

  let user;
  try {
    user = await User.findById(req.userData.userId);
    if (!user) {
      return next(new HttpError('User not found', 404));
    }
  } catch (err) {
    return next(new HttpError('Error while fetching user', 500));
  }

  let fetchServer;
  try {
    fetchServer = await Server.findById(server);
    if (!fetchServer) {
      return next(new HttpError('Server not found', 404));
    }
  } catch (err) {
    return next(new HttpError('Error while fetching server', 500));
  }

  const currentRoom = fetchServer.rooms.find(r => r.id === room);
  if (!currentRoom) {
    return next(new HttpError('Room not found', 404));
  }

  const currentChannel = currentRoom.channels.find(c => c.id === channel);
  if (!currentChannel) {
    return next(new HttpError('Channel not found', 404));
  }

  const currentMessage = currentChannel.messages.find(m => m.id === id);
  if (!currentMessage) {
    return next(new HttpError('Message not found', 404));
  }

  if (currentMessage.author !== user.username && user.username !== fetchServer.author && !fetchServer.admins.includes(user.username)) {
    return next(new HttpError('You don\'t have access!', 403));
  }

  currentChannel.messages = currentChannel.messages.filter(m => m.id !== id);

  try {
    await fetchServer.markModified('rooms'); 
    await fetchServer.save();

    ioInstance && ioInstance.in("server:" + fetchServer._id).emit('serverMessageDeleted', {
      id: id,
    });

  } catch (err) {
    return next(new HttpError('Error while deleting message', 500));
  }

  res.status(200).json({ message: 'success' });
};


const updateServerMessage = async (req, res, next) => {
  const { server, room, channel, id, message } = req.body;

  if (!message) {
    return next(new HttpError("Message can't be empty", 400));
  }

  let user;
  try {
    user = await User.findById(req.userData.userId);
    if (!user) {
      return next(new HttpError("User not found", 404));
    }
  } catch (err) {
    return next(new HttpError("Error while fetching user", 500));
  }

  let fetchServer;
  try {
    fetchServer = await Server.findById(server);
    if (!fetchServer) {
      return next(new HttpError("Server not found", 404));
    }
  } catch (err) {
    return next(new HttpError("Error while fetching server", 500));
  }

  const currentRoom = fetchServer.rooms.find((r) => r.id === room);
  if (!currentRoom) {
    return next(new HttpError("Room not found", 404));
  }

  const currentChannel = currentRoom.channels.find((c) => c.id === channel);
  if (!currentChannel) {
    return next(new HttpError("Channel not found", 404));
  }

  const currentMessage = currentChannel.messages.find((m) => m.id === id);
  if (!currentMessage) {
    return next(new HttpError("Message not found", 404));
  }

  if (currentMessage.author !== user.username) {
    return next(new HttpError("You don't have access", 403));
  }

  currentMessage.message = message; 
  currentMessage.edited = true;

  try {
    await fetchServer.markModified("rooms");
    await fetchServer.save();

    ioInstance &&
      ioInstance.in("server:" + fetchServer._id).emit("serverMessageUpdated", {
        id: id,
        message: message,
      });
  } catch (err) {
    return next(new HttpError("Error while updating message", 500));
  }

  res.status(200).json({ message: "success" });
};

const updateServerMenagment = async (req, res, next) => {
  const { server, u, t } = req.body;

  let user;
  try {
    user = await User.findById(req.userData.userId);
    if (!user) {
      return next(new HttpError("User not found", 404));
    }
  } catch (err) {
    return next(new HttpError("Error while fetching user", 500));
  }

  let fetchServer;
  try {
    fetchServer = await Server.findById(server);
    if (!fetchServer) {
      return next(new HttpError("Server not found", 404));
    }
  } catch (err) {
    return next(new HttpError("Error while fetching server", 500));
  }

  if (user.username !== fetchServer.author && !fetchServer.admins.includes(user.username)) {
    return next(new HttpError('You don\'t have access!', 403));
  }

  if (!['ban', 'mute', 'kick'].includes(t)) {
    return next(new HttpError("Invalid action type", 400));
  }

  if(t === 'mute' && fetchServer.mutted.includes(u)){
    return next(new HttpError("User is already mutted", 500));
  }

  if(t === 'ban' && fetchServer.banned.includes(u)){
    return next(new HttpError("User is already banned", 500));
  }
  
  switch (t) {
    case 'ban':
      fetchServer.banned.push(u);
      break;
    
    case 'mute':
      fetchServer.mutted.push(u);
      break;
  
    case 'kick':
      fetchServer.joined = fetchServer.joined.filter(member => member.toString() !== u.toString());
      break;
    
  }
  
  try {
    await fetchServer.save();

    ioInstance &&
    ioInstance.in("server:" + fetchServer._id).emit("serverMenagmentUpdated", {
      u: u,
      t: t,
    });
  } catch (err) {
    console.log(err)
    return next(new HttpError("Error while saving server updates", 500));
  }
  
  res.status(200).json({ message: "success" });
}

const updateServerMenagmentDelete = async (req, res, next) => {
  const { server, u, t } = req.body;

  let user;
  try {
    user = await User.findById(req.userData.userId);
    if (!user) {
      return next(new HttpError("User not found", 404));
    }
  } catch (err) {
    return next(new HttpError("Error while fetching user", 500));
  }

  let fetchServer;
  try {
    fetchServer = await Server.findById(server);
    if (!fetchServer) {
      return next(new HttpError("Server not found", 404));
    }
  } catch (err) {
    return next(new HttpError("Error while fetching server", 500));
  }

  if (user.username !== fetchServer.author && !fetchServer.admins.includes(user.username)) {
    return next(new HttpError('You don\'t have access!', 403));
  }

  if (!['ban', 'mute'].includes(t)) {
    return next(new HttpError("Invalid action type", 400));
  }

  if(t === 'mute' && !fetchServer.mutted.includes(u)){
    return next(new HttpError("User is not at mutted", 500));
  }

  if(t === 'ban' && !fetchServer.banned.includes(u)){
    return next(new HttpError("User is not at banned", 500));
  }
  
  switch (t) {
    case 'ban':
      fetchServer.banned = fetchServer.banned.filter(member => member.toString() !== u.toString());
      break;
    
    case 'mute':
      fetchServer.mutted = fetchServer.mutted.filter(member => member.toString() !== u.toString());
      break;
  }
  
  try {
    await fetchServer.save();

    ioInstance &&
    ioInstance.in("server:" + fetchServer._id).emit("serverMenagmentUpdatedDelete", {
      u: u,
      t: t,
    });
  } catch (err) {
    console.log(err)
    return next(new HttpError("Error while saving server updates", 500));
  }
  
  res.status(200).json({ message: "success" });
}

exports.handleChatMessage = handleChatMessage;
exports.getChats = getChats;
exports.getChat = getChat;
exports.leaveChat = leaveChat;
exports.getInvites = getInvites;
exports.sendInvites = sendInvites;
exports.createGroup = createGroup;
exports.createServer = createServer;
exports.getServers = getServers;
exports.getServer = getServer;
exports.handleServerMessage = handleServerMessage;
exports.handleServerStatus = handleServerStatus;
exports.getServerInvites = getServerInvites;
exports.sendServerInvites = sendServerInvites;
exports.searchServer = searchServer;
exports.addServerRoom = addServerRoom;
exports.addServerChannel = addServerChannel;
exports.updateServerRoom = updateServerRoom;
exports.deleteServerRoom = deleteServerRoom;
exports.deleteRoomChannel = deleteRoomChannel;
exports.updateRoomChannel = updateRoomChannel;
exports.getBestServers = getBestServers;
exports.getUser = getUser;
exports.addAdmins = addAdmins;
exports.deleteAdmin = deleteAdmin;
exports.deleteUserMessage = deleteUserMessage;
exports.updateUserMessage = updateUserMessage;
exports.deleteServerMessage = deleteServerMessage;
exports.updateServerMessage = updateServerMessage;
exports.updateServerMenagment = updateServerMenagment;
exports.updateServerMenagmentDelete = updateServerMenagmentDelete;

exports.initialize = initialize;