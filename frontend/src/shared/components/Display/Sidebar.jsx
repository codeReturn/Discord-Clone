import React, { useState, useContext, useEffect } from 'react';

import { AuthContext } from '../../context/auth-context';
import useSocket from '../../util/socket';

import { Row, Col, Tabs, Tab, Form, InputGroup, Button, ButtonGroup, Tooltip, OverlayTrigger, Image, Badge } from 'react-bootstrap';

import axios from 'axios';
import { toast } from 'react-toastify';
import Skeleton from '../UIElements/Skeleton';

import noavatarImage from '../../../images/noavatar.jpg';

import groupsIcon from '../../../images/icons/groups.svg';
import chatsIcon from '../../../images/icons/chats.svg';
import friendsIcon from '../../../images/icons/friends.svg';
import requestsIcon from '../../../images/icons/requests.svg';

import useSound from '../../hooks/useSound';

const Sidebar = (props) => {
    const auth = useContext(AuthContext);
    const socket = useSocket();
    const playSound = useSound();

    const [searchLoading, setSearchLoading] = useState(false)
    const [username, setUsername] = useState('')

    const [searchedUsers, setSearchedUsers] = useState([])

    const handleClearSearch = () => {
        setUsername('')
        setSearchedUsers([])
    }

    const searchUser = async (e) => {
        e.preventDefault();

        if(!username) {
            return;
        }

        try {
            setSearchLoading(true)

            const response = await axios.post(
                'http://localhost:5000/networkserver/api/users/searchuser',
                {
                    username: username,
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + auth.token, 
                    }
                }
            );
    
            if(response.data.message === 'success') {
                setSearchedUsers(response.data.users)
            }

            setSearchLoading(false)
        } catch (err) {
            setSearchLoading(false)
            toast.error(err.response?.data?.message || 'An error occurred');
        }
    }

    const handleRequest = async (username) => {
        try {
            const response = await axios.post(
                'http://localhost:5000/networkserver/api/users/sendrequest',
                {
                    username: username,
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + auth.token, 
                    }
                }
            );
    
            if (response.data.message === 'success') {

                if (response.data.sendedTo) {
                  setSearchedUsers((prev) => {
                    const updatedUsers = [...prev];
                    const userToUpdate = updatedUsers.find((u) => u.username === response.data.sendedTo);
              
                    if (userToUpdate) {
                      userToUpdate.friendStatus = 'pending'; 
                    }
              
                    return updatedUsers;
                  });
                }

                toast.success('Request sent');
              }
              

        } catch (err) {
            toast.error(err.response?.data?.message || 'An error occurred');
        }
    }

    const [invitations, setInvitations] = useState([])
    const [invitationsLoading, setInvitationsLoading] = useState(false)

    const fetchInvitations = async () => {
        try {
            setInvitationsLoading(true);
    
            const response = await axios.get(
                'http://localhost:5000/networkserver/api/users/getinvitations',
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + auth.token, 
                    }
                }
            );
    
            if (response.data.invitations) {
                setInvitations(response.data.invitations);
            }
            
            setInvitationsLoading(false);
        } catch (err) {
            setInvitationsLoading(false);
            toast.error(err.response?.data?.message || 'An error occurred');
        } 

    }

    useEffect(() => {
        fetchInvitations()
    }, []);

    const handleRequestOptions = async (type, id) => {
        try {
            const response = await axios.post(
                'http://localhost:5000/networkserver/api/users/handlerequestoptions',
                {
                    id: id,
                    type: type,
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + auth.token, 
                    }
                }
            );
    
            if(response.data.message === 'success') {
                setInvitations((prev) => prev.filter((i) => i._id !== id))
                toast.success('Request updated')
            }

        } catch (err) {
            toast.error(err.response?.data?.message || 'An error occurred');
        }

    }

    const [friends, setFriends] = useState([])
    const [friendsLoading, setFriendsLoading] = useState(false)

    const fetchFriends = async () => {
        try {
            setFriendsLoading(true);
    
            const response = await axios.get(
                'http://localhost:5000/networkserver/api/users/getfriends',
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + auth.token, 
                    }
                }
            );
    
            if (response.data.friends) {
                setFriends(response.data.friends);
            }
            
            setFriendsLoading(false);
        } catch (err) {
            setFriendsLoading(false);
            toast.error(err.response?.data?.message || 'An error occurred');
        } 

    }

    useEffect(() => {
        fetchFriends()
    }, []);

    const [chats, setChats] = useState([])
    const [chatsLoading, setChatsLoading] = useState(false)
    const [groupsLoading, setGroupsLoading] = useState(false)

    const fetchChats = async () => {
        try {
            setChatsLoading(true);
            setGroupsLoading(true)
    
            const response = await axios.get(
                'http://localhost:5000/networkserver/api/app/getchats',
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + auth.token, 
                    }
                }
            );
    
            if (response.data.chats) {
                setChats(response.data.chats);
            }
            
            setChatsLoading(false);
            setGroupsLoading(false)
        } catch (err) {
            setGroupsLoading(false)
            setChatsLoading(false);
            toast.error(err.response?.data?.message || 'An error occurred');
        } 

    }

    useEffect(() => {
        fetchChats()
    }, []);

    // sockets
    const handleUserDisconnected = (data) => {      
        setFriends(prevFriends => 
          prevFriends.map(friend => friend.username === data.username ? { ...friend, status: 0 } : friend)
        );
    };

    const handleUserConnected = (data) => {      
        setFriends(prevFriends => 
          prevFriends.map(friend => friend.username === data.username ? { ...friend, status: 1 } : friend)
        );
    };

    const handleNewFriend = (data) => {
        setFriends((prev) => [data, ...prev])
    }

    const handleNewRequest = (data) => {
        setInvitations((prev) => [data, ...prev])
    }

    const handleNewChat = (data) => {
        setChats((prev) => [data, ...prev])
    }

    const handleUpdateReaded = (data) => {
        setChats((prevChats) => {
          const updatedChats = prevChats.map((chat) =>
            chat._id === data.id && !chat.readed.includes(data.user)
              ? { ...chat, readed: [...chat.readed, data.user] }
              : chat 
          );
          
          return updatedChats; 
        });
    };

    const handleUpdateChat = (data) => {
        setChats((prevChats) => {
            const updatedChats = prevChats.map((chat) =>
              chat._id === data._id
                ? { ...chat, readed: data.readed, messages: data.messages }
                : chat 
            );
            
            return updatedChats; 
          });
    }

    const handleLeavedChat = (id) => {
        setChats((prev) => prev.filter((c) => c._id !== id));
    }    

    const handleLeavedChatUpdate = (data) => {
        setChats((prevChats) => {
          const updatedChats = prevChats.map((chat) => {
            if (chat._id === data.id) {              
              const updatedUsersDetails = chat.usersDetails.filter(
                (user) => {
                  return user.username !== data.user;
                }
              );
            
              return {
                ...chat,
                joined: data.joined, 
                usersDetails: updatedUsersDetails, 
              };
            }
            return chat;
          });
            
          return updatedChats;
        });
    };
      
    const handleNewUsers = (data) => {
        setChats((prevChats) => {
          const chatExists = prevChats.some((chat) => chat._id === data._id);
      
          if (chatExists) {
            const updatedChats = prevChats.map((chat) => {
              if (chat._id === data._id) {
                return {
                  ...chat,
                  joined: data.joined,
                  usersDetails: data.usersDetails, 
                };
              }
              return chat;
            });
      
            return updatedChats;
          } else {
            return [...prevChats, data];
          }
        });
    };
      
    const handleUserMessageDeletedUser = (data) => { 
        const { chat, id } = data;
    
        setChats((prev) => 
            prev.map((c) => 
                c._id === chat 
                    ? { ...c, messages: c.messages.filter((m) => m.id !== id) } 
                    : c
            )
        );
    };   
    
    const handleUserMessageUpdatedUser = (data) => {
        const { id, message, chat } = data;
    
        setChats((prev) => 
            prev.map((c) => 
                c._id === chat 
                    ? { 
                        ...c, 
                        messages: c.messages.map((m) => 
                            m.id === id ? { ...m, message: message, edited: true } : m
                        ) 
                    } 
                    : c
            )
        );
    };
    
    const handlePlayNotification = (data) => {
        const { status } = data;
        if (status) playSound();
    };
            
    useEffect(() => {
        socket?.on('userDisconnected', handleUserDisconnected);
        socket?.on('userConnected', handleUserConnected);
        socket?.on('newFriend', handleNewFriend);
        socket?.on('newRequest', handleNewRequest);
        socket?.on('newChat', handleNewChat);
        socket?.on('updateReaded', handleUpdateReaded);
        socket?.on('updateChat', handleUpdateChat);
        socket?.on('leavedChat', handleLeavedChat);
        socket?.on('leavedChatUpdate', handleLeavedChatUpdate);
        socket?.on('newUsersToChat', handleNewUsers);
        socket?.on('userMessageDeletedUser', handleUserMessageDeletedUser);
        socket?.on('userMessageUpdatedUser', handleUserMessageUpdatedUser);
        socket?.on('playNotification', handlePlayNotification);

        return () => {
            socket?.off('userDisconnected', handleUserDisconnected);
            socket?.off('userConnected', handleUserConnected);
            socket?.off('newFriend', handleNewFriend);
            socket?.off('newRequest', handleNewRequest);
            socket?.off('newChat', handleNewChat);
            socket?.off('updateReaded', handleUpdateReaded);
            socket?.off('newMessageSide', handleUpdateChat);
            socket?.off('leavedChat', handleLeavedChat);
            socket?.off('leavedChatUpdate', handleLeavedChatUpdate);
            socket?.off('newUsersToChat', handleNewUsers);
            socket?.off('userMessageDeletedUser', handleUserMessageDeletedUser);
            socket?.off('userMessageUpdatedUser', handleUserMessageUpdatedUser);
            socket?.off('playNotification', handlePlayNotification);
        };
    }, [socket]);

    // chat
    const createChat = (username) => {
        props.createChat(username)
    }

    const createGroup = () => {
        props.createGroup();
    }

    const unreadChatsCount = chats.filter(chat => {
        return !chat.readed.includes(props.username) && chat.type === 'chat';
    }).length;
    
    const unreadGroupsCount = chats.filter(chat => {
        return !chat.readed.includes(props.username) && chat.type === 'group';
    }).length;

    // 
    const displayChats = chats && chats.filter((c) => c.type === 'chat')
    const displayGroups = chats && chats.filter((c) => c.type === 'group')

    return (
        <>
        <Tabs
        defaultActiveKey="groups"
        id="fill-tab-sidebar"
        className="mb-3 custom-tabs"
        fill
        >
            <Tab eventKey="groups" title={<><img src={groupsIcon} width='30' height='25' /> {unreadGroupsCount && unreadGroupsCount > 0 ? <Badge bg="danger">{unreadGroupsCount}</Badge> : ''}</>}>
                <div className='tab-top'>
                    <hr />
                    
                    <Button size='sm' variant='outline-primary' className='m-2 custom-button-main' onClick={() => createGroup()}><i className="fa-solid fa-user-group"></i> Create Group</Button>

                    <hr />
                </div>
                
                <div className='px-3'>
                    {groupsLoading && <Skeleton type='list' />}
                </div>

                {!groupsLoading && displayGroups && displayGroups.length > 0 && (
                        <>
                        <div className='px-3'>
                        {displayGroups.map((g, index) => {
                            const lastMessage = [...g.messages].pop()

                            const readedStatus = !g.readed.includes(props.username)

                            return (
                                <React.Fragment key={`g-${index}`}>
                                <Row onClick={() => props.loadChat(g._id)} className={`my-2 py-2 chat-link ${readedStatus && 'unreaded-message'}`}>
                                <Col xl={3} xs={4}>
                                <div className='userinfo-avatar position-relative' style={{ height: 'auto', marginTop: '5px' }}>
                                    {g.usersDetails.length > 0 && g.usersDetails.length <= 2 ? (
                                        <div className='d-flex justify-content-start align-items-center'>
                                        {g.usersDetails.map((ud, index) => (
                                            <React.Fragment key={`g-${index}-ud-${index}`}>
                                            {ud.avatar ? (
                                                <OverlayTrigger
                                                placement="top"
                                                overlay={<Tooltip id={`tooltip-${ud.username}`}>{ud.username}</Tooltip>}
                                                >
                                                <Image
                                                    src={`http://localhost:5000/networkserver/${ud.avatar}`}
                                                    className='rounded-circle'
                                                    style={{
                                                    maxHeight: '45px',
                                                    marginLeft: index > 0 ? '-15px' : '0',
                                                    }}
                                                    alt={`${ud.username}'s Avatar`}
                                                />
                                                </OverlayTrigger>
                                            ) : (
                                                <OverlayTrigger
                                                placement="top"
                                                overlay={<Tooltip id={`tooltip-${ud.username}`}>{ud.username}</Tooltip>}
                                                >
                                                <img
                                                    src={noavatarImage}
                                                    className='img-fluid rounded-circle'
                                                    style={{
                                                    maxHeight: '45px',
                                                    marginLeft: index > 0 ? '-15px' : '0',
                                                    }}
                                                    alt='Avatar'
                                                />
                                                </OverlayTrigger>
                                            )}
                                            </React.Fragment>
                                        ))}
                                    </div>
                                ) : (
                                    <center>
                                    <OverlayTrigger
                                    placement="top"
                                    overlay={<Tooltip id={`tooltip-${g.info.title}`}>{g.info.title}</Tooltip>}
                                    >
                                    <div
                                    className='d-flex justify-content-center align-items-center multipleroom-style'
                                    style={{
                                        width: '45px',
                                        height: '45px',
                                        borderRadius: '50%',
                                        fontWeight: 'bold',
                                    }}
                                    >
                                    {g.joined.length}
                                    </div>
                                    </OverlayTrigger>
                                    </center>
                                )}
                                </div>

                                </Col>
                                <Col xl={9} xs={8}>
                                <div className='userinfo-info'>
                                    <p style={{ marginBottom: '8px' }} className='author-in-chats'> {g.joined.length < 5 ? g.joined.map((username) => `@${username}`).join(', ') : `${g.joined.length} total people`} </p>
                                    <p style={{ marginBottom: '2px' }} className='lastmessage-in-chats'>
                                        {lastMessage.message.length > 25
                                        ? lastMessage.message.slice(0, 25) + '...'
                                        : lastMessage.message}
                                    </p>
                                    <small style={{ opacity: '0.5', fontSize: '10px' }}>
                                        {new Date(lastMessage.time).toLocaleString('en-US', {
                                        year: 'numeric',
                                        month: 'short',
                                        day: 'numeric',
                                        hour: 'numeric',
                                        minute: 'numeric',
                                        })}
                                    </small>
                                </div>
                                </Col>
                                </Row>
                                </React.Fragment>
                            )
                        })}
                        </div>
                        </>
                    )}

            </Tab>
            <Tab eventKey="chats" title={<><img src={chatsIcon} width='30' height='25' /> {unreadChatsCount && unreadChatsCount > 0 ? <Badge bg="danger">{unreadChatsCount}</Badge> : ''}</>}>
                <div className='tab-top'>
                    <hr />
                </div>
                
                <div className='px-3'>
                    {chatsLoading && <Skeleton type='list' />}
                </div>

                {!chatsLoading && displayChats && displayChats.length > 0 && (
                        <>
                        <div className='px-3'>
                        {displayChats.map((c, index) => {
                            const lastMessage = [...c.messages].pop()

                            const readedStatus = !c.readed.includes(props.username)

                            return (
                                <React.Fragment key={`c-${index}`}>
                                <Row onClick={() => props.loadChat(c._id)} className={`my-2 py-2 chat-link ${readedStatus && 'unreaded-message'}`}>
                                <Col xl={2} xs={4}>
                                <div className='position-relative' style={{ height: 'auto' }}>
                                {c.usersDetails.length > 0 && c.usersDetails.length <= 2 ? (
                                    <div className='d-flex justify-content-start align-items-center'>
                                    {c.usersDetails.map((ud, index) => {
                                        if(ud.username === props?.username) {
                                            return;
                                        }
                                        
                                        return (
                                            <React.Fragment key={`c-${index}-ud-${index}`}>
                                                <div className='chat-image'>
                                                {ud.avatar ? (
                                                    <OverlayTrigger
                                                    placement="top"
                                                    overlay={<Tooltip id={`tooltip-${ud.username}`}>{ud.username}</Tooltip>}
                                                    >
                                                    <Image
                                                        src={`http://localhost:5000/networkserver/${ud.avatar}`}
                                                        className='rounded-circle'
                                                        style={{
                                                        maxHeight: '60px',
                                                        }}
                                                        alt={`${ud.username}'s Avatar`}
                                                    />
                                                    </OverlayTrigger>
                                                ) : (
                                                    <OverlayTrigger
                                                    placement="top"
                                                    overlay={<Tooltip id={`tooltip-${ud.username}`}>{ud.username}</Tooltip>}
                                                    >
                                                    <img
                                                        src={noavatarImage}
                                                        className='img-fluid rounded-circle'
                                                        style={{
                                                        maxHeight: '60px',
                                                        }}
                                                        alt='Avatar'
                                                    />
                                                    </OverlayTrigger>
                                                )}
                                                </div>
                                            </React.Fragment>
                                        )
                                    })}
                                    {/* {c.usersDetails.map((ud, index) => (
                                        <React.Fragment key={`c-${index}-ud-${index}`}>
                                        {ud.avatar ? (
                                            <OverlayTrigger
                                            placement="top"
                                            overlay={<Tooltip id={`tooltip-${ud.username}`}>{ud.username}</Tooltip>}
                                            >
                                            <Image
                                                src={`http://localhost:5000/networkserver/${ud.avatar}`}
                                                className='rounded-circle'
                                                style={{
                                                maxHeight: '60px',
                                                marginLeft: index > 0 ? '-15px' : '0',
                                                }}
                                                alt={`${ud.username}'s Avatar`}
                                            />
                                            </OverlayTrigger>
                                        ) : (
                                            <OverlayTrigger
                                            placement="top"
                                            overlay={<Tooltip id={`tooltip-${ud.username}`}>{ud.username}</Tooltip>}
                                            >
                                            <img
                                                src={noavatarImage}
                                                className='img-fluid rounded-circle'
                                                style={{
                                                maxHeight: '60px',
                                                marginLeft: index > 0 ? '-15px' : '0',
                                                }}
                                                alt='Avatar'
                                            />
                                            </OverlayTrigger>
                                        )}
                                        </React.Fragment>
                                    ))} */}
                                    </div>
                                ) : (
                                    <center>
                                    <div
                                    className='d-flex justify-content-center align-items-center multipleroom-style'
                                    style={{
                                        width: '60px',
                                        height: '60px',
                                        borderRadius: '50%',
                                        fontWeight: 'bold',
                                    }}
                                    >
                                    {c.joined.length}
                                    </div>
                                    </center>
                                )}
                                </div>
                                </Col>
                                <Col xl={10} xs={8}>
                                <div className='userinfo-info'>
                                    <small className='time-in-chats'>
                                        {new Date(lastMessage.time).toLocaleString('en-US', {
                                        year: 'numeric',
                                        month: 'short',
                                        day: 'numeric',
                                        hour: 'numeric',
                                        minute: 'numeric',
                                        })}
                                    </small>
                                    <p style={{ marginBottom: '2px' }}> 
                                        {c.joined.map((j, index) => {
                                            if(j === props.username) {
                                                return;
                                            }

                                            return (
                                                <React.Fragment key={`j-${index}`}>
                                                    <span className='author-in-chats'>{j}</span>
                                                </React.Fragment>
                                            )
                                        })}
                                    </p>
                                    <p className='lastmessage-in-chats'>
                                        {lastMessage.message.length > 25
                                        ? lastMessage.message.slice(0, 25) + '...'
                                        : lastMessage.message}
                                    </p>
                                </div>
                                </Col>
                                </Row>
                                </React.Fragment>
                            )
                        })}
                        </div>
                        </>
                    )}

            </Tab>
            <Tab eventKey="contacts" title={<><img src={friendsIcon} width='30' height='25' /></>}>
                <div className='tab-top'>
                    <hr />
                </div>
                <div className='contacts-search'>
                    <Form onSubmit={searchUser}>
                        <div className='search-users-form-control'>
                            <Form.Control
                            placeholder="Search user by username"
                            aria-label="Search user by username"
                            aria-describedby="basic-addon-searchuser"
                            onChange={(e) => setUsername(e.target.value)}
                            value={username}
                            />
                            <div className='search-users-form-control-btns'>
                            <Button variant="outline-primary" type="submit" className='custom-button-main' size='sm'>
                                <i className="fa-solid fa-magnifying-glass"></i>
                            </Button>
                            {searchedUsers.length > 0 && (
                                <>
                                <Button variant="outline-danger" className='custom-button-main' size='sm' onClick={() => handleClearSearch()}>
                                    <i className="fa-solid fa-circle-xmark"></i>
                                </Button>
                                </>
                            )}
                            </div>
                        </div>
                    </Form>
                </div>
                
                <div className='px-3'>
                {searchLoading && <Skeleton type='list' />}
                </div>

                {!searchLoading && searchedUsers && searchedUsers.length > 0 && (
                        <>
                        <div className='px-3'>
                        {searchedUsers.map((su, index) => {
                            return (
                                <React.Fragment key={`su-${index}`}>
                                <Row className='mt-4'>
                                <Col xl={2} xs={3}>
                                    <div className='position-relative' style={{ height: 'auto' }}>
                                    <div className='chat-image-contracts'>
                                    {su.avatar ? (
                                        <>
                                        <img src={`http://localhost:5000/networkserver/${su.avatar}`} className='img-fluid' style={{ maxHeight: '60px' }} alt='Avatar' />
                                        </>
                                    ) : (
                                        <>
                                        <img src={noavatarImage} className='img-fluid' style={{ maxHeight: '60px' }} alt='Avatar' />
                                        </>
                                    )}
                                    </div>
                                    </div>
                                </Col>
                                <Col xl={8} xs={7}>
                                    <div className='userinfo-info'>
                                        <h3 className='contracts-title'>@{su.username}</h3>
                                        <p className='contracts-description'>{su.name}</p>
                                    </div>
                                </Col>
                                <Col xl={2} xs={2}>
                                    {su.friendStatus === '' ? (
                                        <>
                                        <Button variant='success' size='sm' onClick={() => handleRequest(su.username)}><i className="fa-solid fa-plus"></i></Button>
                                        </>
                                    ) : su.friendStatus === 'pending' ? (
                                        <>
                                        <Button variant='secondary' size='sm' disabled><i className="fa-solid fa-clock-rotate-left"></i></Button>
                                        </>
                                    ) : su.friendStatus === 'friends' ? (
                                        <>
                                        <Button variant='success' size='sm' disabled><i className="fa-solid fa-user-group"></i></Button>
                                        </>
                                    ) : null}
                                </Col>
                                </Row>
                                </React.Fragment>
                            )
                        })}
                        </div>
                        </>
                    )}

                    {!searchLoading  && searchedUsers.length === 0 && (
                        <>
                        {friendsLoading && friends && friends.length === 0 && <Skeleton type='list' />}

                        {!friendsLoading && friends && friends.length > 0 && (
                            <>
                            <div className='px-3'>
                            {friends.map((f, index) => {
                                return (
                                    <React.Fragment key={`f-${index}`}>
                                    <Row className='mt-4 chat-link' onClick={() => createChat(f.username)}>
                                    <Col xl={2} xs={3}>
                                        <div className='position-relative' style={{ height: 'auto' }}>
                                        <div className='chat-image-contracts'>
                                        {f.status === 1 && (
                                            <div className='online-status-contacts'>
                                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="13" viewBox="0 0 14 13" fill="none">
                                                <circle cx="7.04944" cy="6.63126" r="5.5226" fill="#37C63B" stroke="#0BA911" strokeWidth="1.10452"/>
                                                </svg>
                                            </div>
                                        )}

                                        {f.avatar ? (
                                            <>
                                            <img src={`http://localhost:5000/networkserver/${f.avatar}`} className='img-fluid' style={{ maxHeight: '60px' }} alt='Avatar' />
                                            </>
                                        ) : (
                                            <>
                                            <img src={noavatarImage} className='img-fluid' style={{ maxHeight: '60px' }} alt='Avatar' />
                                            </>
                                        )}
                                        </div>
                                        </div>
                                    </Col>
                                    <Col xl={10} xs={9}>
                                        <div className='userinfo-info'>
                                            <h3 className='contracts-title'>@{f.username}</h3>
                                            <p className='contracts-description'>{f.name}</p>
                                        </div>
                                    </Col>
                                    </Row>
                                    </React.Fragment>    
                                )
                            })}
                            </div>
                            </>
                        )}
                        </>
                    )}
            </Tab>
            <Tab eventKey="invitations" title={<><img src={requestsIcon} width='30' height='25' /> {invitations && invitations.length > 0 && <Badge bg="danger">{invitations.length}</Badge>}</>}>
                <div className='tab-top'>
                    <hr />
                </div>

                <div className='px-3'>
                    {invitationsLoading && <Skeleton type='list' />}
                </div>

                {/* {!invitationsLoading && invitations && invitations.length === 0 && (
                    <>
                    <p className='text-center'>No data</p>
                    </>
                )} */}

                {!invitationsLoading && invitations && invitations.length > 0 && (
                        <>
                        <div className='px-3'>
                        {invitations.map((i, index) => {
                            return (
                                <React.Fragment key={`i-${index}`}>
                                <Row className='mt-4'>
                                <Col xl={2} xs={3}>
                                    <div className='position-relative' style={{ height: 'auto' }}>
                                    <div className='chat-image-contracts'>
                                    {i.avatar ? (
                                        <>
                                        <img src={`http://localhost:5000/networkserver/${i.avatar}`} className='img-fluid' style={{ maxHeight: '60px' }} alt='Avatar' />
                                        </>
                                    ) : (
                                        <>
                                        <img src={noavatarImage} className='img-fluid' style={{ maxHeight: '60px' }} alt='Avatar' />
                                        </>
                                    )}
                                    </div>
                                    </div>
                                </Col>
                                <Col xl={7} xs={6}>
                                    <div className='userinfo-info'>
                                        <h3 className='author-in-chats'>@{i.username}</h3>
                                        <p className='lastmessage-in-chats'>Sended friend request</p>
                                    </div>
                                </Col>
                                <Col xl={3} xs={3}>
                                    <ButtonGroup aria-label="request-options" className='request-options-btns'>
                                        <Button variant="success" onClick={() => handleRequestOptions('accept', i._id)}><i className="fa-solid fa-check"></i></Button>
                                        <Button variant="danger" onClick={() => handleRequestOptions('remove', i._id)}><i className="fa-solid fa-xmark"></i></Button>
                                    </ButtonGroup>
                                </Col>
                                </Row>
                                </React.Fragment>
                            )
                        })}
                        </div>
                        </>
                )}
            </Tab>
        </Tabs>
        </>
    )
}

export default Sidebar;