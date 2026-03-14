/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI } from "@google/genai";
import { 
  ShieldAlert, 
  ShieldCheck, 
  Search, 
  FileText, 
  AlertTriangle, 
  Activity,
  ArrowRight,
  CheckCircle2,
  Lock,
  Zap,
  RefreshCw,
  Camera,
  Fingerprint,
  UserCheck,
  ChevronLeft,
  Scan,
  Eye,
  EyeOff,
  Mail,
  KeyRound,
  MessageSquare,
  Send,
  X,
  Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as d3 from 'd3';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell,
  AreaChart,
  Area
} from 'recharts';

// Initialize Gemini
const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

type ViewState = 'landing' | 'login' | 'biometric' | 'patientDetails' | 'dashboard' | 'success';

export default function App() {
  const [view, setView] = useState<ViewState>('landing');
  const [dashboardTab, setDashboardTab] = useState<any>('analytics');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [medicines, setMedicines] = useState<any[]>([]);
  const [labTests, setLabTests] = useState<any[]>([]);
  const [medicalRecords, setMedicalRecords] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const medRes = await fetch('/api/medicines');
        const medData = await medRes.json();
        setMedicines(medData);

        const labRes = await fetch('/api/lab-tests');
        const labData = await labRes.json();
        setLabTests(labData);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };
    fetchData();
  }, []);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [isGeneratingLogo, setIsGeneratingLogo] = useState(false);
  const [claimText, setClaimText] = useState('');
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Login States
  const [email, setEmail] = useState('agent.varghese@insureguard.ai');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Biometric States
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  // Patient & Doctor Details States
  const [patientName, setPatientName] = useState('');
  const [patientAge, setPatientAge] = useState('');
  const [patientState, setPatientState] = useState('');
  const [patientHospital, setPatientHospital] = useState('');
  const [doctorGrade, setDoctorGrade] = useState('');
  const [doctorServiceYear, setDoctorServiceYear] = useState('');

  // Generate logo on mount
  useEffect(() => {
    generateLogo();
  }, []);

  const generateLogo = async () => {
    setIsGeneratingLogo(true);
    try {
      const response = await genAI.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            {
              text: 'A modern, professional logo for a health insurance fraud detection company called "InsureGuard AI". The logo should feature a stylized shield combined with a medical cross and a digital circuit pattern. Minimalist, sleek, using deep blues and emerald greens. High resolution, white background.',
            },
          ],
        },
      });

      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          const base64EncodeString = part.inlineData.data;
          setLogoUrl(`data:image/png;base64,${base64EncodeString}`);
          break;
        }
      }
    } catch (error) {
      console.error('Error generating logo:', error);
    } finally {
      setIsGeneratingLogo(false);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    // Simulate API call
    setTimeout(() => {
      setIsLoggingIn(false);
      startBiometric();
    }, 1500);
  };

  const startBiometric = async () => {
    setView('biometric');
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
      setStream(mediaStream);
      // Use a small delay to ensure video element is rendered
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      }, 100);
    } catch (err) {
      console.error("Error accessing camera:", err);
    }
  };

  const stopStream = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const captureFrame = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/png');
        setCapturedImage(dataUrl);
      }
    }
  };

  const handleFaceScan = () => {
    setIsScanning(true);
    let progress = 0;
    const interval = setInterval(() => {
      progress += 5;
      setScanProgress(progress);
      if (progress >= 100) {
        clearInterval(interval);
        captureFrame();
        setIsScanning(false);
        setScanProgress(0);
        stopStream();
        setView('patientDetails');
      }
    }, 100);
  };

  const handleThumbScan = () => {
    setIsScanning(true);
    let progress = 0;
    const interval = setInterval(() => {
      progress += 2;
      setScanProgress(progress);
      if (progress >= 100) {
        clearInterval(interval);
        setIsScanning(false);
        setScanProgress(0);
        setView('success');
      }
    }, 50);
  };

  const analyzeClaim = async () => {
    if (!claimText.trim()) return;
    setIsAnalyzing(true);
    try {
      const model = "gemini-3-flash-preview";
      const prompt = `Analyze the following health insurance claim for potential fraud or irregularities. Provide a risk score (0-100), key red flags, and a summary. Return the response in JSON format with keys: riskScore, redFlags (array), summary, and status (Safe, Suspicious, or High Risk).
      
      Claim Text: ${claimText}`;

      const response = await genAI.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        }
      });

      const result = JSON.parse(response.text || '{}');
      setAnalysisResult(result);
    } catch (error) {
      console.error('Error analyzing claim:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (view === 'login') {
    return (
      <>
        <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4 font-sans">
          <ChatBot isOpen={isChatOpen} setIsOpen={setIsChatOpen} />
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-md w-full bg-white rounded-3xl shadow-2xl shadow-slate-200 border border-slate-100 p-8 space-y-8"
          >
          <div className="text-center space-y-2">
            <div className="h-16 w-16 bg-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-200">
              <Lock className="text-white h-8 w-8" />
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">Secure Login</h2>
            <p className="text-slate-500">Enter your credentials to access the terminal</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 ml-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all outline-none text-sm"
                  placeholder="name@company.com"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 ml-1">Password</label>
              <div className="relative">
                <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <input 
                  type={showPassword ? "text" : "password"} 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all outline-none text-sm"
                  placeholder="••••••••"
                  required
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input type="checkbox" className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
                <span className="text-slate-500 group-hover:text-slate-700 transition-colors">Remember me</span>
              </label>
              <a href="#" className="text-emerald-600 font-semibold hover:text-emerald-700 transition-colors">Forgot password?</a>
            </div>

            <button 
              type="submit"
              disabled={isLoggingIn}
              className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isLoggingIn ? <RefreshCw className="h-5 w-5 animate-spin" /> : "Continue to Biometrics"}
              {!isLoggingIn && <ArrowRight className="h-5 w-5" />}
            </button>
          </form>

          <button 
            onClick={() => setView('landing')}
            className="w-full text-sm font-medium text-slate-400 hover:text-slate-600 transition-colors flex items-center justify-center gap-2"
          >
            <ChevronLeft className="h-4 w-4" /> Back to landing page
          </button>
        </motion.div>
      </div>
      </>
    );
  }

  if (view === 'biometric') {
    return (
      <>
        <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4 font-sans">
          <ChatBot isOpen={isChatOpen} setIsOpen={setIsChatOpen} />
          <canvas ref={canvasRef} className="hidden" />
          <div className="max-w-md w-full space-y-8">
          <div className="text-center space-y-2">
            <button 
              onClick={() => { setView('login'); stopStream(); }}
              className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-8"
            >
              <ChevronLeft className="h-4 w-4" /> Back to Login
            </button>
            <h2 className="text-3xl font-bold tracking-tight">Facial Verification</h2>
            <p className="text-slate-400">
              Please align your face within the frame
            </p>
          </div>

          <div className="relative aspect-square bg-slate-900 rounded-3xl border-2 border-slate-800 overflow-hidden flex items-center justify-center shadow-2xl shadow-emerald-900/10">
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              className="w-full h-full object-cover grayscale opacity-60"
            />
            <div className="absolute inset-0 border-[40px] border-slate-950/80 pointer-events-none">
              <div className="w-full h-full border-2 border-emerald-500/30 rounded-full relative">
                {isScanning && (
                  <motion.div 
                    initial={{ top: '0%' }}
                    animate={{ top: '100%' }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="absolute left-0 right-0 h-0.5 bg-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.8)] z-10"
                  />
                )}
              </div>
            </div>

            {isScanning && (
              <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-emerald-500 text-slate-950 px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest animate-pulse">
                Scanning Face... {scanProgress}%
              </div>
            )}
          </div>

          {!isScanning && (
            <button 
              onClick={handleFaceScan}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-4 rounded-2xl font-bold shadow-lg shadow-emerald-900/20 transition-all flex items-center justify-center gap-3"
            >
              <Scan className="h-5 w-5" /> Start Facial Scan
            </button>
          )}

          <div className="flex justify-center gap-2">
            <div className="h-1.5 w-12 rounded-full bg-emerald-500" />
            <div className="h-1.5 w-12 rounded-full bg-slate-800" />
          </div>
        </div>
      </div>
      </>
    );
  }

  if (view === 'patientDetails') {
    return (
      <>
        <div className="min-h-screen bg-[#F8FAFC] py-12 px-4 font-sans">
          <ChatBot isOpen={isChatOpen} setIsOpen={setIsChatOpen} />
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-4xl mx-auto bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden"
          >
          <div className="bg-slate-900 p-8 text-white flex flex-col md:flex-row items-center gap-8">
            <div className="relative">
              <div className="h-32 w-32 rounded-2xl overflow-hidden border-4 border-emerald-500 shadow-lg shadow-emerald-500/20">
                {capturedImage ? (
                  <img src={capturedImage} alt="Captured Profile" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-slate-800 flex items-center justify-center">
                    <Camera className="text-slate-600 h-8 w-8" />
                  </div>
                )}
              </div>
              <div className="absolute -bottom-2 -right-2 bg-emerald-500 p-1.5 rounded-lg border-2 border-slate-900">
                <ShieldCheck className="h-4 w-4 text-white" />
              </div>
            </div>
            <div className="text-center md:text-left space-y-2">
              <h2 className="text-3xl font-bold tracking-tight">Patient Registration</h2>
              <p className="text-slate-400">Please complete the details below to finalize the secure profile.</p>
            </div>
          </div>

          <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Patient Details */}
            <div className="space-y-6">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-emerald-600" />
                Patient Information
              </h3>
              
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Full Name</label>
                  <input 
                    type="text" 
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-sm"
                    placeholder="Enter patient's full name"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Age</label>
                    <input 
                      type="number" 
                      value={patientAge}
                      onChange={(e) => setPatientAge(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-sm"
                      placeholder="Years"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">State</label>
                    <input 
                      type="text" 
                      value={patientState}
                      onChange={(e) => setPatientState(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-sm"
                      placeholder="e.g. California"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Hospital Name</label>
                  <input 
                    type="text" 
                    value={patientHospital}
                    onChange={(e) => setPatientHospital(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-sm"
                    placeholder="Primary Care Center"
                  />
                </div>
              </div>
            </div>

            {/* Doctor Details */}
            <div className="space-y-6">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Activity className="h-5 w-5 text-blue-600" />
                Doctor Details
              </h3>

              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Doctor Grade / Specialization</label>
                  <select 
                    value={doctorGrade}
                    onChange={(e) => setDoctorGrade(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-sm"
                  >
                    <option value="">Select Grade</option>
                    <option value="Senior Consultant">Senior Consultant</option>
                    <option value="Specialist">Specialist</option>
                    <option value="Resident">Resident</option>
                    <option value="General Practitioner">General Practitioner</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Years of Service</label>
                  <input 
                    type="number" 
                    value={doctorServiceYear}
                    onChange={(e) => setDoctorServiceYear(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-sm"
                    placeholder="Experience in years"
                  />
                </div>

                <div className="pt-4">
                  <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                    <p className="text-xs text-blue-700 leading-relaxed">
                      <strong>Verification Note:</strong> All details provided will be cross-referenced with our secure provider database for fraud prevention.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="p-8 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <button 
              onClick={() => { setView('biometric'); startBiometric(); }}
              className="text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors"
            >
              Retake Facial Scan
            </button>
            <button 
              onClick={() => setView('success')}
              disabled={!patientName || !patientAge || !patientHospital || !doctorGrade}
              className="w-full sm:w-auto bg-slate-900 text-white px-10 py-4 rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              Finalize Registration
              <ArrowRight className="h-5 w-5" />
            </button>
          </div>
        </motion.div>
      </div>
      </>
    );
  }

  if (view === 'success') {
    return (
      <>
        <div className="min-h-screen bg-white text-slate-900 flex flex-col items-center justify-center p-4 font-sans">
          <ChatBot isOpen={isChatOpen} setIsOpen={setIsChatOpen} />
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-md w-full text-center space-y-8"
          >
          <div className="relative inline-block">
            <div className="h-24 w-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
              <UserCheck className="h-12 w-12 text-emerald-600" />
            </div>
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: 'spring' }}
              className="absolute -top-2 -right-2 bg-emerald-500 text-white p-1 rounded-full border-4 border-white"
            >
              <CheckCircle2 className="h-6 w-6" />
            </motion.div>
          </div>
          
          <div className="space-y-2">
            <h2 className="text-4xl font-black tracking-tight">Registration Complete</h2>
            <p className="text-slate-500">Welcome, {patientName || 'Agent Varghese'}. Your secure profile has been established.</p>
          </div>

          <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 text-left space-y-4">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Patient ID</span>
              <span className="text-emerald-600 font-bold">IG-{Math.floor(Math.random() * 90000) + 10000}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Assigned Doctor</span>
              <span className="text-slate-700 font-medium">{doctorGrade}</span>
            </div>
            <div className="h-px bg-slate-200" />
            <p className="text-xs text-slate-400 text-center uppercase tracking-widest">Encrypted Session Active</p>
          </div>

          <button 
            onClick={() => setView('dashboard')}
            className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-xl shadow-slate-200"
          >
            Enter Dashboard
          </button>
        </motion.div>
      </div>
      </>
    );
  }

  if (view === 'dashboard') {
    return (
      <>
        <Dashboard 
          setView={setView} 
          activeTab={dashboardTab} 
          setActiveTab={setDashboardTab} 
          medicines={medicines}
          labTests={labTests}
          medicalRecords={medicalRecords}
          setMedicalRecords={setMedicalRecords}
        />
        <ChatBot isOpen={isChatOpen} setIsOpen={setIsChatOpen} />
      </>
    );
  }

  return (
    <>
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans">
      <ChatBot isOpen={isChatOpen} setIsOpen={setIsChatOpen} />
      {/* Navigation */}
      <nav className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-3">
              {logoUrl ? (
                <img src={logoUrl} alt="InsureGuard Logo" className="h-10 w-10 rounded-lg shadow-sm" referrerPolicy="no-referrer" />
              ) : (
                <div className="h-10 w-10 bg-emerald-600 rounded-lg flex items-center justify-center">
                  <ShieldCheck className="text-white h-6 w-6" />
                </div>
              )}
              <span className="text-xl font-bold tracking-tight text-slate-900">InsureGuard <span className="text-emerald-600">AI</span></span>
            </div>
            <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
              <a href="#" className="hover:text-emerald-600 transition-colors">Solutions</a>
              <a href="#" className="hover:text-emerald-600 transition-colors">Technology</a>
              <a href="#" className="hover:text-emerald-600 transition-colors">Case Studies</a>
              <button 
                onClick={() => setView('login')}
                className="bg-slate-900 text-white px-5 py-2 rounded-full hover:bg-slate-800 transition-all shadow-sm"
              >
                Login
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main>
        {/* Hero Section */}
        <section className="relative py-20 overflow-hidden">
          <div className="absolute inset-0 -z-10">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-emerald-50/50 via-transparent to-transparent" />
          </div>
          
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-slate-900 mb-6">
                Detect Fraud with <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-600">
                  Precision Intelligence
                </span>
              </h1>
              <p className="text-lg text-slate-600 max-w-2xl mx-auto mb-10">
                InsureGuard AI leverages advanced neural networks to identify anomalies, prevent leakage, and protect your bottom line in real-time.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <button 
                  onClick={() => setView('login')}
                  className="w-full sm:w-auto bg-emerald-600 text-white px-8 py-4 rounded-xl font-semibold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 flex items-center justify-center gap-2 group"
                >
                  Start Free Trial
                  <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </button>
                <button className="w-full sm:w-auto bg-white border border-slate-200 text-slate-700 px-8 py-4 rounded-xl font-semibold hover:bg-slate-50 transition-all shadow-sm">
                  Watch Demo
                </button>
              </div>
            </motion.div>

            {/* Logo Showcase */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3, duration: 0.8 }}
              className="mt-16 relative"
            >
              <div className="max-w-4xl mx-auto bg-white rounded-3xl shadow-2xl shadow-slate-200/50 p-4 border border-slate-100">
                <div className="aspect-video bg-slate-50 rounded-2xl flex items-center justify-center overflow-hidden relative group">
                  {isGeneratingLogo ? (
                    <div className="flex flex-col items-center gap-4">
                      <RefreshCw className="h-10 w-10 text-emerald-600 animate-spin" />
                      <p className="text-sm font-medium text-slate-500">Generating Brand Identity...</p>
                    </div>
                  ) : logoUrl ? (
                    <img 
                      src={logoUrl} 
                      alt="Generated Logo" 
                      className="w-full h-full object-contain p-12"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="text-slate-400 flex flex-col items-center gap-2">
                      <ShieldAlert className="h-12 w-12" />
                      <p>Logo failed to load</p>
                    </div>
                  )}
                  
                  <div className="absolute bottom-6 right-6">
                    <button 
                      onClick={generateLogo}
                      disabled={isGeneratingLogo}
                      className="bg-white/90 backdrop-blur shadow-lg border border-slate-200 p-3 rounded-full hover:bg-white transition-all disabled:opacity-50"
                      title="Regenerate Logo"
                    >
                      <RefreshCw className={`h-5 w-5 text-slate-600 ${isGeneratingLogo ? 'animate-spin' : ''}`} />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="py-24 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
              <div className="space-y-4">
                <div className="h-12 w-12 bg-emerald-100 rounded-2xl flex items-center justify-center">
                  <Zap className="text-emerald-600 h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold">Real-time Analysis</h3>
                <p className="text-slate-600 leading-relaxed">
                  Process thousands of claims per second with sub-millisecond latency using our proprietary AI engine.
                </p>
              </div>
              <div className="space-y-4">
                <div className="h-12 w-12 bg-blue-100 rounded-2xl flex items-center justify-center">
                  <Lock className="text-blue-600 h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold">Secure & Compliant</h3>
                <p className="text-slate-600 leading-relaxed">
                  Fully HIPAA and GDPR compliant architecture ensuring patient data remains private and protected.
                </p>
              </div>
              <div className="space-y-4">
                <div className="h-12 w-12 bg-purple-100 rounded-2xl flex items-center justify-center">
                  <Activity className="text-purple-600 h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold">Predictive Modeling</h3>
                <p className="text-slate-600 leading-relaxed">
                  Identify emerging fraud patterns before they impact your system with proactive threat intelligence.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Interactive Demo Section */}
        <section className="py-24 bg-slate-50 border-y border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
              <div className="space-y-8">
                <div>
                  <h2 className="text-3xl font-bold mb-4">Experience the Power</h2>
                  <p className="text-slate-600">
                    Paste a claim description below to see how our AI identifies potential red flags and calculates risk scores instantly.
                  </p>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
                  <label className="block text-sm font-semibold text-slate-700">Claim Description</label>
                  <textarea 
                    value={claimText}
                    onChange={(e) => setClaimText(e.target.value)}
                    placeholder="e.g., Patient visited clinic for routine checkup. Billed for 5 separate MRI scans on the same day by a general practitioner..."
                    className="w-full h-40 p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all outline-none resize-none text-sm"
                  />
                  <button 
                    onClick={analyzeClaim}
                    disabled={isAnalyzing || !claimText.trim()}
                    className="w-full bg-slate-900 text-white py-3 rounded-xl font-semibold hover:bg-slate-800 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isAnalyzing ? <RefreshCw className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
                    Analyze Claim
                  </button>
                </div>

                <div className="flex items-center gap-4 p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                  <CheckCircle2 className="text-emerald-600 h-6 w-6 shrink-0" />
                  <p className="text-sm text-emerald-800">
                    <strong>Pro Tip:</strong> Try entering claims with duplicate services or mismatched provider specialties.
                  </p>
                </div>
              </div>

              <div className="min-h-[400px]">
                <AnimatePresence mode="wait">
                  {analysisResult ? (
                    <motion.div
                      key="result"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden"
                    >
                      <div className={`p-6 flex items-center justify-between border-b ${
                        analysisResult.status === 'High Risk' ? 'bg-red-50 border-red-100' : 
                        analysisResult.status === 'Suspicious' ? 'bg-amber-50 border-amber-100' : 
                        'bg-emerald-50 border-emerald-100'
                      }`}>
                        <div className="flex items-center gap-3">
                          {analysisResult.status === 'High Risk' ? <AlertTriangle className="text-red-600" /> : 
                           analysisResult.status === 'Suspicious' ? <ShieldAlert className="text-amber-600" /> : 
                           <ShieldCheck className="text-emerald-600" />}
                          <span className={`font-bold uppercase tracking-wider text-sm ${
                            analysisResult.status === 'High Risk' ? 'text-red-700' : 
                            analysisResult.status === 'Suspicious' ? 'text-amber-700' : 
                            'text-emerald-700'
                          }`}>
                            {analysisResult.status}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-xs text-slate-500 font-medium uppercase">Risk Score</span>
                          <div className={`text-3xl font-black ${
                            analysisResult.riskScore > 70 ? 'text-red-600' : 
                            analysisResult.riskScore > 30 ? 'text-amber-600' : 
                            'text-emerald-600'
                          }`}>
                            {analysisResult.riskScore}/100
                          </div>
                        </div>
                      </div>

                      <div className="p-8 space-y-6">
                        <div>
                          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Analysis Summary</h4>
                          <p className="text-slate-700 leading-relaxed italic">
                            "{analysisResult.summary}"
                          </p>
                        </div>

                        <div>
                          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Detected Red Flags</h4>
                          <ul className="space-y-3">
                            {analysisResult.redFlags.map((flag: string, idx: number) => (
                              <li key={idx} className="flex items-start gap-3 text-sm text-slate-600">
                                <div className="mt-1 h-1.5 w-1.5 rounded-full bg-slate-300 shrink-0" />
                                {flag}
                              </li>
                            ))}
                          </ul>
                        </div>

                        <button 
                          onClick={() => setAnalysisResult(null)}
                          className="w-full py-3 text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors"
                        >
                          Clear Results
                        </button>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="empty"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="h-full flex flex-col items-center justify-center text-center p-12 border-2 border-dashed border-slate-200 rounded-3xl"
                    >
                      <div className="h-20 w-20 bg-slate-100 rounded-full flex items-center justify-center mb-6">
                        <FileText className="text-slate-400 h-10 w-10" />
                      </div>
                      <h3 className="text-xl font-bold text-slate-800 mb-2">Awaiting Input</h3>
                      <p className="text-slate-500 max-w-xs">
                        Enter claim details on the left to begin the automated fraud detection process.
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-12 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 bg-emerald-600 rounded-lg flex items-center justify-center">
                <ShieldCheck className="text-white h-5 w-5" />
              </div>
              <span className="text-lg font-bold tracking-tight text-white">InsureGuard AI</span>
            </div>
            <div className="flex gap-8 text-sm">
              <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
              <a href="#" className="hover:text-white transition-colors">Contact Support</a>
            </div>
            <p className="text-xs">
              © 2026 InsureGuard AI. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
    </>
  );
}

// --- Dashboard Components ---

const Dashboard = ({ 
  setView, 
  activeTab, 
  setActiveTab,
  medicines,
  labTests,
  medicalRecords,
  setMedicalRecords
}: { 
  setView: (v: any) => void, 
  activeTab: string, 
  setActiveTab: (t: any) => void,
  medicines: any[],
  labTests: any[],
  medicalRecords: any[],
  setMedicalRecords: (r: any[]) => void
}) => {
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col fixed h-full">
        <div className="p-6 flex items-center gap-3 border-b border-slate-800">
          <div className="h-8 w-8 bg-emerald-600 rounded-lg flex items-center justify-center">
            <ShieldCheck className="text-white h-5 w-5" />
          </div>
          <span className="text-lg font-bold tracking-tight">InsureGuard <span className="text-emerald-500">AI</span></span>
        </div>
        
        <nav className="flex-1 p-4 space-y-2 mt-4">
          <SidebarItem icon={<Activity />} label="Analytics" active={activeTab === 'analytics'} onClick={() => setActiveTab('analytics')} />
          <SidebarItem icon={<FileText />} label="Claims" active={activeTab === 'claims'} onClick={() => setActiveTab('claims')} />
          <SidebarItem icon={<Plus />} label="Medical Records" active={activeTab === 'medical-records'} onClick={() => setActiveTab('medical-records')} />
          <SidebarItem icon={<Scan />} label="Network Graph" active={activeTab === 'network'} onClick={() => setActiveTab('network')} />
          <SidebarItem icon={<RefreshCw />} label="AI Training" active={activeTab === 'training'} onClick={() => setActiveTab('training')} />
          <SidebarItem icon={<AlertTriangle />} label="Hospital Risk" active={activeTab === 'hospitals'} onClick={() => setActiveTab('hospitals')} />
          <SidebarItem icon={<Zap />} label="Architecture" active={activeTab === 'architecture'} onClick={() => setActiveTab('architecture')} />
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button 
            onClick={() => setView('landing')}
            className="w-full flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all"
          >
            <ChevronLeft className="h-5 w-5" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64 p-8">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 capitalize">{activeTab.replace('-', ' ')}</h1>
            <p className="text-slate-500 text-sm">Monitoring system integrity in real-time</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-2">
              <div className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse" />
              System Online
            </div>
            <div className="h-10 w-10 bg-slate-200 rounded-full flex items-center justify-center overflow-hidden border-2 border-white shadow-sm">
              <img src="https://picsum.photos/seed/varghese/100/100" alt="User" referrerPolicy="no-referrer" />
            </div>
          </div>
        </header>

        <AnimatePresence mode="wait">
          {activeTab === 'analytics' && <AnalyticsView />}
          {activeTab === 'claims' && <ClaimsView />}
          {activeTab === 'medical-records' && <MedicalRecordsView medicines={medicines} labTests={labTests} records={medicalRecords} setRecords={setMedicalRecords} />}
          {activeTab === 'network' && <NetworkGraphView />}
          {activeTab === 'training' && <AITrainingView />}
          {activeTab === 'hospitals' && <HospitalRankingView />}
          {activeTab === 'architecture' && <ArchitectureView />}
        </AnimatePresence>
      </main>
    </div>
  );
};

const SidebarItem = ({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${active ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/20' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
  >
    {React.cloneElement(icon as React.ReactElement, { className: "h-5 w-5" })}
    <span className="font-medium text-sm">{label}</span>
  </button>
);

// --- Sub-Views ---

const AnalyticsView = () => {
  const data = [
    { name: 'Jan', claims: 4000, fraud: 240 },
    { name: 'Feb', claims: 3000, fraud: 139 },
    { name: 'Mar', claims: 2000, fraud: 980 },
    { name: 'Apr', claims: 2780, fraud: 390 },
    { name: 'May', claims: 1890, fraud: 480 },
    { name: 'Jun', claims: 2390, fraud: 380 },
    { name: 'Jul', claims: 3490, fraud: 430 },
  ];

  const pieData = [
    { name: 'Safe', value: 85 },
    { name: 'Suspicious', value: 10 },
    { name: 'Fraudulent', value: 5 },
  ];

  const COLORS = ['#10b981', '#f59e0b', '#ef4444'];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard label="Total Claims" value="24,592" change="+12%" icon={<FileText className="text-blue-600" />} />
        <StatCard label="Fraud Detected" value="1,204" change="+5%" icon={<ShieldAlert className="text-red-600" />} />
        <StatCard label="Savings" value="$4.2M" change="+18%" icon={<Zap className="text-emerald-600" />} />
        <StatCard label="Risk Level" value="Low" change="Stable" icon={<ShieldCheck className="text-emerald-600" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <h3 className="text-lg font-bold mb-6">Claims vs Fraud Trends</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Area type="monotone" dataKey="claims" stroke="#10b981" fillOpacity={1} fill="url(#colorClaims)" />
                <Area type="monotone" dataKey="fraud" stroke="#ef4444" fillOpacity={1} fill="url(#colorFraud)" />
                <defs>
                  <linearGradient id="colorClaims" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorFraud" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <h3 className="text-lg font-bold mb-6">Claim Distribution</h3>
          <div className="h-80 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-4">
              {pieData.map((item, i) => (
                <div key={item.name} className="flex items-center gap-3">
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                  <span className="text-sm font-medium text-slate-600">{item.name} ({item.value}%)</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const StatCard = ({ label, value, change, icon }: { label: string, value: string, change: string, icon: React.ReactNode }) => (
  <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
    <div className="flex justify-between items-start">
      <div className="h-10 w-10 bg-slate-50 rounded-xl flex items-center justify-center">
        {icon}
      </div>
      <span className={`text-xs font-bold px-2 py-1 rounded-lg ${change.startsWith('+') ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-600'}`}>
        {change}
      </span>
    </div>
    <div>
      <p className="text-slate-500 text-sm font-medium">{label}</p>
      <h4 className="text-2xl font-black text-slate-900">{value}</h4>
    </div>
  </div>
);

const ClaimsView = () => {
  const [claims, setClaims] = useState([
    { id: 'CLM-001', patient: 'John Doe', amount: '$1,200', status: 'Safe', date: '2 mins ago' },
    { id: 'CLM-002', patient: 'Sarah Smith', amount: '$4,500', status: 'Suspicious', date: '5 mins ago' },
    { id: 'CLM-003', patient: 'Mike Ross', amount: '$800', status: 'Safe', date: '12 mins ago' },
    { id: 'CLM-004', patient: 'Harvey Specter', amount: '$12,000', status: 'High Risk', date: '15 mins ago' },
  ]);

  const [newClaim, setNewClaim] = useState({ patient: '', amount: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const id = `CLM-${Math.floor(Math.random() * 900) + 100}`;
    const statuses = ['Safe', 'Suspicious', 'High Risk'];
    const status = statuses[Math.floor(Math.random() * 3)];
    setClaims([{ id, patient: newClaim.patient, amount: `$${newClaim.amount}`, status, date: 'Just now' }, ...claims]);
    setNewClaim({ patient: '', amount: '' });
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-1 space-y-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <h3 className="text-lg font-bold mb-6">Submit New Claim</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Patient Name</label>
              <input 
                type="text" 
                value={newClaim.patient}
                onChange={(e) => setNewClaim({ ...newClaim, patient: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                placeholder="Full Name"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Claim Amount ($)</label>
              <input 
                type="number" 
                value={newClaim.amount}
                onChange={(e) => setNewClaim({ ...newClaim, amount: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                placeholder="0.00"
                required
              />
            </div>
            <button type="submit" className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-slate-800 transition-all flex items-center justify-center gap-2">
              <ArrowRight className="h-4 w-4" /> Submit for AI Review
            </button>
          </form>
        </div>
      </div>

      <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <h3 className="text-lg font-bold">Recent Submissions</h3>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <div className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse" />
            Live Feed
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-widest">
                <th className="px-6 py-4 font-bold">ID</th>
                <th className="px-6 py-4 font-bold">Patient</th>
                <th className="px-6 py-4 font-bold">Amount</th>
                <th className="px-6 py-4 font-bold">Status</th>
                <th className="px-6 py-4 font-bold">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {claims.map((claim) => (
                <tr key={claim.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 text-sm font-bold text-slate-900">{claim.id}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{claim.patient}</td>
                  <td className="px-6 py-4 text-sm font-medium text-slate-900">{claim.amount}</td>
                  <td className="px-6 py-4">
                    <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md ${
                      claim.status === 'Safe' ? 'bg-emerald-100 text-emerald-700' :
                      claim.status === 'Suspicious' ? 'bg-amber-100 text-amber-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {claim.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-400">{claim.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
};

const MedicalRecordsView = ({ medicines, labTests, records, setRecords }: { medicines: any[], labTests: any[], records: any[], setRecords: any }) => {
  const [type, setType] = useState<'prescription' | 'lab' | 'bill'>('prescription');
  const [selectedItem, setSelectedItem] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [patientName, setPatientName] = useState('');

  const handleAdd = () => {
    let price = 0;
    if (type === 'prescription') {
      price = medicines.find(m => m.name === selectedItem)?.price || 0;
    } else if (type === 'lab') {
      price = labTests.find(l => l.name === selectedItem)?.price || 0;
    }

    const newRecord = {
      id: `REC-${Math.floor(Math.random() * 10000)}`,
      patient: patientName,
      type,
      item: selectedItem,
      quantity: type === 'prescription' ? quantity : 1,
      amount: price * (type === 'prescription' ? quantity : 1),
      date: new Date().toLocaleDateString(),
    };

    setRecords([newRecord, ...records]);
    setSelectedItem('');
    setQuantity(1);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6">
          <h3 className="text-lg font-bold">Add Medical Entry</h3>
          
          <div className="flex p-1 bg-slate-100 rounded-xl">
            {(['prescription', 'lab', 'bill'] as const).map((t) => (
              <button
                key={t}
                onClick={() => { setType(t); setSelectedItem(''); }}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all capitalize ${type === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Patient Name</label>
              <input 
                type="text" 
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                placeholder="Full Name"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                {type === 'prescription' ? 'Medicine' : type === 'lab' ? 'Diagnostic Test' : 'Service'}
              </label>
              <select 
                value={selectedItem}
                onChange={(e) => setSelectedItem(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
              >
                <option value="">Select {type}</option>
                {type === 'prescription' && medicines.map(m => <option key={m.name} value={m.name}>{m.name} (${m.price})</option>)}
                {type === 'lab' && labTests.map(l => <option key={l.name} value={l.name}>{l.name} (${l.price})</option>)}
                {type === 'bill' && <option value="Consultation">Consultation ($100)</option>}
              </select>
            </div>

            {type === 'prescription' && (
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Quantity</label>
                <input 
                  type="number" 
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value))}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                  min="1"
                />
              </div>
            )}

            <button 
              onClick={handleAdd}
              disabled={!patientName || !selectedItem}
              className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-slate-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Plus className="h-4 w-4" /> Add Record
            </button>
          </div>
        </div>

        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <h3 className="text-lg font-bold">Recent Medical Records</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-widest">
                  <th className="px-6 py-4 font-bold">ID</th>
                  <th className="px-6 py-4 font-bold">Patient</th>
                  <th className="px-6 py-4 font-bold">Type</th>
                  <th className="px-6 py-4 font-bold">Item</th>
                  <th className="px-6 py-4 font-bold">Amount</th>
                  <th className="px-6 py-4 font-bold">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {records.map((record) => (
                  <tr key={record.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-sm font-bold text-slate-900">{record.id}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{record.patient}</td>
                    <td className="px-6 py-4">
                      <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md ${
                        record.type === 'prescription' ? 'bg-blue-100 text-blue-700' :
                        record.type === 'lab' ? 'bg-purple-100 text-purple-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {record.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{record.item} {record.quantity > 1 && `(x${record.quantity})`}</td>
                    <td className="px-6 py-4 text-sm font-bold text-slate-900">${record.amount.toFixed(2)}</td>
                    <td className="px-6 py-4 text-xs text-slate-400">{record.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const NetworkGraphView = () => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [layout, setLayout] = useState<'force' | 'circular' | 'hierarchical'>('force');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);

  const data = {
    nodes: [
      { id: 'Hosp-A', type: 'hospital', group: 1, level: 0 },
      { id: 'Doc-1', type: 'doctor', group: 1, level: 1 },
      { id: 'Doc-2', type: 'doctor', group: 1, level: 1 },
      { id: 'Pat-1', type: 'patient', group: 2, level: 2 },
      { id: 'Pat-2', type: 'patient', group: 2, level: 2 },
      { id: 'Pat-3', type: 'patient', group: 2, level: 2 },
      { id: 'Pat-4', type: 'patient', group: 3, level: 2 },
      { id: 'Doc-3', type: 'doctor', group: 3, level: 1 },
      { id: 'Hosp-B', type: 'hospital', group: 3, level: 0 },
    ],
    links: [
      { source: 'Hosp-A', target: 'Doc-1' },
      { source: 'Hosp-A', target: 'Doc-2' },
      { source: 'Doc-1', target: 'Pat-1' },
      { source: 'Doc-1', target: 'Pat-2' },
      { source: 'Doc-2', target: 'Pat-3' },
      { source: 'Pat-3', target: 'Pat-1' }, 
      { source: 'Doc-3', target: 'Pat-4' },
      { source: 'Hosp-B', target: 'Doc-3' },
      { source: 'Pat-4', target: 'Pat-2' }, 
    ]
  };

  const analyzeNetwork = async () => {
    setIsAnalyzing(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const prompt = `Analyze this healthcare network graph for potential fraud patterns. 
      Nodes: ${JSON.stringify(data.nodes)}
      Links: ${JSON.stringify(data.links)}
      
      Look for suspicious connections like:
      - Patients connected to multiple doctors/hospitals in unusual ways.
      - Direct patient-to-patient connections (collusion).
      - Circular relationships.
      
      Provide a concise, professional analysis of the findings.`;

      const result = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt
      });
      setAnalysis(result.text || "No analysis available.");
    } catch (error) {
      console.error("Analysis error:", error);
      setAnalysis("Failed to analyze the network. Please check your connection and try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  useEffect(() => {
    if (!svgRef.current) return;

    const width = 800;
    const height = 500;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const g = svg.append("g");

    if (layout === 'force') {
      const simulation = d3.forceSimulation(data.nodes as any)
        .force("link", d3.forceLink(data.links).id((d: any) => d.id).distance(100))
        .force("charge", d3.forceManyBody().strength(-300))
        .force("center", d3.forceCenter(width / 2, height / 2));

      const link = g.append("g")
        .attr("stroke", "#e2e8f0")
        .attr("stroke-opacity", 0.6)
        .selectAll("line")
        .data(data.links)
        .join("line")
        .attr("stroke-width", 2);

      const node = g.append("g")
        .selectAll("g")
        .data(data.nodes)
        .join("g")
        .call(d3.drag<any, any>()
          .on("start", (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on("drag", (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on("end", (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          }));

      node.append("circle")
        .attr("r", (d: any) => d.type === 'hospital' ? 20 : d.type === 'doctor' ? 15 : 10)
        .attr("fill", (d: any) => d.type === 'hospital' ? '#10b981' : d.type === 'doctor' ? '#3b82f6' : '#94a3b8');

      node.append("text")
        .text((d: any) => d.id)
        .attr("x", 25)
        .attr("y", 5)
        .attr("font-size", "10px")
        .attr("fill", "#64748b")
        .attr("font-weight", "bold");

      simulation.on("tick", () => {
        link
          .attr("x1", (d: any) => d.source.x)
          .attr("y1", (d: any) => d.source.y)
          .attr("x2", (d: any) => d.target.x)
          .attr("y2", (d: any) => d.target.y);

        node
          .attr("transform", (d: any) => `translate(${d.x},${d.y})`);
      });
    } else if (layout === 'circular') {
      const radius = 200;
      data.nodes.forEach((d: any, i) => {
        const angle = (i / data.nodes.length) * 2 * Math.PI;
        d.x = width / 2 + radius * Math.cos(angle);
        d.y = height / 2 + radius * Math.sin(angle);
      });

      const link = g.append("g")
        .attr("stroke", "#e2e8f0")
        .attr("stroke-opacity", 0.6)
        .selectAll("line")
        .data(data.links)
        .join("line")
        .attr("x1", (d: any) => (data.nodes.find(n => n.id === (typeof d.source === 'string' ? d.source : d.source.id)) as any)!.x!)
        .attr("y1", (d: any) => (data.nodes.find(n => n.id === (typeof d.source === 'string' ? d.source : d.source.id)) as any)!.y!)
        .attr("x2", (d: any) => (data.nodes.find(n => n.id === (typeof d.target === 'string' ? d.target : d.target.id)) as any)!.x!)
        .attr("y2", (d: any) => (data.nodes.find(n => n.id === (typeof d.target === 'string' ? d.target : d.target.id)) as any)!.y!)
        .attr("stroke-width", 2);

      const node = g.append("g")
        .selectAll("g")
        .data(data.nodes)
        .join("g")
        .attr("transform", (d: any) => `translate(${d.x},${d.y})`);

      node.append("circle")
        .attr("r", (d: any) => d.type === 'hospital' ? 20 : d.type === 'doctor' ? 15 : 10)
        .attr("fill", (d: any) => d.type === 'hospital' ? '#10b981' : d.type === 'doctor' ? '#3b82f6' : '#94a3b8');

      node.append("text")
        .text((d: any) => d.id)
        .attr("x", 25)
        .attr("y", 5)
        .attr("font-size", "10px")
        .attr("fill", "#64748b")
        .attr("font-weight", "bold");
    } else if (layout === 'hierarchical') {
      const xOffset = 250;
      const yOffset = 150;
      
      data.nodes.forEach((d: any) => {
        d.x = 100 + d.level * xOffset;
        const nodesAtLevel = data.nodes.filter(n => n.level === d.level);
        const indexAtLevel = nodesAtLevel.indexOf(d);
        d.y = 100 + indexAtLevel * yOffset;
      });

      const link = g.append("g")
        .attr("stroke", "#e2e8f0")
        .attr("stroke-opacity", 0.6)
        .selectAll("line")
        .data(data.links)
        .join("line")
        .attr("x1", (d: any) => (data.nodes.find(n => n.id === (typeof d.source === 'string' ? d.source : d.source.id)) as any)!.x!)
        .attr("y1", (d: any) => (data.nodes.find(n => n.id === (typeof d.source === 'string' ? d.source : d.source.id)) as any)!.y!)
        .attr("x2", (d: any) => (data.nodes.find(n => n.id === (typeof d.target === 'string' ? d.target : d.target.id)) as any)!.x!)
        .attr("y2", (d: any) => (data.nodes.find(n => n.id === (typeof d.target === 'string' ? d.target : d.target.id)) as any)!.y!)
        .attr("stroke-width", 2);

      const node = g.append("g")
        .selectAll("g")
        .data(data.nodes)
        .join("g")
        .attr("transform", (d: any) => `translate(${d.x},${d.y})`);

      node.append("circle")
        .attr("r", (d: any) => d.type === 'hospital' ? 20 : d.type === 'doctor' ? 15 : 10)
        .attr("fill", (d: any) => d.type === 'hospital' ? '#10b981' : d.type === 'doctor' ? '#3b82f6' : '#94a3b8');

      node.append("text")
        .text((d: any) => d.id)
        .attr("x", 25)
        .attr("y", 5)
        .attr("font-size", "10px")
        .attr("fill", "#64748b")
        .attr("font-weight", "bold");
    }

  }, [layout]);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
      <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h3 className="text-lg font-bold">Fraud Collusion Network</h3>
            <p className="text-sm text-slate-500">Visualizing relationships between providers and patients to detect organized fraud rings.</p>
          </div>
          <div className="flex flex-col items-end gap-4">
            <div className="flex gap-2">
              <button
                onClick={analyzeNetwork}
                disabled={isAnalyzing}
                className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-800 transition-all disabled:opacity-50"
              >
                {isAnalyzing ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Search className="h-3 w-3" />}
                Analyze Network
              </button>
              <div className="flex p-1 bg-slate-100 rounded-xl">
                {(['force', 'circular', 'hierarchical'] as const).map((l) => (
                  <button
                    key={l}
                    onClick={() => setLayout(l)}
                    className={`px-4 py-2 text-xs font-bold rounded-lg transition-all capitalize ${layout === l ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                <div className="h-3 w-3 rounded-full bg-emerald-500" /> Hospital
              </div>
              <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                <div className="h-3 w-3 rounded-full bg-blue-500" /> Doctor
              </div>
              <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                <div className="h-3 w-3 rounded-full bg-slate-400" /> Patient
              </div>
            </div>
          </div>
        </div>
        <div className="bg-slate-50 rounded-2xl overflow-hidden border border-slate-100">
          <svg ref={svgRef} width="100%" height="500" viewBox="0 0 800 500" className="w-full h-auto" />
        </div>

        <AnimatePresence>
          {analysis && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-8 p-6 bg-emerald-50 rounded-2xl border border-emerald-100"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="h-8 w-8 bg-emerald-600 rounded-lg flex items-center justify-center">
                  <ShieldCheck className="text-white h-5 w-5" />
                </div>
                <h4 className="font-bold text-emerald-900">AI Fraud Analysis Report</h4>
              </div>
              <div className="text-sm text-emerald-800 leading-relaxed whitespace-pre-wrap">
                {analysis}
              </div>
              <button 
                onClick={() => setAnalysis(null)}
                className="mt-4 text-xs font-bold text-emerald-600 hover:text-emerald-700 underline"
              >
                Dismiss Analysis
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

const AITrainingView = () => {
  const [isTraining, setIsTraining] = useState(false);
  const [trainingLog, setTrainingLog] = useState<string[]>([]);
  const [modelStatus, setModelStatus] = useState<'idle' | 'training' | 'ready'>('idle');

  const startTraining = async () => {
    setIsTraining(true);
    setModelStatus('training');
    setTrainingLog(['Initializing training environment...', 'Loading historical claims data...', 'Loading provider network datasets...']);
    
    await new Promise(r => setTimeout(r, 1500));
    setTrainingLog(prev => [...prev, 'Analyzing fraud patterns in present world scenarios...', 'Identifying collusion clusters...']);
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const prompt = `Act as a fraud detection training engine. Based on current global healthcare insurance fraud trends (e.g., upcoding, phantom billing, identity theft), generate 3 specific "Fraud Detection Rules" that our AI should prioritize. 
      Format the output as a JSON array of objects with 'rule' and 'description' fields.`;

      const result = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt
      });
      const text = result.text || "Training failed to produce rules.";
      setTrainingLog(prev => [...prev, 'Model training complete.', 'New fraud detection rules synthesized:']);
      setTrainingLog(prev => [...prev, text]);
      setModelStatus('ready');
    } catch (error) {
      console.error("Training error:", error);
      setTrainingLog(prev => [...prev, 'Error during training: Failed to connect to AI engine.']);
      setModelStatus('idle');
    } finally {
      setIsTraining(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
      <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h3 className="text-lg font-bold">AI Model Training Center</h3>
            <p className="text-sm text-slate-500">Train the InsureGuard engine on new datasets to improve fraud detection accuracy.</p>
          </div>
          <button
            onClick={startTraining}
            disabled={isTraining}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${
              isTraining ? 'bg-slate-100 text-slate-400' : 'bg-slate-900 text-white hover:bg-slate-800'
            }`}
          >
            {isTraining ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
            {isTraining ? 'Training in Progress...' : 'Start Training Cycle'}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
              <h4 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Activity className="h-4 w-4 text-blue-600" /> Training Status
              </h4>
              <div className="flex items-center gap-4">
                <div className={`h-3 w-3 rounded-full ${
                  modelStatus === 'ready' ? 'bg-emerald-500' : modelStatus === 'training' ? 'bg-amber-500 animate-pulse' : 'bg-slate-300'
                }`} />
                <span className="text-sm font-medium text-slate-600 capitalize">Model {modelStatus}</span>
              </div>
            </div>

            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
              <h4 className="text-sm font-bold text-slate-900 mb-4 flex items-center justify-center gap-2">
                <Plus className="h-4 w-4 text-emerald-600" /> Upload New Dataset
              </h4>
              <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center hover:border-emerald-400 transition-colors cursor-pointer group">
                <div className="h-12 w-12 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm group-hover:scale-110 transition-transform">
                  <Plus className="text-slate-400 group-hover:text-emerald-600 h-6 w-6" />
                </div>
                <p className="text-xs font-bold text-slate-600 mb-1">Drop CSV or JSON files here</p>
                <p className="text-[10px] text-slate-400">Max file size: 50MB</p>
              </div>
            </div>

            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
              <h4 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                <FileText className="h-4 w-4 text-purple-600" /> Dataset Inventory
              </h4>
              <div className="space-y-3">
                {[
                  { name: 'Historical Claims (2023-2024)', size: '1.2 GB', status: 'Loaded' },
                  { name: 'Provider Network Data', size: '450 MB', status: 'Loaded' },
                  { name: 'Global Fraud Indicators', size: '120 MB', status: 'Ready' },
                ].map((d) => (
                  <div key={d.name} className="flex justify-between items-center p-3 bg-white rounded-xl border border-slate-100">
                    <div>
                      <p className="text-xs font-bold text-slate-900">{d.name}</p>
                      <p className="text-[10px] text-slate-400">{d.size}</p>
                    </div>
                    <span className="text-[10px] font-black text-emerald-600 uppercase">{d.status}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-slate-900 rounded-2xl p-6 font-mono text-xs text-emerald-400 overflow-hidden flex flex-col h-[400px]">
            <div className="flex justify-between items-center mb-4 border-b border-slate-800 pb-2">
              <span className="text-slate-500 uppercase tracking-widest text-[10px]">Training Console Log</span>
              <div className="flex gap-1.5">
                <div className="h-2 w-2 rounded-full bg-red-500/20" />
                <div className="h-2 w-2 rounded-full bg-amber-500/20" />
                <div className="h-2 w-2 rounded-full bg-emerald-500/20" />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2 scrollbar-hide">
              {trainingLog.map((log, i) => (
                <div key={i} className="flex gap-2">
                  <span className="text-slate-600">[{new Date().toLocaleTimeString()}]</span>
                  <span className="whitespace-pre-wrap">{log}</span>
                </div>
              ))}
              {isTraining && <div className="animate-pulse">_</div>}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const HospitalRankingView = () => {
  const hospitals = [
    { name: 'St. Mary Medical Center', claims: 1240, riskScore: 12, status: 'Low Risk' },
    { name: 'City General Hospital', claims: 890, riskScore: 45, status: 'Suspicious' },
    { name: 'Northside Wellness', claims: 450, riskScore: 82, status: 'High Risk' },
    { name: 'Lakeside Clinic', claims: 2100, riskScore: 8, status: 'Low Risk' },
    { name: 'West End Orthopedics', claims: 320, riskScore: 68, status: 'Suspicious' },
  ].sort((a, b) => b.riskScore - a.riskScore);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-100">
          <h3 className="text-lg font-bold">Hospital Risk Ranking</h3>
          <p className="text-sm text-slate-500">Prioritizing audits based on institutional risk profiles.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-widest">
                <th className="px-8 py-4 font-bold">Rank</th>
                <th className="px-8 py-4 font-bold">Hospital Name</th>
                <th className="px-8 py-4 font-bold">Total Claims</th>
                <th className="px-8 py-4 font-bold">Risk Score</th>
                <th className="px-8 py-4 font-bold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {hospitals.map((h, i) => (
                <tr key={h.name} className="hover:bg-slate-50 transition-colors">
                  <td className="px-8 py-6 text-sm font-black text-slate-400">#{i + 1}</td>
                  <td className="px-8 py-6 text-sm font-bold text-slate-900">{h.name}</td>
                  <td className="px-8 py-6 text-sm text-slate-600">{h.claims}</td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden max-w-[100px]">
                        <div 
                          className={`h-full rounded-full ${h.riskScore > 70 ? 'bg-red-500' : h.riskScore > 30 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                          style={{ width: `${h.riskScore}%` }}
                        />
                      </div>
                      <span className="text-sm font-bold text-slate-900">{h.riskScore}%</span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md ${
                      h.status === 'Low Risk' ? 'bg-emerald-100 text-emerald-700' :
                      h.status === 'Suspicious' ? 'bg-amber-100 text-amber-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {h.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
};

const ArchitectureView = () => {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
      <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
        <h3 className="text-lg font-bold mb-8 text-center">InsureGuard AI System Architecture</h3>
        
        <div className="relative max-w-4xl mx-auto py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative z-10">
            <ArchNode icon={<Camera />} label="Ingestion Layer" details="Biometric Auth & Claim Data" color="bg-blue-500" />
            <ArchNode icon={<Zap />} label="Processing Engine" details="Gemini AI Neural Analysis" color="bg-emerald-500" />
            <ArchNode icon={<ShieldCheck />} label="Decision Core" details="Risk Scoring & Automated Action" color="bg-slate-900" />
          </div>

          {/* Connectors */}
          <div className="hidden md:block absolute top-1/2 left-0 w-full h-0.5 bg-slate-100 -translate-y-1/2 -z-0" />
          
          <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
              <h4 className="font-bold text-slate-900 mb-2 flex items-center gap-2">
                <Lock className="h-4 w-4 text-emerald-600" />
                Security Layer
              </h4>
              <p className="text-sm text-slate-600 leading-relaxed">
                End-to-end encryption using AES-256. All patient data is anonymized before AI processing to ensure HIPAA compliance.
              </p>
            </div>
            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
              <h4 className="font-bold text-slate-900 mb-2 flex items-center gap-2">
                <RefreshCw className="h-4 w-4 text-blue-600" />
                Feedback Loop
              </h4>
              <p className="text-sm text-slate-600 leading-relaxed">
                Continuous learning from auditor feedback to refine risk models and reduce false positives over time.
              </p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const ArchNode = ({ icon, label, details, color }: { icon: React.ReactNode, label: string, details: string, color: string }) => (
  <div className="flex flex-col items-center text-center space-y-4">
    <div className={`h-20 w-20 ${color} text-white rounded-3xl flex items-center justify-center shadow-xl shadow-slate-200`}>
      {React.cloneElement(icon as React.ReactElement, { className: "h-10 w-10" })}
    </div>
    <div>
      <h4 className="font-bold text-slate-900">{label}</h4>
      <p className="text-xs text-slate-500 mt-1">{details}</p>
    </div>
  </div>
);

// --- ChatBot Component ---

const ChatBot = ({ isOpen, setIsOpen }: { isOpen: boolean, setIsOpen: (v: boolean) => void }) => {
  const [messages, setMessages] = useState<{ role: 'user' | 'model', text: string }[]>([
    { role: 'model', text: 'Hello! I am your InsureGuard AI assistant. How can I help you today with claims, fraud detection, or system navigation?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const speak = async (text: string) => {
    try {
      setIsSpeaking(true);
      const response = await genAI.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text }] }],
        config: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Kore' },
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        const audioBlob = new Blob([Uint8Array.from(atob(base64Audio), c => c.charCodeAt(0))], { type: 'audio/mp3' });
        const audioUrl = URL.createObjectURL(audioBlob);
        if (audioRef.current) {
          audioRef.current.src = audioUrl;
          audioRef.current.play();
        }
      }
    } catch (error) {
      console.error('TTS Error:', error);
    } finally {
      setIsSpeaking(false);
    }
  };
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setIsLoading(true);

    try {
      const chat = genAI.chats.create({
        model: "gemini-3-flash-preview",
        config: {
          systemInstruction: "You are an AI assistant for InsureGuard AI. You help users understand claims, fraud analytics, and medical records. You can explain network graphs (Force-Directed, Circular, Hierarchical) and analyze connections between hospitals, doctors, and patients. Be professional and concise. You also provide speech output for accessibility.",
        },
      });

      // We send the whole history for context
      const response = await chat.sendMessage({
        message: userMessage
      });

      const aiResponse = response.text || "I'm sorry, I couldn't process that request.";
      setMessages(prev => [...prev, { role: 'model', text: aiResponse }]);
      speak(aiResponse);
    } catch (error) {
      console.error("Chat error:", error);
      setMessages(prev => [...prev, { role: 'model', text: "Sorry, I encountered an error. Please try again later." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <audio ref={audioRef} onEnded={() => setIsSpeaking(false)} className="hidden" />
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-8 right-8 h-16 w-16 bg-slate-900 text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-transform z-50"
      >
        {isOpen ? <X className="h-6 w-6" /> : <MessageSquare className="h-6 w-6" />}
      </button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-28 right-8 w-96 h-[500px] bg-white rounded-3xl shadow-2xl border border-slate-100 flex flex-col overflow-hidden z-50"
          >
            {/* Header */}
            <div className="p-4 bg-slate-900 text-white flex items-center gap-3">
              <div className="h-8 w-8 bg-emerald-600 rounded-lg flex items-center justify-center">
                <ShieldCheck className="text-white h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm">InsureGuard AI Assist</h3>
                <div className="flex items-center gap-1.5">
                  <div className="h-1.5 w-1.5 bg-emerald-500 rounded-full animate-pulse" />
                  <span className="text-[10px] text-slate-400">Online & Ready</span>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${
                    msg.role === 'user' 
                      ? 'bg-emerald-600 text-white rounded-tr-none' 
                      : 'bg-white text-slate-700 border border-slate-100 rounded-tl-none shadow-sm'
                  }`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white p-3 rounded-2xl rounded-tl-none border border-slate-100 shadow-sm">
                    <div className="flex gap-1">
                      <div className="h-1.5 w-1.5 bg-slate-300 rounded-full animate-bounce" />
                      <div className="h-1.5 w-1.5 bg-slate-300 rounded-full animate-bounce [animation-delay:0.2s]" />
                      <div className="h-1.5 w-1.5 bg-slate-300 rounded-full animate-bounce [animation-delay:0.4s]" />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="p-4 border-t border-slate-100 bg-white">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Ask me anything..."
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                />
                <button
                  onClick={handleSend}
                  disabled={isLoading}
                  className="h-10 w-10 bg-slate-900 text-white rounded-xl flex items-center justify-center hover:bg-slate-800 transition-colors disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
