import { Link } from "react-router-dom";
import { getGoogleMapsUrl } from "../../../../common/utils.common";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMapLocation } from "@fortawesome/free-solid-svg-icons";

type MapLinkProps = Readonly<{
  latitude: number | string;
  longitude: number | string;
}> &
  React.AnchorHTMLAttributes<HTMLAnchorElement>;

export default function MapLink({
  latitude,
  longitude,
  ...props
}: MapLinkProps) {
  return (
    <Link
      {...props}
      to={getGoogleMapsUrl(latitude, longitude)}
      target="_blank"
      rel="noopener noreferrer"
      title="View on Google Maps"
    >
      <FontAwesomeIcon icon={faMapLocation} className="me-1" />
      Map
    </Link>
  );
}
