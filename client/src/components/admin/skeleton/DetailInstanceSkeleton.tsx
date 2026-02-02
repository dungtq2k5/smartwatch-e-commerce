import { memo } from "react";
import { Placeholder } from "react-bootstrap";

const DetailInstanceSkeleton = memo(() => {
  return (
    <Placeholder as="div" animation="glow" className="container-fluid p-0">
      <div className="mb-4">
        <Placeholder as="h1" className="w-50" style={{ height: "38px" }} />
      </div>

      <div className="row g-4">
        {/* Left Column */}
        <div className="col-12 col-xl-4 col-md-5">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-header bg-white py-3">
               <Placeholder as="h2" className="fs-5 mb-0 w-50">
                 <Placeholder xs={12} />
              </Placeholder>
            </div>
            <div className="card-body">
              {[1, 2, 3, 4, 5].map((i) => (
                <div className="mb-3" key={i}>
                  <Placeholder as="span" className="d-block w-25 mb-1">
                    <Placeholder xs={12} />
                  </Placeholder>
                  <Placeholder xs={8} />
                </div>
              ))}
              <hr className="opacity-25" />
               <div className="row">
                 <div className="col-6 mb-3">
                    <Placeholder as="span" className="d-block w-50 mb-1"><Placeholder xs={12} /></Placeholder>
                    <Placeholder xs={10} />
                 </div>
                 <div className="col-6 mb-3">
                    <Placeholder as="span" className="d-block w-50 mb-1"><Placeholder xs={12} /></Placeholder>
                    <Placeholder xs={10} />
                 </div>
               </div>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="col-12 col-xl-8 col-md-7">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-header bg-white py-3 d-flex justify-content-between">
               <Placeholder as="h2" className="fs-5 mb-0 w-25"><Placeholder xs={12}/></Placeholder>
               <Placeholder className="rounded-pill" style={{width: '80px', height: '24px'}} />
            </div>
            <div className="card-body">
               <div className="mt-2">
                 {[1, 2, 3].map(i => (
                    <div key={i} className="pb-4">
                      <div className="d-flex justify-content-between mb-2">
                         <Placeholder xs={4} />
                         <Placeholder xs={2} />
                      </div>
                      <div className="card border p-3">
                         <Placeholder as="p" animation="glow">
                            <Placeholder xs={8} /> <br/>
                            <Placeholder xs={6} />
                         </Placeholder>
                      </div>
                    </div>
                 ))}
               </div>
            </div>
          </div>
        </div>
      </div>
    </Placeholder>
  );
});

export default DetailInstanceSkeleton;
