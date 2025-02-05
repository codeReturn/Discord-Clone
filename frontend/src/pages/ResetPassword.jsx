import React, { useState } from 'react';
import { Link } from 'react-router-dom';

import { Container, Row, Col, Form, Button } from 'react-bootstrap';

import { toast } from 'react-toastify';

import axios from 'axios';

import LoadingSpinner from '../shared/components/UIElements/LoadingSpinner';

import logoImage from '../images/logo.png';

const ResetPassword = () => {
    const [isLoading , setIsLoading] = useState(false)
    const [email, setEmail] = useState();
    const [finished, setFinished] = useState(false)

    const submitReset = async (event) => {
        event.preventDefault();

        if(!email){
            toast.error("Email cant be empty!")
            return;
        }

        try {
            setIsLoading(true)

            const response = await axios.post(
              'http://localhost:5000/networkserver/api/users/resetpassword',
              {
                email: email
              },
              {
                'Content-Type': 'application/json'
              }
            );
            
            if(response.data.message === "success"){
                toast.success('We have successfully sent you an email with instructions.')
                setFinished(true)
            }

            setIsLoading(false)
          } catch (err) {
            setIsLoading(false)
            toast.error(err.response?.data?.message || 'An error occurred');
          }   
    }

    return (
        <>
        {isLoading && <LoadingSpinner asOverlay />}

        <Container>
            <div className='auth-block'>
            <Row>
                <Col md={{ span: 6, offset: 3 }}>
                    <div className='mb-3 text-center'>
                        <img src={logoImage} className='img-fluid' loading='lazy' style={{ maxHeight: '100px' }} alt='Egg Logo' />
                    </div>

                    <div className='main-block'>
                        <h1>Reset Password</h1>

                        <div className='custom-space-auth-line'></div>

                        <Form onSubmit={submitReset}>

                        <Form.Group className="mb-3" controlId="formBasicEmail">
                            <Form.Label>Email</Form.Label>
                            <Form.Control type="email" className="form-block-custominput" defaultValue={email} placeholder="Enter your email address!" onChange={(e) => setEmail(e.target.value)} />
                        </Form.Group>

                        <center>
                        <Button variant='primary' disabled={finished} type='submit'className='w-100 mb-3'> SEND </Button>

                        <Link to='/login'>
                            <button variant='secondary' className='w-100 custom-secondary'>Login</button>
                        </Link>
                        </center>

                        </Form>
                    </div>
                </Col>
            </Row>
            </div>
        </Container>
        </>
    )
}

export default ResetPassword;