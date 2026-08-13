"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";

export default function PrivacyPolicy() {
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
          <h1 className="text-4xl font-extrabold font-space">Privacy Policy</h1>
          <p className="text-white/50 text-sm">Last updated: August 14, 2026</p>

          <div className="space-y-6 text-sm text-white/80 leading-relaxed">
            <section className="space-y-3">
              <h2 className="text-xl font-bold text-white">1. Information We Collect</h2>
              <p>
                We collect information you provide directly to us, such as when you create or modify your account, use our services, contact customer support, or otherwise communicate with us. This information may include: your name, email address, profile picture, and any other information you choose to provide.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-white">2. How We Use Your Information</h2>
              <p>
                We use the information we collect about you to provide, maintain, and improve our services, including to:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Create and update your account</li>
                <li>Enable real-time messaging and media sharing</li>
                <li>Send you technical notices, updates, and security alerts</li>
                <li>Respond to your comments, questions, and requests</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-white">3. Data Security & View Once</h2>
              <p>
                We take reasonable measures to help protect information about you from loss, theft, misuse and unauthorized access, disclosure, alteration and destruction. Our "View Once" feature is designed to completely delete media from our servers and devices once it has been viewed by the recipient.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-white">4. Sharing of Information</h2>
              <p>
                We do not sell, trade, or otherwise transfer to outside parties your Personally Identifiable Information. This does not include trusted third parties who assist us in operating our application, conducting our business, or servicing you, so long as those parties agree to keep this information confidential.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-white">5. Contact Us</h2>
              <p>
                If you have any questions about this Privacy Policy, please contact us at privacy@wispecho.com.
              </p>
            </section>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
