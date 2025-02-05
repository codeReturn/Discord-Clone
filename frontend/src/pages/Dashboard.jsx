import React, { useState, useContext, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

import { Container, Row, Col, Card, Form, FormControl, InputGroup, Button, Tooltip, OverlayTrigger, Popover, Dropdown, DropdownButton, ButtonGroup, Modal, Accordion, Image } from 'react-bootstrap';

import { AuthContext } from '../shared/context/auth-context';
import useSocket from '../shared/util/socket';

import Sidebar from '../shared/components/Display/Sidebar';
import UserInfo from '../shared/components/Display/UserInfo';

import axios from 'axios';
import { toast } from 'react-toastify';

import Skeleton from '../shared/components/UIElements/Skeleton';
import LoadingSpinner from '../shared/components/UIElements/LoadingSpinner';

import ReactMarkdown from 'react-markdown';
import remarkEmoji from 'remark-emoji';
import DOMPurify from 'dompurify';
import InviteFriends from '../shared/components/Display/InviteFriends';

import Avatar from '../shared/components/Display/Avatar';

import Servers from '../shared/components/Display/Servers';

import homeIcon from '../images/icons/home.svg';
import eggImage from '../images/egg.png';
import typingAnimation from '../images/typing-animation.gif';

import noavatarImage from '../images/noavatar.jpg';

import useSound from '../shared/hooks/useSound';

const Dashboard = () => {
  const auth = useContext(AuthContext);
  const socket = useSocket()
  const playSound = useSound()

  const localTheme = localStorage.getItem('theme');
  const formatStyle = localTheme === 'dark-theme' ? 'dark' : 'white';  

  const [currentMessages, setCurrentMessages] = useState([]);
  const [limit, setLimit] = useState(20);  
  const chatBodyRef = useRef(null); 
  const [loading, setLoading] = useState(false);

  const [chatLoading, setChatLoading] = useState(false)
  const [chat, setChat] = useState(null);

  const [group, setGroup] = useState(false)
  const [currentChat, setCurrentChat] = useState(null)
  const [message, setMessage] = useState('')

  const messagesEndRef = useRef(null);

  const handleCreateChat = (username) => {
    setChat(null)
    setCurrentChat(username)
  }

  const handleCreateGroup = () => {
    setChat(null)
    setCurrentChat(null)
    setGroup(true)
  }

  const fileInputRef = useRef();
  const [attachments, setAttachments] = useState([]);

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
  

  const handleChatMessage = async (e) => {
    e.preventDefault();

    const formData = new FormData();
    formData.append('message', message);
    formData.append('username', currentChat); 
    formData.append('id', chat?._id);  

    attachments.forEach((file) => {
      formData.append('files', file);
    });


    try {
        const response = await axios.post(
            'http://localhost:5000/networkserver/api/app/handlechatmessage',
            formData,
            {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    'Authorization': 'Bearer ' + auth.token, 
                }
            }
        );

        if (response.data.type === 'chat') {
            setCurrentChat(null)
            setChat(response.data.chat);
            setCurrentMessages(response.data.chat.messages.slice(-limit)); 
            socket?.emit('joinChat', response.data.chat._id)
        } else if(response.data.type === 'message') {
            const chatContainer = messagesEndRef.current.closest('.messages-height');
    
            if (chatContainer) {
              chatContainer.scrollTo({
                top: chatContainer.scrollHeight - 20, 
                behavior: 'smooth', 
              });
            }

            socket?.emit('typing', {
                user: username,
                id: chat?._id,
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

  // Group
  const [groupTitle, setGroupTitle] = useState('')

  const handleCreateGroupForm = async (e) => {
    e.preventDefault();

    try {
        const response = await axios.post(
            'http://localhost:5000/networkserver/api/app/handlecreategroup',
            {
                title: groupTitle
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + auth.token, 
                }
            }
        );

        if (response.data.message === 'success') {
            setCurrentChat(null)
            setGroup(false)

            setChat(response.data.chat);
            setCurrentMessages(response.data.chat.messages.slice(-limit)); 

            socket?.emit('joinChat', response.data.chat._id)
        } 
    } catch (err) {
        toast.error(err.response?.data?.message || 'An error occurred');
    } finally {
        setGroupTitle('')
    }

  }

  const [username, setUsername] = useState(null)

  const handleUsername = (data) => {
    setUsername(data)
  }
  
  const handleLoadChat = async (id) => {
    try {
        setChatLoading(true);

        const response = await axios.get(
            `http://localhost:5000/networkserver/api/app/getchat/${id}`,
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + auth.token, 
                }
            }
        );

        if (response.data.chat) {
            setCurrentChat(null)
            setGroup(false)
            setChat(response.data.chat); 
            setCurrentMessages(response.data.chat.messages.slice(-limit)); 
            socket?.emit('joinChat', response.data.chat._id)

            setTimeout(() => {
                const customContainer = messagesEndRef && messagesEndRef.current && messagesEndRef.current.closest('.messages-height');
    
                if (customContainer) {
                    customContainer.scrollTo({
                    top: customContainer.scrollHeight - 20, 
                    behavior: 'smooth', 
                  });
                }
            }, 1500);
        }
        
        setChatLoading(false);
    } catch (err) {
        setChatLoading(false);
        toast.error(err.response?.data?.message || 'An error occurred');
    } 

  }

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
                    if (mention.mention === username && mention.readed === false) {    
                        socket?.emit("mentionReadChat", {
                            chat: chat?._id,
                            messageId: mes?.id,
                            username: username
                        });
                    }
                });
            }
        });
    };

    const handleScroll = () => {
      handleViewCheck();
  
      if (chatBodyRef.current && !loading && currentMessages.length < chat?.messages.length) {
          const { scrollTop, scrollHeight } = chatBodyRef.current;
  
          if (scrollTop === 0) {
              setLoading(true);
  
              const messagesToLoad = Math.min(
                  limit,
                  chat.messages.length - currentMessages.length
              );
  
              if (messagesToLoad <= 0) {
                  setLoading(false);
                  return;
              }
  
              const previousScrollHeight = scrollHeight;
  
              setTimeout(() => {
                  if (chatBodyRef.current) {
                      const newMessages = chat.messages.slice(
                          chat.messages.length - currentMessages.length - messagesToLoad,
                          chat.messages.length - currentMessages.length
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
    
  const handleNewMessage = (data) => {
    if (!data.message) return;

    setCurrentMessages((prev) => [...prev, data.message])
  };

  const handleUserTyping = (data) => {
    setChat((prev) => {
      const typingArray = prev?.typing || [];
      const { user, id, status, message } = data;
  
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

  const handleUpdateUserExpression = (data) => {
    const { user, expression } = data;

    setChat(prevChat => {
        const updatedAvatars = [...prevChat.avatars];

        const userIndex = updatedAvatars.findIndex(avatar => avatar.username === user);

        if (userIndex !== -1) {
            updatedAvatars[userIndex] = { ...updatedAvatars[userIndex], current: expression };
        } else {
            updatedAvatars.push({ username: user, current: expression });
        }

        return { ...prevChat, avatars: updatedAvatars };
    });
  };
  
  const handleUserDisconnected = (data) => {
    const usernameToRemove = data.username;

    setChat((prevChat) => {
        const updatedAvatars = prevChat?.avatars && prevChat?.avatars.filter(
            (avatar) => avatar.username !== usernameToRemove
        );

        return {
            ...prevChat, 
            avatars: updatedAvatars
        };
    });
  };

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

  const handleUserMessageDeleted = (data) => {
    const { id } = data;
    
    setCurrentMessages((prev) => {
        return prev.filter((m) => m.id !== id)
    })
  }

  const handleUserMessageUpdated = (data) => {
    const { id, message } = data;

    setCurrentMessages((prev) => 
        prev.map((m) => 
            m.id === id ? { ...m, message: message, edited: true } : m
        )
    );
  };

  const handlePlayNotification = (data) => {
    const { status } = data;
    if (status) playSound();
  };

  useEffect(( ) => {
    socket?.on('newMessage', handleNewMessage);
    socket?.on('userTyping', handleUserTyping);
    socket?.on('updateUserExpression', handleUpdateUserExpression);
    socket?.on('userDisconnected', handleUserDisconnected);
    socket?.on('messageReadedChat', handleMessageReaded);
    socket?.on('userMessageDeleted', handleUserMessageDeleted);
    socket?.on('userMessageUpdated', handleUserMessageUpdated);
    socket?.on('playNotification', handlePlayNotification);

    return () => {
        socket?.off('newMessage', handleNewMessage)
        socket?.off('userTyping', handleUserTyping)
        socket?.off('updateUserExpression', handleUpdateUserExpression);
        socket?.off('userDisconnected', handleUserDisconnected);
        socket?.off('messageReadedChat', handleMessageReaded);
        socket?.off('userMessageDeleted', handleUserMessageDeleted);
        socket?.off('userMessageUpdated', handleUserMessageUpdated);
        socket?.off('playNotification', handlePlayNotification);
    }
  }, [socket]);

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
        socket?.emit('typing', {
            user: username,
            id: chat?._id,
            status: true,
            message: e.target.value
        });
    } else {
        socket?.emit('typing', {
            user: username,
            id: chat?._id,
            status: false
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

  }

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
    
    const filteredUsers = chat && chat.joined && chat.joined.filter((u) => u !== username && username);

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

  
  const leaveChat = async (id) => {
    try {
        const response = await axios.get(
            `http://localhost:5000/networkserver/api/app/leavechat/${id}`,
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + auth.token, 
                }
            }
        );

        if (response.data.message === 'success') {
            setChat(null);
        }
        
    } catch (err) {
        toast.error(err.response?.data?.message || 'An error occurred');
    } 
  }

  const [showInvites, setShowInvites] = useState(false)

  const deleteUserMessage = async (id) => {
    try {
        await axios.post(
            'http://localhost:5000/networkserver/api/app/deleteusermessage',
            {
                chat: chat?._id,
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
            'http://localhost:5000/networkserver/api/app/updateusermessage',
            {
                chat: chat?._id,
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

  return (
    <>
    <Container fluid>
      <Row className="h-100">

        <Col xl={1} lg={1} md={1} xs={2} className="dashboard-main-block-servers border-end p-0">
          <div className="border-0 h-100">             
                <div className='servers-list'>
                    <Link to='/'>
                      <center>
                        <Button variant='primary' className='no-style-button servers-icon my-4'><img src={homeIcon} width='35' height='35' /></Button>
                      </center>
                    </Link>

                    <div className='overflow-auto vh-80'>
                    <Servers username={username && username} />
                    </div>
                </div>
          </div>
        </Col>


        <Col xl={3} lg={5} md={6} xs={10} className={`dashboard-main-block-left border-end p-0 ${chat || currentChat || group ? 'col-xs-0' : ''}`}>
          <div className="border-0 h-100"> 
            <div className='second-col-space'>
            <UserInfo onUsername={handleUsername} />
            
            <div className='overflow-auto vh-80'>
                <Sidebar username={username} createChat={handleCreateChat} createGroup={handleCreateGroup} loadChat={handleLoadChat} />
            </div>
            </div>
          </div>
        </Col>

        <Col xl={8} lg={6} md={7} xs={10} className={`dashboard-main-block-right overflow-auto ${chat || currentChat || group ? '' : 'col-xs-0'}`}>
            <div className="border-0 h-100">
                <div className="d-flex flex-column h-100">
                <div className="overflow-auto py-2 px-4">
                    {chatLoading && <Skeleton type='list' />}

                    {!chatLoading && !currentChat && !group && chat && (
                        <>
                        {chat && chat.type === 'group' && <InviteFriends id={chat?._id} show={showInvites} onClose={() => setShowInvites(false)} />}

                        <Button variant='primary' className='arrow-for-back no-style-button' onClick={() => {
                            setChat(null)
                        }}><i className="fa-solid fa-arrow-left"></i></Button>

                        <DropdownButton
                            as={ButtonGroup}
                            key={'start'}
                            id={`dropdown-button-drop-start`}
                            drop={'start'}
                            variant="primary"
                            title={<i className="fa-solid fa-gear"></i>}
                            className='cog-chat-opts arrow-for-back no-style-button'
                            data-bs-theme={formatStyle}
                        >
                            {chat && chat.type === 'group' && <Dropdown.Item eventKey="1" onClick={() => setShowInvites(true)}>Invite Friends</Dropdown.Item>}
                            <Dropdown.Item eventKey="2" onClick={() => leaveChat(chat?._id)}>Leave Chat</Dropdown.Item>
                        </DropdownButton>

                        <div className="start-chat-page text-start p-0">
                            <h2>{chat.type === 'group' ? chat.info.title : chat.joined && chat.joined.map((username) => `@${username}`).join(', ')}</h2>
                            <p>Chat history</p>
                        </div>

                        {currentMessages && currentMessages.length > 0 && (
                            <>
                            <div class="overflow-auto messages-height position-relative" ref={chatBodyRef} onScroll={handleScroll}>

                            {/* <div className='cameras-preview'>
                            {!currentChat && chat && <div className='avatar-item'>  </div>}
                            </div> */}


                            <center>{loading && <LoadingSpinner asOverlay={false} />}</center>

                            {currentMessages.map((mes, index) => {
                                const sanitizedMessage = DOMPurify.sanitize(mes.message);
                                const isHighlightedBg = mes.mentions && mes.mentions.length > 0 && mes.mentions.some(
                                    (mention) => mention.mention === username
                                );
                                const isHighlighted = mes.mentions && mes.mentions.length > 0 && mes.mentions.some(
                                    (mention) => mention.mention === username && mention.readed === false
                                );
                                
                                return (
                                    <React.Fragment key={`mes-${index}`}>
                                        {isHighlighted && <p className='mention-new-message'>NEW MESSAGE</p>}
                                        <div
                                            key={`mes-${index}`}
                                            id={`message-${mes?.id}`}
                                            className={`message-container ${isHighlightedBg ? "highlight-mention" : ""}`}
                                        >
                                        {mes.author === username ? (
                                            <>
                                            <div className="d-flex flex-column mb-2 justify-content-end position-relative">
                                                <div className='parent-of-message-view'>
                                                    <div className='message-user-image'>
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

                                                    <div className="bg-primary text-white message-from-you">
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
                                                            <Dropdown.Item href="#" onClick={() => deleteUserMessage(mes.id)}>Delete</Dropdown.Item>
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
                                                    <span style={{ opacity: 0.5, fontSize: '10px', marginLeft: '5px' }}>@You &nbsp;
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

                                                    <span style={{ opacity: 0.5, fontSize: '10px', marginLeft: '5px' }}>@{mes.author} &nbsp;
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
                        </>
                    )}

                    {!chat && !chatLoading && (
                        <>
                        {!currentChat && !group ? (
                            <>
                            <div className="start-chat-page">
                                <img src={eggImage} className='img-fluid' alt='Logo' />
                                
                                <h2>Start Chatting</h2>
                                <h3 style={{ opacity: 0.75 }}>Connect with your friends</h3>

                                <p style={{ marginTop: '1rem', borderBottom: 'none' }}>Conversations are the bridges that connect hearts, no matter the distance.</p>
                            </div>
                            </>
                        ) : (
                            <>
                            {currentChat && (
                                <>
                                <Button variant='primary' className='arrow-for-back no-style-button' onClick={() => {
                                    setCurrentChat(null)
                                }}><i className="fa-solid fa-arrow-left"></i></Button>
                                <div className='chat-header'>
                                    <h1>@{currentChat}</h1>
                                    <p>This is the direct message history with <b>@{currentChat}</b></p>
                                </div>
                                </>
                            )}

                            {group && (
                                <>
                                <Button variant='primary' className='arrow-for-back no-style-button' onClick={() => {
                                    setGroup(false)
                                }}><i className="fa-solid fa-arrow-left"></i></Button>
                                <div className='chat-header'>
                                    <h1>Create Group</h1>
                                    <p>Create multi-person groups to communicate and collaborate with friends.</p>
                                </div>
                                </>
                            )}
                            </>
                        )}
                        </>
                    )}
                </div>
                
                {group && !chat && (
                    <>
                    <Form onSubmit={handleCreateGroupForm} className='format-form-with-textarea'>
                        <Form.Group controlId='group-description' className='mb-3'>
                            <Form.Label>Title</Form.Label>
                            <FormControl
                                placeholder="Group title"
                                as="input"
                                rows={2}
                                className="br-custom-0"
                                value={groupTitle}
                                onChange={(e) => setGroupTitle(e.target.value)}
                            />
                        </Form.Group>

                        <Button variant="outline-primary" type="submit" className='br-custom-0 custom-button-main'>
                            Create
                        </Button>
                    </Form>

                    </>
                )}
                
                {!chatLoading && (currentChat || chat) && (
                    <>  
                        <div style={{margin: '0rem 2rem'}} className={`typing-status ${chat && chat.typing && chat.typing.length > 0 ? 'show' : ''}`}>
                        {chat && chat.typing && chat.typing.length > 0 && (
                            <>
                            <img src={typingAnimation} className='img-fluid' style={{ maxHeight: '30px'}} />
                            {chat.typing.length < 5
                                ? `${chat.typing.map((t) => `@${t.user}: ${t.message}`)}`
                                : `${chat.typing.length} persons typing messages...`}
                            </>
                        )}
                        </div>
                        <div>
                            <Form onSubmit={handleChatMessage} className='sending-form-custom '>
                                <div className='sending-form-custom-buttons'>

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
                                    <div className='sending-form-custom-buttons-submit'>
                                    <Button variant="primary" type="submit" className='br-custom-0'>
                                        Send
                                    </Button>
                                    </div>
                            </Form>
                            
                            {attachments && attachments.length > 0 && (
                                <>
                                <Row className='mt-4'>
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

                            <div className="avatar-container">
                                {!currentChat && chat && <div className='avatar-item'> <Avatar chat={chat._id} user={username} /> </div>}

                                {chat?.avatars && chat.avatars.length > 0 && (
                                <>
                                    {chat.avatars.map((ca, index) => {
                                        return (
                                        <React.Fragment key={`ca-${index}`}>
                                            <OverlayTrigger
                                            key={`ca-tt-${index}`}
                                            placement={'top'}
                                            overlay={
                                                <Tooltip id={`ca-tt-${index}-top`}>
                                                {ca.username}
                                                </Tooltip>
                                            }
                                            >
                                                <div className="avatar-item">
                                                        <div className="text-center">
                                                        {ca.current ? (
                                                            <img
                                                            src={ca.current}
                                                            alt={ca.username}
                                                            className="img-fluid rounded-circle"
                                                            />
                                                        ) : null}
                                                    </div>
                                                </div>
                                            </OverlayTrigger>
                                        </React.Fragment>
                                        )
                                    })}
                                </>
                            )}
                            </div>                                
                        </div>
                    </>
                )}

                </div>
            </div>
            </Col>

      </Row>
    </Container>
    </>
  );
};

export default Dashboard;
