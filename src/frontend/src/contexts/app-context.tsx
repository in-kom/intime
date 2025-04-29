import { createContext, useState, useEffect, ReactNode } from "react";
import { companiesAPI } from "@/lib/api";

interface Company {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
}

interface AppContextType {
  companies: Company[];
  activeCompany: Company | null;
  setActiveCompany: (company: Company) => void;
  isLoading: boolean;
}

export const AppContext = createContext<AppContextType>({
  companies: [],
  activeCompany: null,
  setActiveCompany: () => {},
  isLoading: true,
});

interface AppProviderProps {
  children: ReactNode;
}

export function AppProvider({ children }: AppProviderProps) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [activeCompany, setActiveCompany] = useState<Company | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        setIsLoading(true);
        const response = await companiesAPI.getAll();
        setCompanies(response.data);
        if (response.data.length > 0) {
          setActiveCompany(response.data[0]);
        }
      } catch (error) {
        console.error("Failed to fetch companies", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCompanies();
  }, []);

  return (
    <AppContext.Provider
      value={{
        companies,
        activeCompany,
        setActiveCompany,
        isLoading,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}
