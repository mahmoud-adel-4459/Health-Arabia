import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

interface RouterContextType {
  path: string;
  search: string;
  params: Record<string, string>;
  navigate: (to: string, options?: { replace?: boolean }) => void;
}

const RouterContext = createContext<RouterContextType>({
  path: window.location.pathname,
  search: window.location.search,
  params: {},
  navigate: () => {},
});

function matchRoute(currentPath: string): { path: string; params: Record<string, string> } {
  // Check /accounts/:id
  const accountMatch = currentPath.match(/^\/accounts\/([a-zA-Z0-9_-]+)\/?$/);
  if (accountMatch) {
    return { path: "/accounts/:id", params: { id: accountMatch[1] } };
  }

  // Check /facility-changes/:id
  const changeMatch = currentPath.match(/^\/facility-changes\/([a-zA-Z0-9_-]+)\/?$/);
  if (changeMatch) {
    return { path: "/facility-changes/:id", params: { id: changeMatch[1] } };
  }

  // Check /facility-changes
  if (currentPath === "/facility-changes" || currentPath === "/facility-changes/") {
    return { path: "/facility-changes", params: {} };
  }

  // Check /doctor-changes/:id
  const doctorChangeMatch = currentPath.match(/^\/doctor-changes\/([a-zA-Z0-9_-]+)\/?$/);
  if (doctorChangeMatch) {
    return { path: "/doctor-changes/:id", params: { id: doctorChangeMatch[1] } };
  }

  // Check /doctor-changes
  if (currentPath === "/doctor-changes" || currentPath === "/doctor-changes/") {
    return { path: "/doctor-changes", params: {} };
  }

  // Check /jobs/:id
  const jobMatch = currentPath.match(/^\/jobs\/([a-zA-Z0-9_-]+)\/?$/);
  if (jobMatch) {
    return { path: "/jobs/:id", params: { id: jobMatch[1] } };
  }

  // Check /jobs
  if (currentPath === "/jobs" || currentPath === "/jobs/") {
    return { path: "/jobs", params: {} };
  }

  // Check /deletion-requests/:id and /deletion-requests
  const deletionMatch = currentPath.match(/^\/deletion-requests\/([a-zA-Z0-9_-]+)\/?$/);
  if (deletionMatch) {
    return { path: "/deletion-requests/:id", params: { id: deletionMatch[1] } };
  }
  if (currentPath === "/deletion-requests" || currentPath === "/deletion-requests/") {
    return { path: "/deletion-requests", params: {} };
  }

  // Countries: /countries/new, /countries/:id, /countries
  if (currentPath === "/countries/new" || currentPath === "/countries/new/") {
    return { path: "/countries/new", params: {} };
  }
  const countryMatch = currentPath.match(/^\/countries\/([a-zA-Z0-9_-]+)\/?$/);
  if (countryMatch) {
    return { path: "/countries/:id", params: { id: countryMatch[1] } };
  }

  // Hire requests: /hire-requests/:id and /hire-requests
  const hireMatch = currentPath.match(/^\/hire-requests\/([a-zA-Z0-9_-]+)\/?$/);
  if (hireMatch) {
    return { path: "/hire-requests/:id", params: { id: hireMatch[1] } };
  }

  // Contact messages: /contact-submissions/:id
  const contactMatch = currentPath.match(/^\/contact-submissions\/([a-zA-Z0-9_-]+)\/?$/);
  if (contactMatch) {
    return { path: "/contact-submissions/:id", params: { id: contactMatch[1] } };
  }

  // Check /hire-requests
  if (currentPath === "/hire-requests" || currentPath === "/hire-requests/") {
    return { path: "/hire-requests", params: {} };
  }

  // Check /applications/:id and /applications
  const appMatch = currentPath.match(/^\/applications\/([a-zA-Z0-9_-]+)\/?$/);
  if (appMatch) {
    return { path: "/applications/:id", params: { id: appMatch[1] } };
  }
  if (currentPath === "/applications" || currentPath === "/applications/") {
    return { path: "/applications", params: {} };
  }

  // Platform areas
  for (const area of ["/overview", "/countries", "/settings", "/directory", "/reference-data", "/contact-submissions", "/audit"]) {
    if (currentPath === area || currentPath === area + "/") {
      return { path: area, params: {} };
    }
  }

  // Check /accounts or /
  if (currentPath === "/" || currentPath === "/accounts" || currentPath === "/accounts/") {
    return { path: "/accounts", params: {} };
  }

  if (currentPath === "/login" || currentPath === "/login/") {
    return { path: "/login", params: {} };
  }

  return { path: currentPath, params: {} };
}

export function RouterProvider({ children }: { children: React.ReactNode }) {
  const [currentUrl, setCurrentUrl] = useState(() => ({
    pathname: window.location.pathname,
    search: window.location.search,
  }));

  useEffect(() => {
    const handlePopState = () => {
      setCurrentUrl({
        pathname: window.location.pathname,
        search: window.location.search,
      });
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const navigate = useCallback((to: string, options?: { replace?: boolean }) => {
    const url = new URL(to, window.location.origin);
    const targetPath = url.pathname;
    const targetSearch = url.search;

    if (options?.replace) {
      window.history.replaceState({}, "", `${targetPath}${targetSearch}`);
    } else {
      window.history.pushState({}, "", `${targetPath}${targetSearch}`);
    }

    setCurrentUrl({
      pathname: targetPath,
      search: targetSearch,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const { path: routePattern, params } = matchRoute(currentUrl.pathname);

  return (
    <RouterContext.Provider
      value={{
        path: routePattern,
        search: currentUrl.search,
        params,
        navigate,
      }}
    >
      {children}
    </RouterContext.Provider>
  );
}

export function useRouter() {
  return useContext(RouterContext);
}
