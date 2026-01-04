import { faPen } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { memo } from "react";
import LinkBtn, { type LinkBtnProps } from "../common/LinkBtn";

const EditBtnLink = memo(({ children, ...props }: LinkBtnProps) => {
  return (
    <LinkBtn
      {...props}
      className={`btn btn-link text-white bg-primary ${props.className}`}
    >
      <FontAwesomeIcon icon={faPen} size="sm" />
      {children}
    </LinkBtn>
  );
});

export default EditBtnLink;
