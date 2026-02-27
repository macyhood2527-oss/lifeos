import passport from "passport";
import { Strategy as GoogleStrategy, Profile } from "passport-google-oauth20";
import { env } from "./env";
import { findOrCreateUserFromGoogle, findUserById } from "../modules/users/users.service";
import type { SessionUser } from "../modules/auth/types";

export function configurePassport() {
  passport.use(
    new GoogleStrategy(
      {
        clientID: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
        callbackURL: env.GOOGLE_CALLBACK_URL,
      },
      async (_accessToken, _refreshToken, profile: Profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;
          const name = profile.displayName || "LifeOS User";
          const avatarUrl = profile.photos?.[0]?.value ?? null;

          if (!email) return done(new Error("Google account has no email"), undefined);

          const user = await findOrCreateUserFromGoogle({
            googleId: profile.id,
            email,
            name,
            avatarUrl,
          });

          return done(null, user);
        } catch (err) {
          return done(err as Error, undefined);
        }
      }
    )
  );

  passport.serializeUser((user, done) => {
    const u = user as SessionUser;
    done(null, u.id);
  });

  passport.deserializeUser(async (id: any, done) => {
    try {
      const userId = Number(id);
      if (!Number.isFinite(userId)) return done(new Error("Invalid session user id"), null);

      const user = await findUserById(userId);
      return done(null, user ?? null);
    } catch (err) {
      return done(err as Error, null);
    }
  });

  console.log("GOOGLE_CLIENT_ID:", env.GOOGLE_CLIENT_ID);
console.log("GOOGLE_CALLBACK_URL:", env.GOOGLE_CALLBACK_URL);

  return passport;
}