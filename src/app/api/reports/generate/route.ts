import type { NextRequest } from "next/server";
import { auth } from "@/features/auth/handlers";
import { sseUtils } from "@/lib/sse/server";

// Define a type for the request body for type safety
interface GenerateReportBody {
  reportType?: string;
  parameters?: Record<string, unknown>;
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return new Response("Unauthorized", { status: 401 });
    }

    // Explicitly type the body to avoid 'any' type
    // We are not using the body in this simulation, but this is how you'd type it.
    await request.json() as GenerateReportBody;

    // Generate a unique report ID
    const reportId = `report-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Send initial notification
    sseUtils.sendReportUpdate(
      userId,
      reportId,
      "generating",
      "Report generation started",
      0,
    );

    // Simulate report generation process with progress updates
    const simulateReportGeneration = async () => {
      try {
        const steps = [
          { progress: 10, message: "Initializing report generation..." },
          { progress: 25, message: "Gathering data from sources..." },
          { progress: 40, message: "Processing and analyzing data..." },
          { progress: 60, message: "Generating charts and visualizations..." },
          { progress: 80, message: "Finalizing report format..." },
          { progress: 95, message: "Preparing download link..." },
          { progress: 100, message: "Report generation completed!" },
        ];

        for (const step of steps) {
          await new Promise((resolve) => setTimeout(resolve, 1000)); // 1 second delay

          sseUtils.sendReportUpdate(
            userId,
            reportId,
            "generating",
            step.message,
            step.progress,
          );
        }

        // Simulate success (90% chance) or failure (10% chance)
        const isSuccess = Math.random() > 0.1;

        if (isSuccess) {
          const downloadUrl = `/api/reports/download/${reportId}`;
          sseUtils.sendReportUpdate(
            userId,
            reportId,
            "completed",
            "Report is ready for download!",
            100,
            downloadUrl,
          );
        } else {
          sseUtils.sendReportUpdate(
            userId,
            reportId,
            "failed",
            "Report generation failed due to insufficient data",
            0,
            undefined,
            "Data processing error occurred",
          );
        }
      } catch (error) {
          console.error(`Error during report simulation for reportId: ${reportId}`, error);
          // Optionally send a failure message to the client
          sseUtils.sendReportUpdate(
            userId,
            reportId,
            "failed",
            "An unexpected error occurred during report generation.",
            0,
            undefined,
            error instanceof Error ? error.message : "Unknown error",
          );
      }
    };

    // Start the report generation process in the background.
    // Using 'void' operator to explicitly mark the promise as intentionally not awaited.
    void simulateReportGeneration();

    return new Response(
      JSON.stringify({
        success: true,
        reportId,
        message: "Report generation started",
      }),
      {
        status: 202, // Accepted
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
  } catch (error) {
    console.error("Error starting report generation:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}