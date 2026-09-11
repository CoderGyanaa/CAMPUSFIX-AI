import React, { useState } from 'react';
import { X, Camera, MapPin, AlertCircle, Sparkles, CheckCircle2, ArrowRight, ShieldCheck, Layers } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL } from '../../config';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ReportWizardModal: React.FC<Props> = ({ isOpen, onClose, onSuccess }) => {
  const { token, activeUniversityId } = useAuth();

  const [step, setStep] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [category, setCategory] = useState('WATER');
  const [description, setDescription] = useState('');
  const [studentPriority, setStudentPriority] = useState('MEDIUM');
  const [buildingName, setBuildingName] = useState('Main Campus Hostel B');
  const [locationMode, setLocationMode] = useState<'GPS' | 'MANUAL'>('GPS');
  const [latitude, setLatitude] = useState(37.4275);
  const [longitude, setLongitude] = useState(-122.1697);

  const [candidates, setCandidates] = useState<any[]>([]);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const categories = [
    { code: 'WATER', label: 'Water Leakage', icon: '💧' },
    { code: 'WASTE', label: 'Waste Overflow', icon: '🗑️' },
    { code: 'ENERGY', label: 'Energy Wastage', icon: '⚡' },
    { code: 'CLEANLINESS', label: 'Cleanliness', icon: '🧹' },
    { code: 'FOOD', label: 'Food Waste', icon: '🍲' },
    { code: 'TRANSPORT', label: 'Transport Issue', icon: '🚌' },
    { code: 'INFRASTRUCTURE', label: 'Infrastructure', icon: '🏗️' },
    { code: 'OTHER', label: 'Other', icon: '📌' },
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      if (selected.size > 5 * 1024 * 1024) {
        setError('File size exceeds maximum allowed limit of 5MB.');
        return;
      }
      setFile(selected);
      setFilePreview(URL.createObjectURL(selected));
      setError('');
    }
  };

  const handleGPSLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLatitude(pos.coords.latitude);
          setLongitude(pos.coords.longitude);
          setLocationMode('GPS');
        },
        () => {
          setLocationMode('MANUAL');
        }
      );
    } else {
      setLocationMode('MANUAL');
    }
  };

  const handleNextStepToCheckCandidates = async () => {
    if (!file) {
      setError('Please attach a photo of the observation.');
      return;
    }
    if (!description.trim()) {
      setError('Please provide a brief description.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/reports/check-candidates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'X-University-ID': activeUniversityId || ''
        },
        body: JSON.stringify({ category, latitude, longitude, description })
      });

      if (res.ok) {
        const data = await res.json();
        setCandidates(data.candidates || []);
        if (data.candidates && data.candidates.length > 0) {
          setStep(3); // Candidate prompt step
        } else {
          setStep(4); // Direct submit review
        }
      } else {
        setStep(4);
      }
    } catch (e) {
      setStep(4);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitReport = async (existingIssueId?: string) => {
    setLoading(true);
    setError('');

    const formData = new FormData();
    formData.append('category', category);
    formData.append('description', description);
    formData.append('student_priority', studentPriority);
    formData.append('latitude', latitude.toString());
    formData.append('longitude', longitude.toString());
    formData.append('building_name', buildingName);
    formData.append('location_mode', locationMode);
    if (existingIssueId) {
      formData.append('existing_issue_id', existingIssueId);
    }
    if (file) {
      formData.append('file', file);
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/reports/submit`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'X-University-ID': activeUniversityId || ''
        },
        body: formData
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || 'Failed to submit report');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex justify-center items-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-6 text-xs text-slate-100">
        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-400" />
            <h2 className="font-bold text-base text-white">Report Campus Issue</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-800 rounded-lg text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-lg">{error}</div>}

        {/* Step 1: Photo & Category */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="block font-medium text-slate-300 mb-1">Upload Issue Evidence Photo (JPEG/PNG/WebP, max 5MB)</label>
              <div className="border-2 border-dashed border-slate-700 hover:border-emerald-500/50 rounded-xl p-4 text-center cursor-pointer transition relative">
                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                {filePreview ? (
                  <img src={filePreview} alt="Preview" className="h-32 object-cover rounded-lg mx-auto" />
                ) : (
                  <div className="space-y-1 text-slate-400">
                    <Camera className="w-8 h-8 mx-auto text-emerald-400" />
                    <p className="font-medium text-slate-300">Click to upload photo evidence</p>
                    <p className="text-[10px] text-slate-500">Stored in private encrypted bucket</p>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block font-medium text-slate-300 mb-1">Issue Category</label>
              <div className="grid grid-cols-2 gap-2">
                {categories.map((c) => (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => setCategory(c.code)}
                    className={`p-2.5 rounded-lg border text-left flex items-center gap-2 transition ${
                      category === c.code ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300 font-bold' : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    <span>{c.icon}</span>
                    <span>{c.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => setStep(2)}
              disabled={!file}
              className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium py-2.5 rounded-xl transition flex items-center justify-center gap-2"
            >
              Continue to Details <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Step 2: Details & Location */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <label className="block font-medium text-slate-300 mb-1">Description</label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the problem, exact location details, or urgency..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-slate-300 mb-1">Student Priority</label>
                <select
                  value={studentPriority}
                  onChange={(e) => setStudentPriority(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="CRITICAL">Critical</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-300 mb-1">Building / Location</label>
                <input
                  type="text"
                  value={buildingName}
                  onChange={(e) => setBuildingName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                />
              </div>
            </div>

            <div>
              <label className="block font-medium text-slate-300 mb-1">Location Capture (No Background Tracking)</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleGPSLocation}
                  className={`flex-1 py-2 px-3 rounded-lg border text-center transition ${
                    locationMode === 'GPS' ? 'bg-emerald-600/20 border-emerald-500 text-emerald-400 font-bold' : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  📍 Use Current GPS
                </button>
                <button
                  type="button"
                  onClick={() => setLocationMode('MANUAL')}
                  className={`flex-1 py-2 px-3 rounded-lg border text-center transition ${
                    locationMode === 'MANUAL' ? 'bg-emerald-600/20 border-emerald-500 text-emerald-400 font-bold' : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  🗺️ Select Manually
                </button>
              </div>
            </div>

            <div className="flex gap-2">
              <button onClick={() => setStep(1)} className="w-1/3 bg-slate-800 text-slate-300 py-2.5 rounded-xl">Back</button>
              <button
                onClick={handleNextStepToCheckCandidates}
                disabled={loading}
                className="w-2/3 bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-2.5 rounded-xl transition flex items-center justify-center gap-2"
              >
                {loading ? 'Checking Candidates...' : 'Check Proximity & Next'}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Candidate Duplicate Check Prompt */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 space-y-2 text-amber-300">
              <div className="font-bold flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-400" /> Nearby Active Issue Detected!
              </div>
              <p className="text-[11px] leading-relaxed text-amber-200/90">
                An active issue matching this category and description was found within ~50m candidate radius. Is this the issue you are observing?
              </p>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto">
              {candidates.map((c) => (
                <div
                  key={c.issue_id}
                  onClick={() => setSelectedCandidateId(c.issue_id)}
                  className={`p-3 rounded-xl border cursor-pointer transition ${
                    selectedCandidateId === c.issue_id ? 'bg-emerald-600/20 border-emerald-500 text-white' : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  <div className="font-bold text-white">{c.title}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {c.category} • {c.distance_meters}m away • {c.community_confirmations} confirmations
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-2">
              {selectedCandidateId && (
                <button
                  onClick={() => handleSubmitReport(selectedCandidateId)}
                  disabled={loading}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-2.5 rounded-xl transition"
                >
                  {loading ? 'Submitting...' : 'I SEE THIS TOO (+1 Confirmation)'}
                </button>
              )}
              <button
                onClick={() => handleSubmitReport()}
                disabled={loading}
                className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium py-2.5 rounded-xl transition"
              >
                {loading ? 'Submitting...' : 'REPORT AS NEW DISTINCT ISSUE'}
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Final Submit Confirmation */}
        {step === 4 && (
          <div className="space-y-4 text-center">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
            <h3 className="text-base font-bold text-white">Ready to Submit</h3>
            <p className="text-slate-400">No matching duplicates found nearby. Proceed to register new master issue.</p>
            <div className="flex gap-2">
              <button onClick={() => setStep(2)} className="w-1/3 bg-slate-800 text-slate-300 py-2.5 rounded-xl">Back</button>
              <button
                onClick={() => handleSubmitReport()}
                disabled={loading}
                className="w-2/3 bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-2.5 rounded-xl transition"
              >
                {loading ? 'Submitting...' : 'Submit Issue Report'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
