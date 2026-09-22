import { Layout } from "./components/Layout";
import { Onboarding } from "./components/Onboarding";
import { useRoute } from "./lib/router";
import { ChartsPage } from "./pages/ChartsPage";
import { HomePage } from "./pages/HomePage";
import { LearnPage, LessonView } from "./pages/LearnPage";
import { MathGym } from "./pages/MathGym";
import { MePage } from "./pages/MePage";
import { PostflopSession } from "./pages/PostflopSession";
import { PreflopSession } from "./pages/PreflopSession";

export default function App() {
  const { path, params } = useRoute();
  const key = `${path}?${params.toString()}`;
  let page;
  switch (path) {
    case "/preflop":
      page = <PreflopSession key={key} mode={params.get("mode") === "today" ? "today" : "free"} />;
      break;
    case "/daily":
      page = <PreflopSession key={key} mode="daily" />;
      break;
    case "/review":
      page = <PreflopSession key={key} mode="review" />;
      break;
    case "/postflop":
      page = <PostflopSession key={key} />;
      break;
    case "/math":
      page = <MathGym key={key} />;
      break;
    case "/lesson":
      page = <LessonView key={key} />;
      break;
    case "/learn":
      page = params.get("day") ? <LessonView key={key} /> : <LearnPage />;
      break;
    case "/charts":
      page = <ChartsPage key={key} />;
      break;
    case "/me":
    case "/progress":
    case "/settings":
    case "/legends":
      page = <MePage />;
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
