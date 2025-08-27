import axios from "axios";

export const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:3002/api";

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
  updateProfile: (data: { name: string; email: string }) => {
    return axios.put("/users/profile", data);
  },
  changePassword: (data: { currentPassword: string; newPassword: string }) => {
    return api.post("/auth/change-password", data);
  },
  uploadImage: (file: File) => {
    const formData = new FormData();
    formData.append("image", file);
    return api.post("/users/image", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  },
  updateImage: (file: File) => {
    const formData = new FormData();
    formData.append("image", file);
    return api.put("/users/image", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  },
  deleteImage: () => {
    return api.delete("/users/image");
  },
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
  updateMemberRole: (companyId: string, userId: string, role: string) =>
    api.patch(`/companies/${companyId}/members/${userId}/role`, { role }),
  // New image-related methods
  uploadImage: (id: string, imageFile: File) => {
    const formData = new FormData();
    formData.append("image", imageFile);
    return api.post(`/companies/${id}/image`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  },
  updateImage: (id: string, imageFile: File) => {
    const formData = new FormData();
    formData.append("image", imageFile);
    return api.put(`/companies/${id}/image`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
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
export interface TaskComment {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  userId: string;
  user?: {
    id: string;
    name: string;
    email: string;
    imageUrl?: string;
  };
  reactions?: Reaction[];
  mentions?: UserMention[];
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE";
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  dueDate?: string;
  startDate?: string;
  actualStartDate?: string;
  actualEndDate?: string;
  tags?: Tag[];
  dependencies?: Task[];
  dependencyFor?: Task[];
  parent?: Task | null;
  parentId?: string | null;
  subtasks?: Task[];
  comments?: TaskComment[];
  _count?: {
    comments?: number;
  };
}

export interface Tag {
  id: string;
  name: string;
  color: string;
}

export interface TaskCreateUpdatePayload {
  title?: string;
  description?: string;
  status?: "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE";
  priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  dueDate?: string;
  tagIds?: string[];
  startDate?: string;
  dependencyIds?: string[];
  parentId?: string | null;
}

export interface Reaction {
  id: string;
  emoji: string;
  createdAt: string;
  userId: string;
  commentId: string;
  user?: {
    id: string;
    name: string;
    imageUrl?: string;
  };
}

export interface UserMention {
  id: string;
  userId: string;
  commentId: string;
  user?: {
    id: string;
    name: string;
    imageUrl?: string;
  };
}

export const tasksAPI = {
  getAll: (projectId: string) => api.get<Task[]>(`/tasks/project/${projectId}`),
  getById: (id: string) => api.get<Task>(`/tasks/${id}`),
  create: (projectId: string, data: TaskCreateUpdatePayload) =>
    api.post<Task>(`/tasks/project/${projectId}`, {
      ...data,
      startDate: data.startDate || new Date().toISOString(),
    }),
  update: (id: string, data: TaskCreateUpdatePayload) =>
    api.put<Task>(`/tasks/${id}`, {
      ...data,
      ...(data.startDate && { startDate: data.startDate }),
    }),
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
  getAll: (projectId: string) =>
    api.get(`/project-details/project/${projectId}`),
  getById: (id: string) => api.get(`/project-details/${id}`),
  create: (
    projectId: string,
    data: { title: string; url: string; description?: string }
  ) => api.post(`/project-details/project/${projectId}`, data),
  update: (
    id: string,
    data: { title?: string; url?: string; description?: string }
  ) => api.put(`/project-details/${id}`, data),
  delete: (id: string) => api.delete(`/project-details/${id}`),
};

// Task Comments API
export const commentsAPI = {
  getAll: (taskId: string) => api.get<TaskComment[]>(`/tasks/${taskId}/comments`),
  create: (taskId: string, content: string) => 
    api.post<TaskComment>(`/tasks/${taskId}/comments`, { content }),
  update: (id: string, content: string) => 
    api.put<TaskComment>(`/comments/${id}`, { content }),
  delete: (id: string) => api.delete(`/comments/${id}`),
  // Reactions - Fix the endpoint paths
  getReactions: (commentId: string) => 
    api.get<Reaction[]>(`/comments/${commentId}/reactions`),
  
  addReaction: (commentId: string, emoji: string) => 
    api.post<Reaction>(`/comments/${commentId}/reactions`, { emoji }),
  
  removeReaction: (commentId: string, emoji: string) => 
    api.delete(`/comments/${commentId}/reactions/${encodeURIComponent(emoji)}`),
  
  // Users for mentions
  getUsersForMentions: (companyId: string) => 
    api.get<{id: string, name: string, imageUrl?: string}[]>(`/companies/${companyId}/users`)
};

export default api;
