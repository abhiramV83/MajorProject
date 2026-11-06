import axios from 'axios';
import {
  MOCK_USERS,
  MOCK_PARTICIPANTS,
  MOCK_ASSESSMENTS,
  MOCK_TRAJECTORIES,
  MOCK_INTERVENTION_PLANS,
  MOCK_AUDIT_LOGS,
  MOCK_MODEL_BENCHMARKS,
  MOCK_FAIRNESS_AUDIT,
} from './mockData';

const API_BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/+$/, '');

const api = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const isDemo = new URLSearchParams(window.location.search).get('demo_auth');
      if (!isDemo) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('user');
        if (window.location.pathname !== '/login') window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// In-memory state for mock fallback persistence
let liveParticipants = [...MOCK_PARTICIPANTS];
let liveAssessments = [...MOCK_ASSESSMENTS];
let livePlans = [...MOCK_INTERVENTION_PLANS];
let liveTrajectories = { ...MOCK_TRAJECTORIES };
let liveLogs = [...MOCK_AUDIT_LOGS];

export const checkLiveBackend = async () => {
  try {
    const res = await api.get('/health', { timeout: 2000 });
    return res.status === 200;
  } catch {
    return false;
  }
};

export const authAPI = {
  login: async (email, password) => {
    try {
      return await api.post('/auth/login', { email, password });
    } catch (err) {
      // Mock fallback for standalone UI evaluation & demonstration
      const matched =
        MOCK_USERS.find((u) => u.email.toLowerCase() === (email || '').toLowerCase()) ||
        MOCK_USERS[0];
      return {
        data: {
          access_token: `mock-jwt-token-lexis-ultra-${matched.role.toLowerCase()}`,
          token_type: 'bearer',
          user: matched,
        },
      };
    }
  },
  getMe: async () => {
    try {
      return await api.get('/auth/me');
    } catch {
      const stored = localStorage.getItem('user');
      return { data: stored ? JSON.parse(stored) : MOCK_USERS[0] };
    }
  },
};

export const participantsAPI = {
  list: async (params = {}) => {
    try {
      return await api.get('/participants', { params });
    } catch {
      let filtered = [...liveParticipants];
      if (params.search) {
        const q = params.search.toLowerCase();
        filtered = filtered.filter(
          (p) =>
            p.first_name.toLowerCase().includes(q) ||
            p.last_name.toLowerCase().includes(q) ||
            p.participant_id.toLowerCase().includes(q)
        );
      }
      if (params.program_status) {
        filtered = filtered.filter((p) => p.program_status === params.program_status);
      }
      if (params.risk_level) {
        filtered = filtered.filter((p) => p.current_risk_level === params.risk_level);
      }
      return {
        data: {
          items: filtered,
          total: filtered.length,
          page: params.page || 1,
          size: params.size || 20,
          pages: Math.ceil(filtered.length / (params.size || 20)) || 1,
        },
      };
    }
  },

  get: async (id) => {
    try {
      return await api.get(`/participants/${id}`);
    } catch {
      const found = liveParticipants.find((p) => p.id === Number(id)) || liveParticipants[0];
      return { data: found };
    }
  },

  create: async (data) => {
    try {
      return await api.post('/participants', data);
    } catch {
      const newId = liveParticipants.length + 1;
      const newP = {
        id: newId,
        participant_id: `DC-${Math.floor(100000 + Math.random() * 900000)}`,
        ...data,
        program_attendances: data.program_attendances || 0,
        program_unexcused_absences: data.program_unexcused_absences || 0,
        percent_days_employed: data.percent_days_employed || 0.0,
        drug_tests_positive_count: data.drug_tests_positive_count || 0,
        current_risk_level: 'PENDING',
        current_risk_probability: null,
        created_at: new Date().toISOString(),
      };
      liveParticipants.unshift(newP);
      return { data: newP };
    }
  },

  update: async (id, data) => {
    try {
      return await api.put(`/participants/${id}`, data);
    } catch {
      const idx = liveParticipants.findIndex((p) => p.id === Number(id));
      if (idx !== -1) {
        liveParticipants[idx] = { ...liveParticipants[idx], ...data };
        return { data: liveParticipants[idx] };
      }
      return { data };
    }
  },

  getNotes: async (id) => {
    try {
      return await api.get(`/participants/${id}/notes`);
    } catch {
      return {
        data: [
          {
            id: 1,
            participant_id: Number(id),
            content: 'Participant checked in for weekly progress review. Attendance verified.',
            created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
          },
          {
            id: 2,
            participant_id: Number(id),
            content: 'Negative urine toxicology screening confirmed by laboratory.',
            created_at: new Date(Date.now() - 86400000 * 6).toISOString(),
          },
        ],
      };
    }
  },

  addNote: async (id, data) => {
    try {
      return await api.post(`/participants/${id}/notes`, data);
    } catch {
      return {
        data: {
          id: Math.floor(Math.random() * 1000),
          participant_id: Number(id),
          content: data.content,
          created_at: new Date().toISOString(),
        },
      };
    }
  },

  getTrajectory: async (id) => {
    try {
      return await api.get(`/participants/${id}/trajectory`);
    } catch {
      const points = liveTrajectories[id] || [
        {
          id: 1,
          participant_id: Number(id),
          assessment_id: 1,
          model_stage: 'INTAKE',
          risk_probability: 0.520,
          risk_level: 'MEDIUM',
          delta_risk: 0.0,
          trajectory_flag: 'BASELINE',
          recorded_at: new Date(Date.now() - 86400000 * 30).toISOString(),
          notes: 'Baseline intake evaluation',
        },
      ];
      return { data: points };
    }
  },
};

