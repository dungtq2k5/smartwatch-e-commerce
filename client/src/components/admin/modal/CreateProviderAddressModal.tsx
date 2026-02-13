import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import useProviderAddressStore from "../../../store/admin/grn/providerAddressStore";
import useCustomJsApiLoader from "../../../hooks/admin/useCustomJsApiLoader";
import type { ProviderAddressFormData } from "../../../utils/types";
import { getGeocodeAddress } from "../../../utils/utils";
import {
  DEFAULT_PHONE_COUNTRY_CODE,
  DEFAULT_PROVIDER_ADDRESS_FORM_DATA,
  WAITING_EMOJI,
} from "../../../configs";
import debounce from "lodash.debounce";
import {
  capFirstLetter,
  formatError,
  getCountryFromPhoneNumber,
  isValidGeneralAddress,
  isValidGeneralName,
  isValidPostalCode,
  removeOddSpaces,
} from "../../../../../common/utils.common";
import { isValidPhoneNumber, type E164Number } from "libphonenumber-js";
import toast from "react-hot-toast";
import type {
  ProviderAddressCreate,
  ProviderAddressResponse,
} from "../../../../../common/types.common";
import { Button, Modal } from "react-bootstrap";
import AddressMapInput from "../../common/AddressMapInput";
import Btn from "../../common/Btn";
import Label from "../../common/Label";
import Input from "../../common/Input";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";
import InvalidMsg from "../../common/InvalidInputMsg";
import Textarea from "../../common/Textarea";

type CreateProviderAddressModalProps = Readonly<{
  providerId: string;
  isFirstAddress: boolean;
  show: boolean;
  onHide: () => void;
  onSuccess?: (newAddress: ProviderAddressResponse) => void;
}>;

