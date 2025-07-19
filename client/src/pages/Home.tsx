import "bootstrap/dist/css/bootstrap.min.css";

export default function Home() {
  return (
    <main className="container container--center--g">
      <div className="row p-4 pb-0 pe-lg-0 pt-lg-5 align-items-center rounded-3 border shadow-lg">
        <div className="col-lg-7 p-3 p-lg-5 pt-lg-3">
          <h1 className="display-4 fw-bold lh-1">Your perfect smartwatch is here</h1>
          <p className="lead">
            Quickly design and customize responsive mobile-first sites with Bootstrap, the world’s most popular front-end open source toolkit, featuring Sass variables and mixins, responsive grid system, extensive prebuilt components, and powerful JavaScript plugins.
          </p>
          <div className="d-grid gap-2 d-md-flex justify-content-md-start mb-4 mb-lg-3">
            <button type="button" className="btn btn-primary btn-lg px-4 me-md-2 fw-bold">
              Primary
            </button>
            <button type="button" className="btn btn-outline-secondary btn-lg px-4">
              Default
            </button>
          </div>
        </div>
        <div className="col-lg-4 offset-lg-1 p-0 overflow-hidden shadow-lg">
          <img
            className="rounded-lg-3"
            src="https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=1999&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
            alt=""
            width="720"
          />
        </div>
      </div>
    </main>
  );
}
