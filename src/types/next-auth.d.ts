import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      roleId: string;
      roleCode: string;
      siteId: string | null;
      permissions: string[];
    } & DefaultSession["user"];
  }

  interface User {
    roleId: string;
    roleCode: string;
    siteId: string | null;
    permissions: string[];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    roleId?: string;
    roleCode?: string;
    siteId?: string | null;
    permissions?: string[];
  }
}
