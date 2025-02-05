import React from 'react';

import loaderAnimation from '../../../images/loader-animation.gif'

const LoadingSpinner = props => {
  return (
    <div className={`${props.asOverlay && 'loading-spinner__overlay'}`}>
        <img src={loaderAnimation} className='img-fluid' style={{ maxHeight: "200px" }} />
    </div>
  );
};

export default LoadingSpinner;
