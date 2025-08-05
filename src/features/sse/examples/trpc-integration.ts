/**
 * Example: tRPC Integration with SSE
 * ---------------------------------
 * This example shows how to integrate SSE notifications with tRPC procedures
 */

import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "@/lib/trpc";
import {
  notifyUser,
  notifyUsers,
  broadcastNotification,
  SSEHelpers,
} from "@/features/sse";

export const sseExampleRouter = createTRPCRouter({
  /**
   * Send a test notification to the current user
   */
  sendTestNotification: publicProcedure
    .input(
      z.object({
        message: z.string(),
        type: z.enum(["info", "success", "warning", "error"]).default("info"),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.session?.user?.id;

      if (!userId) {
        throw new Error("User not authenticated");
      }

      const sentCount = await notifyUser(userId, {
        title: "Test Notification",
        message: input.message,
        type: input.type,
        timestamp: new Date().toISOString(),
      });

      return { success: true, sentCount };
    }),

  /**
   * Create a post and notify followers
   */
  createPost: publicProcedure
    .input(
      z.object({
        title: z.string(),
        content: z.string(),
        tags: z.array(z.string()).default([]),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.session?.user?.id;

      if (!userId) {
        throw new Error("User not authenticated");
      }

      // Create the post (your implementation)
      const post = await createPostInDatabase(input, userId);

      // Get user's followers
      const followerIds = await getUserFollowers(userId);

      // Notify followers about new post
      if (followerIds.length > 0) {
        await notifyUsers(followerIds, {
          title: "New Post",
          message: `${ctx.session?.user?.name || "Someone"} published: "${input.title}"`,
          type: "info",
          actions: [{ label: "View Post", action: `/posts/${post.id}` }],
        });
      }

      // If post has trending tags, broadcast to all users
      const trendingTags = ["featured", "trending", "announcement"];
      const hasTrendingTag = input.tags.some((tag) =>
        trendingTags.includes(tag),
      );

      if (hasTrendingTag) {
        await broadcastNotification({
          title: "Trending Post",
          message: `Check out the trending post: "${input.title}"`,
          type: "info",
          actions: [{ label: "View Post", action: `/posts/${post.id}` }],
        });
      }

      return { success: true, post };
    }),

  /**
   * Like a post and notify the author
   */
  likePost: publicProcedure
    .input(
      z.object({
        postId: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.session?.user?.id;

      if (!userId) {
        throw new Error("User not authenticated");
      }

      // Like the post (your implementation)
      const like = await likePostInDatabase(input.postId, userId);
      const post = await getPostById(input.postId);

      // Notify post author about the like
      if (post.authorId !== userId) {
        await SSEHelpers.notifySuccess(
          post.authorId,
          "New Like",
          `${ctx.session?.user?.name || "Someone"} liked your post "${post.title}"`,
        );
      }

      return { success: true, like };
    }),

  /**
   * Admin: Send system announcement
   */
  sendSystemAnnouncement: publicProcedure
    .input(
      z.object({
        title: z.string(),
        message: z.string(),
        type: z.enum(["info", "warning", "error"]).default("info"),
        targetUsers: z.array(z.string()).optional(), // If not provided, broadcast to all
      }),
    )
    .mutation(async ({ input, ctx }) => {
      // Check if user is admin (your implementation)
      const isAdmin = await checkIfUserIsAdmin(ctx.session?.user?.id);

      if (!isAdmin) {
        throw new Error("Unauthorized: Admin access required");
      }

      const notification = {
        title: input.title,
        message: input.message,
        type: input.type,
        timestamp: new Date().toISOString(),
      };

      let sentCount: number;

      if (input.targetUsers && input.targetUsers.length > 0) {
        // Send to specific users
        sentCount = await notifyUsers(input.targetUsers, notification);
      } else {
        // Broadcast to all users
        sentCount = await broadcastNotification(notification);
      }

      return { success: true, sentCount };
    }),

  /**
   * Get SSE connection statistics (admin only)
   */
  getSSEStats: publicProcedure.query(async ({ ctx }) => {
    // Check if user is admin (your implementation)
    const isAdmin = await checkIfUserIsAdmin(ctx.session?.user?.id);

    if (!isAdmin) {
      throw new Error("Unauthorized: Admin access required");
    }

    const { totalConnections, getUserConnections } = getConnectionStats();

    return {
      totalConnections,
      userConnectionCount: ctx.session?.user?.id
        ? getUserConnections(ctx.session.user.id)
        : 0,
    };
  }),
});

// Mock functions - implement according to your database schema
async function createPostInDatabase(input: any, userId: string) {
  // Your implementation
  return {
    id: "post123",
    title: input.title,
    content: input.content,
    authorId: userId,
  };
}

async function getUserFollowers(userId: string): Promise<string[]> {
  // Your implementation
  return ["follower1", "follower2"];
}

async function likePostInDatabase(postId: string, userId: string) {
  // Your implementation
  return { id: "like123", postId, userId };
}

async function getPostById(postId: string) {
  // Your implementation
  return { id: postId, title: "Example Post", authorId: "author123" };
}

async function checkIfUserIsAdmin(userId?: string): Promise<boolean> {
  // Your implementation
  return userId === "admin123";
}

import { getConnectionStats } from "@/features/sse";
