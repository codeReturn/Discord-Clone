import { useState, useEffect, useContext } from "react";
import { Link } from "react-router-dom";

import { AuthContext } from "../../context/auth-context";
import useSocket from "../../util/socket";

import { nanoid } from "nanoid";
import { toast } from "react-toastify";
import axios from 'axios';

import { Row, Col, Card, Form, FormControl, Button, Tooltip, OverlayTrigger, Modal, Accordion, Image, Badge, InputGroup } from 'react-bootstrap';

import LoadingSpinner from "../UIElements/LoadingSpinner";

import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

import plusIcon from '../../../images/icons/plus.svg';
import searchIcon from '../../../images/icons/search.svg';
import createserverIcon from '../../../images/icons/createserver.svg';
import discoverIcon from '../../../images/icons/discover.svg';

const Servers = ({ username }) => {
    const auth = useContext(AuthContext);
    const socket = useSocket();

    const localTheme = localStorage.getItem('theme');
    const formatStyle = localTheme === 'dark-theme' ? 'dark' : 'white';  

    // servers
    const [show, setShow] = useState(false);

    function handleShow() {
        setShow(true);
    }

    const [serverTitle, setServerTitle] = useState('')
    const [serverDescription, setServerDescription] = useState('')
    const [serverImage, setServerImage] = useState(null)
    const [serverChannels, setServerChannels] = useState([])

    const [showCreateRoom, setShowCreateRoom] = useState(false)
    const [roomName, setRoomName] = useState('')

    const [showAddChannel, setShowAddChannel] = useState(false)
    const [channelName, setChannelName] = useState('')
    const [channelDescription, setChannelDescription] = useState('')

    const [showAddChannelId, setShowAddChannelId] = useState('')

    const [serverCreateLoading, setServerCreateLoading] = useState(false)

    const handleCreateServer = async (e) => {
        e.preventDefault();

        if (serverTitle.length > 30) {
            toast.error('You have exceeded the maximum limit for the community title! Allowed 30 characters!');
            return;
        }

        if (serverDescription.length > 150) {
            toast.error('You have exceeded the maximum limit for the community description! Allowed 150 characters!');
            return;
        }

        const formData = new FormData();
        formData.append('title', serverTitle);
        formData.append('description', serverDescription); 
        formData.append('image', serverImage);  
        formData.append('channels', JSON.stringify(serverChannels));    


        try {
            setServerCreateLoading(true)

            const response = await axios.post(
                'http://localhost:5000/networkserver/api/app/createserver',
                formData,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                        'Authorization': 'Bearer ' + auth.token, 
                    }
                }
            );

            if (response.data.message === 'success') {
                setShow(false)
            }

            setServerCreateLoading(false)
        } catch (err) {
            setServerCreateLoading(false)
            toast.error(err.response?.data?.message || 'An error occurred');
        } 

    }

    const handleServerImageChange = (e) => {
        const file = e.target.files[0];
        if (file && (file.type === 'image/jpeg' || file.type === 'image/png' || file.type === 'image/gif')) {
            setServerImage(file);
        } else {
            toast.error('Please upload a valid image (jpg, png, gif).');
        }
    }

    const handleAddRomm = () => {
        if(!roomName) {
            toast.error('Room name is empty!')
            return;
        }

        if (roomName.length > 30) {
            toast.error('You have exceeded the maximum limit for the room title! Allowed 30 characters!');
            return;
        }

        const uniqueId = nanoid();
        setServerChannels((prev) => [...prev, {
            id: uniqueId,
            sort: serverChannels.length + 1,
            room: roomName,
            channels: []
        }])

        setRoomName('')
        setShowCreateRoom(false)
    }


    const handleAddChannel = (id) => {
        const uniqueId = nanoid();

        if(!channelName || !channelDescription) {
            toast.error('Channel inputs are required!')
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

        setServerChannels((prev) => {
        const updatedChannels = prev.map((r) => {
            if (r.id === id) {
            return {
                ...r, 
                sort: r.channels.length + 1,
                channels: [...r.channels, { id: uniqueId, name: channelName, description: channelDescription }], 
            };
            }
            return r; 
        });
    
        return updatedChannels;
        });

        setShowAddChannel(false)
        setChannelName('')
        setChannelDescription('')
    };
    
    const handleDeleteChannel = (roomid, channelid) => {
        setServerChannels((prev) => {
        const updatedChannels = prev.map((room) => {
            if (room.id === roomid) {
            const updatedRoom = {
                ...room, 
                channels: room.channels.filter(channel => channel.id !== channelid), 
            };
            return updatedRoom;
            }
            return room;
        });
    
        return updatedChannels;
        });
    };

    const handleShowAddChannel = (id) => {
        setShowAddChannelId(id)
        setShowAddChannel(!showAddChannel)
    }
    
    // servers
    const [servers, setServers] = useState([])
    const fetchServers = async () => {
            try {

                const response = await axios.get(
                    'http://localhost:5000/networkserver/api/app/getservers',
                    {
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': 'Bearer ' + auth.token, 
                        }
                    }
                );

                if (response.data.servers) {
                    setServers(response.data.servers);
                }
            } catch (err) {
                toast.error(err.response?.data?.message || 'An error occurred');
            } 

        }

        useEffect(() => {
            fetchServers()
        }, []);
    // end of servers

    const handleNewServer = (data) => {
            setServers((prev) => {
                return [data, ...prev];
            });
    };
    
    
    
    const handleNewServerUpdate = (data) => {
        const { channel, readed, room, server } = data;
    
        setServers((prevServers) => {
            return prevServers.map((srv) => {
                if (srv._id === server) {
                    return {
                        ...srv,
                        rooms: srv.rooms.map((roomObj) => {
                            if (roomObj.id === room) {
                                return {
                                    ...roomObj,
                                    channels: roomObj.channels.map((channelObj) => {
                                        if (channelObj.id === channel) {  
                                            return { ...channelObj, readed: readed };
                                        }
                                        return channelObj;
                                    }),
                                };
                            }
                            return roomObj;
                        }),
                    };
                }
                return srv;
            });
        });
    };
    
         
    useEffect(( ) => {
        socket?.on('newServer', handleNewServer);
        socket?.on('newServerUpdate', handleNewServerUpdate);
    
        return () => {
            socket?.off('newServer', handleNewServer);
            socket?.off('newServerUpdate', handleNewServerUpdate);
        }
    }, [socket]);
    
    const hasUnreadMessages = (server, username) => {
        return server.rooms.some((room, roomIndex) => {
            return room.channels && room.channels.some((channel, channelIndex) => {
                return channel.readed && !channel.readed.includes(username);
            });
        });
    };

    // best servers
    const [topServers, setTopServers] = useState([])
    
    const fetchTopServers = async () => {
        try {

            const response = await axios.get(
                'http://localhost:5000/networkserver/api/app/getbestservers',
                {
                    headers: {
                        'Content-Type': 'application/json',
                    }
                }
            );

            if(response.data.top) {
                setTopServers(response.data.top)
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'An error occurred');
        } 

    }

    useEffect(() => {
        fetchTopServers()
    }, []);

    var settings = {
        dots: false,
        infinite: false,
        speed: 500,
        slidesToShow: 4,
        slidesToScroll: 4,
        initialSlide: 0,
        responsive: [
          {
            breakpoint: 1024,
            settings: {
              slidesToShow: 3,
              slidesToScroll: 3,
              infinite: true,
            }
          },
          {
            breakpoint: 600,
            settings: {
              slidesToShow: 2,
              slidesToScroll: 2,
              initialSlide: 2
            }
          },
          {
            breakpoint: 480,
            settings: {
              slidesToShow: 1,
              slidesToScroll: 1
            }
          }
        ]
    };
    // end best servers

    const [searchServers, setSearchServers] = useState([])
    const [serverSearchTitle, setServerSearchTitle] = useState('')
    const [showSearch, setShowSearch] = useState(false);

    function handleShowSearch() {
        setShowSearch(true);
    }

    const handleSearchServer = async (e) => {
        e.preventDefault();

        try {
            const response = await axios.post(
                'http://localhost:5000/networkserver/api/app/searchserver',
                {
                    title: serverSearchTitle
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + auth.token, 
                    }
                }
            );

            if (response.data.message === 'success') {
                setSearchServers(response.data.servers)
            }

        } catch (err) {
            toast.error(err.response?.data?.message || 'An error occurred');
        } 

    }

    const handleCloseSearch = () => {
        setShowSearch(false)
        setSearchServers([])
        setServerSearchTitle('')
    }

    return (
        <>
        <Modal show={show} fullscreen={true} onHide={() => setShow(false)} data-bs-theme={formatStyle} className='create-server-modal'>
                {<Modal.Header closeButton>
                </Modal.Header>}
                <Modal.Body className='position-relative'>
                    <div className='userinfo-block'>
                        <Row>
                            <Col xl={10} xs={12}>
                                    <div className='create-server-info-text'>
                                        <h1>Create Server</h1>
                                        <p>From business to gaming all in one place</p>
                                    </div>
                            </Col>
                            <Col xl={2} xs={12}>
                                    <div className='create-server-info-image text-center'>
                                        <img src={createserverIcon} className='img-fluid' alt='Create Server' />
                                    </div>
                            </Col>
                        </Row>
                    </div>

                    {serverCreateLoading && <LoadingSpinner asOverlay={true} />}
                    <Form onSubmit={handleCreateServer}>
                        <Form.Group controlId="formImage" className="mb-3">
                            <Form.Label>Picture</Form.Label>
                            <Form.Control
                            style={{ background: 'none', border: 'none'}}
                            type="file"
                            accept="image/jpeg, image/png, image/gif"
                            onChange={handleServerImageChange}
                            />
                        </Form.Group>
                        <Form.Group controlId='server-title' className='form-group-limit mb-3'>
                            <Form.Label>Title</Form.Label>
                            {serverTitle.length > 30 ? <Badge bg="danger" className='input-badge'>{serverTitle.length}</Badge> : <Badge bg="secondary" className='input-badge'>{serverTitle.length}</Badge>}
                            <FormControl
                                placeholder="Community title"
                                as="input"
                                className="br-custom-0"
                                value={serverTitle}
                                onChange={(e) => setServerTitle(e.target.value)}
                                style={{ height: '40px' }}
                            />
                        </Form.Group>
                        <Form.Group controlId='server-description' className='form-group-limit mb-3'>
                            {serverDescription.length > 150 ? <Badge bg="danger" className='input-badge'>{serverDescription.length}</Badge> : <Badge bg="secondary" className='input-badge'>{serverDescription.length}</Badge>}
                            <Form.Label>Description</Form.Label>
                            <FormControl
                                placeholder="Community description"
                                as="textarea"
                                rows={4}
                                className="br-custom-0"
                                value={serverDescription}
                                onChange={(e) => setServerDescription(e.target.value)}
                            />
                        </Form.Group>

                        <div>
                        <Button className='mb-3 custom-button-main' variant={showCreateRoom ? 'danger' : 'primary'} onClick={() => setShowCreateRoom(!showCreateRoom)}>{showCreateRoom ? 'Close create room' : 'Create room'}</Button>
                        {showCreateRoom && (
                            <>
                            <div className='p-3 rounded my-4' style={{ background: 'rgba(0,0,0,0.1)'}}>

                            <Form.Group controlId='server-room' className='form-group-limit mb-3'>
                                {roomName.length > 30 ? <Badge bg="danger" className='input-badge'>{roomName.length}</Badge> : <Badge bg="secondary" className='input-badge'>{roomName.length}</Badge>}

                                <Form.Label>Room name</Form.Label>
                                <FormControl
                                    placeholder="Community room name"
                                    as="input"
                                    className="br-custom-0"
                                    value={roomName}
                                    onChange={(e) => setRoomName(e.target.value)}
                                    style={{ height: '40px' }}
                                />
                            </Form.Group>
                            

                            <Button variant='primary' className='custom-button-main' onClick={() => handleAddRomm()}>Add</Button>

                            </div>
                            </>
                        )}

                        {serverChannels && serverChannels.length > 0 && (
                            <>
                            <Accordion defaultActiveKey="0">
                            {serverChannels.map((sc, index) => {
                                return (
                                    <React.Fragment key={`sc-${index}`}>
                                    <Accordion.Item eventKey={index}>
                                        <Accordion.Header>{sc.room}</Accordion.Header>
                                        <Accordion.Body>
                                        <Button variant='success' onClick={() => handleShowAddChannel(sc.id)}>Add Channel</Button>

                                        {showAddChannel && showAddChannelId === sc.id && (
                                            <>
                                            <div className='my-3 p-3 rounded channel-add-create-server'>
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

                                            <Button variant='primary' className='custom-button-main' onClick={() => handleAddChannel(sc.id)}>Save</Button>
                                            </div>
                                            </>
                                        )}

                                        {sc.channels.length === 0 && <p className='my-2'>No data</p>}

                                        {sc.channels.length > 0 && (
                                            <>
                                            {sc.channels.map((c, index) => {
                                                return (
                                                    <React.Fragment key={`chan-${index}`}>
                                                    <Card className='my-2'>
                                                        <Card.Body>                                                
                                                            <Button variant='danger' size='sm' onClick={() => handleDeleteChannel(sc.id, c.id)}><i className="fa-solid fa-trash"></i></Button>
                                                            &nbsp; &nbsp; <b>{c.name}</b>
                                                        </Card.Body>
                                                    </Card>
                                                    </React.Fragment>
                                                )
                                            })}
                                            </>
                                        )}
                                        </Accordion.Body>
                                    </Accordion.Item>
                                    </React.Fragment>
                                )
                            })}
                            </Accordion>
                            </>
                        )}
                        </div>

                        <center>
                        <Button variant="success" size='lg' type="submit" className='mt-4 create-server-save-btn'>
                            Create Community
                        </Button>
                        </center>
                    </Form>
                </Modal.Body>
            </Modal>

            <Modal show={showSearch} size='lg' fullscreen={true} onHide={handleCloseSearch} data-bs-theme={formatStyle} className='discover-servers-modal'>
                <Modal.Header closeButton></Modal.Header>
                <Modal.Body className='position-relative'>
                    <div className='userinfo-block'>
                        <Row>
                            <Col xl={10} xs={12}>
                                    <div className='create-server-info-text'>
                                        <h1>Discovering Servers</h1>
                                        <p>From business to gaming all in one place</p>
                                    </div>
                            </Col>
                            <Col xl={2} xs={12}>
                                    <div className='create-server-info-image text-center'>
                                        <img src={discoverIcon} className='img-fluid' alt='Discover Servers' />
                                    </div>
                            </Col>
                        </Row>
                    </div>

                    <Form onSubmit={handleSearchServer}>
                    <InputGroup className="mb-3">
                            <FormControl
                                placeholder="Community title"
                                as="input"
                                className="br-custom-0-apply"
                                value={serverSearchTitle}
                                onChange={(e) => setServerSearchTitle(e.target.value)}
                            />
                            <Button variant="success" type="submit" className='br-custom-0-apply'>
                                Search
                            </Button>
                        </InputGroup>
                    </Form>

                    {topServers && topServers.length > 0 && (
                        <>
                        <div className="slider-container">
                        <Slider {...settings}>
                            {topServers.map((top, index) => {
                                return (
                                    <div className='discover-server-block' key={`top-${index}`}>
                                        <Link to={`/server/${top._id}`} onClick={() => handleCloseSearch()}>
                                            <div className='top-server-display'>
                                            <div className='top-server-display-rank'>{index + 1}</div>

                                            <div className='top-server-display-image'>
                                            <Image
                                                src={`http://localhost:5000/networkserver/${top.image}`}
                                                className='rounded'
                                            />
                                            </div>
                                            <div className='top-server-display-info'>
                                                <h5>{top.title > 25
                                                        ? top.title.slice(0, 25) + '...'
                                                        : top.title}</h5>
                                                <p>
                                                {top.description > 25
                                                        ? top.description.slice(0, 25) + '...'
                                                        : top.description}
                                                </p>
                                                <br />

                                                <label>Total members: {top.joined.length}</label>
                                            </div>
                                            <Button variant="primary" className='w-100 view-server-button'>VIEW</Button>
                                            </div>
                                        </Link>
                                    </div>
                                )
                            })}
                        </Slider>
                        </div>
                        </>
                    )}

                    {searchServers && searchServers.length > 0 && (
                        <>
                            <hr /> 

                            <Row>
                            {searchServers.map((ss, index) => {
                                return (
                                    <React.Fragment key={`ss-${index}`}>
                                    <Col xl={6} xs={6}>
                                        <div className='ss-info'>
                                        <Link to={`/server/${ss._id}`} onClick={handleCloseSearch}>
                                        <Row>
                                        <Col xl={2} xs={12} className='text-center'>
                                            <div className='ss-info-image'>
                                            <Image
                                                src={`http://localhost:5000/networkserver/${ss.image}`}
                                                className='rounded'
                                                style={{
                                                maxHeight: '100px',
                                                }}
                                                alt={`${ss.title}`}
                                            />
                                            </div>
                                        </Col>
                                        <Col xl={10} xs={12}>
                                            <h3>{ss.title > 25
                                                    ? ss.title.slice(0, 25) + '...'
                                                    : ss.title}</h3>
                                            <p>{ss.description > 50
                                                    ? ss.description.slice(0, 50) + '...'
                                                    : ss.description}</p>

                                            <label>Total members: {ss.joined.length}</label>
                                        </Col>
                                        </Row>
                                        </Link>
                                        </div>
                                    </Col>
                                    </React.Fragment>
                                )
                            })}
                            </Row>
                        </>
                    )}
                </Modal.Body>
            </Modal>

            <center>
            <div>
                <Button variant='primary' className='no-style-button servers-icon mb-4' onClick={() => handleShow()}><img src={plusIcon} width='35' height='35' /></Button>
            </div>
            <div>
                <Button variant='primary' className='no-style-button servers-icon mb-4' onClick={() => handleShowSearch()}><img src={searchIcon} width='35' height='35' /></Button>
            </div>
            
            <div className='servers-space-line'></div>

            </center>

             {servers && servers.length > 0 && (
                    <>
                    {servers.map((mains, index) => {
                        const unreadStatus = hasUnreadMessages(mains, username)

                        return (
                            <React.Fragment key={`mains-${index}`}>
                                <div className='mains-block-display my-4 position-relative'>
                                    <center>
                                        <Link to={`/server/${mains._id}`} onClick={() => socket?.emit('joinServer', { server: mains._id })}>
                                        <OverlayTrigger
                                        placement="top"
                                        overlay={<Tooltip id={`tooltip-${mains.title}`}>{mains.title}</Tooltip>}
                                        >
                                        <div className='mains-block-display-preview'>
                                        {unreadStatus ? (
                                            <>
                                            {/* <Badge pill bg="danger" className='new-server-unread'>1</Badge> */}
                                            <svg width="18" height="20" viewBox="0 0 18 20" fill="none" xmlns="http://www.w3.org/2000/svg" className='new-server-unread'>
                                            <path id="Rectangle 3" d="M0.0571442 4.06987C0.0571442 2.31132 1.48273 0.885742 3.24127 0.885742H14.0673C15.8258 0.885742 17.2514 2.31132 17.2514 4.06987V13.2648C17.2514 14.4118 16.6346 15.4701 15.6367 16.0353L10.2236 19.1015C9.25008 19.653 8.0585 19.653 7.08493 19.1015L1.67192 16.0353C0.673969 15.4701 0.0571442 14.4118 0.0571442 13.2648V4.06987Z" fill="#FE4F06"/>
                                            <text x="8" y="10" font-size="12" text-anchor="middle" fill="white" font-family="Arial" dy=".3em">1</text>
                                            </svg>

                                            </>
                                        ) : ''}
                                        <Image
                                            src={`http://localhost:5000/networkserver/${mains.image}`}
                                            alt={`${mains.title}`}
                                        />
                                        </div>
                                        </OverlayTrigger>
                                        </Link>
                                    </center>
                                </div>
                            </React.Fragment>
                        )
                    })}
                    </>
                )}
        </>
    )
}

export default Servers;