import { Button, Modal } from "react-bootstrap";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { isValidPhoneNumber, type E164Number } from "libphonenumber-js";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";
import debounce from "lodash.debounce";
import useProviderAddressStore from "../../../store/admin/grn/providerAddressStore";
import type {
  ProviderAddressResponse,
  ProviderAddressUpdate,
} from "../../../../../common/types.common";
import type { ProviderAddressFormData } from "../../../utils/types";
import {
  capFirstLetter,
  formatError,
  getCountryFromPhoneNumber,
  isValidGeneralAddress,
  isValidGeneralName,
  isValidPostalCode,
  removeOddSpaces,
} from "../../../../../common/utils.common";
import {
  DEFAULT_PROVIDER_ADDRESS_FORM_DATA,
  WAITING_EMOJI,
} from "../../../configs";
import Btn from "../../common/Btn";
import Label from "../../common/Label";
import Input from "../../common/Input";
import InvalidMsg from "../../common/InvalidInputMsg";
import AddressMapInput from "../../common/AddressMapInput";
import useCustomJsApiLoader from "../../../hooks/admin/useCustomJsApiLoader";
import { getGeocodeAddress } from "../../../utils/utils";
import Textarea from "../../common/Textarea";
import Loading from "../../common/Loading";
import ApiError from "../../common/ApiError";

type Process = {
  isProcessing: boolean;
  isFetching: boolean;
  isUpdating: boolean;
};

type EditProviderAddressModalProps = Readonly<{
  providerId: string;
  addressId?: string;
  isOnlyOneAddress: boolean;
  onHide: () => void;
  onSuccess?: (updatedAddress: ProviderAddressResponse) => void;
}>;

