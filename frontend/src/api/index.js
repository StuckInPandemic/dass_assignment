import axios from 'axios';

const API = axios.create({
    baseURL: meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api',
});

// Add JWT token to every request
API.interceptors.request.use((config) => {
    const token = localStorage.getItem('felicity_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Handle 401 responses
API.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('felicity_token');
            localStorage.removeItem('felicity_user');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

// Auth
export const registerUser = (data) => API.post('/auth/register', data);
export const loginUser = (data) => API.post('/auth/login', data);
export const getMe = () => API.get('/auth/me');

// Participant
export const updateParticipantProfile = (data) => API.put('/participant/profile', data);
export const completeOnboarding = (data) => API.put('/participant/onboarding', data);
export const followOrganizer = (id) => API.post(`/participant/follow/${id}`);
export const unfollowOrganizer = (id) => API.delete(`/participant/follow/${id}`);
export const changePassword = (data) => API.put('/participant/change-password', data);

// Events
export const getEvents = (params) => API.get('/events', { params });
export const getTrendingEvents = () => API.get('/events/trending');
export const getEvent = (id) => API.get(`/events/${id}`);
export const createEvent = (data) => API.post('/events', data);
export const updateEvent = (id, data) => API.put(`/events/${id}`, data);
export const publishEvent = (id) => API.put(`/events/${id}/publish`);
export const changeEventStatus = (id, data) => API.put(`/events/${id}/status`, data);
export const closeRegistrations = (id) => API.put(`/events/${id}/close-registrations`);
export const getEventParticipants = (id, params) => API.get(`/events/${id}/participants`, { params });
export const getEventAnalytics = (id) => API.get(`/events/${id}/analytics`);
export const exportParticipantsCSV = (id) => API.get(`/events/${id}/participants/export`, { responseType: 'blob' });
export const getMessages = (id, params) => API.get(`/events/${id}/messages`, { params });
export const deleteMessage = (eventId, messageId) => API.delete(`/events/${eventId}/messages/${messageId}`);

// Registration
export const registerForEvent = (id, data) => API.post(`/events/${id}/register`, data);
export const purchaseMerch = (id, data) => API.post(`/events/${id}/purchase`, data);
export const getMyRegistrations = () => API.get('/participant/registrations');
export const getRegistration = (id) => API.get(`/participant/registrations/${id}`);
export const uploadPaymentProof = (id, formData) => API.post(`/participant/registrations/${id}/payment-proof`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });

// Organizer
export const getOrganizerProfile = () => API.get('/organizer/profile');
export const updateOrganizerProfile = (data) => API.put('/organizer/profile', data);
export const getOrganizerEvents = () => API.get('/organizer/events');
export const getOrganizerDashboard = () => API.get('/organizer/dashboard');
export const requestPasswordReset = (data) => API.post('/organizer/password-reset-request', data);
export const getMyResetRequests = () => API.get('/organizer/password-reset-requests');
export const getEventOrders = (id, params) => API.get(`/organizer/events/${id}/orders`, { params });
export const approveOrder = (id, data) => API.put(`/organizer/registrations/${id}/approve`, data);
export const scanTicket = (id, data) => API.post(`/organizer/events/${id}/scan`, data);
export const getAttendance = (id) => API.get(`/organizer/events/${id}/attendance`);
export const exportAttendanceCSV = (id) => API.get(`/organizer/events/${id}/attendance/export`, { responseType: 'blob' });
export const manualAttendance = (eventId, regId, data) => API.put(`/organizer/events/${eventId}/attendance/${regId}`, data);

// Admin
export const getAdminOrganizers = () => API.get('/admin/organizers');
export const createOrganizer = (data) => API.post('/admin/organizers', data);
export const removeOrganizer = (id, action) => API.delete(`/admin/organizers/${id}?action=${action}`);
export const restoreOrganizer = (id) => API.put(`/admin/organizers/${id}/restore`);
export const getPasswordResets = () => API.get('/admin/password-resets');
export const resolvePasswordReset = (id, data) => API.put(`/admin/password-resets/${id}`, data);

// Clubs
export const getClubs = () => API.get('/clubs');
export const getClubDetail = (id) => API.get(`/clubs/${id}`);

export default API;
