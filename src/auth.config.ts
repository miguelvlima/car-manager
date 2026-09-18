import { NextAuthConfig } from "next-auth";

export const authConfig = {
  trustHost: true,
  session: { strategy: "jwt", maxAge: 60 * 60 * 12 },
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const isLoggedIn = Boolean(auth?.user);
      const isLogin = request.nextUrl.pathname.startsWith("/login");
      if (isLogin) return true;
      return isLoggedIn;
    },
  },
} satisfies NextAuthConfig;
