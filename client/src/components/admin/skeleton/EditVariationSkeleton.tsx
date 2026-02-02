import { memo } from "react";
import { Placeholder } from "react-bootstrap";

const EditVariationSkeleton = memo(() => {
  return (
    <Placeholder as="div" animation="glow">
      <div className="mb-4">
        <Placeholder as="h1" className="w-50" style={{ height: "38px" }} />
      </div>

      <div className="row">
        {/* Left Column */}
        <div className="col-lg-8">
          <div className="card shadow-sm mb-4">
            <div className="card-header">
             <Placeholder as="h2" className="fs-5 mb-0 w-25"><Placeholder xs={12} /></Placeholder>
            </div>
            <div className="card-body">
               <div className="mb-3"><Placeholder xs={12} style={{ height: "38px", marginTop: "24px" }} /></div>
               <div className="mb-3"><Placeholder xs={12} style={{ height: "38px", marginTop: "24px" }} /></div>
               <div className="row">
                 <div className="col-md-6 mb-3"><Placeholder xs={12} style={{ height: "38px", marginTop: "24px" }} /></div>
                 <div className="col-md-6 mb-3"><Placeholder xs={12} style={{ height: "38px", marginTop: "24px" }} /></div>
               </div>
            </div>
          </div>

          <div className="card shadow-sm mb-4">
            <div className="card-header">
               <Placeholder as="h2" className="fs-5 mb-0 w-25"><Placeholder xs={12} /></Placeholder>
            </div>
             <div className="card-body">
                 <div className="row">
                   <div className="col-md-6 mb-3"><Placeholder xs={12} style={{ height: "38px", marginTop: "24px" }} /></div>
                   <div className="col-md-6 mb-3"><Placeholder xs={12} style={{ height: "38px", marginTop: "24px" }} /></div>
                 </div>
                 <div className="row">
                   <div className="col-md-6 mb-3"><Placeholder xs={12} style={{ height: "38px", marginTop: "24px" }} /></div>
                   <div className="col-md-6 mb-3"><Placeholder xs={12} style={{ height: "38px", marginTop: "24px" }} /></div>
                 </div>
                 <div className="mb-3"><Placeholder xs={12} style={{ height: "38px", marginTop: "24px" }} /></div>
                 <div className="mb-3"><Placeholder xs={12} style={{ height: "38px", marginTop: "24px" }} /></div>
             </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="col-lg-4">
           {/* Images */}
           <div className="card shadow-sm mb-4">
             <div className="card-header">
              <Placeholder as="h2" className="fs-5 mb-0 w-50">
                 <Placeholder xs={12} />
              </Placeholder>
            </div>
            <div className="card-body">
                 <div className="row g-2">
                    {[1, 2, 3].map(i => <div key={i} className="col-4"><Placeholder className="w-100" style={{height: '80px'}}/></div>)}
                 </div>
                 <Placeholder className="w-100 mt-3" style={{height: '38px'}} />
            </div>
          </div>

          {/* Status */}
           <div className="card shadow-sm mb-4">
             <div className="card-header">
              <Placeholder as="h2" className="fs-5 mb-0 w-50">
                 <Placeholder xs={12} />
              </Placeholder>
            </div>
            <div className="card-body">
                {[1, 2, 3, 4, 5].map(i => <div key={i} className="mb-3"><Placeholder xs={12} style={{height: '38px', marginTop: '24px'}} /></div>)}
            </div>
          </div>
        </div>
      </div>

       <div className="d-flex justify-content-end gap-2 mt-4">
        <Placeholder.Button variant="secondary" style={{ width: "80px" }} />
        <Placeholder.Button variant="primary" style={{ width: "80px" }} />
      </div>
    </Placeholder>
  );
});

export default EditVariationSkeleton;
