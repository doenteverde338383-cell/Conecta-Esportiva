import {
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const sportProfiles = pgTable("sport_profiles", {
  userId: text("user_id").primaryKey(),
  name: text("name").notNull(),
  username: text("username").notNull(),
  age: integer("age"),
  sport: text("sport").notNull(),
  role: text("role").notNull(),
  city: text("city"),
  photoPath: text("photo_path"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  usernameIdx: uniqueIndex("sport_profiles_username_idx").on(table.username),
}));

export const sportVideos = pgTable("sport_videos", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => sportProfiles.userId, { onDelete: "cascade" }),
  description: text("description").notNull(),
  sport: text("sport").notNull(),
  tags: jsonb("tags").$type<string[]>().notNull().default([]),
  videoPath: text("video_path").notNull(),
  contentType: text("content_type").notNull(),
  originalName: text("original_name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const sportVideoMedia = pgTable("sport_video_media", {
  id: text("id").primaryKey(),
  videoId: text("video_id").notNull().references(() => sportVideos.id, { onDelete: "cascade" }),
  objectPath: text("object_path").notNull(),
  contentType: text("content_type").notNull(),
  originalName: text("original_name").notNull(),
  position: integer("position").notNull().default(0),
});

export const sportVideoLikes = pgTable("sport_video_likes", {
  videoId: text("video_id").notNull().references(() => sportVideos.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => sportProfiles.userId, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.videoId, table.userId] }),
}));

export const sportVideoStars = pgTable("sport_video_stars", {
  videoId: text("video_id").notNull().references(() => sportVideos.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => sportProfiles.userId, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.videoId, table.userId] }),
}));

export const sportVideoComments = pgTable("sport_video_comments", {
  id: text("id").primaryKey(),
  videoId: text("video_id").notNull().references(() => sportVideos.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => sportProfiles.userId, { onDelete: "cascade" }),
  body: text("body").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const sportChallenges = pgTable("sport_challenges", {
  id: text("id").primaryKey(),
  creatorId: text("creator_id").notNull().references(() => sportProfiles.userId, { onDelete: "cascade" }),
  sport: text("sport").notNull(),
  type: text("type").notNull(),
  date: text("date").notNull(),
  time: text("time").notNull(),
  location: text("location").notNull(),
  participants: jsonb("participants").$type<string[]>().notNull().default([]),
  message: text("message").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const sportChallengeParticipants = pgTable("sport_challenge_participants", {
  challengeId: text("challenge_id").notNull().references(() => sportChallenges.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => sportProfiles.userId, { onDelete: "cascade" }),
  status: text("status").notNull().default("invited"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.challengeId, table.userId] }),
}));

export const sportFollows = pgTable("sport_follows", {
  followerId: text("follower_id").notNull().references(() => sportProfiles.userId, { onDelete: "cascade" }),
  followedId: text("followed_id").notNull().references(() => sportProfiles.userId, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.followerId, table.followedId] }),
}));

export const sportInvitations = pgTable("sport_invitations", {
  id: text("id").primaryKey(),
  teacherId: text("teacher_id").notNull().references(() => sportProfiles.userId, { onDelete: "cascade" }),
  athleteId: text("athlete_id").notNull().references(() => sportProfiles.userId, { onDelete: "cascade" }),
  kind: text("kind").notNull(),
  message: text("message").notNull(),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});