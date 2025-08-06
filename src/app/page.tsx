'use client';

import { motion } from 'framer-motion';
import { RocketIcon, Sparkles, CheckCircle2 } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-white to-blue-50 text-gray-800 font-sans">
      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 py-24 grid md:grid-cols-2 items-center gap-14">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <p className="text-sm text-blue-600 font-semibold mb-2">
            <RocketIcon className="inline-block w-4 h-4 mr-1" />
            Built with Passion & AI
          </p>

          <h1 className="text-5xl font-extrabold tracking-tight leading-tight text-gray-900 mb-4">
            Create Stunning Resumes <br />
            <span className="text-blue-600">in Minutes</span>
          </h1>

          <p className="text-lg text-gray-700 mb-6 max-w-xl">
            Hi, Im <strong>Mohammad</strong> — a software engineering student passionate about building tools that matter.
            I created this AI-powered resume builder to make job applications faster, smarter, and more professional.
          </p>

          <div className="flex flex-wrap gap-4 mt-6">
            <Link
  href="/register"
  className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition shadow-sm"
>
  Get Started Free
</Link>

           <Link
  href="/login"
  className="px-6 py-3 border border-blue-600 text-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition"
>
  Log In
</Link>

<Link
  href="/resume"
  className="px-6 py-3 border border-blue-600 text-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition"
>
  Try the Builder
</Link>

          </div>
        </motion.div>

        {/* Hero Image */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="w-full max-w-lg mx-auto overflow-hidden rounded-xl shadow-lg">
            <Image
              src="/resume.jpg"
              alt="Resume Builder"
              width={800}
              height={600}
              className="w-full object-cover aspect-video"
              priority
            />
          </div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section className="bg-white py-20 px-6 border-t border-blue-100">
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Why I Built This</h2>
          <p className="text-gray-600 max-w-2xl mx-auto mb-12">
            I wanted to build something I wish I had — a smart, well-designed resume builder powered by AI to help others save time and land opportunities.
          </p>

          <div className="grid md:grid-cols-3 gap-8 text-left">
            <div className="p-6 bg-blue-50 rounded-xl shadow hover:shadow-md transition group">
              <Sparkles className="w-8 h-8 text-blue-600 mb-4 group-hover:scale-110 transition-transform" />
              <h4 className="text-xl font-semibold mb-2">AI Writing Help</h4>
              <p className="text-gray-600">
                Get bullet points, summaries, and skill suggestions tailored to your background.
              </p>
            </div>
            <div className="p-6 bg-blue-50 rounded-xl shadow hover:shadow-md transition group">
              <CheckCircle2 className="w-8 h-8 text-blue-600 mb-4 group-hover:scale-110 transition-transform" />
              <h4 className="text-xl font-semibold mb-2">ATS-Friendly Design</h4>
              <p className="text-gray-600">
                Clean, modern templates optimized for applicant tracking systems.
              </p>
            </div>
            <div className="p-6 bg-blue-50 rounded-xl shadow hover:shadow-md transition group">
              <RocketIcon className="w-8 h-8 text-blue-600 mb-4 group-hover:scale-110 transition-transform" />
              <h4 className="text-xl font-semibold mb-2">Instant PDF Export</h4>
              <p className="text-gray-600">
                Choose a template and download your resume instantly — no extra formatting needed.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
