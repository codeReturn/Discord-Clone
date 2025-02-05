import React, { useState, useEffect, useContext } from 'react';
import { useParams, Link } from 'react-router-dom';

import { AuthContext } from '../shared/context/auth-context';

import { Container, Col, Row, Card, Button, OverlayTrigger, Tooltip, Image } from 'react-bootstrap';

import Servers from '../shared/components/Display/Servers';

import axios from 'axios';

import { toast } from 'react-toastify';

import Skeleton from '../shared/components/UIElements/Skeleton';

import noavatarImage from '../images/noavatar.jpg';
import homeIcon from '../images/icons/home.svg';

const DashboardUser = ({ user }) => {
    const auth = useContext(AuthContext);
    const username = useParams().username;

    const [userLoading, setUserLoading] = useState(false)
    const [userInfo, setUserInfo] = useState(null)
    const [usersFriends, setUsersFriends] = useState([])
    const [usersServers, setUsersServers] = useState([])

    const fetchUser = async () => {
        try {
            setUserLoading(true);
    
            const response = await axios.get(
                `http://localhost:5000/networkserver/api/app/getuser/${username}`,
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + auth.token, 
                    }
                }
            );
    
            if (response.data.user) {
                setUserInfo(response.data.user);
                setUsersFriends(response.data.user.friendsInfo)
                setUsersServers(response.data.user.serversInfo)
            } else {
                window.location.href = '/'
            }
            
            setUserLoading(false);
        } catch (err) {
            setUserLoading(false)
            toast.error(err.response?.data?.message || 'An error occurred');
        } 

    }

    useEffect(() => {
        fetchUser()
    }, [username]);

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
                    setUserInfo((prev) => ({
                      ...prev,
                      friendStatus: 'pending'
                    }));
                }

                toast.success('Request sent');
              }
              

        } catch (err) {
            toast.error(err.response?.data?.message || 'An error occurred');
        }
    }


    return (
        <>
        <Container fluid className="vh-100">
            <Row className="h-100">

                <Col xl={1} lg={1} md={1} xs={2} className="dashboard-main-block-servers border-end p-0">
                    <div className="border-0 h-100">             
                            <div className='servers-list'>
                                <Link to='/'>
                                <center>
                                    <Button variant='primary' className='no-style-button servers-icon my-4'><img src={homeIcon} width='35' height='35' /></Button>
                                </center>
                                </Link>

                                <div className='overflow-auto vh-100'>
                                <Servers username={user.username} />
                                </div>
                            </div>
                    </div>
                </Col>
                <Col xl={11} lg={11} md={11} xs={10}>
                    <Container>
                    {userLoading && <Skeleton type='list' />}

                    {!userLoading && userInfo && (
                        <>
                            <Button
                                variant='primary'
                                className='arrow-for-back no-style-button'
                                onClick={() => window.history.back()} 
                            >
                                <i className="fa-solid fa-arrow-left"></i>
                            </Button>
                            <div className='user-info-profile'>
                                <Row>
                                    <Col xl={2} xs={12}>
                                        <div className='user-info-profile-avatar'>
                                        {userInfo.avatar ? (
                                                <OverlayTrigger
                                                placement="top"
                                                overlay={<Tooltip id={`tooltip-${userInfo.username}`}>{userInfo.username}</Tooltip>}
                                                >
                                                <Image
                                                    src={`http://localhost:5000/networkserver/${userInfo.avatar}`}
                                                    className='rounded-circle'
                                                    style={{
                                                    }}
                                                    alt={`${userInfo.username} Avatar`}
                                                />
                                                </OverlayTrigger>
                                            ) : (
                                                <OverlayTrigger
                                                placement="top"
                                                overlay={<Tooltip id={`tooltip-${userInfo.username}`}>{userInfo.username}</Tooltip>}
                                                >
                                                <img
                                                    src={noavatarImage}
                                                    className='img-fluid rounded-circle'
                                                    style={{
                                                    }}
                                                    alt='Avatar'
                                                />
                                                </OverlayTrigger>
                                            )}

                                        </div>
                                    </Col>
                                    <Col xl={9} xs={12}>
                                        <div className='user-info-profile-general'>
                                            <h1>
                                                @{userInfo.username} &nbsp;
                                                {userInfo.verification && (
                                                    <>
                                                    <OverlayTrigger
                                                    placement="bottom"
                                                    overlay={<Tooltip id={`tooltip-${userInfo.username}-verified`}>Verified</Tooltip>}
                                                    >
                                                    <small><i className="fa-solid fa-certificate"></i></small>
                                                    </OverlayTrigger>
                                                    </>
                                                )}

                                                {userInfo.badges && userInfo.badges.includes('supporter') && (
                                                    <>
                                                    <OverlayTrigger
                                                    placement="bottom"
                                                    overlay={<Tooltip id={`tooltip-${userInfo.username}-supporter`}>Early Supporter</Tooltip>}
                                                    >
                                                    <small><i className="fa-solid fa-life-ring"></i></small>
                                                    </OverlayTrigger>
                                                    </>
                                                )}
                                            </h1>
                                            <h3>{userInfo.name}</h3>
                                            {userInfo.status === 1 ? <p style={{ color: 'green' }}>ONLINE</p> : <p style={{ color: 'red' }}>OFFLINE</p>}
                                        </div>
                                    </Col>
                                    <Col xl={1} xs={12} className='user-info-buttons-status'>
                                   {userInfo.friendStatus === '' ? (
                                        <>
                                        <Button variant='success' size='lg' onClick={() => handleRequest(userInfo.username)}><i className="fa-solid fa-plus"></i></Button>
                                        </>
                                    ) : userInfo.friendStatus === 'pending' ? (
                                        <>
                                        <Button variant='secondary' size='lg' disabled><i className="fa-solid fa-clock-rotate-left"></i></Button>
                                        </>
                                    ) : userInfo.friendStatus === 'friends' ? (
                                        <>
                                        <Button variant='success' size='lg' disabled><i className="fa-solid fa-user-group"></i></Button>
                                        </>
                                    )  : userInfo.friendStatus === 'invalid' ? null : null}
                                    </Col>
                                </Row>

                                <hr />
                                
                                <div className='user-info-profile-description'>
                                    <h3>About Me</h3>
                                    <p>{userInfo.description ? userInfo.description : null}</p>
                                </div>

                                <hr />
                                
                                <div className='user-info-profile-activity'>
                                    
                                    <Row>
                                        <Col xl={6} xs={12}>
                                            <div className='user-info-profile-activity-block'>
                                            <h3>Friends List</h3>

                                                <div style={{
                                                    maxHeight: '370px',
                                                    overflowY: 'auto',
                                                    padding: '0.25rem',
                                                }}>
                                                {usersFriends && usersFriends.length > 0 ? (
                                                    <>
                                                    {usersFriends.map((uf, index) => {
                                                        return (
                                                            <React.Fragment key={`uf-${index}`}>
                                                            {uf && (
                                                                <>
                                                                <Link to={`/user/${uf.username}`}>
                                                                <div className='user-info-profile-friend-block'>
                                                                <Row>
                                                                    <Col xl={2} xs={12} className='position-relative'>
                                                                    <div className='user-info-profile-activity-image'>
                                                                    {uf.avatar ? (
                                                                        <OverlayTrigger
                                                                        placement="top"
                                                                        overlay={<Tooltip id={`tooltip-${uf.username}`}>{uf.username}</Tooltip>}
                                                                        >
                                                                        <Image
                                                                            src={`http://localhost:5000/networkserver/${uf.avatar}`}
                                                                            className='rounded-circle'
                                                                            style={{
                                                                            maxHeight: '45px',
                                                                            }}
                                                                            alt={`${uf.username} Avatar`}
                                                                        />
                                                                        </OverlayTrigger>
                                                                    ) : (
                                                                        <OverlayTrigger
                                                                        placement="top"
                                                                        overlay={<Tooltip id={`tooltip-${uf.username}`}>{uf.username}</Tooltip>}
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
                                                                    </div>
                                                                    </Col>
                                                                    <Col xl={10} xs={12}>
                                                                        {uf.username} <br />
                                                                        <small> 
                                                                            {uf.status === 1 ? <p style={{ color: 'green' }}>ONLINE</p> : <p style={{ color: 'red' }}>OFFLINE</p>}
                                                                        </small>
                                                                    </Col>
                                                                </Row>
                                                                </div>
                                                                </Link>
                                                                </>
                                                            )}
                                                            </React.Fragment>
                                                        )
                                                    })}
                                                    </>
                                                ) : (
                                                    <>
                                                    <p>No data</p>
                                                    </>
                                                )}
                                                </div>
                                            </div>
                                        </Col>

                                        <Col xl={6} xs={12}>
                                            <div className='user-info-profile-activity-block'>
                                            <h3>Servers List</h3>

                                                <div style={{
                                                    maxHeight: '370px',
                                                    overflowY: 'auto',
                                                    padding: '0.25rem',
                                                }}>
                                                {usersServers && usersServers.length > 0 ? (
                                                    <>
                                                    {usersServers.map((us, index) => {
                                                        return (
                                                            <React.Fragment key={`us-${index}`}>
                                                            {us && (
                                                                <>
                                                                <Link to={`/server/${us._id}`}>
                                                                <div className='user-info-profile-friend-block'>
                                                                <Row>
                                                                    <Col xl={2} xs={12} className='position-relative'>
                                                                    <div className='user-info-profile-activity-image'>
                                                                    {us.image ? (
                                                                        <OverlayTrigger
                                                                        placement="top"
                                                                        overlay={<Tooltip id={`tooltip-${us.title}`}>{us.title}</Tooltip>}
                                                                        >
                                                                        <Image
                                                                            src={`http://localhost:5000/networkserver/${us.image}`}
                                                                            className='rounded-circle'
                                                                            alt={`${us.title} Server Image`}
                                                                        />
                                                                        </OverlayTrigger>
                                                                    ) : (
                                                                        <OverlayTrigger
                                                                        placement="top"
                                                                        overlay={<Tooltip id={`tooltip-${us.image}`}>{us.image}</Tooltip>}
                                                                        >
                                                                        <img
                                                                            src={noavatarImage}
                                                                            className='img-fluid rounded-circle'
                                                                            alt='Server Image'
                                                                        />
                                                                        </OverlayTrigger>
                                                                    )}
                                                                    </div>
                                                                    </Col>
                                                                    <Col xl={10} xs={12}>
                                                                        {us.title} <br />
                                                                        <p> 
                                                                        {us.description > 25
                                                                        ? us.description.slice(0, 25) + '...'
                                                                        : us.description}                                                        
                                                                        </p>
                                                                    </Col>
                                                                </Row>
                                                                </div>
                                                                </Link>
                                                                </>
                                                            )}
                                                            </React.Fragment>
                                                        )
                                                    })}
                                                    </>
                                                ) : (
                                                    <>
                                                    <p>No data</p>
                                                    </>
                                                )}
                                                </div>
                                            </div>
                                        </Col>
                                    </Row>
                                </div>
                            </div>
                        </>
                    )}
                   </Container>
                </Col>
            </Row>
        </Container>
        </>
    )
}

export default DashboardUser;