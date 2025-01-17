import RequestsMaker from "@components/AddVinyls/RequestsMaker";
import RequestResults from "@components/AddVinyls/RequestResults";
import { useState } from "react";
import { IRequestResults } from "@models/IRequestProxy";

export default function AddVinyls() {
  const [requestResults, setRequestResults] = useState<IRequestResults[]>([]);
  return (
    <>
      <RequestsMaker setRequestResults={setRequestResults} />
      <RequestResults results={requestResults} />
    </>
  );
}
