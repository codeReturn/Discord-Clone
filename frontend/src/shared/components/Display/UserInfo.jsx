import React, { useState, useEffect, useContext } from "react";

import { AuthContext } from "../../context/auth-context";

import useSocket from "../../util/socket";

import axios from 'axios';

import { toast } from "react-toastify";
import { Row, Col, Dropdown, DropdownButton, ButtonGroup, Modal, Button, Form, Tabs, Tab } from "react-bootstrap";

import noavatarImage from '../../../images/noavatar.jpg';

import Skeleton from "../UIElements/Skeleton";
import LoadingSpinner from "../UIElements/LoadingSpinner";

import Select from 'react-select'
import { customStyles } from "../UIElements/SelectStyle";

import cogIcon from '../../../images/icons/cog.svg';

const UserInfo = (props) => {
    const auth = useContext(AuthContext);
    const socket = useSocket();
    const [user, setUser] = useState(null)

    const [image, setImage] = useState(null);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [model, setModel] = useState('');

    const [isLoading, setIsLoading] = useState(false)

    const fetchUser = async () => {
        try {
            setIsLoading(true);
    
            const response = await axios.get(
                'http://localhost:5000/networkserver/api/users/getuserinfo',
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + auth.token, 
                    }
                }
            );
    
            if (response.data.user) {                
                setUser(response.data.user);

                setName(response.data.user.name)
                setDescription(response.data.user.description)
                setModel(response.data.user.model)

                props.onUsername(response.data.user.username)
            }
            
            setIsLoading(false);
        } catch (err) {
            setIsLoading(false);
            toast.error(err.response?.data?.message || 'An error occurred');
        } 
    };
    
    useEffect(() => {
        fetchUser()
    }, []);

    const localTheme = localStorage.getItem('theme');
    const formatStyle = localTheme === 'dark-theme' ? 'dark' : 'white';  

    const handleUserLanded = (data) => {
        setUser((prev) => ({
            ...prev,
            status: 1,
        }));
    };

    useEffect(() => {
        socket?.on('userLanded', handleUserLanded)

        return () => {
            socket?.off('userLanded', handleUserLanded);
        };
    }, [socket]);

    // Profile
    const [show, setShow] = useState(false);

    const handleClose = () => setShow(false);
    const handleShow = () => setShow(true);
  
    const handleImageChange = (e) => {
      const file = e.target.files[0];
      if (file && (file.type === 'image/jpeg' || file.type === 'image/png' || file.type === 'image/gif')) {
        setImage(file);
      } else {
        toast.error('Please upload a valid image (jpg, png, gif).');
      }
    };
  
    const [userUpdateLoading, setUserUpdateLoading] = useState(false)

    const handleSubmit = async (e) => {
        e.preventDefault();

        const formData = new FormData();
        formData.append('name', name);
        formData.append('description', description); 
        formData.append('image', image);  
        formData.append('model', model);
    
        try {
            setUserUpdateLoading(true)

            const response = await axios.post(
                'http://localhost:5000/networkserver/api/users/updateprofile',
                formData,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                        'Authorization': 'Bearer ' + auth.token, 
                    }
                }
            );
    
            if (response.data.message === 'success') {
                handleClose()
                await fetchUser()
            }

            setUserUpdateLoading(false)
        } catch (err) {
            setUserUpdateLoading(false)
            toast.error(err.response?.data?.message || 'An error occurred');
        } 
    };
  
    // Models
    const defaultModels = ['cecelia', 'moran']
    const [modelList, setModelList] = useState([])
    
    const getModels = async () => {
        const modelsOptions = defaultModels.map(m => ({
            value: m,
            label: m,
        }));


        setModelList(modelsOptions);
    }

    useEffect(() => {
        if(show) getModels()
    }, [show]);

    const handleSelectedModel = (data) => {
        if(data) setModel(data.value)
    }

    // Update Password
    const [oldPassword, setOldPassword] = useState();
    const [newPassword, setNewPassword] = useState();
    const [repeatPassword, setRepeatPassword] = useState();
    
    const resetUpdateSubmit = async event => {
        event.preventDefault();
        try {
            setUserUpdateLoading(true)

          const responseData = await axios.post(
            `http://localhost:5000/networkserver/api/users/updatepassword`,
            JSON.stringify({
                oldpassword: oldPassword,
                newpassword: newPassword,
                repeatpassword: repeatPassword
            }),
            {
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: 'Bearer ' + auth.token
                }
            })

          if(responseData?.data?.status === true){
            handleClose()
            toast.success('Password updated!')
          }

          setUserUpdateLoading(false)
        } catch (err) {
            toast.error(err.response.data.message)
            setUserUpdateLoading(false)
        }
    };

    const [newEmail, setNewEmail] = useState('')
    const resetEmailSubmit = async (e) => {
        e.preventDefault();

        try {
            setUserUpdateLoading(true)

          const responseData = await axios.post(
            `http://localhost:5000/networkserver/api/users/updateemail`,
            JSON.stringify({
                newemail: newEmail,
            }),
            {
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: 'Bearer ' + auth.token
                }
            })

          if(responseData?.data?.message === 'success'){
            handleClose()
            toast.success('Email confirmation sended!')
          }

          setUserUpdateLoading(false)
        } catch (err) {
            toast.error(err.response.data.message)
            setUserUpdateLoading(false)
        }
    }

    return (
        <>
        <div className='userinfo-block'>
        <div className='user-info-block-arrow'></div>
        {isLoading && (
            <>
            <Skeleton type='userinfo' />
            </>
        )}

        {!isLoading && user && (
            <>
            <Modal show={show} onHide={handleClose} data-bs-theme={formatStyle}>
                <Modal.Header closeButton>
                <Modal.Title>Edit Profile</Modal.Title>
                </Modal.Header>
                <Modal.Body style={{ position: 'relative' }}>
                {userUpdateLoading && <LoadingSpinner asOverlay={true} />}
                    <Tabs
                    defaultActiveKey="general"
                    id="uncontrolled-tab-example"
                    fill
                    className="mb-3 custom-tabs"
                    >
                        <Tab eventKey="general" title={<i className="fa-solid fa-address-card"></i>}>
                            <Form onSubmit={handleSubmit} className='user-info-edit-modal-position'>
                                <Form.Group controlId="formImage" className="mb-3">
                                    <Form.Label>Profile Image</Form.Label>
                                    <Form.Control
                                    type="file"
                                    accept="image/jpeg, image/png, image/gif"
                                    onChange={handleImageChange}
                                    />
                                </Form.Group>

                                <Form.Group controlId="formUsername" className="mb-3">
                                    <Form.Label>Username</Form.Label>
                                    <Form.Control
                                        type="text"
                                        value={user.username}
                                        disabled
                                    />
                                </Form.Group>

                                <Form.Group controlId="formEmail" className="mb-3">
                                    <Form.Label>Email</Form.Label>
                                    <Form.Control
                                        type="email"
                                        value={user.email}
                                        disabled
                                    />
                                </Form.Group>

                                <Form.Group controlId="formName" className="mb-3">
                                    <Form.Label>Name</Form.Label>
                                    <Form.Control
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                    />
                                </Form.Group>

                                <Form.Group controlId="formDescription" className="mb-3">
                                    <Form.Label>Description</Form.Label>
                                    <Form.Control
                                        as="textarea"
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                    />
                                </Form.Group>

                                <Form.Group controlId="formModelSelect" className='mb-3'>
                                    <Form.Label>Model</Form.Label>
                                    <Row>
                                        <Col xl={10} xs={12}>
                                            <Select 
                                            options={modelList && modelList} 
                                            onChange={handleSelectedModel}
                                            styles={customStyles}  
                                            placeholder='Select avatar model...'   
                                            value={model && {
                                                value: model,
                                                label: model
                                            }}  
                                            />
                                        </Col>
                                        <Col xl={2} xs={12}>
                                            <img src={`/avatars/${model}/neutral.png`} className='img-fluid' style={{ maxHeight: '40px' }} />
                                        </Col>
                                    </Row>
                                </Form.Group>

                                <Button variant="outline-primary" className='custom-button-main' type="submit">
                                    Save Changes
                                </Button>
                            </Form>
                        </Tab>
                        <Tab eventKey="password" title={<i className="fa-solid fa-lock"></i>}>
                            <Form onSubmit={resetUpdateSubmit} className='user-info-edit-modal-position'>
                                <Form.Group className="mb-3" controlId="formBasicNew1">
                                    <Form.Label>Old Password</Form.Label>
                                    <Form.Control type="password" onChange={(e) => setOldPassword(e.target.value)} />
                                    <Form.Text className="text-muted">
                                    Minimum 6 characters!
                                    </Form.Text>
                                </Form.Group>

                                <Form.Group className="mb-3" controlId="formBasicNew2">
                                    <Form.Label>New Password</Form.Label>
                                    <Form.Control type="password" onChange={(e) => setNewPassword(e.target.value)} />
                                    <Form.Text className="text-muted">
                                    Minimum 6 characters!
                                    </Form.Text>
                                </Form.Group>

                                <Form.Group className="mb-3" controlId="formBasicRepeat">
                                    <Form.Label>Re-enter your new password</Form.Label>
                                    <Form.Control type="password" onChange={(e) => setRepeatPassword(e.target.value)} />
                                    <Form.Text className="text-muted">
                                    Minimum 6 characters!
                                    </Form.Text>
                                </Form.Group>

                                <Button variant="outline-primary" className='custom-button-main' type="submit">
                                Save Changes
                                </Button> 
                            </Form>
                        </Tab>
                        <Tab eventKey="email" title={<i className="fa-solid fa-envelope"></i>}>
                            <Form onSubmit={resetEmailSubmit} className='user-info-edit-modal-position'>
                                <Form.Group className="mb-3" controlId="formBasicNew3">
                                    <Form.Label>Old Email</Form.Label>
                                    <Form.Control type="email" value={user.email} disabled />
                                </Form.Group>

                                <Form.Group className="mb-3" controlId="formBasicNew4">
                                    <Form.Label>New Email</Form.Label>
                                    <Form.Control type="email" onChange={(e) => setNewEmail(e.target.value)} />
                                    <Form.Text className="text-muted">
                                    You will receive confirmation email here
                                    </Form.Text>
                                </Form.Group>

                                <Button variant="outline-primary" className='custom-button-main' type="submit">
                                Send
                                </Button> 
                            </Form>
                        </Tab>
                    </Tabs>
                </Modal.Body>
                <Modal.Footer>
                <Button variant="secondary" onClick={handleClose}>
                    Close
                </Button>
                </Modal.Footer>
            </Modal>

            <Row>
                <Col xl={4} xs={5}>
                    <div className='userinfo-avatar position-relative'>
                    {user.status === 1 && (
                        <div className='online-status'>
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="13" viewBox="0 0 14 13" fill="none">
                                <circle cx="7.04944" cy="6.63126" r="5.5226" fill="#37C63B" stroke="#0BA911" strokeWidth="1.10452"/>
                                </svg>
                        </div>
                    )}

                    <div className='userinfo-avatar-image'>
                    {user.avatar ? (
                        <>
                        <img src={`http://localhost:5000/networkserver/${user.avatar}`} className='img-fluid' style={{ maxHeight: '100px' }} alt='Avatar' />
                        </>
                    ) : (
                        <>
                        <img src={noavatarImage} className='img-fluid' style={{ maxHeight: '100px' }} alt='Avatar' />
                        </>
                    )}
                    </div>
                    </div>
                </Col>
                <Col xl={8} xs={7}>
                    <div className='userinfo-info'>
                        <h3>{user.name}</h3>
                        <p>@{user.username}</p>
                        <DropdownButton
                            as={ButtonGroup}
                            key={'bottom'}
                            id={`dropdown-button-drop-bottom`}
                            drop={'bottom'}
                            variant="primary"
                            className='no-style-button'
                            title={<img className='cog-userinfo-fill' src={cogIcon} width='16' height='16' />}
                            data-bs-theme={formatStyle}
                        >
                            <Dropdown.Item eventKey="1" onClick={handleShow}>Profile</Dropdown.Item>
                            <Dropdown.Item eventKey="2" onClick={() => auth.logout()}>Sign Out</Dropdown.Item>
                            <Dropdown.Divider />
                            <Dropdown.Item eventKey="4">About</Dropdown.Item>
                        </DropdownButton>
                    </div>
                </Col>
            </Row>
            </>
        )}
        </div>
        </>
    )
}

export default UserInfo;