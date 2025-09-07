import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import "react-datepicker/dist/react-datepicker.css";

// Check for dark mode preference
if (localStorage.getItem('darkMode') === 'true') {
  document.documentElement.classList.add('dark');
}
// app.enableCors({
//   origin: process.env.FRONTEND_URL,
//   credentials: true,
// });
const FRONTEND_URL = import.meta.env.VITE_FRONTEND_URL ?? 'http://localhost:5173';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)