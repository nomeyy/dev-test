import SSEClient from "../../components/SSEClient";
import SendButton from "../../components/SendButton";
const SeeTest = async () => {
  return (
    <div>
      <h2>SSE Test</h2>
      <SSEClient userId="user123" />
      <SendButton userId="user123" />
    </div>
  );
};

export default SeeTest;
