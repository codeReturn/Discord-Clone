import React from "react";
import ContentLoader from "react-content-loader";
import { Row, Col } from 'react-bootstrap';

const Skeleton = (props) => {
  const localTheme = localStorage.getItem('theme');
  
  const bgColor = localTheme === 'dark-theme' ? '#000' : '#f3f3f3';
  const fgColor = localTheme === 'dark-theme' ? '#21409c' : '#ecebeb';

  return (
    <>
      {props.type === 'userinfo' ? (
          <Row>
            <Col xl={3} xs={12}>
                <ContentLoader
                    speed={2}
                    backgroundColor={bgColor}  
                    foregroundColor={fgColor}   
                    width="100%"                
                    height="90"               
                    {...props}
                >
                <rect x="0" y="4" rx="4" ry="4" width="100%" height="90" />
                </ContentLoader>
            </Col>
            <Col xl={9} xs={12}>
                <ContentLoader
                    speed={2}
                    backgroundColor={bgColor}  
                    foregroundColor={fgColor}   
                    width="100%"                
                    height="90"               
                    {...props}
                >
                <rect x="0" y="3" rx="4" ry="4" width="100%" height="25" />
                <rect x="0" y="35" rx="4" ry="4" width="100%" height="25" />
                <rect x="0" y="65" rx="4" ry="4" width="100%" height="25" />
                </ContentLoader>
            </Col>
          </Row>
      ) : props.type === 'list' ? (
        <>
          <Row>
            <Col xl={12} xs={12}>
                <ContentLoader
                    speed={2}
                    backgroundColor={bgColor}  
                    foregroundColor={fgColor}   
                    width="100%"                
                    height="500"               
                    {...props}
                >
                <rect x="0" y="3" rx="4" ry="4" width="100%" height="80" />
                <rect x="0" y="100" rx="4" ry="4" width="100%" height="80" />
                <rect x="0" y="200" rx="4" ry="4" width="100%" height="80" />
                <rect x="0" y="300" rx="4" ry="4" width="100%" height="80" />
                <rect x="0" y="400" rx="4" ry="4" width="100%" height="80" />
                <rect x="0" y="500" rx="4" ry="4" width="100%" height="80" />
                </ContentLoader>
            </Col>
          </Row>
        </>
      ) : props.type === 'list-messages' ? (
        <>
          <Row>
            <Col xl={12} xs={12}>
                <ContentLoader
                    speed={2}
                    backgroundColor={bgColor}  
                    foregroundColor={fgColor}   
                    width="100%"                
                    height="800"               
                    {...props}
                >
                <rect x="0" y="3" rx="4" ry="4" width="100%" height="80" />
                <rect x="0" y="100" rx="4" ry="4" width="100%" height="80" />
                <rect x="0" y="200" rx="4" ry="4" width="100%" height="80" />
                <rect x="0" y="300" rx="4" ry="4" width="100%" height="80" />
                <rect x="0" y="400" rx="4" ry="4" width="100%" height="80" />
                <rect x="0" y="500" rx="4" ry="4" width="100%" height="80" />
                <rect x="0" y="600" rx="4" ry="4" width="100%" height="80" />
                <rect x="0" y="700" rx="4" ry="4" width="100%" height="80" />
                <rect x="0" y="800" rx="4" ry="4" width="100%" height="80" />
                <rect x="0" y="900" rx="4" ry="4" width="100%" height="80" />
                <rect x="0" y="1000" rx="4" ry="4" width="100%" height="80" />
                </ContentLoader>
            </Col>
          </Row>
        </>
      ) : null}
    </>
  );
}

export default Skeleton;