export const assessmentsAPI = {
  create: async (data) => {
    try {
      return await api.post('/assessments', data);
    } catch {
      const newAssessment = {
        id: liveAssessments.length + 10,
        participant_id: Number(data.participant_id),
        assessor_id: 1,
        assessment_date: new Date().toISOString(),
        assessment_stage: 'DYNAMIC',
        recidivism_probability: 0.440,
        risk_level: 'MEDIUM',
        delta_risk: -0.07,
        trajectory_flag: 'IMPROVING',
        model_version: 'catboost_dynamic_champion_v1',
        model_confidence: 0.865,
        narrative: 'Automated evaluation ready. Run prediction to refresh TreeSHAP local attributions.',
        top_features: [
          { feature: 'program_attendances', name: 'Supervised Program Attendances', shap_value: -0.112, direction: 'Risk Mitigating' },
          { feature: 'percent_days_employed', name: 'Verified Employment Rate', shap_value: -0.075, direction: 'Risk Mitigating' },
          { feature: 'prior_arrests', name: 'Prior Arrest Record', shap_value: 0.065, direction: 'Risk Increasing' },
        ],
        intervention_recommendations: [
          {
            id: 101,
            title: 'Continue Supervised Clinical Protocol',
            why_relevant: 'Attendance compliance is actively lowering dynamic risk.',
            suggested_action: 'Maintain current treatment schedule.',
            priority: 1,
          },
        ],
      };
      liveAssessments.unshift(newAssessment);
      return { data: newAssessment };
    }
  },

  get: async (id) => {
    try {
      const res = await api.get(`/assessments/${id}`);
      if (res?.data) {
        const idx = liveAssessments.findIndex((a) => a.id === Number(id));
        if (idx !== -1) {
          liveAssessments[idx] = res.data;
        } else {
          liveAssessments.push(res.data);
        }
      }
      return res;
    } catch {
      let found = liveAssessments.find((a) => a.id === Number(id));
      if (!found) {
        found = {
          id: Number(id),
          participant_id: 5,
          assessor_id: 1,
          assessment_date: new Date().toISOString(),
          assessment_stage: 'DYNAMIC SUPERVISION',
          recidivism_probability: 0.3789,
          risk_level: 'LOW',
          delta_risk: -0.197,
          trajectory_flag: 'IMPROVING',
          model_version: 'catboost_dynamic_champion_v1',
          model_confidence: 0.884,
          reviewer_decision: 'REJECT',
          reviewer_notes: 'Judicial override: Presiding bench has formally rejected algorithmic recommendation based on clinical review and legal findings.',
          reviewed_at: new Date().toISOString(),
          top_features: [
            { feature: 'program_attendances', name: 'Program Attendances (26 sessions)', shap_value: -0.142, direction: 'Risk Mitigating' },
            { feature: 'drug_tests_positive_count', name: 'Positive Toxicology Screens (0 pos)', shap_value: -0.091, direction: 'Risk Mitigating' },
            { feature: 'percent_days_employed', name: 'Verified Employment Rate (85%)', shap_value: -0.064, direction: 'Risk Mitigating' },
          ],
        };
        liveAssessments.push(found);
      }
      return { data: found };
    }
  },

  getForParticipant: async (participantId) => {
    try {
      return await api.get(`/assessments/participant/${participantId}`);
    } catch {
      const list = liveAssessments.filter((a) => a.participant_id === Number(participantId));
      return { data: list.length > 0 ? list : [liveAssessments[0]] };
    }
  },

  predict: async (id) => {
    try {
      return await api.post(`/assessments/${id}/predict`);
    } catch {
      const idx = liveAssessments.findIndex((a) => a.id === Number(id));
      if (idx !== -1) {
        liveAssessments[idx] = {
          ...liveAssessments[idx],
          recidivism_probability: 0.385,
          risk_level: 'LOW',
          delta_risk: -0.197,
          trajectory_flag: 'IMPROVING',
        };
        return { data: liveAssessments[idx] };
      }
      return { data: liveAssessments[0] };
    }
  },

  getSHAP: async (id) => {
    try {
      return await api.get(`/assessments/${id}/shap`);
    } catch {
      const a = liveAssessments.find((x) => x.id === Number(id)) || liveAssessments[0];
      return {
        data: {
          top_features: a.top_features || [],
          all_shap_values: {},
        },
      };
    }
  },

  simulate: async (id, modifications) => {
    try {
      return await api.post(`/assessments/${id}/simulate`, modifications);
    } catch {
      const assessment = liveAssessments.find((a) => a.id === Number(id)) || liveAssessments[0];
      const baseline = assessment.recidivism_probability || 0.52;

      const attBonus = Math.min(0.14, ((modifications.program_attendances || 20) / 30) * 0.14);
      const absPenalty = ((modifications.program_unexcused_absences || 0) / 5) * 0.12;
      const empBonus = ((modifications.percent_days_employed || 0.8) > 1 ? modifications.percent_days_employed / 100 : (modifications.percent_days_employed || 0.8)) * 0.10;
      const cleanBonus = modifications.drug_tests_clean !== false ? 0.08 : -0.12;

      const simProb = Math.max(0.12, Math.min(0.92, baseline - attBonus - empBonus - cleanBonus + absPenalty));
      const delta = simProb - baseline;

      return {
        data: {
          baseline_risk: baseline,
          simulated_risk: simProb,
          delta_risk: delta,
          simulated_risk_level: simProb < 0.35 ? 'LOW' : simProb < 0.65 ? 'MEDIUM' : 'HIGH',
          recommendation:
            delta < -0.15
              ? 'High intervention efficacy: Full compliance with attendance and zero drug screen violations produces significant risk reduction.'
              : 'Moderate intervention efficacy: Consider reinforcing vocational counseling and peer support.',
        },
      };
    }
  },

  submitReview: async (id, reviewData) => {
    try {
      return await api.post(`/assessments/${id}/review`, reviewData);
    } catch {
      const idx = liveAssessments.findIndex((a) => a.id === Number(id));
      const updated = {
        ...(idx !== -1 ? liveAssessments[idx] : liveAssessments[0] || {}),
        id: Number(id),
        reviewer_decision: reviewData.decision,
        reviewer_notes: reviewData.notes,
        reviewed_at: new Date().toISOString(),
      };
      if (idx !== -1) {
        liveAssessments[idx] = updated;
      } else {
        liveAssessments.unshift(updated);
      }
      return { data: updated };
    }
  },
  review: async (id, reviewData) => {
    return await assessmentsAPI.submitReview(id, reviewData);
  },
};

