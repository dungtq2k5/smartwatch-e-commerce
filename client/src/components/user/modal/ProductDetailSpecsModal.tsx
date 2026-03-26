import { Button, Modal } from "react-bootstrap";
import type {
  ModelVariationResponse,
  ProductDetailsResponse,
  ProductModelResponse,
} from "../../../../../common/types.common";
import { useRef } from "react";
import {
  bytesToMB,
  formatMinTime,
  safeString,
} from "../../../../../common/utils.common";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faDisplay,
  faMicrochip,
  faBatteryHalf,
  faRuler,
  faWifi,
  faEye,
  faCamera,
  faHeart,
  faClock,
  faCalendarAlt,
} from "@fortawesome/free-solid-svg-icons";
import type { ItemPicked } from "../../../utils/types";

export default function ProductDetailSpecsModal({
  productDetail,
  modelPicked,
  variationPicked,
  show,
  onHide,
}: Readonly<{
  productDetail: ProductDetailsResponse;
  modelPicked: ItemPicked<ProductModelResponse>;
  variationPicked: ItemPicked<ModelVariationResponse>;
  show: boolean;
  onHide: () => void;
}>) {
  // Console log for development
  const renderCount = useRef(0);
  renderCount.current += 1;
  console.log("ProductDetailSpecsModal render count:", renderCount.current);

  return (
    <Modal show={show} onHide={onHide} centered size="lg">
      <Modal.Header closeButton>
        <Modal.Title>Product Specifications</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {!modelPicked || !variationPicked ? (
          <div className="text-center">
            <p className="text-muted">No specifications available.</p>
          </div>
        ) : (
          <div className="row g-4">
            {/* Product Overview */}
            <div className="col-12">
              <div className="border rounded p-3 mb-4">
                <h3 className="h5 fw-semibold mb-3">{productDetail.name}</h3>
                <div className="row g-3">
                  <div className="col-md-6">
                    <strong>Model:</strong> {modelPicked.data.name}
                  </div>
                  <div className="col-md-6 d-flex align-items-center gap-2">
                    <strong>Color:</strong>{" "}
                    <span className="d-inline-flex align-items-center gap-1">
                      <span
                        className="product-detail-color-circle--g"
                        style={{
                          backgroundColor: variationPicked.data.color.hex,
                        }}
                      ></span>
                      {variationPicked.data.color.name}
                    </span>
                  </div>
                  <div className="col-md-6">
                    <strong>Brand:</strong> {productDetail.brand.name}
                  </div>
                  <div className="col-md-6">
                    <strong>Category:</strong> {productDetail.category.name}
                  </div>
                  {/* <div className="col-md-6">
                    <strong>Base Price:</strong>{" "}
                    {centsToUSD(productDetail.basePriceCents)}
                  </div>
                  <div className="col-md-6">
                    <strong>Total Price:</strong>{" "}
                    {centsToUSD(
                      productDetail.basePriceCents +
                        modelPicked.data.priceCents +
                        variationPicked.data.additionalPriceCents
                    )}
                  </div> */}
                </div>
              </div>
            </div>

            {/* Technical Specifications */}
            <div className="col-12">
              <h4 className="h6 fw-semibold mb-3">Technical Specifications</h4>
              <div className="table-responsive">
                <table className="table table-striped product-detail-specs-table--g">
                  <tbody>
                    {/* Display & Screen */}
                    <tr>
                      <th
                        colSpan={2}
                        className="table-light border border-bottom"
                      >
                        <FontAwesomeIcon icon={faDisplay} className="me-2" />
                        <strong>Display & Screen</strong>
                      </th>
                    </tr>
                    <tr>
                      <td>Display Type</td>
                      <td>{modelPicked.data.screen.display.displayType}</td>
                    </tr>
                    <tr>
                      <td>Screen Size</td>
                      <td>
                        {modelPicked.data.screen.display.diagonalSizeInch}"
                        diagonal
                      </td>
                    </tr>
                    <tr>
                      <td>Resolution</td>
                      <td>
                        {modelPicked.data.screen.resolution.wPx} x{" "}
                        {modelPicked.data.screen.resolution.hPx} pixels
                      </td>
                    </tr>
                    <tr>
                      <td>Brightness</td>
                      <td>
                        {modelPicked.data.screen.brightness.minNits} -{" "}
                        {modelPicked.data.screen.brightness.maxNits} nits
                      </td>
                    </tr>
                    <tr>
                      <td>Glass Material</td>
                      <td>
                        {safeString(modelPicked.data.screen.glassMaterial)}
                      </td>
                    </tr>
                    <tr>
                      <td>Bezel Material</td>
                      <td>
                        {safeString(modelPicked.data.screen.bezelMaterial)}
                      </td>
                    </tr>
                    <tr>
                      <td>Shape</td>
                      <td>
                        {modelPicked.data.screen.shape}
                        {modelPicked.data.screen.isCircular
                          ? " (Circular)"
                          : " (Rectangular)"}
                      </td>
                    </tr>
                    <tr>
                      <td>Screen Dimensions</td>
                      <td>
                        {modelPicked.data.screen.isCircular
                          ? `Ø ${modelPicked.data.screen.diameterMm}mm`
                          : `${modelPicked.data.screen.dimension.wMm}mm x ${modelPicked.data.screen.dimension.hMm}mm x ${modelPicked.data.screen.dimension.thicknessMm}mm`}
                      </td>
                    </tr>
                    <tr>
                      <td>Refresh Rate</td>
                      <td>
                        {modelPicked.data.screen.refreshRateHz
                          ? modelPicked.data.screen.refreshRateHz + " Hz"
                          : "N/A"}
                      </td>
                    </tr>

                    {/* Performance */}
                    <tr>
                      <th colSpan={2} className="table-light border-bottom">
                        <FontAwesomeIcon icon={faMicrochip} className="me-2" />
                        <strong>Performance</strong>
                      </th>
                    </tr>
                    <tr>
                      <td>Chipset</td>
                      <td>{safeString(modelPicked.data.config.chipset)}</td>
                    </tr>
                    <tr>
                      <td>Operating System</td>
                      <td>
                        <span className="d-inline-flex align-items-center">
                          {modelPicked.data.config.os.logoUrl && (
                            <img
                              src={modelPicked.data.config.os.logoUrl}
                              alt={`${modelPicked.data.config.os.name} logo`}
                              className="os-logo--g me-2"
                            />
                          )}
                          {modelPicked.data.config.os.name}
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td>Memory (RAM)</td>
                      <td>
                        {bytesToMB(modelPicked.data.config.memory.ramBytes)}MB
                      </td>
                    </tr>
                    <tr>
                      <td>Storage</td>
                      <td>
                        {bytesToMB(modelPicked.data.config.memory.storageBytes)}
                        MB
                      </td>
                    </tr>

                    {/* Battery */}
                    <tr>
                      <th colSpan={2} className="table-light border-bottom">
                        <FontAwesomeIcon
                          icon={faBatteryHalf}
                          className="me-2"
                        />
                        <strong>Battery</strong>
                      </th>
                    </tr>
                    <tr>
                      <td>Capacity</td>
                      <td>{modelPicked.data.battery.capacityMah} mAh</td>
                    </tr>
                    <tr>
                      <td>Charging Type</td>
                      <td>
                        {safeString(modelPicked.data.battery.chargingType)}
                      </td>
                    </tr>
                    <tr>
                      <td>Full Charge Time</td>
                      <td>
                        {formatMinTime(
                          modelPicked.data.battery.timeFullChargeMin
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td>Battery Life (AOD On)</td>
                      <td>
                        {formatMinTime(
                          modelPicked.data.battery.timeOnline.aodOnMin
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td>Battery Life (AOD Off)</td>
                      <td>
                        {formatMinTime(
                          modelPicked.data.battery.timeOnline.aodOffMin
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td>Typical Usage</td>
                      <td>
                        {formatMinTime(
                          modelPicked.data.battery.timeOnline.typicalUsageMin
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td>Standby Time</td>
                      <td>
                        {formatMinTime(
                          modelPicked.data.battery.timeOnline.standByMin
                        )}
                      </td>
                    </tr>

                    {/* Physical Design */}
                    <tr>
                      <th colSpan={2} className="table-light border-bottom">
                        <FontAwesomeIcon icon={faRuler} className="me-2" />
                        <strong>Physical Design</strong>
                      </th>
                    </tr>
                    <tr>
                      <td>Case Material</td>
                      <td>{safeString(modelPicked.data.caseMaterial)}</td>
                    </tr>
                    <tr>
                      <td>Weight</td>
                      <td>{modelPicked.data.watchWeightMg}g</td>
                    </tr>
                    <tr>
                      <td>Compatible Band Width</td>
                      <td>{modelPicked.data.compatibleBandLugWidthMm}mm</td>
                    </tr>

                    {/* Connectivity */}
                    <tr>
                      <th colSpan={2} className="table-light border-bottom">
                        <FontAwesomeIcon icon={faWifi} className="me-2" />
                        <strong>Connectivity</strong>
                      </th>
                    </tr>
                    <tr>
                      <td>Connectivity Options</td>
                      <td>
                        {modelPicked.data.config.connectivities &&
                        modelPicked.data.config.connectivities.length > 0
                          ? modelPicked.data.config.connectivities.map(
                              (conn) => (
                                <span
                                  key={conn}
                                  className="badge bg-secondary text-light product-detail-specs-badge--g"
                                >
                                  {conn}
                                </span>
                              )
                            )
                          : "None"}
                      </td>
                    </tr>
                    <tr>
                      <td>Compatible Phone OS</td>
                      <td>
                        {modelPicked.data.config.compatiblePhoneOs &&
                        modelPicked.data.config.compatiblePhoneOs.length > 0
                          ? modelPicked.data.config.compatiblePhoneOs.map(
                              (os) => (
                                <span
                                  key={os}
                                  className="badge bg-secondary text-light product-detail-specs-badge--g"
                                >
                                  {os}
                                </span>
                              )
                            )
                          : "None"}
                      </td>
                    </tr>
                    <tr>
                      <td>Compatible Apps</td>
                      <td>
                        {modelPicked.data.config.appsConnect &&
                        modelPicked.data.config.appsConnect.length > 0
                          ? modelPicked.data.config.appsConnect.map((app) => (
                              <span
                                key={app}
                                className="badge bg-success text-light product-detail-specs-badge--g"
                              >
                                {app}
                              </span>
                            ))
                          : "None"}
                      </td>
                    </tr>

                    {/* Sensors */}
                    <tr>
                      <th colSpan={2} className="table-light border-bottom">
                        <FontAwesomeIcon icon={faEye} className="me-2" />
                        <strong>Sensors</strong>
                      </th>
                    </tr>
                    <tr>
                      <td>Built-in Sensors</td>
                      <td>
                        {modelPicked.data.config.sensors &&
                        modelPicked.data.config.sensors.length > 0
                          ? modelPicked.data.config.sensors.map((sensor) => (
                              <span
                                key={sensor}
                                className="badge bg-info text-dark product-detail-specs-badge--g"
                              >
                                {sensor}
                              </span>
                            ))
                          : "None"}
                      </td>
                    </tr>

                    {/* Camera */}
                    <tr>
                      <th colSpan={2} className="table-light border-bottom">
                        <FontAwesomeIcon icon={faCamera} className="me-2" />
                        <strong>Camera</strong>
                      </th>
                    </tr>
                    <tr>
                      <td>Resolution</td>
                      <td>
                        {modelPicked.data.config.camera
                          ? `${modelPicked.data.config.camera.resolutionMp} MP`
                          : "None"}
                      </td>
                    </tr>
                    <tr>
                      <td>Features</td>
                      <td>
                        {modelPicked.data.config.camera?.features &&
                        modelPicked.data.config.camera.features.length > 0
                          ? modelPicked.data.config.camera.features.map(
                              (feature) => (
                                <span
                                  key={feature}
                                  className="badge bg-dark text-light product-detail-specs-badge--g"
                                >
                                  {feature}
                                </span>
                              )
                            )
                          : "None"}
                      </td>
                    </tr>

                    {/* Features */}
                    <tr>
                      <th colSpan={2} className="table-light border-bottom">
                        <FontAwesomeIcon icon={faHeart} className="me-2" />
                        <strong>Features</strong>
                      </th>
                    </tr>
                    <tr>
                      <td>Speaker & Microphone</td>
                      <td>
                        {modelPicked.data.feature?.speakerAndMicrophone
                          ? "Yes"
                          : "No"}
                      </td>
                    </tr>
                    <tr>
                      <td>Water Resistance</td>
                      <td>
                        {modelPicked.data.feature?.waterResistance
                          ? modelPicked.data.feature.waterResistance.rating
                          : "No"}
                      </td>
                    </tr>
                    <tr>
                      <td>Health Features</td>
                      <td>
                        {modelPicked.data.feature?.utilities?.healths &&
                        modelPicked.data.feature.utilities.healths.length > 0
                          ? modelPicked.data.feature.utilities.healths.map(
                              (health) => (
                                <span
                                  key={health}
                                  className="badge bg-success text-light product-detail-specs-badge--g"
                                >
                                  {health}
                                </span>
                              )
                            )
                          : "None"}
                      </td>
                    </tr>
                    <tr>
                      <td>Sports Features</td>
                      <td>
                        {modelPicked.data.feature?.utilities?.sports &&
                        modelPicked.data.feature.utilities.sports.length > 0
                          ? modelPicked.data.feature.utilities.sports.map(
                              (sport) => (
                                <span
                                  key={sport}
                                  className="badge bg-warning text-dark product-detail-specs-badge--g"
                                >
                                  {sport}
                                </span>
                              )
                            )
                          : "None"}
                      </td>
                    </tr>
                    <tr>
                      <td>Special Features</td>
                      <td>
                        {modelPicked.data.feature?.utilities?.specials &&
                        modelPicked.data.feature.utilities.specials.length > 0
                          ? modelPicked.data.feature.utilities.specials.map(
                              (special) => (
                                <span
                                  key={special}
                                  className="badge bg-info text-dark product-detail-specs-badge--g"
                                >
                                  {special}
                                </span>
                              )
                            )
                          : "None"}
                      </td>
                    </tr>
                    <tr>
                      <td>Notification Support</td>
                      <td>
                        {modelPicked.data.feature
                          ?.supportedAppsForNotifications &&
                        modelPicked.data.feature.supportedAppsForNotifications
                          .length > 0
                          ? modelPicked.data.feature.supportedAppsForNotifications.map(
                              (app) => (
                                <span
                                  key={app}
                                  className="badge bg-secondary text-light product-detail-specs-badge--g"
                                >
                                  {app}
                                </span>
                              )
                            )
                          : "None"}
                      </td>
                    </tr>

                    {/* Band Information */}
                    <tr>
                      <th colSpan={2} className="table-light border-bottom">
                        <FontAwesomeIcon icon={faClock} className="me-2" />
                        <strong>Band Information</strong>
                      </th>
                    </tr>
                    <tr>
                      <td>Band Width</td>
                      <td>{variationPicked.data.band.widthMm}mm</td>
                    </tr>
                    <tr>
                      <td>Lug Width</td>
                      <td>{variationPicked.data.band.lugWidthMm}mm</td>
                    </tr>
                    <tr>
                      <td>Material</td>
                      <td>{safeString(variationPicked.data.band.material)}</td>
                    </tr>
                    <tr>
                      <td>Clasp Type</td>
                      <td>{safeString(variationPicked.data.band.claspType)}</td>
                    </tr>
                    <tr>
                      <td>Style</td>
                      <td>{safeString(variationPicked.data.band.style)}</td>
                    </tr>
                    <tr>
                      <td>Adjustable Range</td>
                      <td>
                        {variationPicked.data.band.adjustableRange.minMm}mm -{" "}
                        {variationPicked.data.band.adjustableRange.maxMm}
                        mm
                      </td>
                    </tr>
                    <tr>
                      <td>Weight</td>
                      <td>{variationPicked.data.band.weightMg}g</td>
                    </tr>
                    <tr>
                      <td>Quick Release</td>
                      <td>
                        {variationPicked.data.band.quickRelease ? "Yes" : "No"}
                      </td>
                    </tr>
                    <tr>
                      <td>Water Resistant</td>
                      <td>
                        {variationPicked.data.band.waterResistance
                          ? "Yes"
                          : "No"}
                      </td>
                    </tr>
                    <tr>
                      <td>Hypoallergenic</td>
                      <td>
                        {variationPicked.data.band.hypoallergenic
                          ? "Yes"
                          : "No"}
                      </td>
                    </tr>
                    <tr>
                      <td>Band Colors</td>
                      <td>
                        {variationPicked.data.band.colors.map((color, idx) => (
                          <span
                            key={`${color.hex}-${color.name}-${idx}`}
                            className="d-inline-flex align-items-center me-2"
                          >
                            <span
                              className="rounded-circle me-1"
                              style={{
                                width: ".75em",
                                height: ".75em",
                                backgroundColor: color.hex,
                                border: "1px solid #dee2e6",
                              }}
                            ></span>
                            {color.name}
                          </span>
                        ))}
                      </td>
                    </tr>

                    {/* Release Information */}
                    <tr>
                      <th colSpan={2} className="table-light border-bottom">
                        <FontAwesomeIcon
                          icon={faCalendarAlt}
                          className="me-2"
                        />
                        <strong>Release Information</strong>
                      </th>
                    </tr>
                    <tr>
                      <td>Release Date</td>
                      <td>
                        {new Date(
                          modelPicked.data.releaseDate
                        ).toLocaleDateString()}
                      </td>
                    </tr>
                    {/* <tr>
                      <td>Stock Quantity</td>
                      <td>{variationPicked.data.stockQuantity} units</td>
                    </tr> */}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </Modal.Body>

      <Modal.Footer>
        <Button type="button" variant="secondary" onClick={onHide}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
