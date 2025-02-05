import React, { useState, useContext, useEffect } from 'react';
import { AuthContext } from '../../context/auth-context';

import { Modal, Button, Form } from 'react-bootstrap';
import Select from 'react-select'

import { customStyles } from '../UIElements/SelectStyle';

import axios from 'axios';
import { toast } from 'react-toastify';

const InviteFriendsServer = ({ id, show, onClose }) => {
    const auth = useContext(AuthContext);

    const localTheme = localStorage.getItem('theme');
    const formatStyle = localTheme === 'dark-theme' ? 'dark' : 'white';  

    const handleClose = () => {
        onClose()
    }

    const [availableInvites, setAvailableInvites] = useState([])
    const [invitesLoading, setInvitesLoading] = useState(false)

    const getInvites = async () => {
        try {    
            setInvitesLoading(true)
            
            const response = await axios.get(
                `http://localhost:5000/networkserver/api/app/getserverinvites/${id}`,
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + auth.token, 
                    }
                }
            );
    
            const inviteOptions = response.data.invites.map(invite => ({
                value: invite,
                label: invite,
            }));


            setAvailableInvites(inviteOptions);
            setInvitesLoading(false)
        } catch (err) {
            setInvitesLoading(false)
            toast.error(err.response?.data?.message || 'An error occurred');
        } 
    };

    useEffect(( ) => {
        if(show) getInvites()
    }, [show]);

    const [invites, setInvites] = useState([])
    const handleSelectedInvites = (value) => {
        setInvites(value)
    }

    const sendInvites = async (e) => {
        e.preventDefault();

        try {
            const response = await axios.post(
                'http://localhost:5000/networkserver/api/app/sendserverinvites',
                {
                    invites: invites,
                    server: id
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + auth.token, 
                    }
                }
            );
    
            if (response.data.message === 'success') {
                onClose()
            }
              
        } catch (err) {
            toast.error(err.response?.data?.message || 'An error occurred');
        }
    }


    return (
        <>
        <Modal show={show} onHide={handleClose} data-bs-theme={formatStyle}>
            <Modal.Header closeButton>
            <Modal.Title>Invite Friends</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                {invitesLoading && <p>Loading...</p>}
                {!invitesLoading && availableInvites && availableInvites.length > 0 && (
                    <>
                    <Form onSubmit={sendInvites}>
                    <div className='select-friends'>
                        <Select 
                        options={availableInvites && availableInvites} 
                        onChange={handleSelectedInvites}
                        isOptionDisabled={() => invites && invites.length >= 10}
                        isMulti         
                        styles={customStyles}  
                        placeholder='Invite...'      
                        />

                        <center>
                        <Button variant='success' type='submit' className='mt-2'>Add</Button>
                        </center>
                    </div>
                    </Form>
                    </>
                )}

                {!invitesLoading && availableInvites && availableInvites.length === 0 && (
                    <>No available invitations</>
                )}
            </Modal.Body>
            <Modal.Footer>
            <Button variant="secondary" onClick={handleClose}>
                Close
            </Button>
            </Modal.Footer>
        </Modal>
        </>
    )
}

export default InviteFriendsServer;