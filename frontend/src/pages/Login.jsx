import { useState, useContext, useEffect } from 'react';

import { Container, Row, Col, Button, Form } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';

import { AuthContext } from '../shared/context/auth-context';

import logoImage from '../images/logo.png';

import axios from 'axios';

import { toast } from 'react-toastify';

import LoadingSpinner from '../shared/components/UIElements/LoadingSpinner';

import Applications from '../shared/components/Display/Applications';

const Login = () => {
    const auth = useContext(AuthContext);
    
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [remember, setRemember] = useState(false)

    const [isLoading, setIsLoading] = useState(false)

    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();

        if(!username || !password) {
            toast.error('All fields are required!')
            return;
        }
    
        try {
            setIsLoading(true)

            const response = await axios.post(
                'http://localhost:5000/networkserver/api/users/login',
                {
                    username: username,
                    password: password,
                    rememberme: remember
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                    }
                }
            );
    
            if(response.data.message === 'success') {
                auth.login(response.data.userId, response.data.token, response.data.expirationDate);
                // navigate('/');
            }

            setIsLoading(false)
        } catch (err) {
            setIsLoading(false)
            toast.error(err.response?.data?.message || 'An error occurred');
        }
    };

    return (
        <>
        {isLoading && <LoadingSpinner asOverlay={true} />}

        <Container>
            <div className='auth-block'>
            <Row>
                <Col md={{ span: 6, offset: 3 }}>
                    <div className='mb-3 text-center'>
                        <img src={logoImage} className='img-fluid' loading='lazy' style={{ maxHeight: '100px' }} alt='Egg Logo' />
                    </div>

                    <div className='main-block'>
                        <h1>LOGIN</h1>

                        <div className='custom-space-auth-line'></div>

                        <Form onSubmit={handleLogin}>
                            <Form.Group className="mb-3" controlId="loginForm.ControlInputUsername">
                                <Form.Label>Username</Form.Label>
                                <Form.Control type="text" value={username} onChange={(e) => setUsername(e.target.value)} />
                            </Form.Group>
                            <Form.Group className="mb-3" controlId="loginForm.ControlInputPassword">
                                <Link to='/resetpassword' className='reset-pass-link'>Reset password?</Link>

                                <Form.Label>Password</Form.Label>
                                <Form.Control type="password" onChange={(e) => setPassword(e.target.value)} />
                            </Form.Group>
                            <Form.Group className="mb-3">
                            <Link to='/register' className='float-end'>Create Account</Link>

                            <Form.Check
                                type={'checkbox'}
                                id={`default-checkbox`}
                                label={`Remember me`}
                                onChange={(e) => setRemember(e.target.checked)}
                            />
                            </Form.Group>
                            
                            <center>
                            <Button variant='primary' type='submit'className='w-100 mb-3'> Sign In </Button>

                            <Link to='/register'>
                                <button variant='secondary' className='w-100 custom-secondary'>Create a account</button>
                            </Link>

                            </center>
                        </Form>

                        <div className='custom-space-auth-line'></div>

                        <Applications />
                    </div>
                </Col>
            </Row>
            </div>
        </Container>
        </>
    )
}

export default Login;