import { useState, useEffect } from "react";
import { Route, Switch, Redirect } from "wouter";
import { Toaster } from "./components/ui/sonner";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import Purchase from "./pages/Purchase";
import Sales from "./pages/Sales";
import Inventory from "./pages/Inventory";
import Customers from "./pages/Customers";
import AppLayout from "./components/AppLayout";

export default function App() {
  const [username, setUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = localStorage.getItem("jindun_user");
    const token = localStorage.getItem("jindun_token");
    if (user && token) {
      setUsername(user);
    }
    setLoading(false);
  }, []);

  const handleLogin = (user: string) => {
    setUsername(user);
  };

  const handleLogout = () => {
    localStorage.removeItem("jindun_user");
    localStorage.removeItem("jindun_token");
    setUsername(null);
  };

  if (loading) {
    return (
      <>
        <Toaster position="top-right" richColors />
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-muted-foreground">加载中...</div>
        </div>
      </>
    );
  }

  if (!username) {
    return (
      <>
        <Toaster position="top-right" richColors />
        <Login onLogin={handleLogin} />
      </>
    );
  }

  return (
    <>
      <Toaster position="top-right" richColors />
      <AppLayout username={username} onLogout={handleLogout}>
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/dashboard" component={Dashboard} />
          <Route path="/products" component={Products} />
          <Route path="/purchase" component={Purchase} />
          <Route path="/sales" component={Sales} />
          <Route path="/inventory" component={Inventory} />
          <Route path="/customers" component={Customers} />
          <Route>
            <Redirect to="/" />
          </Route>
        </Switch>
      </AppLayout>
    </>
  );
}
