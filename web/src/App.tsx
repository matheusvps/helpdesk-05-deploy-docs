import { Link, Navigate, Outlet, Route, Routes, useNavigate } from 'react-router-dom';
import { LoginPage } from './pages/LoginPage';
import { clearSession, getToken, getUser } from './session';

function RequireLogin() {
  return getToken() ? <Layout /> : <Navigate to="/login" replace />;
}

function Layout() {
  const navigate = useNavigate();
  const user = getUser();

  function logout() {
    clearSession();
    navigate('/login');
  }

  return (
    <>
      <header>
        <Link to="/">Chamados</Link>
        <Link to="/tickets/new">Novo chamado</Link>
        <span className="spacer" />
        <span>
          {user?.name} ({user?.role === 'atendente' ? 'atendente' : 'solicitante'})
        </span>
        <button type="button" onClick={logout}>
          Sair
        </button>
      </header>
      <main>
        <Outlet />
      </main>
    </>
  );
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<RequireLogin />}>
        <Route path="/" element={<p>Em breve: lista de chamados.</p>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
