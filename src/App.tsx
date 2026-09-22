import { Layout } from "./components/Layout";
import { Onboarding } from "./components/Onboarding";
import { useRoute } from "./lib/router";
import { ChartsPage } from "./pages/ChartsPage";
import { HomePage } from "./pages/HomePage";
import { LearnPage } from "./pages/LearnPage";
import { LegendsPage } from "./pages/LegendsPage";
import { MathGym } from "./pages/MathGym";
import { PostflopTrainer } from "./pages/PostflopTrainer";
import { PreflopTrainer } from "./pages/PreflopTrainer";
import { ProgressPage } from "./pages/ProgressPage";
import { SettingsPage } from "./pages/SettingsPage";

export default function App() {
  const { path, params } = useRoute();
  const key = `${path}?${params.toString()}`;
  let page;
  switch (path) {
    case "/preflop":
      page = <PreflopTrainer key={key} />;
      break;
    case "/postflop":
      page = <PostflopTrainer key={key} />;
      break;
    case "/charts":
      page = <ChartsPage key={key} />;
      break;
    case "/learn":
      page = <LearnPage />;
      break;
    case "/math":
      page = <MathGym key={key} />;
      break;
    case "/progress":
      page = <ProgressPage />;
      break;
    case "/legends":
      page = <LegendsPage />;
      break;
    case "/settings":
      page = <SettingsPage />;
      break;
    default:
      page = <HomePage />;
  }
  return (
    <Layout>
      {page}
      <Onboarding />
    </Layout>
  );
}
