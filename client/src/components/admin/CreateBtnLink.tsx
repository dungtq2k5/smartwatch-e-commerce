import { memo } from "react";
import type { LinkBtnProps } from "../common/LinkBtn";
import LinkBtn from "../common/LinkBtn";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus } from "@fortawesome/free-solid-svg-icons";

const CreateBtnLink = memo(({ children, ...props }: LinkBtnProps) => {
  return (
    <LinkBtn
      {...props}
      className={`btn btn-link text-white bg-success ${props.className}`}
    >
      <FontAwesomeIcon icon={faPlus} size="sm" />
      {children}
    </LinkBtn>
  );
});

export default CreateBtnLink;
