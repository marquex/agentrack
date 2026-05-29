import { BrowserRouter, Routes, Route } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppLayout } from "./components/layout/AppLayout";
import { IssuesPage } from "./pages/IssuesPage";
import { IssueDetailPage } from "./pages/IssueDetailPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: true,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppLayout>
          <Routes>
            <Route path="/" element={<IssuesPage />} />
            <Route path="/issues/:id" element={<IssueDetailPage />} />
          </Routes>
        </AppLayout>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
