import React, { useState, useEffect, useContext, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';

import useSocket from '../shared/util/socket';
import { AuthContext } from '../shared/context/auth-context';

import ReactMarkdown from 'react-markdown';
import remarkEmoji from 'remark-emoji';
import DOMPurify from 'dompurify';

import axios from 'axios';

import { Container, Row, Col, Card, Button, Image, Form, Dropdown, OverlayTrigger, Popover, FormControl, Modal, Badge, Tabs, Tab, Tooltip } from 'react-bootstrap';

import Servers from '../shared/components/Display/Servers';
import InviteFriendsServer from '../shared/components/Display/InviteFriendsServer';

import Skeleton from '../shared/components/UIElements/Skeleton';
import LoadingSpinner from '../shared/components/UIElements/LoadingSpinner';

import { toast } from 'react-toastify';

import noavatarImage from '../images/noavatar.jpg';

import Select from 'react-select';
import { customStyles } from '../shared/components/UIElements/SelectStyle';

import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';

import homeIcon from '../images/icons/home.svg'
import typingAnimation from '../images/typing-animation.gif';

import useSound from '../shared/hooks/useSound';

const DashboardServer = ({ user }) => {
    const id = useParams().id;
    const auth = useContext(AuthContext);
    const socket = useSocket();
    const playSound = useSound();

    const localTheme = localStorage.getItem('theme');
    const formatStyle = localTheme === 'dark-theme' ? 'dark' : 'white';  

    const [currentMessages, setCurrentMessages] = useState([]);
    const [limit, setLimit] = useState(20);  
    const chatBodyRef = useRef(null); 
    const [loading, setLoading] = useState(false)

    const [message, setMessage] = useState('')
    const [attachments, setAttachments] = useState([]);

    const [serverLoading, setServerLoading] = useState(false)
    const [server, setServer] = useState(null)
    const [serverUsers, setServerUsers] = useState([])

    const [currentChannel, setCurrentChannel] = useState(null)
    const [currentRoom, setCurrentRoom] = useState(null)
    const [channelLoading, setChannelLoading] = useState(false)

    const messagesEndRef = useRef(null);

    const [admins, setAdmins] = useState([])
    const [banned, setBanned] = useState([])
    const [mutted, setMutted] = useState([])

    const [showRightSidebar, setShowRightSidebar] = useState(false)

    const fetchServer = async () => {
        try {
            setServer(null)
            setCurrentChannel(null)
            setCurrentRoom(null)

            setServerLoading(true);
    
            const response = await axios.get(
                `http://localhost:5000/networkserver/api/app/getserver/${id}`,
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + auth.token, 
                    }
                }
            );
    
            if (response.data.server) {
                setServer(response.data.server);
                setServerUsers(response.data.server.usersDetails)

                setAdmins(response.data.server.admins)
                setBanned(response.data.server.banned)
                setMutted(response.data.server.mutted)
            } else {
                window.location.href = '/'
            }
            
            setServerLoading(false);
        } catch (err) {
            setServerLoading(false)
            toast.error(err.response?.data?.message || 'An error occurred');
        } 

    }

    useEffect(() => {
        fetchServer()
    }, [id]);

    useEffect(() => {
        if(socket && server) {
            socket.emit('joinServer', { server: id })
        }
    }, [server, id, socket]);

    const openChannel = (room, channel) => {
        setShowRightSidebar(false)
        setChannelLoading(true)
    
        setCurrentRoom(room)
        setCurrentChannel(channel)
    
        const foundRoom = server.rooms.find(r => r.id === room.id);
        const foundChannel = foundRoom.channels.find(c => c.id === channel.id);
        
        if (foundChannel) {
            if(foundChannel.messages && foundChannel.messages.length > 0) {
                setCurrentMessages(foundChannel.messages && foundChannel.messages.slice(-limit)); 
            } else {
                setCurrentMessages([])
            }
        }
    
        socket?.emit('joinChannel', {
            server: server?._id,
            room: room.id,
            channel: channel.id
        })
    
        setMessage('')
        setAttachments([])

        setTimeout(() => {
            setChannelLoading(false)
        }, 1000);

        setTimeout(() => {
            const customContainer = messagesEndRef.current.closest('.messages-height');
    
            if (customContainer) {
                customContainer.scrollTo({
                top: customContainer.scrollHeight - 20, 
                behavior: 'smooth', 
              });
            }
        }, 1500);
    }
    
    
    // Handler
    const fileInputRef = useRef();
  
    const handleFileButtonClick = () => {
      fileInputRef.current.click(); 
    };
  
    const handleFileChange = (e) => {
      const files = e.target.files;
      const allowedTypes = [
        'image/jpeg', 'image/png', 'image/gif',
        'application/zip', 'application/x-zip-compressed',
        'application/x-rar-compressed'
      ];
      const maxFiles = 4;
      const newAttachments = [];
    
      for (let file of files) {
        if (newAttachments.length >= maxFiles) break;
    
        const fileExtension = file.name.split('.').pop().toLowerCase();
        if (allowedTypes.includes(file.type) || fileExtension === 'rar' || fileExtension === 'zip') {
          newAttachments.push(file);
        } else {
          toast.error(`${file.name} is not a valid file type!`);
        }
      }
    
      setAttachments((prev) => [...prev, ...newAttachments]);
    };
    
    const removeAttachment = (index) => {
      setAttachments((prev) => prev.filter((_, i) => i !== index));
    };
  
    const handleDragOver = (e) => {
        e.preventDefault();
    };
      
    const handleDrop = (e) => {
        e.preventDefault();
        
        const files = e.dataTransfer.files;
        
        handleFileChange({ target: { files } });
    };
      
  
    const handleServerMessage = async (e) => {
      e.preventDefault();
  
      const formData = new FormData();
      formData.append('message', message);
      formData.append('server', server?._id); 
      formData.append('room', currentRoom?.id); 
      formData.append('channel', currentChannel?.id);  
  
      attachments.forEach((file) => {
        formData.append('files', file);
      });
  
  
      try {
          const response = await axios.post(
              'http://localhost:5000/networkserver/api/app/handleservermessage',
              formData,
              {
                  headers: {
                      'Content-Type': 'multipart/form-data',
                      'Authorization': 'Bearer ' + auth.token, 
                  }
              }
          );
  
          if(response.data.message === 'success') {
            const chatContainer = messagesEndRef?.current?.closest('.messages-height');
    
            if (chatContainer) {
              chatContainer.scrollTo({
                top: chatContainer.scrollHeight - 20, 
                behavior: 'smooth', 
              });
            }

            socket?.emit('servertyping', {
                user: auth.userId,
                id: server?._id,
                channel: currentChannel?.id,
                status: false
            });
          }
      } catch (err) {
          toast.error(err.response?.data?.message || 'An error occurred');
      } finally {
          setMessage('')
          setAttachments([]);
      }
    }

    const textareaRef = useRef(null); 

    const insertTemplate = (template) => {
      const textarea = textareaRef.current;
      const cursorPos = textarea.selectionStart; 
      const textBeforeCursor = message.substring(0, cursorPos);
      const textAfterCursor = message.substring(cursorPos);
  
      const newText = textBeforeCursor + template + textAfterCursor;
  
      setMessage(newText);
  
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = cursorPos + template.length;
        textarea.focus();
      }, 0);
    };
  
    const emojisToShow = [
      ':smile:', ':dog:', ':+1:', ':heart:', ':laughing:', ':wink:', ':cry:', ':blush:',
      ':angry:', ':confused:', ':grinning:', ':stuck_out_tongue:', ':sunglasses:',
      ':clap:', ':ok_hand:', ':joy:', ':sweat_smile:', ':muscle:', ':thinking:', ':star_struck:',
      ':flushed:', ':pensive:', ':sleeping:', ':eyes:', ':rocket:', ':fire:', ':pizza:', ':cake:',
    ];

    const isMessageInView = (element) => {
        if (!element) return false;
    
        const rect = element.getBoundingClientRect();
        const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
        
        return rect.top < viewportHeight && rect.bottom > 0;
    };
    
    
    const handleViewCheck = () => {
        if (!currentMessages || currentMessages.length === 0) return;
    
        currentMessages.forEach((mes) => {
            const messageRef = document.getElementById(`message-${mes?.id}`);
    
            if (messageRef && isMessageInView(messageRef)) {
                mes.mentions && mes.mentions.length > 0 && mes.mentions.forEach((mention) => {
                    if (mention.mention === user?.username && mention.readed === false) {    
                        socket?.emit("mentionRead", {
                            server: server?._id,
                            room: currentRoom.id,
                            channel: currentChannel.id,
                            messageId: mes?.id,
                            username: user?.username
                        });
                    }
                });
            }
        });
    };
    
    const handleScroll = () => {
        handleViewCheck();
    
        if (chatBodyRef.current && !loading && currentMessages.length < currentChannel?.messages?.length) {
            const { scrollTop, scrollHeight, clientHeight } = chatBodyRef.current;
    
            if (scrollTop === 0) {
                setLoading(true);
    
                const messagesToLoad = Math.min(
                    limit,
                    currentChannel.messages.length - currentMessages.length
                );
    
                if (messagesToLoad <= 0) {
                    setLoading(false);
                    return;
                }
    
                const previousScrollHeight = scrollHeight;
    
                setTimeout(() => {
                    if (chatBodyRef.current) {
                        const newMessages = currentChannel.messages.slice(
                            currentChannel.messages.length - currentMessages.length - messagesToLoad,
                            currentChannel.messages.length - currentMessages.length
                        );
    
                        setCurrentMessages((prevMessages) => [...newMessages, ...prevMessages]);
    
                        setTimeout(() => {
                            if (chatBodyRef.current) {
                                const newScrollHeight = chatBodyRef.current.scrollHeight;
                                const scrollOffset = newScrollHeight - previousScrollHeight;
    
                                chatBodyRef.current.scrollTop = scrollOffset;
                            }
    
                            setLoading(false);
                        }, 0); 
                    }
                }, 2500); 
            }
        }
    };
    
          
  
    const bbcodeHTML = (
      <Popover id="popover-basic">
        <Popover.Header as="h3">BBCodes</Popover.Header>
        <Popover.Body className='custom-overlay-bb'>
          <Row>
              <Col xl={6} xs={6}>
              <Button variant="primary" onClick={() => insertTemplate('**bold text**')}>
                  <i className="fa-solid fa-bold"></i> Bold
              </Button>
              </Col>
  
              <Col xl={6} xs={6}>
              <Button variant="primary" onClick={() => insertTemplate('*italic text*')}>
                  <i className="fa-solid fa-italic"></i> Italic
              </Button>
              </Col>
  
              <Col xl={6} xs={6}>
              <Button variant="primary" onClick={() => insertTemplate('[Sitename](https://www.link.com)')}>
                  <i className="fa-solid fa-link"></i> Link
              </Button>
              </Col>
  
              <Col xl={6} xs={6}>
              <Button variant="primary" onClick={() => insertTemplate('> quoted text\n\n')}>
                  <i className="fa-solid fa-quote-left"></i> Quote
              </Button>
              </Col>
  
              <Col xl={6} xs={6}>
              <Button variant="primary" onClick={() => insertTemplate('```javascript\n// Code block\nconsole.log("Hello, world!");\n```')}>
                  <i className="fa-solid fa-code"></i> Code
              </Button>
              </Col>
          </Row>
  
          <hr />
          <Popover.Header as="h3" style={{ borderRadius: '0px' }}>Emojis</Popover.Header>
          <Popover.Body>
          <Row>
              {emojisToShow.map((emoji, index) => (
                <Col xl={3} xs={4} key={index}>
                  <Button variant="outline-primary" onClick={() => insertTemplate(`${emoji}`)}>
                    <ReactMarkdown 
                      children={emoji} 
                      remarkPlugins={[remarkEmoji]} 
                      components={{
                          p: ({ children }) => <span>{children}</span>,
                      }}
                    />
                  </Button>
                </Col>
              ))}
          </Row>
          </Popover.Body>
        </Popover.Body>
      </Popover>
    );
  
    const [showMentionPopover, setShowMentionPopover] = useState(false);
    const [mentionQuery, setMentionQuery] = useState('');
    const [mentionPosition, setMentionPosition] = useState(0);

    const mentionInputRef = useRef(null);

    const focusOnInput = () => {
      if (mentionInputRef.current) {
        mentionInputRef.current.focus();
      } 
    };
    
    const handleTyping = (e) => {
      setMessage(e.target.value);
    
      setMentionPosition(e.target.selectionStart);
    
      if (e.target.value.length > 0) {
        socket?.emit('servertyping', {
          user: auth.userId,
          id: server?._id,
          channel: currentChannel?.id,
          status: true,
          message: e.target.value,
        });
      } else {
        socket?.emit('servertyping', {
          user: auth.userId,
          id: server?._id,
          channel: currentChannel?.id,
          status: false,
        });
      }
    
      const mentionMatch = e.target.value.slice(mentionPosition).match(/@(\w*)$/);
      if (mentionMatch) {
        setMentionQuery(mentionMatch[1]);
        setShowMentionPopover(true);
        
        setTimeout(() => {
            focusOnInput()
        }, 500);
      } else {
        setShowMentionPopover(false);
      }
    };
    
    const insertTemplateMention = (mention) => {
      const beforeCursor = message.slice(0, mentionPosition);
      const afterCursor = message.slice(mentionPosition);
    
      const newMessage = `${beforeCursor}${mention}${afterCursor}`;
      setMessage(newMessage);
    
      setMentionPosition(beforeCursor.length + mention.length + 2);
    
      setShowMentionPopover(false);
      setMentionQuery('');
    };
    
    const [mentionSearch, setMentionSearch] = useState('')

    const handleMentionClick = (username) => {
        insertTemplateMention(username);
        setMentionSearch('')
    };
    
    const filteredUsers = server && server.joined && server.joined.filter((username) => username !== user?.username);

    const popoverMentions = (
      <Popover id="mention-popover">
        <Popover.Body
          style={{
            maxHeight: '200px',
            overflowY: 'auto',
            padding: '1rem',
          }}
        >
        <Form.Group className="mb-3">
        <Form.Control type="text" ref={mentionInputRef} placeholder="Search users to mention" onChange={(e) => setMentionSearch(e.target.value)}/>
        </Form.Group>

          {filteredUsers && filteredUsers.length > 0 ? (
            filteredUsers
              .filter((user) => user.startsWith(mentionSearch))
              .map((user) => {
                return (
                  <React.Fragment key={`mention-${user}`}>
                    <Button
                      key={user}
                      className="w-100 my-1"
                      variant="primary"
                      onClick={() => handleMentionClick(user)}
                    >
                      {user}
                    </Button>
                  </React.Fragment>
                );
              })
          ) : (
            <p>No users found</p>
          )}
        </Popover.Body>
      </Popover>
    );
    
  
    
    const handleServerTyping = (data) => {
      setCurrentChannel((prev) => {
        const typingArray = prev?.typing || [];
        const { user, id, channel, status, message } = data;
        
        if (status) {
          const userExists = typingArray.some((item) => item.user === user);
    
          if (userExists) {
            const updatedTypingArray = typingArray.map((item) =>
              item.user === user ? { ...item, message } : item
            );
    
            return { ...prev, typing: updatedTypingArray };
          } else {
            return { ...prev, typing: [...typingArray, data] };
          }
        } else {
          const updatedTypingArray = typingArray.filter((item) => item.user !== user);
    
          return { ...prev, typing: updatedTypingArray };
        }
      });
    };

    const handleNewServerMessage = (data) => {
        setCurrentMessages((prev) => Array.isArray(prev) ? [...prev, data.message] : [data.message]);
    };
    
    const handleUpdateChannel = (data) => {
        const cid = data.id; 
        const readed = data.readed;  
        const messages = data.messages;
    
        setServer((prevServer) => {
            const updatedRooms = prevServer.rooms.map((room) => {
                if (room.channels) {
                    const updatedChannels = room.channels.map((channel) => {
                        if (channel.id === cid) {
                            return {
                                ...channel,
                                readed: readed,
                                messages: messages ? messages : channel.messages
                            };
                        }
                        return channel;
                    });
    
                    return {
                        ...room,
                        channels: updatedChannels,
                    };
                }
                return room;
            });
    
            return {
                ...prevServer,
                rooms: updatedRooms,
            };
        });
    };
    
    const handleServerStatus = async (type, server, user) => {
        try {
            await axios.post(
                'http://localhost:5000/networkserver/api/app/handleserverstatus', {
                    type, 
                    server, 
                    user,
                }, {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + auth.token, 
                    }
                }
            );
    
        } catch (err) {
            toast.error(err.response?.data?.message || 'An error occurred');
        }
  
    }

    const handleServerJoined = (data) => {
        const { user, type, userObj } = data;
        
        setServer((prev) => {
            const updatedJoined = [...prev.joined];
            
            if (type === 'leave') {
                const userIndex = updatedJoined.indexOf(user);
                if (userIndex !== -1) {
                    updatedJoined.splice(userIndex, 1); 
                    
                    setServerUsers((prev) => {
                        if (prev.some((u) => u.username === user)) {
                            return prev.filter((u) => u.username !== user);
                        }
                        return prev; 
                    });
                }
            } else if (type === 'join') {
                if (!updatedJoined.includes(user)) {
                    updatedJoined.push(user); 
        
                    setServerUsers((prev) => {
                        if (!prev.some((u) => u.username === user)) {
                            return [...prev, userObj]; 
                        }
                        return prev; 
                    });
                }
            }
            
    
            return {
                ...prev,
                joined: updatedJoined 
            };
        });
    };

    const handleNewRoomAdded = (data) => {
        setServer((prev) => ({
            ...prev,
            rooms: [...prev.rooms, data]
        }));
    }
    
    const handleNewChannel = (data) => {
        const { server, room, channel } = data;
        
        setServer(prevState => ({
            ...prevState,
            rooms: prevState.rooms.map(r =>
                r.id === room
                    ? { ...r, channels: [...r.channels, channel] } 
                    : r 
            )
        }));
    };
    
    const handleRoomUpdate = (data) => {
        const { roomId, newName } = data;
      
        setServer(prevState => {
          const updatedRooms = prevState.rooms.map(room => {
            if (room.id === roomId) {
              return { ...room, room: newName };  
            }
            return room;
          });
          
          return { ...prevState, rooms: updatedRooms };
        });
    }

    const handleRoomDeleted = (data) => {
        const { roomId } = data;

        setServer(prevState => ({
            ...prevState,
            rooms: prevState.rooms.filter(room => room.id !== roomId)
        })); 
    }

    const handleChannelDeleted = (data) => {
        const { roomId, channelId } = data;

        setServer(prevState => ({
            ...prevState,
            rooms: prevState.rooms.map(room => {
                if (room.id === roomId) {
                    return {
                        ...room,
                        channels: room.channels.filter(channel => channel.id !== channelId)
                    };
                }
                return room;
            })
        }));
    }

    const handleChannelUpdate = (data) => {
        const { roomId, channelId, name, description } = data;

        setServer(prevState => ({
            ...prevState,
            rooms: prevState.rooms.map(room => {
                if (room.id === roomId) {
                    return {
                        ...room,
                        channels: room.channels.map(channel => {
                            if (channel.id === channelId) {
                                return {
                                    ...channel,
                                    name: name,
                                    description: description
                                };
                            }
                            return channel;
                        })
                    };
                }
                return room;
            })
        }));
    }

    const handleUserJoinedServer = (data) => {
        const username = data.user; 
        setServerUsers((prev) => {
            return prev.map((user) => 
                user.username === username ? { ...user, status: 1 } : user
            );
        });
    }

    const handleUserLeavedServer = (data) => {
        const username = data.user; 
        setServerUsers((prev) => {
            return prev.map((user) => 
                user.username === username ? { ...user, status: 0 } : user
            );
        });
    }

    const handleMessageReaded = (data) => {
        const { messageId, username } = data;

        setCurrentMessages((prevMessages) => {
            return prevMessages.map((mes) => {
                if (mes.id === messageId) {
                    const updatedMentions = mes.mentions && mes.mentions.length > 0 && mes.mentions.map((mention) => {
                        if (mention.mention === username) {
                            return { ...mention, readed: true };
                        }
                        return mention;
                    });

                    return { ...mes, mentions: updatedMentions };
                }
                return mes;
            });
        });
    }

    const handleNewAdmins = (data) => {
        setAdmins(prev => [...new Set([...prev, ...data.admins])]);
    };
    
    const handleServerMessageDeleted = (data) => {
        const { id } = data;
        
        setCurrentMessages((prev) => {
            return prev.filter((m) => m.id !== id)
        })
    }

    const handleServerMessageUpdated = (data) => {
        const { id, message } = data;

        setCurrentMessages((prev) => 
            prev.map((m) => 
                m.id === id ? { ...m, message: message, edited: true } : m
            )
        );
    };

    const handleServerMenagmentUpdated = (data) => {
        const { u, t } = data;

        if(t === 'ban') {
            setBanned((prev) => {
                return [...prev, u]
            })
        } else if(t === 'mute') {
            setMutted((prev) => {
                return [...prev, u]
            })
        }
    }

    const handleServerMenagmentUpdatedDelete = (data) => {
        const { u, t } = data;

        if(t === 'ban') {
            setBanned((prev) => {
                const filter = prev.filter((us) => us !== u)
                return filter
            })
        } else if(t === 'mute') {
            setMutted((prev) => {
                const filter = prev.filter((us) => us !== u)
                return filter
            })
        }

    }

    const handlePlayNotification = (data) => {
        const { status } = data;
        if (status) playSound();
    };

    useEffect(( ) => {
      socket?.on('serverTyping', handleServerTyping);
      socket?.on('newServerMessage', handleNewServerMessage);
      socket?.on('updateChannel', handleUpdateChannel);
      socket?.on('updateServerJoined', handleServerJoined);
      socket?.on('newRoomAdded', handleNewRoomAdded);
      socket?.on('newChannelAdded', handleNewChannel);
      socket?.on('roomUpdated', handleRoomUpdate);
      socket?.on('roomDeleted', handleRoomDeleted);
      socket?.on('channelDeleted', handleChannelDeleted);
      socket?.on('channelUpdated', handleChannelUpdate);
      socket?.on('userJoinedServer', handleUserJoinedServer);
      socket?.on('userLeavedServer', handleUserLeavedServer);
      socket?.on('messageReaded', handleMessageReaded);
      socket?.on('newAdmins', handleNewAdmins);
      socket?.on('serverMessageDeleted', handleServerMessageDeleted);
      socket?.on('serverMessageUpdated', handleServerMessageUpdated);
      socket?.on('serverMenagmentUpdated', handleServerMenagmentUpdated);
      socket?.on('serverMenagmentUpdatedDelete', handleServerMenagmentUpdatedDelete);
      socket?.on('playNotification', handlePlayNotification);

      return () => {
          socket?.off('serverTyping', handleServerTyping)
          socket?.off('newServerMessage', handleNewServerMessage);
          socket?.off('updateChannel', handleUpdateChannel);
          socket?.off('updateServerJoined', handleServerJoined);
          socket?.off('newRoomAdded', handleNewRoomAdded);
          socket?.off('newChannelAdded', handleNewChannel);
          socket?.off('roomUpdated', handleRoomUpdate);
          socket?.off('roomDeleted', handleRoomDeleted);
          socket?.off('channelDelete', handleChannelDeleted);
          socket?.off('channelUpdated', handleChannelUpdate);
          socket?.off('userJoinedServer', handleUserJoinedServer);
          socket?.off('userLeavedServer', handleUserLeavedServer);
          socket?.off('messageReaded', handleMessageReaded);
          socket?.off('newAdmins', handleNewAdmins);
          socket?.off('serverMessageDeleted', handleServerMessageDeleted);
          socket?.off('serverMessageUpdated', handleServerMessageUpdated);    
          socket?.off('serverMenagmentUpdated', handleServerMenagmentUpdated);
          socket?.off('serverMenagmentUpdatedDelete', handleServerMenagmentUpdatedDelete);
          socket?.off('playNotification', handlePlayNotification);
        }
    }, [socket]);

    const [showInvites, setShowInvites] = useState(false)

    // options
    const [showAddRoom, setShowAddRoom] = useState(false);

    const handleCloseAddRoom = () => setShowAddRoom(false);
    const handleShowAddRoom = () => setShowAddRoom(true);

    const [serverRoomName, setServerRoomName] = useState('')

    const addServerRoom = async (e) => {
        e.preventDefault();

        if(!serverRoomName) {
            toast.error('Room name cant be empty!');
            return;
        }

        if (serverRoomName.length > 30) {
            toast.error('You have exceeded the maximum limit for the room title! Allowed 30 characters!');
            return;
        }

        try {
            const response = await axios.post(
                'http://localhost:5000/networkserver/api/app/addserverroom', {
                    name: serverRoomName, 
                    server: server?._id, 
                }, {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + auth.token, 
                    }
                }
            );

            if(response.data.message === 'success') {
                handleCloseAddRoom()
                setServerRoomName('')
            } 
    
        } catch (err) {
            toast.error(err.response?.data?.message || 'An error occurred');
        }
    }

    const [currentChannelRoom, setCurrentChannelRoom] = useState('')
    const [showAddChannel, setShowAddChannel] = useState(false);

    const handleCloseAddChannel = () => setShowAddChannel(false);
    const handleShowAddChannel = (id) => {
        setCurrentChannelRoom(id)
        setShowAddChannel(true);
    }

    const [channelName, setChannelName] = useState('')
    const [channelDescription, setChannelDescription] = useState('')

    const handleAddNewChannel = async (e) => {
        e.preventDefault();

        if(!channelName || !channelDescription) {
            toast.error('All fields are required!');
            return;
        }

        if (channelName.length > 30) {
            toast.error('You have exceeded the maximum limit for the channel title! Allowed 30 characters!');
            return;
        }

        if (channelDescription.length > 150) {
            toast.error('You have exceeded the maximum limit for the channel description! Allowed 30 characters!');
            return;
        }        

        try {
            const response = await axios.post(
                'http://localhost:5000/networkserver/api/app/addserverchannel', {
                    server: server?._id, 
                    room: currentChannelRoom,
                    name: channelName, 
                    description: channelDescription
                }, {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + auth.token, 
                    }
                }
            );

            if(response.data.message === 'success') {
                setCurrentChannelRoom()
                setChannelName('')
                setChannelDescription('')
                handleCloseAddChannel()
            } 
    
        } catch (err) {
            toast.error(err.response?.data?.message || 'An error occurred');
        }
    }

    const [currentEditRoom, setCurrentEditRoom] = useState(null)
    const [showEditRoom, setShowEditRoom] = useState(false);
    const [editRoomName, setEditRoomName] = useState('')

    const handleCloseEditRoom = () => setShowEditRoom(false);
    const handleShowEditRoom = (data) => {
        setCurrentEditRoom(data)
        setEditRoomName(data.room)
        setShowEditRoom(true);
    }

    const editServerRoom = async (e) => {
        e.preventDefault();

        if(!currentEditRoom || !editRoomName) {
            toast.error('Data invalid!');
            return;
        }

        if (editRoomName.length > 30) {
            toast.error('You have exceeded the maximum limit for the room title! Allowed 30 characters!');
            return;
        }

        try {
            const response = await axios.post(
                'http://localhost:5000/networkserver/api/app/updateserverroom', {
                    server: server?._id, 
                    room: currentEditRoom.id,
                    name: editRoomName, 
                }, {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + auth.token, 
                    }
                }
            );

            if(response.data.message === 'success') {
                setCurrentEditRoom(null)
                setEditRoomName('')

                handleCloseEditRoom()
            } 
    
        } catch (err) {
            toast.error(err.response?.data?.message || 'An error occurred');
        }

    }

    const handleShowDeleteRoom = async (id) => {
        if (window.confirm('This will delete the room and all its channels. Are you sure?')) {
            try {
                const response = await axios.post(
                    'http://localhost:5000/networkserver/api/app/deleteserverroom',
                    {
                        server: server?._id,
                        room: id
                    },
                    {
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': 'Bearer ' + auth.token
                        }
                    }
                );
    
                if (response.data.message === 'success') {
                    toast.success('Room deleted successfully');
                }
            } catch (err) {
                toast.error(err.response?.data?.message || 'An error occurred');
            }
        }
    }
    
    const [currentEditChannelRoom, setCurrentEditChannelRoom] = useState('')
    const [currentEditChannel, setCurrentEditChannel] = useState(null)
    const [showEditChannel, setShowEditChannel] = useState(false);
    const [editChannelName, setEditChannelName] = useState('')
    const [editChannelDescription, setEditChannelDescription] = useState('')

    const handleCloseEditChannel = () => setShowEditChannel(false);
    const handleShowEditChannel = (room, channel) => {
        setCurrentEditChannelRoom(room)
        setCurrentEditChannel(channel)
        setEditChannelName(channel.name)
        setEditChannelDescription(channel.description)
        setShowEditChannel(true);
    }

    const editServerChannel = async (e) => {
        e.preventDefault();

        if(!currentEditChannelRoom || !currentEditChannel || !editChannelName || !editChannelDescription) {
            toast.error('Data invalid!');
            return;
        }

        try {
            const response = await axios.post(
                'http://localhost:5000/networkserver/api/app/updateroomchannel', {
                    server: server?._id, 
                    room: currentEditChannelRoom,
                    channel: currentEditChannel.id,
                    name: editChannelName,  
                    description: editChannelDescription
                }, {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + auth.token, 
                    }
                }
            );

            if(response.data.message === 'success') {
                setCurrentEditChannelRoom('')
                setCurrentEditChannel(null)
                setEditChannelName('')
                setEditChannelDescription('')

                handleCloseEditChannel()
            } 
    
        } catch (err) {
            toast.error(err.response?.data?.message || 'An error occurred');
        }

    }

    const handleShowDeleteChannel = async (room, channel) => {
        if (window.confirm('This will delete channel. Are you sure?')) {
            try {
                const response = await axios.post(
                    'http://localhost:5000/networkserver/api/app/deleteroomchannel',
                    {
                        server: server?._id,
                        room: room,
                        channel: channel
                    },
                    {
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': 'Bearer ' + auth.token
                        }
                    }
                );
    
                if (response.data.message === 'success') {
                    toast.success('Channel deleted successfully');
                }
            } catch (err) {
                toast.error(err.response?.data?.message || 'An error occurred');
            }
        }

    }

    const handleShowRightSidebar = () => {
        setShowRightSidebar(!showRightSidebar)
    }

    const serverUsersOnline = serverUsers && serverUsers.filter((u) => u.status === 1);
    const serverUsersOffline = serverUsers && serverUsers.filter((u) => u.status === 0)

    const searchOptions = [
        {
            value: 'from:',
            label: 'from:',
            type: 'fromuser'
        },
        {
            value: 'mentions:',
            label: 'mentions:',
            type: 'mentionsuser'
        },
        {
            value: 'before:',
            label: 'before:',
            type: 'beforedate'
        },
        {
            value: 'during:',
            label: 'during:',
            type: 'duringdate'
        },
        {
            value: 'after:',
            label: 'after:',
            type: 'afteredate'
        },
    ]


    const formatSearchUsers = serverUsers && serverUsers.map((u) => ({
        value: u.username,
        label: u.username,
    }));
      
    const formatAdmins = admins && server ? 
    [...new Set([...admins, ...server.joined])] 
    .filter(val => !admins.includes(val) && val !== user?.username)  
    .map(u => ({ value: u, label: u })) 
    : [];


        
    const [searchItems, setSearchItems] = useState([]);
    const [latestSearchItem, setLatestSearchItem] = useState(null);
    
    const filteredOptions = searchOptions.filter(option => 
        !searchItems.some(item => item.type === option.type)
    );

    const handleSidebarSearch = (value, action) => {    
        if (action.action === 'remove-value') {
            const removedItemType = action.removedValue.type;
    
            setSearchItems((prev) => prev.filter(item => item.type !== removedItemType));
            setLatestSearchItem(null);  
        } else {
            const last = value[value.length - 1]; 
    
            setSearchItems(value);  
            setLatestSearchItem(last); 
        }
    };
    
    
    const handleSearchSelect = (value) => {           
        if (!latestSearchItem || !latestSearchItem.type) {
            return;
        }

        setSearchItems((prev) => {    
            const updatedItems = prev.map((item) => {
                if (item.type === latestSearchItem.type) {    
                    const updatedValue = item.value ? `${item.value} ${value.value}` : value.value;
                    const updatedLabel = item.label ? `${item.label} ${value.label}` : value.label;
    
                    return {
                        ...item,
                        value: updatedValue,  
                        label: updatedLabel,  
                    };
                }
    
                return item;
            });
        
            return updatedItems; 
        });

        setLatestSearchItem(null)
    };

    const handleDateChange = (date) => {
        const formattedDate = date.toLocaleDateString('en-CA'); 
    
        if (!latestSearchItem || !latestSearchItem.type) {
            return;
        }
    
        setSearchItems((prev) => {    
            const updatedItems = prev.map((item) => {
                if (item.type === latestSearchItem.type) {    
                    const updatedValue = item.value ? `${item.value} ${formattedDate}` : formattedDate;
                    const updatedLabel = item.label ? `${item.label} ${formattedDate}` : formattedDate;
    
                    return {
                        ...item,
                        value: updatedValue,  
                        label: updatedLabel,  
                    };
                }
    
                return item;
            });
        
            return updatedItems; 
        });
    
        setLatestSearchItem(null); 
    };

    const [searchResults, setSearchResults] = useState([]); 
    const [currentPage, setCurrentPage] = useState(1);
    const messages = currentChannel?.messages;    
    const messagesPerPage = 10; 
    
    const applyFilters = () => {
      if(searchItems && searchItems.length === 0) {
        setSearchResults([])
        return;
      }

      let filteredMessages = messages;
    
      searchItems.forEach((item) => {
        if (item.type === 'fromuser') {
            filteredMessages = filteredMessages.filter((message) => message.author === item.value.split(":")[1].trim());
          }
          
          if (item.type === 'mentionsuser') {
            filteredMessages = filteredMessages.filter((message) => message.message.includes(`@${item.value.split(":")[1].trim()}`));
          }
          
          if (item.type === 'beforedate') {
            const beforeDate = new Date(item.value.split(":")[1].trim()).getTime();
            filteredMessages = filteredMessages.filter((message) => message.time < beforeDate);
          }
          
          if (item.type === 'duringdate') {
            const duringDate = new Date(item.value.split(":")[1].trim());
            const startOfDay = new Date(duringDate.setHours(0, 0, 0, 0)).getTime();
            const endOfDay = new Date(duringDate.setHours(23, 59, 59, 999)).getTime();
            
            filteredMessages = filteredMessages.filter((message) => message.time >= startOfDay && message.time <= endOfDay);
          }
          
          if (item.type === 'afterdate') {
            const afterDate = new Date(item.value.split(":")[1].trim()).getTime();
            filteredMessages = filteredMessages.filter((message) => message.time > afterDate);
          }
          
      });
    
      setSearchResults(filteredMessages);
      setCurrentPage(1); 
    };
    
    const paginate = (pageNumber) => {
      setCurrentPage(pageNumber);
    };
    
    const indexOfLastMessage = currentPage * messagesPerPage;
    const indexOfFirstMessage = indexOfLastMessage - messagesPerPage;
    const actualMessages = searchResults && searchResults.length > 0 ? searchResults.slice(indexOfFirstMessage, indexOfLastMessage) : [];
    
    const paginateButtons = [];
    const totalPages = searchResults && searchResults.length > 0 && Math.ceil(searchResults.length / messagesPerPage);

    for (let i = 1; i <= totalPages; i++) {
        paginateButtons.push(
            <button key={i} className={currentPage === i && 'active-page-pag'} onClick={() => paginate(i)}>{i}</button>
        );
    }

    const handleSearchServer = () => {
        applyFilters();
    };

    // admins
    const [adminsData, setAdminsData] = useState([])
    const [showPanel, setShowPanel] = useState(false);

    const handleClosePanel = () => setShowPanel(false);
    const handleShowPanel = () => setShowPanel(true);

    const handleAdminsChange = (value) => {
        setAdminsData(value)
    }

    const handleAddAdmins  = async (e) => {
        e.preventDefault()

        try {
            const response = await axios.post(
                'http://localhost:5000/networkserver/api/app/addadmins',
                {
                    server: server?._id,
                    admins: adminsData,
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + auth.token
                    }
                }
            );

            if (response.data.message === 'success') {
                toast.success('Admin added!');
                setAdminsData([])
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'An error occurred');
        }
    }

    const handleDeleteAdmin = async (admin) => {

        try {
            const response = await axios.post(
                'http://localhost:5000/networkserver/api/app/deleteadmin',
                {
                    server: server?._id,
                    admin: admin,
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + auth.token
                    }
                }
            );

            if (response.data.message === 'success') {
                toast.success('Admin deleted!');
                setAdmins((prev) => {
                    return prev.filter((i) => i !== admin);  
                });
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'An error occurred');
        }
    }


    const deleteServerMessage = async (id) => {
        try {
            await axios.post(
                'http://localhost:5000/networkserver/api/app/deleteservermessage',
                {
                    server: server?._id,
                    room: currentRoom?.id,
                    channel: currentChannel?.id,
                    id: id
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + auth.token, 
                    }
                }
            );
    
        } catch (err) {
            toast.error(err.response?.data?.message || 'An error occurred');
        }
    }

    const [editMessageId, setEditMessageId] = useState('')
    const [editMessage, setEditMessage] = useState('')

    const handleEditMessage = (id, value) => {
      setEditMessageId(id)
      setEditMessage(value)
    }
  
    const handleSubmitEditMessage = async (e) => {
      e.preventDefault()
  
      try {
          const response = await axios.post(
              'http://localhost:5000/networkserver/api/app/updateservermessage',
              {
                  server: server?._id,
                  room: currentRoom?.id,
                  channel: currentChannel?.id,
                  id: editMessageId,
                  message: editMessage
              },
              {
                  headers: {
                      'Content-Type': 'application/json',
                      'Authorization': 'Bearer ' + auth.token, 
                  }
              }
          );
  
          if(response.data.message === 'success') {
              setEditMessageId('')
              setEditMessage('')
          }
  
      } catch (err) {
          toast.error(err.response?.data?.message || 'An error occurred');
      }
  
    }

    const handleServerUserMenagment = async (u, t) => {
        try {
            const response = await axios.post(
                'http://localhost:5000/networkserver/api/app/updateservermenagment',
                {
                    server: server?._id,
                    u: u,
                    t: t,
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + auth.token, 
                    }
                }
            );

            if(response.data.message === 'success') {
                toast.success('Updated!');
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'An error occurred');
        }
    }

    const handleServerUserMenagmentDelete = async (u, t) => {
        try {
            const response = await axios.post(
                'http://localhost:5000/networkserver/api/app/updateservermenagmentdelete',
                {
                    server: server?._id,
                    u: u,
                    t: t,
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + auth.token, 
                    }
                }
            );

            if(response.data.message === 'success') {
                toast.success('Updated!');
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'An error occurred');
        }

    }

    return (
        <>
        <Container fluid>
        <Row className="h-100">

            <Col xs={2} sm={2} md={1} className="dashboard-main-block-servers border-end p-0">
            <div className="border-0 h-100">             
                    <div className='servers-list'>
                        <Link to='/'>
                            <center>
                                <Button variant='primary' className='no-style-button servers-icon my-4'><img src={homeIcon} width='35' height='35' /></Button>
                            </center>
                        </Link>

                        <div className='overflow-auto vh-80'>
                        <Servers username={user?.username} />
                        </div>
                    </div>
            </div>
            </Col>

            {banned && banned.includes(user?.username) ? (
                <>
                            <Col
                            xs={10} 
                            sm={10} 
                            md={9}
                            className={`dashboard-main-block-left border-end p-0 
                                ${(!currentChannel && !showRightSidebar) ? '' : 'd-none d-sm-block'}`}
                            >
                                <div className='banned-header'>
                                <h1><i className="fa-solid fa-user-slash"></i></h1>
                                <h2>You are banned from this server</h2>
                                </div>
                            </Col>
                </>
            ) : (
                <>
                <Col
                xs={(!currentChannel && !showRightSidebar) ? 10 : 0} 
                sm={(!currentChannel && !showRightSidebar) ? 10 : 0} 
                md={3}
                className={`dashboard-main-block-left border-end p-0 
                    ${(!currentChannel && !showRightSidebar) ? '' : 'd-none d-sm-block'}`}
                >

                <div className='server-options-onmobile'>
                {server && server.joined.includes(user?.username) ? (
                    <>
                    <p>You are member of this community.</p>
                    <Button variant="danger" className='m-1' onClick={() => handleServerStatus('leave', server?._id, user?.username)}>Leave server</Button>
                    </>
                ) : (
                    <>
                    <p>You are viewing in preview mode.</p>
                    <Button variant="success" className='m-1' onClick={() => handleServerStatus('join', server?._id, user?.username)}>Join server</Button>
                    </>
                )}

                </div>

                <div className="border-0 h-100">             
                    <div className='overflow-auto vh-100'>
                        <div className='server-info-view position-relative'>
                        {serverLoading && <Skeleton type='list' />}

                        {!serverLoading && server && (
                            <>
                                {(server.author === user?.username || admins?.includes(user?.username)) && (
                                <>
                                <Modal show={showPanel} onHide={handleClosePanel} data-bs-theme={formatStyle}>
                                    <Modal.Header closeButton>
                                    <Modal.Title>Panel</Modal.Title>
                                    </Modal.Header>
                                    <Modal.Body>
                                        <Tabs
                                        defaultActiveKey="admins"
                                        id="uncontrolled-tab-panel"
                                        className="mb-3"
                                        >
                                            <Tab eventKey="admins" title="Admins">

                                                <div className='p-2'>
                                                <Form onSubmit={handleAddAdmins} className='mb-3'>
                                                    <Select 
                                                    options={formatAdmins} 
                                                    onChange={handleAdminsChange}
                                                    styles={customStyles}  
                                                    placeholder="Select users to set admin"
                                                    isMulti   
                                                    className='mb-3'
                                                    value={adminsData}
                                                    />

                                                    <Button variant='success' type='submit'>Save</Button>
                                                </Form>

                                                {admins && admins.length > 0 ? (
                                                    <>
                                                    {admins.map((a, index) => {
                                                        return (
                                                            <React.Fragment key={`a-${index}`}>
                                                                <Card>
                                                                    <Card.Body>
                                                                        <Button variant='danger' onClick={() => handleDeleteAdmin(a)} size='sm' className='admin-delete-server'>DELETE</Button>
                                                                        &nbsp; {a}
                                                                    </Card.Body>
                                                                </Card>
                                                            </React.Fragment>
                                                        )
                                                    })}
                                                    </>
                                                ) : (
                                                    <p>No data!</p>
                                                )}
                                                </div>

                                            </Tab>
                                            <Tab eventKey="banned" title="Banned">
                                                <div className='p-2'>
                                                {banned && banned.length > 0 ? (
                                                    <>
                                                    {banned.map((b, index) => {
                                                        return (
                                                            <React.Fragment key={`b-${index}`}>
                                                                <Card>
                                                                    <Card.Body>
                                                                        <Button variant='danger' size='sm' onClick={() => handleServerUserMenagmentDelete(b, 'ban')} className='admin-delete-server'>DELETE</Button>
                                                                        &nbsp; {b}
                                                                    </Card.Body>
                                                                </Card>
                                                            </React.Fragment>
                                                        )
                                                    })}
                                                    </>
                                                ) : (
                                                    <p>No data!</p>
                                                )}
                                                </div>
                                            </Tab>
                                            <Tab eventKey="muted" title="Muted">
                                            <div className='p-2'>
                                                {mutted && mutted.length > 0 ? (
                                                    <>
                                                    {mutted.map((m, index) => {
                                                        return (
                                                            <React.Fragment key={`m-${index}`}>
                                                                <Card>
                                                                    <Card.Body>
                                                                        <Button variant='danger' size='sm' onClick={() => handleServerUserMenagmentDelete(m, 'mute')} className='admin-delete-server'>DELETE</Button>
                                                                        &nbsp; {m}
                                                                    </Card.Body>
                                                                </Card>
                                                            </React.Fragment>
                                                        )
                                                    })}
                                                    </>
                                                ) : (
                                                    <p>No data!</p>
                                                )}
                                                </div>
                                            </Tab>
                                        </Tabs>
                                    </Modal.Body>
                                    <Modal.Footer>
                                    <Button variant="secondary" onClick={handleClosePanel}>
                                        Close
                                    </Button>
                                    </Modal.Footer>
                                </Modal>

                                <Modal show={showAddChannel} onHide={handleCloseAddChannel} data-bs-theme={formatStyle}>
                                    <Modal.Header closeButton>
                                    <Modal.Title>Add Channel</Modal.Title>
                                    </Modal.Header>
                                    <Modal.Body>
                                        <Form onSubmit={handleAddNewChannel}>
                                        <Form.Group controlId='channel-title' className='form-group-limit mb-3'>
                                            {channelName.length > 30 ? <Badge bg="danger" className='input-badge'>{channelName.length}</Badge> : <Badge bg="secondary" className='input-badge'>{channelName.length}</Badge>}

                                            <Form.Label>Channel name</Form.Label>
                                            <FormControl
                                                placeholder="Channel name"
                                                as="input"
                                                className="br-custom-0"
                                                value={channelName}
                                                onChange={(e) => setChannelName(e.target.value)}
                                            />
                                        </Form.Group>
                                        <Form.Group controlId='channel-description' className='form-group-limit mb-3'>
                                            {channelDescription.length > 150 ? <Badge bg="danger" className='input-badge'>{channelDescription.length}</Badge> : <Badge bg="secondary" className='input-badge'>{channelDescription.length}</Badge>}

                                            <Form.Label>Channel description</Form.Label>
                                            <FormControl
                                                placeholder="Channel description"
                                                as="textarea"
                                                rows={2}
                                                className="br-custom-0"
                                                value={channelDescription}
                                                onChange={(e) => setChannelDescription(e.target.value)}
                                            />
                                        </Form.Group>

                                        <Button variant='success' type='submit'>Add</Button>
                                        </Form>
                                    </Modal.Body>
                                    <Modal.Footer>
                                    <Button variant="secondary" onClick={handleCloseAddChannel}>
                                        Close
                                    </Button>
                                    </Modal.Footer>
                                </Modal>

                                <Modal show={showEditRoom} onHide={handleCloseEditRoom} data-bs-theme={formatStyle}>
                                    <Modal.Header closeButton>
                                    <Modal.Title>Edit Room</Modal.Title>
                                    </Modal.Header>
                                    <Modal.Body>
                                        <Form onSubmit={editServerRoom}>
                                        <Form.Group controlId='server-room-modal' className='form-group-limit mb-3'>
                                            <Form.Label>Room name</Form.Label>
                                            {editRoomName.length > 30 ? <Badge bg="danger" className='input-badge'>{editRoomName.length}</Badge> : <Badge bg="secondary" className='input-badge'>{editRoomName.length}</Badge>}

                                            <FormControl
                                                placeholder="Server room name"
                                                as="input"
                                                className="br-custom-0"
                                                value={editRoomName}
                                                onChange={(e) => setEditRoomName(e.target.value)}
                                            />
                                        </Form.Group>

                                        <Button variant='success' type='submit'>Save</Button>
                                        </Form>
                                    </Modal.Body>
                                    <Modal.Footer>
                                    <Button variant="secondary" onClick={handleCloseEditRoom}>
                                        Close
                                    </Button>
                                    </Modal.Footer>
                                </Modal>

                                <Modal show={showEditChannel} onHide={handleCloseEditChannel} data-bs-theme={formatStyle}>
                                    <Modal.Header closeButton>
                                    <Modal.Title>Edit Channel</Modal.Title>
                                    </Modal.Header>
                                    <Modal.Body>
                                        <Form onSubmit={editServerChannel}>
                                        <Form.Group controlId='server-room-modal' className='form-group-limit mb-3'>
                                            {editChannelName.length > 30 ? <Badge bg="danger" className='input-badge'>{editChannelName.length}</Badge> : <Badge bg="secondary" className='input-badge'>{editChannelName.length}</Badge>}

                                            <Form.Label>Channel name</Form.Label>
                                            <FormControl
                                                placeholder="Channel name"
                                                as="input"
                                                className="br-custom-0"
                                                value={editChannelName}
                                                onChange={(e) => setEditChannelName(e.target.value)}
                                            />
                                        </Form.Group>
                                        <Form.Group controlId='channel-description' className='form-group-limit mb-3'>
                                            {editChannelDescription.length > 150 ? <Badge bg="danger" className='input-badge'>{editChannelDescription.length}</Badge> : <Badge bg="secondary" className='input-badge'>{editChannelDescription.length}</Badge>}

                                            <Form.Label>Channel description</Form.Label>
                                            <FormControl
                                                placeholder="Channel description"
                                                as="textarea"
                                                rows={2}
                                                className="br-custom-0"
                                                value={editChannelDescription}
                                                onChange={(e) => setEditChannelDescription(e.target.value)}
                                            />
                                        </Form.Group>

                                        <Button variant='success' type='submit'>Save</Button>
                                        </Form>
                                    </Modal.Body>
                                    <Modal.Footer>
                                    <Button variant="secondary" onClick={handleCloseEditChannel}>
                                        Close
                                    </Button>
                                    </Modal.Footer>
                                </Modal>
                                </>
                                )}

                                <div className='server-info-view-image'>
                                        <img 
                                        src={`http://localhost:5000/networkserver/${server.image}`} 
                                        alt={`${server.title}`} 
                                        className="img-fluid" 
                                        />
                                </div>

                                <div className='server-info-view-details'>
                                    <h3>{server.title} &nbsp;
                                        <i className="fa-solid fa-arrow-up-right-from-square" style={{ cursor: 'pointer' }} onClick={() => {
                                            navigator.clipboard.writeText(`http://localhost:3000/register?server=${server?._id}`)
                                            toast.success('Link copied!');
                                        }}></i>
                                    </h3>
                                    <small>{server.description.length > 25
                                                ? server.description.slice(0, 25) + '...'
                                                : server.description}</small>
                                </div>
                                
                                <hr />

                                <div className="chat-channel-container">
                                {server.rooms && server.rooms.length > 0 && (
                                    <>
                                    {(server.author === user?.username || admins?.includes(user?.username)) && (
                                        <>
                                        <Modal show={showAddRoom} onHide={handleCloseAddRoom} data-bs-theme={formatStyle}>
                                            <Modal.Header closeButton>
                                            <Modal.Title>Add Room</Modal.Title>
                                            </Modal.Header>
                                            <Modal.Body>
                                                <Form onSubmit={addServerRoom}>
                                                <Form.Group controlId='server-room-modal' className='form-group-limit mb-3'>
                                                    {serverRoomName.length > 30 ? <Badge bg="danger" className='input-badge'>{serverRoomName.length}</Badge> : <Badge bg="secondary" className='input-badge'>{serverRoomName.length}</Badge>}

                                                    <Form.Label>Room name</Form.Label>
                                                    <FormControl
                                                        placeholder="Server room name"
                                                        as="input"
                                                        className="br-custom-0"
                                                        value={serverRoomName}
                                                        onChange={(e) => setServerRoomName(e.target.value)}
                                                    />
                                                </Form.Group>

                                                <Button variant='success' type='submit'>Add</Button>
                                                </Form>
                                            </Modal.Body>
                                            <Modal.Footer>
                                            <Button variant="secondary" onClick={handleCloseAddRoom}>
                                                Close
                                            </Button>
                                            </Modal.Footer>
                                        </Modal>


                                        <Button variant='success' size='sm' className='w-50 rounded' onClick={handleShowAddRoom}>Add Room</Button>
                                        <Button variant='success' size='sm' className='w-50 rounded' onClick={handleShowPanel}>Panel</Button>
                                        </>
                                    )}
                                    {server.rooms.map((room, roomIndex) => {
                                        return (
                                        <React.Fragment key={`room-${roomIndex}`}>
                                            <div className='server-content'>
                                                {(server.author === user?.username || admins?.includes(user?.username)) && (
                                                    <>
                                                    <div className='server-author-options'>
                                                    <Button variant='danger' size='sm' onClick={() => handleShowDeleteRoom(room)}><i className="fa-solid fa-minus"></i></Button>
                                                    <Button variant='warning' size='sm' onClick={() => handleShowEditRoom(room)}><i className="fa-solid fa-cog"></i></Button>
                                                    <Button variant='success' size='sm' onClick={() => handleShowAddChannel(room.id)}><i className="fa-solid fa-plus"></i></Button>
                                                    </div>
                                                    </>
                                                )}
                                                <button
                                                className="room-toggle-button"
                                                aria-expanded="true"
                                                onClick={() => {
                                                    const content = document.getElementById(`room-${roomIndex}`);
                                                    content.classList.toggle('collapsed');
                                                }}
                                                >
                                                {room.room}
                                                <span className='room-channel-badge'>{room.channels ? room.channels.length : ''}</span>
                                                </button>

                                                {/* Collapse Content */}
                                                <div
                                                id={`room-${roomIndex}`}
                                                className="room-content"
                                                >
                                                {room.channels && room.channels.length > 0 && (
                                                    <>
                                                    {room.channels.map((channel, channelIndex) => {
                                                        const checkIfUnread = server?.joined.includes(user?.username) && channel.readed && !channel.readed.includes(user?.username)
                                                        return (
                                                        <React.Fragment key={`channel-${channelIndex}`}>
                                                            {(server.author === user?.username || admins?.includes(user?.username)) && (
                                                                <>
                                                                <div className='server-author-options'>
                                                                <Button variant='danger' size='sm' onClick={() => handleShowDeleteChannel(room.id, channel.id)}><i className="fa-solid fa-minus"></i></Button>
                                                                <Button variant='warning' size='sm' onClick={() => handleShowEditChannel(room.id, channel)}><i className="fa-solid fa-cog"></i></Button>
                                                                </div>
                                                                </>
                                                            )}

                                                            <div className={`room-channel-view ${checkIfUnread ? 'channel-unread' : ''} ${currentChannel && currentChannel.id === channel.id ? 'active-chann' : ''}`} onClick={() => openChannel(room, channel)}>
                                                                {checkIfUnread && <div className='channel-unread-badge'>1</div>}
                                                                # {channel.name}
                                                            </div>
                                                        </React.Fragment>
                                                        );
                                                    })}
                                                    </>
                                                )}
                                                </div>

                                            </div>
                                        </React.Fragment>
                                        );
                                    })}
                                    </>
                                )}
                                </div>


                            </>
                        )}
                    </div>
                </div>
            </div>
            </Col>

            <Col
            xs={currentChannel && !showRightSidebar ? 10 : 0} 
            sm={(currentChannel && !showRightSidebar) ? 10 : 0} 
            md={showRightSidebar ? 6 : 8}
            className={`dashboard-main-block-right border-end p-0
                ${currentChannel && !showRightSidebar ? '' : 'd-none d-sm-block dashboard-main-block overflow-auto'}`}
            >
                <div className="border-0 h-100">
                    <div className="d-flex flex-column h-100">
                    <div className="flex-grow-1 overflow-auto px-4">
                            {!currentChannel && server ? (
                                <>
                                <div className="server-intro">
                                        <div className='server-intro-image'>
                                        <Image
                                            src={`http://localhost:5000/networkserver/${server?.image}`}
                                            className='img-fluid'
                                            style={{
                                            maxHeight: '200px',
                                            }}
                                            alt={`${server?.title}`}
                                        />
                                        </div>
                                        <h1>{server?.title}</h1>
                                        <p>{server?.description}</p>
                                        <small>Total members: <b>{server?.joined?.length}</b></small> <br />

                                            {server && server.joined.includes(user?.username) ? (
                                                <>
                                                <Button variant="danger" className='m-1' onClick={() => handleServerStatus('leave', server?._id, user?.username)}>Leave server</Button>
                                                </>
                                            ) : (
                                                <>
                                                <Button variant="success" className='m-1' onClick={() => handleServerStatus('join', server?._id, user?.username)}>Join server</Button>
                                                </>
                                            )}

                                            <Button variant="secondary" className='m-1' onClick={() => setShowInvites(true)}>Invite Friends</Button>

                                            <InviteFriendsServer id={server?._id} show={showInvites} onClose={() => setShowInvites(false)} />
                                </div>
                                </>
                            ) : (
                                <>
                                {channelLoading && <Skeleton type='list' />}

                                {currentChannel && server && !channelLoading && (
                                        <>
                                        <Button variant='primary' className='arrow-for-back no-style-button' onClick={() => {
                                            setCurrentChannel(null)
                                            setShowRightSidebar(false)
                                        }}><i className="fa-solid fa-arrow-left"></i></Button>
                                        
                                        <div className='display-channel-info'>
                                            <div className='display-channel-info-title'>
                                            <div className='display-channel-info-btns no-style-button'>
                                                <Button variant='primary' className='mb-3 float-end' onClick={() => handleShowRightSidebar()}>
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                                                        <path d="M15 4.00098H5V18.001C5 18.5314 5.21071 19.0401 5.58579 19.4152C5.96086 19.7903 6.46957 20.001 7 20.001H15M16 15.001L19 12.001M19 12.001L16 9.00098M19 12.001H9" stroke="#196FF7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                                                    </svg>
                                                </Button>
                                            </div>
                                            <h3># {currentChannel.name}</h3>
                                            <p>{server.joined.length} members &nbsp; &nbsp;
                                                <span>
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="4" height="4" viewBox="0 0 4 4" fill="none">
                                                    <circle cx="1.77111" cy="1.94249" r="1.62072" fill="#37C63B"/>
                                                    </svg> {serverUsersOnline.length} Online
                                                </span>
                                            </p>
                                            </div>

                                            {currentMessages && currentMessages.length > 0 && (
                                                <>
                                                <div class="overflow-auto messages-height" ref={chatBodyRef} onScroll={handleScroll}>
                                                <center>{loading && <LoadingSpinner asOverlay={false} />}</center>

                                                {currentMessages.map((mes, index) => {
                                                    const sanitizedMessage = DOMPurify.sanitize(mes.message);
                                                    const isHighlightedBg = mes.mentions && mes.mentions.length > 0 && mes.mentions.some(
                                                        (mention) => mention.mention === user?.username
                                                    );
                                                    const isHighlighted = mes.mentions && mes.mentions.length > 0 && mes.mentions.some(
                                                        (mention) => mention.mention === user?.username && mention.readed === false
                                                    );

                                                    const isOwnerDisabled = server?.author === mes.author;

                                                    return (
                                                        <React.Fragment key={`mes-${index}`}>
                                                            {isHighlighted && <p className='mention-new-message'>NEW MESSAGE</p>}
                                                            <div
                                                                key={`mes-${index}`}
                                                                id={`message-${mes?.id}`}
                                                                className={`message-container ${isHighlightedBg ? "highlight-mention" : ""}`}
                                                            >
                                                            {mes.author === user?.username ? (
                                                                <>
                                                                <div className="d-flex flex-column mb-2 justify-content-end">
                                                                    <div className='parent-of-message-view'>
                                                                        <div className='message-user-image'>

                                                                            {(server?.author === user?.username || admins?.includes(user?.username)) && (
                                                                                <>
                                                                                {!isOwnerDisabled && (
                                                                                    <>
                                                                                    <div className='message-user-options'>
                                                                                    <Dropdown data-bs-theme={formatStyle}>
                                                                                    <Dropdown.Toggle variant="secondary" id="dropdown-user-options">
                                                                                    <i className="fa-solid fa-chevron-down"></i>
                                                                                    </Dropdown.Toggle>

                                                                                    <Dropdown.Menu>
                                                                                        <Dropdown.Item href="#" onClick={() => deleteServerMessage(mes.id)}>Delete</Dropdown.Item>
                                                                                        <Dropdown.Divider />
                                                                                        <Dropdown.Item href="#" onClick={() => handleServerUserMenagment(mes.author, 'ban')}>Ban</Dropdown.Item>
                                                                                        <Dropdown.Item href="#" onClick={() => handleServerUserMenagment(mes.author, 'kick')}>Kick</Dropdown.Item>
                                                                                        <Dropdown.Item href="#" onClick={() => handleServerUserMenagment(mes.author, 'mute')}>Mute</Dropdown.Item>
                                                                                    </Dropdown.Menu>
                                                                                    </Dropdown>
                                                                                    </div>
                                                                                    </>
                                                                                )}
                                                                                </>
                                                                            )}

                                                                            <Link to={`/user/${mes.author}`}>
                                                                            {mes.image ? (
                                                                                <>
                                                                                <img src={`http://localhost:5000/networkserver/${mes.image}`} className='img-fluid' />
                                                                                </>
                                                                            ) : (
                                                                                <>
                                                                                <img src={noavatarImage} className='img-fluid' />
                                                                                </>
                                                                            )}
                                                                            </Link>
                                                                        </div>

                                                                        <div className='bg-primary text-white message-from-you'>
                                                                        {editMessageId === mes.id ? (
                                                                        <>
                                                                            <Form onSubmit={handleSubmitEditMessage} className='edit-form-message'>
                                                                            <FormControl
                                                                                placeholder="Type a message..."
                                                                                as="textarea"
                                                                                rows={2}
                                                                                className="br-custom-0 mb-1"
                                                                                onChange={(e) => setEditMessage(e.target.value)}
                                                                                value={editMessage}
                                                                                style={{ height: '40px' }}
                                                                            />
                                                                            <Button variant='success' size='sm' type='submit'><i className="fa-solid fa-check"></i></Button>
                                                                            <Button variant='danger' size='sm' onClick={() => {
                                                                                setEditMessage('')
                                                                                setEditMessageId('')
                                                                            }}><i className="fa-solid fa-xmark"></i></Button>
                                                                            </Form>
                                                                            </>
                                                                        ) : (
                                                                            <>
                                                                            <div className='message-user-options'>
                                                                            <Dropdown data-bs-theme={formatStyle}>
                                                                            <Dropdown.Toggle variant="secondary" id="dropdown-user-options">
                                                                            <i className="fa-solid fa-chevron-down"></i>
                                                                            </Dropdown.Toggle>

                                                                            <Dropdown.Menu>
                                                                                <Dropdown.Item href="#" onClick={() => handleEditMessage(mes.id, mes.message)}>Edit</Dropdown.Item>
                                                                                <Dropdown.Item href="#" onClick={() => deleteServerMessage(mes.id)}>Delete</Dropdown.Item>
                                                                            </Dropdown.Menu>
                                                                            </Dropdown>
                                                                            </div>

                                                                            <ReactMarkdown 
                                                                                children={sanitizedMessage}
                                                                                remarkPlugins={[remarkEmoji]}  
                                                                                components={{
                                                                                    p: ({ children }) => <span>{children}</span>,
                                                                                    img: () => null,
                                                                                }}
                                                                            />
                                                                            </>
                                                                        )}

                                                                        </div>
                                                                        {mes.attachments.length > 0 && (
                                                                        <>
                                                                        <div className='position-relative'>
                                                                        <Row className='mt-2' style={{ maxWidth: '50%' }}>
                                                                            {mes.attachments.map((file, index) => {
                                                                            const fileExtension = file.split('.').pop().toLowerCase();
                                                                            const isImage = ['jpeg', 'jpg', 'png', 'gif'].includes(fileExtension);
                                                                            const isArchive = ['zip', 'rar'].includes(fileExtension);

                                                                            return (
                                                                                <Col key={index} xl={3} xs={6}>
                                                                                <div className='p-2'>
                                                                                {isImage ? (
                                                                                    <div className='chat-block-image'>
                                                                                    <a href={`http://localhost:5000/networkserver/${file}`} target="_blank">
                                                                                    <img 
                                                                                    src={`http://localhost:5000/networkserver/${file}`} 
                                                                                    alt={`attachment-${index}`} 
                                                                                    className="img-fluid rounded" 
                                                                                    />
                                                                                    </a>
                                                                                    </div>
                                                                                ) : isArchive ? (
                                                                                    <a href={`http://localhost:5000/networkserver/${file}`} target="_blank">
                                                                                    <div className="chat-block-file text-center">
                                                                                    <i className="fas fa-file-archive fa-3x"></i>
                                                                                    </div>
                                                                                    </a>
                                                                                ) : null}
                                                                                </div>
                                                                                </Col>
                                                                            );
                                                                            })}
                                                                        </Row>
                                                                        </div>
                                                                        </>
                                                                        )}
                                                                        <span className='message-date'>@You &nbsp;
                                                                            <small style={{ fontSize: '9px' }}>
                                                                            {new Date(mes.time).toLocaleString('en-US', {
                                                                            weekday: 'short',
                                                                            year: 'numeric',
                                                                            month: 'short',
                                                                            day: 'numeric',
                                                                            hour: 'numeric',
                                                                            minute: 'numeric',
                                                                            second: 'numeric',
                                                                            })}
                                                                            </small>

                                                                            {mes.edited && <small><em> - Edited</em></small>}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                                </>
                                                            ) : mes.author === 'system' ? (
                                                                <>
                                                                <div className='system-message'>
                                                                    <span>{mes.message}</span>
                                                                </div>
                                                                </>
                                                            ) : (
                                                                <>
                                                                <div className="d-flex flex-column mb-2">
                                                                    <div className='parent-of-message-view'>
                                                                        <div className='message-user-image'>
                                                                            {(server?.author === user?.username || admins?.includes(user?.username)) && (
                                                                                <>
                                                                                {!isOwnerDisabled && (
                                                                                    <>
                                                                                    <div className='message-user-options'>
                                                                                    <Dropdown data-bs-theme={formatStyle}>
                                                                                    <Dropdown.Toggle variant="secondary" id="dropdown-user-options">
                                                                                    <i className="fa-solid fa-chevron-down"></i>
                                                                                    </Dropdown.Toggle>

                                                                                    <Dropdown.Menu>
                                                                                        <Dropdown.Item href="#" onClick={() => deleteServerMessage(mes.id)}>Delete</Dropdown.Item>
                                                                                        <Dropdown.Divider />
                                                                                        <Dropdown.Item href="#" onClick={() => handleServerUserMenagment(mes.author, 'ban')}>Ban</Dropdown.Item>
                                                                                        <Dropdown.Item href="#" onClick={() => handleServerUserMenagment(mes.author, 'kick')}>Kick</Dropdown.Item>
                                                                                        <Dropdown.Item href="#" onClick={() => handleServerUserMenagment(mes.author, 'mute')}>Mute</Dropdown.Item>
                                                                                    </Dropdown.Menu>
                                                                                    </Dropdown>
                                                                                    </div>
                                                                                    </>
                                                                                )}
                                                                                </>
                                                                            )}

                                                                            <Link to={`/user/${mes.author}`}>
                                                                            {mes.image ? (
                                                                                <>
                                                                                <img src={`http://localhost:5000/networkserver/${mes.image}`} className='img-fluid' />
                                                                                </>
                                                                            ) : (
                                                                                <>
                                                                                <img src={noavatarImage} className='img-fluid' />
                                                                                </>
                                                                            )}
                                                                            </Link>
                                                                        </div>
                                                                        <div className='message-from-other'>
                                                                        <ReactMarkdown 
                                                                            children={sanitizedMessage}
                                                                            remarkPlugins={[remarkEmoji]}  
                                                                            components={{
                                                                                p: ({ children }) => <span>{children}</span>,
                                                                                img: () => null,
                                                                            }}
                                                                        />
                                                                        </div>
                                                                        {mes.attachments.length > 0 && (
                                                                        <>
                                                                        <Row className='mt-2' style={{ maxWidth: '50%' }}>
                                                                            {mes.attachments.map((file, index) => {
                                                                            const fileExtension = file.split('.').pop().toLowerCase();
                                                                            const isImage = ['jpeg', 'jpg', 'png', 'gif'].includes(fileExtension);
                                                                            const isArchive = ['zip', 'rar'].includes(fileExtension);

                                                                            return (
                                                                                <Col key={index} xl={3} xs={6}>
                                                                                <div className='p-2'>
                                                                                {isImage ? (
                                                                                    <div className='chat-block-image'>
                                                                                    <a href={`http://localhost:5000/networkserver/${file}`} target="_blank">
                                                                                    <img 
                                                                                    src={`http://localhost:5000/networkserver/${file}`} 
                                                                                    alt={`attachment-${index}`} 
                                                                                    className="img-fluid rounded" 
                                                                                    />
                                                                                    </a>
                                                                                    </div>
                                                                                ) : isArchive ? (
                                                                                    <a href={`http://localhost:5000/networkserver/${file}`} target="_blank">
                                                                                    <div className="chat-block-file text-center">
                                                                                    <i className="fas fa-file-archive fa-3x"></i>
                                                                                    </div>
                                                                                    </a>
                                                                                ) : null}
                                                                                </div>
                                                                                </Col>
                                                                            );
                                                                            })}
                                                                        </Row>
                                                                        </>
                                                                        )}

                                                                        <span className='message-date'>@{mes.author} &nbsp;
                                                                            <small style={{ fontSize: '9px' }}>
                                                                            {new Date(mes.time).toLocaleString('en-US', {
                                                                            weekday: 'short',
                                                                            year: 'numeric',
                                                                            month: 'short',
                                                                            day: 'numeric',
                                                                            hour: 'numeric',
                                                                            minute: 'numeric',
                                                                            second: 'numeric',
                                                                            })}
                                                                            </small>

                                                                            {mes.edited && <small><em> - Edited</em></small>}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                                </>
                                                            )}
                                                            </div>
                                                        </React.Fragment>
                                                    )
                                                })}
                                                <div className='mb-4'></div>
                                                <div ref={messagesEndRef} />
                                                </div>
                                                </>
                                        )}
                                           
                                        <hr />
                                        <div className={`typing-status ${currentChannel && currentChannel.typing && currentChannel.typing.length > 0 ? 'show' : ''}`}>
                                        {currentChannel && currentChannel.typing && currentChannel.typing.length > 0 && (
                                            <>
                                            <img src={typingAnimation} className='img-fluid' style={{ maxHeight: '30px'}} />
                                            {currentChannel.typing.length < 5
                                                ? `${currentChannel.typing.map((t) => `@${t.user}: ${t.message}`)}`
                                                : `${currentChannel.typing.length} persons typing messages...`}
                                            </>
                                        )}
                                        </div>

                                        {(server && server.joined.includes(user?.username)) && (mutted && !mutted.includes(user?.username))  && (
                                            <>
                                            <Form onSubmit={handleServerMessage} className='sending-form'>
                                                    <div className='sending-form-buttons'>
                                                    <OverlayTrigger trigger="click" placement="top" overlay={bbcodeHTML} rootClose={true} rootCloseEvent="click">
                                                        <Button variant="secondary" className='br-custom-0'><i className="fa-solid fa-code"></i></Button>
                                                    </OverlayTrigger>

                                                    <Button
                                                        variant="secondary"
                                                        className="br-custom-0"
                                                        onClick={handleFileButtonClick}
                                                    >
                                                        <i className="fa-solid fa-paperclip"></i>
                                                    </Button>

                                                    <input
                                                        ref={fileInputRef}
                                                        type="file"
                                                        accept=".jpg,.jpeg,.png,.gif,.zip,.rar"
                                                        multiple
                                                        onChange={handleFileChange}
                                                        style={{ display: 'none' }}
                                                    />
                                                    </div>

                                                    <OverlayTrigger
                                                        trigger="click"
                                                        placement="top"
                                                        overlay={popoverMentions}
                                                        show={showMentionPopover}
                                                    >
                                                    <FormControl
                                                        placeholder="Type a message..."
                                                        as="textarea"
                                                        rows={2}
                                                        className="br-custom-0"
                                                        onChange={handleTyping}
                                                        value={message}
                                                        ref={textareaRef}
                                                        onDrop={handleDrop}  
                                                        onDragOver={handleDragOver} 
                                                        style={{ height: '30px' }}
                                                    />
                                                    </OverlayTrigger>

                                                    <div className='sending-form-buttons-submit'>
                                                    <Button variant="primary" type="submit" className='br-custom-0'>
                                                        Send
                                                    </Button>
                                                    </div>
                                            </Form>

                                            {attachments && attachments.length > 0 && (
                                                <>
                                                <Row className='mt-1 no-style-button'>
                                                {attachments.map((file, index) => {
                                                    return (
                                                        <React.Fragment key={`file-${index}`}>
                                                            <Col xl={3} xs={12}>
                                                                <div className='attach-file'>
                                                                <span>{file.name.length > 15
                                                                    ? file.name.slice(0, 15) + '...'
                                                                    : file.name}</span>
                                                                <Button variant="danger" size="sm" onClick={() => removeAttachment(index)}><i className="fa-solid fa-trash"></i></Button>
                                                                </div>
                                                            </Col>
                                                        </React.Fragment>
                                                    )
                                                })}
                                                </Row>
                                                </>
                                            )}
                                            </>
                                        )}
                                    </div>
                                    </>
                                )}
                                </>
                            )}
                    </div>
                    </div>
                </div>
                </Col>

                {showRightSidebar && (
                    <>
                    <Col
                    xs={showRightSidebar ? 10 : 0} 
                    sm={showRightSidebar ? 10 : 0} 
                    md={showRightSidebar ? 2 : 0}
                    className={showRightSidebar ? 'dashboard-main-block-right overflow-auto vh-100 border-end p-0' : 'd-none d-sm-block'}
                    >
                        <div className='no-style-button'>
                        <Button variant='primary' className='m-3' onClick={() => {
                            setShowRightSidebar(false)
                            setSearchItems([])
                            setSearchResults([])
                        }}><i className="fa-solid fa-arrow-left"></i></Button>
                        </div>

                        
                        <div className='sidebar-right'>
                        <Tabs
                        defaultActiveKey="users"
                        id="justify-tab-example"
                        className="mb-3 custom-tabs"
                        justify
                        >
                        <Tab eventKey="users" title="Members">
                           {serverUsers && serverUsers.length > 0 && (
                            <>
                            <div className='server-members-display'>
                            <div className='server-members-display-title'> ONLINE </div>
                            {serverUsersOnline.map((su, index) => {
                                return (
                                    <React.Fragment key={`su-${index}`}>
                                        <div className='server-members-item'>
                                        <Link to={`/user/${su.username}`}>
                                        <Row>
                                            <Col xl={3} xs={3} className='position-relative'>
                                            {su.status === 1 && (
                                                <div className='online-status-sidebar'></div>
                                            )}
                                            {su.avatar ? (
                                                <OverlayTrigger
                                                placement="top"
                                                overlay={<Tooltip id={`tooltip-${su.username}`}>{su.username}</Tooltip>}
                                                >
                                                <Image
                                                    src={`http://localhost:5000/networkserver/${su.avatar}`}
                                                    className='rounded-circle'
                                                    style={{
                                                    maxHeight: '45px',
                                                    }}
                                                    alt={`${su.username} Avatar`}
                                                />
                                                </OverlayTrigger>
                                            ) : (
                                                <OverlayTrigger
                                                placement="top"
                                                overlay={<Tooltip id={`tooltip-${su.username}`}>{su.username}</Tooltip>}
                                                >
                                                <img
                                                    src={noavatarImage}
                                                    className='img-fluid rounded-circle'
                                                    style={{
                                                    maxHeight: '45px',
                                                    }}
                                                    alt='Avatar'
                                                />
                                                </OverlayTrigger>
                                            )}
                                            </Col>
                                            <Col xl={9} xs={9}>
                                                {su.username === server?.author && (<><i title='Creator' className="fa-solid fa-user-tie"></i></>)} {admins && admins.includes(su.username) && (<><i title='Admin' className="fa-brands fa-black-tie"></i></>)} {su.username} <br />
                                                <small>{su.description ? su.description.length > 25
                                                    ? su.description.slice(0, 25) + '...'
                                                    : su.description : ''}</small>
                                            </Col>
                                        </Row>
                                        </Link>
                                        </div>
                                    </React.Fragment>
                                )
                            })}

                            <div className='server-members-display-title'> OFFLINE </div>
                            {serverUsersOffline.map((su, index) => {
                                return (
                                    <React.Fragment key={`su-${index}`}>
                                        <div className='server-members-item'>
                                        <Link to={`/user/${su.username}`}>
                                        <Row>
                                            <Col xl={3} xs={3} className='position-relative'>
                                            {su.status === 1 && (
                                                <div className='online-status-sidebar'></div>
                                            )}
                                            {su.avatar ? (
                                                <OverlayTrigger
                                                placement="top"
                                                overlay={<Tooltip id={`tooltip-${su.username}`}>{su.username}</Tooltip>}
                                                >
                                                <Image
                                                    src={`http://localhost:5000/networkserver/${su.avatar}`}
                                                    className='rounded-circle'
                                                    style={{
                                                    maxHeight: '45px',
                                                    }}
                                                    alt={`${su.username} Avatar`}
                                                />
                                                </OverlayTrigger>
                                            ) : (
                                                <OverlayTrigger
                                                placement="top"
                                                overlay={<Tooltip id={`tooltip-${su.username}`}>{su.username}</Tooltip>}
                                                >
                                                <img
                                                    src={noavatarImage}
                                                    className='img-fluid rounded-circle'
                                                    style={{
                                                    maxHeight: '45px',
                                                    }}
                                                    alt='Avatar'
                                                />
                                                </OverlayTrigger>
                                            )}
                                            </Col>
                                            <Col xl={9} xs={9}>
                                                {su.username === server?.author && (<><i title='Creator' className="fa-solid fa-user-tie"></i></>)} {admins && admins.includes(su.username) && (<><i title='Admin' className="fa-brands fa-black-tie"></i></>)} {su.username} <br />
                                                <small>{su.description ? su.description.length > 25
                                                    ? su.description.slice(0, 25) + '...'
                                                    : su.description : ''}</small>
                                            </Col>
                                        </Row>
                                        </Link>
                                        </div>
                                    </React.Fragment>
                                )
                            })}
                            </div>
                            </>
                           )}
                        </Tab>
                        <Tab eventKey="search" title="Search">
                        <div className="sidebar-search">
                            {latestSearchItem && latestSearchItem.type && (latestSearchItem.type === 'fromuser' || latestSearchItem.type === 'mentionsuser') ? (
                                <>
                                    <Select 
                                    options={formatSearchUsers} 
                                    onChange={handleSearchSelect}
                                    styles={customStyles}  
                                    placeholder="Select users"   
                                    isOpen={true}
                                    />
                                </>
                            ) : latestSearchItem && latestSearchItem.type && (latestSearchItem.type === 'beforedate' || latestSearchItem.type === 'duringdate' || latestSearchItem.type === 'afteredate') ? (
                                <>
                                    <Calendar
                                    onChange={handleDateChange}
                                    maxDate={new Date()} 
                                    />
                                </>
                            ) : (
                                <>
                                    <Select 
                                    options={filteredOptions} 
                                    onChange={handleSidebarSearch}
                                    styles={customStyles}  
                                    value={searchItems}
                                    placeholder="Select search options"   
                                    isMulti
                                    />

                                    <Button variant="primary" onClick={handleSearchServer} className='my-2 w-100'><i className="fa-solid fa-magnifying-glass"></i></Button>

                                </>
                            )}

                            <div>
                                {actualMessages && actualMessages.length > 0 && actualMessages.map((message, index) => (
                                    <div className='searched-item-result' key={index}>
                                        <p><b>{message.author}</b> <small>{new Date(message.time).toLocaleString()}</small></p>
                                        <p>{message.message}</p>
                                    </div>
                                ))}
                            </div>

                            <div className='custom-pages-buttons'>
                                {paginateButtons}
                            </div>
                          </div>  
                          </Tab>
                        </Tabs>
                        </div>
                    </Col>
                    </>
                )}

                </>
            )}


        </Row>
        </Container>
        </>
    )
}

export default DashboardServer;