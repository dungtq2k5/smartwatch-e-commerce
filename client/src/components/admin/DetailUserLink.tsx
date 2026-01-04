import { memo, useEffect, useState } from "react";
import useUserStore from "../../store/admin/userStore";
import { formatError } from "../../../../common/utils.common";
import SmallSpinner from "../common/SmallSpinner";
import type { LinkBtnProps } from "../common/LinkBtn";
import LinkBtn from "../common/LinkBtn";

type DetailUserLinkProps = Readonly<{
  userId: string;
}> &
  Omit<LinkBtnProps, "to">;

const DetailUserLink = memo(
  ({ userId, ...props }: DetailUserLinkProps) => {
    const { sysUserId, fetchSysUserId } = useUserStore();

    const [isInitializing, setIsInitializing] = useState<boolean>(
      sysUserId === null
    );

    useEffect(() => {
      const handleFetchSetInitialData = async () => {
        if (sysUserId !== null) return;

        setIsInitializing(true);

        try {
          if (!sysUserId) await fetchSysUserId();
        } catch (error) {
          console.error("DetailUserLink: ", formatError(error));
        } finally {
          setIsInitializing(false);
        }
      };

      handleFetchSetInitialData();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
      <>
        {isInitializing ? (
          <SmallSpinner />
        ) : !sysUserId ? (
          "N/A"
        ) : sysUserId === userId ? (
          "system"
        ) : (
          <LinkBtn {...props} to={`/admin/users/${userId}`} />
        )}
      </>
    );
  }
);

export default DetailUserLink;
