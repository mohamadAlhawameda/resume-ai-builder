'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ClassicTemplate from '@/components/resumeTemplates/ClassicTemplate';
import MinimalTemplate from '@/components/resumeTemplates/MinimalTemplate';
import ModernTemplate from '@/components/resumeTemplates/ModernTemplate';

interface ResumeData {
  fullName?: string;
  email?: string;
  phone?: string;
  linkedIn?: string;
  github?: string;
  isDeveloper?: boolean;
  summary?: string;
  education?: { school: string; degree: string; from?: string; to?: string; achievements?: string }[];
  experience?: { company: string; role: string; from?: string; to?: string; description?: string }[];
  skills?: string[];
}

interface Resume {
  _id: string;
  updatedAt: string;
  templateId: 'classic' | 'minimal' | 'modern' | string;
  data: ResumeData;
}

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export default function ResumeDashboardPage() {
  const router = useRouter();
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [selectedResume, setSelectedResume] = useState<Resume | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [viewing, setViewing] = useState(false);

  useEffect(() => {
    const fetchResumes = async () => {
      try {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        const res = await fetch('https://resume-ai-builder-esnw.onrender.com/resume/resumes', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Failed to fetch resumes');
        const data: Resume[] = await res.json();
        setResumes(data);
      } catch (err) {
        console.error('Error fetching resumes:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchResumes();
  }, []);

  const handleView = async (id: string) => {
    setModalOpen(true);
    setViewing(true);
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const res = await fetch(`https://resume-ai-builder-esnw.onrender.com/resume/resumes/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load resume');
      const data: Resume = await res.json();
      setSelectedResume(data);
    } catch (err) {
      console.error('Error loading resume:', err);
    } finally {
      setViewing(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this resume?')) return;

    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const res = await fetch(`https://resume-ai-builder-esnw.onrender.com/resume/delete/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error('Failed to delete resume');

      setResumes((prev) => prev.filter((r) => r._id !== id));
    } catch (err) {
      console.error('Error deleting resume:', err);
      alert('Something went wrong while deleting the resume.');
    }
  };

  return (
    <main className="max-w-7xl mx-auto px-6 py-10">
      <h1 className="text-4xl font-bold mb-10 text-indigo-700">My Resumes</h1>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-40 bg-gray-200 animate-pulse rounded-xl" />
          ))}
        </div>
      ) : resumes.length === 0 ? (
<p className="text-gray-600 text-lg">
  You haven&#39;t created any resumes yet. Start building one now!
</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {resumes.map((resume) => (
            <div
              key={resume._id}
              className="bg-white rounded-xl shadow p-6 flex flex-col justify-between border border-gray-200 hover:shadow-lg transition"
            >
              <div>
                <h3 className="text-xl font-semibold text-gray-800 truncate">
                  {resume.data?.fullName || 'Untitled Resume'}
                </h3>
                <p className="text-sm text-gray-500 mt-2">
                  Updated on {formatDate(resume.updatedAt)}
                </p>
              </div>
              <div className="mt-6 flex justify-between flex-wrap gap-2">
                <button
                  onClick={() => handleView(resume._id)}
                  className="px-4 py-2 border rounded-md text-indigo-600 hover:bg-indigo-50 text-sm font-medium"
                >
                  View
                </button>
               <button
onClick={() => router.push(`/resume/edit/${resume._id}`)}

                  className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(resume._id)}
                  className="px-4 py-2 bg-red-100 text-red-600 rounded-md text-sm font-medium hover:bg-red-200"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 px-4"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="bg-white w-full max-w-3xl rounded-xl shadow-xl p-6 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute top-4 right-5 text-gray-400 hover:text-red-500 text-xl"
              onClick={() => setModalOpen(false)}
            >
              ×
            </button>

            {viewing || !selectedResume ? (
              <p className="text-center text-gray-500 text-lg">Loading resume...</p>
            ) : (
              <div className="overflow-auto max-h-[80vh]">
               {['classic', 'default'].includes(selectedResume.templateId) && (
  <ClassicTemplate data={selectedResume.data} />
)}
{selectedResume.templateId === 'minimal' && (
  <MinimalTemplate data={selectedResume.data} />
)}
{selectedResume.templateId === 'modern' && (
  <ModernTemplate data={selectedResume.data} />
)}
{!['classic', 'minimal', 'modern', 'default'].includes(selectedResume.templateId) && (
  <p className="text-center text-gray-600">Unknown template: {selectedResume.templateId}</p>
)}

              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