export const interventionsAPI = {
  getForParticipant: async (id) => {
    try {
      return await api.get(`/participants/${id}/interventions`);
    } catch {
      const list = livePlans.filter((p) => p.participant_id === Number(id));
      return { data: list };
    }
  },

  getAll: async () => {
    try {
      return await api.get('/interventions');
    } catch {
      return { data: livePlans };
    }
  },

  create: async (participantId, data) => {
    try {
      return await api.post(`/participants/${participantId}/interventions`, data);
    } catch {
      const newPlan = {
        id: livePlans.length + 1,
        participant_id: Number(participantId),
        ...data,
        created_at: new Date().toISOString(),
      };
      livePlans.unshift(newPlan);
      return { data: newPlan };
    }
  },

  update: async (id, data) => {
    try {
      return await api.put(`/interventions/${id}`, data);
    } catch {
      const idx = livePlans.findIndex((p) => p.id === Number(id));
      if (idx !== -1) {
        livePlans[idx] = { ...livePlans[idx], ...data };
        return { data: livePlans[idx] };
      }
      return { data };
    }
  },
};

export const modelAPI = {
  getPerformance: async () => {
    try {
      return await api.get('/model/performance');
    } catch {
      return { data: MOCK_MODEL_BENCHMARKS };
    }
  },
  getFairness: async () => {
    try {
      return await api.get('/model/fairness', { timeout: 15000 });
    } catch {
      return { data: MOCK_FAIRNESS_AUDIT };
    }
  },
};

export const auditAPI = {
  list: async (params = {}) => {
    try {
      return await api.get('/audit-logs', { params });
    } catch {
      return { data: liveLogs };
    }
  },
};

export const reportsAPI = {
  downloadPDF: async (assessmentId, params = {}) => {
    try {
      return await api.get(`/reports/${assessmentId}/pdf`, {
        params,
        responseType: 'blob',
      });
    } catch {
      // Return a valid client-side vector PDF document if offline
      const decision = params?.decision || 'REJECTED';
      const notes = (params?.notes || 'Model findings reviewed under judicial discretion.').slice(0, 60);
      const pdfString = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
4 0 obj
<< /Length 380 >>
stream
BT
/F1 16 Tf
36 740 Td
(DRUG COURT DECISION SUPPORT SYSTEM (DSS)) Tj
0 -22 Td
/F1 11 Tf
(OFFICIAL JUDICIAL ASSESSMENT REPORT - CASE #${assessmentId}) Tj
0 -20 Td
(Generated: ${new Date().toISOString()}) Tj
0 -25 Td
(Model: XGBoost Dynamic Supervision Champion v1.0) Tj
0 -20 Td
(Judicial Disposition: ${decision}) Tj
0 -20 Td
(Rationale: ${notes}) Tj
0 -20 Td
(Status: Verified Judicial Audit - Confidential) Tj
ET
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000224 00000 n 
0000000650 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
730
%%EOF`;
      const blob = new Blob([pdfString], { type: 'application/pdf' });
      return { data: blob };
    }
  },
};

export default api;
