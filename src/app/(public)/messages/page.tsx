import UserListComponent from "./UserListComponent";

const LandingPage = () => {
  const userId = "test-user";
  return (
    <>
      <h1 className="text-5xl font-extrabold tracking-tight sm:text-[5rem]">
        Create <span className="text-[hsl(280,100%,70%)]">Nomey</span>
      </h1>

      <div className="max-w-[600px] space-y-5 text-left">
        <UserListComponent />
      </div>
    </>
  );
};

export default LandingPage;
