import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  ShieldCheck,
  Users,
  Clock,
  AlertCircle,
  FileText,
  CheckCircle2,
  XCircle,
  LogOut,
  Search,
  CreditCard,
  Stethoscope,
} from 'lucide-react';

const API_BASE = 'http://localhost:5000/api/v1';

interface DoctorProfile {
  id: string;
  userId: string;
  specialty: string;
  subSpecialty?: string;
  licenseNumber: string;
  hospitalAffiliation?: string;
  yearsOfExperience: number;
  bio?: string;
  consultationFee: number;
  verificationStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
  rejectionReason?: string;
  documentUrls: string[];
  user: {
    id: string;
    fullName: string;
    email: string;
    phoneNumber: string;
    avatarUrl?: string;
    createdAt: string;
  };
}

interface Stats {
  totalPatients: number;
  activeDoctors: number;
  pendingDoctorVerifications: number;
  totalConsultations: number;
  activePaidSubscriptions: number;
  monthlySubscriptionRateGhs: number;
}

export default function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('teledoc_admin_token'));
  const [adminUser, setAdminUser] = useState<any>(null);

  // Login Form State
  const [identifier, setIdentifier] = useState('admin@teledoc.gh');
  const [password, setPassword] = useState('Password123!');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Dashboard Data State
  const [activeTab, setActiveTab] = useState<'pending' | 'doctors' | 'stats'>('pending');
  const [pendingDoctors, setPendingDoctors] = useState<DoctorProfile[]>([]);
  const [allDoctors, setAllDoctors] = useState<DoctorProfile[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Reject Modal
  const [rejectingDoctor, setRejectingDoctor] = useState<DoctorProfile | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // Fetch data when token is available
  useEffect(() => {
    if (token) {
      fetchAdminData();
    }
  }, [token]);

  const fetchAdminData = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };

      const [pendingRes, allRes, statsRes, meRes] = await Promise.all([
        axios.get(`${API_BASE}/admin/doctors/pending`, config),
        axios.get(`${API_BASE}/admin/doctors`, config),
        axios.get(`${API_BASE}/admin/stats`, config),
        axios.get(`${API_BASE}/auth/me`, config),
      ]);

      setPendingDoctors(pendingRes.data.doctors || []);
      setAllDoctors(allRes.data.doctors || []);
      setStats(statsRes.data.stats || null);
      setAdminUser(meRes.data.user);
    } catch (err: any) {
      console.error('Failed to load admin data:', err);
      if (err.response?.status === 401 || err.response?.status === 403) {
        handleLogout();
      }
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setLoginError('');

    try {
      const res = await axios.post(`${API_BASE}/auth/login`, {
        identifier,
        password,
      });

      if (res.data.user.role !== 'ADMIN') {
        setLoginError('Access denied. This console is restricted to Super Administrators.');
        setIsLoggingIn(false);
        return;
      }

      localStorage.setItem('teledoc_admin_token', res.data.token);
      setToken(res.data.token);
      setAdminUser(res.data.user);
    } catch (err: any) {
      setLoginError(err.response?.data?.message || 'Login failed. Please verify credentials.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('teledoc_admin_token');
    setToken(null);
    setAdminUser(null);
  };

  const handleApprove = async (doctor: DoctorProfile) => {
    setActionLoadingId(doctor.id);
    try {
      await axios.post(
        `${API_BASE}/admin/doctors/${doctor.id}/approve`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      await fetchAdminData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Approval failed');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRejectConfirm = async () => {
    if (!rejectingDoctor || !rejectReason.trim()) return;

    setActionLoadingId(rejectingDoctor.id);
    try {
      await axios.post(
        `${API_BASE}/admin/doctors/${rejectingDoctor.id}/reject`,
        { reason: rejectReason.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setRejectingDoctor(null);
      setRejectReason('');
      await fetchAdminData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Rejection failed');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Filtered doctors list
  const filteredDoctors = allDoctors.filter((doc) => {
    const matchesSearch =
      doc.user.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.specialty.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (doc.hospitalAffiliation || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.licenseNumber.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter ? doc.verificationStatus === statusFilter : true;
    return matchesSearch && matchesStatus;
  });

  // Login Screen
  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8 border border-slate-100">
          <div className="flex items-center justify-center space-x-3 mb-6">
            <div className="w-12 h-12 bg-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/30">
              <ShieldCheck className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900">TeleDoc Ghana</h1>
              <p className="text-xs font-semibold text-emerald-600 uppercase tracking-widest">
                Super Admin Portal
              </p>
            </div>
          </div>

          {loginError && (
            <div className="mb-5 p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Admin Email or Phone
              </label>
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="admin@teledoc.gh"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm shadow-md transition duration-150 flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              {isLoggingIn ? (
                <span>Authenticating...</span>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Secure Admin Sign In</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-slate-500">
            Default credentials: <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">admin@teledoc.gh</code> / <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">Password123!</code>
          </div>
        </div>
      </div>
    );
  }

  // Authenticated Admin Dashboard
  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 flex flex-col">
      {/* Top Navbar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center shadow-md shadow-emerald-500/20">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="font-extrabold text-lg text-slate-900 tracking-tight flex items-center space-x-2">
                <span>TeleDoc Ghana</span>
                <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full uppercase">
                  Admin Console
                </span>
              </div>
              <p className="text-xs text-slate-500">Medical Licensing & Access Verification</p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-bold text-slate-800">{adminUser?.fullName || 'Super Admin'}</div>
              <div className="text-xs text-slate-500">{adminUser?.email || 'admin@teledoc.gh'}</div>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
              title="Sign Out"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8 flex-1 w-full space-y-6">
        {/* Metric Cards */}
        {stats && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pending Doctors</p>
                <h3 className="text-2xl font-black text-amber-600 mt-1">{stats.pendingDoctorVerifications}</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">Awaiting credential review</p>
              </div>
              <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600">
                <Clock className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Doctors</p>
                <h3 className="text-2xl font-black text-emerald-600 mt-1">{stats.activeDoctors}</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">Verified & consulting</p>
              </div>
              <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
                <Stethoscope className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Patients</p>
                <h3 className="text-2xl font-black text-blue-600 mt-1">{stats.totalPatients}</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">Active & in 90-day trial</p>
              </div>
              <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                <Users className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Hubtel Subscriptions</p>
                <h3 className="text-2xl font-black text-purple-600 mt-1">
                  {stats.activePaidSubscriptions * 10} <span className="text-sm font-semibold">GHS</span>
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">{stats.activePaidSubscriptions} recurring monthly</p>
              </div>
              <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600">
                <CreditCard className="w-6 h-6" />
              </div>
            </div>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex items-center space-x-2 border-b border-slate-200 pb-2">
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center space-x-2 transition ${
              activeTab === 'pending'
                ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20'
                : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Pending Approvals</span>
            {pendingDoctors.length > 0 && (
              <span className="bg-white text-amber-700 text-xs px-2 py-0.5 rounded-full font-black">
                {pendingDoctors.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('doctors')}
            className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center space-x-2 transition ${
              activeTab === 'doctors'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Stethoscope className="w-4 h-4" />
            <span>Doctor Registry ({allDoctors.length})</span>
          </button>
        </div>

        {/* Tab 1: Pending Approvals */}
        {activeTab === 'pending' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-slate-900">Doctors Awaiting Verification</h2>
                <p className="text-xs text-slate-500">
                  Review medical license, certificates, and hospital affiliations before granting platform access.
                </p>
              </div>
              <button
                onClick={fetchAdminData}
                className="text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition"
              >
                Refresh Queue
              </button>
            </div>

            {pendingDoctors.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                <h3 className="text-base font-bold text-slate-800">No Pending Approvals!</h3>
                <p className="text-xs text-slate-500 mt-1">All doctor registrations have been reviewed.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pendingDoctors.map((doctor) => (
                  <div
                    key={doctor.id}
                    className="bg-white rounded-2xl p-6 border border-amber-200 shadow-sm flex flex-col justify-between"
                  >
                    <div className="space-y-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="text-xs font-bold bg-amber-100 text-amber-800 px-2.5 py-1 rounded-full uppercase inline-block mb-2">
                            Awaiting Super Admin Approval
                          </div>
                          <h3 className="text-lg font-black text-slate-900">{doctor.user.fullName}</h3>
                          <p className="text-sm font-semibold text-emerald-700">{doctor.specialty}</p>
                          {doctor.subSpecialty && (
                            <p className="text-xs text-slate-500">Sub-specialty: {doctor.subSpecialty}</p>
                          )}
                        </div>
                        <div className="text-right text-xs text-slate-400">
                          {new Date(doctor.user.createdAt).toLocaleDateString()}
                        </div>
                      </div>

                      <div className="bg-slate-50 rounded-xl p-3.5 space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">MDC License Number:</span>
                          <span className="font-mono font-bold text-slate-800">{doctor.licenseNumber}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Hospital Affiliation:</span>
                          <span className="font-semibold text-slate-800">{doctor.hospitalAffiliation || 'N/A'}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Experience:</span>
                          <span className="font-semibold text-slate-800">{doctor.yearsOfExperience} years</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Contact:</span>
                          <span className="font-semibold text-slate-800">{doctor.user.phoneNumber} | {doctor.user.email}</span>
                        </div>
                      </div>

                      {doctor.bio && (
                        <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl italic">
                          "{doctor.bio}"
                        </p>
                      )}

                      {/* Documents / License certificates */}
                      {doctor.documentUrls && doctor.documentUrls.length > 0 && (
                        <div>
                          <p className="text-xs font-bold text-slate-700 mb-1.5 flex items-center space-x-1">
                            <FileText className="w-3.5 h-3.5" />
                            <span>Submitted Credentials & Certs ({doctor.documentUrls.length})</span>
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {doctor.documentUrls.map((docUrl, idx) => (
                              <a
                                key={idx}
                                href={docUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs bg-slate-100 hover:bg-slate-200 text-blue-600 px-2.5 py-1 rounded-lg font-medium flex items-center space-x-1 border border-slate-200"
                              >
                                <span>Certificate #{idx + 1}</span>
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="mt-6 pt-4 border-t border-slate-100 flex items-center space-x-3">
                      <button
                        onClick={() => handleApprove(doctor)}
                        disabled={actionLoadingId === doctor.id}
                        className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-sm transition flex items-center justify-center space-x-1.5 disabled:opacity-50"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>{actionLoadingId === doctor.id ? 'Approving...' : 'Approve Doctor'}</span>
                      </button>

                      <button
                        onClick={() => {
                          setRejectingDoctor(doctor);
                          setRejectReason('');
                        }}
                        disabled={actionLoadingId === doctor.id}
                        className="px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-700 rounded-xl font-bold text-xs transition flex items-center space-x-1.5"
                      >
                        <XCircle className="w-4 h-4" />
                        <span>Reject</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Full Doctor Registry */}
        {activeTab === 'doctors' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by name, specialty, hospital, license..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none"
              >
                <option value="">All Verification Statuses</option>
                <option value="APPROVED">Approved Only</option>
                <option value="PENDING">Pending Only</option>
                <option value="REJECTED">Rejected Only</option>
              </select>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3.5">Doctor</th>
                    <th className="px-6 py-3.5">Specialty</th>
                    <th className="px-6 py-3.5">MDC License</th>
                    <th className="px-6 py-3.5">Hospital</th>
                    <th className="px-6 py-3.5">Status</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredDoctors.map((doc) => (
                    <tr key={doc.id} className="hover:bg-slate-50/70 transition">
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900">{doc.user.fullName}</div>
                        <div className="text-slate-400 text-[11px]">{doc.user.phoneNumber}</div>
                      </td>
                      <td className="px-6 py-4 font-semibold text-emerald-700">{doc.specialty}</td>
                      <td className="px-6 py-4 font-mono font-bold text-slate-700">{doc.licenseNumber}</td>
                      <td className="px-6 py-4 text-slate-600">{doc.hospitalAffiliation || 'Private Practice'}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                            doc.verificationStatus === 'APPROVED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : doc.verificationStatus === 'PENDING'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {doc.verificationStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {doc.verificationStatus === 'PENDING' ? (
                          <button
                            onClick={() => handleApprove(doc)}
                            className="text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-lg"
                          >
                            Approve
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400">Verified</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Reject Doctor Reason Modal */}
      {rejectingDoctor && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-black text-slate-900">
              Reject Doctor Application: {rejectingDoctor.user.fullName}
            </h3>
            <p className="text-xs text-slate-500">
              Please state why this application cannot be approved. This message will be communicated to the doctor.
            </p>

            <textarea
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. License MDC-GH number could not be validated on the Ghana Medical Council register."
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-red-500"
            />

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                onClick={() => setRejectingDoctor(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectConfirm}
                disabled={!rejectReason.trim()}
                className="px-4 py-2 text-xs font-bold bg-red-600 hover:bg-red-700 text-white rounded-xl disabled:opacity-50"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
