import { createRoot } from "react-dom/client";
import { AppProvider } from "@/lib/store/state";
import ToastHost from "@/components/ToastHost";
import AppShell from "@/components/AppShell";
import Root from "@/app/page";
import Welcome from "@/app/welcome/page";
import Home from "@/app/(studio)/home/page";
import Wardrobe from "@/app/(studio)/wardrobe/page";
import Studio from "@/app/(studio)/studio/page";
import TryOn from "@/app/(studio)/try-on/page";
import Looks from "@/app/(studio)/looks/page";
import Profile from "@/app/(studio)/profile/page";
import { parseHash, useHash } from "./navigation";

const PAGES: Record<string, () => React.ReactElement> = {
  "/home": Home, "/wardrobe": Wardrobe, "/studio": Studio, "/try-on": TryOn, "/looks": Looks, "/profile": Profile,
};

function App() {
  const h = useHash();
  const { path } = parseHash(h);
  if (path === "/welcome") return <Welcome />;
  const Page = PAGES[path];
  if (!Page) return <Root />;
  return <AppShell><Page key={h} /></AppShell>;
}

createRoot(document.getElementById("root")!).render(
  <AppProvider>
    <App />
    <ToastHost />
  </AppProvider>,
);
