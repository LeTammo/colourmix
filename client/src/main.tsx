import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Navigate, Route, Routes } from "react-router";
import './index.css'
import App from './App.tsx'
import Login from './components/Login.tsx';
import GamesList from './components/GamesList.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="login" element={<Login />} />
        <Route path="games">
          <Route index element={<GamesList />} />
          <Route path=":id" element={<App />} />
        </Route>
    </Routes>
    </BrowserRouter>
  </StrictMode>,
)
