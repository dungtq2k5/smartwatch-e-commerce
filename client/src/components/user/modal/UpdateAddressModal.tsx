import { Button, Modal } from "react-bootstrap";
import { provinces } from "../../../../../common/vnAddresses";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AddressFormData } from "../../../utils/types";
import {
  formatError,
  getCityProvince,
  getDistrict,
  getDistrictsByProvinceCode,
  getWard,
  getWardsByDistrictCode,
  isValidUserFullName,
  isValidVnPhoneNumber,
  removeOddSpaces,
} from "../../../../../common/utils.common";
import { faTriangleExclamation } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import useUserAddressStore from "../../../store/user/addressStore";
import type {
  UserSelfAddressResponse,
  UserAddressUpdate,
} from "../../../../../common/types.common";
import toast from "react-hot-toast";
import { useJsApiLoader } from "@react-google-maps/api";
import debounce from "lodash.debounce";
import Loading from "../../common/Loading";
import ApiError from "../../common/ApiError";
import AddressMapInput from "../../user/AddressMapInput";
import { WAITING_EMOJI } from "../../../configs";

type Process = {
  isProcessing: boolean;
  isFetching: boolean;
  isUpdating: boolean;
};

const UpdateAddressModal = memo(
  ({
    isOnlyOneAddress,
    addressId, // Only show when addressId is provided
    onHide,
    onSuccess,
  }: Readonly<{
    isOnlyOneAddress: boolean;
    addressId?: string;
    onHide: () => void;
    onSuccess?: (updatedAddressId: string) => void;
  }>) => {
    // DEV temp for testing
    const renderCount = useRef(0);
    renderCount.current += 1;
    console.log("UpdateAddressModal render count:", renderCount.current);

    const { fetchAddress, updateAddress } = useUserAddressStore();

    const [address, setAddress] = useState<UserSelfAddressResponse | undefined>(
      undefined
    );

    const [process, setProcess] = useState<Process>({
      isProcessing: false,
      isFetching: false,
      isUpdating: false,
    });
    const [apiErr, setApiErr] = useState<string | null>(null);

    const [formData, setFormData] = useState<AddressFormData>({
      name: { val: "" },
      phoneNumber: { val: "" },
      apartmentNumber: { val: "" },
      street: { val: "" },
      cityProvinceCode: "",
      districtCode: "",
      wardCode: "",
      location: [106.6297, 10.8231], // Default to Ho Chi Minh City
      isDefault: isOnlyOneAddress,
    });

    useEffect(() => {
      if (addressId) {
        const handleSetAddress = async (): Promise<void> => {
          setProcess((prev) => ({
            ...prev,
            isProcessing: true,
            isFetching: true,
          }));
          setApiErr(null);

          try {
            const addressRes = await fetchAddress(addressId);
            setAddress(addressRes);
            setFormData({
              name: { val: addressRes.name },
              phoneNumber: { val: addressRes.phoneNumber },
              apartmentNumber: { val: addressRes.apartmentNumber },
              street: { val: addressRes.street },
              cityProvinceCode: addressRes.cityProvinceCode,
              districtCode: addressRes.districtCode,
              wardCode: addressRes.wardCode,
              location: [
                addressRes.location.coordinates[0],
                addressRes.location.coordinates[1],
              ],
              isDefault: addressRes.isDefault,
            });
          } catch (error) {
            setApiErr(formatError(error));
          } finally {
            setProcess((prev) => ({
              ...prev,
              isProcessing: false,
              isFetching: false,
            }));
          }
        };

        handleSetAddress();
        return;
      }

      setTimeout(() => {
        setAddress(undefined);
        setApiErr(null);
        setFormData({
          name: { val: "" },
          phoneNumber: { val: "" },
          apartmentNumber: { val: "" },
          street: { val: "" },
          cityProvinceCode: "",
          districtCode: "",
          wardCode: "",
          location: [106.6297, 10.8231],
          isDefault: isOnlyOneAddress,
        });
      }, 200); // Delay to allow modal to close before resetting

      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [addressId, isOnlyOneAddress]);

    const { isLoaded: isMapLoaded } = useJsApiLoader({
      id: "google-map-script",
      googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    });

    const mapRef = useRef<google.maps.Map | undefined>(undefined);

    const onMapLoad = useCallback((map: google.maps.Map) => {
      mapRef.current = map;
    }, []);

    const geocodeAddress = useCallback(
      (addressData: AddressFormData) => {
        if (!isMapLoaded || !mapRef.current) return;

        const provinceName = getCityProvince(
          addressData.cityProvinceCode
        )?.name_with_type;
        const districtName = getDistrict(
          addressData.districtCode
        )?.name_with_type;
        const wardName = getWard(addressData.wardCode)?.name_with_type;

        const addressString = [
          addressData.street.val,
          wardName,
          districtName,
          provinceName,
          "Vietnam",
        ]
          .filter(Boolean)
          .join(", ");

        if (!addressString) return;

        const geocoder = new google.maps.Geocoder();
        geocoder.geocode({ address: addressString }, (results, status) => {
          if (status === "OK" && results?.[0]) {
            const location = results[0].geometry.location;
            const lng = location.lng();
            const lat = location.lat();

            setFormData((prev) => ({
              ...prev,
              location: [lng, lat],
            }));
            mapRef.current?.panTo({ lng, lat });
          } else {
            console.error(
              "Geocode was not successful for the following reason:",
              status
            );
          }
        });
      },
      [isMapLoaded]
    );

    const debouncedGeocode = useMemo(() => {
      return debounce(geocodeAddress, 1000);
    }, [geocodeAddress]);

    useEffect(() => {
      if (formData.street.val) debouncedGeocode(formData);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
      formData.street.val,
      formData.wardCode,
      formData.districtCode,
      formData.cityProvinceCode,
      debouncedGeocode,
    ]);

    const handleMapMarkerDrag = useCallback((e: google.maps.MapMouseEvent) => {
      if (e.latLng) {
        const lng = e.latLng.lng();
        const lat = e.latLng.lat();
        setFormData((prev) => ({
          ...prev,
          location: [lng, lat],
        }));
      }
    }, []);

    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>): void => {
        if (process.isProcessing) return;

        const { name, value: val } = e.target;

        if (e.target.tagName === "INPUT") {
          if (name === "isDefault") {
            setFormData((prev) => ({
              ...prev,
              isDefault: (e.target as HTMLInputElement).checked,
            }));
            return;
          }

          let err = "";
          if (!val) {
            err = `${name} is required`;
          } else if (name === "name" && !isValidUserFullName(val)) {
            err = "Full name is invalid";
          } else if (name === "phoneNumber" && !isValidVnPhoneNumber(val)) {
            err = "Phone number is invalid";
          } else if (name === "apartmentNumber" && !removeOddSpaces(val)) {
            err = "Apartment/Building number is invalid";
          } else if (name === "street" && !removeOddSpaces(val)) {
            err = "Street address is invalid";
          }

          setFormData((prev) => ({
            ...prev,
            [name]: {
              val,
              err,
            },
          }));
          return;
        }

        // City/Province -> District -> Ward
        if (e.target.tagName === "SELECT") {
          if (name === "cityProvinceCode") {
            const districtCode = getDistrictsByProvinceCode(val).data[0].code;

            setFormData((prev) => ({
              ...prev,
              cityProvinceCode: val,
              districtCode,
              wardCode: getWardsByDistrictCode(districtCode).data[0].code,
            }));
            return;
          }

          if (name === "districtCode") {
            setFormData((prev) => ({
              ...prev,
              districtCode: val,
              wardCode: getWardsByDistrictCode(val).data[0].code,
            }));
            return;
          }

          if (name === "wardCode") {
            setFormData((prev) => ({
              ...prev,
              wardCode: val,
            }));
            return;
          }
        }
      },
      [process.isProcessing]
    );

    const handleSubmit = useCallback(
      async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
        e.preventDefault();
        if (process.isProcessing) {
          toast("Another action is in progress. Please wait.", {
            icon: WAITING_EMOJI,
          });
          return;
        }

        const validateForm = (): boolean => {
          let allValid = true;
          const newFormData: AddressFormData = { ...formData };

          if (!newFormData.name.val) {
            newFormData.name.err = "Full name is required";
            allValid = false;
          } else if (!isValidUserFullName(newFormData.name.val)) {
            newFormData.name.err = "Full name is invalid";
            allValid = false;
          }
          if (!newFormData.phoneNumber.val) {
            newFormData.phoneNumber.err = "Phone number is required";
            allValid = false;
          } else if (!isValidVnPhoneNumber(newFormData.phoneNumber.val)) {
            newFormData.phoneNumber.err = "Phone number is invalid";
            allValid = false;
          }
          if (!newFormData.apartmentNumber.val) {
            newFormData.apartmentNumber.err =
              "Apartment/Building number is required";
            allValid = false;
          } else if (!removeOddSpaces(newFormData.apartmentNumber.val)) {
            newFormData.apartmentNumber.err =
              "Apartment/Building number is invalid";
            allValid = false;
          }
          if (!newFormData.street.val) {
            newFormData.street.err = "Street address is required";
            allValid = false;
          } else if (!removeOddSpaces(newFormData.street.val)) {
            newFormData.street.err = "Street address is invalid";
            allValid = false;
          }

          setFormData(newFormData);
          return allValid;
        };

        if (validateForm() && address) {
          const getChangedData = (): UserAddressUpdate => {
            const changedData: UserAddressUpdate = {};
            if (formData.name.val !== address.name)
              changedData.name = formData.name.val;
            if (formData.phoneNumber.val !== address.phoneNumber)
              changedData.phoneNumber = formData.phoneNumber.val;
            if (formData.apartmentNumber.val !== address.apartmentNumber)
              changedData.apartmentNumber = formData.apartmentNumber.val;
            if (formData.street.val !== address.street)
              changedData.street = formData.street.val;
            if (formData.cityProvinceCode !== address.cityProvinceCode)
              changedData.cityProvinceCode = formData.cityProvinceCode;
            if (formData.districtCode !== address.districtCode)
              changedData.districtCode = formData.districtCode;
            if (formData.wardCode !== address.wardCode)
              changedData.wardCode = formData.wardCode;
            if (formData.isDefault !== address.isDefault)
              changedData.isDefault = formData.isDefault;
            if (
              formData.location[0] !== address.location.coordinates[0] ||
              formData.location[1] !== address.location.coordinates[1]
            ) {
              changedData.location = {
                longitude: formData.location[0],
                latitude: formData.location[1],
              };
            }
            return changedData;
          };

          const addressData = getChangedData();

          if (Object.keys(addressData).length === 0) {
            toast.success("No changes detected. No update needed.");
            return;
          }

          setProcess((prev) => ({
            ...prev,
            isProcessing: true,
            isUpdating: true,
          }));
          try {
            const updatedAddress = await updateAddress(addressData, address.id);
            onSuccess?.(updatedAddress.id);
            onHide();
            toast.success("Address updated successfully!");
          } catch (error) {
            toast.error(formatError(error));
          } finally {
            setProcess((prev) => ({
              ...prev,
              isProcessing: false,
              isUpdating: false,
            }));
          }
        }
      },
      [
        process.isProcessing,
        address,
        formData,
        updateAddress,
        onSuccess,
        onHide,
      ]
    );

    return (
      <Modal show={!!addressId} onHide={onHide} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Update Address</Modal.Title>
        </Modal.Header>

        {process.isFetching ? (
          <Loading loadingMsg="Loading address details..." />
        ) : apiErr ? (
          <div className="p-4">
            <ApiError errMsg={apiErr} />
          </div>
        ) : !address ? (
          <div className="p-4">
            <ApiError errMsg="Could not load address data." />
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <Modal.Body>
              <div className="row g-3">
                {/* Name */}
                <div className="col-md-6">
                  <div className="form-floating">
                    <input
                      type="text"
                      className="form-control"
                      id="name"
                      name="name"
                      placeholder="John Doe"
                      value={formData.name.val}
                      onChange={handleChange}
                      autoComplete="name"
                    />
                    <label htmlFor="name">Full name</label>
                    {formData.name.err && (
                      <div className="text-danger small mt-1">
                        <FontAwesomeIcon
                          icon={faTriangleExclamation}
                          className="me-2"
                        />
                        {formData.name.err}
                      </div>
                    )}
                  </div>
                </div>

                {/* Phone number */}
                <div className="col-md-6">
                  <div className="form-floating">
                    <input
                      type="tel"
                      className="form-control"
                      id="phoneNumber"
                      name="phoneNumber"
                      placeholder="1234567890"
                      value={formData.phoneNumber.val}
                      onChange={handleChange}
                      autoComplete="tel"
                    />
                    <label htmlFor="phoneNumber">Phone number</label>
                    {formData.phoneNumber.err && (
                      <div className="text-danger small mt-1">
                        <FontAwesomeIcon
                          icon={faTriangleExclamation}
                          className="me-2"
                        />
                        {formData.phoneNumber.err}
                      </div>
                    )}
                  </div>
                </div>

                {/* City/Province */}
                <div className="col-12">
                  <div className="form-floating">
                    <select
                      className="form-select"
                      name="cityProvinceCode"
                      id="cityProvinceCode"
                      onChange={handleChange}
                      value={formData.cityProvinceCode}
                    >
                      {provinces.data.map((province) => (
                        <option key={province.code} value={province.code}>
                          {province.name_with_type}
                        </option>
                      ))}
                    </select>
                    <label htmlFor="cityProvinceCode">City/Province</label>
                  </div>
                </div>

                {/* District */}
                <div className="col-md-6">
                  <div className="form-floating">
                    <select
                      className="form-select"
                      name="districtCode"
                      id="districtCode"
                      onChange={handleChange}
                      value={formData.districtCode}
                    >
                      {getDistrictsByProvinceCode(
                        formData.cityProvinceCode
                      ).data.map((district) => (
                        <option key={district.code} value={district.code}>
                          {district.name_with_type}
                        </option>
                      ))}
                    </select>
                    <label htmlFor="districtCode">District</label>
                  </div>
                </div>

                {/* Ward */}
                <div className="col-md-6">
                  <div className="form-floating">
                    <select
                      className="form-select"
                      name="wardCode"
                      id="wardCode"
                      onChange={handleChange}
                      value={formData.wardCode}
                    >
                      {getWardsByDistrictCode(formData.districtCode).data.map(
                        (ward) => (
                          <option key={ward.code} value={ward.code}>
                            {ward.name_with_type}
                          </option>
                        )
                      )}
                    </select>
                    <label htmlFor="wardCode">Ward</label>
                  </div>
                </div>

                {/* Street */}
                <div className="col-12">
                  <div className="form-floating">
                    <input
                      type="text"
                      className="form-control"
                      id="street"
                      name="street"
                      placeholder="123 Main St"
                      value={formData.street.val}
                      onChange={handleChange}
                    />
                    <label htmlFor="street">Street</label>
                    {formData.street.err && (
                      <div className="text-danger small mt-1">
                        <FontAwesomeIcon
                          icon={faTriangleExclamation}
                          className="me-2"
                        />
                        {formData.street.err}
                      </div>
                    )}
                  </div>
                </div>

                {/* Apartment/Building */}
                <div className="col-12">
                  <div className="form-floating">
                    <input
                      type="text"
                      className="form-control"
                      id="apartmentNumber"
                      name="apartmentNumber"
                      placeholder="Apartment 123/Building 456"
                      value={formData.apartmentNumber.val}
                      onChange={handleChange}
                    />
                    <label htmlFor="apartmentNumber">Apartment/Building</label>
                    {formData.apartmentNumber.err && (
                      <div className="text-danger small mt-1">
                        <FontAwesomeIcon
                          icon={faTriangleExclamation}
                          className="me-2"
                        />
                        {formData.apartmentNumber.err}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Map Section */}
              <AddressMapInput
                isMapLoaded={isMapLoaded}
                location={formData.location}
                onMapLoad={onMapLoad}
                onMarkerDragEnd={handleMapMarkerDrag}
              />

              {/* Default address checkbox */}
              {!isOnlyOneAddress && (
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="isDefault"
                    name="isDefault"
                    onChange={handleChange}
                    checked={formData.isDefault}
                  />
                  <label className="form-check-label" htmlFor="isDefault">
                    Set as default address
                  </label>
                </div>
              )}
            </Modal.Body>

            <Modal.Footer>
              <Button
                type="button"
                variant="secondary"
                onClick={onHide}
                disabled={process.isProcessing}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={process.isProcessing}
              >
                {process.isUpdating ? (
                  <>
                    <span
                      className="spinner-border spinner-border-sm me-2"
                      aria-hidden="true"
                    ></span>
                    <output>Updating address...</output>
                  </>
                ) : (
                  "Update address"
                )}
              </Button>
            </Modal.Footer>
          </form>
        )}
      </Modal>
    );
  }
);

export default UpdateAddressModal;
