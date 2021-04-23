import axios from "axios";
import { useContext } from "react";
import { useAPIErrorChecking } from "./useAPIErrorChecking";

const useGroupPromote = (GlobalContext) => {
  const errCheck = useAPIErrorChecking();
  const { storeJWT } = useContext(GlobalContext);

  return (group_ID, member_ID) => {
    axios
      .post("/api/groups/promote", {
        group_ID,
        member_ID,
      })
      .then((res) => {
        if (res.data.error !== "") throw res.data.error;
        if ("token" in res.data) storeJWT(res.data.token);
      })
      .catch((err) => errCheck(err));
  };
};

export default useGroupPromote;