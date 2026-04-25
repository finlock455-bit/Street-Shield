import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const api = axios.create({
    baseURL: API,
    timeout: 15000,
});

export const ShieldAPI = {
    getState: () => api.get("/shield/state").then((r) => r.data),
    setState: (data) => api.post("/shield/state", data).then((r) => r.data),

    listContacts: () => api.get("/contacts").then((r) => r.data),
    addContact: (data) => api.post("/contacts", data).then((r) => r.data),
    deleteContact: (id) => api.delete(`/contacts/${id}`).then((r) => r.data),

    listAlerts: () => api.get("/alerts").then((r) => r.data),
    sendAlert: (data) => api.post("/alerts", data).then((r) => r.data),

    getActivity: () => api.get("/activity").then((r) => r.data),
};
