import React from 'react';

function Paginate({ totalArticles, page, setPage, maxButtons, maxPerPage }) {
    const maxBtnNumber = Number(maxButtons)
    const maxResults = Number(maxPerPage)
    const lastPage = Math.ceil(totalArticles / maxResults)
    return (
        <>
            {
                totalArticles > maxResults &&
                <center>
                <nav aria-label="Pagination">    
                    <ul className="pagination custompag"> 
                    {
                        page !== 1 && <li className="page-item"><a className="page-link" onClick={() => setPage(1)}> <i className="fa fa-caret-left"></i> <i className="fa fa-caret-left"></i> </a> </li>
                    }
                    {
                        page !== 1 && <li className="page-item"><a className="page-link" onClick={() => setPage(page - 1)} > <i className="fa fa-caret-left"></i> </a> </li>
                    }
                    {
                        [...Array(maxBtnNumber + 1)].map((button, i) => (
                            (page - maxBtnNumber + i) < page && (page - maxBtnNumber + i) > 0 && <li className="page-item" key={i + Date.now()}><a className="page-link" onClick={() => setPage(page - maxButtons + i)}>{page - maxButtons + i}</a> </li>
                        ))
                    }
                    <li className="page-item"><a className="page-link active">{page}</a></li>
                    {
                        [...Array(maxBtnNumber)].map((button, i) => (
                            (page + i + 1) <= lastPage && <li className="page-item" key={i + Date.now()}><a className="page-link" onClick={() => setPage(page + i + 1)}>{page + i + 1}</a> </li>
                        ))
                    }
                    {
                        page !== lastPage && <li className="page-item"><a className="page-link" onClick={() => setPage(page + 1)} > <i className="fa fa-caret-right"></i> </a></li>
                    }
                    {
                        page !== lastPage && <li className="page-item"><a className="page-link" onClick={() => setPage(lastPage)}> <i className="fa fa-caret-right"></i> <i className="fa fa-caret-right"></i> </a> </li>
                    }
                    </ul> 
                </nav>     
                </center>   
            }
        </>
    )
}
export default Paginate;
