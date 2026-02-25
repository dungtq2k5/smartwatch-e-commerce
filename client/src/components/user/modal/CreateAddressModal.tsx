import { Button, Modal } from "react-bootstrap";
import { provinces } from "../../../../../common/vnAddresses";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AddressFormData } from "../../../utils/types";
import {
  capFirstLetter,
  formatError,
  getCityProvince,
  getDistrict,
  getDistrictsByProvinceCode,
  getWard,
  getWardsByDistrictCode,
  isValidGeneralName,
  isValidVnPhoneNumber,
  isValidGeneralAddress,
} from "../../../../../common/utils.common";
import useUserAddressStore from "../../../store/user/addressStore";
import type { UserAddressCreate } from "../../../../../common/types.common";
import toast from "react-hot-toast";
import debounce from "lodash.debounce";
import AddressMapInput from "../../common/AddressMapInput";
import { VN_COUNTRY_CODE } from "../../../../../common/configs.common";
import {
  DEFAULT_USER_ADDRESS_FORM_DATA,
  WAITING_EMOJI,
} from "../../../configs";
import Btn from "../../common/Btn";
import useCustomJsApiLoader from "../../../hooks/admin/useCustomJsApiLoader";
import { getGeocodeAddress } from "../../../utils/utils";
import InvalidMsg from "../../common/InvalidInputMsg";

const CreateAddressModal = memo(
  ({
    isFirstAddress,
    show,
    onHide,
    onSuccess,
  }: Readonly<{
    isFirstAddress: boolean;
    show: boolean;
    onHide: () => void;
    onSuccess?: (newAddressId: string) => void;
  }>) => {
    // DEV temp for testing
    const renderCount = useRef(0);
    renderCount.current += 1;
    console.log("CreateAddressModal render count:", renderCount.current);

    const { createAddress } = useUserAddressStore();

    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

    const { isLoaded: isMapLoaded } = useCustomJsApiLoader();

    const [formData, setFormData] = useState<AddressFormData>({
      ...DEFAULT_USER_ADDRESS_FORM_DATA,
      isDefault: isFirstAddress,
    });

    const mapRef = useRef<google.maps.Map | undefined>(undefined);

    const handleClose = useCallback((): void => {
      setFormData({
        ...DEFAULT_USER_ADDRESS_FORM_DATA,
        isDefault: isFirstAddress,
      });
      onHide();
    }, [onHide, isFirstAddress]);

    const onMapLoad = useCallback((map: google.maps.Map) => {
      mapRef.current = map;
    }, []);

    const geocodeAddress = useCallback(
      (addressData: AddressFormData): void => {
        if (!isMapLoaded || !mapRef.current) return;

        const provinceName = getCityProvince(
          addressData.cityProvinceCode,
        )?.name_with_type;
        const districtName = getDistrict(
          addressData.districtCode,
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

        getGeocodeAddress(
          addressString,
          (lat, lng) => {
            setFormData((prev) => ({
              ...prev,
              location: [lat, lng],
            }));
            mapRef.current?.panTo({ lat, lng });
          },
          (error) => {
            console.error(error);
          },
        );
      },
      [isMapLoaded],
    );

    const debouncedGeocode = useMemo(() => {
      return debounce(geocodeAddress, 1000);
    }, [geocodeAddress]);

    useEffect(() => {
      if (formData.street.val) debouncedGeocode(formData);

      // Remove formData if don't want infinite loop
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
        const lat = e.latLng.lat();
        const lng = e.latLng.lng();
        setFormData((prev) => ({
          ...prev,
          location: [lat, lng],
        }));
      }
    }, []);

    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>): void => {
        if (isSubmitting) return;
        const { name, value: val } = e.target;

        if (e.target.tagName === "INPUT") {
          if (name === "isDefault") {
            setFormData((prev) => ({
              ...prev,
              isDefault: (e.target as HTMLInputElement).checked,
            }));
            return;
          }

          let err = undefined;
          if (!val) {
            err = `${capFirstLetter(name)} is required`;
          } else if (name === "name" && !isValidGeneralName(val)) {
            err = "Full name is invalid";
          } else if (name === "phoneNumber" && !isValidVnPhoneNumber(val)) {
            err = "Phone number is invalid";
          } else if (
            name === "apartmentNumber" &&
            !isValidGeneralAddress(val)
          ) {
            err = "Apartment/Building number is invalid";
          } else if (name === "street" && !isValidGeneralAddress(val)) {
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
      [isSubmitting],
    );

    const handleSubmit = useCallback(
      async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
        e.preventDefault();
        if (isSubmitting) {
          toast("Submission is in progress. Please wait.", {
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
          } else if (!isValidGeneralName(newFormData.name.val)) {
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
          } else if (!isValidGeneralAddress(newFormData.apartmentNumber.val)) {
            newFormData.apartmentNumber.err =
              "Apartment/Building number is invalid";
            allValid = false;
          }
          if (!newFormData.street.val) {
            newFormData.street.err = "Street address is required";
            allValid = false;
          } else if (!isValidGeneralAddress(newFormData.street.val)) {
            newFormData.street.err = "Street address is invalid";
            allValid = false;
          }

          setFormData(newFormData);
          return allValid;
        };

        if (validateForm()) {
          const addressData: UserAddressCreate = {
            name: formData.name.val,
            phoneNumber: formData.phoneNumber.val,
            apartmentNumber: formData.apartmentNumber.val,
            street: formData.street.val,
            cityProvinceCode: formData.cityProvinceCode,
            districtCode: formData.districtCode,
            wardCode: formData.wardCode,
            countryCode: VN_COUNTRY_CODE,
            location: {
              latitude: formData.location[0],
              longitude: formData.location[1],
            },
            isDefault: formData.isDefault,
          };

          setIsSubmitting(true);
          try {
            const newAddress = await createAddress(addressData);
            onSuccess?.(newAddress.id);
            handleClose();
            toast.success("Address created successfully!");
          } catch (error) {
            toast.error(formatError(error));
          } finally {
            setIsSubmitting(false);
          }
        }
      },
      [createAddress, formData, handleClose, isSubmitting, onSuccess],
    );

    return (
      <Modal show={show} onHide={handleClose} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Add New Address</Modal.Title>
        </Modal.Header>

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
                  {formData.name.err && <InvalidMsg msg={formData.name.err} />}
                </div>
              </div>

              {/* Phone number */}
              <div className="col-md-6">
                <div className="form-floating">
                  <input
                    type="tel"
                    inputMode="numeric"
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
                    <InvalidMsg msg={formData.phoneNumber.err} />
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
                      formData.cityProvinceCode,
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
                      ),
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
                    <InvalidMsg msg={formData.street.err} />
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
                    <InvalidMsg msg={formData.apartmentNumber.err} />
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
            {!isFirstAddress && (
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
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Btn
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
              loading={isSubmitting}
            >
              Create address
            </Btn>
          </Modal.Footer>
        </form>
      </Modal>
    );
  },
);

export default CreateAddressModal;
