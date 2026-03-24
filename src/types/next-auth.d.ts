import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      phase: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    role: string;
    phase: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: string;
    phase: string | null;
  }
}
