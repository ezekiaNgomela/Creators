import { motion } from "framer-motion";
import "./landing.css";

export function LandingHeroReal({ onGetStarted }: { onGetStarted: () => void }) {
  return (
    <div className="landing-root">
      <div className="landing-bg" />

      <motion.div
        className="landing-content"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="landing-title">Creators</h1>
        <p className="landing-sub">Connect • Stream • Earn</p>

        <button className="primary-btn" onClick={onGetStarted}>
          Get Started
        </button>
      </motion.div>
    </div>
  );
}
