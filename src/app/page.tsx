'use client';
import { motion } from 'framer-motion';
import { RocketIcon, Sparkles, CheckCircle2 } from 'lucide-react';
import Image from 'next/image';
export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-white to-sky-50 text-gray-800 font-sans">
     
      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 py-24 grid md:grid-cols-2 items-center gap-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <span className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-600 rounded-full text-sm font-medium mb-4">
            <RocketIcon className="w-4 h-4 mr-1" /> AI-Powered Career Boost
          </span>
          <h2 className="text-5xl font-extrabold tracking-tight text-gray-900 mb-6 leading-tight">
            Create Job-Winning Resumes <br /> in Seconds with <span className="text-blue-600">AI</span>
          </h2>
          <p className="text-lg text-gray-700 mb-8">
            Stand out from the crowd. Build personalized, keyword-optimized resumes with just a few clicks — no design or writing experience needed.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <a href="/register" className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition">
              Start Building Free
            </a>
            <a href="/login" className="px-6 py-3 border border-blue-600 text-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition">
              Log In
            </a>
             <a href="/resume" className="px-6 py-3 border border-blue-600 text-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition">
              Create Resume
            </a>
          </div>
        </motion.div>

        {/* Hero Image */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <Image
            src="/resume.jpg"
            alt="Resume Builder Illustration"
            width={1044}
            height={630}
            className="w-full max-w-lg mx-auto rounded-lg"
          />
        </motion.div>
      </section>

      {/* Features Section */}
      <section className="bg-white py-20 px-6 border-t">
        <div className="max-w-6xl mx-auto text-center">
          <h3 className="text-3xl font-bold text-gray-900 mb-4">Why Professionals Choose Us</h3>
          <p className="text-gray-600 max-w-xl mx-auto mb-10">
            From recent grads to experienced tech pros, our AI tools make job applications smarter and easier.
          </p>

          <div className="grid md:grid-cols-3 gap-10 text-left">
            <div className="p-6 bg-blue-50 rounded-lg shadow-sm hover:shadow-md transition">
              <Sparkles className="w-8 h-8 text-blue-600 mb-4" />
              <h4 className="text-xl font-semibold mb-2">Smart Suggestions</h4>
              <p className="text-gray-600">Generate bullet points, skills, and summaries instantly using GPT-powered AI tailored to job roles.</p>
            </div>
            <div className="p-6 bg-blue-50 rounded-lg shadow-sm hover:shadow-md transition">
              <CheckCircle2 className="w-8 h-8 text-blue-600 mb-4" />
              <h4 className="text-xl font-semibold mb-2">ATS-Optimized</h4>
              <p className="text-gray-600">Ensure your resume passes applicant tracking systems with keyword-optimized formatting.</p>
            </div>
            <div className="p-6 bg-blue-50 rounded-lg shadow-sm hover:shadow-md transition">
              <RocketIcon className="w-8 h-8 text-blue-600 mb-4" />
              <h4 className="text-xl font-semibold mb-2">One-Click Export</h4>
              <p className="text-gray-600">Download PDF versions with beautiful designs ready to send — no extra formatting needed.</p>
            </div>
          </div>
        </div>
      </section>

     
    </main>
  );
}
