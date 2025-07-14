'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

// Define the Resume type explicitly
interface Resume {
  _id: string;
  title?: string;
  updatedAt: string;
  // Add other fields if needed
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
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) throw new Error('Failed to fetch resumes');
        const data: Resume[] = await res.json(); // cast to Resume[]
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
      const res = await fetch(`https://resume-ai-builder-esnw.onrender.com/resumes/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
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

  return (
    <main className="max-w-6xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold mb-8 text-gray-800">Your Resumes</h1>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-36 bg-gray-200 animate-pulse rounded" />
          ))}
        </div>
      ) : resumes.length === 0 ? (
        <p className="text-gray-600">No resumes found. Create one to get started.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {resumes.map((resume) => (
            <div
              key={resume._id}
              className="bg-white shadow border rounded-lg p-4 flex flex-col justify-between"
            >
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {resume.title || 'Untitled Resume'}
                </h3>
                <p className="text-gray-500 text-sm mt-1">
                  Last updated: {formatDate(resume.updatedAt)}
                </p>
              </div>
              <div className="mt-4 flex justify-end space-x-3">
                <button
                  onClick={() => handleView(resume._id)}
                  className="px-4 py-1.5 border rounded text-sm text-blue-600 hover:bg-blue-50"
                >
                  View
                </button>
                <button
                  onClick={() => router.push(`/resume/edit/${resume._id}`)}
                  className="px-4 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                >
                  Edit
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="bg-white max-w-3xl w-full mx-4 rounded-lg shadow-lg p-6 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute top-2 right-3 text-gray-400 hover:text-red-500"
              onClick={() => setModalOpen(false)}
            >
              ✕
            </button>

            {viewing || !selectedResume ? (
              <p className="text-center text-gray-500">Loading resume...</p>
            ) : (
              <div className="space-y-3">
                <h2 className="text-xl font-semibold">{selectedResume.title || 'Untitled'}</h2>
                <pre className="text-sm bg-gray-100 p-4 rounded max-h-[400px] overflow-y-auto whitespace-pre-wrap">
                  {JSON.stringify(selectedResume, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
