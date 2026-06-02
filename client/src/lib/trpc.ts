import { createTRPCReact } from "@trpc/react-query";
import { httpBatchLink } from "@trpc/client";
import superjson from "superjson";
import type { AppRouter } from "../../../api/trpc";

export const trpc = createTRPCReact<AppRouter>();

export function getToken(): string | null {
  return localStorage.getItem("jindun_token");
}

export function setToken(token: string): void {
  localStorage.setItem("jindun_token", token);
}

export function removeToken(): void {
  localStorage.removeItem("jindun_token");
  localStorage.removeItem("jindun_user");
}

export function createTrpcClient() {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: "/api/trpc",
        transformer: superjson,
        headers() {
          const token = getToken();
          return token ? { Authorization: `Bearer ${token}` } : {};
        },
      }),
    ],
  });
}
