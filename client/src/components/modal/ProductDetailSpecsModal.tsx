import { Button, Modal } from "react-bootstrap";
import type { ProductDetailResponse } from "../../../../common/types.common";
import { useRef } from "react";
import type { ModelPicked, VariationPicked } from "../../utils/types";
import {
  bytesToMB,
  convertUtcToLocalISOString,
  formatTime,
  safeString,
} from "../../../../common/utils.common";
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

export default function ProductDetailSpecsModal({
  productDetail,
  modelPicked,
  variationPicked,
  show,
  onHide,
}: Readonly<{
  productDetail: ProductDetailResponse;
  modelPicked: ModelPicked;
  variationPicked: VariationPicked;
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
                    <strong>Model:</strong> {modelPicked.model.name}
                  </div>
                  <div className="col-md-6">
                    <strong>Color:</strong>{" "}
                    <span className="d-inline-flex align-items-center">
                      <span
                        className="product-detail-color-circle--g"
                        style={{
                          backgroundColor: variationPicked.variation.color.hex,
                        }}
                      ></span>
                      {variationPicked.variation.color.name}
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
                        modelPicked.model.priceCents +
                        variationPicked.variation.additionalPriceCents
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
                      <td>{modelPicked.model.screen.display.displayType}</td>
                    </tr>
                    <tr>
                      <td>Screen Size</td>
                      <td>
                        {modelPicked.model.screen.display.diagonalSizeInch}"
                        diagonal
                      </td>
                    </tr>
                    <tr>
                      <td>Resolution</td>
                      <td>
                        {modelPicked.model.screen.resolution.wPx} x{" "}
                        {modelPicked.model.screen.resolution.hPx} pixels
                      </td>
                    </tr>
                    <tr>
                      <td>Brightness</td>
                      <td>
                        {modelPicked.model.screen.brightness.minNits} -{" "}
                        {modelPicked.model.screen.brightness.maxNits} nits
                      </td>
                    </tr>
                    <tr>
                      <td>Glass Material</td>
                      <td>
                        {safeString(modelPicked.model.screen.glassMaterial)}
                      </td>
                    </tr>
                    <tr>
                      <td>Bezel Material</td>
                      <td>
                        {safeString(modelPicked.model.screen.bezelMaterial)}
                      </td>
                    </tr>
                    <tr>
                      <td>Shape</td>
                      <td>
                        {modelPicked.model.screen.shape}
                        {modelPicked.model.screen.isCircular
                          ? " (Circular)"
                          : " (Rectangular)"}
                      </td>
                    </tr>
                    <tr>
                      <td>Screen Dimensions</td>
                      <td>
                        {modelPicked.model.screen.isCircular
                          ? `Ø ${modelPicked.model.screen.diameterMm}mm`
                          : `${modelPicked.model.screen.dimension.wMm}mm x ${modelPicked.model.screen.dimension.hMm}mm x ${modelPicked.model.screen.dimension.thicknessMm}mm`}
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
                      <td>{safeString(modelPicked.model.config.chipset)}</td>
                    </tr>
                    <tr>
                      <td>Operating System</td>
                      <td>
                        <span className="d-inline-flex align-items-center">
                          {modelPicked.model.config.os.logoUrl && (
                            <img
                              src={modelPicked.model.config.os.logoUrl}
                              alt={`${modelPicked.model.config.os.name} logo`}
                              style={{
                                width: "20px",
                                height: "20px",
                                marginRight: "8px",
                              }}
                            />
                          )}
                          {modelPicked.model.config.os.name}
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td>Memory (RAM)</td>
                      <td>
                        {bytesToMB(modelPicked.model.config.memory.ramBytes)}MB
                      </td>
                    </tr>
                    <tr>
                      <td>Storage</td>
                      <td>
                        {bytesToMB(
                          modelPicked.model.config.memory.storageBytes
                        )}
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
                      <td>{modelPicked.model.battery.capacityMah} mAh</td>
                    </tr>
                    <tr>
                      <td>Charging Type</td>
                      <td>
                        {safeString(modelPicked.model.battery.chargingType)}
                      </td>
                    </tr>
                    <tr>
                      <td>Full Charge Time</td>
                      <td>
                        {formatTime(
                          modelPicked.model.battery.timeFullChargeMin
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td>Battery Life (AOD On)</td>
                      <td>
                        {formatTime(
                          modelPicked.model.battery.timeOnline.aodOnMin
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td>Battery Life (AOD Off)</td>
                      <td>
                        {formatTime(
                          modelPicked.model.battery.timeOnline.aodOffMin
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td>Typical Usage</td>
                      <td>
                        {formatTime(
                          modelPicked.model.battery.timeOnline.typicalUsageMin
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td>Standby Time</td>
                      <td>
                        {formatTime(
                          modelPicked.model.battery.timeOnline.standByMin
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
                      <td>{safeString(modelPicked.model.caseMaterial)}</td>
                    </tr>
                    <tr>
                      <td>Weight</td>
                      <td>{modelPicked.model.watchWeightMg}g</td>
                    </tr>
                    <tr>
                      <td>Compatible Band Width</td>
                      <td>{modelPicked.model.compatibleBandLugWidthMm}mm</td>
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
                        {modelPicked.model.config.connectivities &&
                        modelPicked.model.config.connectivities.length > 0
                          ? modelPicked.model.config.connectivities.map(
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
                        {modelPicked.model.config.compatiblePhoneOs &&
                        modelPicked.model.config.compatiblePhoneOs.length > 0
                          ? modelPicked.model.config.compatiblePhoneOs.map(
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
                        {modelPicked.model.config.appsConnect &&
                        modelPicked.model.config.appsConnect.length > 0
                          ? modelPicked.model.config.appsConnect.map((app) => (
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
                        {modelPicked.model.config.sensors &&
                        modelPicked.model.config.sensors.length > 0
                          ? modelPicked.model.config.sensors.map((sensor) => (
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
                        {modelPicked.model.config.camera
                          ? `${modelPicked.model.config.camera.resolutionMp} MP`
                          : "None"}
                      </td>
                    </tr>
                    <tr>
                      <td>Features</td>
                      <td>
                        {modelPicked.model.config.camera?.features &&
                        modelPicked.model.config.camera.features.length > 0
                          ? modelPicked.model.config.camera.features.map(
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
                        {modelPicked.model.feature?.speakerAndMicrophone
                          ? "Yes"
                          : "No"}
                      </td>
                    </tr>
                    <tr>
                      <td>Water Resistance</td>
                      <td>
                        {modelPicked.model.feature?.waterResistance
                          ? modelPicked.model.feature.waterResistance.rating
                          : "No"}
                      </td>
                    </tr>
                    <tr>
                      <td>Health Features</td>
                      <td>
                        {modelPicked.model.feature?.utilities?.healths &&
                        modelPicked.model.feature.utilities.healths.length > 0
                          ? modelPicked.model.feature.utilities.healths.map(
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
                        {modelPicked.model.feature?.utilities?.sports &&
                        modelPicked.model.feature.utilities.sports.length > 0
                          ? modelPicked.model.feature.utilities.sports.map(
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
                        {modelPicked.model.feature?.utilities?.specials &&
                        modelPicked.model.feature.utilities.specials.length > 0
                          ? modelPicked.model.feature.utilities.specials.map(
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
                        {modelPicked.model.feature
                          ?.supportedAppsForNotifications &&
                        modelPicked.model.feature.supportedAppsForNotifications
                          .length > 0
                          ? modelPicked.model.feature.supportedAppsForNotifications.map(
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
                      <td>{variationPicked.variation.band.widthMm}mm</td>
                    </tr>
                    <tr>
                      <td>Lug Width</td>
                      <td>{variationPicked.variation.band.lugWidthMm}mm</td>
                    </tr>
                    <tr>
                      <td>Material</td>
                      <td>
                        {safeString(variationPicked.variation.band.material)}
                      </td>
                    </tr>
                    <tr>
                      <td>Clasp Type</td>
                      <td>
                        {safeString(variationPicked.variation.band.claspType)}
                      </td>
                    </tr>
                    <tr>
                      <td>Style</td>
                      <td>
                        {safeString(variationPicked.variation.band.style)}
                      </td>
                    </tr>
                    <tr>
                      <td>Adjustable Range</td>
                      <td>
                        {variationPicked.variation.band.adjustableRange.minMm}mm
                        - {variationPicked.variation.band.adjustableRange.maxMm}
                        mm
                      </td>
                    </tr>
                    <tr>
                      <td>Weight</td>
                      <td>{variationPicked.variation.band.weightMg}g</td>
                    </tr>
                    <tr>
                      <td>Quick Release</td>
                      <td>
                        {variationPicked.variation.band.quickRelease
                          ? "Yes"
                          : "No"}
                      </td>
                    </tr>
                    <tr>
                      <td>Water Resistant</td>
                      <td>
                        {variationPicked.variation.band.waterResistance
                          ? "Yes"
                          : "No"}
                      </td>
                    </tr>
                    <tr>
                      <td>Hypoallergenic</td>
                      <td>
                        {variationPicked.variation.band.hypoallergenic
                          ? "Yes"
                          : "No"}
                      </td>
                    </tr>
                    <tr>
                      <td>Band Colors</td>
                      <td>
                        {variationPicked.variation.band.colors.map(
                          (color, idx) => (
                            <span
                              key={`${color.hex}-${color.name}-${idx}`}
                              className="d-inline-flex align-items-center me-2"
                            >
                              <span
                                className="rounded-circle me-1"
                                style={{
                                  width: "12px",
                                  height: "12px",
                                  backgroundColor: color.hex,
                                  border: "1px solid #dee2e6",
                                }}
                              ></span>
                              {color.name}
                            </span>
                          )
                        )}
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
                        {
                          convertUtcToLocalISOString(
                            modelPicked.model.releaseDate
                          ).split("T")[0]
                        }
                      </td>
                    </tr>
                    {/* <tr>
                      <td>Stock Quantity</td>
                      <td>{variationPicked.variation.stockQuantity} units</td>
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
