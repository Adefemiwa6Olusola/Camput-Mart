import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const getListings = query({
  args: {
    categoryId: v.optional(v.id("categories")),
    limit: v.optional(v.number()),
    featured: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    let listings;

    if (args.categoryId) {
      listings = await ctx.db
        .query("listings")
        .withIndex("by_category", (q) => q.eq("categoryId", args.categoryId!))
        .filter((q) => q.eq(q.field("status"), "active"))
        .order("desc")
        .take(args.limit || 20);
    } else if (args.featured) {
      listings = await ctx.db
        .query("listings")
        .withIndex("by_featured", (q) => q.eq("isFeatured", true))
        .filter((q) => q.eq(q.field("status"), "active"))
        .order("desc")
        .take(args.limit || 20);
    } else {
      listings = await ctx.db
        .query("listings")
        .withIndex("by_status", (q) => q.eq("status", "active"))
        .order("desc")
        .take(args.limit || 20);
    }

    return await Promise.all(
      listings.map(async (listing) => {
        const seller = await ctx.db.get(listing.sellerId);
        const sellerProfile = await ctx.db
          .query("profiles")
          .withIndex("by_user", (q) => q.eq("userId", listing.sellerId))
          .unique();
        const category = await ctx.db.get(listing.categoryId);

        const imageUrls = await Promise.all(
          listing.images.map(async (imageId) => {
            return await ctx.storage.getUrl(imageId);
          })
        );

        return {
          ...listing,
          seller: {
            email: seller?.email,
            firstName: sellerProfile?.firstName,
            lastName: sellerProfile?.lastName,
          },
          category: category?.name,
          imageUrls: imageUrls.filter(Boolean),
        };
      })
    );
  },
});

export const getListing = query({
  args: { id: v.id("listings") },
  handler: async (ctx, args) => {
    const listing = await ctx.db.get(args.id);
    if (!listing) return null;

    const seller = await ctx.db.get(listing.sellerId);
    const sellerProfile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", listing.sellerId))
      .unique();
    const category = await ctx.db.get(listing.categoryId);

    const imageUrls = await Promise.all(
      listing.images.map(async (imageId) => {
        return await ctx.storage.getUrl(imageId);
      })
    );

    // Remove view increment from query
    
    return {
      ...listing,
      seller: {
        email: seller?.email,
        firstName: sellerProfile?.firstName,
        lastName: sellerProfile?.lastName,
      },
      category: category?.name,
      imageUrls: imageUrls.filter(Boolean),
    };
  },
});

export const searchListings = query({
  args: {
    searchTerm: v.string(),
    categoryId: v.optional(v.id("categories")),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("listings")
      .withSearchIndex("search_listings", (q) => {
        let searchQuery = q.search("title", args.searchTerm);
        if (args.categoryId) {
          searchQuery = searchQuery.eq("categoryId", args.categoryId);
        }
        return searchQuery.eq("status", "active");
      });

    const listings = await query.take(20);

    return await Promise.all(
      listings.map(async (listing) => {
        const seller = await ctx.db.get(listing.sellerId);
        const sellerProfile = await ctx.db
          .query("profiles")
          .withIndex("by_user", (q) => q.eq("userId", listing.sellerId))
          .unique();
        const category = await ctx.db.get(listing.categoryId);

        const imageUrls = await Promise.all(
          listing.images.map(async (imageId) => {
            return await ctx.storage.getUrl(imageId);
          })
        );

        return {
          ...listing,
          seller: {
            email: seller?.email,
            firstName: sellerProfile?.firstName,
            lastName: sellerProfile?.lastName,
          },
          category: category?.name,
          imageUrls: imageUrls.filter(Boolean),
        };
      })
    );
  },
});

export const getUserListings = query({
  args: { userId: v.optional(v.id("users")) },
  handler: async (ctx, args) => {
    const userId = args.userId || (await getAuthUserId(ctx));
    if (!userId) return [];

    const listings = await ctx.db
      .query("listings")
      .withIndex("by_seller", (q) => q.eq("sellerId", userId))
      .order("desc")
      .collect();

    return await Promise.all(
      listings.map(async (listing) => {
        const category = await ctx.db.get(listing.categoryId);
        const imageUrls = await Promise.all(
          listing.images.map(async (imageId) => {
            return await ctx.storage.getUrl(imageId);
          })
        );

        return {
          ...listing,
          category: category?.name,
          imageUrls: imageUrls.filter(Boolean),
        };
      })
    );
  },
});

export const createListing = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    price: v.number(),
    categoryId: v.id("categories"),
    condition: v.union(v.literal("new"), v.literal("like-new"), v.literal("good"), v.literal("fair"), v.literal("poor")),
    images: v.array(v.id("_storage")),
    contactMethod: v.union(v.literal("email"), v.literal("phone"), v.literal("message")),
    contactInfo: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    return await ctx.db.insert("listings", {
      sellerId: userId,
      title: args.title,
      description: args.description,
      price: args.price,
      categoryId: args.categoryId,
      condition: args.condition,
      images: args.images,
      status: "active",
      contactMethod: args.contactMethod,
      contactInfo: args.contactInfo,
      isFeatured: false,
      views: 0,
    });
  },
});

export const updateListing = mutation({
  args: {
    id: v.id("listings"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    price: v.optional(v.number()),
    categoryId: v.optional(v.id("categories")),
    condition: v.optional(v.union(v.literal("new"), v.literal("like-new"), v.literal("good"), v.literal("fair"), v.literal("poor"))),
    images: v.optional(v.array(v.id("_storage"))),
    status: v.optional(v.union(v.literal("active"), v.literal("sold"), v.literal("pending"), v.literal("inactive"))),
    contactMethod: v.optional(v.union(v.literal("email"), v.literal("phone"), v.literal("message"))),
    contactInfo: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const listing = await ctx.db.get(args.id);
    if (!listing) throw new Error("Listing not found");
    if (listing.sellerId !== userId) throw new Error("Not authorized");

    const updates: any = {};
    if (args.title !== undefined) updates.title = args.title;
    if (args.description !== undefined) updates.description = args.description;
    if (args.price !== undefined) updates.price = args.price;
    if (args.categoryId !== undefined) updates.categoryId = args.categoryId;
    if (args.condition !== undefined) updates.condition = args.condition;
    if (args.images !== undefined) updates.images = args.images;
    if (args.status !== undefined) updates.status = args.status;
    if (args.contactMethod !== undefined) updates.contactMethod = args.contactMethod;
    if (args.contactInfo !== undefined) updates.contactInfo = args.contactInfo;

    await ctx.db.patch(args.id, updates);
    return args.id;
  },
});

export const deleteListing = mutation({
  args: { id: v.id("listings") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const listing = await ctx.db.get(args.id);
    if (!listing) throw new Error("Listing not found");
    if (listing.sellerId !== userId) throw new Error("Not authorized");

    await ctx.db.delete(args.id);
  },
});

export const incrementViews = mutation({
  args: { id: v.id("listings") },
  handler: async (ctx, args) => {
    const listing = await ctx.db.get(args.id);
    if (!listing) return;
    
    await ctx.db.patch(args.id, { views: listing.views + 1 });
  },
});

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});
