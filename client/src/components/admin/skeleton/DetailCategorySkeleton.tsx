import { memo } from "react";
import { Placeholder } from "react-bootstrap";

const DetailCategorySkeleton = memo(() => {
  return (
    <Placeholder as="div" animation="glow">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <Placeholder as="h1" className="w-50" style={{ height: "38px" }} />
         <Placeholder.Button style={{ width: "120px" }} />
      </div>

      <div className="row justify-content-center">
        <div className="col-lg-10">
          <div className="card shadow-sm mb-4">
            <div className="card-header">
               <Placeholder as="h2" className="fs-5 mb-0 w-25"><Placeholder xs={12} /></Placeholder>
            </div>
            <div className="card-body">
              <div className="row mb-0">
                <div className="col-sm-3"><Placeholder xs={8} /></div>
                <div className="col-sm-9"><Placeholder xs={10} /></div>
              </div>
              <div className="row mt-3">
                 <div className="col-sm-3"><Placeholder xs={8} /></div>
                 <div className="col-sm-9"><Placeholder xs={12} /></div>
              </div>
            </div>
          </div>

          <div className="card shadow-sm mb-4">
            <div className="card-header">
               <Placeholder as="h2" className="fs-5 mb-0 w-25"><Placeholder xs={12} /></Placeholder>
            </div>
            <div className="card-body">
              <div className="row">
                 {[1, 2, 3, 4].map(i => (
                   <div className="col-md-6 mb-3" key={i}>
                       <Placeholder as="span" className="w-25 d-block mb-1"><Placeholder xs={12}/></Placeholder>
                       <Placeholder as="p" className="w-75"><Placeholder xs={12}/></Placeholder>
                   </div>
                 ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      
       <div className="d-flex justify-content-end">
        <Placeholder.Button variant="secondary" style={{ width: "80px" }} />
      </div>
    </Placeholder>
  );
});

export default DetailCategorySkeleton;