const CreateProviderAddressModal = memo(
  ({
    providerId,
    isFirstAddress,
    show,
    onHide,
    onSuccess,
  }: CreateProviderAddressModalProps) => {
    // DEV temp for testing
    const renderCount = useRef(0);
    renderCount.current += 1;
    console.log(
      "CreateProviderAddressModal render count:",
      renderCount.current,
    );

    const { createProviderAddress } = useProviderAddressStore();

    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

    const { isLoaded: isMapLoaded } = useCustomJsApiLoader();

    const [formData, setFormData] = useState<ProviderAddressFormData>({
      ...DEFAULT_PROVIDER_ADDRESS_FORM_DATA,
      isDefault: isFirstAddress,
    });

    const mapRef = useRef<google.maps.Map | undefined>(undefined);

    const handleClose = useCallback((): void => {
      setFormData({
        ...DEFAULT_PROVIDER_ADDRESS_FORM_DATA,
        isDefault: isFirstAddress,
      });
      onHide();
    }, [onHide, isFirstAddress]);

    const onMapLoad = useCallback((map: google.maps.Map) => {
      mapRef.current = map;
    }, []);

    const geocodeAddress = useCallback(
      (addressData: ProviderAddressFormData): void => {
        if (!isMapLoaded || !mapRef.current) return;

        const addressString = [
          addressData.addressLine1.val,
          addressData.addressLine2.val,
          addressData.locality.val, // Usually the Ward or District
          addressData.adminAreaL2.val, // Usually the District or City
          addressData.adminAreaL1.val, // Usually the Province/State
          addressData.postalCode.val,
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
      debouncedGeocode(formData);

      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
      formData.addressLine1.val,
      formData.addressLine2.val,
      formData.locality.val,
      formData.adminAreaL2.val,
      formData.adminAreaL1.val,
      formData.postalCode.val,
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
      (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>): void => {
        if (isSubmitting) return;
        const { name, value: val } = e.target;

        if (name === "isDefault") {
          setFormData((prev) => ({
            ...prev,
            isDefault: (e.target as HTMLInputElement).checked,
          }));
          return;
        }

        let err = undefined;
        if (!val) {
          if (!["addressLine2", "adminAreaL2", "notes"].includes(name)) {
            err = `${capFirstLetter(name)} is required`;
          }
        } else if (name === "name" && !isValidGeneralName(val)) {
          err = "Name is invalid";
        } else if (
          [
            "addressLine1",
            "addressLine2",
            "locality",
            "adminAreaL1",
            "adminAreaL2",
          ].includes(name) &&
          !isValidGeneralAddress(val)
        ) {
          err = `${capFirstLetter(name)} is invalid`;
        } else if (name === "postalCode") {
          // Extract country code from phone number if available to validate postal code
          const phoneNumberVal = formData.phoneNumber.val;
          if (
            phoneNumberVal &&
            isValidPhoneNumber(phoneNumberVal) &&
            !isValidPostalCode(
              getCountryFromPhoneNumber(phoneNumberVal)?.code,
              val,
            )
          ) {
            err = "Postal code is invalid";
          }
        } else if (name === "notes" && !removeOddSpaces(val)) {
          err = "Notes is invalid";
        }

        setFormData((prev) => ({
          ...prev,
          [name]: { val, err },
        }));
      },
      [formData.phoneNumber.val, isSubmitting],
    );

    const handlePhoneChange = useCallback(
      (val?: E164Number): void => {
        if (isSubmitting) return;

        setFormData((prev) => ({
          ...prev,
          phoneNumber: {
            val: val || "",
            err: !val
              ? "Phone number is required"
              : !isValidPhoneNumber(val)
                ? "Phone number is invalid"
                : undefined,
          },
        }));
      },
      [isSubmitting],
    );

    const handleSubmit = useCallback(
      async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
        e.preventDefault();
        if (isSubmitting) {
          toast("Submission in progress. Please wait.", {
            icon: WAITING_EMOJI,
          });
          return;
        }

        const validateForm = (): boolean => {
          let isValid = true;
          const newFormData: ProviderAddressFormData = { ...formData };

          if (!formData.name.val) {
            newFormData.name.err = "Name is required";
            isValid = false;
          } else if (!isValidGeneralName(formData.name.val)) {
            newFormData.name.err = "Name is invalid";
            isValid = false;
          }
          if (!formData.addressLine1.val) {
            newFormData.addressLine1.err = "Address Line 1 is required";
            isValid = false;
          } else if (!isValidGeneralAddress(formData.addressLine1.val)) {
            newFormData.addressLine1.err = "Address Line 1 is invalid";
            isValid = false;
          }
          if (
            formData.addressLine2.val &&
            !isValidGeneralAddress(formData.addressLine2.val)
          ) {
            newFormData.addressLine2.err = "Address Line 2 is invalid";
            isValid = false;
          }
          if (!formData.locality.val) {
            newFormData.locality.err = "Locality is required";
            isValid = false;
          } else if (!isValidGeneralAddress(formData.locality.val)) {
            newFormData.locality.err = "Locality is invalid";
            isValid = false;
          }
          if (!formData.adminAreaL1.val) {
            newFormData.adminAreaL1.err = "Admin Area L1 is required";
            isValid = false;
          } else if (!isValidGeneralAddress(formData.adminAreaL1.val)) {
            newFormData.adminAreaL1.err = "Admin Area L1 is invalid";
            isValid = false;
          }
          if (
            formData.adminAreaL2.val &&
            !isValidGeneralAddress(formData.adminAreaL2.val)
          ) {
            newFormData.adminAreaL2.err = "Admin Area L2 is invalid";
            isValid = false;
          }

          let isPhoneNumberValid = true;
          if (!formData.phoneNumber.val) {
            newFormData.phoneNumber.err = "Phone Number is required";
            isValid = false;
            isPhoneNumberValid = false;
          } else if (!isValidPhoneNumber(formData.phoneNumber.val)) {
            newFormData.phoneNumber.err = "Phone Number is invalid";
            isValid = false;
            isPhoneNumberValid = false;
          }
          if (!formData.postalCode.val) {
            newFormData.postalCode.err = "Postal Code is required";
            isValid = false;
          } else if (
            isPhoneNumberValid &&
            !isValidPostalCode(
              getCountryFromPhoneNumber(formData.phoneNumber.val)?.code,
              formData.postalCode.val,
            )
          ) {
            newFormData.postalCode.err = "Postal Code is invalid";
            isValid = false;
          }
          if (formData.notes.val && !removeOddSpaces(formData.notes.val)) {
            newFormData.notes.err = "Notes is invalid";
            isValid = false;
          }

          setFormData(newFormData);
          return isValid;
        };

        if (validateForm()) {
          const addressData: ProviderAddressCreate = {
            name: formData.name.val,
            addressLine1: formData.addressLine1.val,
            addressLine2: formData.addressLine2.val || null,
            locality: formData.locality.val,
            adminAreaL1: formData.adminAreaL1.val,
            adminAreaL2: formData.adminAreaL2.val || null,
            postalCode: formData.postalCode.val,
            phoneNumber: formData.phoneNumber.val,
            location: {
              latitude: formData.location[0],
              longitude: formData.location[1],
            },
            isDefault: formData.isDefault,
            notes: formData.notes.val || null,
          };

          setIsSubmitting(true);
          try {
            const newAddress = await createProviderAddress(
              providerId,
              addressData,
            );
            onSuccess?.(newAddress);
            handleClose();
            toast.success("Provider address created successfully");
          } catch (error) {
            toast.error(formatError(error));
          } finally {
            setIsSubmitting(false);
          }
        }
      },
      [
        createProviderAddress,
        formData,
        handleClose,
        isSubmitting,
        onSuccess,
        providerId,
      ],
    );

    return (
      <Modal show={show} onHide={handleClose} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Add New Provider Address</Modal.Title>
        </Modal.Header>

        <form onSubmit={handleSubmit}>
          <Modal.Body>
            <div className="row g-3">
              {/* Name */}
              <div className="col-md-6">
                <Label htmlFor="name" required>
                  Address Name
                </Label>
                <Input
                  type="text"
                  id="name"
                  name="name"
                  className="form-control"
                  placeholder="Main Warehouse"
                  value={formData.name.val}
                  onChange={handleChange}
                  disabled={isSubmitting}
                  error={formData.name.err}
                  autoComplete="off"
                  required
                />
              </div>

              {/* Phone Number */}
              <div className="col-md-6">
                <Label htmlFor="phoneNumber" required>
                  Phone Number
                </Label>
                <PhoneInput
                  id="phoneNumber"
                  name="phoneNumber"
                  defaultCountry={DEFAULT_PHONE_COUNTRY_CODE}
                  value={formData.phoneNumber.val}
                  onChange={handlePhoneChange}
                  className={formData.phoneNumber.err ? "is-invalid" : ""}
                  disabled={isSubmitting}
                  placeholder="+1 555 123 4567"
                  international
                />
                {formData.phoneNumber.err && (
                  <InvalidMsg msg={formData.phoneNumber.err} />
                )}
              </div>

              {/* Address Line 1 */}
              <div className="col-12">
                <Label htmlFor="addressLine1" required>
                  Address Line 1
                </Label>
                <Input
                  type="text"
                  id="addressLine1"
                  name="addressLine1"
                  className="form-control"
                  placeholder="123 Main Street"
                  value={formData.addressLine1.val}
                  onChange={handleChange}
                  disabled={isSubmitting}
                  error={formData.addressLine1.err}
                  autoComplete="address-line1"
                  required
                />
              </div>

              {/* Address Line 2 */}
              <div className="col-12">
                <Label htmlFor="addressLine2">Address Line 2</Label>
                <Input
                  type="text"
                  id="addressLine2"
                  name="addressLine2"
                  className="form-control"
                  placeholder="Building B, Floor 5, Suite 510 (Optional)"
                  value={formData.addressLine2.val}
                  onChange={handleChange}
                  disabled={isSubmitting}
                  error={formData.addressLine2.err}
                  autoComplete="address-line2"
                />
              </div>

              {/* Locality */}
              <div className="col-md-6">
                <Label htmlFor="locality" required>
                  Locality / City
                </Label>
                <Input
                  type="text"
                  id="locality"
                  name="locality"
                  className="form-control"
                  placeholder="Ho Chi Minh City"
                  value={formData.locality.val}
                  onChange={handleChange}
                  disabled={isSubmitting}
                  error={formData.locality.err}
                  autoComplete="address-level2"
                  required
                />
              </div>

              {/* Admin Area L2 (District) */}
              <div className="col-md-6">
                <Label htmlFor="adminAreaL2">District / County</Label>
                <Input
                  type="text"
                  id="adminAreaL2"
                  name="adminAreaL2"
                  className="form-control"
                  placeholder="District 1 (Optional)"
                  value={formData.adminAreaL2.val}
                  onChange={handleChange}
                  disabled={isSubmitting}
                  error={formData.adminAreaL2.err}
                  autoComplete="off"
                />
              </div>

              {/* Admin Area L1 (Province/State) */}
              <div className="col-md-6">
                <Label htmlFor="adminAreaL1" required>
                  Province / State
                </Label>
                <Input
                  type="text"
                  id="adminAreaL1"
                  name="adminAreaL1"
                  className="form-control"
                  placeholder="Ho Chi Minh"
                  value={formData.adminAreaL1.val}
                  onChange={handleChange}
                  disabled={isSubmitting}
                  error={formData.adminAreaL1.err}
                  autoComplete="address-level1"
                  required
                />
              </div>

              {/* Postal Code */}
              <div className="col-md-6">
                <Label htmlFor="postalCode" required>
                  Postal Code
                </Label>
                <Input
                  type="text"
                  id="postalCode"
                  name="postalCode"
                  className="form-control"
                  placeholder="700000"
                  value={formData.postalCode.val}
                  onChange={handleChange}
                  disabled={isSubmitting}
                  error={formData.postalCode.err}
                  autoComplete="postal-code"
                  required
                />
              </div>

              {/* Notes */}
              <div className="col-12">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  name="notes"
                  className="form-control"
                  placeholder="Additional delivery instructions or special notes (Optional)"
                  value={formData.notes.val}
                  onChange={handleChange}
                  disabled={isSubmitting}
                  error={formData.notes.err}
                  rows={3}
                />
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
              <div className="form-check mt-3">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="isDefault"
                  name="isDefault"
                  onChange={handleChange}
                  checked={formData.isDefault}
                  disabled={isSubmitting}
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

export default CreateProviderAddressModal;
