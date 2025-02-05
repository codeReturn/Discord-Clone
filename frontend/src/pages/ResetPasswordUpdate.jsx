import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

import { Container, Row, Col, Form, Button } from 'react-bootstrap';

import { toast } from 'react-toastify';

import LoadingSpinner from '../shared/components/UIElements/LoadingSpinner';

import logoImage from '../images/logo.png'

import axios from 'axios';

const ResetPasswordUpdate = () => {
    const link = useParams().link;

    const [isLoading, setIsLoading] = useState(false)

    const [updated, setUpdated] = useState(false);
    const [infoMessage, setInfoMessage] = useState();
    const [finished, setFinished] = useState(false)

    const fetchInfo = async () => {
      try {
        setIsLoading(true)

        const response = await axios.get(
            `http://localhost:5000/networkserver/api/users/getlink/${link}`
        )

        if(response.data.message === 'expired' || response.data.message === 'finished' || response.data.message === 'updated') {
          window.location.href = '/'
        }
        setInfoMessage(response.data.message);
        setIsLoading(false)
      } catch (err) {
        setIsLoading(false)
        toast.error(err.response?.data?.message || 'An error occurred');
      }     
    }

    useEffect(() => {
      fetchInfo()
    }, [link]);

    const [newPassword, setNewPassword] = useState();
    const [repeatPassword, setRepeatPassword] = useState();
    
    const resetUpdateSubmit = async event => {
        event.preventDefault();
        try {
          setIsLoading(true)
          const response = await axios.post(
            'https://san-company.com/polarserver/api/users/resetpasswordupdate',
            {
                newpassword: newPassword,
                repeatpassword: repeatPassword,
                link: link
            },
            {
              'Content-Type': 'application/json'
            }
          );

          if(response.data.message === 'updated'){
            toast.success('Password updated!')
            setUpdated(true);
            setFinished(true)
            window.location.href = '/login'
          }

          setIsLoading(false)
        } catch (err) {
          setIsLoading(false)
          toast.error(err.response?.data?.message || 'An error occurred');
        }
    };

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
                    <h1>Update Password</h1>

                    <hr />

                    <Form onSubmit={resetUpdateSubmit}>

                    <Form.Group className="mb-3" controlId="formBasicNew">
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

                    <Button variant="primary" disabled={finished} type="submit" className="w-100">
                    Update
                    </Button>
                    </Form>

                </div>
            </Col>
        </Row>
        </div>
    </Container>
    </>
    );
};

export default ResetPasswordUpdate;