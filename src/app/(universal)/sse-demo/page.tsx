import { getSession } from "@/features/auth";
import { getTranslation } from "@/features/i18n";
import { SSEView } from "@/features/sse";

const SSEDemoPage = async () => {
  const [session, { t }] = await Promise.all([
    getSession(),
    getTranslation(["sse"]),
  ]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8">
        <div className="mb-8 text-center">
          <h1 className="mb-4 text-4xl font-bold text-gray-900">
            {t("demo.title")}
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-gray-600">
            {t("demo.description")}
          </p>
        </div>

        <SSEView userId={session?.user.id} />
      </div>
    </div>
  );
};

export default SSEDemoPage;