const EditProviderAddressModal = memo(
  ({
    providerId,
    addressId, // Use this for showing/hiding the modal
    isOnlyOneAddress,
    onHide,
    onSuccess,
  }: EditProviderAddressModalProps) => {
    // DEV temp for testing
    const renderCount = useRef(0);
    renderCount.current += 1;
    console.log("EditProviderAddressModal render count:", renderCount.current);

    const { fetchProviderAddress, updateProviderAddress } =
      useProviderAddressStore();

    const [address, setAddress] = useState<ProviderAddressResponse | null>(
      null,
    );

    const [process, setProcess] = useState<Process>({
      isProcessing: false,
      isFetching: false,
      isUpdating: false,
    });
    const [apiErr, setApiErr] = useState<string | null>(null);

    const [formData, setFormData] = useState<ProviderAddressFormData>({
      ...DEFAULT_PROVIDER_ADDRESS_FORM_DATA,
      isDefault: isOnlyOneAddress,
    });

    useEffect(() => {
      if (addressId) {
        const handleFetchAddress = async (): Promise<void> => {
          setProcess((prev) => ({
            ...prev,
            isProcessing: true,
            isFetching: true,
          }));
          setApiErr(null);

          try {
            const fetchedAddress = await fetchProviderAddress(
              providerId,
              addressId,
            );
            setAddress(fetchedAddress);

            const copiedAddress = structuredClone(fetchedAddress); // Avoid direct state mutation
            setFormData({
              name: { val: copiedAddress.name },
              addressLine1: { val: copiedAddress.addressLine1 },
              addressLine2: { val: copiedAddress.addressLine2 || "" },
              locality: { val: copiedAddress.locality },
              adminAreaL1: { val: copiedAddress.adminAreaL1 },
              adminAreaL2: { val: copiedAddress.adminAreaL2 || "" },
              postalCode: { val: copiedAddress.postalCode },
              phoneNumber: { val: copiedAddress.phoneNumber },
              location: [
                copiedAddress.location.coordinates[0],
                copiedAddress.location.coordinates[1],
              ],
              notes: { val: copiedAddress.notes || "" },
              isDefault: copiedAddress.isDefault,
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

        handleFetchAddress();
        return;
      }

      setTimeout(() => {
        setAddress(null);
        setApiErr(null);
        setFormData({
          ...DEFAULT_PROVIDER_ADDRESS_FORM_DATA,
          isDefault: isOnlyOneAddress,
        });
      }, 200);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [addressId, providerId, isOnlyOneAddress]);

    const { isLoaded: isMapLoaded } = useCustomJsApiLoader();

    const mapRef = useRef<google.maps.Map | null>(null);

    const onMapLoad = useCallback((map: google.maps.Map) => {
      mapRef.current = map;
    }, []);

    const geocodeAddress = useCallback(
      (addressData: ProviderAddressFormData): void => {
        if (!isMapLoaded || !mapRef.current) return;

        const addressString = [
          addressData.addressLine1.val,
          addressData.addressLine2.val,
          addressData.locality.val,
          addressData.adminAreaL2.val,
          addressData.adminAreaL1.val,
          addressData.postalCode.val,
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
      if (
        formData.addressLine1.val ||
        formData.locality.val ||
        formData.adminAreaL1.val
      ) {
        debouncedGeocode(formData);
      }

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
        if (process.isProcessing) return;
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
      [formData.phoneNumber.val, process.isProcessing],
    );

    const handlePhoneChange = useCallback(
      (val?: E164Number): void => {
        if (process.isProcessing) return;

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
      [process.isProcessing],
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

        if (validateForm() && address) {
          const getChangedData = (): ProviderAddressUpdate => {
            const changedData: ProviderAddressUpdate = {};

            if (formData.name.val !== address.name) {
              changedData.name = formData.name.val;
            }
            if (formData.addressLine1.val !== address.addressLine1) {
              changedData.addressLine1 = formData.addressLine1.val;
            }
            if ((formData.addressLine2.val || null) !== address.addressLine2) {
              changedData.addressLine2 = formData.addressLine2.val || null;
            }
            if (formData.locality.val !== address.locality) {
              changedData.locality = formData.locality.val;
            }
            if (formData.adminAreaL1.val !== address.adminAreaL1) {
              changedData.adminAreaL1 = formData.adminAreaL1.val;
            }
            if ((formData.adminAreaL2.val || null) !== address.adminAreaL2) {
              changedData.adminAreaL2 = formData.adminAreaL2.val || null;
            }
            if (formData.postalCode.val !== address.postalCode) {
              changedData.postalCode = formData.postalCode.val;
            }
            if (formData.phoneNumber.val !== address.phoneNumber) {
              changedData.phoneNumber = formData.phoneNumber.val;
            }
            if (
              formData.location[0] !== address.location.coordinates[0] ||
              formData.location[1] !== address.location.coordinates[1]
            ) {
              changedData.location = {
                latitude: formData.location[0],
                longitude: formData.location[1],
              };
            }
            if ((formData.notes.val || null) !== address.notes) {
              changedData.notes = formData.notes.val || null;
            }
            if (formData.isDefault !== address.isDefault) {
              changedData.isDefault = formData.isDefault;
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
            const updatedAddress = await updateProviderAddress(
              providerId,
              address.id,
              addressData,
            );
            onSuccess?.(updatedAddress);
            onHide();
            toast.success("Provider address updated successfully");
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
        address,
        formData,
        onHide,
        onSuccess,
        process.isProcessing,
        providerId,
        updateProviderAddress,
      ],
    );

    return (
      <Modal show={!!addressId} onHide={onHide} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Update Provider Address</Modal.Title>
        </Modal.Header>

        {process.isFetching ? (
          <Loading loadingMsg="Loading address details..." className="p-4" />
        ) : apiErr ? (
          <div className="p-4">
            <ApiError errorMessage={apiErr} />
          </div>
        ) : !address ? (
          <div className="p-4">
            <ApiError errorMessage="Could not load address data." />
          </div>
        ) : (
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
                    placeholder={address.name}
                    value={formData.name.val}
                    onChange={handleChange}
                    disabled={process.isProcessing}
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
                    defaultCountry={
                      getCountryFromPhoneNumber(address.phoneNumber)?.code
                    }
                    value={formData.phoneNumber.val}
                    onChange={handlePhoneChange}
                    className={formData.phoneNumber.err ? "is-invalid" : ""}
                    disabled={process.isProcessing}
                    placeholder={address.phoneNumber}
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
                    placeholder={address.addressLine1}
                    value={formData.addressLine1.val}
                    onChange={handleChange}
                    disabled={process.isProcessing}
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
                    placeholder={
                      address.addressLine2 ||
                      "Building B, Floor 5, Suite 510 (Optional)"
                    }
                    value={formData.addressLine2.val}
                    onChange={handleChange}
                    disabled={process.isProcessing}
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
                    placeholder={address.locality}
                    value={formData.locality.val}
                    onChange={handleChange}
                    disabled={process.isProcessing}
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
                    placeholder={address.adminAreaL2 || "District 1 (Optional)"}
                    value={formData.adminAreaL2.val}
                    onChange={handleChange}
                    disabled={process.isProcessing}
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
                    placeholder={address.adminAreaL1}
                    value={formData.adminAreaL1.val}
                    onChange={handleChange}
                    disabled={process.isProcessing}
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
                    placeholder={address.postalCode}
                    value={formData.postalCode.val}
                    onChange={handleChange}
                    disabled={process.isProcessing}
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
                    placeholder={
                      address.notes ||
                      "Additional delivery instructions or special notes (Optional)"
                    }
                    value={formData.notes.val}
                    onChange={handleChange}
                    disabled={process.isProcessing}
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
              {!isOnlyOneAddress && (
                <div className="form-check mt-3">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="isDefault"
                    name="isDefault"
                    onChange={handleChange}
                    checked={formData.isDefault}
                    disabled={process.isProcessing}
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
              <Btn
                type="submit"
                className="btn btn-primary"
                disabled={process.isProcessing}
                loading={process.isUpdating}
              >
                Update address
              </Btn>
            </Modal.Footer>
          </form>
        )}
      </Modal>
    );
  },
);

export default EditProviderAddressModal;
