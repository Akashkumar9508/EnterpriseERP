// import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { BrowserRouter } from 'react-router-dom';

import "./index.css"
import App from "./App.tsx"
import { ThemeProvider } from "@/components/theme-provider.tsx"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Provider } from 'react-redux';
import { store } from '@/store/store';

createRoot(document.getElementById("root")!).render(
  // <StrictMode>
    <BrowserRouter>
      <Provider store={store}>
        <ThemeProvider>
          <TooltipProvider>
            <App />
          </TooltipProvider>
        </ThemeProvider>
      </Provider>
    </BrowserRouter>
  // </StrictMode>
)
