import { memo, useEffect, useState } from "react";
import { useUserStore } from "../../store/admin/userStore";
import { formatError } from "../../../../common/utils.common";
import SmallSpinner from "../common/SmallSpinner";
import { Link } from "react-router-dom";

const DetailUserLink = memo(
  ({
    userId,
    displayName,
  }: Readonly<{
    userId: string;
    displayName: string;
  }>) => {
    const { getSysUserId, sysUserId } = useUserStore();

    const [isInitializing, setIsInitializing] = useState<boolean>(
      sysUserId === null
    );

    useEffect(() => {
      const handleFetchSetInitialData = async () => {
        if (sysUserId !== null) return;

        setIsInitializing(true);

        try {
          await getSysUserId();
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
          <Link to={`/admin/users/${userId}`}>{displayName}</Link>
        )}
      </>
    );
  }
);

export default DetailUserLink;
