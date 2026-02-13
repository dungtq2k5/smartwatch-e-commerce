import { useJsApiLoader } from "@react-google-maps/api";

export default function useCustomJsApiLoader(): ReturnType<
  typeof useJsApiLoader
> {
  return useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
  });
}
