import Dashboard from "./components/Dashboard";
import Login from "./components/Login";
import { Routes, Route } from 'react-router-dom';
import Unauthorized from "./components/Unauthorized";
import { ThemeProvider } from "./ThemeContext";

function App() {
  const token = localStorage.getItem('token');
  const adminUserStr = localStorage.getItem('adminUser');
  let isAdmin = false;

  try {
    const adminUser = adminUserStr ? JSON.parse(adminUserStr) : null;
    isAdmin = Boolean(token && adminUser?.isAdmin === true);
  } catch {
    isAdmin = false;
  }

  return (
    <ThemeProvider>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard/*" element={isAdmin ? <Dashboard /> : <Unauthorized />} />
      </Routes>
    </ThemeProvider>
  );
}

export default App;
