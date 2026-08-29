import {
  convexAuthNextjsMiddleware,
  createRouteMatcher,
  isAuthenticatedNextjs,
  nextjsMiddlewareRedirect,
} from "@convex-dev/auth/nextjs/server";

const isProtectedRoute = createRouteMatcher([
  "/admin(.*)",
  "/dashboard(.*)",
  "/code(.*)",
  "/bookmarks(.*)",
]);
const isAuthPage = createRouteMatcher(["/login", "/signup"]);

export default convexAuthNextjsMiddleware(async (request) => {
  const authed = await isAuthenticatedNextjs();

  if (isProtectedRoute(request) && !authed) {
    return nextjsMiddlewareRedirect(request, "/login");
  }

  if (isAuthPage(request) && authed) {
    return nextjsMiddlewareRedirect(request, "/dashboard");
  }
});

export const config = {
  matcher: [
    "/((?!.*\\..*|_next).*)",
    "/",
    "/(api|trpc)(.*)",
  ],
};