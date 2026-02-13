import { GoogleMap, Marker } from "@react-google-maps/api";
import { memo, useRef } from "react";

const AddressMapInput = memo(
  ({
    isMapLoaded,
    location,
    onMapLoad,
    onMarkerDragEnd,
  }: Readonly<{
    isMapLoaded: boolean;
    location: [number, number]; // [latitude, longitude]
    onMapLoad: (map: google.maps.Map) => void;
    onMarkerDragEnd: (e: google.maps.MapMouseEvent) => void;
  }>) => {
    // DEV temp for testing
    const renderCount = useRef(0);
    renderCount.current += 1;
    console.log("AddressMapInput render count:", renderCount.current);

    return (
      <div className="mt-3 mb-3">
        <p className="form-label mb-1">Pin Your Location</p>
        <p className="small text-muted mt-0">
          Drag the pin to your exact delivery location for better accuracy.
        </p>
        {isMapLoaded ? (
          <GoogleMap
            mapContainerStyle={{
              width: "100%",
              height: "300px",
              borderRadius: "var(--bs-border-radius)",
            }}
            center={{
              lat: location[0],
              lng: location[1],
            }}
            zoom={15}
            options={{
              streetViewControl: false,
            }}
            onLoad={onMapLoad}
          >
            <Marker
              position={{
                lat: location[0],
                lng: location[1],
              }}
              draggable={true}
              onDragEnd={onMarkerDragEnd}
            />
          </GoogleMap>
        ) : (
          <div className="text-center p-5 border rounded">
            <span
              className="spinner-border spinner-border-sm"
              aria-hidden="true"
            ></span>
            <span className="ms-2">Loading map...</span>
          </div>
        )}
      </div>
    );
  },
);

export default AddressMapInput;
