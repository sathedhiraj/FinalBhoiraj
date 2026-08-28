import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      role: string;
      mandalId: string | null;
    };
  }

  interface User {
    role: string;
    mandalId: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    uid: string;
    role: string;
    mandalId: string | null;
  }
}
