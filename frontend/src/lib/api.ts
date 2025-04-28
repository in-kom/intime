import axios from "axios";

export const API_URL = "http://localhost:3000/api";

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add auth token to requests if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth API
export const authAPI = {
  login: (email: string, password: string) =>
    api.post("/auth/login", { email, password }),
  register: (name: string, email: string, password: string) =>
    api.post("/auth/register", { name, email, password }),
  getMe: () => api.get("/auth/me"),
};

// Companies API
export const companiesAPI = {
  getAll: () => api.get("/companies"),
  getById: (id: string) => api.get(`/companies/${id}`),
  create: (data: { name: string; description?: string }) =>
    api.post("/companies", data),
  update: (id: string, data: { name: string; description?: string }) =>
    api.put(`/companies/${id}`, data),
  delete: (id: string) => api.delete(`/companies/${id}`),
  addMember: (id: string, email: string) =>
    api.post(`/companies/${id}/members`, { email }),
  removeMember: (id: string, userId: string) =>
    api.delete(`/companies/${id}/members/${userId}`),
  // New image-related methods
  uploadImage: (id: string, imageFile: File) => {
    const formData = new FormData();
    formData.append('image', imageFile);
    return api.post(`/companies/${id}/image`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  },
  updateImage: (id: string, imageFile: File) => {
    const formData = new FormData();
    formData.append('image', imageFile);
    return api.put(`/companies/${id}/image`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  },
  deleteImage: (id: string) => api.delete(`/companies/${id}/image`),
};

// Projects API
export const projectsAPI = {
  getAll: (companyId: string) => api.get(`/projects/company/${companyId}`),
  getById: (id: string) => api.get(`/projects/${id}`),
  create: (companyId: string, data: { name: string; description?: string }) =>
    api.post(`/projects/company/${companyId}`, data),
  update: (id: string, data: { name?: string; description?: string }) =>
    api.put(`/projects/${id}`, data),
  delete: (id: string) => api.delete(`/projects/${id}`),
};

// Tasks API
export const tasksAPI = {
  getAll: (projectId: string) => api.get(`/tasks/project/${projectId}`),
  getById: (id: string) => api.get(`/tasks/${id}`),
  create: (
    projectId: string,
    data: {
      title: string;
      description?: string;
      status?: "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE";
      priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
      dueDate?: string;
      tagIds?: string[];
    }
  ) => api.post(`/tasks/project/${projectId}`, data),
  update: (
    id: string,
    data: {
      title?: string;
      description?: string;
      status?: "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE";
      priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
      dueDate?: string;
      tagIds?: string[];
    }
  ) => api.put(`/tasks/${id}`, data),
  delete: (id: string) => api.delete(`/tasks/${id}`),
};

// Tags API
export const tagsAPI = {
  getAll: (projectId: string) => api.get(`/tags/project/${projectId}`),
  create: (projectId: string, data: { name: string; color?: string }) =>
    api.post(`/tags/project/${projectId}`, data),
  update: (id: string, data: { name?: string; color?: string }) =>
    api.put(`/tags/${id}`, data),
  delete: (id: string) => api.delete(`/tags/${id}`),
};

// Project Details API
export const projectDetailsAPI = {
  getAll: (projectId: string) => api.get(`/project-details/project/${projectId}`),
  getById: (id: string) => api.get(`/project-details/${id}`),
  create: (projectId: string, data: { title: string; url: string; description?: string }) =>
    api.post(`/project-details/project/${projectId}`, data),
  update: (id: string, data: { title?: string; url?: string; description?: string }) =>
    api.put(`/project-details/${id}`, data),
  delete: (id: string) => api.delete(`/project-details/${id}`),
};

export default api;
