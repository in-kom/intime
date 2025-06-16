import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { authAPI } from "@/lib/api";
import { useNavigate } from "react-router-dom";

type User = {
  id: string;
  name: string;
  email: string;
  imageUrl?: string;
};

type AuthContextType = {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  error: string | null;
  updateUser: (userData: any) => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem("token"));
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const navigate = useNavigate();

  useEffect(() => {
    const loadUser = async () => {
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await authAPI.getMe();
        setUser(response.data);
      } catch (error) {
        console.error("Failed to load user", error);
        localStorage.removeItem("token");
        setToken(null);
      } finally {
        setIsLoading(false);
      }
    };

    loadUser();
  }, [token]);

  const login = async (email: string, password: string) => {
    try {
      setError(null);
      setIsLoading(true);
      const response = await authAPI.login(email, password);
      const { token, ...userData } = response.data;
      
      localStorage.setItem("token", token);
      localStorage.setItem("userId", userData.id); // Store userId in localStorage
      setToken(token);
      setUser(userData);
      navigate("/");
    } catch (error: any) {
      setError(error.response?.data?.message || "Login failed");
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (name: string, email: string, password: string) => {
    try {
      setError(null);
      setIsLoading(true);
      const response = await authAPI.register(name, email, password);
      const { token, ...userData } = response.data;
      
      localStorage.setItem("token", token);
      localStorage.setItem("userId", userData.id); // Store userId in localStorage
      setToken(token);
      setUser(userData);
      navigate("/");
    } catch (error: any) {
      setError(error.response?.data?.message || "Registration failed");
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userId"); // Also remove userId on logout
    setToken(null);
    setUser(null);
    navigate("/login");
  };

  const updateUser = (userData: any) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
    if (userData?.id) {
      localStorage.setItem("userId", userData.id); // Ensure userId is stored on user update
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, token, login, register, logout, isLoading, error, updateUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
