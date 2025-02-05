import React from 'react';
import { Col, Row } from 'react-bootstrap';

import androidIcon from '../../../images/icons/logos_android.svg';
import windowsIcon from '../../../images/icons/logos_microsoft.svg'

const Applications = () => {
    return (
        <>
        <Row>
            <Col xl={6} xs={12}>
                <a href='https://eggofficial.san-company.com/apps/desktop.exe' target='_blank'>
                <div className='app-dl-block text-center'>
                    <img src={windowsIcon} className='img-fluid' />
                </div>
                </a>
            </Col>
            <Col xl={6} xs={12}>
                <a href='https://eggofficial.san-company.com/apps/mobile.apk' target='_blank'>
                <div className='app-dl-block text-center'>
                    <img src={androidIcon} className='img-fluid' />
                </div>
                </a>
            </Col>
        </Row>
        </>
    )
}

export default Applications;