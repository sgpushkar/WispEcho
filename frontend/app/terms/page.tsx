"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";

export default function TermsOfService() {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-start p-6 text-white bg-black">
      <div className="w-full max-w-3xl space-y-8 py-12">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-white transition">
          <ArrowLeft size={16} />
          <span>Back to Home</span>
        </Link>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <h1 className="text-4xl font-extrabold font-space">Terms of Service</h1>
          <p className="text-white/50 text-sm">Last updated: August 14, 2026</p>

          <div className="space-y-6 text-sm text-white/80 leading-relaxed">
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-white">1. Acceptance of Terms</h2>
              <p>
                By accessing or using WispEcho, you agree to be bound by these Terms of Service. If you disagree with any part of the terms, you may not access the service.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-white">2. User Conduct</h2>
              <p>
                You are responsible for your use of the service and for any content you provide, including compliance with applicable laws, rules, and regulations. You should only provide content that you are comfortable sharing with others.
              </p>
              <p>
                You agree not to engage in any of the following prohibited activities:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Copying, distributing, or disclosing any part of the service in any medium.</li>
                <li>Using any automated system, including "robots," "spiders," or "offline readers," to access the service.</li>
                <li>Transmitting spam, chain letters, or other unsolicited email.</li>
                <li>Attempting to interfere with, compromise the system integrity or security, or decipher any transmissions to or from the servers running the service.</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-white">3. Intellectual Property</h2>
              <p>
                The service and its original content (excluding content provided by users), features, and functionality are and will remain the exclusive property of WispEcho and its licensors.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-white">4. Termination</h2>
              <p>
                We may terminate or suspend your account immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms. Upon termination, your right to use the service will immediately cease.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-white">5. Changes to Terms</h2>
              <p>
                We reserve the right, at our sole discretion, to modify or replace these Terms at any time. By continuing to access or use our service after those revisions become effective, you agree to be bound by the revised terms.
              </p>
            </section>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
