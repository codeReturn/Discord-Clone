import { useState, useContext } from 'react';

import { Container, Row, Col, Button, Form } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';

import { AuthContext } from '../shared/context/auth-context';

import logoImage from '../images/logo.png';

import axios from 'axios';

import { toast } from 'react-toastify';

import LoadingSpinner from '../shared/components/UIElements/LoadingSpinner';

import Applications from '../shared/components/Display/Applications';

const Register = () => {
    const auth = useContext(AuthContext);

    const queryParameters = new URLSearchParams(window.location.search)
    const server = queryParameters.get("server")
    
    const [username, setUsername] = useState('')
    const [email, setEmail] = useState('')
    const [name, setName] = useState('')
    const [password, setPassword] = useState('')

    const [isLoading, setIsLoading] = useState(false)

    const navigate = useNavigate();

    const handleRegister = async (e) => {
        e.preventDefault();

        if(!username || !email || !name || !password) {
            toast.error('All fields are required!')
            return;
        }
    
        try {
            setIsLoading(true)

            const response = await axios.post(
                'http://localhost:5000/networkserver/api/users/signup',
                {
                    username: username,
                    email: email,
                    name: name,
                    password: password,
                    server: server
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                    }
                }
            );
    
            if(response.data.message === 'success') {
                toast.success('Registration succesfull. Confirmation email sent!');
                navigate('/');
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
                        <h1>Create Account</h1>

                        <div className='custom-space-auth-line'></div>

                        <Form onSubmit={handleRegister}>
                            <Form.Group className="mb-3" controlId="loginForm.ControlInputUsername">
                                <Form.Label>Username</Form.Label>
                                <Form.Control type="text" value={username} onChange={(e) => setUsername(e.target.value)} />
                            </Form.Group>
                            <Form.Group className="mb-3" controlId="loginForm.ControlInputEmail">
                                <Form.Label>Email</Form.Label>
                                <Form.Control type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                            </Form.Group>
                            <Form.Group className="mb-3" controlId="loginForm.ControlInputName">
                                <Form.Label>Name</Form.Label>
                                <Form.Control type="text" value={name} onChange={(e) => setName(e.target.value)} />
                            </Form.Group>
                            <Form.Group className="mb-3" controlId="loginForm.ControlInputPassword">
                                <Form.Label>Password</Form.Label>
                                <Form.Control type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
                            </Form.Group>

                            <center>
                            <Button variant='primary' type='submit'className='w-100 mb-3'> Sign Up </Button>

                            <Link to='/login'>
                                <button variant='secondary' className='w-100 custom-secondary'>Login</button>
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

export default Register;