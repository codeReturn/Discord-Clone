const User = require('./models/user');
const Chat = require('./models/chat');
const Server = require('./models/server');

function initSocket(http, corsOptions) {
  const io = require('socket.io')(http, {
    cors: corsOptions,
    path: '/networkserver/socket.io/',
  });

  io.on('connection', async (socket) => {
    const { userId } = socket.handshake.query;

    const user = await User.findOne({ _id: userId });
    if (!user) {
      console.log(`User with ID ${userId} not found.`);
      return;
    }

    io.to("user:" + user.username).emit('userLanded', true);

    const friendsUsernames = user.friends || [];
    friendsUsernames.forEach((friendUsername) => {
      io.to("user:" + friendUsername).emit('userConnected', {
        username: user.username,
        message: `${user.username} has connected.`,
      });
    });

    await User.findOneAndUpdate({ _id: userId }, { socket: socket.id, status: 1 }, { new: true });

    socket.join("user:" + user.username);
    
    const servers = await Server.find({ joined: user.username });
    if (servers.length > 0){
      servers.forEach(server => {
        socket.join(`server:${server._id}`)
        io.to(`server:${server._id}`).emit('userJoinedServer', {
          user: user.username
        });
      });
    }


    socket.on('joinChat', (id) => {
      console.log('joinedchat', id)
      socket.join("chat:" + id);
    })

    socket.on('joinServer', (data) => {
        console.log('joinedserver', data)
        socket.join("server:" + data.server); 
    });
  
    socket.on('joinChannel', async (data) => {
      const { server: serverId, room: roomId, channel: channelId } = data;

      socket.join(`server-${serverId}-channel-${channelId}`);

      try {
        const user = await User.findById(userId, 'username');  
        if (!user) {
          return console.error('User not found');
        }
    
        const username = user.username;
    
        const server = await Server.findById(serverId);
        if (!server) {
          return console.error('Server not found');
        }
    
        const room = server.rooms.find(r => r.id === roomId);
        if (!room) {
          return console.error('Room not found');
        }
    
        const channel = room.channels.find(c => c.id === channelId);
        if (!channel) {
          return console.error('Channel not found');
        }
    
        if (channel.readed && !channel.readed.includes(username)) {
          channel.readed.push(username);
        }
    
        server.markModified('rooms');
        await server.save();
    
        io.to("server:" + server._id).emit("updateChannel", {
          id: channel.id,
          readed: channel.readed
        });

        server.joined.map((user) => {
          io.to("user:" + user).emit("newServerUpdate", {
            server: server._id,
            room: room.id,
            channel: channel.id,
            readed: channel.readed,
          });
        })

    
      } catch (error) {
        console.error('Error processing joinChannel event:', error);
      }
    });
    
    socket.on('typing', (data) => {
      io.to("chat:" + data.id).emit('userTyping', data)
    })

    socket.on('servertyping', async (data) => {
      const fetchUser = await User.findById(data.user, '-password')

      const formatData = {
        user: fetchUser.username,
        id: data.id,
        channel: data.channel,
        status: data.status,
        message: data.message
      }

      io.to(`server-${data.id}-channel-${data.channel}`).emit('serverTyping', formatData)
    })

    socket.on('userExpressionUpdate', async (data) => {  
      const { chat, user, expression } = data;

      const fetchUserModel = await User.findOne({ username: user });
      let formatExpression;

      if (fetchUserModel) {
        formatExpression = expression.replace('modelname', fetchUserModel.model);
      } else {
        console.log('User not found');
      }
      
      const updatedChat = await Chat.findOneAndUpdate(
          { _id: chat, "avatars.username": user },  
          { $set: { "avatars.$.current": formatExpression } },  
          { new: true }  
      );
  
      if (updatedChat) {
          io.to("chat:" + chat).emit('updateUserExpression', {
              user: user,
              expression: formatExpression
          });
      } else {
          console.error("Chat or user not found.");
      }
  });
    
  socket.on('addAvatar', async (data) => {
      try {
        const user = await User.findOne({ username: data.user });
    
        if (!user) {
          console.log('User not found!');
          return;
        }
    
        const model = user.model;
    
        await Chat.updateMany(
          { 'avatars.username': data.user }, 
          { $pull: { avatars: { username: data.user } } } 
        );
    
        const avatarObject = {
          username: data.user,
          model: model,
          current: ''   
        };
    
        await Chat.updateOne(
          { _id: data.chat }, 
          { $addToSet: { avatars: avatarObject } } 
        );
    
        console.log(`User ${data.user} with model ${model} has been added to chat ${data.chat}`);
      } catch (error) {
        console.error('Error adding avatar:', error);
      }
    });
    
    socket.on('mentionRead', async (data) => {    
      const { server, room, channel, messageId, username } = data;
    
      try {
        const fetchServer = await Server.findById(server);
        if (!fetchServer) {
          return console.error('Server not found');
        }
    
        const fetchRoom = fetchServer.rooms.find(r => r.id === room);
        if (!fetchRoom) {
          return console.error('Room not found');
        }
    
        const targetChannel = fetchRoom.channels.find(c => c.id === channel);
        if (!targetChannel) {
          return console.error('Channel not found');
        }
    
        const targetMessage = targetChannel.messages.find(m => m.id === messageId);
        if (!targetMessage) {
          return console.error('Message not found');
        }
    
        const mention = targetMessage.mentions && targetMessage.mentions.find(m => m.mention === username);
        if (mention && mention.readed === false) {
          mention.readed = true;
        }
    
        fetchServer.markModified('rooms')
        await fetchServer.save();
      
        io.to(`user:${username}`).emit('messageReaded', { messageId, username });        

      } catch (err) {
        console.error('Error while updating message read status:', err);
      }
    });
    
    socket.on('mentionReadChat', async (data) => {
      const { chat, messageId, username } = data;
    
      try {
        const fetchChat = await Chat.findById(chat);
        if (!fetchChat) {
          return console.error('Chat not found');
        }
        
        const targetMessage = fetchChat.messages.find(m => m.id === messageId);
        if (!targetMessage) {
          return console.error('Message not found');
        }
    
        const mention = targetMessage.mentions && targetMessage.mentions.find(m => m.mention === username);
        if (mention && mention.readed === false) {
          mention.readed = true;
        }
    
        fetchChat.markModified('messages')
        await fetchChat.save();
      
        io.to(`user:${username}`).emit('messageReadedChat', { messageId, username });        

      } catch (err) {
        console.error('Error while updating message read status:', err);
      }
    })
    
    socket.on('disconnect', async () => {
      await User.findOneAndUpdate({ _id: userId }, { socket: '', status: 0 }, { new: true });

      await Chat.updateMany(
        { 'avatars.username': user.username }, 
        { $pull: { avatars: { username: user.username } } } 
      );

      friendsUsernames.forEach((friendUsername) => {
        io.to("user:" + friendUsername).emit('userDisconnected', {
          username: user.username,
          message: `${user.username} has disconnected.`,
        });
      });

      const servers = await Server.find({ joined: user.username });
      if (servers.length > 0){
        servers.forEach(server => {
          io.to(`server:${server._id}`).emit('userLeavedServer', {
            user: user.username
          });
        });
      }
    });

    const appController = require('./controllers/app-controllers');
    const usersController = require('./controllers/users-controllers');
    appController.initialize(io);
    usersController.initialize(io);
  });
}

module.exports = initSocket;
